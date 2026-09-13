---
title: Linux 基础：Shell 基础
published: 2026-09-13T02:05:45Z
description: ''
image: ''
tags: [Linux, Shell, Bash, 终端, 作业控制]
category: 学习笔记
draft: false 
lang: ''
---

> Linux 的日常管理工作大多从命令行开始。要真正理解 Linux 命令行，首先需要弄清楚 **Terminal、Shell、Bash、命令、进程以及作业控制** 之间的关系。
>
> 本文从终端和 Shell 的基本概念出发，逐步介绍 Bash、命令解析、内建命令与外部命令、`PATH`、环境变量、标准输入输出、管道、重定向、命令替换，以及前后台任务、终端快捷键和 Job Control，建立一套完整的 Linux 命令行认知模型。

## Terminal、Shell 与 Bash

### 什么是 Terminal

我们平时打开的“终端窗口”，通常是一个：

> **终端模拟器（Terminal Emulator）**

例如：

```text
GNOME Terminal
Konsole
xterm
Windows Terminal
```

终端主要负责提供一个文本输入输出环境，让用户能够与命令行程序交互。

可以简单理解为：

```text
键盘
  │
  ▼
Terminal
  │
  ▼
Shell
  │
  ▼
程序
  │
  ▼
Terminal
  │
  ▼
屏幕
```

因此：

> **Terminal 本身通常不负责解释 Linux 命令。**

例如输入：

```bash
ls
```

终端负责接收键盘输入，并通过终端接口把输入交给 Shell；Shell 再负责解析和执行命令，最后把程序输出交给终端显示。

---

### TTY 与 PTY

在 Linux / Unix 中，终端还涉及两个常见概念：

```text
TTY
PTY
```

TTY 最初来自 Teletype，现代系统中的终端设备接口延续了这一概念。

而桌面 Linux 中常见的终端模拟器，通常通过：

> **PTY（Pseudo Terminal，伪终端）**

与 Shell 连接。

可以简化为：

```text
┌────────────────────┐
│  Terminal Emulator │
└─────────┬──────────┘
          │
         PTY
          │
          ▼
      ┌──────┐
      │ Bash │
      └──────┘
```

因此，我们看到的终端窗口只是命令行环境的一部分。

---

### 什么是 Shell

Shell 可以理解为：

> **命令解释器（Command Interpreter）**

它负责读取用户输入，并按照 Shell 语言规则进行解析，然后执行相应操作。

例如：

```bash
ls -lah /var/log
```

Shell 需要识别：

```text
ls
↓
命令

-lah
↓
选项

/var/log
↓
参数
```

同时，它还需要处理：

```text
变量展开
命令替换
路径名展开
输入输出重定向
管道
前台 / 后台任务
作业控制
```

所以 Shell 并不是简单的：

```text
输入一行
    ↓
执行一行
```

而是拥有完整语法和执行机制的一类程序。

常见的 Shell 包括：

```text
sh
bash
zsh
fish
```

因此：

> **Shell 是一种程序类型，Bash 是 Shell 的一种具体实现。**

---

### Bash 是什么

Bash 全称：

> **Bourne Again SHell**

它是 GNU 项目中的 Shell，也是 Linux 环境中非常常见的一种 Shell。

可以把 Bash 看成用户和 Linux 系统之间的重要中间层：

```text
用户
 │
 ▼
Terminal
 │
 ▼
Bash
 │
 ├── 解析 Shell 语法
 ├── 查找命令
 ├── 管理 Shell 环境
 ├── 管理作业
 └── 启动程序
 │
 ▼
Linux Kernel
```

Bash 本身并不负责直接管理：

```text
CPU
内存
硬盘
网络设备
```

这些底层资源主要由 Linux Kernel 管理。

Bash 更重要的职责是：

> **把用户输入转化为对系统和程序的操作。**

[Bash Reference Manual](https://www.gnu.org/software/bash/manual/) 对 Bash 的语法、内建命令、作业控制以及各种 Shell 特性进行了完整说明。

---

## Terminal、Shell 与进程

### 三者的关系

可以先建立这样一个模型：

```text
┌────────────────────┐
│  Terminal Emulator │
└─────────┬──────────┘
          │
          │ PTY
          ▼
┌────────────────────┐
│       Shell        │
│       Bash         │
└─────────┬──────────┘
          │
          │ 执行命令
          ▼
┌────────────────────┐
│      Process       │
│       进程          │
└────────────────────┘
```

例如执行：

```bash
ls
```

大致可以理解为：

```text
键盘
 ↓
Terminal
 ↓
Bash
 ↓
解析命令
 ↓
找到 ls
 ↓
启动进程
 ↓
程序执行
 ↓
产生输出
 ↓
Terminal 显示
```

因此可以先记住：

> **Terminal 负责交互，Shell 负责解释，Process 负责执行。**

---

## Shell 如何执行命令

### 命令的基本结构

最简单的命令形式通常可以写成：

```text
command [options] [arguments]
```

例如：

```bash
ls -l /var/log
```

可以理解成：

```text
ls
↓
命令

-l
↓
选项

/var/log
↓
参数
```

不过：

> 具体选项和参数的含义由实际执行的程序定义。

例如：

```bash
ls -l
```

中的 `-l` 和：

```bash
grep -n
```

中的 `-n`，都是由各自程序解释的。

因此：

> **Shell 负责处理 Shell 自身的语法，而具体命令负责处理自己的选项和参数。**

---

### Shell 的解析过程

例如：

```bash
echo "Hello $USER"
```

Bash 并不是简单地把整行字符串直接交给 `echo`。

它首先需要进行 Shell 语法处理：

```text
输入命令
   │
   ▼
Shell 解析
   │
   ├── 识别命令
   ├── 处理引号
   ├── 变量展开
   ├── 命令替换
   ├── 路径名展开
   └── 重定向 / 管道
   │
   ▼
执行命令
```

假设：

```text
USER=alice
```

那么：

```bash
echo "Hello $USER"
```

执行时会把：

```text
$USER
```

展开成：

```text
alice
```

最终传递给 `echo` 的内容相当于：

```text
Hello alice
```

因此：

> **Shell 本身也是一种具有语法和执行规则的语言环境。**

---

## 内建命令与外部命令

### 外部命令

Linux 中很多常用命令其实是独立的可执行程序。

例如：

```text
ls
cp
mv
grep
cat
```

通常可以找到类似：

```text
/usr/bin/ls
/usr/bin/cp
/usr/bin/grep
```

执行：

```bash
ls
```

时，Shell 会找到对应的程序并启动执行。

可以简化为：

```text
Bash
 │
 ▼
查找 ls
 │
 ▼
/usr/bin/ls
 │
 ▼
启动进程
```

---

### Shell 内建命令

另一部分命令直接由 Shell 自己实现，这些叫：

> **Shell Builtin**

例如 Bash 中常见的：

```text
cd
export
alias
jobs
fg
bg
read
```

这里最经典的是：

```bash
cd /var/log
```

为什么 `cd` 需要是 Shell 内建命令？

因为 `cd` 的作用是：

> **改变当前 Shell 的工作目录。**

假设它是一个独立程序：

```text
Bash
 │
 └── cd
      │
      └── 修改 cd 自己的工作目录
```

当 `cd` 结束之后：

```text
Bash
```

的当前工作目录不会因此改变。

因此必须由当前 Shell 自己执行：

```text
cd
 ↓
修改当前 Shell 状态
 ↓
Shell Builtin
```

类似地：

```text
export
jobs
fg
bg
```

等命令也需要直接操作当前 Shell 的状态。

---

### 判断命令来自哪里

可以使用：

```bash
type cd
```

例如：

```text
cd is a shell builtin
```

再看：

```bash
type ls
```

可能得到：

```text
ls is /usr/bin/ls
```

还可以：

```bash
type -a ls
```

查看多个可能的命令来源。

或者：

```bash
command -v ls
```

查看 Shell 对该命令的解析结果。

[Bash Builtin Commands](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html) 中可以查看 Bash 内建命令的完整说明。

---

## PATH 与命令查找

### 什么是 PATH

执行：

```bash
ls
```

为什么不用输入：

```bash
/usr/bin/ls
```

因为 Shell 会使用：

> **`PATH` 环境变量**

查看：

```bash
echo $PATH
```

例如可能是：

```text
/usr/local/bin:/usr/bin:/bin
```

其中：

```text
:
```

用于分隔多个目录。

可以理解为：

```text
PATH
 │
 ├── /usr/local/bin
 ├── /usr/bin
 └── /bin
```

当输入：

```bash
ls
```

时，Shell 会按照命令查找规则在这些目录中寻找相应的可执行文件。

---

### PATH 的顺序

假设系统中存在：

```text
/usr/bin/tool
/usr/local/bin/tool
```

并且：

```text
PATH=/usr/bin:/usr/local/bin
```

那么：

```text
/usr/bin
```

位于更前面，会影响命令查找结果。

因此 `PATH` 不只是：

```text
有哪些目录
```

还包括：

```text
这些目录的顺序
```

这也是软件多版本共存时经常出现问题的原因之一。

---

## Shell 环境

### Shell 变量

Shell 可以定义自己的变量：

```bash
name=Alice
```

读取：

```bash
echo $name
```

需要注意：

```bash
name=Alice
```

等号两边不能随意添加空格。

例如：

```bash
name = Alice
```

并不是正确的变量赋值语法。

---

### 环境变量

Linux Shell 中经常会看到：

```text
USER
HOME
PATH
SHELL
PWD
LANG
```

例如：

```bash
echo $HOME
```

可能得到：

```text
/home/alice
```

常见变量可以简单理解为：

| 变量 | 常见含义 |
|---|---|
| `USER` | 当前用户 |
| `HOME` | 用户家目录 |
| `PATH` | 可执行文件搜索路径 |
| `SHELL` | 用户默认 Shell |
| `PWD` | 当前工作目录 |
| `OLDPWD` | 上一个工作目录 |
| `LANG` | 语言环境 |

---

### Shell 变量与环境变量

需要区分：

```text
Shell Variable
```

和：

```text
Environment Variable
```

例如：

```bash
name=Alice
```

只是当前 Shell 中的变量。

使用：

```bash
export name
```

后，它会成为环境变量，可以被当前 Shell 启动的子进程继承。

可以理解为：

```text
Shell Variable
      │
    export
      ▼
Environment Variable
      │
      ▼
   子进程继承
```

---

### 父 Shell 与子 Shell

Shell 本身也是一个进程。

例如：

```bash
bash
```

会启动一个新的 Bash：

```text
父 Bash
  │
  ▼
子 Bash
```

环境变量通常会由父进程传递给子进程：

```text
父 Shell
   │
   ├── PATH
   ├── HOME
   └── APP_ENV
          │
          ▼
       子 Shell
```

但普通 Shell 变量不会自动成为子进程的环境变量。

例如：

```bash
NAME=Alice
bash
echo $NAME
```

子 Bash 通常不能读取这个没有导出的变量。

而：

```bash
export NAME=Alice
bash
echo $NAME
```

子 Bash 就能够继承：

```text
Alice
```

---

### 当前工作目录

每个 Shell 都有自己的：

> **Current Working Directory**

可以使用：

```bash
pwd
```

查看。

例如：

```text
$ pwd
/home/alice
```

执行：

```bash
cd /var/log
```

再执行：

```bash
pwd
```

得到：

```text
/var/log
```

这也再次说明了为什么 `cd` 必须直接修改当前 Shell。

```text
Bash
 │
 └── 当前工作目录
          ↓
       /var/log
```

---

## 标准输入、输出与文件描述符

### stdin、stdout、stderr

Linux 程序通常会使用三个标准文件描述符：

| 文件描述符 | 名称 | 含义 |
|---:|---|---|
| `0` | `stdin` | 标准输入 |
| `1` | `stdout` | 标准输出 |
| `2` | `stderr` | 标准错误 |

可以理解为：

```text
              Process
          ┌──────┼──────┐
          │      │      │
          ▼      ▼      ▼
       stdin   stdout  stderr
         0       1       2
```

在交互式环境中可以粗略理解为：

```text
键盘
  │
  ▼
 stdin
  │
  ▼
程序
  │
  ├──────► stdout ───► Terminal
  │
  └──────► stderr ───► Terminal
```

---

### 为什么要区分 stdout 和 stderr

程序运行时可能产生两类信息：

```text
正常结果
错误 / 诊断信息
```

如果全部混在一起，后续处理会很麻烦。

因此程序通常分别使用：

```text
stdout
↓
正常输出

stderr
↓
错误和诊断信息
```

这样 Shell 就可以单独处理二者：

```text
stdout → 文件
stderr → Terminal
```

或者：

```text
stdout → 文件
stderr → 文件
```

这就是后续重定向机制的基础。

---

### 文件描述符

文件描述符（File Descriptor）可以理解为：

> **进程用于引用已打开 I/O 对象的整数。**

最常见的是：

```text
0 → stdin
1 → stdout
2 → stderr
```

但进程还可以拥有其他文件描述符：

```text
0   stdin
1   stdout
2   stderr
3   普通文件
4   Socket
5   Pipe
...
```

因此文件描述符不仅可以表示普通文件，也可以关联：

```text
文件
管道
Socket
设备
终端
```

这也是后续理解：

```text
重定向
管道
网络通信
日志
```

的重要基础。

---

## 管道、重定向与命令替换

### 管道

Shell 使用：

```text
|
```

连接两个命令。

例如：

```bash
ps -ef | grep java
```

可以理解为：

```text
ps -ef
   │
   │ stdout
   ▼
┌────────┐
│  Pipe  │
└────┬───┘
     │
     │ stdin
     ▼
 grep java
     │
     │ stdout
     ▼
   Terminal
```

所以：

> **管道的核心，是把前一个命令的标准输出连接到后一个命令的标准输入。**

而不是简单理解成：

> “把两个命令连起来”。

[Bash Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html) 对这一机制有详细说明。

---

### 输出重定向

正常情况下：

```text
程序
 ↓
stdout
 ↓
Terminal
```

使用：

```text
>
```

可以将标准输出重定向到文件：

```bash
echo "Hello" > test.txt
```

变成：

```text
echo
 │
 │ stdout
 ▼
test.txt
```

如果文件已经存在：

```text
>
↓
覆盖
```

---

### 追加重定向

使用：

```text
>>
```

例如：

```bash
echo "Hello" >> test.txt
```

表示：

```text
stdout
 ↓
追加到文件末尾
```

可以记成：

| 语法 | 作用 |
|---|---|
| `>` | 覆盖写入 |
| `>>` | 追加写入 |

---

### 输入重定向

使用：

```text
<
```

例如：

```bash
wc -l < app.log
```

可以理解为：

```text
app.log
   │
   │ stdin
   ▼
 wc -l
```

即：

> 把文件内容作为程序的标准输入。

---

### 标准错误重定向

因为：

```text
stderr = 2
```

所以：

```bash
command 2> error.log
```

表示：

```text
stderr
  │
  ▼
error.log
```

此时标准输出仍然保持原来的去向。

---

### 合并 stdout 与 stderr

例如：

```bash
command > app.log 2>&1
```

可以理解为：

```text
stdout
  │
  ▼
app.log

stderr
  │
  ▼
stdout 当前指向的位置
  │
  ▼
app.log
```

最终：

```text
stdout ──┐
         ├──► app.log
stderr ──┘
```

需要特别注意：

> **Shell 会按照从左到右的顺序处理重定向。**

因此：

```bash
command > app.log 2>&1
```

和：

```bash
command 2>&1 > app.log
```

并不等价。

具体语法可以参考 [Bash Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)。

---

### 命令替换

Shell 还支持：

> **Command Substitution**

例如：

```bash
echo "$(date)"
```

Shell 会先执行：

```bash
date
```

再把命令输出替换到：

```text
$(date)
```

的位置。

可以理解成：

```text
$(date)
   │
   ▼
执行 date
   │
   ▼
得到输出
   │
   ▼
替换原位置
```

例如：

```bash
echo "Today: $(date)"
```

就可以将当前日期和时间嵌入字符串中。

现代 Bash 更推荐：

```bash
$(...)
```

而不是旧式：

```bash
`...`
```

参考：[Bash Command Substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html)。

---

## Shell 前台、后台与作业控制

### 前台任务

执行：

```bash
sleep 100
```

Shell 启动任务后，会等待该任务结束：

```text
Shell
 │
 ▼
sleep
 │
 │ 前台运行
 ▼
完成
 │
 ▼
Shell
```

在任务运行期间，当前终端主要由这个前台任务使用。

---

### 后台任务

命令末尾加上：

```text
&
```

例如：

```bash
sleep 100 &
```

Shell 会将任务放到后台运行，并立即返回新的命令提示符。

例如：

```text
[1] 12345
```

这里可能表示：

```text
Job ID = 1
PID    = 12345
```

于是可以继续输入：

```bash
pwd
ls
cd /tmp
```

整个过程可以理解成：

```text
Shell
 │
 ├──────► sleep
 │          │
 │          └── 后台运行
 │
 ▼
返回提示符
```

---

### Job 与 Process

这两个概念非常容易混淆。

#### Process

Process 是 Linux 内核管理的执行实体。

通常拥有：

```text
PID
```

例如：

```text
PID = 12345
```

#### Job

Job 是：

> **Shell 为用户管理任务时使用的概念。**

例如：

```text
[1] sleep 100
```

这里的：

```text
1
```

是：

> Job ID

因此：

```text
Job ID
 ↓
Shell 的任务编号

PID
 ↓
Linux 进程编号
```

二者不是一回事。

一个 Job 甚至可能包含多个进程。

例如：

```bash
producer | consumer
```

从 Shell 的角度可以作为一个作业进行管理，但其中涉及多个进程。

所以：

> **Job 是 Shell 的管理概念，Process 是操作系统的执行概念。**

---

# Terminal 快捷键与任务控制

### Ctrl+C：中断前台任务

在终端中按：

```text
Ctrl + C
```

通常会使当前前台进程组收到：

```text
SIGINT
```

它表示：

> 请求中断当前操作。

例如：

```bash
sleep 100
```

运行后按：

```text
Ctrl + C
```

通常会使任务退出。

过程可以简化成：

```text
Terminal
   │
   │ Ctrl+C
   ▼
Foreground Process Group
   │
   │ SIGINT
   ▼
Process
   │
   ▼
通常终止
```

需要注意：

> **Ctrl+C 并不是直接执行“杀死进程”的系统调用。**

它首先触发终端控制机制，最终向前台进程组产生：

```text
SIGINT
```

程序收到该信号后可以：

```text
正常退出
处理后退出
忽略
```

因此：

```text
Ctrl+C
≠
任何情况下都强制杀死程序
```

后续《Linux 信号机制》会进一步介绍 `SIGINT`、`SIGTERM`、`SIGKILL` 等信号。

---

### Ctrl+Z：暂停前台任务

按下：

```text
Ctrl + Z
```

通常会使当前前台进程组收到：

```text
SIGTSTP
```

它通常表示：

> 请求暂停当前任务。

例如：

```bash
sleep 100
```

运行后：

```text
Ctrl + Z
```

可能得到：

```text
[1]+  Stopped    sleep 100
```

注意：

> 这个任务不是结束了，而是从 Running 变成了 Stopped。

可以理解为：

```text
Running
   │
   │ Ctrl+Z
   ▼
Stopped
```

---

### Ctrl+C 与 Ctrl+Z 的区别

这是最需要掌握的一组快捷键：

```text
Ctrl+C
 ↓
SIGINT
 ↓
通常中断任务

Ctrl+Z
 ↓
SIGTSTP
 ↓
通常暂停任务
```

因此：

```text
Ctrl+C
→ 停止执行

Ctrl+Z
→ 暂停执行
```

虽然日常使用中都表现为“程序不再继续运行”，但底层含义完全不同。

---

### jobs：查看当前 Job

使用：

```bash
jobs
```

例如：

```text
[1]+  Running    sleep 100 &
[2]-  Stopped    vim test.txt
```

这里：

```text
[1]
[2]
```

是 Job ID。

常见状态包括：

```text
Running
Stopped
Done
```

`jobs` 关注的是：

> **当前 Shell 管理的作业。**

而它和：

```bash
ps
```

并不相同。

`ps` 更关注：

> **系统中的进程。**

因此：

```text
jobs
 ↓
Shell 的 Job

ps
 ↓
系统中的 Process
```

---

### fg：将任务切换到前台

假设：

```bash
sleep 100 &
```

当前 Job 为：

```text
[1]+  Running    sleep 100 &
```

执行：

```bash
fg %1
```

可以把 Job 1 切换到前台：

```text
Background
    │
    │ fg %1
    ▼
Foreground
```

其中：

```text
%1
```

表示：

> Job ID 为 1 的任务。

所以：

```text
%1
↓
Job ID

12345
↓
PID
```

---

### bg：在后台恢复任务

如果任务被：

```text
Ctrl + Z
```

暂停：

```text
[1]+  Stopped    sleep 100
```

那么可以：

```bash
bg %1
```

让它继续在后台运行：

```text
Stopped
   │
   │ bg %1
   ▼
Running / Background
```

因此最经典的 Job Control 流程就是：

```text
          sleep 100
              │
              │ Ctrl+Z
              ▼
           Stopped
              │
              │ bg %1
              ▼
      Running / Background
              │
              │ fg %1
              ▼
      Running / Foreground
              │
              │ Ctrl+C
              ▼
          Terminated
```

---

### Ctrl+D：EOF

另一个非常常见的快捷键：

```text
Ctrl + D
```

通常表示：

> **输入结束（EOF，End Of File）**

它与：

```text
Ctrl+C
```

完全不同。

```text
Ctrl+C
↓
SIGINT

Ctrl+D
↓
EOF
```

例如运行：

```bash
cat
```

然后输入：

```text
hello
```

`cat` 会把输入重新输出：

```text
hello
```

此时按：

```text
Ctrl + D
```

会让输入端结束，`cat` 读取到 EOF 后退出。

因此：

> `Ctrl+D` 更准确的理解是“输入结束”，而不是“退出程序”。

当 Bash 自己读取到 EOF 时，它也可能因此退出当前 Shell。

所以：

```text
Ctrl+D
↓
EOF
↓
程序根据 EOF 决定如何处理
```

---

# Bash 命令行编辑快捷键

除了控制任务，Bash 还提供大量用于编辑当前命令行的快捷键。

这些功能主要由：

> **GNU Readline**

提供。

参考：[Bash Readline](https://www.gnu.org/software/bash/manual/html_node/Readline.html)。

### Ctrl+A 与 Ctrl+E

```text
Ctrl + A
```

将光标移动到当前命令行开头。

```text
Ctrl + E
```

将光标移动到当前命令行末尾。

例如：

```text
sudo systemctl restart nginx
```

如果光标位于中间：

```text
sudo systemctl| restart nginx
```

按：

```text
Ctrl+A
```

得到：

```text
|sudo systemctl restart nginx
```

按：

```text
Ctrl+E
```

则移动到：

```text
sudo systemctl restart nginx|
```

---

### Ctrl+W

```text
Ctrl + W
```

通常删除光标前的一个单词。

例如：

```text
$ echo hello world|
```

按：

```text
Ctrl + W
```

可能变成：

```text
$ echo hello |
```

---

### Ctrl+U

```text
Ctrl + U
```

删除光标前的内容。

例如：

```text
$ echo hello world|
```

按下后可能变成：

```text
|
```

---

### Ctrl+K

```text
Ctrl + K
```

删除光标后的内容。

例如：

```text
$ echo hello| world
```

按下后：

```text
$ echo hello|
```

---

### Ctrl+L

```text
Ctrl + L
```

通常用于清理当前终端显示区域。

它影响的是：

> **终端显示**

而不是：

```text
命令历史
文件内容
后台进程
```

之前执行过的命令仍然可以通过：

```text
↑
```

等方式查看。

---

### 常见快捷键

| 快捷键 | 常见作用 |
|---|---|
| `Ctrl+C` | 产生 `SIGINT`，通常中断前台任务 |
| `Ctrl+Z` | 产生 `SIGTSTP`，通常暂停前台任务 |
| `Ctrl+D` | 输入 EOF |
| `Ctrl+L` | 清理终端显示 |
| `Ctrl+A` | 光标移动到命令行开头 |
| `Ctrl+E` | 光标移动到命令行末尾 |
| `Ctrl+W` | 删除光标前的一个单词 |
| `Ctrl+U` | 删除光标前内容 |
| `Ctrl+K` | 删除光标后内容 |
| `↑ / ↓` | 浏览历史命令 |

更重要的是理解这些快捷键属于不同层次：

```text
Ctrl+C / Ctrl+Z
↓
任务控制

Ctrl+D
↓
输入结束

Ctrl+A / Ctrl+E / Ctrl+W / Ctrl+U / Ctrl+K
↓
命令行编辑

Ctrl+L
↓
终端显示
```

---

# 前台进程组

前面一直使用：

> 当前前台任务

这种说法。

更准确地说，终端存在：

> **Foreground Process Group（前台进程组）**

一个 Job 不一定只包含一个进程。

例如：

```bash
producer | consumer
```

可能涉及：

```text
Job
 │
 ├── producer
 │
 └── consumer
```

这些进程可以作为一个前台作业与终端进行交互。

因此按：

```text
Ctrl+C
```

时，并不是简单地：

```text
找到一个 PID
 ↓
发送 SIGINT
```

而是由终端针对当前前台进程组产生相应的控制信号。

可以简化表示：

```text
Terminal
   │
   │ Ctrl+C
   ▼
Foreground Process Group
   │
   ├── Process A
   ├── Process B
   └── Process C
```

这也是为什么管道中的多个进程能够整体响应：

```text
Ctrl+C
```

---

# 交互式与非交互式 Shell

### 交互式 Shell

我们平时打开终端：

```text
Terminal
   ↓
Bash
   ↓
Interactive Shell
```

然后不断输入：

```text
$ pwd
$ ls
$ cd /var/log
$ cat app.log
```

这种人与 Shell 直接交互的环境就是：

> **交互式 Shell**

---

### 非交互式 Shell

执行：

```bash
bash script.sh
```

Bash 可以按照脚本内容自动执行：

```text
script.sh
   │
   ▼
  Bash
   │
   ├── 命令 1
   ├── 命令 2
   └── 命令 3
```

这属于：

> **非交互式 Shell**

在：

```text
Shell Script
cron
systemd
CI/CD
```

等场景中都非常常见。

因此：

```text
Interactive Shell
↓
人与 Shell 交互

Non-interactive Shell
↓
脚本 / 系统驱动 Shell
```

---

# Bash 启动文件

Bash 启动时会根据当前 Shell 的类型和启动方式，决定读取哪些初始化文件。

常见文件包括：

```text
/etc/profile
~/.bash_profile
~/.bashrc
~/.profile
```

### `.bashrc`

通常用于：

> **交互式非登录 Bash 的初始化**

例如：

```bash
alias ll='ls -lah'
export EDITOR=vim
```

---

### `.bash_profile`

通常用于：

> **登录 Shell 的初始化**

很多系统会在其中进一步加载：

```text
~/.bashrc
```

例如：

```bash
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
```

不同发行版和系统配置可能有所差异，因此不应该把某一种默认加载关系当成所有 Linux 系统的绝对规则。

详细规则可以参考 [Bash Startup Files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)。

---

# 一个完整的命令执行模型

把前面的内容串起来，一条简单的命令可以理解为：

```text
                         用户
                          │
                          │ 输入
                          ▼
                 ┌────────────────┐
                 │    Terminal    │
                 └───────┬────────┘
                         │
                         │ PTY
                         ▼
                 ┌────────────────┐
                 │      Bash      │
                 │     Shell      │
                 └───────┬────────┘
                         │
                     Shell 解析
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
        Builtin      PATH 查找     Shell 语法
           │             │             │
           │             ▼             │
           │       External Command    │
           │             │             │
           └─────────────┼─────────────┘
                         ▼
                      Process
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           stdin       stdout     stderr
              │          │          │
              └──────────┼──────────┘
                         ▼
                     Terminal
```

如果存在管道：

```text
Command A
    │
    │ stdout
    ▼
   Pipe
    │
    │ stdin
    ▼
Command B
```

如果存在重定向：

```text
Command
   │
   │ stdout
   ▼
 File
```

如果存在命令替换：

```text
$(command)
     │
     ▼
执行 command
     │
     ▼
将输出替换回来
```

如果存在后台任务：

```text
Shell
 │
 ├──────► Job
 │          │
 │          └── Background
 │
 ▼
继续接受用户输入
```

如果存在前后台切换：

```text
Foreground
    │
 Ctrl+Z
    ▼
 Stopped
    │
   bg
    ▼
Background
    │
   fg
    ▼
Foreground
```

因此 Shell 实际上是在组织：

```text
用户输入
   ↓
命令解析
   ↓
命令查找
   ↓
进程创建
   ↓
文件描述符
   ↓
管道 / 重定向
   ↓
前台 / 后台
   ↓
Job Control
```

这也是 Linux 命令行强大的核心原因之一。

---

# 一个完整的例子

假设执行：

```bash
grep "ERROR" /var/log/app.log | wc -l > error-count.txt
```

这条命令同时涉及：

```text
外部命令
管道
stdin
stdout
输出重定向
```

可以拆成：

```text
grep "ERROR" /var/log/app.log
             │
             │ stdout
             ▼
           Pipe
             │
             │ stdin
             ▼
          wc -l
             │
             │ stdout
             ▼
       error-count.txt
```

完整过程：

```text
app.log
   │
   ▼
 grep
   │
   │ 筛选 ERROR
   ▼
 stdout
   │
   ▼
 Pipe
   │
   ▼
 stdin
   │
   ▼
 wc -l
   │
   │ 统计数量
   ▼
 stdout
   │
   ▼
error-count.txt
```

这里：

```text
grep
↓
外部命令

wc
↓
外部命令

|
↓
Shell 管道

>
↓
Shell 重定向
```

这就是 Linux 命令行非常典型的“组合工具”思想：

> 每个工具负责一个相对明确的任务，再通过 Shell 的组合能力完成更复杂的操作。

---

# Linux 命令行的整体结构

到这里，可以把 Linux 命令行理解成几个相互联系的部分：

```text
Linux 命令行
│
├── Terminal
│
├── Shell
│   └── Bash
│
├── Shell 语法
│   ├── 变量
│   ├── 管道
│   ├── 重定向
│   ├── 命令替换
│   └── 作业控制
│
├── 命令
│   ├── Builtin
│   └── External Command
│
├── Shell 环境
│   ├── PATH
│   ├── Environment Variables
│   └── Startup Files
│
├── Terminal Control
│   ├── Ctrl+C
│   ├── Ctrl+Z
│   ├── Ctrl+D
│   └── Readline
│
└── Linux Kernel
    ├── Process
    ├── File
    ├── Memory
    ├── Network
    └── Device
```

可以进一步浓缩成：

```text
Terminal
   ↓
Shell
   ↓
解析命令
   ↓
Builtin / External Command
   ↓
Process
   ↓
stdin / stdout / stderr
   ↓
Pipe / Redirection
   ↓
Foreground / Background
   ↓
Job Control
```

理解这条链路之后，后续学习 Linux 就会有一个比较稳定的框架：

```text
Linux 基础
│
├── 终端与 Shell
├── 目录与路径
├── 文件与目录管理
├── 文件查看与文本搜索
├── 文本处理
├── 用户与权限
├── 进程
├── systemd
├── 存储
└── 网络
```

其中：

```text
终端与 Shell
```

主要解决：

> **用户如何通过命令行与 Linux 系统交互。**

后面的文件、权限、进程、网络等专题，则是在这个入口之上进一步理解 Linux 的不同子系统。

---

## 外部参考

- [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/)
- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
- [Linux man-pages](https://man7.org/linux/man-pages/)
