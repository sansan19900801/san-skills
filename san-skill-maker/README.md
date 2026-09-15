# san-skill-maker

> 把你反复遇到的一类问题，制作成一个能被 Agent 正确发现、稳定处理、并经过分级验证的单个 Skill。

## 这是什么

一个「做 Skill 的 Skill」（母机）。当你发现某件事要反复交代 AI、每次都要重复同样的判断步骤和标准时，用它把这份经验沉淀成一个可安装、可验证的 Skill 目录。

它不替你凭空造能力，而是带你走完一条严谨的制作链路，并提供脚手架和校验脚本，避免交付「看起来像、实际不稳」的空壳 Skill。

## 解决什么问题

- 同一个问题反复跟 AI 说，每次结果都飘，想把判断标准固化下来；
- 写了个 SKILL.md，但不知道触发准不准、边界清不清、算不算真的能用；
- 想把 Skill 分享出去，需要规范结构、通过校验、并验证安装命令。

## 不解决什么问题

- 一次性、成功无法观察、或主要依赖拿不到的权限/事实的问题，不适合沉淀成 Skill（会直接说明）；
- 不做 Skill 合集/市场，一次只做一个 Skill；
- 默认只做本地交付，**不自动建仓库、不自动 push**；只有你明确要求发布时才进入 GitHub 流程。

## 制作流程（六步）

1. **问题契约**：反复出现的问题、使用情境、要推进的变化、交付结果、完成证据、不处理的近邻问题。
2. **行为契约**：把「好用/专业」这类模糊要求，改写成「必须做到 / 禁止出现 / 允许变化 / 关键失败」等可观察行为。
3. **选择机制**：拆出 Skill 要做的每个判断动作，再决定是否需要理论、行业规则、用户材料或脚本；每个机制都要对应「动作—中间结果—失效边界」。
4. **生成候选**：按需建最小结构（SKILL.md + 可选 references/scripts/assets/agents），脚本只生成带真实内容的初稿，判断条件、边界和停止条件必须由 Agent 补全。
5. **分级验证**：先备 3–6 个样本（正常正例、边界、近邻反例、留出样本），按实际达到的最高等级如实报告。
6. **本地交付 / 可选发布**：本地可用即完整交付；你明确要求时才准备 GitHub 仓库并验证安装。

### 四级验证（达到哪级才许说哪级）

| 等级 | 证据 | 允许的表述 |
| --- | --- | --- |
| 1 结构校验 | frontmatter、引用、资源、脚本静态检查通过 | 「结构校验通过」 |
| 2 行为冒烟 | 完成至少 1 个真实主任务 | 「行为冒烟测试通过」 |
| 3 留出/回归 | 未看预期答案，留出样本通过且无关键回归 | 「当前留出与回归样本通过」 |
| 4 安装交付 | GitHub 来源可安装、资源逐项核对 | 「安装与资源校验通过」 |

没实际跑行为任务，只能报第 1 级；不允许把「写好了」说成「验证过了」。

## 目录与脚本

```text
san-skill-maker/
├── SKILL.md                          主入口：状态判断、制作流程、交付与发布边界
├── agents/openai.yaml                Codex 等平台 UI 元数据
├── references/                       走到对应阶段才读的细节
│   ├── problem-and-goal.md           问题契约与完成条件
│   ├── theory-and-mechanism.md       机制筛选
│   ├── skill-construction.md         Skill 文件构建
│   ├── evaluation.md                 样本与分级验证、失败驱动修改
│   └── github-publishing.md          仅在明确要发布时读取
└── scripts/
    ├── init_skill_project.py         生成带真实内容的最小 Skill 骨架
    ├── validate_skill_project.py     第 1 级结构校验
    ├── prepare_github_repo.py        发布前整理单 Skill 仓库
    └── verify_npx_install.sh         在隔离目录验证安装命令
```

### 常用命令

生成一个新 Skill 初稿：

```bash
python3 scripts/init_skill_project.py <skill-name> --output <父目录> \
  --description "<能力与使用条件>" \
  --task "<反复解决的问题与交付结果>" \
  --workflow "<第 1 个关键动作>" \
  --done "<可观察的完成证据>"
```

结构校验：

```bash
python3 scripts/validate_skill_project.py <skill-directory>
```

## 安全与边界

- 创建远端仓库、push、tag、Release 等外部动作，必须有你的明确授权；
- 不使用 `git add .` / `git add -A`，发布只暂存明确文件；
- 不覆盖已有同名真实目录；不把本地绝对路径、测试答案、密钥写进公开仓库；
- 不读取、复制或发布你未授权的私密材料。

## 安装

```bash
npx -y skills add sansan19900801/san-skill-maker -g --all
```

安装后，当你说「帮我把这个反复做的事做成 Skill」「检查/测试这个候选 Skill」时即会触发。

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## 许可证

MIT
