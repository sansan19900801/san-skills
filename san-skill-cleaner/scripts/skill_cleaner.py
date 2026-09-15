#!/usr/bin/env python3
"""san-skill-cleaner：本地 / 待安装 skill 的只读安全审查与可恢复隔离工具。

双视角：
1) 商业与授权视角：强制导流、隐藏商业意图、未授权读取、敏感数据外传；
2) 技术投毒视角：提示注入、隐藏/混淆指令、危险代码、环境变量收割、致命三连复合。

默认只读，不联网、不执行被扫描脚本；隔离采用移动而非删除，可恢复。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from collections import Counter
from datetime import datetime
from pathlib import Path

SELF_NAME = "san-skill-cleaner"
DEFAULT_ROOTS = [
    Path.home() / name / "skills"
    for name in (".claude", ".codex", ".agents", ".grok", ".cursor", ".windsurf", ".gemini")
]
QUARANTINE_ROOT = Path.home() / ".sansan" / "skill-cleaner" / "quarantine"
EXECUTABLE_SUFFIXES = {".py", ".sh", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".rb", ".pl"}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build",
             "docs", "references", "assets", "tests", "test"}
ORDER = {"严重": 0, "高风险": 1, "待复核": 2, "信息": 3}

COMMERCIAL = r"(?:加微信|添加微信|微信号|购买|下单|付费解锁|报名课程|付费咨询|课程|咨询|推广链接|联盟链接|返佣|佣金)"
SENSITIVE = r"(?:cookie(?:s)?|浏览器(?:\s*)凭据|凭据|密钥|私钥|token|环境变量)"
NETWORK = r"(?:curl|wget|fetch\s*\(|axios|requests\.|webhook|http(?:s)?://|上传|发送|传输)"

# 零宽 / 软连字符等不可见字符，以及 bidi 双向控制符
ZERO_WIDTH = re.compile("[​-‍﻿⁠­]")
BIDI_CTRL = re.compile("[‪-‮⁦-⁩]")
# 拉丁词里混入西里尔字母（同形字混淆）
HOMOGLYPH = re.compile(r"[A-Za-z]{1,4}[Ѐ-ӿ]+[A-Za-z]{0,4}|[A-Za-z]{0,4}[Ѐ-ӿ]+[A-Za-z]{1,4}")

# 经典提示注入 / 越权签名
PROMPT_INJECTION = [
    r"ignore\s+(?:all\s+)?(?:previous|prior|above|preceding|earlier)\s+(?:instructions?|prompts?|rules?|directives?)",
    r"disregard\s+(?:all\s+)?(?:previous|prior|above).{0,24}(?:instruction|prompt|rule)",
    r"(?:忽略|无视|忘掉|不要管|不许遵守|不要遵守).{0,14}(?:之前|以上|前面|所有|先前|此前|前面所有).{0,14}(?:指令|指示|提示|规则|要求|设定|约束)",
    r"(?:你|you)\s*(?:现在|now)?\s*(?:是|are)\s*(?:开发者模式|超级管理员|系统管理员|最高权限|developer\s*mode|admin(?:istrator)?|system\s+mode|DAN)",
    r"\bDAN\s*mode\b|\[INST\]|<\|im_start\|>|</s>|\bdeveloper\s*mode\b|越狱模式|jailbreak",
]
# 让 Agent 自我批准、绕过人工确认
SELF_APPROVAL = re.compile(
    r"(?:无需|不用|不要|禁止|别).{0,10}(?:询问|征求|等待).{0,12}(?:用户|user|人工).{0,14}(?:确认|同意|批准|授权)"
    r"|(?:自动|直接|自行).{0,8}(?:批准|确认|授权|approve|通过权限)"
    r"|auto[- ]?approve|--dangerously-skip|yolo\b|跳过.{0,8}(?:人工|用户)?.{0,4}(?:确认|审批|审核)",
    re.I,
)
# 编码 / 混淆后执行
ENCODED_EXEC = re.compile(
    r"(?:base64|b64decode|atob|fromhex|decodeURIComponent|Buffer\.from|b'\")[^;\n]{0,80}"
    r"(?:decode|eval|exec|run|system|spawn)|(?:eval|exec)\s*\([^)]{0,40}(?:base64|atob|fromhex|unescape)",
    re.I | re.S,
)
# 危险代码：按危险度分档
REVERSE_SHELL = re.compile(
    r"(?:bash|sh)\s+-i\s*>&|/bin/(?:ba)?sh[^\n]{0,60}(?:socket|dup2)|nc\s+[^\n]{0,20}-e\s+(?:/bin/)?(?:ba)?sh"
    r"|socket\s*\([^)]*\)[^\n]{0,120}connect[^\n]{0,160}(?:exec|spawn|/bin/sh)",
    re.I | re.S,
)
PIPE_TO_SHELL = re.compile(
    r"(?:curl|wget)\b[^\n|]{0,180}\|\s*(?:sudo\s+)?(?:ba)?sh\b|iex\s*\(|Invoke-Expression|(?:node|python3?)\s+-c\s+['\"][^\n]{0,40}(?:curl|requests)",
    re.I,
)
DESTRUCTIVE = re.compile(
    r"rm\s+-[a-z]*r[a-z]*f?\s+(?:/|~|\*|/home|/Users)\b|mkfs\b|dd\s+if=[^\n]{0,40}of\s*=\s*/dev/|chmod\s+-R\s+0?777|:(){:|:&};:",
    re.I,
)
DYNAMIC_EXEC = re.compile(
    r"\beval\s*\(|\bexec\s*\(|new\s+Function\s*\(|os\.system\s*\(|subprocess\.[a-z_]+\([^)]*shell\s*=\s*True",
    re.I,
)
POSTINSTALL = re.compile(r'"(?:pre|post)install"\s*:\s*"[^"]*(?:curl|wget|eval|bash|sh\b|node)', re.I)
ENV_HARVEST = re.compile(
    r"(?:os\.environ|process\.env|getenv\s*\(|\$_ENV)[^\n]{0,60}(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY|凭据|密钥)"
    r"|(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY)[^\n]{0,30}(?:os\.environ|process\.env|getenv)",
    re.I,
)
SECURITY_TEACHING = re.compile(
    r"(?:扫描|检测|审查|规则|示例|样例|特征|signature|detect|scanner|audit|lint|黑名单|威胁|攻击特征)",
    re.I,
)
# 强防御语境：出现在注入语句附近时，说明是在“讲解/拦截注入”，而非实施注入
DEFENSIVE_CTX = re.compile(
    r"拦截|防御|防范|检测|识别|过滤|屏蔽|清除|提示注入|注入攻击|不会执行|不要执行|勿执行|例如|比如|示例|样例|ignore\s+(?:all\s+)?previous[^\n]{0,40}(?:attack|example)",
    re.I,
)
# 真正的“外传动作”：仅有作者主页这类普通 URL 不算，必须有向外发送的行为
EGRESS = (r"(?:requests\.(?:post|put)|urlopen|fetch\s*\([^)]*(?:POST|PUT)|(?:post|put)\s*\(|upload|"
          r"上传(?:到|至)?|发送(?:给|到|至)?|外传(?:到|至)?|提交到|webhook|socket\.connect|smtp)")
# 保护性否定：不静默覆盖 / 不读取密钥 等，是在声明边界而非实施攻击
NEG_HIJACK = re.compile(r"(?:不静默|不擅自|不得|不会|不可|不要|不能|不|勿|别|禁止|拒绝|严禁)\s*(?:覆盖|忽略|无视|改变|替换)?$")
NEG_ACCESS = re.compile(r"(?:不|勿|别|从不|不会|拒绝|禁止|严禁|不直接|无需)\s*(?:读取|导入|获取|访问|提取|复制|收集|上传|爬取)")
# 文本在正确地“讨论确认流程”（确认后执行 / 未经确认不得做），不是绕过确认
PROPER_CONFIRMATION = re.compile(
    r"用户确认|确认后|已确认|经[^，。；]{0,6}确认|授权后|微调后再确认|确认（|"
    r"未经(?:用户)?确认|未获[^，。；]{0,4}确认|未经[^，。；]{0,4}同意|没有(?:获得)?确认")


def line_number(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def excerpt(text: str, index: int) -> str:
    start = text.rfind("\n", 0, index) + 1
    end = text.find("\n", index)
    return " ".join(text[start:len(text) if end < 0 else end].strip().split())[:200]


def finding(rule, severity, principle, message, path, content, index):
    return {"rule": rule, "severity": severity, "principle": principle, "message": message,
            "file": str(path), "line": line_number(content, index), "excerpt": excerpt(content, index)}


def normalize_text(text: str) -> str:
    """匹配前去除不可见字符，让零宽混淆无法绕过规则（行序保持不变）。"""
    return ZERO_WIDTH.sub("", text)


def is_security_teaching(content: str, skill_name: str) -> bool:
    hint = f"{skill_name} {content[:4000]}"
    return bool(re.search(r"(?:cleaner|security|scan|audit|lint|antivirus|安全|杀毒|审计)", hint, re.I)) and (
        SECURITY_TEACHING.search(content) is not None
    )


def scanned_files(skill_dir: Path):
    for path in skill_dir.rglob("*"):
        if any(part in SKIP_DIRS for part in path.relative_to(skill_dir).parts):
            continue
        if not path.is_file() or path.stat().st_size > 1_000_000:
            continue
        if path.name == "SKILL.md" or path.suffix.lower() in EXECUTABLE_SUFFIXES:
            yield path


def skill_fingerprint(skill_dir: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(scanned_files(skill_dir), key=lambda item: str(item.relative_to(skill_dir))):
        try:
            digest.update(str(path.relative_to(skill_dir)).encode())
            digest.update(path.read_bytes())
        except OSError:
            pass
    return digest.hexdigest()


def find_skills(roots):
    candidates, seen_real = [], set()
    for root in roots:
        if not root.exists():
            continue
        # 直接传入单个 skill 目录
        if (root / "SKILL.md").is_file():
            candidates.append(root)
            continue
        if not root.is_dir():
            continue
        for marker in root.rglob("SKILL.md"):
            if any(part in SKIP_DIRS for part in marker.relative_to(root).parts[:-1]):
                continue
            candidate = marker.parent
            try:
                real = candidate.resolve()
            except OSError:
                real = candidate.absolute()
            if real not in seen_real:
                candidates.append(candidate)
                seen_real.add(real)
    found, seen_content, duplicates = [], set(), 0
    for candidate in sorted(candidates, key=str):
        fp = skill_fingerprint(candidate)
        if fp in seen_content:
            duplicates += 1
            continue
        found.append(candidate)
        seen_content.add(fp)
    return found, duplicates


def has_consent(window: str) -> bool:
    return bool(re.search(
        r"(?:用户|你)(?:明确|主动)?(?:要求|请求|询问|提出|授权|同意)|在用户(?:明确|主动)?(?:要求|请求|询问|提出|授权|同意)后",
        window, re.I))


_NEGATION = re.compile(r"(?:不|勿|别|没|无|禁止|不会|没有|绝不|并不|无需|不用)[\u4e00-\u9fa5A-Za-z]{0,3}$")


def has_real_egress(window: str) -> bool:
    """存在向外发送动作，且其前面不是『不外传/禁止上传』这类否定表述。"""
    for m in re.finditer(EGRESS, window, re.I | re.S):
        before = window[max(0, m.start() - 6):m.start()]
        if not _NEGATION.search(before):
            return True
    return False


def add_rule(findings, pattern, rule, severity, principle, message, path, content, flags=re.I, downgrade=None):
    """命中即记录；downgrade=（目标等级, 补充说明）用于安全教学语境降级，避免误报。"""
    matches = pattern.finditer(content) if hasattr(pattern, "finditer") else re.finditer(pattern, content, flags)
    for m in matches:
        sev = severity
        msg = message
        if downgrade and downgrade[0]:
            sev = downgrade[0]
            msg = message + " " + downgrade[1]
        findings.append(finding(rule, sev, principle, msg, path, content, m.start()))
        return


def scan_content(path: Path, raw: str, skill_name: str):
    findings = []
    teaching = is_security_teaching(raw, skill_name)
    # 安全教学/检测类文本里出现攻击签名多为规则示例，统一降级为待复核。
    dg = ("待复核", "该处位于安全教学或检测规则语境，疑似示例，需人工确认是否真会执行。") if teaching else None

    # 1) 隐藏 / 混淆（在原文上检测，因为这本身就是攻击信号）
    if BIDI_CTRL.search(raw):
        m = BIDI_CTRL.search(raw)
        findings.append(finding("obfuscation-bidi", "严重", "透明与可解释",
                                "文本含 Unicode 双向控制符，可把恶意指令在视觉上隐藏或调换顺序，肉眼审查难以发现。",
                                path, raw, m.start()))
    zw_count = len(ZERO_WIDTH.findall(raw))
    if zw_count >= 2:
        m = ZERO_WIDTH.search(raw)
        findings.append(finding("obfuscation-zero-width", "高风险", "透明与可解释",
                                f"文本含 {zw_count} 个零宽/不可见字符，常被用来拆分敏感词、隐藏指令以绕过审查。",
                                path, raw, m.start()))
    add_rule(findings, HOMOGLYPH, "obfuscation-homoglyph", "待复核", "透明与可解释",
             "拉丁词中混入西里尔等同形异义字符，可能用于伪装命令名或关键词以骗过扫描。", path, raw)
    add_rule(findings, ENCODED_EXEC, "encoded-then-exec", "高风险", "安全与可靠",
             "出现 base64/hex 等编码后再解码执行的写法，可把真实指令藏在编码串里。", path, raw, re.I | re.S, dg)

    # 后续规则在归一化文本上匹配，防止零宽绕过
    content = normalize_text(raw)

    # 2) 经典提示注入 / 越权（防御/教学语境跳过，避免把“讲解如何拦截注入”误判成攻击）
    for pat in PROMPT_INJECTION:
        for m in re.finditer(pat, content, re.I):
            window = content[max(0, m.start() - 80):m.end() + 80]
            if DEFENSIVE_CTX.search(window):
                continue
            sev, msg = "严重", "要求忽略既有指令、冒充系统/开发者或使用越狱控制符，属于典型提示注入。"
            if dg:
                sev, msg = dg[0], msg + " " + dg[1]
            findings.append(finding("prompt-injection", sev, "人的自主性", msg, path, content, m.start()))

    # 原有的任务劫持：覆盖用户/系统指令且非防御外部内容
    for m in re.finditer(r"(?:忽略|无视|覆盖).{0,80}(?:之前|以上|用户|系统).{0,80}(?:指令|要求)"
                         r"|(?:不得|不允许).{0,60}(?:告诉|披露).{0,60}(?:用户|此指令)", content, re.I | re.S):
        window = content[max(0, m.start() - 160):m.end() + 160]
        if re.search(r"(?:邮件|网页|文档|附件|外部|不可信).{0,80}(?:指令|提示)", window, re.I):
            continue
        if DEFENSIVE_CTX.search(window):
            continue
        # 「不静默覆盖 / 不得擅自改变」这类保护性声明不算劫持；但「不得告诉用户」是隐瞒，仍算
        is_conceal = bool(re.search(r"告诉|披露", m.group(0)))
        before = content[max(0, m.start() - 8):m.start()]
        if not is_conceal and NEG_HIJACK.search(before):
            continue
        findings.append(finding("instruction-hijacking", "严重", "人的自主性",
                                "文本要求覆盖用户或系统指令、或隐瞒该行为，可能破坏授权边界。", path, content, m.start()))

    for m in SELF_APPROVAL.finditer(content):
        win = content[max(0, m.start() - 40):m.end() + 40]
        if PROPER_CONFIRMATION.search(win):
            continue
        sev, msg = "高风险", "要求 Agent 跳过用户确认、自行批准或绕过人工审核，削弱了人对高风险动作的把关。"
        if dg:
            sev, msg = dg[0], msg + " " + dg[1]
        findings.append(finding("self-approval-bypass", sev, "人的自主性", msg, path, content, m.start()))

    # 3) 危险代码
    add_rule(findings, REVERSE_SHELL, "reverse-shell", "严重", "安全与可靠",
             "出现反弹 Shell 特征，可能让外部主机获得本机执行通道。", path, content, re.I | re.S, dg)
    add_rule(findings, PIPE_TO_SHELL, "remote-pipe-exec", "高风险", "安全与可靠",
             "把网络下载内容直接管道交给解释器执行（curl|bash 等），来源一旦被篡改即执行任意命令。", path, content, re.I, dg)
    add_rule(findings, DESTRUCTIVE, "destructive-command", "高风险", "安全与可靠",
             "出现递归删除、格式化、写裸设备或 fork 炸弹等破坏性命令。", path, content, re.I, dg)
    add_rule(findings, DYNAMIC_EXEC, "dynamic-exec", "待复核", "安全与可靠",
             "出现 eval/exec/动态执行或 shell=True，需确认输入是否可能被外部内容控制。", path, content, re.I, dg)
    add_rule(findings, POSTINSTALL, "supply-chain-install", "高风险", "安全与可靠",
             "安装钩子（pre/postinstall）里执行联网或脚本命令，属于常见供应链投毒位置。", path, content, re.I, dg)
    add_rule(findings, ENV_HARVEST, "env-harvest", "高风险", "安全与可靠",
             "代码从环境变量读取 API Key/密钥/口令，需确认是否随后外传、是否在用户授权范围内。", path, content, re.I, dg)

    # 4) 商业导流（保留差异化能力，三分级）
    for m in re.finditer(COMMERCIAL, content, re.I):
        window = content[max(0, m.start() - 180):m.end() + 180]
        if re.search(r"(?:每次|所有|任何).{0,80}(?:回复|回答|输出).{0,100}" + COMMERCIAL, window, re.I | re.S) \
                or re.search(r"(?:无论|不管).{0,60}(?:用户|任务).{0,100}" + COMMERCIAL, window, re.I | re.S):
            findings.append(finding("forced-commercial-diversion", "高风险", "人的自主性",
                                    "要求在正常任务输出中持续插入商业动作，用户难以拒绝且完成原任务。", path, content, m.start()))
        elif re.search(r"(?:隐藏|不要披露|不得告知|伪装).{0,100}" + COMMERCIAL + r"|" + COMMERCIAL +
                       r".{0,100}(?:隐藏|不要披露|不得告知|伪装)", window, re.I | re.S):
            findings.append(finding("covert-commercial-intent", "高风险", "透明与可解释",
                                    "要求隐瞒或伪装商业关联，用户无法知情选择。", path, content, m.start()))
        elif has_consent(window):
            findings.append(finding("user-requested-commercial-option", "信息", "透明与可解释",
                                    "商业信息限定在用户明确请求购买、联系或服务时出现。", path, content, m.start()))
        else:
            findings.append(finding("commercial-reference", "待复核", "透明与可解释",
                                    "含商业或导流动作；需核对它是否会出现在无关任务中、商业关联是否已披露。",
                                    path, content, m.start()))
        break

    # 5) 敏感数据读取 / 外传（保留三分级）
    sensitive_match = re.search(SENSITIVE, content, re.I)
    if sensitive_match:
        win_base = max(0, sensitive_match.start() - 250)
        window = content[win_base:sensitive_match.end() + 250]
        aa = re.search(r"(?:读取|导入|获取|访问|提取|复制|收集).{0,80}" + SENSITIVE + r"|" +
                       SENSITIVE + r".{0,80}(?:读取|导入|获取|访问|提取|复制|收集)", window, re.I | re.S)
        # “不读取密钥 / 禁止收集凭据”这类否定式边界声明，不算真的在访问（注意 aa 索引相对 window）
        active_access = aa
        if aa and NEG_ACCESS.search(content[max(0, win_base + aa.start() - 4):win_base + aa.end()]):
            active_access = None
        exfiltration = has_real_egress(window)
        if active_access and exfiltration:
            findings.append(finding("sensitive-data-exfiltration", "严重", "安全与可靠",
                                    "同时涉及读取敏感数据与向外部发送/上传，应立即核对数据去向和授权。",
                                    path, content, sensitive_match.start()))
        elif active_access and has_consent(window):
            findings.append(finding("authorized-sensitive-access", "信息", "透明与可解释",
                                    "敏感数据能力说明了用户明确授权的前提；执行前仍应展示范围与去向。",
                                    path, content, sensitive_match.start()))
        elif active_access:
            findings.append(finding("undisclosed-sensitive-access", "高风险", "安全与可靠",
                                    "涉及读取或导入敏感数据，却没有看到明确的用户授权前提。",
                                    path, content, sensitive_match.start()))

    # 独立网络命令只作提醒
    m = re.search(r"\b(?:curl|wget|nc|ncat|ssh|scp)\b", content.lower())
    if m and not re.search(r"(?:敏感|cookie|凭据|密钥|token).{0,240}" + NETWORK, content, re.I | re.S):
        findings.append(finding("external-command", "待复核", "安全与可靠",
                                "包含外部命令或网络访问；需核对目标、数据范围和用户授权。", path, content, m.start()))

    # 6) 致命三连：指令覆盖 + 联网 + 执行代码 同时出现，复合升级为严重
    has_override = any(f["rule"] in {"prompt-injection", "instruction-hijacking"} for f in findings)
    has_network = re.search(NETWORK, content, re.I) is not None
    has_exec = any(f["rule"] in {"reverse-shell", "remote-pipe-exec", "dynamic-exec", "encoded-then-exec",
                                 "destructive-command", "supply-chain-install"} for f in findings)
    if has_override and has_network and has_exec:
        findings.append(finding("lethal-trifecta", "严重", "安全与可靠",
                                "同一文件同时具备『覆盖指令 + 联网 + 执行代码』，单独看像普通能力，合起来构成完整攻击链，优先处置。",
                                path, content, 0))
    return findings


def scan_skill(skill_dir: Path):
    findings = []
    for file_path in scanned_files(skill_dir):
        try:
            raw = file_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        findings.extend(scan_content(file_path, raw, skill_dir.name))
    findings.sort(key=lambda item: (ORDER[item["severity"]], item["file"], item["line"]))
    return {"name": skill_dir.name, "path": str(skill_dir), "is_symlink": skill_dir.is_symlink(),
            "findings": findings}


def print_report(results, roots, duplicates):
    counts = Counter(item["severity"] for result in results for item in result["findings"])
    print("# 本地 skill 审查报告")
    print(f"扫描范围：{', '.join(str(r) for r in roots if r.exists()) or '未找到默认目录'}")
    print(f"发现 skill：{len(results)}（已合并 {duplicates} 个软链、镜像或内嵌副本）")
    print(f"严重：{counts['严重']}｜高风险：{counts['高风险']}｜待复核：{counts['待复核']}｜信息：{counts['信息']}")
    for result in results:
        if not result["findings"]:
            continue
        print(f"\n## {result['name']}\n位置：`{result['path']}`")
        for item in result["findings"]:
            print(f"\n- {item['severity']}｜{item['rule']}｜{item['principle']}\n"
                  f"  - {item['file']}:{item['line']}\n  - {item['message']}\n  - 命中：`{item['excerpt']}`")
    if not any(r["findings"] for r in results):
        print("\n未发现本规则集中的风险信号。该结果不等于安全保证。")
    print("\n扫描为只读，未修改任何文件，也未执行被扫描脚本。隔离前请逐个确认目标路径。")


def collect(roots):
    skills, duplicates = find_skills(roots)
    skills = [p for p in skills if p.name != SELF_NAME]
    return [scan_skill(p) for p in skills], roots, duplicates


def command_scan(args):
    roots = [Path(p).expanduser() for p in args.root] if args.root else DEFAULT_ROOTS
    results, roots, duplicates = collect(roots)
    if args.format == "json":
        print(json.dumps({"roots": [str(r) for r in roots], "deduplicated": duplicates,
                          "skills": results}, ensure_ascii=False, indent=2))
    else:
        print_report(results, roots, duplicates)
    return 0


def safe_extract_zip(zip_path: Path, dest: Path):
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.namelist():
            target = (dest / member).resolve()
            if dest.resolve() not in target.parents and target != dest.resolve():
                raise ValueError(f"压缩包含越界路径：{member}")
        zf.extractall(dest)


def prepare_source(source: str):
    """把本地目录 / 本地 zip / GitHub 链接准备成一个待扫目录；返回 (目录, 临时目录或None)。全程不执行其中代码。"""
    tmp = None
    if re.match(r"https?://", source):
        tmp = Path(tempfile.mkdtemp(prefix="skill-inspect-"))
        if "github.com" in source and not source.lower().endswith(".zip"):
            proc = subprocess.run(["git", "clone", "--depth", "1", source, str(tmp / "repo")],
                                  capture_output=True, text=True)
            if proc.returncode != 0:
                shutil.rmtree(tmp, ignore_errors=True)
                raise RuntimeError(f"克隆失败：{proc.stderr.strip()}")
            return tmp / "repo", tmp
        zip_path = tmp / "source.zip"
        urllib.request.urlretrieve(source, zip_path)
        safe_extract_zip(zip_path, tmp / "repo")
        return tmp / "repo", tmp
    p = Path(source).expanduser()
    if p.is_file() and p.suffix.lower() == ".zip":
        tmp = Path(tempfile.mkdtemp(prefix="skill-inspect-"))
        safe_extract_zip(p, tmp / "repo")
        return tmp / "repo", tmp
    return p, None


def command_inspect(args):
    try:
        target, tmp = prepare_source(args.source)
    except Exception as exc:  # noqa: BLE001
        print(f"准备待扫来源失败：{exc}", file=sys.stderr)
        return 2
    try:
        roots = [target]
        results, roots, duplicates = collect(roots)
        if args.format == "json":
            print(json.dumps({"source": args.source, "skills": results}, ensure_ascii=False, indent=2))
        else:
            print(f"安装前只读审查：{args.source}\n")
            print_report(results, roots, duplicates)
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)
    return 0


def command_quarantine(args):
    skill_dir = Path(args.skill).expanduser().absolute()
    if not args.yes:
        print("拒绝执行：隔离操作需要 --yes。", file=sys.stderr)
        return 2
    if not (skill_dir / "SKILL.md").is_file() or skill_dir.name == SELF_NAME:
        print(f"拒绝执行：目标必须是除 {SELF_NAME} 外、且含 SKILL.md 的 skill 目录。", file=sys.stderr)
        return 2
    if skill_dir.is_symlink():
        target = os.readlink(skill_dir)
        skill_dir.unlink()
        print(json.dumps({"action": "removed_symlink", "path": str(skill_dir),
                          "source_retained": target, "reason": args.reason}, ensure_ascii=False))
        return 0
    destination = QUARANTINE_ROOT / datetime.now().strftime("%Y%m%d-%H%M%S") / skill_dir.name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(skill_dir), str(destination))
    print(json.dumps({"action": "quarantined", "from": str(skill_dir), "to": str(destination),
                      "reason": args.reason}, ensure_ascii=False))
    return 0


def command_list_quarantine(_):
    entries = sorted(QUARANTINE_ROOT.rglob("SKILL.md")) if QUARANTINE_ROOT.exists() else []
    print("\n".join(str(item.parent) for item in entries) or "隔离区为空。")
    return 0


def command_restore(args):
    source, target = Path(args.source).expanduser().absolute(), Path(args.target).expanduser().absolute()
    if (not args.yes or not str(source).startswith(str(QUARANTINE_ROOT)) or
            not (source / "SKILL.md").is_file() or target.exists() or target.is_symlink()):
        print("拒绝执行：需 --yes；来源须在隔离区且目标不存在。", file=sys.stderr)
        return 2
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(target))
    print(json.dumps({"action": "restored", "from": str(source), "to": str(target)}, ensure_ascii=False))
    return 0


def main():
    parser = argparse.ArgumentParser(description="扫描、安装前审查与可恢复隔离本地 skill。")
    sub = parser.add_subparsers(dest="command", required=True)

    scan = sub.add_parser("scan", help="只读扫描已安装 skill")
    scan.add_argument("--root", action="append", default=[])
    scan.add_argument("--format", choices=["text", "json"], default="text")
    scan.set_defaults(handler=command_scan)

    inspect = sub.add_parser("inspect", help="安装前只读审查单个目录 / 本地 zip / GitHub 链接")
    inspect.add_argument("source")
    inspect.add_argument("--format", choices=["text", "json"], default="text")
    inspect.set_defaults(handler=command_inspect)

    q = sub.add_parser("quarantine", help="隔离一个明确指定的 skill")
    q.add_argument("skill")
    q.add_argument("--reason", default="用户确认")
    q.add_argument("--yes", action="store_true")
    q.set_defaults(handler=command_quarantine)

    lst = sub.add_parser("list-quarantine", help="列出隔离区")
    lst.set_defaults(handler=command_list_quarantine)

    r = sub.add_parser("restore", help="从隔离区恢复 skill")
    r.add_argument("source")
    r.add_argument("target")
    r.add_argument("--yes", action="store_true")
    r.set_defaults(handler=command_restore)

    args = parser.parse_args()
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
