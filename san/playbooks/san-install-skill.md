---
name: san-install-skill
description: 将单个 Skill 或 Skill 集合安装到通用 Agents、Claude Code、Codex、WorkBuddy、Grok、Hermes Agent、Kiro、Qwen Code、Cline 等 Agent。用户要求跨 Agent 安装、同步、查看、去重或卸载 Skill 时使用。
metadata:
  version: 1.0.1
---

# san-install-skill：多端 Skill 安装与同步

把任意包含 `SKILL.md` 的 Skill 源目录，或包含多个 Skill 子目录的集合目录，安装到本机已经存在的 Agent。

用户始终使用同一条命令。脚本自动选择公共入口或专属入口，用户无需判断宿主类型，也无需添加模式参数。

---

## 自动路由

### 公共入口

脚本始终把 Skill 软链写入：

- 通用 Agents：`~/.agents/skills/<skill-name>`

以下客户端可以读取该公共入口，因此不再写入各自的专属目录：

- Codex；
- GitHub Copilot；
- Gemini CLI；
- Cursor；
- Augment；
- Roo Code；
- OpenCode；
- OpenHands。

同一个 Skill 不会同时出现在 `~/.agents/skills` 和上述客户端的专属目录中。这样可以避免 Codex 等客户端重复显示。

### 专属入口

以下客户端当前仍使用专属目录。只有对应主目录已经存在时，脚本才创建软链：

- Claude Code：`~/.claude/skills/<skill-name>`；
- WorkBuddy：`~/.workbuddy/skills/<skill-name>`；
- Hermes Agent：`~/.hermes/skills/<skill-name>`；
- Kiro：`~/.kiro/skills/<skill-name>`；
- Qwen Code：`~/.qwen/skills/<skill-name>`；
- Cline：`~/.cline/skills/<skill-name>`。

### Grok 薄适配层

本机存在 `~/.grok` 时，脚本生成：

- `~/.grok/skills/<skill-name>/SKILL.md`

该文件必须包含 `user_invocable: true`，并指向真源 `SKILL.md`。

### 自动清理

每次执行 `link` 时，脚本同时处理历史遗留项：

1. 删除公共入口兼容客户端专属目录中指向同一真源的冗余软链；
2. 删除旧版脚本曾写入、当前已停止维护的宿主软链；
3. 删除同一宿主中指向同一真源、且规范名称已经存在的旧别名；
4. 集合安装时删除指向集合内已失效源目录的断裂软链和 Grok 适配层；
5. 保留真实目录、真实文件以及指向其他来源的软链，并报告冲突；
6. 不删除源 Skill。

---

## 核心原则

1. **一个公共入口。** 支持通用 Agents 目录的客户端统一读取 `~/.agents/skills`。
2. **必要时补专属入口。** 仅给当前仍依赖原生目录的客户端创建软链。
3. **用户无需选择模式。** 脚本不要求用户提供路由参数。
4. **公共兼容客户端只保留一份。** Codex 等客户端不能同时存在公共入口和专属入口。
5. **各宿主只使用软链。** Grok 是唯一使用薄适配层的宿主。
6. **不创建不存在的 Agent 主目录。** `~/.agents` 是公共安装入口，可以由脚本创建；其他 Agent 主目录不存在时直接跳过。
7. **不覆盖真实目录。** 目标位置已有真实目录或文件时，保留并报告。
8. **卸载只删派生产物。** `unlink` 只删除指向指定真源的软链，以及本工具生成的 Grok 适配层。
9. **优先使用脚本。** 使用本 Skill 自带的 `scripts/install-skill.sh`，不要临场重写安装命令。

---

## 确定源 Skill

用户可能提供：

- Skill 名称：`my-skill`；
- 相对路径：`skills/my-skill`；
- 绝对路径：`/absolute/path/projects/my-skill`；
- 外部 Skill：`/absolute/path/external-skills/lark-doc`；
- Skill 集合目录：`/absolute/path/skills`；
- 当前上下文刚创建或刚修改的 Skill。

按以下优先级判断：

1. 用户给了绝对路径，直接使用；
2. 用户给了相对路径，先按当前工作目录解析，再按公共技能根目录解析；
3. 用户只给 Skill 名称，先查当前工作目录，再查公共技能目录 `~/.agents/skills/<name>`；
4. 用户只说“这个 Skill”，使用当前对话刚创建、改名或讨论的 Skill；
5. 仍不确定时，查看当前工作目录和公共技能目录下最近修改的 Skill；
6. 仍无法确定时，只问一句：`安装哪个 Skill？给我 Skill 名称或路径。`

源目录必须满足以下任一条件：

- 目录本身包含 `SKILL.md`；
- 目录的一级子目录中包含一个或多个 `SKILL.md`。

入口名优先读取真源 `SKILL.md` frontmatter 中的 `name`；只有 `name` 缺失时才退回源目录名。这样源目录可以使用分类前缀，各 Agent 仍保持稳定的历史触发名。

---

## 执行安装

用本 Skill 自带脚本的绝对路径运行（独立安装后位于公共技能目录）：

```bash
~/.agents/skills/san-install-skill/scripts/install-skill.sh link <skill-name-or-path>
```

示例：

```bash
~/.agents/skills/san-install-skill/scripts/install-skill.sh link my-skill
~/.agents/skills/san-install-skill/scripts/install-skill.sh link skills/my-custom-skill
~/.agents/skills/san-install-skill/scripts/install-skill.sh link skills
~/.agents/skills/san-install-skill/scripts/install-skill.sh link "/absolute/path/to/skill"
```

不确定会改动什么时，先加 `--dry-run`（或 `-n`）预演：只打印将要创建/删除的软链和适配层，不真正改动文件系统。

```bash
~/.agents/skills/san-install-skill/scripts/install-skill.sh --dry-run link my-skill
```

执行完成后，根据脚本输出回报公共入口、专属入口、Grok 适配层和冗余清理结果。

---

## 查看已安装列表

用户问“我装了哪些 Skill”“列出所有 Skill”时运行（不需要参数）：

```bash
~/.agents/skills/san-install-skill/scripts/install-skill.sh list
```

它会汇总公共入口、各专属目录和 Grok 适配层，按 Skill 名分组，显示每个 Skill 实际落在哪些端、分别指向哪个真源。

---

## 查看状态

用户问“装好了吗”“有没有重复”“查看安装状态”时运行：

```bash
~/.agents/skills/san-install-skill/scripts/install-skill.sh status <skill-name-or-path>
```

状态正常时，脚本必须输出：

```text
✓ 未发现冗余入口
```

公共兼容客户端的专属目录中仍有同源软链时，状态返回失败并报告：

```text
✗ 发现冗余入口：<target> -> <source>
```

---

## 卸载 Skill

用户说“卸载 Skill”“取消安装”“unlink”时运行：

```bash
~/.agents/skills/san-install-skill/scripts/install-skill.sh unlink <skill-name-or-path>
```

完成后告诉用户：源 Skill 没有被删除，只移除了公共入口、专属入口和 Grok 适配层等派生产物。

---

## 输出规范

安装完成后简短回报：

```markdown
已安装 `<skill-name>`：

- 公共入口：`~/.agents/skills/<skill-name>`；
- 专属入口：仅写入本机已安装且仍需要专属目录的 Agent；
- Grok：`~/.grok/skills/<skill-name>/SKILL.md`（本机存在时）；
- 去重：已清理指向同一真源的历史冗余软链。
```

遇到真实目录或其他来源时：

```markdown
已保留 `<target-path>`，因为它是一个真实目录、真实文件或指向其他来源。需要你手动确认后再处理。
```

---

## 自检

每次执行前后确认：

- 源目录存在；
- 源目录包含 `SKILL.md`，或其一级子目录包含 `SKILL.md`；
- 入口名与真源 frontmatter `name` 一致；缺失 `name` 时才使用源目录名；
- 外部路径使用绝对路径，或能从当前工作目录解析；
- `~/.agents/skills/<name>` 是公共规范入口；
- Codex 等公共兼容客户端的专属目录中没有同源软链；
- 专属宿主目标位置若存在，必须是软链才允许更新；
- Grok 目标位置若存在，必须是本工具生成的 Grok 适配层才允许更新；
- 真实目录、真实文件和其他来源软链没有被删除；
- 源目录没有被删除；
- `private/` 与 `.private/` 没有被读取、复制、暂存或安装。

---

完成当前任务后直接结束，不主动追加与当前任务无关的引导。

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](https://raw.githubusercontent.com/sansan19900801/sansan-install-skill/main/assets/support-qr.jpg)


<!-- sanskill-local handoff adapter v1 -->
## sanskill 套件交接规则

本节只统一跨 Skill 交接，不改变上文业务方法、证据要求和用户确认节点。上文“引导到其他 Skill”等语句是相邻能力说明，不是自行调用或预设下一站的授权。

- 当前任务未完成时，留在本 Skill；本 Skill 内的自然后续仍留在这里。
- 当前任务完成后结束；用户明确问下一步时，交回 /san 推荐并生成提示词，等待用户下一轮发送。
- 用户已明确指定下一个 Skill，或确认存档中的 next_skill 时，可在核对能力存在、依赖与授权后进入该 Skill。
- 任务与本 Skill 不匹配时，保留已有材料交回 /san；总控只推荐，不执行下游任务。
- 不存在的 Skill、缺少的工具或权限必须如实说明，不虚构执行成功。
- 上文如出现 ~/.agents/skills 下的脚本路径，在本套件中使用实际读取的本 Skill 目录定位相同相对路径；不得调用全局同名旧版脚本。
