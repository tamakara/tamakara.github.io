---
title: Linux：网络管理
published: 2026-09-13T09:46:16Z
description: 'Linux 网络管理包括接口与地址配置、路由、名称解析、访问控制和服务连通性验证。'
updated: 2026-09-19
image: ''
tags: [Linux, 网络, 网络管理, Netfilter, iptables, firewalld, nftables, TCP/IP]
category: 学习笔记
draft: false
lang: ''
---

Linux 网络管理包括接口与地址配置、路由、名称解析、访问控制和服务连通性验证。排障时应沿实际请求路径收集证据，不把一个工具的成功当成整条链路正常。

# 接口、地址与路由

```bash title="查看当前网络状态"
ip -br link
ip -br address
ip route
ip -6 route
ip route get 192.0.2.10
```

最后一条中的地址是文档示例，使用时替换为真实目标。输出中的接口、下一跳和源地址可以解释请求预计从哪里发出；策略路由、网络命名空间和应用绑定地址可能使实际路径不同。

接口为 UP 不一定有可用链路；还要观察 LOWER_UP、地址和路由。地址前缀决定本地网段，默认路由只在没有更具体匹配时使用。

## 临时配置与持久配置

`ip address`、`ip route` 修改运行时状态，通常不会自动写入持久配置。持久管理可能由 NetworkManager、systemd-networkd、Netplan 或云初始化工具负责；先确认管理者，避免互相覆盖。

使用 NetworkManager 的系统可先查看：

```bash
nmcli device status
nmcli connection show
```

远程修改地址、默认路由或 DNS 前，应确认连接名称、现有配置和恢复控制台。修改连接配置后还需激活并重新验证，不能只凭配置文件内容判断已生效。

# 名称解析与应用请求

```bash
getent ahosts example.com
dig example.com A
curl -v --connect-timeout 5 --max-time 15 https://example.com/
```

`getent` 经过系统名称服务配置，可能使用 hosts 文件；`dig` 主要检查 DNS。二者结果不同并不必然是 DNS 服务器故障。使用 systemd-resolved 时，可用 `resolvectl status` 确认各接口的解析设置。

`curl -v` 可区分解析、连接、TLS 和 HTTP 处理阶段。不要默认增加 `-k`，否则会跳过证书验证，掩盖实际问题。`curl -I` 发送 HEAD 请求，并非所有服务都与 GET 行为一致。

| 工具 | 能提供的证据 | 不能据此断言 |
| --- | --- | --- |
| ping | ICMP Echo 是否收到回复及往返时间 | 应用端口正常；无回复也不代表主机离线 |
| traceroute | 探测收到的中间节点响应 | 星号就是断点；返回路径与去程一定相同 |
| ss | 本机 socket、监听地址及状态 | 外部一定能访问 |
| tcpdump | 捕获点和过滤条件下观察到的报文 | 包一定到达应用或物理线路另一端 |
| curl | 一次具体应用请求的结果 | 所有来源、协议版本和后端都正常 |

# 防火墙体系

| 层次 | 对象 | 职责 |
| --- | --- | --- |
| 内核基础设施 | Netfilter | 提供包处理挂钩、连接跟踪和 NAT 等能力 |
| 规则体系与工具 | nftables / nft | 通过表、链和规则组织策略 |
| 兼容或传统接口 | iptables、ip6tables | 可能使用 legacy 或 nft 后端 |
| 策略管理服务 | firewalld | 提供 zone、service、运行时及永久配置等抽象 |

不要混用多个管理者随意修改同一套规则。先确认系统、容器平台和云平台分别维护哪些规则。`iptables --version` 可辅助识别后端。

## 数据包路径

```text
外部访问本机：prerouting → 路由判断 → input → 本地进程
经本机转发：  prerouting → 路由判断 → forward → postrouting
本机发起请求：本地进程 → output → 后续路由处理 → postrouting
```

这是常见 IP 路径的简化模型。判断规则位置时，先确认流量是访问本机还是经本机转发；容器发布端口可能走转发路径，不能只检查 input。

iptables 的“表”按处理用途组织，例如 filter 和 nat；nftables 的表是对象容器，基础链通过 hook 和 priority 连接到处理路径。不要把“四表五链”当作所有现代防火墙的完整模型。

## 只读检查

```bash
sudo nft list ruleset
sudo iptables -L -n -v
sudo firewall-cmd --get-active-zones
```

按实际使用的工具选择命令。检查接口或来源所属区域、规则顺序、计数器和默认策略。`accept` 在某条基础链通过，不保证后续其他链不会丢弃；不能只找到一条允许规则便结束检查。

# firewalld 开放服务示例

假设系统正在使用 firewalld，已确认目标接口属于 `public`，业务要求允许该区域来源访问 HTTP，且服务确实监听 TCP 80：

```bash
sudo firewall-cmd --zone=public --list-all
sudo firewall-cmd --zone=public --add-service=http
sudo firewall-cmd --zone=public --query-service=http
```

从目标客户端发起 HTTP 请求，确认业务响应，再将同一变更持久化：

```bash
sudo firewall-cmd --permanent --zone=public --add-service=http
sudo firewall-cmd --permanent --zone=public --query-service=http
```

两次修改分别作用于运行时和永久配置，此处不需要额外 reload。reload 会从永久配置重建运行时状态，可能丢失其他临时修改。若只允许指定来源，应采用相应来源规则，而不是向整个区域开放。

# NAT 与转发

| 类型 | 修改对象 | 典型用途 |
| --- | --- | --- |
| SNAT | 源地址，可同时转换端口 | 内网共享固定出口地址 |
| masquerade | 按出口接口地址执行源地址转换 | 出口地址动态变化 |
| DNAT | 目标地址，可同时转换端口 | 将入口端口转发到内部服务 |

状态型 NAT 通常为连接建立转换映射，后续报文复用连接跟踪状态。NAT 不等于过滤，也不自动启用路由转发。

部署 Linux 网关需共同满足：双向路由正确、相应协议的转发开启、forward 策略允许、NAT 规则匹配，并有可行的返回路径。IPv4 可用 `sysctl net.ipv4.ip_forward` 检查，IPv6 转发有独立设置。不要在不了解当前拓扑时直接套用网关规则。

# 按症状排查

| 现象 | 优先检查 | 下一步 |
| --- | --- | --- |
| 域名无法解析 | 系统解析配置、DNS 返回码 | 对比 getent 与 dig，确认解析器及记录类型 |
| 连接超时 | 出口路由、访问控制、返回路径 | 两端同时抓包缩小范围 |
| 连接被拒绝 | 监听地址、端口、主动拒绝规则 | 用 ss 和服务日志确认 |
| TCP 成功但 TLS 失败 | 域名、SNI、证书链、时间 | 保留证书验证定位原因 |
| HTTP 502/504 | 代理到上游的连接和处理时间 | 检查上游日志，避免直接调大超时 |

有限抓包示例，替换接口、客户端地址和端口：

```bash
sudo tcpdump -ni eth0 -c 50 'host 192.0.2.20 and tcp port 8080'
```

没有 SYN 时，先确认接口、命名空间和过滤条件，再检查前向路径；有 SYN 无响应时检查本机规则、监听和返回路由；SYN/ACK 发出却没有后续 ACK 时重点核对回程。TLS 加密后的 HTTP 内容不能靠普通抓包直接读取。

# 参考资料

- [ip(8)](https://man7.org/linux/man-pages/man8/ip.8.html)
- [nftables：配置链](https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains)
- [firewalld：运行时与永久配置](https://firewalld.org/documentation/configuration/runtime-versus-permanent.html)
- [curl 手册](https://curl.se/docs/manpage.html)
