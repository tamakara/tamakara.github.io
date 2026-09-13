---
title: Linux 基础：进程与作业管理
published: 2026-09-13T07:32:38Z
description: ''
image: ''
tags: [Linux, 进程, 线程, 信号, IPC, 系统管理]
category: 学习笔记
draft: false 
lang: ''
---

> Linux 中运行的每一个服务、命令和程序，本质上都离不开**进程（Process）**。理解进程之后，才能进一步理解线程、信号、进程间通信、后台服务以及各种常见的系统故障。
>
> 本文从进程的基本概念出发，逐步介绍进程生命周期、父子进程、进程状态、线程、进程组与 Session、信号机制、僵尸进程、进程优先级，以及常见的进程间通信（IPC）方式，并结合 `ps`、`top`、`pgrep`、`kill` 等工具建立完整的 Linux 进程管理认知。

## 什么是进程

### 进程的基本概念

进程（Process）可以简单理解为：

> **正在运行中的程序实例。**

例如磁盘上的：

```text
/usr/bin/nginx
/usr/bin/bash
/usr/bin/python
```

它们只是程序文件。

当其中某个程序被启动之后，操作系统会为它建立运行所需的执行环境，此时才形成一个进程。

可以简单理解成：

```text
程序文件
   │
   │ 启动
   ▼
进程
   │
   ├── 代码
   ├── 数据
   ├── 虚拟地址空间
   ├── 文件描述符
   ├── 当前工作目录
   ├── 用户 / 组身份
   ├── 环境变量
   └── 调度相关信息
```

所以：

```text
Program
    ↓
静态的程序文件

Process
    ↓
正在运行的程序实例
```

同一个程序可以同时拥有多个进程。

例如执行：

```bash
sleep 100 &
sleep 100 &
sleep 100 &
```

磁盘上的 `sleep` 可能只有一个程序文件，但系统中可以同时存在三个独立的 `sleep` 进程。

---

### PID：进程的身份标识

Linux 使用：

> **PID（Process ID）**

标识进程。

例如：

```text
PID
├── 1024
├── 2048
└── 3150
```

可以通过：

```bash
ps
```

或者：

```bash
ps aux
```

查看进程。

还可以：

```bash
echo $$
```

查看当前 Shell 的 PID。

例如：

```text
$ echo $$
18320
```

这里：

```text
18320
```

就是当前 Bash 进程的 PID。

`ps` 本质上用于查看某一时刻的进程状态，而 `top` 更适合持续观察进程变化。[`ps(1)`](https://man7.org/linux/man-pages/man1/ps.1.html) 对这些信息和状态字段有完整说明。

---

### PPID：父进程

进程通常不是凭空出现的。

一个进程往往由另一个进程创建，因此还存在：

> **PPID（Parent Process ID）**

例如：

```text
Bash
 │
 ├── ls
 ├── grep
 └── python
```

可以理解为：

```text
bash
 ├── ls
 ├── grep
 └── python
```

假设：

```text
bash PID = 1000
ls   PID = 1200
```

那么：

```text
ls PID  = 1200
ls PPID = 1000
```

也就是说：

```text
PID
↓
我是谁

PPID
↓
谁创建了我
```

可以使用：

```bash
ps -o pid,ppid,cmd
```

查看：

```text
  PID  PPID CMD
 1000   900 bash
 1200  1000 ls
```

---

## 进程的生命周期

### 创建、执行与退出

一个进程从产生到消失，大致可以理解为：

```text
创建
 │
 ▼
运行
 │
 ├── 等待
 ├── 被调度
 ├── 被暂停
 └── 继续运行
 │
 ▼
退出
 │
 ▼
父进程回收
 │
 ▼
进程彻底消失
```

Linux 中比较重要的一组机制是：

```text
fork()
execve()
wait()
exit()
```

它们分别对应进程创建、程序替换、子进程回收以及进程退出等过程。

---

### fork：创建子进程

`fork()` 用于创建新的进程。

典型关系：

```text
Parent Process
      │
      │ fork()
      ▼
Child Process
```

调用 `fork()` 后，父进程和子进程拥有各自的进程执行环境。

在 Linux 中，`fork()` 使用 Copy-on-Write（写时复制）机制，因此并不是简单地把整个进程的内存立即完整复制一份。[`fork(2)`](https://man7.org/linux/man-pages/man2/fork.2.html) 对此有详细说明。

可以理解为：

```text
父进程

┌───────────────┐
│ 虚拟地址空间  │
└───────────────┘
        │
        │ fork
        ▼
┌───────────────┐
│ 子进程        │
└───────────────┘
```

开始时很多内存页面可以共享。

当其中一个进程需要修改页面时，内核再进行实际复制。

---

### exec：执行另一个程序

`fork()` 只是创建一个新的进程，并不会自动把它变成另一个程序。

例如：

```text
Bash
 │
 │ fork()
 ▼
Child Process
 │
 │ exec()
 ▼
ls
```

`execve()` 等 exec 系列接口的核心作用是：

> **用新的程序映像替换当前进程。**

因此：

```text
fork
↓
产生子进程

exec
↓
让这个进程执行另一个程序
```

这也是 Shell 执行外部命令时非常重要的基础机制。

参考：[execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html)。

---

### wait：回收子进程

父进程还需要处理子进程退出后的状态。

例如：

```text
Parent
  │
  ├── fork()
  │
  ▼
Child
  │
  └── exit()
        │
        ▼
     退出状态
        │
        ▼
      wait()
        │
        ▼
     父进程获取结果
```

父进程通过 `wait()`、`waitpid()` 等接口等待并回收子进程。

这也是理解**僵尸进程**的关键。

---

## 进程状态

### 常见状态

Linux 进程并不是一直处于 Running。

常见状态包括：

| 状态 | 含义 |
|---|---|
| `R` | Running / Runnable，可运行 |
| `S` | Interruptible Sleep，可中断睡眠 |
| `D` | Uninterruptible Sleep，通常与 I/O 等待有关 |
| `T` | Stopped，被停止 |
| `t` | Tracing Stop，被调试器等机制停止 |
| `Z` | Zombie，僵尸进程 |
| `I` | Idle，通常用于空闲内核线程 |

这些状态可以通过 `ps` 查看。[`ps(1)`](https://man7.org/linux/man-pages/man1/ps.1.html) 和 `/proc/<pid>/status` 都提供相关状态信息。

例如：

```bash
ps -eo pid,ppid,stat,cmd
```

可能得到：

```text
 PID  PPID STAT CMD
1000   900 S    bash
1200  1000 R    python
1300  1000 Z    worker
```

---

### R：Running / Runnable

`R` 不一定意味着：

> “此时此刻正在 CPU 上执行”。

它还可能表示：

> **已经准备好运行，正在等待 CPU 调度。**

所以更准确的理解是：

```text
R
↓
Running / Runnable
```

---

### S：可中断睡眠

`S` 表示进程正在等待某个事件。

例如：

```text
等待输入
等待定时器
等待某个条件
```

这是普通程序中非常常见的一种状态。

例如：

```bash
sleep 100
```

运行期间通常会处于睡眠状态。

---

### D：不可中断睡眠

`D` 经常与 I/O 等待有关。

例如：

```text
Process
   │
   ▼
等待磁盘 I/O
   │
   ▼
D
```

这个状态非常值得运维人员关注。

因为：

```text
CPU 看起来不高
```

并不代表进程正常。

如果大量进程长期处于：

```text
D
```

往往应该进一步检查：

```text
磁盘
存储设备
NFS
块设备
I/O 延迟
内核 / 驱动
```

---

### T：Stopped

进程可以被暂停。

例如：

```bash
sleep 100
```

运行后按：

```text
Ctrl + Z
```

前台任务通常会收到：

```text
SIGTSTP
```

随后进入：

```text
T
```

状态。

因此：

```text
Running
   │
   │ Ctrl+Z
   ▼
Stopped
```

这正是 Shell Job Control 与进程状态联系起来的地方。

---

### Z：Zombie

僵尸进程是 Linux 初学者非常容易产生误解的概念。

僵尸进程并不是：

> “还在运行但卡死的进程”。

而是：

> **进程已经结束，但父进程还没有读取其退出状态。**

过程大致是：

```text
Child
 │
 │ exit()
 ▼
结束执行
 │
 ▼
Zombie
 │
 │ wait()
 ▼
被父进程回收
 │
 ▼
消失
```

此时内核仍然保留少量信息，例如：

```text
PID
退出状态
资源使用信息
```

用于让父进程通过 `wait()` 获取结果。

官方 [`wait(2)`](https://man7.org/linux/man-pages/man2/wait.2.html) 对僵尸进程有明确说明。

---

### 如何排查僵尸进程

可以：

```bash
ps -eo pid,ppid,stat,cmd | grep ' Z'
```

找到：

```text
PID
PPID
```

之后重点查看它的父进程：

```bash
ps -fp <PPID>
```

因为：

> **僵尸进程本身已经退出，真正需要关注的通常是为什么父进程没有正确回收子进程。**

---

## 线程：Thread

### 为什么需要线程

一个进程不一定只有一个执行流。

例如：

```text
Process
 │
 ├── Thread 1
 ├── Thread 2
 └── Thread 3
```

这些线程属于同一个进程。

可以把：

```text
Process
```

理解成一个资源容器，而：

```text
Thread
```

更接近真正执行代码的单元。

POSIX 线程模型中，同一进程内的线程共享全局内存、堆、文件描述符等资源，但每个线程拥有自己的栈等线程私有状态。[`pthreads(7)`](https://man7.org/linux/man-pages/man7/pthreads.7.html)。

---

### 进程与线程的资源关系

可以简化成：

```text
Process
│
├── 虚拟地址空间
├── Heap
├── 全局变量
├── 文件描述符
├── 当前工作目录
│
├───────────────┐
│               │
▼               ▼
Thread 1      Thread 2
│               │
├── 寄存器      ├── 寄存器
├── 栈          ├── 栈
└── 执行状态    └── 执行状态
```

因此：

```text
进程之间
↓
资源隔离程度较高

线程之间
↓
资源共享更多
```

---

### 进程和线程的主要区别

| 对比 | Process | Thread |
|---|---|---|
| 地址空间 | 通常独立 | 同进程内共享 |
| Heap | 独立 | 共享 |
| 全局变量 | 独立 | 共享 |
| 文件描述符 | 各进程独立管理，但可通过继承等方式共享底层对象 | 同进程线程共享 |
| 栈 | 独立 | 每个线程独立 |
| 创建 / 切换成本 | 通常更高 | 通常更低 |
| 隔离性 | 更强 | 更弱 |
| 通信 | IPC | 共享内存 + 同步机制 |

注意：

> “线程一定比进程快”并不是一个绝对结论。

线程和进程的性能差异涉及创建、调度、缓存、内存、同步以及具体工作负载，实际系统中应以具体场景为准。

---

### PID、TID 与线程

Linux 中线程也有自己的线程标识。

在 `/proc` 中可以看到：

```text
/proc/<pid>/task/
```

下面可能存在：

```text
/proc/1000/task/1000/
/proc/1000/task/1001/
/proc/1000/task/1002/
```

可以理解为：

```text
进程 1000

├── TID 1000
├── TID 1001
└── TID 1002
```

也就是说，一个多线程进程内部可以存在多个线程 ID。

`/proc/<pid>/status` 还会提供 `Threads` 等字段，用于观察线程数量。

---

## 进程、进程组与 Session

这部分是理解 Linux Job Control 的关键。

### Process Group

多个相关进程可以组成：

> **Process Group（进程组）**

例如：

```bash
producer | consumer
```

可以形成：

```text
Process Group
│
├── producer
└── consumer
```

这样 Shell 可以把它们作为一个整体进行作业控制。

---

### Session

更上层还有：

> **Session（会话）**

可以粗略理解为：

```text
Session
│
├── Process Group A
│   ├── Process
│   └── Process
│
├── Process Group B
│   └── Process
│
└── Process Group C
```

终端通常会关联一个控制终端，而一个 Session 中可以存在多个 Job，其中最多只有一个前台 Job。

Linux man-pages 对 Process Group、Session、控制终端和 Foreground Process Group 有详细说明，可以参考 [Linux Programmer's Manual](https://man7.org/linux/man-pages/) 中关于 Session 与 Job Control 的内容。

---

### 为什么 Ctrl+C 能影响整个管道

例如：

```bash
producer | consumer
```

这并不是只有一个进程：

```text
Job
│
├── producer
└── consumer
```

它们可以处于同一个前台进程组。

因此：

```text
Terminal
   │
   │ Ctrl+C
   ▼
Foreground Process Group
   │
   ├── producer
   └── consumer
```

终端控制机制可以使前台进程组中的相关进程收到：

```text
SIGINT
```

这比简单理解成：

```text
Ctrl+C → 杀死某一个 PID
```

准确得多。

---

## 信号机制

### 什么是 Signal

Signal（信号）可以理解为：

> **Linux 用来向进程或线程通知某种异步事件的一种机制。**

例如：

```text
SIGINT
SIGTERM
SIGKILL
SIGSTOP
SIGCONT
SIGCHLD
SIGPIPE
SIGSEGV
```

信号的核心可以理解为：

```text
事件
 │
 ▼
Signal
 │
 ▼
目标进程 / 线程
 │
 ├── 默认处理
 ├── 忽略
 └── 自定义处理器
```

Linux 的 [`signal(7)`](https://man7.org/linux/man-pages/man7/signal.7.html) 对信号的产生、递送、阻塞、处理和标准信号 / 实时信号都有完整说明。

---

### 常见信号

| 信号 | 编号 | 常见含义 |
|---|---:|---|
| `SIGHUP` | 1 | 终端挂断等场景 |
| `SIGINT` | 2 | 中断，通常来自 `Ctrl+C` |
| `SIGQUIT` | 3 | 退出并通常产生 core dump |
| `SIGKILL` | 9 | 强制终止，不能捕获 / 忽略 |
| `SIGTERM` | 15 | 请求进程正常终止 |
| `SIGSTOP` | 19 | 强制停止，不能捕获 / 忽略 |
| `SIGCONT` | 18 | 继续执行 |
| `SIGTSTP` | 20 | 终端请求暂停，通常来自 `Ctrl+Z` |
| `SIGCHLD` | 与架构有关 | 子进程状态变化通知 |
| `SIGPIPE` | 13 | 向无读端的管道写入 |
| `SIGSEGV` | 11 | 非法内存访问 |
| `SIGUSR1` | 与架构有关 | 用户自定义信号 1 |
| `SIGUSR2` | 与架构有关 | 用户自定义信号 2 |

信号编号并不适合写死在跨平台程序中，因此程序设计时通常使用：

```text
SIGTERM
SIGKILL
SIGINT
```

这样的符号名称。

---

### SIGTERM：优雅终止

运维中非常重要的一个信号：

```text
SIGTERM
```

通常表示：

> **请求进程终止。**

例如：

```bash
kill -TERM 1234
```

或者：

```bash
kill 1234
```

默认情况下：

```bash
kill PID
```

发送的就是：

```text
SIGTERM
```

应用程序可以捕获 `SIGTERM`，然后进行：

```text
停止接收新请求
完成正在进行的任务
关闭文件
关闭 Socket
写入必要状态
释放资源
正常退出
```

因此：

> **服务停止时通常应该优先考虑 `SIGTERM`，而不是直接使用 `SIGKILL`。**

---

### SIGKILL：强制终止

```text
SIGKILL
```

无法被：

```text
捕获
阻塞
忽略
```

所以：

```bash
kill -9 1234
```

通常意味着：

> 直接让内核终止该进程。

这也是为什么：

```text
SIGTERM
```

与：

```text
SIGKILL
```

不能简单理解成：

```text
软停止
硬停止
```

更准确地说：

```text
SIGTERM
↓
请求程序自行退出

SIGKILL
↓
内核强制终止
```

因此：

> **不要把 `kill -9` 当成默认的进程停止方式。**

---

### SIGSTOP 与 SIGCONT

```text
SIGSTOP
```

会停止进程执行。

```text
SIGCONT
```

则用于恢复停止的进程。

可以理解为：

```text
Running
   │
   │ SIGSTOP
   ▼
Stopped
   │
   │ SIGCONT
   ▼
Running
```

这与：

```text
Ctrl+Z
```

产生的：

```text
SIGTSTP
```

并不完全相同。

`SIGSTOP` 无法被捕获或忽略，而 `SIGTSTP` 则属于终端生成的可处理停止信号。

---

### 信号默认动作

信号送达进程后，程序可能发生不同结果。

可以简单理解为：

```text
Signal
   │
   ▼
Signal Disposition
   │
   ├── Default
   ├── Ignore
   └── Handler
```

例如：

```text
SIGTERM
↓
默认通常终止进程
```

某些信号也可以由程序设置处理器。

例如：

```text
SIGTERM
   │
   ▼
自定义 Handler
   │
   ├── 清理资源
   ├── 保存状态
   └── exit
```

但：

```text
SIGKILL
SIGSTOP
```

不能被捕获、阻塞或忽略。

---

### 阻塞与 Pending Signal

信号并不一定在产生后立即被处理。

一个信号可能处于：

```text
Blocked
```

状态。

此时信号可以暂时保持：

```text
Pending
```

直到之后解除阻塞。

因此可以建立：

```text
Signal Generated
       │
       ▼
   Pending
       │
       │ 未被阻塞？
       ▼
   Delivery
       │
       ▼
Signal Handler / Default Action
```

Linux 还会区分进程级和线程级 pending signal。

这些信息可以在：

```text
/proc/<pid>/status
/proc/<pid>/task/<tid>/status
```

中观察，例如：

```text
SigPnd
ShdPnd
SigBlk
SigIgn
SigCgt
```

---

### 标准信号与实时信号

Linux 中除了普通标准信号，还存在：

> **Real-time Signals（实时信号）**

标准信号的一个重要特点是：

> **同一种标准信号如果已经处于 pending 状态，后续再次产生通常不会排成多个独立实例。**

而实时信号具有排队语义，并且还可以携带附加数据。

因此：

```text
标准信号
↓
简单通知

实时信号
↓
可排队
可携带更多信息
```

`signal(7)` 对两者的递送和排队语义有详细说明。

---

### SIGCHLD：子进程状态变化

父进程还经常需要关注：

```text
SIGCHLD
```

当子进程发生某些状态变化时，父进程可以收到该信号。

典型场景：

```text
Parent
  │
  └── Child
        │
        ▼
      exit()
        │
        ▼
     SIGCHLD
        │
        ▼
      wait()
```

这也是：

```text
Signal
+
Process Lifecycle
+
Zombie
```

三者联系起来的一个重要例子。

---

### SIGPIPE

假设：

```text
Producer ─── Pipe ───> Consumer
```

如果：

```text
Consumer
```

已经退出，而：

```text
Producer
```

继续向管道写数据，就可能产生：

```text
SIGPIPE
```

因此：

```text
管道
+
进程退出
+
信号
```

实际上是紧密联系在一起的。

---

## 如何发送信号

### kill

最常用的工具：

```bash
kill PID
```

默认发送：

```text
SIGTERM
```

指定信号：

```bash
kill -TERM 1234
```

或者：

```bash
kill -15 1234
```

强制终止：

```bash
kill -KILL 1234
```

也就是：

```bash
kill -9 1234
```

查看信号列表可以使用：

```bash
kill -l
```

---

### pkill

可以按照进程属性发送信号：

```bash
pkill nginx
```

例如：

```bash
pkill -TERM nginx
```

---

### pgrep

`pgrep` 用于按照名称等条件查找 PID：

```bash
pgrep nginx
```

例如：

```text
1024
1025
1026
```

于是常见排查流程可以形成：

```text
pgrep
  ↓
找到 PID
  ↓
ps / top
  ↓
确认进程状态
  ↓
kill
  ↓
发送信号
```

---

## 进程优先级与调度

### Nice 值

Linux 中普通进程可以使用：

> **nice value**

影响调度优先级。

可以查看：

```bash
ps -eo pid,ni,pri,cmd
```

其中：

```text
NI
↓
nice 值
```

通常：

```text
nice 值越低
↓
相对更高的调度优先级

nice 值越高
↓
相对更低的调度优先级
```

例如启动程序：

```bash
nice -n 10 command
```

运行后也可以使用：

```bash
renice
```

调整 nice 值：

```bash
renice 10 -p 1234
```

不过：

> nice 并不是简单的“CPU 占用限制”。

它是调度相关属性，实际效果还取决于调度策略、任务组、CPU 数量以及系统整体负载。

---

## 常见进程管理工具

### ps：查看进程快照

```bash
ps
```

常见：

```bash
ps aux
```

或者：

```bash
ps -ef
```

推荐在需要明确字段时使用：

```bash
ps -eo pid,ppid,user,stat,%cpu,%mem,cmd
```

这样可以快速查看：

```text
PID
PPID
USER
STAT
CPU
MEM
COMMAND
```

---

### top：动态观察进程

```bash
top
```

它与：

```bash
ps
```

最大的区别可以理解为：

```text
ps
↓
某一时刻的快照

top
↓
持续刷新
```

因此：

```text
CPU 飙高
内存上涨
Load 持续变化
进程状态变化
```

等问题通常适合使用 `top` 进行观察。

---

### pstree：查看进程树

```bash
pstree
```

例如：

```text
systemd
├─sshd
│ └─bash
│   ├─vim
│   └─python
└─nginx
   ├─nginx
   └─nginx
```

它更适合观察：

```text
父子进程关系
```

---

### /proc：观察进程内部信息

Linux 提供：

```text
/proc
```

伪文件系统，用于暴露大量内核和进程信息。

例如：

```bash
ls /proc/1234
```

常见内容包括：

```text
/proc/1234/status
/proc/1234/cmdline
/proc/1234/environ
/proc/1234/fd
/proc/1234/maps
```

其中：

```text
/proc/<pid>/status
```

非常适合查看：

```text
进程状态
PID
PPID
UID
GID
线程数量
信号状态
```

例如：

```bash
cat /proc/$$/status
```

这里：

```text
$$
```

代表当前 Shell 的 PID。

---

### /proc/<pid>/fd

例如：

```bash
ls -l /proc/1234/fd
```

可以看到该进程当前打开的文件描述符。

可能类似：

```text
0 -> /dev/pts/0
1 -> /var/log/app.log
2 -> /var/log/app-error.log
3 -> socket:[12345]
4 -> /tmp/test
```

这与前面的：

```text
stdin
stdout
stderr
File Descriptor
```

就联系起来了。

因此：

> **进程不仅仅是一个 PID，它还拥有一套完整的运行时资源。**

---

## 进程间通信 IPC

### 什么是 IPC

不同进程拥有相互隔离的地址空间。

因此：

```text
Process A
```

通常不能直接访问：

```text
Process B
```

的普通内存。

这时就需要：

> **IPC（Inter-Process Communication，进程间通信）**

常见方式包括：

```text
Pipe
FIFO
Signal
Shared Memory
Semaphore
Message Queue
Unix Domain Socket
Socket
```

可以建立如下整体认识：

```text
             IPC
              │
   ┌──────────┼──────────┐
   │          │          │
   ▼          ▼          ▼
 数据传输    同步控制    本机通信
   │          │          │
 Pipe       Semaphore   Unix Socket
 FIFO       Signal
 Shared
 Memory
 Message
 Queue
```

---

## Pipe：匿名管道

### 基本原理

管道提供一个单向的数据通道：

```text
Process A
   │
   │ write
   ▼
┌─────────┐
│  Pipe   │
└────┬────┘
     │
     │ read
     ▼
Process B
```

典型 Shell：

```bash
ps aux | grep nginx
```

本质上就是：

```text
ps
 │
 │ stdout
 ▼
Pipe
 │
 │ stdin
 ▼
grep
```

Linux 的 [`pipe(7)`](https://man7.org/linux/man-pages/man7/pipe.7.html) 将 Pipe 和 FIFO 都定义为用于进程间通信的通道。

---

### Pipe 的特点

匿名管道通常适合：

```text
相关进程
父子进程
Shell 管道
```

其数据流通常是：

```text
Write
 ↓
Pipe
 ↓
Read
```

并不是：

```text
共享一块普通内存
```

---

## FIFO：命名管道

FIFO 又称：

> **Named Pipe**

它和普通 Pipe 类似，但在文件系统中有一个名字。

可以创建：

```bash
mkfifo mypipe
```

于是：

```text
Process A
   │
   ▼
mypipe
   │
   ▼
Process B
```

不同进程可以通过这个名字打开同一个 FIFO。

注意：

> FIFO 文件系统中的那个条目并不保存真正的通信数据；内核维护的是对应的管道对象。

参考：[fifo(7)](https://man7.org/linux/man-pages/man7/fifo.7.html)。

---

## Shared Memory：共享内存

### 基本原理

共享内存允许多个进程把同一块内存区域映射到各自的地址空间。

可以理解为：

```text
Process A
   │
   ├────────────┐
   │            │
   ▼            ▼
┌────────┐   ┌────────┐
│Virtual │   │Virtual │
│Memory A│   │Memory B│
└────┬───┘   └───┬────┘
     │            │
     └─────┬──────┘
           ▼
     Shared Memory
```

POSIX 共享内存通常涉及：

```text
shm_open()
ftruncate()
mmap()
munmap()
shm_unlink()
```

Linux 上对应的对象通常可以在：

```text
/dev/shm
```

看到。

参考：[shm_overview(7)](https://man7.org/linux/man-pages/man7/shm_overview.7.html)。

---

### 为什么共享内存还需要同步

共享内存的问题是：

```text
Process A ──┐
            ├── Shared Memory
Process B ──┘
```

多个执行流可能同时修改同一份数据。

例如：

```text
counter = 100
```

两个进程同时：

```text
counter++
```

就可能产生竞争条件。

因此共享内存通常需要配合：

```text
Semaphore
Mutex
Condition
```

等同步机制。

---

## Semaphore：信号量

信号量主要用于：

> **协调多个进程或线程之间的执行顺序以及对共享资源的访问。**

POSIX 信号量本质上维护一个不会小于零的整数，可以通过：

```text
sem_wait()
```

等待资源，

以及：

```text
sem_post()
```

释放资源。

例如：

```text
Semaphore = 1

Process A
   │
   │ wait
   ▼
获得资源
   │
   ▼
临界区
   │
   │ post
   ▼
释放资源
```

参考：[sem_overview(7)](https://man7.org/linux/man-pages/man7/sem_overview.7.html)。

所以：

```text
Shared Memory
+
Semaphore
```

是非常典型的一组组合。

---

## Message Queue：消息队列

消息队列和共享内存最大的区别之一是：

```text
Shared Memory
↓
共享数据区域

Message Queue
↓
发送 / 接收一条条消息
```

可以理解为：

```text
Process A
   │
   │ send(message)
   ▼
┌──────────────┐
│ Message Queue│
└──────┬───────┘
       │
       │ receive()
       ▼
Process B
```

POSIX 消息队列通过：

```text
mq_open()
mq_send()
mq_receive()
mq_close()
mq_unlink()
```

等接口工作。

参考：[mq_overview(7)](https://man7.org/linux/man-pages/man7/mq_overview.7.html)。

---

## Unix Domain Socket：本机进程通信

Unix Domain Socket 又称：

```text
AF_UNIX
AF_LOCAL
```

它主要用于：

> **同一台机器上的进程之间进行 Socket 通信。**

例如：

```text
Process A
   │
   │ Socket
   ▼
Unix Domain Socket
   │
   ▼
Process B
```

它的 API 与普通 Socket 非常接近。

例如：

```text
socket()
bind()
listen()
accept()
connect()
send()
recv()
```

因此很多服务器软件会使用：

```text
Unix Socket
```

提供本机通信。

例如：

```text
应用
  │
  ▼
/run/service.sock
  │
  ▼
服务进程
```

Linux 的 [`unix(7)`](https://man7.org/linux/man-pages/man7/unix.7.html) 专门介绍了 AF_UNIX Socket 以及本机进程通信。

---

## IPC 方式对比

可以把常见 IPC 简单整理成：

| IPC | 数据方式 | 典型特点 | 常见场景 |
|---|---|---|---|
| Pipe | 字节流 | 简单、单向 | Shell 管道、父子进程 |
| FIFO | 字节流 | 有文件系统名称 | 无关进程通信 |
| Signal | 事件通知 | 传递控制信息 | 中断、终止、状态通知 |
| Shared Memory | 共享数据 | 数据交换速度高 | 大量数据共享 |
| Semaphore | 同步 | 控制访问顺序 | 共享资源保护 |
| Message Queue | 消息 | 按消息交换 | 异步任务 |
| Unix Socket | Socket 数据 | 本机通信 | 服务间通信 |

需要注意：

> **IPC 不只是“传输数据”。**

有些机制主要负责：

```text
数据传输
```

有些主要负责：

```text
事件通知
同步
资源协调
```

实际程序中往往会组合使用。

---

## 进程管理中的常见场景

### 场景一：CPU 占用异常

例如发现：

```text
CPU 100%
```

可以先：

```bash
top
```

然后找到 PID：

```text
PID = 1234
```

进一步：

```bash
ps -fp 1234
```

查看：

```text
程序
用户
PPID
启动参数
```

再进一步：

```bash
ps -Lp 1234
```

检查线程。

整个思路是：

```text
CPU 异常
   │
   ▼
top
   │
   ▼
找到 PID
   │
   ▼
ps
   │
   ▼
确认进程
   │
   ▼
查看线程
   │
   ▼
进一步定位程序内部问题
```

---

### 场景二：程序无法停止

先：

```bash
kill -TERM PID
```

等待程序进行正常退出。

如果仍然无法结束，再考虑：

```bash
kill -KILL PID
```

即：

```bash
kill -9 PID
```

但不能把：

```text
kill -9
```

作为所有问题的默认解决方案。

因为强制终止会跳过程序自己的清理逻辑。

---

### 场景三：进程状态为 D

例如：

```bash
ps -eo pid,stat,cmd
```

看到：

```text
1234 D some-process
```

此时重点不是：

```text
“怎么 kill 掉它？”
```

而应该进一步思考：

```text
它在等待什么？
      │
      ├── 磁盘？
      ├── 网络文件系统？
      ├── 块设备？
      ├── 驱动？
      └── 其他内核 I/O？
```

也就是说：

> **D 状态通常应该先排查等待的 I/O 或内核资源，而不是机械地反复发送信号。**

---

### 场景四：大量 Zombie

例如：

```bash
ps -eo pid,ppid,stat,cmd
```

发现大量：

```text
Z
```

需要进一步查看：

```text
Zombie
   │
   ▼
PPID
   │
   ▼
父进程
   │
   ▼
为什么没有 wait？
```

因为：

> 真正的问题通常是父进程没有正确处理子进程退出，而不是这些 Zombie 本身还在执行任务。

---

### 场景五：进程很多，但不知道从哪里来的

可以使用：

```bash
pstree -ap
```

或者：

```bash
ps -eo pid,ppid,cmd --forest
```

从：

```text
systemd
```

一路向下看：

```text
systemd
 └── service
      └── worker
           ├── thread
           └── child
```

这样可以快速理解：

```text
谁启动了谁
```

---

## 进程、线程、信号与 IPC 的整体关系

到这里，可以把整个知识体系串起来：

```text
Linux Program
      │
      │ 启动
      ▼
   Process
      │
      ├── PID
      ├── PPID
      ├── Address Space
      ├── File Descriptors
      ├── Environment
      └── Resources
      │
      ├───────────────┐
      │               │
      ▼               ▼
   Threads          Signals
      │               │
      │               ├── SIGTERM
      │               ├── SIGKILL
      │               ├── SIGINT
      │               └── SIGCHLD
      │
      ▼
  Concurrent
  Execution

Process A
   │
   ├── Pipe
   ├── FIFO
   ├── Shared Memory
   ├── Message Queue
   └── Unix Socket
   │
   ▼
Process B
```

再加上进程生命周期：

```text
fork()
  │
  ▼
Child Process
  │
  │ exec()
  ▼
执行程序
  │
  ├── Running
  ├── Sleeping
  ├── Stopped
  └── Waiting
  │
  ▼
exit()
  │
  ▼
Zombie
  │
  │ wait()
  ▼
回收
```

而 Shell 的 Job Control 则建立在：

```text
Process
   ↓
Process Group
   ↓
Session
   ↓
Foreground Process Group
```

这套机制之上。

---

## Linux 进程管理的常用工具链

实际运维中不需要死记所有工具，而是可以按照问题选择。

```text
查看进程
   ↓
ps / top / pstree

按照名称找进程
   ↓
pgrep

查看进程详细信息
   ↓
ps / /proc/<pid>

查看线程
   ↓
ps -L / /proc/<pid>/task

发送信号
   ↓
kill / pkill

调整优先级
   ↓
nice / renice
```

可以形成一个比较实用的排障流程：

```text
发现问题
   │
   ▼
确认进程
   │
   ├── ps
   ├── top
   └── pgrep
   │
   ▼
确认状态
   │
   ├── CPU
   ├── Memory
   ├── STAT
   ├── PID
   └── PPID
   │
   ▼
确认关系
   │
   └── pstree
   │
   ▼
确认线程
   │
   └── ps -L
   │
   ▼
确认资源
   │
   ├── /proc/<pid>
   └── /proc/<pid>/fd
   │
   ▼
必要时发送信号
   │
   ├── SIGTERM
   └── SIGKILL
```

---

## 一个完整的进程管理认知模型

可以把 Linux 中的进程理解成：

```text
                  Process
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
      Identity     Resources     Execution
        │            │            │
        ├── PID      ├── Memory   ├── Thread
        ├── PPID     ├── FD       ├── State
        ├── PGID     ├── Files    └── Scheduling
        └── SID      └── Socket
                     │
                     ▼
                    IPC
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
     Pipe        Shared Memory    Socket
       │             │
       │             ├── Semaphore
       │             │
       ▼             ▼
    Process A  ↔  Process B

                     ▲
                     │
                   Signal
                     │
        ┌────────────┼────────────┐
        │            │            │
      SIGTERM      SIGINT       SIGCHLD
        │            │            │
        ▼            ▼            ▼
      退出         中断       子进程状态变化
```

因此，学习 Linux 进程时最重要的并不是单独记住几十个命令，而是建立下面这条逻辑链：

```text
程序
 ↓
进程
 ↓
PID / PPID
 ↓
进程状态
 ↓
线程
 ↓
进程组 / Session
 ↓
信号
 ↓
进程生命周期
 ↓
IPC
 ↓
进程排障
```

理解这套模型之后，后续学习：

```text
systemd
服务管理
日志
守护进程
容器
Docker
Kubernetes
性能监控
故障排查
```

都会更加容易。

尤其是在运维场景中，很多看似不同的问题，最后都可以归结为：

```text
这个进程是谁？
为什么存在？
现在是什么状态？
在等待什么？
用了什么资源？
和谁通信？
是谁启动了它？
为什么没有正常退出？
```

这也是 Linux 进程管理真正值得掌握的部分。

## 外部参考

- [Linux man-pages](https://man7.org/linux/man-pages/)
- [ps(1)](https://man7.org/linux/man-pages/man1/ps.1.html)
- [signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)
- [pthreads(7)](https://man7.org/linux/man-pages/man7/pthreads.7.html)
- [Linux Programmer's Manual](https://man7.org/linux/man-pages/)
