---
name: san-agent-migration
description: 审计项目规则文件、识别真源、统一命名并生成桥接，把项目迁移成多端一致的 Agent 工作台。用户要求迁移 Claude Code、Codex、Grok、通用 Agents 或整理 AGENTS.md 时使用。
metadata:
  version: 1.0.1
---

# san-agent-migration：Agent 工作台迁移

你的任务是把一个项目从混乱、半迁移、不可维护的状态，整理成一套可长期维护的 Agent 工作台。工作包括审计规则文件、识别真源、统一命名、生成 bridge 和验证结构。

**这不是安装教程，也不是脚本执行器。** 你做的是一套带审计、收编、命名、桥接和验证的迁移流程。

**核心目标：让 Agent 配置从「能凑合用」变成「结构清楚、真源明确、Claude Code / Codex / Grok / 通用 Agents 多端一致」。**

---

## 一句话定义

本技能解决的是 **Agent 工作台的结构迁移**，不是单一平台迁移。

它支持：

- `Claude Code → Codex`、`Codex → Claude Code`
- `Claude Code / Codex → Grok`、`Grok → Claude Code / Codex`
- `Claude + Codex + Grok + 通用 Agents 多端统一`
- `豆包 Mac App / Trae Solo / Codex 读取的 ~/.agents/skills 纳入统一`
- `混乱项目 → 标准 Agent 工作台`

它不负责：商业诊断本身、知识库内容优化、单个 skill 方法论质量评审、业务文案创作。

---

## 什么时候用

- 想把 Claude Code 项目迁到 Codex 或 Grok，或反向补回；
- 想同时兼容 Claude Code、Codex、Grok、豆包 Mac App、Trae Solo 等多端；
- 觉得 Agent 工作台很乱，想统一整理；
- 问 `CLAUDE.md`、`AGENTS.md`、skill bridge、真源怎么设计；
- 本地 skill 散落各处不知道怎么收编；
- 已在 Grok TUI 或 `~/.agents/skills` 建了 skill，想和其他端打通；
- 已复制过 `CLAUDE.md`、建过一些 bridge，但不确定是否做完整。

---

## 核心原则

### 原则 1：迁移不是复制文件，也不是单向搬家

复制 `CLAUDE.md` 为 `AGENTS.md` 最多只解决「先跑起来」。真正的迁移至少要解决：

1. 项目级规则文件（`AGENTS.md` 作为多端共同基础）
2. skill 真源位置（通常是项目内 `skills/`）
3. bridge 命名规则（多端同一套规范名）
4. Claude Code / Codex / Grok / 通用 Agents 多端一致
5. 可持续维护

### 原则 2：真源优先，bridge 从真源生成

- `skills/` 是理想真源目录；
- 各宿主目录只是 bridge 或安装入口，不要把长期逻辑维护在 bridge 里。

**各宿主常见位置对照（路径会随版本更新，以各工具官方文档为准）：**

| 宿主 | 规则/说明文件 | skill / 指令位置 |
|---|---|---|
| Claude Code | 项目 `CLAUDE.md`、全局 `~/.claude/CLAUDE.md` | `~/.claude/skills/`、`~/.claude/commands/` |
| Codex | 项目/全局 `AGENTS.md`、`~/.codex/config.toml` | `~/.codex/skills/`、`~/.codex/prompts/` |
| Grok Build | — | `~/.grok/skills/<name>/SKILL.md` |
| 通用 Agents（豆包 Mac App / Trae Solo / Codex 等） | `AGENTS.md` | `~/.agents/skills/<name>` |
| Cursor | `.cursor/rules/`（也读根目录 `CLAUDE.md`/`AGENTS.md`） | `.cursor/rules/` |
| Windsurf | `.windsurfrules` | — |
| Gemini | `GEMINI.md` | — |

> 快捷方式不是迁移：Codex 自带 `/import`、ChatGPT 桌面端 Import 可一键扫入 Claude Code/Cursor 的 skills、指令、`CLAUDE.md`（按 `AGENTS.md` 认）和近 30 天会话。它能帮你「先跑起来」，但不建立真源、不保证多端长期一致——导入后仍要按本流程回到「单一真源 + 薄 bridge」。

### 原则 3：不能假设项目已经规范

必须适配 4 类规则层项目：

1. 已有 `CLAUDE.md` + `AGENTS.md` + `SOURCE_OF_TRUTH.md` + `skills/`，基本齐全但可能半迁移；
2. 只有 `CLAUDE.md`，缺项目级公共规则层；
3. 只有 `AGENTS.md`，但宿主兼容层不完整；
4. skill 散落各处，根本没有 `skills/`。

宿主覆盖也要适配：只有单侧 / 两侧或多侧但不一致 / 多端都不成体系。

### 原则 4：多步确认是产品的一部分

每一阶段都要让用户知道：你看到了什么、判断了什么、下一步准备改什么、为什么。不要一口气做完再汇报。

---

## Grok 专属约束（必须严格遵守）

Grok Build（Grok TUI）对 bridge 有明确要求：

- Grok bridge **必须**在 frontmatter 里包含 `user_invocable: true`，否则用户在 Grok TUI 输入 `/` 后搜不到；
- description 要写清「在 Grok TUI 中可通过 `/xxx` 触发；触发后必须先读取项目真源 SKILL.md」；
- 正文推荐 `## Grok Bridge` 小节 + 清晰的 Source of truth 绝对路径；
- Grok 主要通过 `~/.grok/skills/<name>/SKILL.md` 加载 bridge。

---

## 工作流程

### Phase 1：迁移审计

检查：`CLAUDE.md`、`AGENTS.md`、`SOURCE_OF_TRUTH.md`、项目是否有 `skills/`、是否有散落 skill 候选、四个宿主目录是否已有 bridge、当前主工作台偏哪端。

把项目判为规则层类型：

- **A 类**：规则文件和 `skills/` 基本齐全，但可能半迁移；
- **B 类**：有 `CLAUDE.md`，缺 `AGENTS.md` 或公共规则层；
- **C 类**：有 `AGENTS.md`，宿主兼容层不完整；
- **D 类**：没有规范，skill 散落。

再补一句宿主判断（如「Claude 主、Codex 缺、Grok 缺」「多端都有但不一致」等）。

**Phase 1 输出**：①属于哪一类；②已做对什么；③真正缺什么；④建议先动哪一层。然后问：

> 我已经完成第一轮审计。接下来准备处理 {下一阶段}，继续吗？

### Phase 2：规则文件迁移

- 有 `CLAUDE.md`：拆出平台无关规则写入 `AGENTS.md`，Claude 专属规则留在 `CLAUDE.md`，删除过时、重复、宿主绑定太强的内容；
- 没有 `CLAUDE.md`：按项目类型建最小可用 `AGENTS.md`，需要时再补薄 `CLAUDE.md`；
- 只有 `AGENTS.md` 且要补其他端：以它为主规则，按需拆出各宿主薄兼容层；
- 项目复杂但没有 `SOURCE_OF_TRUTH.md`：说明不是硬门槛但强烈建议，用户同意再补。

**写入前确认**：新建/改写哪个文件、保留什么、删除什么、为什么这样分层。

### Phase 3：识别或建立 skill 真源

**情况 A：已有 `skills/`** → 定为真源，排除历史版本、备份、示例、成品文档。

**情况 B：没有 `skills/`** → 进入候选发现模式：

1. 扫描 `SKILL.md`、`*skill*.md`、带明确触发方式和执行步骤的文件；
2. 排除文章、备份、测试案例、导出稿；
3. 生成「候选真源清单」，说明哪些建议收编、哪些不建议；
4. 用户确认后再新建项目级 `skills/`。

候选太少或太不稳定时不要硬建，明确告诉用户：现在只是「有 prompt 资产」，还没形成 skill 系统。

**Phase 3 确认要求**：给清单而不是直接移动文件，说清哪些认定为真源、哪些不认定、为什么。

### Phase 4：统一命名与 frontmatter

真源确定后统一顶层 frontmatter、`name`、`description`、bridge 规范名。命名规则：

1. 每个 Skill 只保留 1 个可调用名；
2. 可调用名用小写英文 kebab-case；san 正式 Skill 使用 `san-` 前缀，例如 `san-good-question`；
3. 目录名、frontmatter 的 `name`、bridge 目录名、文档中的斜杠调用必须完全一致；
4. 中文名称只作说明标题和自然语言意图，不能作 `/` 调用别名；
5. Codex 的 `agents/openai.yaml` 中，`interface.display_name` 必须与英文标准名一致，不能加 `SANSAN｜`、中文功能名或其他展示前缀；
6. `interface.short_description` 必须写清该 Skill 独有的处理对象、动作与主要结果，不套通用模板，不同 Skill 之间不重复。

不要让脚本根据标题临时取名，也不要保留中文或混合语言的斜杠别名。

### Phase 5：生成多端 bridge（Claude / Codex / Grok / 通用 Agents）

bridge 核心要求：只做入口不维护长逻辑、指向项目真源、多端同一套规范名、Grok bridge 必须带 `user_invocable: true`、通用 Agents 写入 `~/.agents/skills/<name>`。

#### Grok Bridge 精确模板

```yaml
---
name: 技能规范名
user_invocable: true
description: |
  一句话描述。在 Grok TUI 中可通过 /技能规范名 触发；触发后必须先读取项目真源 SKILL.md。
---
# 技能规范名

## Grok Bridge

- Source of truth: /绝对路径/到/项目/skills/技能规范名/SKILL.md
- Read the source-of-truth file before executing this skill.
- Follow the source file's workflow, constraints, examples, and output format.
- Treat this file as a thin Grok bridge only; do not maintain long-form logic here.

## 使用说明

1. 在 Grok TUI 中输入 `/技能规范名` 即可触发。
2. Grok 会优先使用本 bridge 指向的真源。
3. 如需更新，直接修改真源。
```

**必须检查**：`user_invocable: true` 是否存在，description 是否提到 Grok TUI 和触发词，路径是否为正斜杠绝对路径。

#### Claude / Codex Bridge 模板

```yaml
---
name: 技能规范名
description: |
  一句话描述。在 Claude Code / Codex 中作为 bridge 使用；触发后先读取项目真源 SKILL.md。
source_of_truth: /绝对路径/到/项目/skills/技能规范名/SKILL.md
bridge_mode: passthrough
---
# 技能规范名（Claude Code / Codex Bridge）

请读取真源：
`/绝对路径/到/项目/skills/技能规范名/SKILL.md`

本文件为薄 bridge，仅做入口指向。长期逻辑维护在真源。
```

#### 通用 Agents 目录策略

`~/.agents/skills/<name>` 优先用软链指向真源目录（豆包 Mac App、Trae Solo、Codex 会从这里发现 skill）。

- macOS / Linux 用 `ln -s 真源绝对路径 ~/.agents/skills/<name>`；
- Windows 无管理员权限时用目录联接：`cmd /c mklink /J "%USERPROFILE%\.agents\skills\<name>" "真源路径"`（NTFS Junction，效果等同软链且不需要管理员）；
- 目标位置已有同名**真实目录或文件**：不覆盖，报告路径与类型，让用户确认是否迁出旧目录；
- 已有同名**软链/联接**：可更新到新真源，更新后用 `readlink`（Windows 用 `dir`）确认指回预期路径。

#### Phase 5 执行策略

1. 告诉用户准备为哪些宿主生成 bridge；
2. 得到明确确认后再生成文件内容或先给完整预览；
3. Grok bridge 当场验证 `user_invocable: true`；
4. 通用 Agents 目录优先软链，不复制真源内容；
5. 只有用户明确允许写入目标宿主目录时才直接落盘，否则先给预览。

**写入前确认**：会生成哪些 bridge、覆盖哪些旧 bridge、是否清理旧目录。

### Phase 6：验证

至少验证：

1. `AGENTS.md` 能否独立工作；
2. 真源是否明确；
3. frontmatter 是否补齐；
4. bridge 能否指回真源；
5. 多端 bridge 集合是否一致；
6. Grok bridge 是否都带 `user_invocable: true`；
7. `~/.agents/skills` 目标是否存在真实目录冲突或悬空软链；
8. 是否存在悬空引用。

**Phase 6 输出**：逐项说明真源、规则层、Claude/Codex/Grok/通用 Agents bridge 是否完成（Grok 含 user_invocable 验证）、多端是否一致、后续如何维护（以后只改真源，再重新生成对应 bridge）。

---

## 禁止事项

- 不要把复制 `CLAUDE.md` 当成完整迁移；
- 不要假设用户一定有 `skills/`；
- 不要把散落文档一股脑认定为 skill；
- 不要在没确认时直接移动一堆文件；
- 不要让 bridge 命名临场发挥；
- 不要在 bridge 中维护长期逻辑；
- **Grok bridge 绝对不能漏写 `user_invocable: true`**。

---

## 推荐收尾话术

收尾时交代：

1. 现在这个项目属于「可运行迁移」还是「完整迁移」；
2. 已经补了哪些结构层（特别点出 Grok 和 `~/.agents/skills`）；
3. 后面还有什么可选优化；
4. 别人照着做的最小步骤是什么；
5. 以后怎么维护：只改真源，重新生成对应宿主的 bridge。

---

完成当前任务后直接结束，不主动追加与当前任务无关的引导。

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](https://raw.githubusercontent.com/sansan19900801/sansan-agent-migration/main/assets/support-qr.jpg)


<!-- sanskill-local handoff adapter v1 -->
## sanskill 套件交接规则

本节只统一跨 Skill 交接，不改变上文业务方法、证据要求和用户确认节点。上文“引导到其他 Skill”等语句是相邻能力说明，不是自行调用或预设下一站的授权。

- 当前任务未完成时，留在本 Skill；本 Skill 内的自然后续仍留在这里。
- 当前任务完成后结束；用户明确问下一步时，交回 /san 推荐并生成提示词，等待用户下一轮发送。
- 用户已明确指定下一个 Skill，或确认存档中的 next_skill 时，可在核对能力存在、依赖与授权后进入该 Skill。
- 任务与本 Skill 不匹配时，保留已有材料交回 /san；总控只推荐，不执行下游任务。
- 不存在的 Skill、缺少的工具或权限必须如实说明，不虚构执行成功。
- 上文如出现 ~/.agents/skills 下的脚本路径，在本套件中使用实际读取的本 Skill 目录定位相同相对路径；不得调用全局同名旧版脚本。
