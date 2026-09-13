---
title: Linux 基础：文本检索与处理
published: 2026-09-13
image: ''
tags: [Linux, 文本处理, grep, sed, awk, find, Shell]
category: 学习笔记
---

> Linux 运维中经常面对大量日志、配置文件、命令输出和系统信息。真正重要的问题通常不是“如何查看文件”，而是如何从大量内容中**快速找到目标、筛选数据、统计结果并进一步加工**。
>
> Linux 提供了大量遵循 Unix “小工具组合”思想的文本处理工具。掌握 `grep`、`find`、`sort`、`uniq`、`cut`、`tr`、`sed`、`awk` 等工具，并理解管道和命令组合，是 Shell 自动化和日志分析的重要基础。

## 文本处理的基本思想

Linux 中很多命令都采用：

```text
输入
 ↓
处理
 ↓
输出
```

这样的模型。

例如：

```bash
cat app.log
```

可以理解为：

```text
文件
 ↓
cat
 ↓
stdout
```

如果进一步组合：

```bash
cat app.log | grep ERROR
```

就是：

```text
文件
 ↓
cat
 ↓
文本流
 ↓
grep
 ↓
筛选 ERROR
 ↓
stdout
```

再继续：

```bash
cat app.log | grep ERROR | wc -l
```

变成：

```text
文件
 ↓
读取
 ↓
grep
 ↓
筛选
 ↓
wc
 ↓
统计
```

这就是 Linux 文本工具最重要的思想：

> **每个工具完成一个相对明确的任务，再通过管道组合成更复杂的数据处理流程。**

---

# `grep`：搜索文本内容

## 基本用法

`grep` 用于：

> **从输入文本中搜索匹配的内容。**

最基本的形式：

```bash
grep PATTERN file
```

例如：

```bash
grep "ERROR" app.log
```

表示：

> 查找 `app.log` 中包含 `ERROR` 的行。

可以理解为：

```text
app.log
   │
   ▼
 grep "ERROR"
   │
   ▼
包含 ERROR 的行
```

---

## 从标准输入搜索

`grep` 也可以处理标准输入：

```bash
ps -ef | grep nginx
```

这里：

```text
ps -ef
   │
   │ stdout
   ▼
 grep nginx
   │
   ▼
匹配 nginx 的行
```

因此：

```bash
grep
```

既可以读取文件，也可以读取：

```text
stdin
```

这也是它非常适合管道组合的原因。

---

## 常用选项

### `-i`：忽略大小写

```bash
grep -i "error" app.log
```

会同时匹配：

```text
error
ERROR
Error
ErRoR
```

---

### `-n`：显示行号

```bash
grep -n "ERROR" app.log
```

结果可能类似：

```text
120:ERROR database connection failed
256:ERROR timeout
```

这样可以快速定位目标内容所在的行。

---

### `-v`：反向匹配

```bash
grep -v "DEBUG" app.log
```

表示：

> 输出不包含 `DEBUG` 的行。

可以理解为：

```text
匹配 DEBUG
   ↓
排除
```

---

### `-c`：统计匹配行数

```bash
grep -c "ERROR" app.log
```

例如输出：

```text
23
```

表示匹配到的行数。

需要注意：

> `grep -c` 统计的是匹配的行数，而不是匹配字符串出现的总次数。

---

### `-r`：递归搜索

例如：

```bash
grep -r "database" /etc
```

表示递归搜索目录中的文件。

实际使用时还可以搭配：

```bash
grep -rn "database" /etc
```

这样可以同时显示：

```text
文件名
行号
匹配内容
```

---

### `-E`：扩展正则表达式

例如：

```bash
grep -E "ERROR|WARN" app.log
```

可以匹配：

```text
ERROR
WARN
```

`grep` 本身支持基本正则表达式，使用 `-E` 可以使用扩展正则表达式。

也可以直接使用：

```bash
egrep
```

但现代使用习惯通常更推荐：

```bash
grep -E
```

而不是依赖 `egrep` 这种历史名称。

---

# grep 与正则表达式

`grep` 最强大的地方之一是可以使用：

> **Regular Expression（正则表达式）**

例如：

```bash
grep -E '^ERROR' app.log
```

表示：

> 查找以 `ERROR` 开头的行。

再例如：

```bash
grep -E 'ERROR$' app.log
```

表示：

> 查找以 `ERROR` 结尾的行。

常见符号：

| 表达式 | 含义 |
|---|---|
| `^` | 行开头 |
| `$` | 行结尾 |
| `.` | 匹配任意单个字符 |
| `*` | 前一个元素重复 0 次或多次 |
| `+` | 前一个元素重复 1 次或多次 |
| `?` | 前一个元素重复 0 次或 1 次 |
| `[]` | 字符集合 |
| `()` | 分组 |
| `|` | 或 |

例如：

```bash
grep -E 'ERROR|WARN' app.log
```

表示：

```text
ERROR
或者
WARN
```

关于 GNU grep 的具体匹配规则，可以参考 [GNU grep Manual](https://www.gnu.org/software/grep/manual/)。

---

# `find`：搜索文件系统对象

需要特别区分：

```text
grep
↓
搜索“文件内容”

find
↓
搜索“文件系统对象”
```

例如：

```bash
find /var/log -name "*.log"
```

表示：

> 在 `/var/log` 下寻找名字匹配 `*.log` 的对象。

因此：

```text
find
↓
文件在哪里？

grep
↓
文件里面有什么？
```

这是 Linux 中非常重要的一组区别。

---

## 按名称搜索

```bash
find /tmp -name "test.txt"
```

搜索名为：

```text
test.txt
```

的对象。

忽略大小写：

```bash
find /tmp -iname "test.txt"
```

---

## 按类型搜索

例如：

```bash
find /tmp -type f
```

表示寻找：

> 普通文件。

目录：

```bash
find /tmp -type d
```

符号链接：

```bash
find /tmp -type l
```

常见类型：

```text
f → 普通文件
d → 目录
l → 符号链接
```

---

## 按大小搜索

例如：

```bash
find /var/log -type f -size +100M
```

表示：

> 查找超过一定大小的普通文件。

这在：

```text
日志过大
磁盘空间不足
异常文件
```

等场景中很有用。

---

## 按修改时间搜索

例如：

```bash
find /var/log -type f -mtime -1
```

可以寻找最近修改的文件。

这对于：

```text
最近产生的日志
最近更新的配置
最近生成的临时文件
```

等问题非常实用。

---

## 使用 `find -exec`

`find` 不仅能搜索，还能对搜索结果执行命令。

例如：

```bash
find . -type f -name "*.log" -exec ls -lh {} \;
```

这里：

```text
{}
```

代表当前找到的对象。

而：

```text
\;
```

表示 `-exec` 命令结束。

整体：

```text
find
 ↓
寻找 *.log
 ↓
找到文件
 ↓
执行 ls -lh
```

这种方式非常适合：

```text
批量处理
批量检查
批量删除
```

但执行删除操作时必须格外谨慎。

---

# `locate`：快速查找文件名

`locate` 同样可以查找文件。

例如：

```bash
locate nginx.conf
```

与 `find` 的核心区别在于：

```text
find
↓
实时搜索文件系统

locate
↓
查询预先建立的文件名数据库
```

所以：

```text
find
↓
结果更依赖当前文件系统状态

locate
↓
速度通常很快
但数据库可能不是实时更新
```

因此：

> `locate` 找不到一个刚刚创建的文件，并不一定意味着文件不存在。

现代 Linux 是否默认安装和启用 `locate`，以及数据库如何维护，会根据发行版有所不同。

---

# `sort`：排序

`sort` 用于对文本行进行排序。

例如：

```text
banana
apple
orange
```

执行：

```bash
sort fruits.txt
```

得到：

```text
apple
banana
orange
```

默认通常按字典序进行排序。

---

## 数值排序

如果文件内容：

```text
20
3
100
8
```

直接：

```bash
sort numbers.txt
```

可能得到：

```text
100
20
3
8
```

因为默认进行的是：

> 文本排序。

使用：

```bash
sort -n numbers.txt
```

才按照数值排序：

```text
3
8
20
100
```

这在日志统计和数据处理时非常重要。

---

## 反向排序

```bash
sort -r file.txt
```

表示：

> 反向排序。

数值反向：

```bash
sort -nr numbers.txt
```

---

# `uniq`：去除相邻重复行

`uniq` 常被误解成：

> “删除所有重复内容”。

更准确的是：

> **删除相邻的重复行。**

例如：

```text
apple
apple
banana
banana
orange
```

执行：

```bash
uniq file.txt
```

得到：

```text
apple
banana
orange
```

但是：

```text
apple
banana
apple
```

执行：

```bash
uniq
```

并不会把两个 `apple` 合并，因为它们不相邻。

因此经常会把：

```bash
sort file.txt | uniq
```

组合起来。

过程：

```text
原始数据
   ↓
sort
   ↓
相同内容排到一起
   ↓
uniq
   ↓
去除重复行
```

---

## `uniq -c`

例如：

```bash
sort access.log | uniq -c
```

可以统计每种连续重复项出现多少次。

结果可能：

```text
120 200
35  404
8   500
```

通常可以进一步：

```bash
sort access.log | uniq -c | sort -nr
```

得到按出现次数排序的结果。

这是日志分析中非常典型的组合。

---

# `wc`：统计文本

`wc` 可以统计：

```text
行数
单词数
字节数
字符数
```

例如：

```bash
wc -l app.log
```

统计行数。

常用选项：

```text
-l
↓
行

-w
↓
单词

-c
↓
字节

-m
↓
字符
```

例如：

```bash
wc -l app.log
```

适合快速判断：

> 文件有多少行。

---

## 管道中的 wc

例如：

```bash
grep "ERROR" app.log | wc -l
```

表示：

```text
app.log
 ↓
grep
 ↓
筛选 ERROR
 ↓
wc -l
 ↓
统计匹配行数
```

这种写法在日志分析中非常常见。

---

# `cut`：提取字段

`cut` 用于：

> **从每一行中提取指定部分。**

例如：

```text
alice:1001:1001
bob:1002:1002
charlie:1003:1003
```

如果字段由：

```text
:
```

分隔，可以：

```bash
cut -d ':' -f 1 users.txt
```

得到：

```text
alice
bob
charlie
```

其中：

```text
-d ':'
↓
指定分隔符

-f 1
↓
选择第 1 个字段
```

---

## 提取多个字段

例如：

```bash
cut -d ':' -f 1,3 users.txt
```

提取：

```text
第 1 列
第 3 列
```

也可以：

```bash
cut -d ':' -f 1-3 users.txt
```

提取：

```text
第 1 ～ 3 列
```

---

## `cut` 的适用场景

`cut` 很适合处理：

```text
固定分隔符
结构比较简单
列位置明确
```

的数据。

例如：

```text
CSV
冒号分隔
制表符分隔
```

等。

如果文本结构复杂，需要条件判断或更灵活的字段处理，那么通常会考虑：

```text
awk
```

---

# `tr`：字符转换与删除

`tr` 用于处理：

> **字符**

例如：

```bash
echo "hello" | tr 'a-z' 'A-Z'
```

可以将小写转换成大写。

结果：

```text
HELLO
```

---

## 删除字符

例如：

```bash
echo "hello123" | tr -d '0-9'
```

删除数字后：

```text
hello
```

---

## 压缩重复字符

使用：

```bash
tr -s ' '
```

可以把连续多个空格压缩成一个。

例如：

```text
hello     world
```

变成：

```text
hello world
```

因此：

```text
tr
↓
字符级转换、删除、压缩
```

---

# `sed`：流编辑器

`sed` 全称：

> **Stream EDitor**

它是一种非常强大的：

> **流式文本处理工具**

与 `grep` 相比：

```text
grep
↓
主要负责匹配和筛选

sed
↓
可以对匹配内容执行编辑操作
```

---

## 替换文本

最常见的形式：

```bash
sed 's/old/new/' file.txt
```

例如：

```text
hello world
hello linux
```

执行：

```bash
sed 's/hello/hi/' file.txt
```

得到：

```text
hi world
hi linux
```

这里：

```text
s
↓
substitute

old
↓
旧内容

new
↓
新内容
```

---

## 全局替换

默认情况下，一行中通常只替换匹配到的第一个位置。

如果希望一行中全部替换，可以：

```bash
sed 's/hello/hi/g' file.txt
```

其中：

```text
g
↓
global
```

---

## 删除行

例如删除包含：

```text
DEBUG
```

的行：

```bash
sed '/DEBUG/d' app.log
```

可以理解为：

```text
匹配 DEBUG
   ↓
执行 d
   ↓
删除该行的输出
```

---

## 按行打印

例如：

```bash
sed -n '1,10p' file.txt
```

表示打印：

```text
第 1 ～ 10 行
```

这里：

```text
-n
↓
默认不输出

p
↓
print
```

因此 `sed` 不仅能做替换，也可以：

```text
删除
打印
选择
修改
```

---

# `awk`：按字段处理文本

`awk` 是 Linux 文本处理中非常重要的工具。

它特别适合：

> **按行读取 → 按字段拆分 → 根据条件处理 → 输出结果**

假设有：

```text
alice  90
bob    85
charlie 92
```

可以使用：

```bash
awk '{print $1}' scores.txt
```

得到：

```text
alice
bob
charlie
```

其中：

```text
$1
↓
第 1 个字段

$2
↓
第 2 个字段
```

默认情况下，`awk` 会按照空白字符进行字段划分。

---

## 输出多个字段

```bash
awk '{print $1, $2}' scores.txt
```

得到：

```text
alice 90
bob 85
charlie 92
```

---

## 条件过滤

例如只显示成绩大于：

```text
90
```

的数据：

```bash
awk '$2 > 90 {print $1, $2}' scores.txt
```

得到：

```text
charlie 92
```

这体现了 `awk` 的核心特点：

```text
读取一行
   ↓
拆分字段
   ↓
判断条件
   ↓
执行动作
```

---

## 指定分隔符

如果数据是：

```text
alice:90
bob:85
charlie:92
```

可以：

```bash
awk -F ':' '{print $1, $2}' scores.txt
```

其中：

```text
-F ':'
↓
指定字段分隔符
```

---

# `sed` 与 `awk` 的区别

这两个工具经常一起出现，但适合的场景不同。

可以先这样理解：

| 工具 | 更擅长 |
|---|---|
| `grep` | 搜索 / 筛选 |
| `cut` | 提取简单字段 |
| `tr` | 字符转换 |
| `sort` | 排序 |
| `uniq` | 去重 / 统计相邻重复项 |
| `sed` | 流式文本修改 |
| `awk` | 按字段分析和处理 |

例如：

```text
grep
↓
找哪些行

cut
↓
取哪些列

sed
↓
修改哪些内容

awk
↓
根据字段做计算和判断
```

当然，这些工具的能力会有大量重叠，不应该把它们绝对限制在某一种用途上。

---

# `xargs`：将输入转换为命令参数

`xargs` 常用于：

> **把标准输入转换成命令参数。**

例如：

```bash
printf '%s\n' a.txt b.txt c.txt | xargs rm
```

可以近似理解为：

```bash
rm a.txt b.txt c.txt
```

也就是说：

```text
stdin
 ↓
xargs
 ↓
命令参数
 ↓
执行命令
```

---

## xargs 与 find

非常经典的一种组合：

```bash
find . -name "*.tmp" -print0 | xargs -0 rm
```

这里使用：

```text
-print0
```

和：

```text
-0
```

是为了更安全地处理包含：

```text
空格
换行
特殊字符
```

的文件名。

不过现代 `find` 已经可以直接使用：

```bash
find . -name "*.tmp" -delete
```

所以不应该为了使用 `xargs` 而强行使用它。

`xargs` 真正的价值在于：

> 当一个命令的输入来自标准输入，而目标命令需要的是命令行参数时，可以作为二者之间的转换器。

---

# 文件搜索与文本搜索的区别

这是 Linux 文本处理里非常重要的一个概念。

## 搜索文件

使用：

```bash
find
locate
```

回答：

> **文件在哪里？**

例如：

```bash
find /var/log -name "app.log"
```

---

## 搜索文件内容

使用：

```bash
grep
```

回答：

> **文件里面有没有这个内容？**

例如：

```bash
grep "ERROR" app.log
```

---

## 两者组合

假设：

> 找出 `/var/log` 中所有 `.log` 文件，并搜索其中的 `ERROR`。

可以：

```bash
find /var/log -type f -name "*.log" -exec grep -H "ERROR" {} \;
```

整体过程：

```text
/var/log
    │
    ▼
 find
    │
    ├── 找 *.log
    │
    ▼
 文件列表
    │
    ▼
 grep
    │
    └── 搜索 ERROR
```

这就是：

```text
文件系统搜索
+
文本内容搜索
```

的结合。

---

# 管道组合

Linux 文本工具真正强大的地方，不是单个命令，而是：

> **组合。**

例如统计日志中不同 HTTP 状态码的出现次数：

```bash
awk '{print $9}' access.log | sort | uniq -c | sort -nr
```

假设第 9 列是状态码：

```text
200
200
404
200
500
404
```

执行过程：

```text
access.log
    │
    ▼
  awk
    │
    │ 提取状态码
    ▼
200
200
404
200
500
404
    │
    ▼
  sort
    │
    │ 排序
    ▼
200
200
200
404
404
500
    │
    ▼
  uniq -c
    │
    │ 统计
    ▼
3 200
2 404
1 500
    │
    ▼
  sort -nr
    │
    │ 按数量倒序
    ▼
3 200
2 404
1 500
```

这类命令组合在：

```text
日志分析
监控
故障排查
数据统计
自动化脚本
```

中非常常见。

---

# 文本处理中的标准工作流

面对一个实际问题，可以先问：

```text
我要处理的是什么？
```

如果是：

```text
找文件
```

优先想到：

```text
find
locate
```

如果是：

```text
找文本
```

优先想到：

```text
grep
```

如果是：

```text
提取字段
```

考虑：

```text
cut
awk
```

如果是：

```text
修改文本
```

考虑：

```text
sed
```

如果是：

```text
字符转换
```

考虑：

```text
tr
```

如果是：

```text
排序
```

考虑：

```text
sort
```

如果是：

```text
去重 / 计数
```

考虑：

```text
uniq
```

如果是：

```text
统计行数
```

考虑：

```text
wc
```

如果是：

```text
把输入转换成命令参数
```

考虑：

```text
xargs
```

---

# 一个典型日志分析例子

假设 Nginx access log 中存在：

```text
192.168.1.10 - - [13/Sep/2026:09:00:01] "GET / HTTP/1.1" 200 1024
192.168.1.11 - - [13/Sep/2026:09:00:02] "GET /login HTTP/1.1" 200 512
192.168.1.12 - - [13/Sep/2026:09:00:03] "GET /test HTTP/1.1" 404 128
192.168.1.13 - - [13/Sep/2026:09:00:04] "GET /api HTTP/1.1" 500 256
```

如果要统计 HTTP 状态码：

```bash
awk '{print $9}' access.log | sort | uniq -c | sort -nr
```

如果要只查看：

```text
500
```

错误：

```bash
awk '$9 == 500 {print}' access.log
```

如果只想统计：

```text
404
```

出现了多少次：

```bash
awk '$9 == 404 {count++} END {print count}' access.log
```

这个例子体现了：

```text
awk
 ↓
提取 / 条件判断

sort
 ↓
排序

uniq
 ↓
统计

管道
 ↓
把多个工具组合起来
```

---

# 文本工具的组合思维

Linux 中处理文本时，不应该先想：

> “有没有一个命令可以一次性完成所有事情？”

更好的思路是拆解问题。

例如：

> 找出访问量最高的 10 个 URL。

可以拆成：

```text
1. 从日志提取 URL
       ↓
2. 统计 URL 出现次数
       ↓
3. 按次数排序
       ↓
4. 取前 10 个
```

例如可以组合：

```bash
awk '{print $7}' access.log \
  | sort \
  | uniq -c \
  | sort -nr \
  | head -n 10
```

每个工具只负责一部分：

```text
awk
↓
提取

sort
↓
整理

uniq -c
↓
统计

sort -nr
↓
排序

head
↓
取前 N 个
```

这就是 Unix/Linux 命令行最重要的思维之一：

> **把复杂问题拆成多个简单的文本处理步骤。**

---

# 正则表达式与文本处理

正则表达式会贯穿多个 Linux 工具。

例如：

```text
grep
sed
awk
```

都可以在不同程度上使用正则表达式。

因此：

```text
正则表达式
      │
      ├── grep
      ├── sed
      └── awk
```

可以作为后续学习 Shell 的重要基础。

常见表达式：

```text
^abc
```

表示：

> 以 `abc` 开头。

```text
abc$
```

表示：

> 以 `abc` 结尾。

```text
[0-9]
```

表示：

> 一个数字字符。

```text
[[:digit:]]
```

同样可以表示数字字符。

```text
.*
```

表示：

> 任意字符重复零次或多次。

实际使用时需要特别注意：

> Shell 本身还有一套路径名展开机制，例如 `*.log`，它与正则表达式不是同一种语法。

例如：

```bash
ls *.log
```

这里的：

```text
*.log
```

属于 Shell 的：

> **Pathname Expansion（路径名展开）**

而：

```bash
grep -E '.*\.log$'
```

中的表达式则是：

> **正则表达式**

二者外表相似，但工作机制不同。

---

# 文本处理中的几个重要区别

## grep 与 find

```text
find
↓
搜索文件系统对象

grep
↓
搜索文本内容
```

---

## cat 与 grep

```text
cat
↓
读取并输出

grep
↓
匹配和筛选
```

因此：

```bash
cat app.log | grep ERROR
```

可以工作，但如果只是为了搜索一个文件：

```bash
grep ERROR app.log
```

通常更简单。

---

## cut 与 awk

```text
cut
↓
简单、固定字段提取

awk
↓
字段处理 + 条件判断 + 计算 + 格式化
```

---

## sed 与 awk

```text
sed
↓
更偏向文本流编辑

awk
↓
更偏向结构化文本分析
```

---

## sort 与 uniq

通常：

```text
sort
 ↓
让相同内容相邻

uniq
 ↓
处理相邻重复项
```

因此常见组合：

```bash
sort | uniq
```

或者：

```bash
sort | uniq -c
```

---

# 从文件到数据的处理链

Linux 文本处理可以形成一条非常典型的数据流：

```text
文件
 │
 ▼
读取
 │
 ▼
筛选
 │
 ▼
提取
 │
 ▼
转换
 │
 ▼
排序
 │
 ▼
统计
 │
 ▼
输出
```

对应的工具可以是：

```text
读取
↓
cat / less / tail

筛选
↓
grep

提取
↓
cut / awk

转换
↓
tr / sed

排序
↓
sort

去重 / 统计
↓
uniq / wc

命令组合
↓
|
```

这套思路以后会直接进入：

```text
Shell 脚本
日志分析
自动化运维
CI/CD
监控
故障排查
```

等场景。

---

# 常用工具选择

| 需求 | 常用工具 |
|---|---|
| 查找文件 | `find` / `locate` |
| 搜索文本 | `grep` |
| 正则匹配 | `grep -E` |
| 排序 | `sort` |
| 去重 | `uniq` |
| 统计行数 | `wc -l` |
| 提取字段 | `cut` / `awk` |
| 字符转换 | `tr` |
| 文本替换 | `sed` |
| 文本分析 | `awk` |
| 参数转换 | `xargs` |
| 取前几行 | `head` |
| 取最后几行 | `tail` |
| 组合工具 | `|` |

需要注意，这张表只是为了建立工具选择的直觉，并不代表每个工具只能完成表中的任务。

---

# 一个完整的文本处理模型

当面对一个 Linux 文本处理问题时，可以按照下面的顺序思考：

```text
                    原始数据
                       │
                       ▼
                数据来自哪里？
                       │
              ┌────────┴────────┐
              │                 │
            文件             命令输出
              │                 │
              └────────┬────────┘
                       ▼
                    grep
                 是否需要筛选？
                       │
                       ▼
                 cut / awk
                 是否需要字段？
                       │
                       ▼
                  sed / tr
                 是否需要转换？
                       │
                       ▼
                    sort
                  是否需要排序？
                       │
                       ▼
                  uniq / wc
                  是否需要统计？
                       │
                       ▼
                    输出
```

如果问题更复杂，就使用：

```text
|
```

把多个简单工具连接起来。

---

## 外部参考

- [GNU Grep Manual](https://www.gnu.org/software/grep/manual/)
- [GNU sed Manual](https://www.gnu.org/software/sed/manual/)
- [GNU Awk User's Guide](https://www.gnu.org/software/gawk/manual/)
- [GNU Findutils Manual](https://www.gnu.org/software/findutils/manual/)
- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
