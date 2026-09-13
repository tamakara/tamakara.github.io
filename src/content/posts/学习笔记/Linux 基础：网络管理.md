---
title: Linux 基础：网络管理
published: 2026-09-13T09:46:16Z
description: ''
image: ''
tags: [Linux, 网络, 网络管理, Netfilter, iptables, firewalld, nftables, TCP/IP]
category: 学习笔记
draft: false
lang: ''
---

> Linux 网络管理不仅是“把网卡配置好”，还包括网络连通性测试、连接查看、数据包分析、防火墙规则、NAT、端口转发以及故障排查。
>
> 本文从常用网络诊断工具开始，逐步介绍 `ping`、`traceroute`、`ss`、`tcpdump`、`curl`，然后进入 Linux 防火墙体系，理解 **Netfilter、iptables、四表五链、数据包路径**，再介绍现代 Linux 中常见的 **firewalld 与 nftables**，最后通过一套从 DNS → 路由 → 端口 → 防火墙 → 服务 → 应用的排障流程，把这些知识串起来。

# Linux 网络管理的整体结构

在前面的网络基础系列中，我们已经从 TCP/IP 四层模型理解了：

```text
应用层
   ↓
传输层
   ↓
网际层
   ↓
网络接口层
```

到了 Linux 网络管理，重点从：

```text
“网络协议是什么”
```

转变为：

```text
“Linux 主机如何实际使用和管理网络”
```

因此可以建立这样的结构：

```text
Linux 网络管理
│
├── 网络诊断
│   ├── ping
│   ├── traceroute
│   ├── ss
│   ├── tcpdump
│   └── curl
│
├── 防火墙
│   ├── Netfilter
│   ├── iptables
│   ├── firewalld
│   └── nftables
│
├── NAT
│   ├── SNAT
│   ├── DNAT
│   ├── MASQUERADE
│   └── 端口映射
│
└── 网络故障排查
    ├── DNS
    ├── 路由
    ├── 端口
    ├── 防火墙
    ├── 服务
    └── 应用
```

---

# 常用网络诊断工具

## ping

`ping` 是最常见的网络连通性测试工具之一。

IPv4 中，`ping` 通常使用：

```text
ICMP Echo Request
ICMP Echo Reply
```

例如：

```bash
ping 8.8.8.8
```

可以简单理解为：

```text
本机
 │
 │ Echo Request
 ▼
目标
 │
 │ Echo Reply
 ▼
本机
```

如果能够收到回复，可以说明：

> 从本机到目标的 ICMP Echo 通信在当前测试条件下是可行的。

但是：

> **ping 通并不等于应用服务一定正常。**

例如：

```text
ping 成功
TCP 443 失败
```

完全可能发生。

因为：

```text
ping
↓
ICMP

HTTPS
↓
TCP + TLS + HTTP
```

属于不同层次。

---

### ping 可以帮助判断什么

例如：

```bash
ping 192.168.1.1
```

可以作为排查中的一个快速步骤。

如果：

```text
本机 → 网关
```

都无法通信，可以优先怀疑：

```text
网卡
IP 配置
链路
VLAN
二层 / 三层网络
```

如果：

```text
网关能 ping
公网 IP 不能 ping
```

则应该继续检查：

```text
路由
NAT
上游网络
防火墙
```

---

## traceroute

`traceroute` 用于观察：

> **数据包到达目标过程中经过的路径。**

例如：

```bash
traceroute 8.8.8.8
```

结果可能类似：

```text
1   192.168.1.1
2   10.0.0.1
3   203.0.113.1
4   ...
```

它可以帮助观察：

```text
本机
 ↓
第一跳
 ↓
第二跳
 ↓
第三跳
 ↓
目标
```

---

### traceroute 为什么能看到中间路由器

这里与 IP 首部中的：

```text
TTL
```

有关。

例如：

```text
TTL = 1
```

数据包经过第一个三层设备后：

```text
TTL = 0
```

路由器丢弃它，并可能返回：

```text
ICMP Time Exceeded
```

于是发送端知道：

```text
第一跳 = 某个路由器
```

然后继续：

```text
TTL = 2
```

再找到第二跳。

所以可以理解为：

```text
TTL = 1
↓
找到第一跳

TTL = 2
↓
找到第二跳

TTL = 3
↓
找到第三跳
```

这也是 traceroute 与前面网际层知识的重要联系。

---

### 为什么 traceroute 可能出现 `* * *`

例如：

```text
1  192.168.1.1
2  * * *
3  203.0.113.1
```

这不一定表示：

```text
第二跳不存在
```

也可能是：

```text
设备不返回对应探测报文
防火墙过滤
ICMP 被限制
探测方式与网络设备处理方式不同
```

因此：

> `* * *` 应该理解为“没有收到预期的响应”，而不是直接认定“网络中断”。

---

## ss

`ss` 用于查看 Linux 中的：

```text
Socket
网络连接
监听端口
```

例如：

```bash
ss -lnt
```

查看 TCP 监听端口。

```bash
ss -nt
```

查看 TCP 连接。

```bash
ss -lun
```

查看 UDP Socket。

---

### 常见参数

可以记住：

```text
-l
↓
Listening

-n
↓
不进行名称解析

-t
↓
TCP

-u
↓
UDP

-a
↓
All
```

例如：

```bash
ss -lnt
```

可能得到：

```text
State   Local Address:Port
LISTEN  0.0.0.0:22
LISTEN  0.0.0.0:80
```

说明系统当前存在：

```text
TCP 22
TCP 80
```

监听。

---

### ss 与端口排查

假设：

```text
curl http://server:8080
```

连接失败。

首先可以在服务器上：

```bash
ss -lntp
```

确认：

```text
8080
```

是否真的有程序监听。

形成：

```text
访问失败
   ↓
ss -lntp
   ↓
端口是否监听？
```

如果根本没有监听：

```text
防火墙
```

通常不是第一个需要排查的问题。

因为服务可能根本没有启动。

---

## tcpdump

`tcpdump` 用于：

> **捕获并分析网络数据包。**

它是 Linux 网络故障排查中非常重要的工具。

例如：

```bash
sudo tcpdump -ni eth0
```

参数：

```text
-n
↓
不进行 DNS 解析

-i eth0
↓
监听 eth0
```

---

### 捕获 ICMP

例如：

```bash
sudo tcpdump -ni eth0 icmp
```

然后执行：

```bash
ping 192.168.1.1
```

可以观察：

```text
Echo Request
Echo Reply
```

---

### 捕获 TCP 80

```bash
sudo tcpdump -ni eth0 tcp port 80
```

可以看到：

```text
客户端
   │
   │ SYN
   ▼
服务器
   │
   │ SYN, ACK
   ▼
客户端
   │
   │ ACK
   ▼
```

这样可以直接观察 TCP 建连过程。

---

### 捕获 DNS

例如：

```bash
sudo tcpdump -ni eth0 port 53
```

可以观察 DNS 查询流量。

例如：

```text
Client
 │
 │ DNS Query
 ▼
DNS Server
 │
 │ DNS Response
 ▼
Client
```

---

### tcpdump 最重要的价值

很多时候：

```text
程序说自己发送了
```

并不意味着：

```text
数据真的离开了主机
```

而 `tcpdump` 可以直接观察：

```text
网卡上到底有没有这个包
```

因此在排障中，它经常作为非常关键的证据来源。

可以形成：

```text
应用认为发送了
       ↓
tcpdump
       ↓
到底有没有经过网卡？
```

---

## curl

`curl` 主要用于：

> **直接测试应用层网络服务。**

例如：

```bash
curl http://example.com
```

对于 HTTPS：

```bash
curl https://example.com
```

还可以：

```bash
curl -I https://example.com
```

只观察响应头。

例如：

```text
HTTP/1.1 200 OK
Content-Type: text/html
```

---

### curl 为什么适合网络排查

因为它不像：

```text
ping
```

只测试：

```text
IP 层连通性
```

而是可以真正发起：

```text
HTTP Request
```

因此：

```text
ping
↓
网络层

curl
↓
应用层
```

两者可以配合使用。

---

### curl 排查思路

例如：

```bash
curl -v https://example.com
```

可以看到更详细的过程：

```text
DNS
 ↓
TCP
 ↓
TLS
 ↓
HTTP
```

从而帮助定位：

```text
DNS 是否解析
TCP 是否连接
TLS 是否握手
HTTP 返回什么状态
```

这正好对应一套典型的网络故障排查路径。

---

# Netfilter

## 什么是 Netfilter

Netfilter 是 Linux 内核中的：

> **网络包处理框架。**

它提供一系列：

```text
Hooks
Connection Tracking
NAT
Packet Filtering
Logging
```

等基础能力。

`iptables` 和 `nftables` 都会利用 Linux 的 Netfilter 基础设施。

可以理解为：

```text
用户空间
│
├── iptables
├── nft
└── firewalld
        │
        ▼
      Netfilter
        │
        ▼
   Linux 内核网络栈
```

其中：

```text
Netfilter
```

是内核基础设施；

```text
iptables
nftables
```

是规则管理 / 配置体系；

```text
firewalld
```

则进一步提供了面向管理员的防火墙管理抽象。

Netfilter 的 Hook 和数据包路径是整个 Linux 防火墙体系的基础。

---

# Netfilter Hook

Linux 网络包在内核中处理时，会经过多个重要的：

> **Netfilter Hook**

常见的五个 Hook：

```text
PREROUTING
INPUT
FORWARD
OUTPUT
POSTROUTING
```

可以理解为：

```text
                    Network
                       │
                       ▼
                 PREROUTING
                       │
                 路由判断
                  ┌────┴────┐
                  │         │
                  ▼         ▼
               INPUT     FORWARD
                  │         │
                  ▼         ▼
               Local       Route
              Process       │
                            ▼
                       POSTROUTING
                            │
                            ▼
                         Network
```

而本机产生的数据：

```text
Local Process
     │
     ▼
   OUTPUT
     │
     ▼
路由判断 / 后续处理
     │
     ▼
POSTROUTING
     │
     ▼
Network
```

这就是后面理解：

```text
iptables
NAT
firewalld
nftables
```

的基础。

---

# iptables

## iptables 是什么

`iptables` 是 Linux 传统的用户空间防火墙配置工具。

它通过 Netfilter 对 IPv4 数据包进行：

```text
过滤
NAT
修改
```

等操作。

对应的历史工具还包括：

```text
ip6tables
arptables
ebtables
```

现代系统中，`iptables` 仍然存在并被大量使用，但 Linux 防火墙体系已经逐渐向 `nftables` 过渡。

---

# 四表五链

学习 iptables 时经常会看到：

> **四表五链**

这里的“五链”指典型的：

```text
PREROUTING
INPUT
FORWARD
OUTPUT
POSTROUTING
```

而经典的主要表包括：

```text
filter
nat
mangle
raw
```

不过需要注意：

> 在实际 iptables 实现中还存在 `security` 表，因此“经典四表五链”更适合作为入门模型，而不是说 iptables 永远只有四张表。

---

## filter 表

`filter` 表主要负责：

> **数据包过滤。**

常见链：

```text
INPUT
FORWARD
OUTPUT
```

例如：

```text
允许 SSH
禁止其他连接
```

都可以通过 filter 规则实现。

---

## nat 表

`nat` 表用于：

> **网络地址转换。**

典型链：

```text
PREROUTING
POSTROUTING
OUTPUT
```

例如：

```text
SNAT
DNAT
MASQUERADE
```

都与 NAT 表密切相关。

---

## mangle 表

`mangle` 主要用于：

> **修改或处理数据包相关字段及标记。**

它可以参与：

```text
MARK
DSCP
TTL
某些特殊包处理
```

等场景。

---

## raw 表

`raw` 表主要用于较底层的包处理控制。

一个重要用途是：

```text
控制 Connection Tracking
```

例如：

```text
NOTRACK
```

等场景。

因此：

```text
raw
↓
比普通 filter / nat 更靠前
```

---

# 五条链分别是什么

## PREROUTING

数据包刚进入 Linux 网络栈后：

```text
Network
   │
   ▼
PREROUTING
```

这里发生：

```text
路由判断之前
```

因此适合：

```text
DNAT
mangle
raw
```

等操作。

---

## INPUT

如果路由判断发现：

```text
这个数据包是给本机的
```

那么进入：

```text
INPUT
```

路径：

```text
Network
   │
   ▼
PREROUTING
   │
   ▼
Routing
   │
   ▼
INPUT
   │
   ▼
Local Process
```

因此：

> `INPUT` 处理的是**进入本机本地进程的数据包**。

---

## FORWARD

如果目标不是本机，而 Linux 主机启用了路由转发：

```text
Network
   │
   ▼
PREROUTING
   │
   ▼
Routing
   │
   ▼
FORWARD
   │
   ▼
POSTROUTING
   │
   ▼
Network
```

那么：

> **FORWARD 负责处理经过本机转发的数据包。**

这对：

```text
软路由
网关
NAT Router
容器网络
```

非常重要。

---

## OUTPUT

如果数据包是：

> **本机进程自己产生的**

那么通常进入：

```text
OUTPUT
```

例如：

```text
curl https://example.com
```

本机发出请求：

```text
Local Process
      │
      ▼
    OUTPUT
      │
      ▼
Routing
      │
      ▼
POSTROUTING
      │
      ▼
Network
```

---

## POSTROUTING

数据包已经完成路由，即将离开本机时：

```text
POSTROUTING
```

它位于：

```text
路由之后
```

常用于：

```text
SNAT
MASQUERADE
```

等操作。

---

# 数据包路径

这是 Linux 防火墙最重要的知识之一。

## 外部数据访问本机

例如：

```text
Client
   │
   ▼
eth0
   │
   ▼
PREROUTING
   │
   ▼
Routing
   │
   ▼
INPUT
   │
   ▼
Local Process
```

---

## 外部数据经过本机转发

例如 Linux 主机作为路由器：

```text
LAN
 │
 ▼
eth0
 │
 ▼
PREROUTING
 │
 ▼
Routing
 │
 ▼
FORWARD
 │
 ▼
POSTROUTING
 │
 ▼
eth1
 │
 ▼
WAN
```

---

## 本机访问外部网络

```text
Local Process
 │
 ▼
OUTPUT
 │
 ▼
Routing
 │
 ▼
POSTROUTING
 │
 ▼
eth0
 │
 ▼
Network
```

---

# 为什么理解数据包路径很重要

很多防火墙问题并不是：

```text
规则写错
```

而是：

> **规则写在了错误的链。**

例如：

```text
外部访问本机服务
```

通常需要关注：

```text
INPUT
```

而：

```text
Linux 主机作为路由器转发流量
```

需要关注：

```text
FORWARD
```

再例如：

```text
局域网访问互联网
```

通常还涉及：

```text
FORWARD
+
POSTROUTING
```

以及 NAT。

因此排查防火墙时：

> **首先确定数据包经过哪条路径，再考虑规则。**

---

# iptables 规则

iptables 规则可以简单理解成：

```text
匹配条件
    +
处理动作
```

例如：

```bash
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

可以拆成：

```text
-A INPUT
↓
追加到 INPUT 链

-p tcp
↓
匹配 TCP

--dport 22
↓
目标端口 22

-j ACCEPT
↓
允许
```

因此：

```text
Rule
│
├── Match
│   ├── interface
│   ├── source IP
│   ├── destination IP
│   ├── protocol
│   ├── source port
│   └── destination port
│
└── Target
    ├── ACCEPT
    ├── DROP
    ├── REJECT
    └── ...
```

---

## ACCEPT、DROP 与 REJECT

最常见的动作：

```text
ACCEPT
DROP
REJECT
```

### ACCEPT

```text
允许
```

数据包继续正常处理。

---

### DROP

```text
直接丢弃
```

对端通常不会得到明确的拒绝响应。

---

### REJECT

```text
明确拒绝
```

通常会产生相应的拒绝响应。

因此：

```text
DROP
↓
“什么都不告诉你”

REJECT
↓
“告诉你拒绝了”
```

实际使用时应该根据安全策略选择，而不是机械地认为某一种一定更好。

---

# 规则顺序

防火墙规则通常是有顺序的。

例如：

```text
Rule 1
允许 192.168.1.0/24

Rule 2
拒绝所有
```

那么来自：

```text
192.168.1.10
```

的数据首先匹配：

```text
Rule 1
```

得到：

```text
ACCEPT
```

之后：

```text
Rule 2
```

通常不会再对同一规则链继续产生决定性作用。

因此：

> **规则顺序本身就是防火墙策略的一部分。**

---

# firewalld

## 什么是 firewalld

`firewalld` 是 Linux 中常见的动态防火墙管理器。

它提供：

```text
Zone
Service
Port
Rich Rule
NAT
Runtime / Permanent
```

等更高层次的配置抽象。

firewalld 官方将自己定义为一个：

> **stateful、zone-based firewall**

它用 Zone 对网络连接和接口进行信任级别的组织，并提供运行时和永久配置的分离。

可以理解成：

```text
管理员
  │
  ▼
firewall-cmd
  │
  ▼
firewalld
  │
  ▼
防火墙规则体系
  │
  ▼
Netfilter
```

---

# Zone

## 什么是 Zone

Zone 可以理解为：

> **根据网络连接的信任程度组织防火墙策略。**

例如常见 Zone：

```text
public
home
internal
external
dmz
trusted
block
drop
```

不同 Zone 可以拥有不同策略。

例如：

```text
public
↓
只开放必要服务

internal
↓
允许更多内部流量

trusted
↓
高度信任
```

firewalld 的官方模型中，一个连接、接口或来源会被归入对应 Zone，Zone 用于表达信任级别并组织相应防火墙规则。

---

# Service

firewalld 中的：

> **Service**

不是指：

```text
systemd Service
```

而是防火墙意义上的“服务定义”。

例如：

```text
http
https
ssh
dns
```

一个 firewalld Service 可以包含：

```text
端口
协议
目的地址
```

以及某些辅助配置。

官方文档将 Service 定义为一组端口、协议和可选附加配置的组合。

例如：

```bash
firewall-cmd --zone=public --add-service=http
```

表示：

```text
public Zone
 ↓
允许 http Service
```

而不是直接写：

```text
80/tcp
```

---

# Port

也可以直接允许某个：

```text
端口 / 协议
```

例如：

```bash
firewall-cmd --zone=public --add-port=8080/tcp
```

表示：

```text
TCP 8080
↓
允许
```

firewalld 官方文档也区分了：

```text
Service
```

和：

```text
Port
```

两种开放方式。

可以简单理解：

```text
Service
↓
“我要开放一个已定义的服务”

Port
↓
“我要直接开放这个端口”
```

---

# Runtime 与 Permanent

firewalld 一个非常重要的概念是：

```text
Runtime
Permanent
```

## Runtime

Runtime 是：

> **当前实际生效的配置。**

例如：

```bash
firewall-cmd --zone=public --add-port=8080/tcp
```

这会修改当前运行时配置。

---

## Permanent

Permanent 是：

> **持久化保存的配置。**

例如：

```bash
firewall-cmd --permanent --zone=public --add-port=8080/tcp
```

之后：

```bash
firewall-cmd --reload
```

让永久配置重新加载到运行时。

firewalld 官方明确区分了 Runtime 和 Permanent：Runtime 是实际生效配置，而未保存到 Permanent 的 Runtime 修改在 reload、restart 或重新启动服务等情况下不会保留。

---

## 为什么设计成两套配置

这种设计非常适合：

```text
先测试
↓
确认规则正确
↓
再持久化
```

例如：

```bash
firewall-cmd --zone=public --add-port=8080/tcp
```

测试服务。

确认没问题后：

```bash
firewall-cmd --permanent --zone=public --add-port=8080/tcp
firewall-cmd --reload
```

这样可以避免：

```text
写错规则
↓
永久保存
↓
重启后仍然错误
```

---

# firewalld 常见操作

查看当前 Zone：

```bash
firewall-cmd --get-active-zones
```

查看 Zone 配置：

```bash
firewall-cmd --zone=public --list-all
```

开放服务：

```bash
firewall-cmd --zone=public --add-service=http
```

开放端口：

```bash
firewall-cmd --zone=public --add-port=8080/tcp
```

永久开放端口：

```bash
firewall-cmd --permanent --zone=public --add-port=8080/tcp
```

应用 Permanent 配置：

```bash
firewall-cmd --reload
```

查看已经定义的 Service：

```bash
firewall-cmd --get-services
```

---

# nftables

## 为什么会有 nftables

iptables 诞生较早，随着：

```text
IPv4
IPv6
桥接
集合
规则复用
复杂防火墙策略
```

等需求增长，传统规则体系逐渐显得不够统一。

因此 Linux 引入了：

> **nftables**

可以把它理解为现代 Linux Netfilter 规则体系。

关系可以简单表示为：

```text
                    Netfilter
                        │
             ┌──────────┴──────────┐
             │                     │
          iptables             nftables
             │                     │
        传统规则体系           现代规则体系
```

firewalld 也可以建立在 nftables 等后端之上，并提供自己的管理抽象。

---

# nftables 的基本结构

nftables 的结构与 iptables 有明显不同。

最核心的层次是：

```text
Table
 ↓
Chain
 ↓
Rule
```

其中：

> Table 是规则对象的容器，Chain 保存规则，Rule 则定义具体的匹配和动作。

可以理解为：

```text
Table
│
├── Chain A
│   ├── Rule 1
│   ├── Rule 2
│   └── Rule 3
│
└── Chain B
    ├── Rule 1
    └── Rule 2
```

---

## nftables Table

例如：

```bash
nft add table inet firewall
```

创建一个：

```text
inet
```

family 的：

```text
firewall
```

表。

可以查看：

```bash
nft list tables
```

或者：

```bash
nft list ruleset
```

---

## nftables Chain

例如：

```bash
nft 'add chain inet firewall input { type filter hook input priority 0; policy drop; }'
```

这条命令创建了一个：

```text
input
```

Chain，并将它绑定到：

```text
input hook
```

上。

nftables 与 iptables 一个非常重要的区别是：

> **nftables 不预先提供 iptables 那样固定名称的 INPUT、OUTPUT 等链。**

管理员可以创建自己的 Chain，然后将 Base Chain 连接到 Netfilter Hook。

所以：

```text
iptables
↓
固定的经典链

nftables
↓
自己创建 Chain
+
绑定 Hook
```

---

# nftables Rule

一个 nftables Rule 可以简单理解成：

```text
匹配条件
+
动作
```

例如：

```bash
nft add rule inet firewall input tcp dport 22 accept
```

可以理解成：

```text
input
 ↓
TCP
 ↓
目标端口 22
 ↓
accept
```

完整结构：

```text
Rule
│
├── Match
│
└── Statement
```

nftables 官方资料中也采用这种“match + statement”的结构描述规则。

---

## 查看 nftables 规则

```bash
nft list ruleset
```

可以查看完整规则集。

例如：

```text
table inet firewall {
    chain input {
        type filter hook input priority 0;
        policy drop;

        iifname "lo" accept
        ct state established,related accept
        tcp dport 22 accept
    }
}
```

这样可以非常直观地看到：

```text
Table
 ↓
Chain
 ↓
Policy
 ↓
Rules
```

---

# nftables 的 Hook

nftables 使用的 Hook 与 Netfilter 的基础 Hook 体系密切相关：

```text
prerouting
input
forward
output
postrouting
```

此外，根据 family 和内核能力，还存在：

```text
ingress
```

等 Hook。

例如：

```text
PREROUTING
```

发生在：

```text
路由决定之前
```

而：

```text
POSTROUTING
```

发生在：

```text
路由之后、数据包离开本机之前
```

nftables 官方文档对这些 Hook 以及它们在 Linux 网络路径中的位置有详细说明。

---

# nftables 与 iptables 的核心区别

可以简单理解：

| 对比 | iptables | nftables |
|---|---|---|
| 时代 | 传统 | 现代 |
| 基础设施 | Netfilter | Netfilter |
| 规则体系 | 独立的经典表 / 链模型 | Table / Chain / Rule |
| 链 | 有经典固定链 | Base Chain 绑定 Hook |
| IPv4 / IPv6 | 工具分开 | 可使用 `inet` 等 family |
| 集合 | 能力相对分散 | 原生 Set / Map |
| 推荐方向 | 兼容旧系统 / 传统环境 | 新规则体系 |

需要注意：

> **nftables 并不是绕开 Netfilter 的另一套内核防火墙。**

它仍然利用：

```text
Netfilter Hook
Connection Tracking
NAT
```

等内核基础设施。

---

# NAT

## 什么是 NAT

NAT（Network Address Translation）用于：

> **修改经过设备的数据包中的地址信息，并维护相应的转换状态。**

最常见的场景：

```text
私有网络
   ↓
NAT
   ↓
公网
```

例如：

```text
192.168.1.10
      ↓
NAT Router
      ↓
203.0.113.10
      ↓
Internet
```

---

# SNAT

SNAT：

> **Source NAT**

即：

```text
修改源地址
```

例如：

```text
192.168.1.10
      ↓
SNAT
      ↓
203.0.113.10
```

于是外部服务器看到的源地址是：

```text
203.0.113.10
```

而不是：

```text
192.168.1.10
```

---

# MASQUERADE

`MASQUERADE` 可以理解成：

> **一种特殊的源地址转换方式。**

它会根据：

```text
出口接口
```

的地址进行伪装。

典型场景：

```text
家庭宽带
动态公网 IP
```

例如：

```text
LAN
192.168.1.0/24
       │
       ▼
Linux Router
       │
       │ MASQUERADE
       ▼
Internet
```

nftables 官方文档也明确将 `masquerade` 描述为一种特殊形式的 SNAT，其源地址自动使用输出接口的地址。

---

# DNAT

DNAT：

> **Destination NAT**

即：

```text
修改目标地址
```

例如公网请求：

```text
203.0.113.10:80
```

转换为：

```text
192.168.1.100:80
```

于是：

```text
Internet
   │
   │ 203.0.113.10:80
   ▼
NAT Router
   │
   │ DNAT
   ▼
192.168.1.100:80
```

这就是典型的：

> **端口映射 / 端口转发**

场景。

---

# 端口映射

例如：

```text
公网
203.0.113.10:8080
```

映射到：

```text
内网
192.168.1.100:80
```

即：

```text
203.0.113.10:8080
        │
        │ DNAT
        ▼
192.168.1.100:80
```

这样 Internet 中的客户端就可以通过：

```text
203.0.113.10:8080
```

访问内部 Web 服务。

---

# SNAT、DNAT 与 MASQUERADE

可以这样理解：

```text
SNAT
↓
改源地址

DNAT
↓
改目标地址

MASQUERADE
↓
特殊的 SNAT
↓
通常使用出口接口地址
```

画成：

```text
            NAT
             │
      ┌──────┴──────┐
      │             │
     SNAT          DNAT
      │             │
源地址改变       目标地址改变
      │             │
      ▼             ▼
MASQUERADE       端口映射
```

---

# NAT 与防火墙过滤

NAT 和过滤并不是同一个概念。

例如：

```text
NAT
↓
修改地址 / 端口

Filter
↓
决定允许还是拒绝
```

因此：

> **“做了 DNAT”并不自动意味着“流量一定会被允许通过”。**

典型端口转发可能同时需要：

```text
DNAT
+
FORWARD
```

例如：

```text
Internet
   │
   ▼
PREROUTING
   │
   │ DNAT
   ▼
目标内网地址
   │
   ▼
FORWARD
   │
   │ ACCEPT
   ▼
内网服务器
```

---

# Linux IP Forwarding

如果 Linux 主机作为路由器 / 网关进行 IPv4 转发，还需要启用：

```text
IP Forwarding
```

例如：

```bash
sysctl net.ipv4.ip_forward
```

临时开启：

```bash
sysctl -w net.ipv4.ip_forward=1
```

其作用可以理解为：

```text
不是发给本机
        │
        ▼
是否允许转发？
        │
        ▼
FORWARD
```

Netfilter 官方文档也特别指出，将 Linux 主机作为路由器使用时，需要启用 IPv4 forwarding，转发数据包将经过：

```text
prerouting
→ forward
→ postrouting
```

路径。

---

# 一个完整的 NAT 网关

假设：

```text
LAN
192.168.1.0/24
        │
        ▼
Linux Gateway
eth0 = 192.168.1.1
eth1 = 203.0.113.10
        │
        ▼
Internet
```

内网主机：

```text
192.168.1.100
```

访问：

```text
8.8.8.8
```

可以简化为：

```text
192.168.1.100
      │
      ▼
PREROUTING
      │
      ▼
Routing
      │
      ▼
FORWARD
      │
      ▼
POSTROUTING
      │
      │ SNAT / MASQUERADE
      ▼
203.0.113.10
      │
      ▼
Internet
```

返回数据：

```text
Internet
   │
   ▼
PREROUTING
   │
   │ NAT 状态还原
   ▼
192.168.1.100
   │
   ▼
FORWARD
   │
   ▼
内网
```

NAT 并不是简单的：

```text
改一个 IP
```

而是依赖连接跟踪等状态机制维护整个流的地址转换关系。nftables 的 NAT 文档也说明，状态型 NAT 会基于连接的第一个数据包建立 NAT binding，后续数据包使用已有状态进行处理。

---

# 网络故障排查

真正的 Linux 网络管理，最终还是要回到：

> **如何定位故障。**

一个比较实用的排查顺序是：

```text
DNS
 ↓
路由
 ↓
端口
 ↓
防火墙
 ↓
服务
 ↓
应用
```

不过实际还可以把网络接口放在最前面：

```text
网络接口 / 链路
        ↓
DNS
        ↓
路由
        ↓
端口
        ↓
防火墙
        ↓
服务
        ↓
应用
```

---

# 第一步：网络接口

首先确认网卡和地址是否正常。

例如：

```bash
ip link
```

查看接口状态。

然后：

```bash
ip addr
```

查看：

```text
IP 地址
前缀
接口
```

例如：

```text
eth0
192.168.1.10/24
```

---

# 第二步：DNS

假设：

```bash
curl https://example.com
```

失败。

首先要确认：

```text
example.com
```

是否能够解析。

例如：

```bash
getent hosts example.com
```

或者：

```bash
dig example.com
```

排查：

```text
域名
 ↓
DNS
 ↓
IP
```

如果：

```text
DNS 失败
```

那么后面的：

```text
TCP
HTTP
```

通常都无法正常进行。

---

# 第三步：路由

如果已经获得目标 IP：

```text
93.184.216.34
```

继续检查：

```bash
ip route
```

必要时可以：

```bash
ip route get 93.184.216.34
```

它可以帮助判断：

```text
从哪个接口发
下一跳是谁
```

形成：

```text
目标 IP
 ↓
路由表
 ↓
出口接口
 ↓
下一跳
```

---

# 第四步：端口

例如：

```text
服务器 IP = 192.168.1.20
服务端口 = 8080
```

首先在服务器上：

```bash
ss -lntp
```

确认：

```text
8080
```

是否处于：

```text
LISTEN
```

如果没有：

```text
服务可能没有启动
```

这时候还没必要优先去改防火墙。

---

# 第五步：防火墙

如果服务确定在：

```text
LISTEN
```

但外部仍然无法访问，那么检查：

```text
iptables
firewalld
nftables
```

例如 firewalld：

```bash
firewall-cmd --zone=public --list-all
```

nftables：

```bash
nft list ruleset
```

iptables：

```bash
iptables -L -n -v
```

重点确认：

```text
INPUT
FORWARD
```

以及对应的：

```text
端口
来源地址
目标地址
协议
```

---

# 第六步：服务

如果：

```text
网络正常
DNS 正常
路由正常
端口监听
防火墙允许
```

但访问仍然失败，就要检查真正提供服务的程序。

例如：

```bash
systemctl status nginx
```

或者：

```bash
systemctl status sshd
```

查看：

```text
服务是否运行
是否反复崩溃
启动参数
日志
```

---

# 第七步：应用

最后还要确认：

```text
应用层协议
```

是否正常。

例如：

```bash
curl -v http://127.0.0.1:8080
```

如果：

```text
本机 curl 成功
远程 curl 失败
```

说明：

```text
应用本身可能正常
```

问题可能集中在：

```text
监听地址
防火墙
路由
NAT
```

如果：

```text
本机 curl 也失败
```

则继续关注：

```text
应用配置
反向代理
数据库
依赖服务
```

---

# tcpdump 如何定位到底卡在哪里

`tcpdump` 可以把前面的排查进一步具体化。

例如客户端执行：

```bash
curl http://192.168.1.20:8080
```

服务器抓包：

```bash
sudo tcpdump -ni eth0 host 192.168.1.10 and port 8080
```

可能出现几种情况。

### 情况一：完全没有 SYN

```text
服务器
↓
tcpdump
↓
什么都看不到
```

说明请求甚至没有到达该接口。

此时重点检查：

```text
客户端路由
网络路径
VLAN
上游防火墙
NAT
```

---

### 情况二：服务器收到 SYN，但没有响应

```text
Client → SYN → Server
```

但：

```text
Server → SYN/ACK
```

不存在。

此时重点关注：

```text
本机防火墙
内核网络栈
监听状态
策略
```

---

### 情况三：服务器发送 SYN/ACK，但客户端没有后续 ACK

```text
Client → SYN → Server
Server → SYN/ACK → Client
```

之后没有：

```text
ACK
```

那么问题可能出现在：

```text
返回路径
中间网络
客户端防火墙
NAT
```

---

### 情况四：TCP 建立成功，但 HTTP 错误

例如抓包看到：

```text
SYN
SYN/ACK
ACK
```

然后：

```text
HTTP Request
HTTP Response
```

但是响应是：

```text
500
502
503
```

那么 TCP/IP 网络本身很可能已经基本正常。

应该把注意力转移到：

```text
Web Server
Reverse Proxy
Upstream
Application
```

这就是为什么：

> **抓包不仅仅是“看数据包”，更是把故障范围逐层缩小的工具。**

---

# 一个完整的 Linux 网络排障流程

可以把实际工作流程整理成：

```text
发现网络问题
      │
      ▼
网络接口
      │
      ├── ip link
      └── ip addr
      │
      ▼
DNS
      │
      ├── getent
      └── dig
      │
      ▼
路由
      │
      ├── ip route
      └── ip route get
      │
      ▼
基础连通性
      │
      ├── ping
      └── traceroute
      │
      ▼
端口
      │
      └── ss
      │
      ▼
防火墙
      │
      ├── firewalld
      ├── nftables
      └── iptables
      │
      ▼
抓包
      │
      └── tcpdump
      │
      ▼
服务
      │
      └── systemctl / logs
      │
      ▼
应用
      │
      └── curl
```

可以进一步浓缩成：

```text
能否解析？
   ↓
DNS

能否找到？
   ↓
Routing

能否建立连接？
   ↓
TCP / UDP Port

是否被过滤？
   ↓
Firewall

有没有程序监听？
   ↓
Service

协议是否正常？
   ↓
Application
```

---

# 一个典型故障案例

假设：

```text
浏览器访问：

http://10.0.0.10:8080
```

但是失败。

可以这样排查：

```text
① ping 10.0.0.10
```

如果失败：

```text
先排网络连通性
```

如果成功：

```text
② ss -lntp
```

确认：

```text
8080
```

是否监听。

如果监听：

```text
③ firewall-cmd --list-all
```

确认防火墙。

然后：

```text
④ tcpdump -ni eth0 port 8080
```

观察请求是否到达。

最后：

```text
⑤ curl -v http://127.0.0.1:8080
```

确认应用自身是否正常。

整个过程：

```text
ping
 ↓
IP 是否可达

ss
 ↓
端口是否监听

firewall
 ↓
是否允许

tcpdump
 ↓
数据包是否真正到达

curl
 ↓
应用层是否正常
```

这比：

```text
“网站打不开，所以关防火墙”
```

要可靠得多。

---

# Linux 网络管理整体模型

最后，可以将本文所有内容串起来：

```text
                         Linux 网络管理
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
          网络诊断          防火墙              NAT
             │                │                │
      ┌──────┼──────┐    ┌────┼────┐       ┌───┼────┐
      │      │      │    │    │    │       │   │    │
     ping   ss   tcpdump iptables firewalld SNAT DNAT
      │      │      │         │      │        │
      │      │      └─────────┼──────┘       MASQUERADE
      │      │                │
      │      ▼                ▼
      │    Socket          Netfilter
      │                     │
      ▼                     ▼
   ICMP                 nftables
      │
      └──────────────┐
                     ▼
                  TCP/IP
                     │
                     ▼
                  应用服务
                     │
                     ▼
                    curl
```

实际故障排查则可以浓缩成：

```text
网络接口
   ↓
DNS
   ↓
路由
   ↓
端口
   ↓
防火墙
   ↓
服务
   ↓
应用
```

其中最值得建立的认知是：

```text
ping
↓
“IP 层能不能基本通信？”

traceroute
↓
“路径大致经过哪里？”

ss
↓
“本机有什么连接 / 监听？”

tcpdump
↓
“数据包到底有没有经过这里？”

curl
↓
“应用层请求到底能不能成功？”

Netfilter
↓
“Linux 内核在哪些位置处理数据包？”

iptables / nftables
↓
“具体如何写过滤和 NAT 规则？”

firewalld
↓
“如何用 Zone / Service / Port 等抽象管理防火墙？”

NAT
↓
“如何改变地址以及进行端口映射？”

故障排查
↓
“如何从现象逐层缩小问题范围？”
```

这几部分组合起来，就是 Linux 网络管理的核心能力。

## 外部参考

- [Linux networking documentation](https://docs.kernel.org/networking/)
- [Netfilter](https://www.netfilter.org/)
- [nftables Wiki](https://wiki.nftables.org/)
- [firewalld Documentation](https://firewalld.org/documentation/)
- [Linux man-pages](https://man7.org/linux/man-pages/)
