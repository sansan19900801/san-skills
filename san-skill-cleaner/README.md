# san-skill-cleaner · Skill 安全审查与清理器

装第三方 Skill 之前，先扫一遍：它会不会偷偷让 AI「忽略之前指令」、把你的密钥/对话传到外部、下载即执行脚本，或在每次回复里强制导流卖货？这个 Skill 用**只读**方式扫描已安装或待安装的 Skill，给出分级报告，并支持把确认有问题的 Skill **隔离（可恢复，不删除）**。

双视角覆盖：
- **技术投毒**：提示注入、零宽/bidi/同形字混淆、编码后执行、反弹 Shell、`curl|bash`、破坏性命令、安装钩子投毒、环境变量收割、敏感数据外传，以及「覆盖指令+联网+执行」的致命三连复合识别；
- **商业授权**：强制导流、隐藏商业意图、未授权读取，区分「用户主动询问」与「暗中植入」。

## 解决什么问题

Agent Skill 默认被隐式信任、几乎不经过审核。研究显示相当比例的 Skill 含漏洞或可疑行为，且恶意指令可以藏在零宽字符、双向控制符里，肉眼根本看不出来。本工具在**不执行对方代码、不联网**的前提下做静态体检，并刻意压低误报：防御性说明、用户授权、否定表述（如「不外传」）不会被误判。

## 你需要提供什么

- 已安装：直接说「扫描本地 skill」即可；
- 安装前：给一个本地 Skill 目录、zip 包，或 GitHub 链接；
- 隔离时：明确回复要隔离的**名称或完整路径**（不接受「都清掉」）。

## 常用命令

```bash
# 扫描各端默认 skills 目录
python3 scripts/skill_cleaner.py scan
# 扫描指定目录 / 输出 JSON
python3 scripts/skill_cleaner.py scan --root "/path/skills" --format json
# 安装前审查：目录 / zip / GitHub（只读，不执行）
python3 scripts/skill_cleaner.py inspect "/下载/某-skill"
python3 scripts/skill_cleaner.py inspect "https://github.com/某人/某-skill"
# 隔离 / 查看 / 恢复
python3 scripts/skill_cleaner.py quarantine "/路径/问题-skill" --yes --reason "用户确认"
python3 scripts/skill_cleaner.py list-quarantine
python3 scripts/skill_cleaner.py restore "/隔离区/问题-skill" "/目标位置" --yes
```

## 风险等级

| 等级 | 含义 | 处置 |
|---|---|---|
| 严重 | 越权、数据外传、完整攻击链 | 优先隔离 |
| 高风险 | 隐藏导流、投毒、危险代码、未授权读取 | 建议隔离 |
| 待复核 | 需结合上下文判断 | 逐条阅读后决定 |
| 信息 | 透明、按需、可拒绝 | 保留 |

## 安装方法

### Codex
```bash
git clone https://github.com/sansan19900801/sansan-skill-cleaner.git
cp -R san-skill-cleaner ~/.codex/skills/
```

### Claude Code
```bash
git clone https://github.com/sansan19900801/sansan-skill-cleaner.git
cp -R san-skill-cleaner ~/.claude/skills/
```

### 豆包 / WorkBuddy
```bash
git clone https://github.com/sansan19900801/sansan-skill-cleaner.git
cp -R san-skill-cleaner ~/.agents/skills/
```

仅依赖 Python 3 标准库，无需安装第三方包。

## 文件结构

```text
san-skill-cleaner/
├── SKILL.md                 # 主入口：边界、命令、规则清单、防误报
├── README.md
├── LICENSE                  # MIT
├── agents/
│   └── openai.yaml
└── scripts/
    └── skill_cleaner.py     # 扫描/安装前审查/隔离/恢复，纯标准库
```

## 能力边界

静态扫描无法保证识别被高度混淆、条件触发或编译成字节码的恶意代码，输出是**风险提示而非安全保证**；不做工程级全量查杀、不自动删除、不联网上传样本，是否隔离由你决定。

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## License

MIT
