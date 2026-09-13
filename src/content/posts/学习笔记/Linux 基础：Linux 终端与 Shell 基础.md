---
title: Linux 基础：Linux 终端与 Shell 基础
published: 2026-09-13
image: ''
tags: [Linux, Shell, Bash, 终端, 运维]
category: 学习笔记
---

> Linux 的日常管理工作大多从命令行开始，而理解命令行，首先需要理解 **Terminal、Shell 和 Bash** 分别是什么。
>
> 本文从终端和 Shell 的基本概念出发，介绍 Bash、命令执行流程、内建命令与外部命令、`PATH`、环境变量、标准输入输出、管道、重定向以及 Shell 与进程之间的关系，为后续学习 Linux 命令、Shell 脚本和系统运维打下基础。

## 终端与 Shell

### 什么是终端

我们平时打开的“终端窗口”，通常是一个**终端模拟器（Terminal Emulator）**。

例如：

```text
GNOME Terminal
Konsole
xterm
Windows Terminal
```

它主要负责提供一个文本输入输出环境，让用户能够与命令行程序进行交互。

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

> **Terminal 本身通常不负责解释和执行 Linux 命令。**

例如输入：

```bash
ls
```

终端负责接收键盘输入并把字符传递给 Shell，然后再把程序输出显示出来。

### TTY 与 PTY

在 Linux / Unix 中，终端还涉及：

- TTY（Teletype）
- PTY（Pseudo Terminal，伪终端）

现代桌面 Linux 中，终端模拟器通常通过伪终端与 Shell 连接。

简化来看：

```text
┌──────────────────┐
│ Terminal Emulator│
└────────┬─────────┘
         │
        PTY
         │
         ▼
      ┌──────┐
      │ Bash │
      └──────┘
```

因此我们看到的“终端窗口”实际上只是整个命令行环境中的一部分。

---

## 什么是 Shell

Shell 是：

> **命令解释器（Command Interpreter）**

它负责读取用户输入，对命令进行解析，然后执行相应操作。

例如：

```bash
ls -lah /var/log
```

Shell 需要理解：

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

同时还可能处理：

```text
变量展开
命令替换
通配符展开
输入输出重定向
管道
后台任务
条件与循环
```

因此 Shell 并不是简单的：

```text
输入一行
    ↓
执行一行
```

而是拥有自己完整的语法和执行模型。

可以把它理解为：

```text
用户输入
   │
   ▼
Shell
   │
   ├── 解析语法
   ├── 展开变量
   ├── 查找命令
   ├── 设置输入输出
   ├── 创建管道
   └── 启动程序
          │
          ▼
        进程
```

---

## 常见 Shell

Shell 并不是某一个具体软件，而是一类程序。

常见实现包括：

| Shell | 说明 |
|---|---|
| `sh` | Unix Shell 的经典名称 |
| `bash` | GNU/Linux 中最常见的 Shell 之一 |
| `zsh` | 功能丰富，交互体验较好 |
| `fish` | 强调交互体验和易用性 |

因此：

```text
Shell
  │
  ├── bash
  ├── zsh
  ├── fish
  └── 其他实现
```

这里需要区分：

> **Shell 是概念，Bash 是具体实现。**

---

# Bash

## Bash 是什么

Bash 全称：

> **Bourne Again SHell**

它由 GNU 项目维护，是 Linux 环境中非常常见的 Shell。

可以把 Bash 看成连接用户与 Linux 系统的重要中间层：

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
 ├── 管理环境
 ├── 管理作业
 └── 启动程序
 │
 ▼
Linux Kernel
```

Bash 不负责直接管理硬盘、内存、CPU 等底层资源。

这些工作主要由：

> **Linux Kernel**

完成。

Bash 更重要的职责是：

> **把用户输入转化为对系统和程序的操作。**

[Bash Reference Manual](https://www.gnu.org/software/bash/manual/) 对 Bash 的语法、内建命令、作业控制等功能进行了完整说明。

---

## Bash 不等于 Linux

很多刚开始学习 Linux 的人容易把：

```text
Linux
Bash
Terminal
```

混为一谈。

实际上：

| 名称 | 本质 |
|---|---|
| Linux | 操作系统内核 |
| Bash | Shell |
| Terminal | 终端模拟器 / 终端接口 |
| `ls` | 外部命令程序 |
| `cd` | Bash 内建命令 |

它们之间的关系可以表示为：

```text
                Linux
                 │
          ┌──────┴──────┐
          │             │
       Kernel         用户空间
                        │
                        ▼
                      Bash
                        │
               ┌────────┴────────┐
               │                 │
           Builtin          External Command
               │                 │
               └────────┬────────┘
                        ▼
                       Kernel
```

---

# Terminal、Shell 与进程

## 三者的关系

这三个概念可以先用一个简单模型理解：

```text
┌────────────────────┐
│ Terminal Emulator  │
└─────────┬──────────┘
          │
          │ PTY
          ▼
┌────────────────────┐
│       Shell        │
│       Bash         │
└─────────┬──────────┘
          │
          │ 创建 / 执行
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

可以粗略理解为：

```text
键盘
 ↓
Terminal
 ↓
Bash
 ↓
解析 ls
 ↓
找到 ls 程序
 ↓
启动进程
 ↓
程序访问文件系统
 ↓
产生输出
 ↓
Terminal 显示
```

因此：

> Terminal 负责“交流”，Shell 负责“解释”，进程负责“执行”。

---

# Shell 如何执行命令

## 一条命令由什么组成

最简单的形式：

```text
command [options] [arguments]
```

例如：

```bash
ls -l /var/log
```

可以理解为：

```text
ls
↓
要执行的命令

-l
↓
选项

/var/log
↓
参数
```

但不同命令的参数和选项含义由具体程序定义。

例如：

```bash
ls -l
```

中的 `-l` 和：

```bash
grep -n
```

中的 `-n`，都是由各自程序决定的。

因此：

> **Shell 负责解析命令行语法，具体命令负责解释自己的选项和参数。**

---

## Shell 的解析过程

以：

```bash
echo "Hello $USER"
```

为例。

Bash 会先对这条命令进行解析：

```text
输入命令
   │
   ▼
Shell 语法解析
   │
   ▼
引号处理
   │
   ▼
变量展开
   │
   ▼
确定命令与参数
   │
   ▼
执行
```

如果：

```text
USER=alice
```

那么最终执行时，参数中会得到：

```text
Hello alice
```

因此 Shell 实际上包含了一套完整的语言机制。

---

# 内建命令与外部命令

## 外部命令

外部命令通常是一个独立的可执行程序。

例如：

```text
ls
cp
mv
grep
cat
```

在系统中通常能够找到类似：

```text
/usr/bin/ls
/usr/bin/cp
/usr/bin/grep
```

执行：

```bash
ls
```

时，Shell 会找到对应程序，然后请求系统启动它。

可以理解为：

```text
Bash
 │
 ▼
找到 /usr/bin/ls
 │
 ▼
启动 ls 进程
 │
 ▼
Linux Kernel
```

---

## Shell 内建命令

有些命令并不是独立程序，而是直接由 Shell 自己实现。

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

这些称为：

> **Shell Builtin**

最经典的例子是：

```bash
cd /var/log
```

为什么 `cd` 需要是 Shell 内建命令？

因为 `cd` 改变的是：

> **当前 Shell 进程自己的工作目录。**

假设 `cd` 是一个独立程序：

```text
Bash
 │
 └── cd
      │
      └── 修改自己的工作目录
```

那么 `cd` 结束以后，父 Shell 的工作目录并没有改变。

所以：

```text
cd
 ↓
必须修改当前 Shell
 ↓
因此由 Shell 自己实现
```

同理：

```text
export
jobs
fg
bg
```

等命令也需要直接操作当前 Shell 的状态。

:::tip
看到一个命令时，不要默认它一定对应 `/usr/bin/xxx`。

在 Shell 中，命令可能是：

```text
Alias
Builtin
Function
External Command
```

`type` 是一个非常方便的判断工具。
:::

---

## 判断命令类型

例如：

```bash
type cd
```

可能得到：

```text
cd is a shell builtin
```

查看：

```bash
type ls
```

可能得到：

```text
ls is /usr/bin/ls
```

使用：

```bash
type -a ls
```

可以查看多个可能来源。

也可以：

```bash
command -v ls
```

从 Shell 的命令查找角度来看，这通常比简单使用 `which` 更合适。

参考：

[Bash Builtin Commands](https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html)

---

# PATH 与命令查找

## 什么是 PATH

执行：

```bash
ls
```

时，为什么不需要写：

```bash
/usr/bin/ls
```

因为 Shell 会利用：

> **PATH 环境变量**

查看：

```bash
echo $PATH
```

例如：

```text
/usr/local/bin:/usr/bin:/bin
```

这里：

```text
:
```

用于分隔多个目录。

可以理解成：

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

Shell 会按照命令查找规则在这些位置寻找对应程序。

---

## PATH 的实际意义

假设：

```text
/usr/local/bin/mytool
```

存在。

如果：

```text
/usr/local/bin
```

位于 `PATH` 中：

```bash
mytool
```

就可以直接执行。

如果不在：

```text
/usr/local/bin
```

则可能需要使用完整路径：

```bash
/usr/local/bin/mytool
```

因此：

> `PATH` 本质上是 Shell 用于查找可执行命令的重要环境变量。

---

## PATH 的顺序

假设系统中同时存在：

```text
/usr/bin/tool
/usr/local/bin/tool
```

而：

```text
PATH=/usr/bin:/usr/local/bin
```

那么 `/usr/bin` 出现在前面，会影响命令查找结果。

因此修改 PATH 时不仅要关注：

```text
有哪些目录
```

还要关注：

```text
目录的顺序
```

这也是多个软件版本共存时经常遇到的问题。

---

# Shell 环境变量

## 什么是变量

Shell 中可以定义变量：

```bash
name=Alice
```

读取：

```bash
echo $name
```

这里：

```text
$name
```

表示读取变量 `name` 的值。

注意：

```bash
name=Alice
```

等号两边通常不能有空格。

正确：

```bash
name=Alice
```

错误：

```bash
name = Alice
```

---

## 常见环境变量

Linux Shell 中经常会看到：

| 变量 | 常见含义 |
|---|---|
| `USER` | 当前用户 |
| `HOME` | 用户家目录 |
| `PATH` | 可执行文件搜索路径 |
| `SHELL` | 当前用户默认 Shell |
| `PWD` | 当前工作目录 |
| `OLDPWD` | 上一个工作目录 |
| `LANG` | 当前语言环境 |

例如：

```bash
echo $HOME
```

可能输出：

```text
/home/user
```

---

## Shell 变量与环境变量

需要区分：

> **Shell Variable**

和：

> **Environment Variable**

例如：

```bash
name=Alice
```

只是当前 Shell 中的变量。

如果：

```bash
export name
```

那么它会成为环境变量，并能够被当前 Shell 创建的子进程继承。

关系可以理解为：

```text
Shell Variable
      │
    export
      ↓
Environment Variable
      │
      ↓
   子进程继承
```

例如：

```bash
export APP_ENV=production
bash
echo $APP_ENV
```

通常可以看到：

```text
production
```

---

## 父 Shell 与子 Shell

Shell 本身也是进程。

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

环境变量通常由父进程传递给子进程：

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

但是普通 Shell 变量不会自动成为子进程的环境变量。

例如：

```bash
NAME=Alice
bash
echo $NAME
```

子 Bash 通常无法直接读取这个未导出的变量。

而：

```bash
export NAME=Alice
bash
echo $NAME
```

就可以正常继承。

---

# 当前工作目录

每个进程都有自己的：

> **Current Working Directory**

可以使用：

```bash
pwd
```

查看当前 Shell 的工作目录。

例如：

```text
$ pwd
/home/user
```

然后：

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

可以理解为：

```text
Bash
 │
 └── Current Working Directory
             ↓
          /var/log
```

---

## 为什么 `cd` 必须修改当前 Shell

这也可以再次解释：

```bash
cd /var/log
```

必须改变：

> **当前 Shell 本身的工作目录。**

如果 `cd` 是独立进程：

```text
Bash
 │
 └── cd
      │
      └── 修改 cd 自己的 cwd
```

当 `cd` 结束：

```text
Bash
```

还是原来的工作目录。

所以：

```text
cd
 ↓
修改当前 Shell 状态
 ↓
Shell Builtin
```

这是理解 Shell 内建命令最经典的例子。

---

# 标准输入、标准输出与标准错误

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
          │      │       │
          ▼      ▼       ▼
        输入    正常输出  错误输出
```

在交互式环境中，默认通常可以理解为：

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

## 为什么要区分 stdout 和 stderr

假设程序同时产生：

```text
正常输出
错误信息
正常输出
错误信息
```

如果两者完全混合，后续就很难处理。

因此程序通常会分别输出：

```text
stdout
 ↓
正常结果

stderr
 ↓
错误 / 诊断信息
```

这使得 Shell 可以进一步决定：

```text
stdout → 文件
stderr → 终端
```

或者：

```text
stdout → 文件
stderr → 文件
```

这就是 Shell 重定向机制的基础。

---

# 文件描述符

文件描述符（File Descriptor）可以理解为：

> **进程用于引用已打开 I/O 对象的整数。**

最常见：

```text
0 → stdin
1 → stdout
2 → stderr
```

但进程当然可以拥有更多文件描述符：

```text
0   stdin
1   stdout
2   stderr
3   普通文件
4   Socket
5   Pipe
...
```

因此 Linux 中的文件描述符并不只是用于普通文件，也广泛用于：

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
网络编程
日志
```

的重要基础。

---

# 管道

## 什么是管道

Shell 使用：

```text
|
```

连接两个命令。

例如：

```bash
ps -ef | grep java
```

含义是：

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

因此：

> **管道的核心不是“把两个命令连接起来”，而是把前一个命令的标准输出连接到后一个命令的标准输入。**

---

## 管道的意义

Unix/Linux 很强调：

> **让程序负责单一任务，再通过组合完成复杂操作。**

例如：

```bash
ps -ef
```

负责：

> 获取进程信息。

而：

```bash
grep java
```

负责：

> 筛选包含 `java` 的文本。

组合之后：

```bash
ps -ef | grep java
```

就可以得到：

```text
进程列表
   ↓
文本筛选
   ↓
Java 相关进程
```

这也是 Linux 命令行非常强大的原因之一。

参考：[Bash Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)

---

# 重定向

## 输出重定向

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

可以把输出重定向到文件：

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

如果目标文件已经存在：

```text
>
 ↓
覆盖原有内容
```

---

## 追加重定向

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

因此：

| 语法 | 含义 |
|---|---|
| `>` | 覆盖写入 |
| `>>` | 追加写入 |

---

## 输入重定向

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

## 标准错误重定向

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

正常输出 `stdout` 仍然保持原来的去向。

---

## 合并 stdout 与 stderr

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

所以最终：

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

这是理解 Shell 重定向时非常重要的细节。

具体语法可以参考 [Bash Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)。

---

# 命令替换

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

然后把输出替换到：

```text
$(date)
```

所在位置。

整个过程：

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

就可以把当前日期和时间嵌入字符串。

旧式写法：

```bash
echo "`date`"
```

现代 Bash 更推荐：

```bash
echo "$(date)"
```

因为：

```text
$(...)
```

更容易阅读和嵌套。

参考：[Bash Command Substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html)

---

# Shell 作业与进程

## 前台执行

最简单的命令：

```bash
sleep 10
```

执行之后，当前 Shell 会等待这个命令完成。

可以理解为：

```text
Shell
  │
  ▼
Process
  │
  │ 运行
  │
  ▼
Process 结束
  │
  ▼
Shell 返回提示符
```

---

## 后台执行

命令末尾加上：

```text
&
```

例如：

```bash
sleep 100 &
```

此时：

```text
Shell
  │
  ├──────► Background Job
  │
  ▼
立即返回提示符
```

可以继续执行其他命令。

查看当前 Shell 管理的任务：

```bash
jobs
```

例如：

```text
[1]+  Running    sleep 100 &
```

这里：

```text
[1]
```

是 Job ID。

---

# Job 与 Process

这两个概念不能简单等同。

## Process

Process 是 Linux 内核管理的执行实体。

每个进程通常有：

```text
PID
```

例如：

```text
PID = 12345
```

## Job

Job 是：

> **Shell 为用户启动的任务提供的管理概念。**

例如：

```text
[1] sleep 100
[2] vim test.txt
```

这里：

```text
1
2
```

是 Job ID。

因此：

```text
Job ID
 ↓
Shell 任务编号

PID
 ↓
Linux 进程编号
```

一个 Job 还可以对应多个进程。

例如：

```bash
producer | consumer
```

这里至少涉及多个执行实体，但从 Shell 的角度可以作为一个作业进行管理。

所以：

> **Job 是 Shell 的管理概念，Process 是操作系统的执行概念。**

后续的《Linux 基础：终端快捷键与 Shell 作业控制》会进一步展开：

```text
jobs
fg
bg
&
Ctrl + C
Ctrl + Z
SIGINT
SIGTSTP
SIGHUP
nohup
```

---

# 交互式 Shell 与非交互式 Shell

## 交互式 Shell

我们平时打开终端：

```text
Terminal
   ↓
Bash
   ↓
Interactive Shell
```

用户不断输入：

```text
$ pwd
$ ls
$ cd /var/log
$ cat app.log
```

这里人与 Shell 直接交互。

---

## 非交互式 Shell

执行脚本：

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

这就是：

> **非交互式 Shell**

它在：

```text
Shell Script
cron
systemd
CI/CD
```

等场景中非常常见。

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

Bash 启动时是否读取某个配置文件，与它是：

```text
Login Shell
Interactive Shell
```

中的哪一种有关。

常见文件包括：

```text
~/.bashrc
~/.bash_profile
~/.profile
/etc/profile
```

## `.bashrc`

通常用于：

> **交互式非登录 Bash 的配置。**

例如：

```bash
alias ll='ls -lah'
export EDITOR=vim
```

## `.bash_profile`

通常用于：

> **登录 Shell 的初始化。**

很多系统会进一步加载：

```text
~/.bashrc
```

因此可能看到：

```bash
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
```

需要注意，不同发行版和系统配置可能有所区别，因此不应该把某一种默认加载关系视为所有 Linux 系统都完全一致。

具体规则可以参考 [Bash Startup Files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)。

---

# Shell 的完整工作模型

把前面的知识串起来，一个典型的交互式命令可以理解为：

```text
                         用户
                          │
                          │ 输入命令
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
                  解析与处理命令
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
        Shell Builtin          External Command
             │                       │
             │                       ▼
             │                   PATH 查找
             │                       │
             │                       ▼
             │                    可执行文件
             │                       │
             └───────────┬───────────┘
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

如果加入管道：

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

如果加入重定向：

```text
Command
   │
   │ stdout
   ▼
 File
```

于是 Shell 实际上承担了一个非常重要的职责：

> **把用户输入的文本组织成进程、文件描述符、管道和环境之间的关系。**

---

# 一个完整的例子

假设执行：

```bash
grep "ERROR" /var/log/app.log | wc -l > error-count.txt
```

这条命令同时使用了：

```text
外部命令
管道
标准输入输出
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

整体过程：

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

这就是 Linux 命令行“组合工具”的典型体现。

---

# Linux 命令行整体结构

到这里，可以把 Linux 命令行理解成几个相互连接的部分：

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
├── 环境
│   ├── PATH
│   ├── Environment Variables
│   └── Startup Files
│
└── Linux Kernel
    ├── Process
    ├── File
    ├── Memory
    ├── Network
    └── Device
```

从这个基础继续向后，就可以自然进入：

```text
Linux 基础
   │
   ├── 终端与 Shell
   ├── 终端快捷键与作业控制
   ├── 目录与文件
   ├── 用户与权限
   ├── 进程
   ├── 服务
   ├── 存储
   └── 网络
```

也就是说，Shell 并不是 Linux 中孤立的一部分，而是连接：

```text
用户
 ↓
命令
 ↓
系统资源
```

的重要入口。

## 外部参考

- [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/)
- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
- [Linux man-pages](https://man7.org/linux/man-pages/)