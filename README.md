# san-skills

> 面向一人公司创业者与内容创作者的中文 AI Skills 工具箱。把真实业务、内容与行动问题交给 Agent，获得清晰判断和可以立刻执行的下一步。

**支持：豆包 Agent Plan、Codex，以及其他支持 Skills 的 Agent。**

san-skills 由三三创建。从一人公司实战经验中筛选、结构化出的方法论，沉淀为 32 个可直接调用的 Skills。

[快速开始](#快速开始) · [安装](#安装) · [能力一览](#能力一览)

## san-skills 解决什么问题

你不需要先学会一套复杂的方法，也不需要知道该调用哪个工具。把当下的业务、内容、选择或卡点交给 Agent，它会根据对话上下文判断该用哪个 Skill。

| 真实处境 | 你会得到 |
| --- | --- |
| 不知道自己的商业模式哪里有问题 | 商业诊断、风险判断和验证动作 |
| 有一个选题，却做不出能被人看完的内容 | 内容方向、开头、标题与逐字稿优化 |
| 知道该做什么，却迟迟推不动 | 对行动卡点的分析和一条可开始的动作 |
| 反复面对同类选择，经验无法积累 | 可回填的决策记录、规律与阶段快照 |
| 文稿、选题、案例散落在多个文件夹 | 可持续维护的内容资产工程 |
| 本地资料很多，希望 Agent 能稳定查找和调用 | 基于文件夹的知识库导航、版本规则与使用入口 |

## 快速开始

安装完成后，直接在 Agent 中使用对应的 Skill。

示例：

```text
/san-diagnosis 我做面向宝妈的收纳咨询，客户总觉得贵。我该调整什么？
/san-content 我想讲"普通人别急着做个人IP"，这个选题怎样做成内容？
/san-hook 这是我短视频前20秒的逐字稿，帮我优化开头：……
/san-benchmark 我想研究企业服务内容账号，应该找哪些对标？
/san-knowledge 帮我把这个文件夹变成知识库，以后我想直接从里面找资料。
```

## 能力一览

| 工作目标 | 主要 Skill | 常见产出 |
| --- | --- | --- |
| 判断生意、产品、定价与客户 | `san-diagnosis` | 商业诊断、风险、验证方案 |
| 找对标并提炼可学习的部分 | `san-benchmark` | 对标筛选与研究框架 |
| 先挖掘相关领域、作者和可信理论，再研究历史同构答案 | `san-standard-answer` | 理论锚点、案例矩阵、条件性答案与失效边界 |
| 做选题、内容、标题与短视频 | `san-content`、`san-hook`、`san-xhs-title` | 内容方向与可发布文案 |
| 发布前检查敏感词、导流、广告与受限内容 | `san-content-risk-check` | 风险检测与最小修改动作 |
| 检查文稿共鸣、逻辑与传播性 | `san-resonate`、`san-script-flow`、`san-spread` | 修改意见与优先级 |
| 澄清概念、目标和问题 | `san-deconstruct`、`san-goal`、`san-good-question` | 可验证的定义与行动目标 |
| 处理拖延和行动受阻 | `san-action` | 卡点分析与下一步动作 |
| 记录、复盘长期决策 | `san-decision`、`san-save`、`san-restore`、`san-report` | 决策档案与报告 |
| 建立和治理文件夹知识库 | `san-knowledge` | 知识库导航、版本规则、健康检查 |
| 建立内容资产与多端 Agent 工作台 | `san-content-system`、`san-agent-migration`、`san-install-skill` | 本地工程与安装方案 |
| 把反复问题制作成单个 Skill | `san-skill-maker` | 可安装 Skill 与分级验证结果 |
| 多专家研讨室，按话题会诊 | `san-chatroom`、`san-chatroom-austrian` | 多视角分析与压力测试 |
| 用 JTBD 澄清真实需求 | `san-jtbd` | 任务拆解与定位优化 |
| 区分"该快/该慢"，设计长期资产 | `san-slowisfast` | 节奏判断与复利设计 |
| 把课题拆成连续课程 | `san-learning` | 课程结构与主动回忆自测 |
| 把观点找理论依据配案例 | `san-standard-answer` | 理论锚点与案例重释 |
| Markdown 转公众号 HTML | `san-wechat-html` | 一键生成可粘贴的公众号排版 |

## Skill 完整列表

| Skill | 说明 |
| --- | --- |
| `san-action` | 用阿德勒心理学诊断执行阻滞，找出心理卡点并给行动方案 |
| `san-agent-migration` | 把混乱项目整理成"单一真源+多端薄桥接"的 Agent 工作台 |
| `san-ai-check` | 扫描文案 AI 味/机器化表达，判断稿子像不像 AI 写的 |
| `san-benchmark` | 用五重过滤法找值得模仿的对标对象，排除主体差异噪音 |
| `san-chatroom` | 多专家研讨室，按话题动态组 3-5 位专家会诊 |
| `san-chatroom-austrian` | 奥派经济学专题聊天室，哈耶克+米塞斯双视角分析 |
| `san-content` | 内容发布前诊断，判断能不能发、哪里要改 |
| `san-content-risk-check` | 发布前逐句排雷违规风险，给位置和最小修改 |
| `san-content-system` | 把散落的文稿/选题/案例整理成可生长的内容资产 |
| `san-decision` | 把长期跟踪的问题建成本地决策档案，支持结果回填 |
| `san-deconstruct` | 用维特根斯坦+奥派方法拆模糊商业概念，澄清边界 |
| `san-diagnosis` | 商业问题总入口，区分"解具体难题"还是"全面体检" |
| `san-goal` | 把模糊愿望追问成可行动、可验收的交付物 |
| `san-good-question` | 把模糊问题改写成 AI 可推理、可验证的问题说明书 |
| `san-hook` | 诊断短视频开头问题并给优化方案，降低前几秒流失 |
| `san-install-skill` | 把 Skill 跨端安装/同步/去重/卸载到各种 Agent |
| `san-jtbd` | 用 JTBD 从"用户雇佣产品完成什么任务"视角澄清需求 |
| `san-knowledge` | 把本地文件夹建成 Agent 能稳定检索维护的知识库 |
| `san-learning` | 把课题拆成连续课程，绑定能力点+主动回忆自测 |
| `san-report` | 把多份诊断存档合并成带日期、索引、可溯源的报告 |
| `san-resonate` | 用传播学/心理学解码内容为什么没戳中人 |
| `san-restore` | 恢复/搜索上次诊断存档，跨会话接着做 |
| `san-save` | 把诊断关键状态按项目存到本地，跨会话可续接 |
| `san-script-flow` | 检查短视频逐字稿的衔接、信息密度与口播流畅度 |
| `san-skill-cleaner` | 安装第三方 Skill 前扫描提示注入/危险代码等风险 |
| `san-skill-maker` | 把反复出现的问题做成可安装、可分级验证的 Skill |
| `san-slowisfast` | 区分"该快/该慢"，设计可复利的长期资产 |
| `san-spread` | 用传播学/社会心理学匹配内容传播策略 |
| `san-standard-answer` | 给观点找理论依据，配同构历史案例与反例 |
| `san-wechat-html` | Markdown 一键转公众号可粘贴 HTML，15 种风格 |
| `san-xhs-title` | 从验证过的小红书标题公式里生成高点击标题 |

## 安装

### 火山方舟 Agent Plan

在 Agent 配置页面，选择「从 GitHub 导入 Skill」，填入：

```
sansan19900801/san-skills
```

选择你需要的 Skill 挂载到 Agent 上即可。

### Codex / Claude Code

在终端执行：

```bash
npx -y skills add sansan19900801/san-skills -g --all
```

### 单个安装

```bash
npx -y skills add sansan19900801/san-skills/skills/san-diagnosis -g
```

## 关于

san-skills 是三三的一人公司 AI 参谋专用 Skill 集合。核心方法论来自三三的实战经验与读书积累，主张商业主体性、普通人改命双环、创业松弛学。

- 三三：从负数开始的普通人创业者
- 核心主张：判断不外包，决策自己做，杠杆自己用
- 适用人群：想靠自己做一人公司的普通人

---

**记住：你不是要学更多，而是要行动更多。执行力没到，别谈认知。**
