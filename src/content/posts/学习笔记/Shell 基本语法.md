---
title: Shell 脚本基础
published: 2026-09-12
image: ''
tags: [Shell, 脚本, Bash, Linux, 运维]
category: 学习笔记
---

> 本文以 **Bash** 为主要环境，整理 Shell 脚本编写中最常用的基础语法和自动化操作。
>
> 内容从脚本执行、变量、条件判断、循环、函数开始，逐步介绍文本处理、正则表达式、命令执行结果以及常见的自动化脚本编写方法。

## Shell 与 Shell 脚本

Shell 是一个**命令解释器**，负责读取用户输入或脚本文件中的命令，并将这些命令交给系统执行。

常见 Shell 包括：

```text
sh
bash
zsh
fish
```

本文主要使用：

```text
Bash
```

Bash 是 GNU 项目提供的 Shell，并兼容 Bourne Shell 的大量语法，同时提供函数、数组、作业控制等扩展能力。([Bash Reference Manual](https://www.gnu.org/software/bash/manual/))

### 什么是 Shell 脚本？

如果把多条 Shell 命令保存到一个文本文件中，就可以形成一个 Shell 脚本。

例如：

```bash
#!/bin/bash

echo "Hello Linux"
pwd
ls
```

保存为：

```text
hello.sh
```

执行后：

```text
Hello Linux
/home/user
...
```

脚本的核心作用就是：

```text
多条命令
    ↓
按照预先编写的逻辑执行
    ↓
完成重复性工作
```

因此 Shell 脚本非常适合：

```text
批量操作
日志处理
服务管理
文件处理
部署操作
定时任务
系统检查
```

---

## 第一个 Shell 脚本

### `#!/bin/bash`：指定解释器

通常脚本的第一行：

```bash
#!/bin/bash
```

称为 **Shebang**。

它告诉系统：

```text
这个脚本应该使用 /bin/bash 解释
```

例如：

```bash
#!/bin/bash

echo "Hello Linux"
```

也可以使用：

```bash
#!/usr/bin/env bash
```

这种写法会通过 `PATH` 查找 Bash。

如果脚本依赖 Bash 的特有语法，建议明确指定 Bash，而不要把脚本写成：

```bash
#!/bin/sh
```

后又使用 Bash 特有的数组、`[[ ]]`、`<<<` 等语法。

---

## 脚本的执行方式

假设脚本名为：

```text
test.sh
```

可以直接交给 Bash：

```bash
bash test.sh
```

这种方式不要求脚本本身具有可执行权限。

也可以先添加执行权限：

```bash
chmod +x test.sh
```

然后：

```bash
./test.sh
```

这里：

```text
bash test.sh
→ Bash 读取并执行脚本

./test.sh
→ 操作系统根据 Shebang 选择解释器执行
```

需要注意：

```bash
test.sh
```

通常不能直接执行。

因为当前目录默认不一定在 `PATH` 中。

因此通常使用：

```bash
./test.sh
```

---

## 变量

变量用于保存数据。

### 定义变量

```bash
name="Linux"
```

注意：

```text
name = "Linux"
```

是不正确的变量赋值语法。

Bash 中赋值时，`=` 两边不能有空格。

读取变量：

```bash
echo "$name"
```

结果：

```text
Linux
```

可以理解为：

```text
name
 ↓
Linux
```

### 使用变量

```bash
user="root"

echo "当前用户：$user"
```

也可以使用：

```bash
echo "当前用户：${user}"
```

`${...}` 在变量名边界容易产生歧义时更加清晰。

例如：

```bash
name="app"

echo "${name}_server"
```

结果：

```text
app_server
```

### 变量为空时的情况

如果变量没有定义：

```bash
echo "$name"
```

通常会得到空字符串。

因此：

```bash
name=""
```

和：

```text
变量不存在
```

在某些判断场景中需要注意区别。

### 环境变量

例如：

```bash
echo "$PATH"
```

查看：

```bash
echo "$HOME"
echo "$USER"
echo "$SHELL"
```

如果需要把普通 Shell 变量导出给子进程：

```bash
export APP_ENV=production
```

子进程就能够读取：

```bash
echo "$APP_ENV"
```

关于环境变量与 `export` 的详细区别，可以结合前面的 Linux 基础文章理解。

---

## 只读变量与删除变量

### `readonly`

```bash
readonly VERSION="1.0"
```

之后不能再修改：

```bash
VERSION="2.0"
```

通常会失败。

### `unset`

删除变量：

```bash
unset name
```

删除后：

```bash
echo "$name"
```

通常为空。

---

## 特殊变量

Bash 提供了一些常见的特殊参数。

```text
$0
→ 当前脚本名称

$1
→ 第 1 个位置参数

$2
→ 第 2 个位置参数

$#
→ 参数数量

$@
→ 所有位置参数

$?
→ 上一条命令的退出状态

$$
→ 当前 Shell 进程的 PID
```

例如：

```bash
#!/bin/bash

echo "脚本：$0"
echo "第一个参数：$1"
echo "参数数量：$#"
```

执行：

```bash
./test.sh hello world
```

可能得到：

```text
脚本：./test.sh
第一个参数：hello
参数数量：2
```

---

## `$@` 与 `"$@"`

脚本批量处理参数时，经常使用：

```bash
"$@"
```

例如：

```bash
for arg in "$@"; do
    echo "$arg"
done
```

执行：

```bash
./test.sh "hello world" linux
```

会保留每个参数原本的边界：

```text
hello world
linux
```

因此在遍历脚本参数时，通常优先写：

```bash
"$@"
```

而不是：

```bash
$@
```

这是 Shell 脚本中非常重要的引号习惯。

---

## 引号与 Shell 展开

Shell 中：

```text
单引号
双引号
未加引号
```

行为不同。

### 单引号 `'...'`

单引号中的内容基本按字面量处理：

```bash
name="Linux"

echo '$name'
```

输出：

```text
$name
```

变量不会展开。

### 双引号 `"..."`

双引号允许变量展开：

```bash
name="Linux"

echo "$name"
```

输出：

```text
Linux
```

双引号通常是脚本中处理变量时更安全的默认选择。

例如：

```bash
file="/tmp/my file.txt"

cat "$file"
```

如果省略引号：

```bash
cat $file
```

Shell 可能进行词拆分，导致路径中的空格造成问题。

因此脚本中通常推荐：

```bash
"$variable"
```

而不是：

```bash
$variable
```

### 命令替换

可以使用：

```bash
$(command)
```

把命令输出替换到当前位置。

例如：

```bash
today=$(date)
echo "当前时间：$today"
```

也可以直接：

```bash
echo "当前时间：$(date)"
```

这是现代 Bash 中推荐的命令替换写法。

---

## Shell 运算符

Shell 运算符和语法在 Linux 基础操作中已经详细介绍过，这里重点理解它们在脚本中的使用。

常见的有：

```text
|
>
>>
<
<<
<<<
&
$(...)
```

### 管道 `|`

将前一个命令的标准输出传给下一个命令。

例如：

```bash
ps -ef | grep java
```

脚本中经常用于：

```text
获取数据
↓
过滤
↓
继续处理
```

例如：

```bash
grep "ERROR" app.log | wc -l
```

统计日志中包含 `ERROR` 的行数。

### 输出重定向 `>` 与 `>>`

覆盖：

```bash
echo "start" > app.log
```

追加：

```bash
echo "server started" >> app.log
```

日志脚本中通常使用：

```bash
>> 
```

避免覆盖已有日志。

### 输入重定向 `<`

```bash
while read -r line; do
    echo "$line"
done < app.log
```

把文件内容作为循环的标准输入。

### Here Document `<<`

可以在脚本中直接生成多行文本：

```bash
cat << EOF
server:
  port: 8080
  host: 0.0.0.0
EOF
```

非常适合：

```text
生成配置文件
生成脚本
生成 SQL
批量写入文本
```

### Here String `<<<`

```bash
read -r name <<< "Linux"
echo "$name"
```

把一个字符串直接作为标准输入。

这是 Bash 的扩展语法。

### 后台运行 `&`

```bash
command &
```

让命令作为后台作业运行。

例如：

```bash
./long_task.sh &
```

Shell 不会一直等待这个命令完成。

需要注意：

```text
&
→ 后台运行

nohup
→ 主要处理 SIGHUP
```

两者不是同一个概念。

### 命令替换 `$()`

```bash
files=$(find /var/log -type f)
```

先执行：

```bash
find /var/log -type f
```

再将结果赋给：

```text
files
```

---

## 算术运算

Bash 可以进行基本的整数运算。

常见写法：

```bash
a=10
b=3

echo $((a + b))
echo $((a - b))
echo $((a * b))
echo $((a / b))
echo $((a % b))
```

其中：

```text
+
→ 加

-
→ 减

*
→ 乘

/
→ 整除

%
→ 取模
```

更复杂的算术判断可以使用：

```bash
((a > b))
```

或者：

```bash
((count++))
```

---

## 条件判断

Shell 脚本经常需要根据条件决定下一步执行什么操作。

### `if`

基本结构：

```bash
if 条件; then
    命令
fi
```

例如：

```bash
if [ -f "/etc/passwd" ]; then
    echo "文件存在"
fi
```

### `if ... else`

```bash
if [ -f "/etc/passwd" ]; then
    echo "文件存在"
else
    echo "文件不存在"
fi
```

### `if ... elif ... else`

```bash
if [ "$USER" = "root" ]; then
    echo "当前用户是 root"
elif [ "$USER" = "admin" ]; then
    echo "当前用户是 admin"
else
    echo "普通用户"
fi
```

---

## `test` 与 `[ ]`

下面两种写法本质上属于同一类条件测试：

```bash
[ -f file ]
```

和：

```bash
test -f file
```

例如：

```bash
if [ -d "/var/log" ]; then
    echo "目录存在"
fi
```

常见文件测试：

```text
-f
→ 普通文件存在

-d
→ 目录存在

-e
→ 路径存在

-r
→ 可读

-w
→ 可写

-x
→ 可执行
```

### 字符串判断

```bash
[ "$name" = "root" ]
```

不相等：

```bash
[ "$name" != "root" ]
```

检查空字符串：

```bash
[ -z "$name" ]
```

检查非空：

```bash
[ -n "$name" ]
```

### 数值判断

```bash
[ "$a" -eq "$b" ]
```

常见：

```text
-eq
→ 等于

-ne
→ 不等于

-gt
→ 大于

-ge
→ 大于等于

-lt
→ 小于

-le
→ 小于等于
```

例如：

```bash
if [ "$count" -gt 10 ]; then
    echo "数量超过 10"
fi
```

需要区分：

```text
字符串比较
→ = !=

整数比较
→ -eq -ne -gt -ge -lt -le
```

### `[[ ]]`

Bash 还提供：

```bash
[[ condition ]]
```

例如：

```bash
if [[ "$name" == "root" ]]; then
    echo "root"
fi
```

相比传统 `[ ]`，`[[ ]]` 是 Bash 的条件判断语法，支持更多 Shell 特性，例如模式匹配和正则表达式匹配。

Bash 官方文档将 `[[ ... ]]` 作为条件构造的一部分进行说明。([Bash Reference Manual - Conditional Constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html))

因此如果脚本明确使用 Bash，实际编写时通常优先考虑：

```bash
[[ ... ]]
```

---

## `case`：多分支判断

当需要根据一个变量的不同取值执行不同操作时，可以使用：

```bash
case "$value" in
    value1)
        command
        ;;
    value2)
        command
        ;;
    *)
        command
        ;;
esac
```

例如：

```bash
case "$1" in
    start)
        echo "启动服务"
        ;;
    stop)
        echo "停止服务"
        ;;
    restart)
        echo "重启服务"
        ;;
    *)
        echo "用法：$0 {start|stop|restart}"
        ;;
esac
```

这比大量 `if / elif` 更适合处理：

```text
命令参数
菜单选项
状态类型
```

---

## `for` 循环

### 遍历一组数据

```bash
for name in Tom Jack Lucy; do
    echo "$name"
done
```

结果：

```text
Tom
Jack
Lucy
```

### 遍历文件

```bash
for file in /var/log/*.log; do
    echo "$file"
done
```

这种写法适合处理文件列表，但需要注意通配符没有匹配到文件时的行为。

### 遍历脚本参数

推荐：

```bash
for arg in "$@"; do
    echo "$arg"
done
```

这样可以正确保留包含空格的参数。

### C 风格循环

Bash 支持：

```bash
for ((i=0; i<10; i++)); do
    echo "$i"
done
```

适合需要计数器的场景。

---

## `while` 循环

基本结构：

```bash
while 条件; do
    command
done
```

例如：

```bash
count=0

while [ "$count" -lt 5 ]; do
    echo "$count"
    ((count++))
done
```

### 读取文件

脚本中经常需要逐行读取文本：

```bash
while IFS= read -r line; do
    echo "$line"
done < app.log
```

这里：

```text
IFS=
→ 避免默认字段分割

read -r
→ 不让反斜杠被额外解释
```

这种写法比：

```bash
for line in $(cat app.log)
```

更加适合逐行处理文本，因为后者会受到命令替换、词拆分和空白字符等因素影响。

---

## `break` 与 `continue`

### `break`

立即结束当前循环：

```bash
for i in {1..10}; do
    if [ "$i" -eq 5 ]; then
        break
    fi

    echo "$i"
done
```

只输出：

```text
1
2
3
4
```

### `continue`

跳过当前这一次循环：

```bash
for i in {1..5}; do
    if [ "$i" -eq 3 ]; then
        continue
    fi

    echo "$i"
done
```

输出：

```text
1
2
4
5
```

---

## 函数

函数用于把重复逻辑封装起来。

基本结构：

```bash
function_name() {
    commands
}
```

例如：

```bash
log_info() {
    echo "[INFO] $1"
}
```

调用：

```bash
log_info "server started"
```

输出：

```text
[INFO] server started
```

### 函数参数

函数同样可以使用位置参数：

```bash
greet() {
    echo "Hello $1"
}

greet "Linux"
```

### 函数返回值

Shell 函数通常使用退出状态表示结果：

```bash
check_file() {
    if [ -f "$1" ]; then
        return 0
    else
        return 1
    fi
}
```

调用：

```bash
if check_file "/etc/passwd"; then
    echo "文件存在"
else
    echo "文件不存在"
fi
```

这里：

```text
return 0
→ 成功

return 非 0
→ 失败
```

注意 Shell 的函数返回值主要是**退出状态码**，不是像其他编程语言那样直接返回任意字符串对象。

---

## 退出状态码

Shell 中命令执行结束后都会产生一个退出状态。

通常：

```text
0
→ 成功

非 0
→ 失败或异常
```

例如：

```bash
ls /etc
echo $?
```

成功时通常：

```text
0
```

失败：

```bash
ls /not-exist
echo $?
```

会得到一个非零值。

因此可以这样判断：

```bash
if systemctl is-active --quiet nginx; then
    echo "nginx 正在运行"
else
    echo "nginx 未运行"
fi
```

这里实际上是在根据命令的退出状态判断条件。

---

## `exit`：退出脚本

可以使用：

```bash
exit 0
```

表示脚本正常结束。

失败：

```bash
exit 1
```

例如：

```bash
if [ ! -f "$1" ]; then
    echo "文件不存在"
    exit 1
fi
```

脚本结束后，调用者可以通过：

```bash
echo $?
```

取得退出状态。

因此自动化脚本中经常使用：

```text
0
→ 成功

非 0
→ 失败
```

---

## Shell 脚本的基本健壮性

写脚本时，除了“能运行”，还应该考虑：

```text
变量为空怎么办？
命令失败怎么办？
文件不存在怎么办？
路径中有空格怎么办？
```

### `set -u`

```bash
set -u
```

使用未定义变量时产生错误。

例如：

```bash
set -u

echo "$name"
```

如果 `name` 没有定义，脚本会报错。

### `set -e`

```bash
set -e
```

在许多简单场景中，可以让脚本在未处理的命令失败时提前退出。

但它存在一些 Bash 语义上的例外，并不是“任何命令失败脚本都会无条件退出”。

因此不能简单理解成：

```text
set -e
→ 所有错误都会自动处理
```

### `set -o pipefail`

默认情况下，管道：

```bash
command1 | command2
```

的退出状态通常取决于最后一个命令。

例如：

```bash
false | true
```

最后一个命令成功，因此整个管道可能得到成功状态。

启用：

```bash
set -o pipefail
```

后，管道中出现失败时，可以使管道整体反映失败状态。

### 常见组合

很多 Bash 脚本会使用：

```bash
set -euo pipefail
```

可以分别理解为：

```text
-e
→ 处理未捕获的命令失败

-u
→ 处理未定义变量

-o pipefail
→ 让管道中的失败更容易被检测到
```

但这并不意味着脚本已经“绝对安全”。尤其是 `set -e` 在条件语句、循环、管道等上下文中存在具体语义规则，因此复杂脚本仍需要显式处理错误。

---

## 文本处理

Shell 脚本经常不是单独执行命令，而是：

```text
获取数据
↓
过滤
↓
排序
↓
统计
```

常见文本处理工具包括：

```text
cut
sort
uniq
grep
```

### `cut`：提取字段

例如：

```text
root:x:0:0:root:/root:/bin/bash
```

以 `:` 为分隔符：

```bash
echo 'root:x:0:0:root:/root:/bin/bash' | cut -d: -f1
```

结果：

```text
root
```

其中：

```text
-d:
→ 指定分隔符为 :

-f1
→ 提取第一个字段
```

提取用户名和 Shell：

```bash
echo 'root:x:0:0:root:/root:/bin/bash' | cut -d: -f1,7
```

结果：

```text
root:/bin/bash
```

### `sort`：排序

例如：

```bash
printf '%s\n' 3 1 2 5 4 | sort
```

结果：

```text
1
2
3
4
5
```

数字排序：

```bash
printf '%s\n' 10 2 30 4 | sort -n
```

其中：

```text
-n
→ 按数值排序
```

指定字段：

```bash
sort -t: -k3,3n /etc/passwd
```

表示以 `:` 为分隔符，根据第 3 个字段进行数值排序。

`sort` 对排序规则还会受到 locale 等因素影响，因此处理脚本数据时需要注意环境差异。([GNU Coreutils - sort](https://www.gnu.org/software/coreutils/manual/html_node/sort-invocation.html))

### `uniq`：去除相邻重复行

例如：

```bash
printf '%s\n' a a b b c | uniq
```

结果：

```text
a
b
c
```

一个非常重要的特点：

> `uniq` 只会合并**相邻的重复行**。

例如：

```bash
printf '%s\n' a b a | uniq
```

结果仍然是：

```text
a
b
a
```

因此统计唯一内容时经常组合：

```bash
sort file.txt | uniq
```

统计出现次数：

```bash
sort file.txt | uniq -c
```

例如：

```text
3 ERROR
2 WARN
1 INFO
```

### `cut + sort + uniq`

实际日志处理中经常组合：

```bash
cut -d' ' -f1 app.log | sort | uniq -c
```

可以形成：

```text
提取字段
↓
排序
↓
统计重复
```

这也是 Shell 脚本非常典型的处理思路。

---

## 正则表达式

正则表达式用于描述一组满足特定规则的文本。

例如：

```text
ERROR
WARN
INFO
```

可以使用：

```text
^(ERROR|WARN|INFO)
```

匹配以 `ERROR`、`WARN` 或 `INFO` 开头的行。

Shell 本身并不是一个完整的正则表达式引擎，实际使用通常由：

```text
grep
[[ =~ ]]
sed
awk
```

等工具或 Bash 功能完成。

---

## 常见正则符号

### `^`：行首

```text
^ERROR
```

表示：

```text
以 ERROR 开头
```

### `$`：行尾

```text
ERROR$
```

表示：

```text
以 ERROR 结尾
```

### `.`：任意单字符

```text
a.c
```

可以匹配：

```text
abc
a1c
a-c
```

### `*`：重复

```text
ab*
```

可以匹配：

```text
a
ab
abb
abbb
```

### `+`：一个或多个

在扩展正则中：

```text
ab+
```

可以匹配：

```text
ab
abb
abbb
```

### `?`：零个或一个

```text
colou?r
```

可以匹配：

```text
color
colour
```

### `[]`：字符集合

```text
[0-9]
```

表示一个数字。

```text
[a-z]
```

表示一个小写字母。

### `()`：分组

```text
(error|warn)
```

表示：

```text
error
或
warn
```

### `|`：或

```text
error|warn
```

表示：

```text
error
或
warn
```

需要注意：

> 正则表达式中的 `|` 和 Shell 管道中的 `|` 完全不是同一个东西。

Shell：

```bash
command1 | command2
```

表示管道。

正则：

```text
error|warn
```

表示匹配二者之一。

GNU `grep` 区分 Basic Regular Expressions 和 Extended Regular Expressions，因此使用 `grep -E` 时可以直接使用 `+`、`?`、`|`、`()` 等扩展正则语法。([GNU Grep - Regular Expressions](https://www.gnu.org/software/grep/manual/html_node/Regular-Expressions.html))

---

## 使用 `grep` 进行正则匹配

例如：

```bash
grep -E '^(ERROR|WARN)' app.log
```

匹配：

```text
ERROR database failed
WARN connection slow
```

但不会匹配：

```text
INFO server started
```

### Bash 中直接使用正则

Bash 的：

```bash
[[ string =~ regex ]]
```

可以直接进行正则表达式匹配。

例如：

```bash
if [[ "$version" =~ ^[0-9]+\.[0-9]+$ ]]; then
    echo "版本号格式正确"
fi
```

例如：

```text
1.2
10.5
```

可以匹配。

而：

```text
v1.2
1.2.3
```

不符合这个具体正则。

使用 `=~` 时，右侧是 Bash 使用的正则表达式，不应该像普通字符串那样随意加引号，否则可能改变匹配行为。

参考：[Bash Reference Manual - Conditional Constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)

---

## 批量操作脚本

Shell 最常见的实际用途之一就是批量处理。

例如批量检查一组服务器上的服务：

```bash
#!/bin/bash

servers=(
    server1
    server2
    server3
)

for server in "${servers[@]}"; do
    echo "检查 $server"

    if ssh "$server" "systemctl is-active --quiet nginx"; then
        echo "$server: nginx 正常"
    else
        echo "$server: nginx 异常"
    fi
done
```

执行过程：

```text
服务器列表
    ↓
for 循环
    ↓
SSH 连接
    ↓
检查服务
    ↓
输出结果
```

这比手动登录每台服务器更加适合重复性运维任务。

---

## 批量处理文件

例如将指定目录中的 `.log` 文件统一检查：

```bash
#!/bin/bash

for file in /var/log/*.log; do
    if [ -f "$file" ]; then
        echo "检查：$file"
        wc -l "$file"
    fi
done
```

这里组合了：

```text
for
+
通配符
+
if
+
文件判断
+
wc
```

Shell 脚本的价值往往就体现在这种：

```text
简单命令
+
控制逻辑
+
重复执行
```

---

## 日志处理脚本

假设日志：

```text
2026-09-12 ERROR database connection failed
2026-09-12 INFO  server started
2026-09-12 ERROR timeout
2026-09-12 WARN  connection slow
2026-09-12 ERROR database connection failed
```

统计 ERROR：

```bash
grep -c 'ERROR' app.log
```

提取错误日志：

```bash
grep 'ERROR' app.log
```

统计每种日志级别：

```bash
awk '{print $2}' app.log | sort | uniq -c
```

也可以组合：

```bash
grep -E 'ERROR|WARN' app.log
```

得到：

```text
ERROR
WARN
ERROR
```

进一步：

```bash
grep -E 'ERROR|WARN' app.log \
    | awk '{print $2}' \
    | sort \
    | uniq -c
```

形成：

```text
3 ERROR
1 WARN
```

整个过程可以理解为：

```text
原始日志
    ↓
grep
过滤 ERROR / WARN
    ↓
awk
提取字段
    ↓
sort
排序
    ↓
uniq -c
统计
```

Shell 脚本的强大之处并不在于单个命令有多复杂，而在于可以把大量小工具通过管道组合起来完成实际任务。

---

## 一个完整的自动化脚本

下面结合变量、函数、判断、日志和退出状态写一个简单的服务检查脚本：

```bash
#!/bin/bash

set -euo pipefail

SERVICE="nginx"
LOG_FILE="/var/log/service_check.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

check_service() {
    if systemctl is-active --quiet "$SERVICE"; then
        log "$SERVICE is running"
        return 0
    else
        log "$SERVICE is not running"
        return 1
    fi
}

if check_service; then
    echo "$SERVICE is healthy"
else
    echo "$SERVICE is unhealthy"
    exit 1
fi
```

这个脚本包含了：

```text
#!/bin/bash
→ 指定解释器

set -euo pipefail
→ 基本错误处理

变量
→ SERVICE
→ LOG_FILE

函数
→ log
→ check_service

命令替换
→ $(date)

重定向
→ >>

if
→ 判断服务状态

return
→ 函数退出状态

exit
→ 脚本退出状态
```

这也是 Shell 脚本比较典型的结构：

```text
配置
 ↓
函数
 ↓
执行逻辑
 ↓
判断结果
 ↓
记录日志
 ↓
返回状态码
```

---

## Shell 脚本的核心思维

写 Shell 脚本时，可以把它理解成：

```text
命令
+
变量
+
条件
+
循环
+
函数
+
文本处理
+
退出状态
```

例如一个实际的运维任务：

```text
检查服务器
    ↓
获取信息
    ↓
过滤数据
    ↓
判断状态
    ↓
出现异常
    ↓
记录日志
    ↓
返回非 0
```

Shell 特别适合这种“**调用系统命令 + 处理命令输出 + 根据结果采取动作**”的自动化场景。

它并不适合替代所有编程语言。

当任务开始涉及：

```text
复杂数据结构
大量业务逻辑
复杂并发
大型应用
```

通常应该考虑 Python、Go 等更加适合的软件工程语言。

对于 Linux 运维而言，Shell 的优势在于：

```text
离系统近
+
调用命令方便
+
处理文本方便
+
部署成本低
```

因此 Shell 往往是运维自动化中非常基础的一项能力。

---

## 官方文档

深入学习 Bash 和 Shell 脚本时，可以优先参考：

* [Bash Reference Manual](https://www.gnu.org/software/bash/manual/)
* [Bash - Shell Parameters](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameters.html)
* [Bash - Shell Arithmetic](https://www.gnu.org/software/bash/manual/html_node/Shell-Arithmetic.html)
* [Bash - Conditional Constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)
* [Bash - Shell Functions](https://www.gnu.org/software/bash/manual/html_node/Shell-Functions.html)
* [Bash - Looping Constructs](https://www.gnu.org/software/bash/manual/html_node/Looping-Constructs.html)
* [Bash - Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)
* [Bash - Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)
* [Bash - Command Substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.ht_)
