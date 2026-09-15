# san-chatroom-austrian · 奥派经济聊天室

一个固定学派的多人研讨 Skill：让**哈耶克**和**米塞斯**用各自固化的分析镜头看同一个问题，再由**主持人**收口、补盲区、给出能带走的结论。

- 哈耶克：**知识分散性**——决策所需的知识分散在谁手里、秩序是涌现还是设计、有没有价格式的信号在聚合信息；愿意妥协。
- 米塞斯：**人类行为学**——从「人会有目的地行动」出发演绎、追问根本原因、原则上不轻易让步。
- 主持人：防套公式、补两人都漏掉的视角、把学说落成可执行判断。

## 解决什么问题

读奥派容易变成「市场万能、干预必败」的口号。这个 Skill 把两位经济学家**真正的思考路径**固化成各三个镜头，逼讨论回到具体问题，并由主持人守住「奥派不是万能钥匙」的边界。

适合：用奥派 / 奥地利学派 / 自由市场视角分析商业、市场、政策、组织或个人决策；想看到「知识分散」和「行动公理」两种进路的真实分歧。

不适合：想自由搭配各领域专家（用 [san-chatroom](https://github.com/sansan19900801/sansan-chatroom)）、拆模糊概念（用 san-deconstruct）、分析传播共鸣（用 san-spread）。

## 你需要提供什么

- 一个**具体**的问题、决策或现象（太泛的话题会先请你收窄）
- 可选：加第三位——用科兹纳补「企业家发现机会」，或加一个反方（政策题用凯恩斯、商业题用行为经济学/数据视角）来检验奥派是否自说自话

## 工作流程

1. 哈耶克、米塞斯各自独立发言（互不参考本轮内容，各 200 字内，必须走自己的三镜头）
2. 主持人展示两人观点，标出一致点与分歧点
3. 主持人补盲区、点明奥派适用边界，给出可带走的结论
4. 可继续追问（纵向打穿一个点）或换新问题；同一问题最多深入 3 轮后拍板

支持有子 Agent 的平台并行派角；纯对话平台自动降级为顺序扮演，仍保持两个视角隔离、有张力。

## 安装方法

### Codex
```bash
git clone https://github.com/sansan19900801/sansan-chatroom-austrian.git
cp -R san-chatroom-austrian ~/.codex/skills/
```

### Claude Code
```bash
git clone https://github.com/sansan19900801/sansan-chatroom-austrian.git
cp -R san-chatroom-austrian ~/.claude/skills/
```

### 豆包 / WorkBuddy
```bash
git clone https://github.com/sansan19900801/sansan-chatroom-austrian.git
cp -R san-chatroom-austrian ~/.agents/skills/
```

其他支持 `SKILL.md` 的工具，把整个 `san-chatroom-austrian` 文件夹放进对应 Skills 目录即可。

## 示例提问

- 用奥派视角分析：为什么补贴一个行业反而可能让它更弱？
- 哈耶克和米塞斯会怎么看「公司用一套中央流程管理所有销售」这件事？
- 奥派聊天室，帮我分析「知识付费做标准化课程」这个模式
- 拉凯恩斯进来，和哈耶克、米塞斯辩一下「要不要给新手创业者发消费券式补贴」
- 追问刚才米塞斯说的因果根，把这一点讲透

## 文件结构

```text
san-chatroom-austrian/
├── SKILL.md          # 主入口：角色镜头、研讨流程、跨平台执行、收敛与边界
├── README.md         # 使用说明
├── LICENSE           # MIT
└── agents/
    └── openai.yaml   # Codex 界面名称与默认提示
```

## 与其他 Skill 的关系

| Skill | 关系 |
|---|---|
| san-chatroom | 通用多专家研讨室，自由配角色；本 Skill 是它的奥派专题变体，阵容固定、镜头更深 |
| san-deconstruct | 拆模糊概念的定义与边界 |
| san-spread | 分析内容传播与受众共鸣 |

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## License

MIT
