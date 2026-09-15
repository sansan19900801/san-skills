# JTBD 任务澄清 Skill

> 用 Jobs to Be Done 框架识别用户真正想推进什么进展，据此优化产品、内容、服务、决策和 AI 提示词。

![version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 解决什么问题

用户说"帮我写篇文章""我要做个课程""给我做个 Agent"——这些通常只是他想到的方案，不是他真正要完成的任务。这个 Skill 帮你穿透方案语言，找到他在特定情境里想推进的真实进展。

## 你需要提供什么

- **必须提供**：你的需求、想法或困惑（哪怕只是一句话）
- **可选提供**：当前情境、你考虑过的方案、你担心的风险

## 你会得到什么

1. **任务陈述**：当我处于什么情境，我想要推进什么，以便得到什么结果
2. **三层任务**：功能层、情绪层、社会层分别要什么
3. **切换力量分析**：推力、拉力、焦虑、习惯
4. **选择标准**：必须满足什么、什么加分、愿意付出什么代价
5. **行动建议**：根据场景（AI 协作/产品/内容/个人决策）给出下一步

## 核心框架

- 情境 → 卡住的进展 → 想得到的结果 → 当前方案 → 选择标准
- 功能/情绪/社会三层任务
- 四种切换力量（推力/拉力/焦虑/习惯）

## 使用示例

```
帮我用 JTBD 分析一下：我想做一个 AI 写作课程
```

```
用 JTBD 重写这个提示词：[粘贴提示词]
```

## 安装

```bash
npx skills add https://github.com/sansan19900801/sansan-jtbd --skill san-jtbd -g --copy
```

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## License

MIT
