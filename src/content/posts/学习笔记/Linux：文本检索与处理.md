---
title: Linux：文本检索与处理
published: 2026-09-13T02:11:15Z
description: '文本处理通常包括定位文件、筛选记录、提取字段、转换和统计。'
updated: 2026-09-19
image: ''
tags: [Linux, Shell, 运维]
category: 学习笔记
draft: false 
lang: ''
---

文本处理通常包括定位文件、筛选记录、提取字段、转换和统计。先确认数据格式与范围，再选择工具，比直接套用一长串管道更可靠。以下示例以 GNU 工具和常见 awk 为基础，其他实现的扩展选项可能不同。

# 选择工具与输入格式

| 任务 | 工具 | 边界 |
|---|---|---|
| 查找路径 | find、locate | locate 查询索引，可能滞后 |
| 筛选文本 | grep | 固定字符串和正则表达式分别选择 |
| 阅读部分内容 | less、head、tail | 不必读完整个大文件 |
| 提取字段 | cut、awk | 必须知道分隔方式 |
| 转换文本 | sed、tr | sed 面向行和模式，tr 面向字符 |
| 排序与统计 | sort、uniq、wc | 注意区域设置、相邻重复和换行 |
| 解析结构化内容 | jq、专用 CSV 工具 | 不用正则代替完整解析器 |

管道把上游标准输出送给下游标准输入，错误输出默认不进入管道。处理中途失败时，下游仍可能输出看似正常的结果，必须检查状态和诊断。

# 定位文件与筛选文本

## 文件搜索

```bash title="定位日志并搜索内容"
find /var/log -type f -name '*.log'
find /var/log -type f -name '*.log' -exec grep -HnF 'ERROR' {} +
```

find 查找文件系统对象，grep 搜索内容。通配符加引号避免 Shell 提前展开；-exec 的加号将多个路径分批作为独立参数传入，能保留带空格的文件名。

`find /var/log -type f -mtime -1` 查找不足 24 小时内修改的文件，不等于自然日“今天”。`-size +100M` 使用 MiB 单位及取整比较。权限错误意味着结果可能不完整。

## grep 的匹配方式

| 示例 | 用途 |
|---|---|
| `grep -nF 'ERROR' app.log` | 固定字符串搜索并显示行号 |
| `grep -nE 'ERROR|WARN' app.log` | 扩展正则的两种级别 |
| `grep -iF 'error' app.log` | 忽略大小写 |
| `grep -vF 'DEBUG' app.log` | 排除匹配行 |
| `grep -cF 'ERROR' app.log` | 统计匹配行，非字符串出现次数 |
| `grep -nF -C 3 'timeout' app.log` | 同时显示前后上下文 |
| `grep -rnF --include='*.conf' 'listen' ./config` | 限定文件类型递归搜索 |

grep 返回 0 表示有匹配，1 表示无匹配，2 表示错误。用 -q 只取状态时还要注意提前退出的行为；不能一概把任何非零值都解释为工具故障。

# 正则表达式

以下按扩展正则表达式说明；grep 默认的基本正则在分组等语法上有所不同，优先显式使用 grep -E。

| 模式 | 含义 |
|---|---|
| ^ERROR | 行首 ERROR |
| timeout$ | 行尾 timeout |
| [0-9]+ | 一个或多个 ASCII 数字 |
| colou?r | u 可有可无 |
| (ERROR\|WARN) | 两个分支之一 |
| .* | 任意字符重复零次或多次 |

Shell 的 `*.log` 是路径通配符；正则 `.*\.log$` 表示以 .log 结束的文本。模式默认用单引号传递。固定文本包含点号、方括号等字符时，grep -F 通常更直接。

不同工具的正则方言、Unicode 和区域设置支持不同，不要默认 grep、sed、awk、PCRE 的表达式完全通用。详见 [GNU grep 正则说明](https://www.gnu.org/software/grep/manual/html_node/Regular-Expressions.html)。

# 字段提取与转换

## cut 与 awk

`cut -d ':' -f 1,3 /etc/passwd` 提取简单分隔文本的第 1、3 字段。cut 不理解 CSV 引号、转义和字段内换行；通用 CSV 应使用专用解析器。

awk 默认以空白划分字段，$0 是整行，$1 起为字段；NF 是字段数，NR 是记录数。

```bash title="提取与检查字段"
awk -F ':' '{print $1, $3}' /etc/passwd
awk 'NF < 3 {print NR, $0}' app.log
```

第二条只适用于规定至少三列的日志，列数不足也可能是空行或续行，需要结合格式判断。

## sed 与 tr

```bash title="先输出预览，不修改原文件"
sed -n '1,20p' app.conf
sed 's/old_name/new_name/g' app.conf
sed '/^[[:space:]]*#/d' app.conf
printf 'hello\n' | LC_ALL=C tr '[:lower:]' '[:upper:]'
```

sed 默认将结果写到标准输出；s 替换，g 处理行内全部匹配，d 不输出匹配行。替换端的 & 有特殊含义。tr 转换字符集合，不负责替换任意多字符字符串。

:::warning[修改前先检查范围]
不要使用 `sed ... file > file`，重定向可能先清空源文件。先生成独立结果、比较差异并通过应用检查，再替换配置。sed -i 的参数和备份行为在 GNU 与 BSD 实现中不同。
:::

# 排序、去重与统计

sort 默认按区域设置进行文本排序，数字使用 -n，逆序加 -r，指定字段可用 -k。需要可重复的字节排序时可为该命令设置 LC_ALL=C。

uniq 只合并相邻重复行，所以常用 `sort values.txt | uniq -c | sort -nr` 计数。它改变顺序，不适合直接用于必须保留原始顺序的记录。

wc 的 -l 数换行符，-c 数字节，-m 数字符；末行没有换行时，“记录数”与 wc -l 可能不同。中文文本的字节数也通常大于字符数。

# 完整示例：分析访问记录

这里主动使用固定三列的简化格式，不假设所有 Nginx 日志都把状态码放在第 9 列。真实 access log 的字段取决于 log_format。

```text title="access.tsv（演示数据，字段以空白分隔）"
192.0.2.10 / 200
192.0.2.11 /login 200
192.0.2.12 /missing 404
192.0.2.13 /api 500
192.0.2.14 /api 500
```

先检查格式，再统计：

```bash title="核对记录、统计状态与筛选故障"
awk 'NF != 3 {print "异常行", NR, $0}' access.tsv
awk '{print $3}' access.tsv | sort | uniq -c | sort -nr
awk '$3 >= 500 && $3 < 600 {print}' access.tsv
awk '$3 == 404 {count++} END {print count+0}' access.tsv
```

预期状态计数为 200 两条、500 两条、404 一条；并列项顺序不作为判断依据。5xx 筛选应输出两个 /api 请求，404 计数为 1。各状态数量之和应为 5，与有效记录总数相符。

在格式已确认的前提下，`awk '{print $2}' access.tsv | sort | uniq -c | sort -nr | head -n 10` 可统计高频路径。结果表示请求次数，不是独立用户数；带查询参数的路径是否归并取决于分析目标。

# 将路径传给其他命令

xargs 将标准输入转成命令参数，默认按空白和引号规则解析，不能直接用于任意文件名。

```bash title="保留文件名边界的只读批量检查"
find ./logs -type f -name '*.log' -print0 | xargs -0 -r wc -l --
```

前提是 ./logs 存在；-print0 与 -0 使用 NUL 分隔，GNU xargs 的 -r 防止空输入时执行。分批执行可能出现多个小计，不能直接当作全局总计。简单场景用 `find ... -exec wc -l -- {} +` 也可以。

涉及删除时，先列出并核对目标；不要把演示性的 xargs rm 或 find -delete 当作默认处理流程。

# 常见问题

| 症状 | 检查与下一步 |
|---|---|
| 计数为零但日志有错误 | 大小写、时间范围、轮转文件、编码和字段位置 |
| awk 统计字段错位 | 请求中空格、引号、时区、续行；改用正确格式解析 |
| 排序结果不同 | LC_ALL、数值选项、字段范围 |
| 文件名被拆开 | 使用 NUL 分隔或 find -exec |
| 管道给出结果却有错误 | 独立检查每一步、标准错误及 pipefail |
| JSON 提取不稳定 | 用 jq 访问字段，不用 grep 匹配嵌套结构 |

# 参考资料

- [GNU grep](https://www.gnu.org/software/grep/manual/)
- [GNU sed](https://www.gnu.org/software/sed/manual/)
- [GNU awk](https://www.gnu.org/software/gawk/manual/)
- [GNU Findutils](https://www.gnu.org/software/findutils/manual/)
- [GNU Coreutils](https://www.gnu.org/software/coreutils/manual/)
- [jq 手册](https://jqlang.github.io/jq/manual/)
