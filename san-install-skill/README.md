# san-install-skill

> 一条命令，把任意 Skill 安装/同步到本机所有 Agent，自动去重、不覆盖你的真实文件。

## 这是什么

一个多端 Skill 安装器。给它一个包含 `SKILL.md` 的目录（或装了多个 Skill 的集合目录），它会用**软链**的方式接到本机已经存在的各个 Agent，不需要你记住每个 Agent 的技能目录在哪。

## 解决什么问题

- 同一个 Skill 要在 Codex、Claude Code、Grok 等多个端各装一遍，目录各不相同；
- 手动复制会产生多份副本，改一次要同步多处，还容易出现重复、旧别名、断链；
- 担心安装脚本误删或覆盖自己手写的真实目录。

## 核心机制：一个公共入口 + 必要时补专属入口

- **公共总线 `~/.agents/skills`**：Codex、Copilot、Gemini CLI、Cursor、Augment、Roo、OpenCode、OpenHands 等都从这里读取，只装一份，避免重复显示。
- **专属软链**：Claude Code（`~/.claude/skills`）、WorkBuddy、Hermes、Kiro、Qwen、Cline 仍用各自原生目录，**只有该端主目录已存在时才创建**，不会凭空给你建一堆目录。
- **Grok 薄适配层**：Grok 不直接用软链，脚本生成一个指向真源的 bridge 文件（含 `user_invocable: true`）。
- **只用软链、不复制**：真源只有一份，改真源所有端即时生效。
- **绝不覆盖真实目录/文件**：目标位置若是真实条目就保留并报告冲突；卸载只删本工具生成的派生软链和 bridge，**不删真源**。
- **自动清理**：每次 link 顺带清理同源冗余软链、已停维护宿主里的旧链、重复旧别名和失效断链。

## 命令

脚本路径：`~/.agents/skills/san-install-skill/scripts/install-skill.sh`，下面用 `$S` 代指。

| 命令 | 作用 |
| --- | --- |
| `$S link <名称或路径>` | 安装一个 Skill 或整个集合 |
| `$S unlink <名称或路径>` | 卸载（只删派生软链/bridge，不删源） |
| `$S status <名称或路径>` | 检查安装状态、有无冗余入口 |
| `$S list` | 列出本机所有已安装 Skill 及各自落在哪些端 |
| `$S --dry-run link/unlink ...` | 预演：只打印将要建/删什么，不改动文件系统 |
| `$S -h` | 帮助 |

### 示例

```bash
S=~/.agents/skills/san-install-skill/scripts/install-skill.sh

$S link my-skill                 # 按名称（会在当前目录和 ~/.agents/skills 找）
$S link /abs/path/to/a-skill     # 按绝对路径
$S link skills                   # 一次安装集合目录下的全部 Skill
$S --dry-run link my-skill       # 先预演，确认无误再真装
$S status my-skill
$S list
$S unlink my-skill
```

## 源如何被找到

按优先级：绝对路径 → 当前工作目录相对路径 → 公共技能目录 `~/.agents/skills/<name>`。入口名优先取真源 `SKILL.md` frontmatter 里的 `name`，缺失时才用目录名，因此源目录可以带分类前缀、各端仍保持稳定触发名。

## 安全边界

- 不创建不存在的 Agent 主目录（公共入口 `~/.agents` 除外）；
- 不覆盖、不删除真实目录和真实文件，遇到冲突只报告；
- 卸载只删指向指定真源的派生物，指向其他源的软链一律保留；
- 不读取、不复制、不安装 `private/` 与 `.private/` 目录。

## 安装

```bash
npx -y skills add sansan19900801/san-install-skill -g --all
```

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## 许可证

MIT
