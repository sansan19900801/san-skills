# 微信公众号 HTML 生成 Skill

> 把 Markdown 文稿转成可直接粘贴到微信公众号后台的 HTML，15 种内置排版风格。所有样式逐元素展开为行内样式，确保复制粘贴后排版不丢失。支持一键复制、图片占位符、自动章节编号、文末链接归集、从公众号文章提取样式。

![微信公众号 HTML](https://img.shields.io/badge/version-1.1.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

一套面向公众号写作者的排版工具。它不改写文章观点、不做内容诊断，只做发布排版——把你的 Markdown 转成浏览器打开后点一下按钮就能复制、粘贴到公众号后台保持排版的 HTML。

## 解决什么问题

- Markdown 直接贴进公众号后台，排版全乱、样式丢失；
- 不会写 CSS，又想要好看且统一的多套排版风格；
- 图片替换、章节编号、文末链接每次都要手动处理，很费时；
- 看到别人公众号的好看样式，想直接复用。

它把 Markdown 转成点一下就能复制、粘贴到公众号后台且不丢样式的 HTML：15 种风格、一键复制、图片占位符、自动章节编号、文末链接归集，还能从一篇公众号文章 URL 提取它的排版风格。只做排版，不改内容观点。

## 核心能力

- Markdown → 可粘贴公众号 HTML
- 15 种内置排版风格（极简黑白、Medium、Stripe、WIRED、FT 等）
- 单风格 / 6 个推荐预览 / 全部 15 个风格对比
- **一键复制按钮**：每个 HTML 自带「复制到公众号」按钮，点击即复制正文，不用 Cmd+A
- **图片占位符**：Markdown 图片自动生成虚线框占位区块，排版后在公众号后台手动替换
- **自动章节编号**：`--numbered` 参数给 `##` 标题自动加 01/02/03 编号
- **文末链接归集**：正文链接统一收集到文末「参考链接」区块，避免被识别为导流
- **从公众号 URL 提取样式**：给一篇公众号文章链接，提取其排版参数生成自定义风格
- 自动生成预览总览页，浏览器里点开比较
- 默认消除公众号双标题（首个 H1 只写入 `<title>` 不进正文）

## 15 种风格

| style id | 风格 | 适合 |
|---|---|---|
| `minimal` | 极简黑白 | 默认款、方法论、诊断报告 |
| `medium` | Medium Essay | 长文观点、个人文章 |
| `stripe` | Stripe Docs | 工具说明、教程、产品文档 |
| `wired` | WIRED Feature | 科技观点、AI、产品发布 |
| `ft` | FT Analysis | 商业分析、市场判断 |
| `course` | 课程讲义 | 课程、教程、学习笔记 |
| `verge` | The Verge | 年轻、热点、资讯评论 |
| `apple` | Apple Newsroom | 正式公告、品牌稿 |
| `linear` | Linear Changelog | 版本更新、changelog |
| `github` | GitHub README | 开源、安装说明 |
| `notion` | Notion Memo | 备忘录、内部复盘 |
| `magazine` | Magazine | 人物稿、品牌故事 |
| `editorial` | Editorial Column | 专栏、手记 |
| `newspaper` | Newspaper | 报道、调查分析 |
| `event` | 活动公告 | 活动、招募、通知 |

## 使用方式

```bash
# 推荐一个最合适的风格
/san-wechat-html 文章.md --recommend

# 生成 6 个推荐风格对比
/san-wechat-html 文章.md --preview

# 生成全部 15 个风格
/san-wechat-html 文章.md --all

# 指定风格
/san-wechat-html 文章.md --style medium

# 自动章节编号
/san-wechat-html 文章.md --style course --numbered
```

生成后打开 HTML，点击页面顶部「复制到公众号」按钮，粘贴到公众号后台编辑器即可。

## 从公众号文章提取样式

看到喜欢的公众号排版，可以直接提取：

```
提取这篇公众号的样式：https://mp.weixin.qq.com/s/xxxxx
```

Skill 会自动抓取文章、提取字号/颜色/间距/标题装饰/引用样式等参数，生成自定义风格，然后可以直接用来排版你的文稿。

## 微信粘贴兼容性

正式交付的 HTML 严格遵守：

- 所有可见样式写在具体元素的 `style` 属性上，不依赖 `<style>` 标签
- 正文区域不使用 class、id、伪元素、外部资源、JavaScript
- 复制按钮和脚本位于正文区域之外，不会被粘贴到公众号
- 扁平结构，不依赖复制时会丢失的根容器
- 使用微信公众号稳定支持的 CSS 子集
- 交付前自动检查：结构兼容性 + 内容完整性（图片占位符、链接归集、章节编号等）

## 安装

```bash
npx skills add https://github.com/sansan19900801/sansan-wechat-html --skill san-wechat-html -g --copy
```

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## License

MIT
