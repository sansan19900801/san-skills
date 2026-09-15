# san-agent-migration

> 把混乱、半迁移的项目，整理成「单一真源 + 多端薄桥接」、Claude Code / Codex / Grok / 通用 Agents 一致的 Agent 工作台。

## 这是什么

一套带**审计 → 收编 → 命名 → 桥接 → 验证**的迁移流程，不是安装教程，也不是一键脚本。复制一份 `CLAUDE.md` 为 `AGENTS.md` 只算「先跑起来」；本技能要解决的是长期可维护性：规则分层、skill 真源、统一命名、多端 bridge、可持续更新。

## 解决什么问题

- 在 Claude Code、Codex、Grok、豆包 Mac App、Trae Solo 之间来回迁移或想同时兼容；
- skill 散落在 `~/.claude`、`~/.codex`、`~/.grok`、`~/.agents/skills` 和项目各处，命名不一、不知道哪个是真源；
- 建过一些 bridge、复制过规则文件，但不确定是否做完整、多端是否一致。

## 核心思路

1. **真源唯一**：项目内 `skills/` 是真源，各宿主目录只是薄 bridge / 软链入口，长期逻辑只改真源；
2. **规则分层**：平台无关规则进 `AGENTS.md`，宿主专属规则留各自文件；
3. **统一命名**：一个 skill 只有一个 kebab-case 可调用名（san 系列用 `san-` 前缀），目录名 / frontmatter / bridge / 斜杠调用完全一致；
4. **薄桥接**：bridge 只指向真源，不写长逻辑；Grok bridge 必须带 `user_invocable: true`；
5. **分阶段确认**：每个阶段先汇报看到什么、判断什么、准备改什么、为什么，确认后再动手。

## 六个阶段

| 阶段 | 做什么 |
|---|---|
| Phase 1 审计 | 盘点规则文件、skills/、散落候选、各宿主 bridge，判定项目类型与宿主现状 |
| Phase 2 规则迁移 | 拆分/补建 `AGENTS.md` 与各宿主薄兼容层 |
| Phase 3 建立真源 | 发现候选、给清单、确认后收编进项目 `skills/` |
| Phase 4 统一命名 | 规范 name/description/frontmatter/bridge 名 |
| Phase 5 生成 bridge | Claude/Codex/Grok 薄指针 + `~/.agents/skills` 软链（Windows 用 NTFS Junction） |
| Phase 6 验证 | 逐项检查真源、规则层、各端 bridge、悬空引用与 Grok user_invocable |

## 各宿主位置（以官方文档为准，路径会随版本变）

- Claude Code：`CLAUDE.md`、`~/.claude/skills/`
- Codex：`AGENTS.md`、`~/.codex/skills/`、`~/.codex/config.toml`
- Grok Build：`~/.grok/skills/<name>/SKILL.md`
- 通用 Agents（豆包/Trae/Codex 读取）：`~/.agents/skills/<name>`
- Cursor：`.cursor/rules/`；Windsurf：`.windsurfrules`；Gemini：`GEMINI.md`

> Codex `/import`、ChatGPT 桌面端 Import 能一键扫入 Claude/Cursor 的配置，属于「先跑起来」的快捷方式，不替代真源设计；导入后仍建议回到本流程统一。

## 怎么用

```text
/san-agent-migration
帮我把这个 Claude Code 项目整理成 Claude/Codex/Grok 多端一致的工作台
我的 skill 散落各处，帮我收编并统一命名
```

## 边界

- 只做工作台结构迁移，不做商业诊断、知识库内容优化、单个 skill 方法论评审或文案创作；
- 没确认前不移动/覆盖文件；目标位置已有同名真实目录时不覆盖，先报告；
- bridge 里不维护长期逻辑。

## 安装

```bash
npx -y skills add sansan19900801/san-agent-migration -g --all
```

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## 许可证

MIT
