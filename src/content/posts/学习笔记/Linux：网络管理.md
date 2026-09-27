---
title: Linux：网络管理
published: 2026-09-13T09:46:16Z
updated: 2026-09-27
description: '从查看网络状态开始，逐步掌握 Linux 的地址、路由、DNS、端口和防火墙管理，并学会按链路定位常见连接问题。'
image: ''
tags: [Linux, 网络, 网络管理, IP, DNS, firewalld, nftables]
category: 学习笔记
draft: false
lang: ''
---

Linux 的网络管理可以归纳为一个问题：**数据包能否从本机按预期到达目标服务，并得到正确响应？**

为回答这个问题，需要依次确认网卡是否有链路、是否有 IP 地址、路由是否正确、域名能否解析、目标端口是否有服务监听，以及防火墙是否允许流量。本文按这个顺序介绍常用操作；网络分层、TCP 握手等原理只在解释命令输出时涉及。

:::note[示例环境]
命令适用于大多数使用 `iproute2` 的 Linux 发行版。修改网络配置通常需要 `sudo`。示例中的 `eth0`、`192.0.2.10` 和 `example.com` 是占位符，请替换为真实值。
:::

# 先看懂网络状态

## 接口、地址和路由

接口是内核连接网络的对象，可能对应物理网卡、虚拟网卡或隧道。名称不一定是 `eth0`。

```bash
ip -br link
ip -br address
ip route
ip -6 route
ip route get 203.0.113.10
```

`UP` 表示接口已启用，`LOWER_UP` 通常表示底层链路已连接；二者都不代表已经能访问互联网。还要检查地址和路由。`ip route get` 输出的接口、下一跳和源地址可用于判断请求预计从哪里发出。路由按更具体的网络优先匹配，没有更具体的路由时才使用 `default`。

## 确认谁在管理网络

`ip` 修改的是当前运行状态，重启后通常会丢失。持久配置可能由 NetworkManager、systemd-networkd、Netplan 或云初始化工具负责，先确认管理者，避免互相覆盖。

```bash
nmcli device status
nmcli connection show
systemctl is-active NetworkManager
systemctl is-active systemd-networkd
```

# 配置地址和默认路由

## 临时配置

临时配置适合测试，重启或网络管理器重新接管后可能恢复原状。

```bash
sudo ip link set dev eth0 up
sudo ip addr add 192.168.1.20/24 dev eth0
sudo ip route replace default via 192.168.1.1 dev eth0
ip -br address show dev eth0
ip route
ping -c 3 192.168.1.1
```

`/24` 是子网前缀；网关必须与本机处于可达网络。网关都无法到达时，先检查接口、链路、地址前缀和网关，不要先改 DNS。删除测试地址时指定准确地址：

```bash
sudo ip addr del 192.168.1.20/24 dev eth0
```

## 持久配置：NetworkManager

先找出连接名，再修改连接配置。下面的连接名和地址需要替换：

```bash
nmcli connection show
sudo nmcli connection modify "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.20/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "1.1.1.1 8.8.8.8"
sudo nmcli connection up "Wired connection 1"
```

`connection modify` 只保存配置，`connection up` 才应用配置。应用后重新检查：

```bash
nmcli device show eth0
ip -br address show dev eth0
ip route
resolvectl status
```

恢复 DHCP：

```bash
sudo nmcli connection modify "Wired connection 1" \
  ipv4.method auto ipv4.addresses "" ipv4.gateway "" ipv4.dns ""
sudo nmcli connection up "Wired connection 1"
```

:::warning[远程修改网络]
通过 SSH 修改当前会话依赖的地址、默认路由或防火墙可能立即断开连接。先保留本地控制台或云控制台作为恢复通道。
:::

# DNS：把名称变成地址

DNS 把域名解析为 IP 地址，但不负责建立 TCP 连接，也不代表目标服务正常。`/etc/hosts` 可能在 DNS 之前直接提供结果。

```bash
getent ahosts example.com
resolvectl status
resolvectl query example.com
dig example.com A
dig @1.1.1.1 example.com A
```

`getent` 反映系统实际使用的名称服务；`dig` 主要用于直接检查 DNS。两者结果不同不一定说明 DNS 故障，修改后应使用 `getent` 和实际应用再次验证。

# 从端口确认服务

IP 地址表示主机，端口对应主机上的服务。`ss` 查看监听和已建立的连接：

```bash
sudo ss -lntup
ss -nt state established
```

| 输出 | 含义 |
| --- | --- |
| `LISTEN` | TCP 服务正在等待连接 |
| `0.0.0.0:8080` | 在所有 IPv4 接口监听 |
| `127.0.0.1:8080` | 只接受本机连接 |
| `[::]:8080` | 在 IPv6 接口监听 |
| `ESTAB` | TCP 连接已建立 |

```bash
systemctl status nginx
sudo ss -lntp | grep ':80 '
```

端口没有监听，应先检查服务配置和日志；端口在监听但外部超时，再检查访问控制和网络路径。

# 防火墙：决定允许哪些流量

Netfilter 是内核能力，常见管理工具有 nftables、iptables 和 firewalld。先确认系统使用哪一层，不要同时编辑多套规则：

```bash
sudo nft list ruleset
sudo firewall-cmd --state
iptables --version
```

firewalld 将规则分为运行时和永久配置。确认接口所在区域后开放 HTTP：

```bash
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --zone=public --list-all
sudo firewall-cmd --zone=public --add-service=http
sudo firewall-cmd --zone=public --permanent --add-service=http
sudo firewall-cmd --reload
sudo firewall-cmd --zone=public --query-service=http
```

运行时规则用于验证，永久规则用于保存。生产环境应限制来源地址或网段，不要为了排障直接关闭防火墙。容器运行时和云平台安全组也可能有独立规则。

# NAT 与转发

普通主机只处理发给自己或由自己发出的流量。让 Linux 充当网关，还需要路由、内核转发、防火墙和 NAT 同时正确：

```bash
sysctl net.ipv4.ip_forward
sudo sysctl -w net.ipv4.ip_forward=1
```

SNAT 或 masquerade 修改出站源地址，DNAT 把进入的地址和端口转发给内部服务。NAT 不是防火墙，也不会自动启用转发；两端还必须有可返回的路由，否则会出现请求到达但响应回不来的单向连接。

# 按现象排障

| 现象 | 先检查 | 常用命令 |
| --- | --- | --- |
| 没有 IP | 接口、DHCP、持久配置 | `ip -br link`、`ip -br address`、`nmcli device status` |
| 能访问网关，不能访问外部 | 默认路由和上游网络 | `ip route`、`ip route get 1.1.1.1` |
| 能访问 IP，不能访问域名 | 系统解析器和 DNS | `getent ahosts`、`resolvectl status`、`dig` |
| 连接被拒绝 | 服务是否监听 | `ss -lntup`、`systemctl status` |
| 连接超时 | 路由、防火墙、安全组、返回路径 | `ip route get`、`firewall-cmd`、`tcpdump` |
| TCP 已建立但应用失败 | TLS、HTTP 状态和应用日志 | `curl -v`、`journalctl -u` |

`ping` 只验证 ICMP，目标可能禁止 ICMP。针对具体服务，直接测试协议：

```bash
curl -v --connect-timeout 5 https://example.com/
curl -v http://192.168.1.20:8080/
```

需要确认数据包是否到达时，限制接口、主机和端口进行抓包：

```bash
sudo tcpdump -ni eth0 -c 50 'host 192.168.1.20 and tcp port 8080'
```

看不到 SYN，先查本机路由和过滤条件；看到 SYN 但无响应，查目标服务和防火墙；看到 SYN、SYN-ACK 却没有 ACK，重点查返回路由。HTTPS 内容经过加密，普通抓包只能判断连接阶段。

# 一套可重复的检查流程

1. 用 `ip -br link` 和 `ip -br address` 确认接口和地址。
2. 用 `ip route get 目标地址` 确认出口、下一跳和源地址。
3. 先访问网关，再访问目标 IP。
4. 用 `getent ahosts 域名` 检查系统解析，必要时用 `dig` 对比 DNS。
5. 在服务端用 `ss -lntup` 确认监听，在客户端用 `curl` 测试。
6. 最后检查主机防火墙、云安全组、容器网络和返回路由。

关键是把地址、路由、解析、端口、策略和应用分开验证。一个命令有输出，只能证明它负责的那一层有结果。

# 参考资料

- [`ip(8)` 手册](https://man7.org/linux/man-pages/man8/ip.8.html)
- [NetworkManager `nmcli` 文档](https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html)
- [systemd-resolved 文档](https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html)
- [firewalld：运行时与永久配置](https://firewalld.org/documentation/configuration/runtime-versus-permanent.html)
- [`ss(8)` 手册](https://man7.org/linux/man-pages/man8/ss.8.html)
- [`tcpdump(8)` 手册](https://www.tcpdump.org/manpages/tcpdump.1.html)

