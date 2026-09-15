# san-save

> 把一次诊断的关键结论存成结构化 Markdown，下次能接着用，而不是从头再讲一遍。

## 这是什么

一个「诊断存档」技能。它**只负责记录，不负责诊断**：把当前对话里得出的结论、用户已否决的方向、待验证假设、确认的下一步，按固定格式写成本地 Markdown 文件，供 `san-restore` 跨会话恢复、`san-report` 汇总出报告。

## 解决什么问题

- 诊断是累积的，但普通对话每次冷启动，上周讲过的结论、走过的弯路这周全丢；
- 随手记笔记格式不统一，事后无法被程序检索和接续；
- 不同生意/项目的诊断容易混在一起。

## 存档长什么样

每份存档是 `YAML frontmatter + 六段正文`：

- frontmatter：项目、时间戳、标题、来源 skill、状态（进行中/已结论/已放弃）、下一步 skill；
- 正文六段：用户主诉、已得出的结论、用户已否决的方向、待验证假设、已确认的下一步、备注。

## 项目隔离与存档位置

按**项目**（slug）分目录，默认取当前目录名（保留中英文），在家目录或空名时用 `default`。存档根目录有三种模式，配置写在当前目录 `.sansan/config.json`：

| mode | 存档根 |
| --- | --- |
| `default`（缺省） | `~/.sansan/` |
| `project` | 当前目录 `.sansan/` |
| `custom` | `root` 字段指定目录（可指向 iCloud/坚果云等同步盘） |

存档文件路径：`{存档根}/sessions/{项目}/{YYYYMMDD-HHMMSS}-{标题}.md`。

安全护栏：配置损坏、模式不支持、根目录指向 `/`/家目录/项目根时直接报错，**不静默退回默认位置**；切换位置不自动搬动旧存档。

## 确定性脚本 archive.py

时间戳、项目名清洗、文件名、根目录解析这些重复且确定的动作，全部由零依赖脚本完成（`san-restore`/`san-report` 共用同一套规则）：

```bash
A=~/.agents/skills/san-save/scripts/archive.py

python3 "$A" resolve-root                 # 解析当前存档根目录
python3 "$A" slug [--slug 名称]            # 生成项目 slug
python3 "$A" new-path --title "标题" --json # 生成存档路径并建目录，返回 ISO 时间戳
python3 "$A" list [项目]                    # 列出项目下存档（状态自动翻中文）
```

## 怎么用

直接说「保存这次诊断」「这个结论留着」「存档」，或：

```text
/san-save                    # 自动从对话提取标题
/san-save 卖什么没想清楚      # 指定标题
/san-save list               # 列出当前项目存档
/san-save location           # 查看存档位置
/san-save location custom ~/Cloud/san-archive
```

没有可存的结论时不会生成空文件。

## 隐私说明

存档是**本地纯文本、不加密**，可能包含收入、客户等敏感信息；项目用 Git 时建议把 `.sansan/` 加进 `.gitignore`。

## 配套技能

- `san-restore`：恢复最近存档、跨会话接着做；
- `san-report`：把多份存档合并成可交付的 Markdown 报告。

## 安装

```bash
npx -y skills add sansan19900801/san-save -g --all
```

## 作者与支持

- 作者：san（[GitHub 主页](https://github.com/sansan19900801)）
- 如需加入付费答疑群，可扫码或打开[答疑群说明](https://mp.weixin.qq.com/s/3wporFEz1cGNWslmZsgPKw)

![付费答疑群二维码](assets/support-qr.jpg)

## 许可证

MIT
