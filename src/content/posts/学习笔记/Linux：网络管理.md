---
title: Linux：网络管理
published: 2026-09-13T09:46:16Z
updated: 2026-09-28
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

Linux 的 `ip` 命令用于查看和修改内核中的网络接口、IP 地址和路由。命令的一般形式是 `ip 对象 操作`：`link` 管接口，`address`（常简写为 `addr`）管 IP 地址，`route` 管路由。下面先只查看，不会修改系统。

## 查看网络接口：`ip link`

网络接口是 Linux 用来连接网络的对象，可能对应物理网卡、虚拟网卡或隧道。接口名由系统决定，不一定是 `eth0`。`link` 查看接口本身的启用状态和链路状态；`-br` 是 brief 的缩写，让输出更紧凑、每个接口占一行。

```bash
ip -br link
```

典型输出：

```text
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
ens33            UP             00:0c:29:12:34:56 <BROADCAST,MULTICAST,UP,LOWER_UP>
```

第一列是接口名，第二列是接口状态，最后一列是标志。`UP` 表示接口已启用；`LOWER_UP` 通常表示网线、虚拟交换机或无线链路已连通。`lo` 是本机回环接口，供本机程序互相通信。接口显示 `UP` 仍不能证明互联网可用，后面还要检查 IP 地址和路由。

## 查看 IP 地址：`ip address`

一块接口可以配置一个或多个 IP 地址。`address` 查看地址，`-br` 同样表示简洁输出：

```bash
ip -br address
```

典型输出：

```text
lo               UNKNOWN        127.0.0.1/8 ::1/128
ens33            UP             192.168.1.20/24 fe80::20c:29ff:fe12:3456/64
```

`127.0.0.1` 和 `::1` 是本机回环地址；`192.168.1.20/24` 是 `ens33` 的 IPv4 地址；`fe80::` 开头的是 IPv6 链路本地地址，通常只在本地链路内使用。斜线后的数字是前缀长度，`/24` 表示本地 IPv4 网段前 24 位相同，在这个例子中网段是 `192.168.1.0/24`。没有接口地址或地址不属于预期网段时，先查网络管理器和 DHCP/静态配置。

## 查看路由：`ip route`

IP 地址说明本机在什么网络中，路由则决定发往某个目标的数据包从哪里出去。`ip route` 查看 IPv4 路由，`ip -6 route` 查看 IPv6 路由：

```bash
ip route
ip -6 route
```

假设 IPv4 输出如下：

```text
default via 192.168.1.1 dev ens33 proto dhcp
192.168.1.0/24 dev ens33 proto kernel scope link src 192.168.1.20
```

第二行表示 `192.168.1.0/24` 这个本地网段直接连接在 `ens33` 上，本机使用 `192.168.1.20` 作为源地址。第一行的 `default` 是默认路由：目标不匹配其他更具体路由时，把数据交给网关 `192.168.1.1`，从 `ens33` 发出。没有默认路由时，本机通常无法主动访问本地网段以外的地址。

IPv6 路由表会因网络环境不同而不同，例如：

```text
default via fe80::1 dev ens33 proto ra
fe80::/64 dev ens33 proto kernel metric 256
```

`fe80::1` 是该链路上的 IPv6 下一跳，`proto ra` 表示路由信息来自路由器通告。若网络没有提供 IPv6 默认路由，IPv4 仍可能正常工作；检查 IPv6 时应单独确认地址和路由。

若要知道访问某个目标时内核实际会选哪条路由，可用 `ip route get 目标地址`。例如：

```bash
ip route get 203.0.113.10
```

典型输出：

```text
203.0.113.10 via 192.168.1.1 dev ens33 src 192.168.1.20 uid 1000
```

这表示目标将经 `192.168.1.1` 网关、从 `ens33` 发出，并使用 `192.168.1.20` 作为源地址。`203.0.113.10` 是文档示例地址，实际排障时替换为要访问的目标 IP。若输出的接口、网关或源地址不符合预期，应先检查路由和地址配置。

路由通常遵循“匹配最具体的网段”原则：发往本地网段的包使用本地路由，其他目标才使用 `default`。IPv4 和 IPv6 的路由表彼此独立，因此分别查看。

## 确认谁在管理网络

`ip` 修改的是当前运行状态，重启后通常会丢失。持久配置可能由 NetworkManager、systemd-networkd、Netplan 或云初始化工具负责，先确认管理者，避免互相覆盖。NetworkManager 的 `nmcli device status` 查看网卡设备及连接状态；`nmcli connection show` 列出保存的连接配置。`systemctl is-active` 则检查对应服务是否正在运行。

```bash
nmcli device status
nmcli connection show
systemctl is-active NetworkManager
systemctl is-active systemd-networkd
```

例如，`nmcli device status` 可能显示：

```text
DEVICE  TYPE      STATE      CONNECTION
ens33   ethernet  connected  Wired connection 1
lo      loopback  unmanaged  --
```

`connected` 表示设备当前已连接某个 NetworkManager 配置；`unmanaged` 表示 NetworkManager 不负责管理该设备。若两个服务都显示 `active`，仍需判断实际接口归谁管理，不要同时用两套工具改同一接口。

# 配置地址和默认路由

## 临时配置

临时配置适合测试，重启或网络管理器重新接管后可能恢复原状。先用 `ip link set` 启用接口，再用 `ip address add` 添加地址，最后用 `ip route` 设置默认路由：

```bash
sudo ip link set dev eth0 up
sudo ip addr add 192.168.1.20/24 dev eth0
sudo ip route replace default via 192.168.1.1 dev eth0
ip -br address show dev eth0
ip route
ping -c 3 192.168.1.1
```

这里的 `replace` 表示有默认路由时替换它，没有时则新增。网关必须是当前网络中真实可达的路由器地址。最后三条命令分别复查地址、路由，并向网关发送 3 个 ICMP Echo 请求（常被称为 ping）。正常时会看到 `64 bytes from ...` 及往返时间统计；若显示 `100% packet loss`，说明没有收到回应，但也可能是网关禁止 ICMP，不能单凭 ping 判断所有网络流量都不通。

网关无法到达时，按接口链路、地址前缀、网关地址顺序检查，不要先改 DNS。删除测试地址时指定准确地址：

```bash
sudo ip addr del 192.168.1.20/24 dev eth0
```

## 持久配置：NetworkManager

先找出连接名，再修改连接配置。`nmcli connection modify` 修改保存的连接参数，`connection up` 激活连接并应用变更。下面的连接名和地址需要替换：

```bash
nmcli connection show
sudo nmcli connection modify "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.20/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "1.1.1.1 8.8.8.8"
sudo nmcli connection up "Wired connection 1"
```

激活连接成功后仍要验证运行状态，而不是只看配置是否保存。`nmcli device show` 查看设备实际获得的配置；`resolvectl status` 在使用 systemd-resolved 的系统上查看 DNS 设置：

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

DNS 把域名解析为 IP 地址，但不负责建立 TCP 连接，也不代表目标服务正常。`/etc/hosts` 可能在 DNS 之前直接提供结果。`getent ahosts` 走系统名称服务，因此更接近普通应用的解析路径；`dig` 直接查询 DNS，可用来检查 DNS 服务器回答。

```bash
getent ahosts example.com
resolvectl status
resolvectl query example.com
dig example.com A
dig @1.1.1.1 example.com A
```

例如，`getent ahosts example.com` 可能返回：

```text
93.184.216.34    STREAM example.com
93.184.216.34    DGRAM
93.184.216.34    RAW
```

这表示系统解析得到了 IPv4 地址 `93.184.216.34`。`dig` 的结果中关注 `ANSWER SECTION`；若有 `status: NOERROR` 且答案区列出了地址，DNS 查询成功。两种工具结果不同不一定说明 DNS 故障，可能是系统 hosts 配置、缓存或查询路径不同。修改后应使用 `getent` 和实际应用再次验证。

# 从端口确认服务

IP 地址表示主机，端口对应主机上的服务。`ss` 用来查看 socket（网络通信端点）；下面命令中的 `-l` 看监听中的端口，`-n` 保留数字地址和端口，`-t` 看 TCP，`-u` 看 UDP，`-p` 显示关联进程。需要同时查看监听和已建立等状态时，可以把 `-l` 换成 `-a`：

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

例如，监听列表可能有：

```text
State   Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN  0      511    0.0.0.0:80        0.0.0.0:*       users:(("nginx",pid=1234,fd=6))
```

这表示 nginx 正在 TCP 80 端口监听所有 IPv4 接口。若本机只能看到 `127.0.0.1:80`，服务只接受本机连接，远程客户端无法直接连接。`ss` 显示监听只证明本机服务已绑定端口，不证明防火墙、云安全组或远端路由允许访问。

```bash
systemctl status nginx
sudo ss -lntp | grep ':80 '
```

端口没有监听，应先检查服务配置和日志；端口在监听但外部超时，再检查访问控制和网络路径。

# 防火墙：决定允许哪些流量

Netfilter 是内核中的包过滤和网络转换能力，常见管理工具有 nftables、iptables 和 firewalld。它们可能处于不同管理层或使用不同后端；先查看规则和服务状态，确认系统使用哪一层，不要同时编辑多套规则。`nft list ruleset` 列出 nftables 规则；`firewall-cmd --state` 检查 firewalld 是否运行；`iptables --version` 可查看 iptables 命令及其后端提示：

```bash
sudo nft list ruleset
sudo firewall-cmd --state
iptables --version
```

firewalld 将规则分为运行时和永久配置。`--get-active-zones` 显示活动区域及关联接口，`--list-all` 查看区域当前开放的服务和端口，`--query-service` 检查某服务是否已放行。确认目标接口所在区域后，下面以 `public` 区域开放 HTTP：

```bash
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --zone=public --list-all
sudo firewall-cmd --zone=public --add-service=http
sudo firewall-cmd --zone=public --permanent --add-service=http
sudo firewall-cmd --reload
sudo firewall-cmd --zone=public --query-service=http
```

第一条 `--add-service=http` 立即添加运行时规则；带 `--permanent` 的命令写入永久配置；`--reload` 重新载入永久配置；最后的查询若返回 `yes`，表示服务规则已启用。注意，`http` 是 firewalld 预定义服务，通常对应 TCP 80。先确认服务本身监听，并从客户端验证后再持久化规则。生产环境应限制来源地址或网段，不要为了排障直接关闭防火墙。容器运行时和云平台安全组也可能有独立规则。

# NAT 与转发

普通主机只处理发给自己或由自己发出的流量。让 Linux 充当网关，还需要路由、内核转发、防火墙和 NAT 同时正确。`sysctl net.ipv4.ip_forward` 读取 IPv4 转发开关，结果 `= 1` 表示已启用，`= 0` 表示关闭；`sysctl -w` 可临时修改该值：

```bash
sysctl net.ipv4.ip_forward
sudo sysctl -w net.ipv4.ip_forward=1
```

这项设置重启后通常会恢复。SNAT 或 masquerade 修改出站源地址，DNAT 把进入的地址和端口转发给内部服务。NAT 不是防火墙，也不会自动启用转发；两端还必须有可返回的路由，否则会出现请求到达但响应回不来的单向连接。本节只说明概念，不建议在不了解网络拓扑时直接配置网关规则。

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

