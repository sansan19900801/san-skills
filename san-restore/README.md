# san-restore

> 把上次诊断的结论、否决过的方向、留的下一步从本地存档里拉回来，跨会话接着做。

## 这是什么

`san-save` 的搭档：**只负责恢复记忆，不做诊断、不擅自跳技能**。按项目找到最新（或指定序号、指定关键词）的存档，紧凑呈现，然后由你决定从哪继续。

## 解决什么问题

- 上周诊断到一半，今天新开对话不想从头再讲；
- 存档多了，想按项目、按序号、按关键词找回某次结论；
- 换项目/换目录时，想知道自己最近在哪些项目上诊断过。

## 怎么定位存档

时间排序**只看文件名前缀 `YYYYMMDD-HHMMSS`，不看文件修改时间**（云盘同步会改写 mtime）。定位、项目解析、根目录规则与 san-save 完全一致，由同一个零依赖脚本 `archive.py` 完成：

```bash
A=~/.agents/skills/san-restore/scripts/archive.py

python3 "$A" latest --json            # 当前项目最新一份（含正文）
python3 "$A" latest --index 2 --json  # 第 2 份
python3 "$A" latest --slug proj --json# 指定项目最新
python3 "$A" list                     # 当前项目存档清单
python3 "$A" projects                 # 所有项目 + 最近活跃时间
python3 "$A" search "定价"             # 跨存档全文搜索（标题/字段/正文）
```

## 怎么用

```text
/san-restore                  # 接着当前项目上次的
/san-restore 2                # 拉第 2 份
/san-restore --slug proj-a    # 换个项目
/san-restore search 虚拟产品   # 找历史里提到「虚拟产品」的存档
接着上次 / 上次到哪了 / 续上       # 等价于默认恢复
```

当前项目没有存档时，会用 `projects` 列出你最近活跃的其他项目；整个存档位置都为空时会提示先去做一次诊断并保存，**不会跨目录乱搜你的私人文件**。

## 恢复之后

技能只展示状态并问一句「现在你想从哪儿继续？」：

- 你说「按上次的下一步走」，它才按存档里的 `next_skill` 接续，并把存档内容作为上下文，不用你重讲；
- 你说「有新情况」，就不继承旧状态，从头判断。

## 配套技能

- `san-save`：写入存档；
- `san-report`：把多份存档合并成可交付的 Markdown 报告。

三者各自带一份相同的 `archive.py`，因此可独立安装；存档格式和路径规则保持一致。

## 安装

```bash
npx -y skills add sansan19900801/san-restore -g --all
```

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## 许可证

MIT
