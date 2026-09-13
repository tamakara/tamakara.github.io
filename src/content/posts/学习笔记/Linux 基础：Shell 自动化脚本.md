---
title: Linux 基础：Shell 自动化脚本
published: 2026-09-13T02:11:56Z
description: ''
image: ''
tags: [Linux, Shell, Bash, 脚本, 自动化, 运维]
category: 学习笔记
draft: false 
lang: ''
---

> 当 Linux 命令越来越多之后，真正提高效率的方式并不是记住更多命令，而是把这些命令组织起来，让它们按照预先设计好的逻辑自动执行。
>
> Shell 脚本就是 Linux 自动化运维中最基础的工具之一。它可以组合系统命令、读取参数、判断运行状态、循环处理数据、记录日志，并根据执行结果决定下一步操作。
>
> 本文以 **Bash** 为主要环境，从脚本的创建与执行开始，逐步介绍变量、位置参数、引号、条件判断、循环、函数、退出状态、错误处理以及常见的自动化脚本实践。

# Shell 与 Shell 脚本

Shell 是一种：

> **命令解释器（Command Interpreter）**

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

Bash 是 GNU 项目中的 Shell，除了执行命令之外，还提供：

```text
变量
条件判断
循环
函数
数组
作业控制
命令替换
重定向
```

等功能。

详细语法可以参考 [Bash Reference Manual](https://www.gnu.org/software/bash/manual/)。

---

## 什么是 Shell 脚本

如果把多条 Shell 命令保存到一个文本文件中，并按照一定的逻辑组织起来，就可以形成一个：

> **Shell Script**

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

执行后可能得到：

```text
Hello Linux
/home/user
...
```

脚本最核心的价值是：

```text
多个命令
    ↓
组织成固定流程
    ↓
自动执行
    ↓
减少重复操作
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

等场景。

---

# 第一个 Bash 脚本

## Shebang

通常脚本第一行会写：

```bash
#!/bin/bash
```

这一行称为：

> **Shebang**

它用于指定解释该脚本的程序。

例如：

```bash
#!/bin/bash
echo "Hello Linux"
```

当使用：

```bash
./hello.sh
```

执行时，系统会根据 Shebang 确定使用 Bash 解释该脚本。

也可以写成：

```bash
#!/usr/bin/env bash
```

这种写法会通过 `PATH` 查找 Bash。

如果脚本明确依赖 Bash 的特有语法，例如：

```text
数组
[[ ]]
<<<
(( ))
```

那么应该明确使用 Bash，而不是写成：

```bash
#!/bin/sh
```

之后又使用 Bash 专属语法。

---

## 执行脚本

假设脚本：

```text
test.sh
```

可以直接交给 Bash：

```bash
bash test.sh
```

这种方式不要求脚本本身具有可执行权限。

也可以：

```bash
chmod +x test.sh
```

然后：

```bash
./test.sh
```

两者可以理解为：

```text
bash test.sh
    ↓
Bash 主动读取并执行脚本

./test.sh
    ↓
系统根据 Shebang 选择解释器
```

需要注意：

```bash
test.sh
```

通常不能直接执行。

因为当前目录通常不在：

```text
PATH
```

中。

因此执行当前目录中的脚本一般写成：

```bash
./test.sh
```

---

# 变量

变量用于保存脚本运行过程中的数据。

## 定义变量

例如：

```bash
name="Linux"
```

注意：

```bash
name = "Linux"
```

不是正确的 Bash 变量赋值写法。

`=` 两边不能随意添加空格。

读取变量：

```bash
echo "$name"
```

结果：

```text
Linux
```

---

## 变量引用

最常见：

```bash
echo "$name"
```

也可以：

```bash
echo "${name}"
```

当变量名后面紧跟其他字符时，`${...}` 更清晰。

例如：

```bash
name="app"

echo "${name}_server"
```

输出：

```text
app_server
```

---

## 未定义变量

如果变量没有定义：

```bash
echo "$name"
```

通常会展开为空字符串。

因此：

```text
变量不存在
```

和：

```bash
name=""
```

在某些场景下都可能表现为空值。

如果脚本需要严格区分这两种情况，可以配合参数展开或：

```bash
set -u
```

进行处理。

---

## 环境变量

Shell 环境中经常会使用：

```text
PATH
HOME
USER
SHELL
PWD
```

例如：

```bash
echo "$PATH"
echo "$HOME"
echo "$USER"
echo "$SHELL"
```

如果需要把普通 Shell 变量传递给子进程，可以：

```bash
export APP_ENV=production
```

子进程就能够读取：

```bash
echo "$APP_ENV"
```

变量和环境变量之间的关系在前面的《Linux 基础：Linux 终端与 Shell》中已经介绍过，这里重点关注它们在脚本中的实际用途。

---

# 只读与删除变量

## readonly

可以使用：

```bash
readonly VERSION="1.0"
```

之后：

```bash
VERSION="2.0"
```

修改通常会失败。

适合用于：

```text
版本号
固定配置
脚本中不应该改变的参数
```

---

## unset

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

# 脚本参数

Shell 脚本最重要的自动化能力之一，就是：

> **让脚本接收外部参数。**

例如：

```bash
#!/bin/bash

echo "脚本：$0"
echo "第一个参数：$1"
echo "第二个参数：$2"
```

执行：

```bash
./test.sh hello linux
```

可能得到：

```text
脚本：./test.sh
第一个参数：hello
第二个参数：linux
```

---

## 常见特殊参数

Bash 提供了很多特殊参数：

| 参数 | 含义 |
|---|---|
| `$0` | 当前脚本名称 |
| `$1` | 第 1 个位置参数 |
| `$2` | 第 2 个位置参数 |
| `$#` | 位置参数数量 |
| `$@` | 所有位置参数 |
| `$?` | 上一条命令的退出状态 |
| `$$` | 当前 Shell 的 PID |

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

参数数量：

```text
2
```

---

# `"$@"`：安全遍历参数

脚本批量处理参数时，经常需要：

```bash
for arg in "$@"; do
    echo "$arg"
done
```

例如：

```bash
./test.sh "hello world" linux
```

输出：

```text
hello world
linux
```

每个参数原本的边界都被保留下来。

因此：

> 遍历脚本参数时通常优先使用 `"$@"`。

不要随意写成：

```bash
for arg in $@; do
    ...
done
```

因为未加引号的参数可能发生词拆分。

---

# 引号

Shell 脚本里大量问题都和：

```text
引号
```

有关。

最常见的三种形式：

```text
'...'
"..."
不加引号
```

---

## 单引号

单引号：

```bash
'$name'
```

其中的变量不会展开。

例如：

```bash
name="Linux"

echo '$name'
```

输出：

```text
$name
```

因此：

```text
'...'
↓
尽可能按照字面量处理
```

---

## 双引号

双引号允许变量展开：

```bash
name="Linux"

echo "$name"
```

得到：

```text
Linux
```

在 Shell 脚本中，处理变量时通常应该优先考虑：

```bash
"$variable"
```

而不是：

```bash
$variable
```

例如：

```bash
file="/tmp/my file.txt"

cat "$file"
```

这样可以正确处理包含空格的路径。

如果写成：

```bash
cat $file
```

Shell 可能进行词拆分，导致：

```text
/tmp/my
file.txt
```

被当成不同参数。

因此可以建立一个非常重要的习惯：

> **变量引用默认加双引号。**

---

# Shell 展开

脚本中的表达式通常需要经过 Shell 展开。

常见类型包括：

```text
变量展开
命令替换
路径名展开
算术展开
```

例如：

```bash
echo "$HOME"
```

是：

```text
变量展开
```

而：

```bash
echo "$(date)"
```

是：

```text
命令替换
```

路径：

```bash
ls *.log
```

中的：

```text
*.log
```

则属于：

> Pathname Expansion（路径名展开）

不要把：

```text
*.log
```

与：

```text
正则表达式
```

混为一谈。

---

# 命令替换

使用：

```bash
$(command)
```

可以把命令输出替换到当前位置。

例如：

```bash
today=$(date)

echo "当前时间：$today"
```

也可以直接：

```bash
echo "当前时间：$(date)"
```

过程可以理解为：

```text
$(date)
   ↓
执行 date
   ↓
获得输出
   ↓
替换到当前位置
```

这是自动化脚本中非常常见的机制。

---

# 算术运算

Bash 支持基本的整数算术。

例如：

```bash
a=10
b=3

echo $((a + b))
echo $((a - b))
echo $((a * b))
echo $((a / b))
echo $((a % b))
```

常见运算：

| 运算符 | 含义 |
|---|---|
| `+` | 加 |
| `-` | 减 |
| `*` | 乘 |
| `/` | 整除 |
| `%` | 取模 |

也可以使用：

```bash
((a > b))
```

进行算术判断。

或者：

```bash
((count++))
```

修改计数器。

---

# 条件判断

自动化脚本必须能够根据运行状态决定下一步操作。

例如：

```text
文件存在
    ↓
继续执行

文件不存在
    ↓
报错退出
```

这就是条件判断。

---

## `if`

基本结构：

```bash
if 条件; then
    command
fi
```

例如：

```bash
if [ -f "/etc/passwd" ]; then
    echo "文件存在"
fi
```

---

## `if ... else`

```bash
if [ -f "/etc/passwd" ]; then
    echo "文件存在"
else
    echo "文件不存在"
fi
```

---

## `if ... elif ... else`

```bash
if [ "$USER" = "root" ]; then
    echo "当前用户是 root"
elif [ "$USER" = "admin" ]; then
    echo "当前用户是 admin"
else
    echo "普通用户"
fi
```

这类结构适合多个条件分支。

---

# `test` 与 `[ ]`

以下两种写法属于同一类条件测试：

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

| 条件 | 含义 |
|---|---|
| `-e` | 路径存在 |
| `-f` | 普通文件 |
| `-d` | 目录 |
| `-r` | 可读 |
| `-w` | 可写 |
| `-x` | 可执行 |

---

## 字符串判断

相等：

```bash
[ "$name" = "root" ]
```

不相等：

```bash
[ "$name" != "root" ]
```

为空：

```bash
[ -z "$name" ]
```

非空：

```bash
[ -n "$name" ]
```

---

## 数值判断

Bash 的传统条件测试中，整数通常使用：

```bash
[ "$a" -eq "$b" ]
```

常见操作：

| 操作 | 含义 |
|---|---|
| `-eq` | 等于 |
| `-ne` | 不等于 |
| `-gt` | 大于 |
| `-ge` | 大于等于 |
| `-lt` | 小于 |
| `-le` | 小于等于 |

例如：

```bash
if [ "$count" -gt 10 ]; then
    echo "数量超过 10"
fi
```

需要区分：

```text
字符串比较
↓
= !=

整数比较
↓
-eq -ne -gt -ge -lt -le
```

---

# `[[ ]]`：Bash 条件表达式

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

相比传统的：

```bash
[ ... ]
```

`[[ ... ]]` 是 Bash 的条件构造，支持更多 Shell 特性。

例如正则匹配：

```bash
if [[ "$version" =~ ^[0-9]+\.[0-9]+$ ]]; then
    echo "版本号格式正确"
fi
```

因此：

> 如果脚本明确使用 Bash，实际编写时通常优先考虑 `[[ ... ]]`。

相关语法可以参考 [Bash Conditional Constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)。

---

# `case`：多分支选择

当一个变量存在多个可能值时：

```bash
if
elif
elif
else
```

会越来越长。

这时可以使用：

```bash
case
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

执行：

```bash
./service.sh start
```

得到：

```text
启动服务
```

这种结构尤其适合：

```text
命令参数
菜单选项
操作类型
状态类型
```

---

# 循环

Shell 脚本中的循环主要解决：

> **重复执行某段逻辑。**

常见循环：

```text
for
while
```

---

## `for`

遍历一组数据：

```bash
for name in Tom Jack Lucy; do
    echo "$name"
done
```

输出：

```text
Tom
Jack
Lucy
```

---

## 遍历文件

例如：

```bash
for file in /var/log/*.log; do
    echo "$file"
done
```

这可以批量处理某个目录中的日志文件。

但需要注意：

> 如果没有任何文件匹配通配符，脚本可能得到一个原样的模式字符串，而不是一个空列表。

因此更加健壮的脚本需要根据实际需求处理这种情况。

---

## 遍历脚本参数

推荐：

```bash
for arg in "$@"; do
    echo "$arg"
done
```

这样可以正确保留：

```text
包含空格的参数
```

---

## C 风格循环

Bash 支持：

```bash
for ((i=0; i<10; i++)); do
    echo "$i"
done
```

适合：

```text
计数
循环 N 次
数组下标
```

等场景。

---

# `while`

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

输出：

```text
0
1
2
3
4
```

---

## 逐行读取文件

脚本中经常需要逐行处理文本。

推荐：

```bash
while IFS= read -r line; do
    echo "$line"
done < app.log
```

这里：

```text
IFS=
↓
避免默认字段拆分

read -r
↓
避免反斜杠被额外解释
```

因此：

```bash
while IFS= read -r line; do
    ...
done < file
```

是 Bash 中处理普通文本文件时非常值得掌握的一种写法。

相比：

```bash
for line in $(cat app.log); do
    ...
done
```

它更适合保持原始行结构。

---

# `break` 与 `continue`

## break

立即结束当前循环：

```bash
for i in {1..10}; do
    if [[ "$i" -eq 5 ]]; then
        break
    fi

    echo "$i"
done
```

输出：

```text
1
2
3
4
```

---

## continue

跳过当前这一次循环：

```bash
for i in {1..5}; do
    if [[ "$i" -eq 3 ]]; then
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

因此：

```text
break
↓
结束整个循环

continue
↓
结束本次循环，进入下一次
```

---

# 函数

当脚本中存在大量重复操作时，可以使用：

> **函数**

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

函数非常适合封装：

```text
日志输出
服务检查
参数验证
文件检查
部署操作
```

等重复逻辑。

---

## 函数参数

函数同样可以使用位置参数：

```bash
greet() {
    echo "Hello $1"
}

greet "Linux"
```

输出：

```text
Hello Linux
```

函数内部的：

```text
$1
$2
$@
```

等参数属于函数自己的位置参数。

---

## 函数返回值

Shell 函数通常通过：

> **退出状态码**

表示执行结果。

例如：

```bash
check_file() {
    if [[ -f "$1" ]]; then
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

可以理解为：

```text
return 0
↓
成功

return 非 0
↓
失败
```

Shell 函数的这种“返回值”本质上是：

> **退出状态**

而不是其他编程语言中任意类型的返回对象。

---

# 退出状态码

Shell 中几乎每条命令执行结束后都会产生：

> **Exit Status**

通常：

```text
0
↓
成功

非 0
↓
失败或异常
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

如果：

```bash
ls /not-exist
echo $?
```

则会得到一个非零值。

---

## 为什么退出状态很重要

自动化脚本不能仅仅看：

```text
终端有没有打印错误
```

而需要根据：

```text
命令执行是否成功
```

做后续判断。

例如：

```bash
if systemctl is-active --quiet nginx; then
    echo "nginx 正常"
else
    echo "nginx 异常"
fi
```

这里实际上就是在使用：

```text
systemctl
      ↓
退出状态
      ↓
if 判断
```

因此退出状态是 Shell 自动化中非常重要的基础。

---

# `exit`：结束脚本

可以使用：

```bash
exit 0
```

表示：

> 脚本成功结束。

例如发生异常：

```bash
exit 1
```

表示：

> 脚本以非零状态结束。

典型写法：

```bash
if [[ ! -f "$1" ]]; then
    echo "文件不存在"
    exit 1
fi
```

脚本结束后：

```bash
echo $?
```

可以查看脚本最终的退出状态。

因此：

```text
exit 0
↓
成功

exit 非 0
↓
失败
```

对于：

```text
CI/CD
定时任务
监控
自动化部署
```

尤其重要，因为调用者可以根据退出状态判断：

> 这次自动化任务到底成功还是失败。

---

# 文本处理与脚本结合

Shell 脚本经常需要：

```text
读取数据
↓
过滤
↓
提取
↓
排序
↓
统计
```

前面《Linux 基础：文本检索与处理》中介绍的工具，可以直接组合进脚本：

```text
grep
cut
sort
uniq
awk
sed
wc
```

例如统计日志中 `ERROR` 的数量：

```bash
grep -c 'ERROR' app.log
```

统计不同日志级别：

```bash
awk '{print $2}' app.log | sort | uniq -c
```

这里：

```text
awk
↓
提取字段

sort
↓
排序

uniq -c
↓
统计
```

Shell 脚本真正强大的地方就在于：

> **把文本处理工具和控制逻辑结合起来。**

---

# Shell 脚本中的错误处理

脚本不仅要“能运行”，还应该考虑：

```text
变量为空怎么办？
命令失败怎么办？
文件不存在怎么办？
路径包含空格怎么办？
管道中的命令失败怎么办？
```

这些问题直接决定了脚本能不能用于实际自动化场景。

---

## `set -u`

```bash
set -u
```

用于让未定义变量的使用更加严格。

例如：

```bash
set -u

echo "$name"
```

如果 `name` 没有定义，脚本会报错。

这可以帮助发现：

```text
变量拼写错误
忘记初始化变量
变量意外为空
```

等问题。

---

## `set -e`

```bash
set -e
```

可以让脚本在很多未被显式处理的命令失败场景下提前退出。

例如：

```bash
set -e

command1
command2
command3
```

如果前面的命令发生未处理的失败，脚本可能不会继续执行后面的命令。

但需要特别注意：

> `set -e` 存在 Bash 语义上的例外。

例如：

```text
if
while
until
&&
||
!
```

等上下文中的命令失败，并不一定会按照“任何非零状态都立即退出”的简单规则处理。

因此：

```text
set -e
```

不是万能错误处理机制。

---

## `set -o pipefail`

默认情况下：

```bash
command1 | command2
```

的管道状态通常由最后一个命令决定。

例如：

```bash
false | true
```

最后的：

```text
true
```

成功，因此整个管道可能表现为成功。

启用：

```bash
set -o pipefail
```

之后，如果管道中存在失败命令，管道整体更容易正确反映失败状态。

因此常见组合：

```bash
set -euo pipefail
```

分别对应：

```text
-e
↓
命令失败时尽早暴露问题

-u
↓
未定义变量报错

-o pipefail
↓
管道中的失败不容易被最后一个成功命令掩盖
```

需要注意：

> `set -euo pipefail` 能提高脚本健壮性，但不能代替完整的错误处理设计。

---

# Here Document

Shell 脚本有时需要生成多行配置文件。

这时可以使用：

```bash
cat <<EOF
server:
  host: 0.0.0.0
  port: 8080
EOF
```

这种语法叫：

> **Here Document**

非常适合：

```text
生成配置文件
生成脚本
写入 SQL
生成多行文本
```

例如：

```bash
cat > app.conf <<EOF
server:
  host: 0.0.0.0
  port: 8080
EOF
```

这样可以直接通过脚本生成配置。

需要注意，Here Document 是否进行变量展开，与分隔符是否使用引号有关。例如：

```bash
cat <<EOF
HOME=$HOME
EOF
```

会进行变量展开。

而：

```bash
cat <<'EOF'
HOME=$HOME
EOF
```

则会保留字面量：

```text
HOME=$HOME
```

---

# Here String

Bash 还提供：

```bash
<<<
```

例如：

```bash
read -r name <<< "Linux"

echo "$name"
```

这里的字符串：

```text
Linux
```

会作为标准输入提供给 `read`。

可以简单理解成：

```text
字符串
 ↓
stdin
 ↓
命令
```

这是 Bash 的扩展语法。

---

# 后台执行

脚本中也可以：

```bash
command &
```

让任务后台执行。

例如：

```bash
./long_task.sh &
```

Shell 不会一直等待它执行完成。

不过：

```text
&
```

和：

```text
nohup
```

不是同一个概念。

```text
&
↓
后台作业

nohup
↓
主要用于处理 SIGHUP 等终端退出相关情况
```

在服务器上运行长期任务时，还会进一步涉及：

```text
systemd
tmux
screen
nohup
```

这些属于后续运维专题。

---

# 批量处理文件

Shell 自动化最常见的场景之一：

> **批量执行重复操作。**

例如批量检查日志：

```bash
#!/bin/bash

for file in /var/log/*.log; do
    if [[ -f "$file" ]]; then
        echo "检查：$file"
        wc -l "$file"
    fi
done
```

这个脚本组合了：

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

工作流程：

```text
找到日志文件
      ↓
逐个处理
      ↓
判断是否为普通文件
      ↓
统计行数
      ↓
输出结果
```

这就是 Shell 自动化最典型的使用方式。

---

# 日志处理脚本

假设存在：

```text
2026-09-12 ERROR database connection failed
2026-09-12 INFO  server started
2026-09-12 ERROR timeout
2026-09-12 WARN  connection slow
2026-09-12 ERROR database connection failed
```

统计 `ERROR`：

```bash
grep -c 'ERROR' app.log
```

提取错误日志：

```bash
grep 'ERROR' app.log
```

统计不同日志级别：

```bash
awk '{print $2}' app.log | sort | uniq -c
```

还可以：

```bash
grep -E 'ERROR|WARN' app.log
```

只保留：

```text
ERROR
WARN
```

进一步组合：

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

这里可以清晰看到：

```text
原始日志
    ↓
grep
过滤
    ↓
awk
提取
    ↓
sort
排序
    ↓
uniq -c
统计
```

这就是 Shell 脚本中非常典型的数据处理流程。

---

# 一个完整的自动化脚本

下面将前面的内容组合起来，编写一个简单的服务检查脚本：

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

这个脚本包含：

```text
#!/bin/bash
↓
指定解释器

set -euo pipefail
↓
基本错误处理

变量
↓
SERVICE
LOG_FILE

函数
↓
log
check_service

命令替换
↓
$(date)

重定向
↓
>>

if
↓
判断服务状态

return
↓
函数退出状态

exit
↓
脚本退出状态
```

整个运行逻辑：

```text
启动脚本
   ↓
定义服务与日志位置
   ↓
检查 nginx
   ↓
    ┌───────────────┐
    │               │
  正常              异常
    │               │
    ▼               ▼
记录日志         记录日志
    │               │
    ▼               ▼
输出 healthy     输出 unhealthy
                    │
                    ▼
                 exit 1
```

这已经接近实际运维脚本的基本结构。

---

# Shell 自动化脚本的核心思维

写 Shell 脚本时，可以把它理解为：

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

然后把这些基础能力组织成一个完整流程：

```text
获取信息
    ↓
处理数据
    ↓
判断状态
    ↓
执行操作
    ↓
记录日志
    ↓
返回结果
```

例如：

```text
检查服务器
    ↓
获取磁盘空间
    ↓
判断是否超过阈值
    ↓
超过阈值
    ↓
记录告警
    ↓
返回非 0
```

这就是 Shell 在运维中的典型价值。

---

# Shell 适合做什么

Shell 特别适合：

```text
系统命令组合
文件批量处理
日志分析
服务管理
部署脚本
环境初始化
定时任务
简单的健康检查
```

例如：

```text
systemctl
docker
kubectl
curl
grep
awk
sed
find
```

这些 Linux / 运维工具可以非常方便地被 Shell 组合起来。

因此 Shell 很适合这种模式：

```text
调用系统命令
      ↓
读取命令结果
      ↓
判断结果
      ↓
执行下一步
```

---

# Shell 不适合什么

Shell 并不是用来替代所有编程语言的。

当任务开始出现：

```text
复杂数据结构
大量业务逻辑
复杂并发
大型程序
复杂网络服务
```

通常应该考虑：

```text
Python
Go
Java
```

等更加适合的软件开发语言。

Shell 的优势不是：

> “能够写出多复杂的软件”。

而是：

> **距离 Linux 系统足够近，可以非常方便地调用系统命令和处理系统输出。**

因此在运维领域：

```text
Linux
 +
Shell
 +
命令行工具
```

通常是一套非常基础且实用的自动化能力。

---

## 外部参考

- [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/)
- [Bash Conditional Constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)
- [Bash Shell Parameters](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameters.html)
- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
