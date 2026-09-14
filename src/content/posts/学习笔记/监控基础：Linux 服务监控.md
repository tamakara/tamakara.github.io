---
title: 监控基础：Linux 服务监控
published: 2026-09-14T04:09:20Z
description: ''
image: ''
tags: [Linux, 监控, systemd, 运维]
category: 学习笔记
draft: false
lang: ''
---

> 监控的第一步不是安装 Prometheus，而是先知道一个 Linux 系统和其中的服务究竟应该观察什么。
>
> 本文从 Linux 主机和服务本身出发，介绍进程、systemd、CPU、内存、磁盘、网络、负载、文件描述符等基础监控指标，并建立一套基础的服务故障定位方法。

# 一、Linux 服务监控概述

## 1.1 什么是服务监控

在 Linux 服务器上运行着大量服务：

```text
Nginx
MySQL
Redis
Docker
SSH
Kubernetes
Java Application
...
```

服务出现问题时，可能表现为：

```text
进程消失
端口关闭
请求超时
CPU 过高
内存不足
磁盘写满
网络异常
```

因此监控并不是单纯地：

```text
“这个进程还在不在？”
```

而是需要同时观察：

```text
服务状态
进程状态
CPU
Memory
Disk
Network
Load
Connection
Logs
```

可以简单抽象成：

```text
                    Linux Server
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
     Service           Resource          Network
       │                 │                 │
       │          ┌──────┼──────┐          │
       │          │      │      │          │
       ▼          ▼      ▼      ▼          ▼
     systemd     CPU   Memory   Disk     Socket
       │
       ▼
    Process
```

## 1.2 监控与故障排查

监控和故障排查并不是一回事。

监控更关注：

```text
“现在是否正常？”
“最近有没有异常？”
“趋势是否发生变化？”
```

故障排查则关注：

```text
“为什么异常？”
```

例如：

```text
CPU = 95%
```

这是一个监控结果。

接下来还需要排查：

```text
哪个进程占用 CPU？
为什么占用？
是不是流量增加？
是不是程序死循环？
是不是频繁 GC？
是不是磁盘 I/O 等待？
```

因此：

```text
监控
→ 发现问题

排查
→ 定位原因

处理
→ 恢复服务

复盘
→ 找出长期改进方案
```

# 二、Linux 服务与 systemd

## 2.1 服务是什么

Linux 中的“服务”通常是长期运行、为其他程序或用户提供功能的进程。

例如：

```text
sshd
nginx
redis-server
mysqld
docker
```

现代 Linux 发行版中，很多系统服务由 `systemd` 管理。

systemd 官方文档：
[systemd](https://systemd.io/)

## 2.2 systemctl

最常用的服务管理命令：

```bash
systemctl status nginx
```

启动：

```bash
sudo systemctl start nginx
```

停止：

```bash
sudo systemctl stop nginx
```

重启：

```bash
sudo systemctl restart nginx
```

重新加载配置：

```bash
sudo systemctl reload nginx
```

设置开机启动：

```bash
sudo systemctl enable nginx
```

取消开机启动：

```bash
sudo systemctl disable nginx
```

查看是否设置了开机启动：

```bash
systemctl is-enabled nginx
```

查看当前是否运行：

```bash
systemctl is-active nginx
```

## 2.3 service 与 process 的区别

需要注意：

```text
Service
≠
Process
```

例如：

```text
systemctl status nginx
```

描述的是 systemd 管理的服务单元。

而：

```bash
ps aux | grep nginx
```

查看的是实际进程。

可以理解为：

```text
systemd
   │
   ▼
Service Unit
   │
   ▼
Process
```

因此遇到服务故障时，通常需要同时查看：

```text
systemctl
+
process
```

# 三、服务健康状态

## 3.1 Active / Inactive / Failed

查看：

```bash
systemctl status nginx
```

常见状态包括：

```text
active
inactive
failed
```

其中：

```text
active
→ 服务当前处于活动状态

inactive
→ 当前没有运行

failed
→ 启动或运行过程中发生失败
```

但：

```text
active
≠
业务一定正常
```

例如：

```text
Nginx Process
     │
     ▼
systemd = active
```

但：

```text
后端服务不可用
```

最终用户仍然可能：

```text
HTTP 502
```

所以更完整的健康判断应该是：

```text
Service
  │
  ├── Process
  ├── Port
  ├── Dependency
  └── Application Response
```

## 3.2 自动重启

systemd 可以配置服务失败后的自动重启，例如：

```ini
[Service]
Restart=on-failure
RestartSec=5
```

这样：

```text
Process
   ↓
Crash
   ↓
systemd
   ↓
Restart
```

可以提高服务的自恢复能力。

但需要注意：

```text
自动重启
≠
问题已经解决
```

如果服务不断：

```text
启动
 ↓
崩溃
 ↓
启动
 ↓
崩溃
```

可能会形成持续重启。

因此还需要观察：

```bash
systemctl status nginx
journalctl -u nginx
```

# 四、进程监控

## 4.1 ps

最基础的进程查看工具：

```bash
ps aux
```

查看指定进程：

```bash
ps aux | grep nginx
```

更适合查看完整进程关系：

```bash
ps -ef
```

例如：

```text
root       100   1  ...
nginx      200 100  ...
nginx      201 100  ...
```

可以帮助分析：

```text
PID
PPID
User
CPU
Memory
Command
```

## 4.2 top

实时查看系统和进程：

```bash
top
```

可以看到：

```text
CPU
Memory
Load Average
Processes
```

以及各进程：

```text
PID
USER
%CPU
%MEM
TIME
COMMAND
```

这是 Linux 服务故障排查中非常常用的工具。

## 4.3 htop

如果系统安装了 `htop`：

```bash
htop
```

它提供更加直观的交互式进程查看界面。

不过运维环境中仍然应该掌握：

```bash
top
```

因为它更加常见且通常预装。

## 4.4 pstree

查看进程树：

```bash
pstree
```

例如：

```text
systemd
 ├─ sshd
 │   └─ sshd
 │       └─ bash
 │
 └─ nginx
     ├─ nginx
     └─ nginx
```

当服务存在：

```text
父进程
子进程
worker
daemon
```

等关系时，进程树非常有帮助。

# 五、CPU 监控

CPU 是最常见的系统资源之一。

## 5.1 CPU 使用率

例如：

```text
CPU = 95%
```

首先需要确定：

```text
User
System
I/O Wait
Idle
```

这些 CPU 时间的来源不同。

例如：

```text
User 高
→ 用户态程序计算较多

System 高
→ 内核态工作较多

I/O Wait 高
→ CPU 正在等待 I/O 完成

Idle 高
→ CPU 大量空闲
```

因此：

```text
CPU 高
```

不能直接等价于：

```text
应用有 bug
```

## 5.2 top 查看 CPU

运行：

```bash
top
```

可以看到类似：

```text
%Cpu(s): 20.0 us, 5.0 sy, 0.0 ni, 70.0 id, 5.0 wa
```

可以重点关注：

```text
us
sy
wa
id
```

## 5.3 mpstat

安装 `sysstat` 后可以使用：

```bash
mpstat
```

查看更细粒度的 CPU 统计：

```bash
mpstat -P ALL 1
```

其中：

```text
-P ALL
```

表示查看所有 CPU。

这在多核服务器上尤其有用，因为：

```text
整体 CPU 不高
```

并不意味着：

```text
所有核心都正常
```

例如：

```text
CPU 0 = 100%
CPU 1 = 10%
CPU 2 = 8%
CPU 3 = 9%
```

也可能造成某些单线程应用性能问题。

# 六、内存监控

## 6.1 free

查看内存：

```bash
free -h
```

例如：

```text
               total   used   free   shared  buff/cache
Mem:             16G    10G     1G      ...        5G
Swap:             2G   500M    1.5G
```

现代 Linux 中：

```text
used
```

并不能简单理解成：

```text
“程序真正占满的内存”
```

因为 Linux 会利用空闲内存作为：

```text
Page Cache
Buffers
```

提高 I/O 性能。

因此更重要的是关注：

```text
available
```

而不是只盯着：

```text
free
```

## 6.2 Swap

查看：

```bash
free -h
```

如果发现：

```text
Swap
```

持续增长，需要进一步检查内存压力。

可能原因：

```text
应用内存泄漏
进程占用过高
系统内存不足
缓存压力
```

不过：

```text
Swap 使用
≠
系统一定有故障
```

关键是观察：

```text
是否持续增长
是否产生大量 I/O
应用延迟是否受到影响
```

## 6.3 vmstat

`vmstat` 可以同时观察：

```text
Process
Memory
Swap
I/O
System
CPU
```

例如：

```bash
vmstat 1
```

非常适合判断系统整体资源状态。

# 七、磁盘与文件系统监控

## 7.1 df

查看文件系统空间：

```bash
df -h
```

典型问题：

```text
/
100%
```

这时应用可能出现：

```text
日志无法写入
数据库无法写入
临时文件创建失败
服务异常
```

## 7.2 inode

除了磁盘容量，还需要关注 inode：

```bash
df -i
```

因为文件系统同时存在：

```text
空间
+
inode
```

例如：

```text
磁盘还有 50GB
```

但如果：

```text
inode = 100%
```

仍然可能无法创建新文件。

常见原因：

```text
大量小文件
日志文件
缓存文件
临时文件
```

## 7.3 du

查看具体目录占用：

```bash
du -sh /var/log/*
```

或者：

```bash
du -xh /var | sort -h
```

可以帮助定位：

```text
到底哪个目录占满了磁盘
```

## 7.4 磁盘 I/O

磁盘空间正常：

```text
df -h
→ 正常
```

并不意味着：

```text
磁盘性能正常
```

还需要观察 I/O。

例如：

```bash
iostat
```

或：

```bash
iostat -xz 1
```

可以查看：

```text
IOPS
吞吐量
await
util
```

这有助于判断：

```text
CPU 问题
还是
磁盘 I/O 问题
```

# 八、网络监控

## 8.1 网卡状态

查看：

```bash
ip link
```

查看地址：

```bash
ip addr
```

检查：

```text
interface
state
IP
```

## 8.2 路由

查看：

```bash
ip route
```

重点关注：

```text
default route
```

以及目标网段是否存在对应路由。

## 8.3 监听端口

使用：

```bash
ss -lntp
```

例如：

```text
LISTEN
0.0.0.0:80
0.0.0.0:22
127.0.0.1:6379
```

可以判断：

```text
服务有没有监听
监听在哪个地址
监听哪个端口
```

这在排查：

```text
“服务已经启动，但是访问不了”
```

时非常重要。

## 8.4 网络连接

查看 TCP 连接：

```bash
ss -ant
```

统计：

```text
ESTABLISHED
TIME-WAIT
CLOSE-WAIT
LISTEN
```

例如：

```text
CLOSE-WAIT
```

大量增加时，可以进一步检查：

```text
应用是否正确关闭连接
上游是否异常
连接是否泄漏
```

# 九、系统负载 Load Average

## 9.1 Load Average 是什么

可以通过：

```bash
uptime
```

或者：

```bash
top
```

看到：

```text
load average: 1.20, 0.80, 0.60
```

分别代表：

```text
1 分钟
5 分钟
15 分钟
```

需要注意：

> Load Average 不是简单的“CPU 使用率”。

它反映的是系统中处于可运行状态以及不可中断睡眠状态等任务的整体压力情况。

因此：

```text
Load 高
```

可能来自：

```text
CPU 压力
I/O 压力
```

而不是只有 CPU。

## 9.2 Load 与 CPU 核数

例如：

```text
1 核 CPU
Load = 4
```

压力通常比较明显。

而：

```text
8 核 CPU
Load = 4
```

并不能简单理解为“系统已经 4 倍超载”。

因此判断负载时要结合：

```text
CPU 核数
CPU 使用率
I/O Wait
系统响应时间
```

综合分析。

# 十、文件描述符与系统资源

Linux 中很多服务不仅消耗：

```text
CPU
Memory
Disk
```

还可能受到：

```text
File Descriptor
```

限制。

## 10.1 文件描述符

查看当前 Shell 限制：

```bash
ulimit -n
```

查看进程打开的文件：

```bash
lsof -p <PID>
```

或者：

```bash
ls /proc/<PID>/fd | wc -l
```

网络连接也会占用文件描述符。

因此：

```text
连接数暴增
```

可能最终表现为：

```text
Too many open files
```

## 10.2 系统级限制

查看：

```bash
cat /proc/sys/fs/file-max
```

以及：

```bash
cat /proc/sys/fs/file-nr
```

如果应用出现：

```text
无法建立连接
无法打开文件
Too many open files
```

就需要同时检查：

```text
进程限制
系统限制
应用连接管理
```

# 十一、日志与 systemd Journal

虽然日志收集和集中式日志会在后续文章单独展开，但基础服务监控必须能够查看本机服务日志。

## 11.1 journalctl

查看系统日志：

```bash
journalctl
```

查看指定服务：

```bash
journalctl -u nginx
```

持续跟踪：

```bash
journalctl -u nginx -f
```

查看最近日志：

```bash
journalctl -u nginx --since "1 hour ago"
```

查看本次启动以来的日志：

```bash
journalctl -b
```

## 11.2 为什么日志是监控的一部分

假设：

```text
systemctl status nginx
```

显示：

```text
active
```

但用户访问失败。

继续：

```bash
ss -lntp
```

发现：

```text
80 端口正常
```

再：

```bash
curl http://127.0.0.1
```

发现：

```text
502 Bad Gateway
```

这时候真正的原因可能存在于：

```text
nginx error log
```

或者：

```text
backend journal
```

因此：

```text
Metrics
→ 告诉你“异常了”

Logs
→ 帮助你解释“为什么异常”
```

后续 Prometheus 和日志系统会继续把这一体系扩展出去。

# 十二、服务监控中的关键指标

不同服务需要观察的指标不同，但可以建立一套基础框架。

## 12.1 主机级指标

```text
CPU
Memory
Load
Disk Usage
Disk I/O
Network
Process Count
File Descriptors
```

## 12.2 服务级指标

```text
Service Status
Process
Port
Connections
Response Time
Error Rate
Restart Count
```

## 12.3 应用级指标

不同应用还可能关注：

```text
QPS
TPS
Latency
Error Rate
Queue Length
Cache Hit Rate
```

例如 Redis：

```text
Memory
Connections
Commands
Hit Rate
Evictions
Latency
```

MySQL：

```text
Connections
QPS
TPS
Slow Queries
Buffer Pool
Locks
Replication
```

Nginx：

```text
Requests
Status Codes
Response Time
Connections
Traffic
```

因此：

> “监控服务器”并不意味着所有服务器都监控同一组指标。

真正有效的监控应该围绕：

```text
服务的工作方式
```

来设计。

# 十三、服务监控的基本层次

可以把 Linux 服务监控分成几个层次：

```text
                    Service Monitoring
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
       Availability      Resource         Performance
          │                │                │
       服务是否运行       CPU/Memory       Latency
       端口是否监听       Disk/Network     QPS
       是否能访问         FD              Error Rate
```

进一步：

```text
Availability
→ 有没有活着

Resource
→ 有没有资源压力

Performance
→ 活着的时候是否正常工作
```

这是后续学习 Prometheus 非常重要的基础。

# 十四、一个实际的 Linux 服务监控示例

假设服务器运行：

```text
Nginx
Java Application
Redis
PostgreSQL
```

可以建立如下监控思路：

```text
                  Linux Server
                       │
       ┌───────────────┼────────────────┐
       │               │                │
      Nginx            Java             Redis
       │                │                │
     Port 80        Port 8080         Port 6379
       │                │                │
       └────────────────┼────────────────┘
                        │
                    PostgreSQL
                       5432
```

主机层：

```text
CPU
Memory
Disk
Network
Load
```

服务层：

```text
Nginx → HTTP
Java  → HTTP
Redis → TCP
PostgreSQL → TCP
```

于是：

```text
服务器 CPU 正常
      ↓
Nginx 正常
      ↓
Java 正常
      ↓
Redis 正常
      ↓
PostgreSQL 正常
```

用户最终得到的才是：

```text
业务正常
```

这说明：

> **单个服务正常，并不能证明整个业务正常；主机正常，也不能证明业务正常。**

# 十五、Linux 服务故障排查流程

假设用户反馈：

```text
网站打不开
```

不要直接重启服务器。

可以按照：

```text
                    网站打不开
                         │
                         ▼
                  服务是否运行？
                         │
                    systemctl
                         │
                         ▼
                   进程是否存在？
                         │
                         ▼
                    端口是否监听？
                         │
                         ▼
                    网络是否正常？
                         │
                         ▼
                本机 curl 是否正常？
                         │
                         ▼
                    查看日志
                         │
                         ▼
                检查 CPU / Memory
                         │
                         ▼
                    检查磁盘
                         │
                         ▼
                    检查依赖
```

具体可以依次执行：

```bash
systemctl status nginx

ps -ef | grep nginx

ss -lntp | grep :80

curl -I http://127.0.0.1

journalctl -u nginx --since "30 min ago"

free -h

df -h

top
```

如果 Nginx 本身正常：

```text
Nginx
 ↓
Backend
 ↓
Database
 ↓
Redis
```

继续检查后端依赖。

# 十六、几个典型故障案例

## 16.1 CPU 持续 100%

现象：

```text
CPU = 100%
Load ↑
```

排查：

```bash
top
```

找到高 CPU 进程：

```text
PID 1234
CPU 300%
java
```

进一步：

```bash
top -H -p 1234
```

查看线程。

接下来再结合：

```text
应用日志
GC
请求量
线程状态
```

定位原因。

所以：

```text
CPU 高
→ 只是症状
```

不能直接：

```text
kill -9
```

## 16.2 磁盘满

现象：

```text
df -h
/
100%
```

继续：

```bash
du -xh /var | sort -h
```

发现：

```text
/var/log
```

非常大。

继续检查：

```text
哪个日志
为什么没有轮转
是否存在异常日志刷屏
```

正确处理应该是：

```text
找到原因
 ↓
合理清理 / 轮转
 ↓
恢复磁盘空间
 ↓
修复日志配置
```

而不是简单：

```bash
rm -rf /var/log/*
```

## 16.3 服务 active 但访问失败

例如：

```bash
systemctl status nginx
```

结果：

```text
active
```

但是：

```bash
curl http://127.0.0.1
```

返回：

```text
502 Bad Gateway
```

这时说明：

```text
Nginx Process
→ 正常

Nginx HTTP
→ 正常响应

Backend
→ 可能异常
```

继续：

```text
Nginx
 ↓
upstream
 ↓
Backend
```

排查后端。

## 16.4 内存持续下降

现象：

```text
available memory
持续下降
```

需要观察：

```text
进程 RSS
Page Cache
Swap
OOM
```

如果某一个应用：

```text
RSS 持续增长
```

就需要进一步考虑：

```text
内存泄漏
缓存无限增长
连接累积
对象无法释放
```

如果出现：

```text
OOM Killer
```

则需要检查：

```bash
dmesg
```

或：

```bash
journalctl -k
```

查看内核日志。

# 十七、监控数据的三个维度

后续学习 Prometheus 和 Grafana 前，需要先建立一个非常重要的概念：

```text
状态
趋势
异常
```

## 17.1 当前状态

例如：

```text
CPU = 30%
Memory = 45%
Disk = 60%
```

回答：

```text
现在怎么样？
```

## 17.2 趋势

例如：

```text
Disk Usage

60%
61%
63%
66%
70%
75%
...
```

虽然今天：

```text
75%
```

不一定是故障。

但趋势告诉我们：

```text
磁盘正在持续增长
```

可能很快产生问题。

## 17.3 异常

例如：

```text
平时 QPS = 1000

突然：
QPS = 10000
```

或者：

```text
平时 CPU = 30%

突然：
CPU = 95%
```

这才是：

```text
Anomaly
```

因此真正的监控系统不仅要：

```text
采集数据
```

还需要：

```text
判断
告警
可视化
趋势分析
```

这些内容就是下一篇 Prometheus 与 Grafana 的核心。

# 十八、从 Linux 本机监控到 Prometheus

到这里，Linux 自带工具已经能够观察大量基础数据：

```text
systemd
ps
top
free
vmstat
df
du
iostat
ss
journalctl
```

但它们的问题是：

```text
只能人工执行
```

例如：

```bash
top
```

只能告诉你：

```text
“现在 CPU 是多少”
```

如果希望：

```text
每 15 秒采集
保存 30 天
生成图表
超过阈值自动告警
```

就需要专门的监控系统。

于是进入：

```text
Linux
 │
 ├── Metrics
 ├── Logs
 └── Status
       │
       ▼
   Monitoring System
       │
       ▼
   Prometheus
       │
       ▼
    Grafana
```

下一篇可以进一步解决：

```text
数据怎么采集？
指标怎么定义？
Prometheus 怎么存？
怎么查询？
Grafana 怎么画？
怎么告警？
```

而日志体系则继续拆开：

```text
Logs
 ↓
Log Collection
 ↓
ELK / Elastic Stack
```

再往后：

```text
Metrics
Logs
Traces
      ↓
OpenTelemetry
      ↓
完整可观测性体系
```

# 十九、总结

Linux 服务监控可以先建立这样一套思维框架：

```text
                  Linux Service
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Availability  Resource    Performance
          │            │            │
       Service       CPU          Latency
       Process       Memory       QPS
       Port          Disk         Error
       Health        Network
                       │
                       ▼
                    Logs
                       │
                       ▼
                 Root Cause
```

日常排查最常用的基础工具可以归纳为：

```text
systemctl
→ 服务状态

ps / top
→ 进程与 CPU

free / vmstat
→ 内存与系统状态

df / du / iostat
→ 磁盘与 I/O

ip / ss
→ 网络

journalctl
→ 服务与系统日志
```

最终形成：

```text
发现异常
   ↓
确认服务
   ↓
检查进程
   ↓
检查资源
   ↓
检查网络
   ↓
检查日志
   ↓
检查依赖
   ↓
定位原因
```

这套基础能力是后面的：

```text
Prometheus
Grafana
ELK
OpenTelemetry
可观测性
```

的基础。

> **监控系统解决的是“持续观察系统”，而 Linux 基础工具解决的是“理解系统当前发生了什么”。在真正使用 Prometheus 之前，先掌握后者，才能看懂监控数据背后的含义。**

## 外部参考

- [systemd Documentation](https://systemd.io/)
- [systemctl — Control the systemd system and service manager](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)
- [journalctl — Query the systemd journal](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)
- [procps-ng / Linux process monitoring tools](https://gitlab.com/procps-ng/procps)
- [sysstat](https://github.com/sysstat/sysstat)
