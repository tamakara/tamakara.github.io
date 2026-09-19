---
title: Linux：进程与作业管理
published: 2026-09-13T07:32:38Z
description: '进程是正在运行的程序实例。'
updated: 2026-09-19
image: ''
tags: [Linux, 进程, 线程, 信号, IPC, 系统管理]
category: 学习笔记
draft: false 
lang: ''
---

进程是正在运行的程序实例。管理进程的关键是确认身份和状态，选择合适的生命周期操作，再验证资源占用与业务是否恢复正常。

# 进程、线程与作业

进程拥有地址空间等资源，线程是进程内的执行单元，通常共享这些资源。PID 标识进程，PPID 指向父进程，TID 标识线程；标识可能被复用，操作前应核对启动时间与命令。

Shell 的作业是它跟踪的一条命令或流水线，可以包含多个进程。`jobs` 只显示当前 Shell 管理的作业，不是全系统进程清单。

| 对象 | 适合的观察方式 |
| --- | --- |
| 系统进程快照 | ps |
| 动态资源变化 | top、pidstat |
| 当前 Shell 的后台任务 | jobs |
| systemd 管理的服务 | systemctl |
| 一个进程内的线程 | ps -L、top -H |

# 查找与观察进程

```bash title="先定位，再确认"
ps -eo pid,ppid,user,stat,etime,%cpu,%mem,args --sort=-%cpu
pgrep -a -x nginx
```

`pgrep -x` 按进程名精确匹配；应用可能修改进程名，必要时再检查命令行、可执行文件与服务归属。`ps` 的 CPU 百分比通常基于进程生命周期统计，与 top 的采样区间含义不同。

## 常见状态

| 状态 | 含义 | 判断方向 |
| --- | --- | --- |
| R | 正在运行或等待 CPU | 结合 CPU 使用率、运行队列判断 |
| S | 可中断睡眠 | 很多正常服务大部分时间处于此状态 |
| D | 不可中断等待，常见于内核资源或 I/O 等待 | 检查存储、网络文件系统和内核日志 |
| T | 被作业控制信号停止 | 确认是否意外暂停，必要时继续运行 |
| Z | 已退出但尚未被父进程回收 | 检查父进程，不是继续给僵尸进程发 KILL |

僵尸进程不再执行程序；它保留少量退出记录等待父进程读取。D 状态进程即使收到 KILL，也可能要等到等待条件解除后才能退出。

# 前台、后台与退出状态

以下示例只操作自己新建的 `sleep` 进程：

```bash title="Bash 后台任务"
sleep 30 &
task_pid=$!
jobs -l
ps -p "$task_pid" -o pid,stat,args
wait "$task_pid"
printf '退出状态：%s\n' "$?"
```

`&` 启动后台任务，`$!` 保存最近一个后台任务的 PID，`wait` 等待它退出并返回状态。后台不等于脱离终端；任务是否会在断线后继续，取决于终端、Shell 和信号处理。

| 操作 | 含义 |
| --- | --- |
| Ctrl+c | 向前台进程组发送 SIGINT |
| Ctrl+z | 通常发送 SIGTSTP，暂停前台作业 |
| bg %1 | 让作业 1 在后台继续 |
| fg %1 | 将作业 1 切到前台 |

需要重连交互会话可使用 tmux；需要长期运行、自动重启和开机启动则使用服务管理器。

# 信号与服务生命周期

| 信号 | 常见用途 | 限制 |
| --- | --- | --- |
| TERM | 请求正常退出 | 应用可以捕获并执行清理 |
| INT | 交互式中断 | 具体行为由应用定义 |
| HUP | 某些服务用于重载 | 不是通用的“重载配置”指令 |
| STOP / CONT | 强制暂停 / 继续 | 暂停可能持有锁并阻塞其他工作 |
| KILL | 内核强制终止 | 无法执行应用清理，不保证立即脱离内核等待 |

处理 systemd 服务应优先使用服务接口，例如：

```bash
systemctl status nginx
sudo systemctl stop nginx
systemctl is-active nginx
journalctl -u nginx --since "10 minutes ago"
```

示例要求系统确实安装该服务。停止后还要确认监听端口和相关任务是否消失；服务可能由 socket、定时器或其他单元再次激活。

对于独立进程，先核对 PID、属主、启动时间和命令，再发 TERM，等待业务允许的退出时间。仅在确认不能正常退出、已评估未写入数据和锁的影响后考虑 KILL。不要用名称模糊匹配批量终止进程。

# 资源判断与优先级

| 现象 | 观察方法 | 注意事项 |
| --- | --- | --- |
| CPU 持续升高 | top -H、pidstat -u 1 | 多线程进程可能超过单个 CPU 的 100% |
| 内存持续增长 | ps、pidstat -r 1、服务指标 | RSS 含共享页，简单相加会重复计算 |
| I/O 延迟增加 | pidstat -d 1、iostat -xz 1 | 区分哪个进程发起请求与哪个设备拥塞 |
| 文件描述符不足 | /proc/PID/fd、进程 limits | 确认泄漏或业务需求，再调整限制 |
| 进程反复退出 | 服务日志、退出状态、内核 OOM 日志 | 先定位原因，单纯重启会隐藏现场 |

`nice` 和 `renice` 调整普通调度策略下的相对优先级，不是 CPU 使用率上限。资源配额更适合通过 systemd/cgroup 配置，并在变更后观察业务延迟。

# 进程间通信

| 需求 | 常见机制 | 应用例子 |
| --- | --- | --- |
| 流式传递数据 | 管道、FIFO | Shell 流水线 |
| 本机或跨主机请求 | Unix socket、网络 socket | 服务监听与客户端连接 |
| 共享大量数据 | 共享内存 | 配合锁协调读写 |
| 事件通知 | 信号 | 请求退出、报告子进程变化 |
| 同步与互斥 | 信号量等 | 限制并发访问 |

排障时先确认通信端点、访问权限、队列是否积压和对端是否存活。只有需要开发或分析内部行为时，才需要展开具体系统调用。

# 参考资料

- [ps(1)](https://man7.org/linux/man-pages/man1/ps.1.html)
- [signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)
- [Bash：作业控制](https://www.gnu.org/software/bash/manual/html_node/Job-Control.html)
- [systemctl 手册](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)
