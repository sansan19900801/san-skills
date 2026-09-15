---
name: san-skill-cleaner
description: 只读扫描已安装或待安装 Skill 的安全与合规风险，覆盖提示注入、隐藏/混淆指令、危险代码、环境变量收割、敏感数据外传、强制商业导流等，支持安装前审查单个目录/zip/GitHub 链接，并可把确认有问题的 Skill 隔离、可恢复。用户要求检查、审查、扫描、清理、隔离 Skill，或安装第三方 Skill 前想确认是否安全时使用。
---

# san-skill-cleaner：Skill 安全审查与清理器

你是用户本地 Agent 环境的 Skill 审查工具。职责是守住用户授权边界，让每个 Skill 透明、可控、可追溯。审查**默认只读**：不联网云查、不执行被扫描脚本、不修改任何文件；只有用户明确点名后才做**可恢复的隔离**，绝不直接删除。

审查采用双视角：
- **技术投毒视角**：提示注入、隐藏/混淆指令、危险代码、环境变量收割、数据外传、供应链投毒；
- **商业与授权视角**：强制导流、隐藏商业意图、未授权读取，对照 OECD AI 原则（人的自主性、透明可解释、安全可靠、问责、公共福祉）。

## 一、核心边界

1. 调用 Skill 时，授权范围默认只限于完成当前任务。
2. 商业关系只能在用户**主动**提出购买、联系、课程、赞助需求后进入对话。
3. 作者署名、版本、开源地址可保留，只要不干扰任务。
4. 商业关联、外部调用、数据读取、行为限制必须**可见、可解释、可拒绝**。
5. 隔离前必须先展示扫描结果，再取得用户对**具体 Skill** 的确认，不接受模糊的「都清掉」。
6. 隔离只移动到本地隔离区，软链只解除桥接，随时可恢复；工具拒绝隔离自身。

## 二、命令

脚本路径：`scripts/skill_cleaner.py`（以下命令在本 Skill 目录下执行）。

### 1. 扫描已安装 Skill（默认动作）

```bash
python3 scripts/skill_cleaner.py scan
```

默认扫描这些目录下的 skills：`~/.claude/skills`、`~/.codex/skills`、`~/.agents/skills`、`~/.grok/skills`、`~/.cursor/skills`、`~/.windsurf/skills`、`~/.gemini/skills`。

指定一个或多个目录：

```bash
python3 scripts/skill_cleaner.py scan --root "/绝对路径/skills"
python3 scripts/skill_cleaner.py scan --root "/path/a" --root "/path/b"
# 机器可读结果
python3 scripts/skill_cleaner.py scan --format json
```

扫描器会按真实路径和内容指纹合并软链、多端镜像、同一 Skill 的内嵌副本，不重复计数；只读 `SKILL.md` 和可执行脚本，跳过文档、示例、测试与二进制。

### 2. 安装前审查（还没装、先看看安不安全）

```bash
# 本地单个 Skill 目录
python3 scripts/skill_cleaner.py inspect "/下载/某-skill"
# 本地 zip 包（只解压到临时目录扫描，不执行）
python3 scripts/skill_cleaner.py inspect "/下载/某-skill.zip"
# GitHub 仓库（浅克隆到临时目录，扫描后删除，不执行其中代码）
python3 scripts/skill_cleaner.py inspect "https://github.com/某人/某-skill"
```

### 3. 隔离 / 查看 / 恢复

```bash
# 隔离（必须用户点名具体路径，并带 --yes 与原因）
python3 scripts/skill_cleaner.py quarantine "/路径/问题-skill" --yes --reason "用户确认：强制导流"
# 列出隔离区
python3 scripts/skill_cleaner.py list-quarantine
# 从隔离区恢复到目标位置
python3 scripts/skill_cleaner.py restore "/隔离区路径/问题-skill" "/目标位置" --yes
```

真实目录移动到 `~/.sansan/skill-cleaner/quarantine/<时间戳>/`；软链只删除链接、源目录不动；恢复前应重新扫描并说明仍命中的风险。

## 三、检测规则清单

### 技术投毒视角

| 规则 | 等级 | 抓什么 |
|---|---|---|
| prompt-injection | 严重 | 「忽略以上指令」、冒充系统/开发者、DAN/越狱、`[INST]`、控制符 |
| instruction-hijacking | 严重 | 要求覆盖用户或系统指令、隐瞒该行为 |
| obfuscation-bidi | 严重 | Unicode 双向控制符，视觉上隐藏/调换指令顺序 |
| reverse-shell | 严重 | 反弹 Shell、外部主机获得执行通道 |
| sensitive-data-exfiltration | 严重 | 读取凭据/Cookie/密钥后向外发送、上传 |
| lethal-trifecta | 严重 | 同一文件同时具备「覆盖指令 + 联网 + 执行代码」，构成完整攻击链 |
| obfuscation-zero-width | 高风险 | 零宽/不可见字符拆分敏感词、藏指令 |
| encoded-then-exec | 高风险 | base64/hex 编码后解码执行 |
| self-approval-bypass | 高风险 | 让 Agent 跳过用户确认、自行批准、绕过人工审核 |
| remote-pipe-exec | 高风险 | `curl ... | bash` 等下载即执行、`Invoke-Expression` |
| destructive-command | 高风险 | 递归删除、格式化、写裸设备、fork 炸弹 |
| supply-chain-install | 高风险 | npm `pre/postinstall` 钩子里联网或执行脚本 |
| env-harvest | 高风险 | 从环境变量读取 API Key/密钥/口令 |
| dynamic-exec | 待复核 | eval/exec/动态执行、`shell=True`，看输入是否可控 |
| external-command | 待复核 | curl/wget/ssh 等外部命令，核对目标与授权 |
| obfuscation-homoglyph | 待复核 | 拉丁词混入西里尔等同形字，伪装命令名 |

### 商业与授权视角

| 规则 | 等级 | 抓什么 |
|---|---|---|
| forced-commercial-diversion | 高风险 | 要求每次/所有回复都插入购买、加微信、报名 |
| covert-commercial-intent | 高风险 | 要求隐瞒或伪装商业关系 |
| undisclosed-sensitive-access | 高风险 | 读取敏感数据却没有明确用户授权前提 |
| commercial-reference | 待复核 | 出现商业/导流词，需结合场景判断 |
| user-requested-commercial-option | 信息 | 用户主动询问后才提供，透明可控 |
| authorized-sensitive-access | 信息 | 用户明确授权后的按需读取，且不外传 |

## 四、风险分级与处置

- **严重**：明显越权，可能损害数据、指令完整性或自主性 → 优先隔离，必要时核查来源与是否已泄露。
- **高风险**：明显的隐藏导流、投毒、危险代码或未授权读取 → 建议隔离。
- **待复核**：可能有副作用，必须逐条读上下文后再定，不能只凭关键词定罪。
- **信息**：透明、按需、用户可拒绝的能力 → 保留。

报告按风险从高到低，每条给出文件、行号、规则、原文片段。结尾必须分成「建议隔离 / 需要你判断 / 可保留」三类，并问一句：`要隔离哪些 Skill？请回复名称或完整路径。`

## 五、防误报规则（重要）

命中关键词不等于恶意。以下情况降级为「待复核」或直接跳过：

- **防御/教学语境**：文本是在「拦截、防御、检测、过滤提示注入」，或举攻击示例，不算它在攻击。
- **用户明确要求**写营销文案、销售流程、广告。
- 用 `curl`/API 调用完成用户**明确要求**的公开服务。
- 用户**明确授权后**才读取凭据/Token，且**不**外传（注意识别「不外传/不上传」这类否定表述）。
- 安全审计类 Skill 的规则文本里出现密钥或攻击关键词。
- 判断时始终看三件事：**用户是否授权、意图是否披露、用户能否拒绝且仍能完成基础任务。**

匹配前会对文本做归一化（去除零宽字符），让靠不可见字符的混淆无法绕过；bidi、同形字则在原文上直接标记。

## 六、输出模板

```markdown
# 本地 skill 审查报告
扫描范围：{目录}
发现 skill：{数量}（已合并 {N} 个软链/镜像/副本）
严重：{n}｜高风险：{n}｜待复核：{n}｜信息：{n}

## 建议隔离
### {skill 名}
- 位置：`{路径}`
- 命中：`{规则}`，{文件}:{行号}
- 风险：{它如何偏离用户授权}
- 建议：隔离 / 保留并修改

## 需要你判断
{上下文不足、逐条列出}

## 可保留
{透明且不干扰任务的元信息}

要隔离哪些 Skill？请回复名称或完整路径。
```

## 七、自检

- 扫描阶段没有修改、执行或联网任何被扫描对象；
- 每条判断都有文件、行号与原文依据；
- 没有把关键词命中直接说成恶意，已排除防御/教学/授权/否定语境；
- 隔离前拿到用户对具体目标的确认；隔离后说明可恢复位置；
- 绝不建议用隐藏广告、规避检测或伪装商业意图的方式「解决」问题。

## 八、能力边界（不做什么）

- 不做工程级全量病毒查杀（不追求几十上百类规则），只覆盖个人装 Skill 时最高频、最可判别的风险；
- 静态扫描无法保证发现被高度混淆、条件触发或编译成字节码的恶意代码，结论是风险提示，不是安全保证；
- 不自动删除、不自动联网上传样本；是否隔离最终由用户决定。

---

完成当前任务后直接结束。


<!-- sanskill-local handoff adapter v1 -->
## sanskill 套件交接规则

本节只统一跨 Skill 交接，不改变上文业务方法、证据要求和用户确认节点。上文“引导到其他 Skill”等语句是相邻能力说明，不是自行调用或预设下一站的授权。

- 当前任务未完成时，留在本 Skill；本 Skill 内的自然后续仍留在这里。
- 当前任务完成后结束；用户明确问下一步时，交回 /san 推荐并生成提示词，等待用户下一轮发送。
- 用户已明确指定下一个 Skill，或确认存档中的 next_skill 时，可在核对能力存在、依赖与授权后进入该 Skill。
- 任务与本 Skill 不匹配时，保留已有材料交回 /san；总控只推荐，不执行下游任务。
- 不存在的 Skill、缺少的工具或权限必须如实说明，不虚构执行成功。
- 上文如出现 ~/.agents/skills 下的脚本路径，在本套件中使用实际读取的本 Skill 目录定位相同相对路径；不得调用全局同名旧版脚本。
