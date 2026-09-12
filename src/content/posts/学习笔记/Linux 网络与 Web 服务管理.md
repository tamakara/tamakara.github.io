---
title: Linux 网络与 Web 服务管理
published: 2026-09-12
image: ''
tags: [Linux, 网络, Nginx, Apache, Tomcat, Kafka, 防火墙, 运维]
category: 学习笔记
---

> 本文以 RHEL / CentOS Stream 为主要环境，整理 Linux 服务器中网络管理、防火墙、Web 服务和常见中间件的基础知识与运维方法。
>
> 内容重点放在“**服务是怎么运行的、网络请求是怎么进入服务器的、不同组件如何协作，以及出现问题时应该从哪里排查**”。

## Linux 网络与服务管理概览

Linux 服务器上的网络服务并不是孤立存在的。

一个典型 Web 系统通常会经历这样的链路：

```text
                   Internet
                       │
                 DNS / HTTPS
                       │
                       ▼
                ┌─────────────┐
                │  防火墙      │
                │ firewalld    │
                │ nftables     │
                └──────┬──────┘
                       │
                       ▼
                ┌─────────────┐
                │    Nginx    │
                │ Web / Proxy │
                └──────┬──────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
      静态资源 / 页面        Tomcat / Java
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                       Redis            Kafka
                         │                 │
                         └────────┬────────┘
                                  ▼
                                数据库
```

从运维角度看，可以把这一体系拆成几个层次：

| 层次 | 主要内容 | 典型组件 |
|---|---|---|
| 网络接口 | IP、路由、端口、连接 | `ip`、`ss` |
| 网络控制 | 防火墙、NAT、访问控制 | iptables、nftables、firewalld |
| Web 服务 | HTTP 请求、静态资源 | Nginx、Apache |
| 应用服务 | Java Web 应用 | Tomcat、Spring Boot |
| 中间件 | 缓存、消息、异步处理 | Redis、Kafka、RabbitMQ |
| 服务管理 | 启动、停止、日志 | systemd、journal |

真正的运维工作，往往就是在这些组件之间定位：

> **请求有没有到达服务器 → 有没有被防火墙拦截 → 有没有到达 Web 服务 → Web 是否正确转发 → 应用有没有正常处理 → 中间件是否正常工作。**

---

## Linux 网络管理

### 网络接口、IP 与路由

Linux 中最基础的网络管理对象包括：

```text
网卡
 │
 ├── MAC 地址
 │
 ├── IPv4 / IPv6 地址
 │
 └── 网络接口状态
        │
        ▼
      路由表
        │
        ▼
     下一跳 / 网关
```

查看网络接口和地址：

```bash
ip addr
```

查看路由：

```bash
ip route
```

查看指定接口：

```bash
ip addr show eth0
```

查看默认路由：

```bash
ip route | grep default
```

例如：

```text
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0
```

表示：

- `192.168.1.0/24` 是本地直连网络
- 访问其他网络时默认交给 `192.168.1.1`
- 数据包从 `eth0` 发出

### 端口与网络连接

IP 地址解决的是：

> **数据应该送到哪台主机？**

端口解决的是：

> **这台主机上的哪个服务？**

查看监听端口：

```bash
ss -lntup
```

例如：

```text
LISTEN 0 128 0.0.0.0:80
LISTEN 0 128 0.0.0.0:443
LISTEN 0 128 127.0.0.1:8080
```

通常可以理解为：

```text
80    → HTTP
443   → HTTPS
8080  → 常见 Java Web / Tomcat 服务
```

但需要注意：

> **端口号本身并不能决定运行的是什么服务。**

例如任何程序都可以监听 `8080`，端口只是操作系统提供给网络服务进行通信的编号。

### 网络连通性与路径排查

基础排查通常按照：

```text
本机接口
   ↓
本地路由
   ↓
默认网关
   ↓
远端主机
   ↓
目标端口
   ↓
具体应用
```

常见工具包括：

```bash
ping 192.168.1.1
```

检查 IP 层基本连通性。

```bash
traceroute example.com
```

观察到目标主机之间经过的路径。

```bash
ss -lntup
```

确认本机是否真的有服务监听目标端口。

对于更复杂的问题，还可以使用 `tcpdump` 对数据包进行抓取：

```bash
tcpdump -i eth0 port 80
```

它可以帮助判断：

- 请求是否进入服务器
- 响应是否发出
- TCP 三次握手是否完成
- 哪一端没有继续发送数据

---

## Linux 防火墙

### 防火墙到底在做什么

防火墙本质上是在网络数据包经过主机时，根据规则判断：

```text
允许
拒绝
丢弃
修改
转发
```

典型判断条件包括：

| 条件 | 示例 |
|---|---|
| 源 IP | `192.168.1.10` |
| 目标 IP | `10.0.0.20` |
| 协议 | TCP / UDP / ICMP |
| 源端口 | `54321` |
| 目标端口 | `80` / `443` |
| 接口 | `eth0` |
| 连接状态 | NEW / ESTABLISHED |

因此：

```text
网络请求
   │
   ▼
防火墙规则
   │
 ┌─┴────────┐
 │          │
允许       拒绝
 │          │
 ▼          X
服务程序
```

---

## iptables 与 Netfilter

### Netfilter 是什么

`iptables` 并不是 Linux 内核中的防火墙本身。

Linux 内核提供的是 **Netfilter** 框架，它在网络协议栈的特定位置提供 Hook；用户空间程序再利用这些机制配置具体规则。

可以理解为：

```text
Linux Kernel
└── Netfilter
      ├── packet filtering
      ├── NAT
      ├── packet mangling
      └── connection tracking

          ▲
          │
      用户空间
          │
      iptables
```

Netfilter 官方说明中，iptables 是用于定义规则集的传统工具，而 nftables 是其后继体系。

### iptables 四表五链

iptables 最经典的知识点就是：

> **四表五链**

#### 四张表

| 表 | 主要用途 | 典型场景 |
|---|---|---|
| `filter` | 数据包过滤 | 允许 / 拒绝 |
| `nat` | 地址转换 | SNAT / DNAT |
| `mangle` | 修改数据包属性 | TTL、标记等 |
| `raw` | 提前处理数据包 | 影响连接跟踪 |

其中最核心的是：

```text
filter
```

用于控制：

> **这个数据包到底让不让通过？**

而：

```text
nat
```

主要负责：

> **数据包的地址和端口是否需要转换？**

#### 五条链

| Chain | 作用 |
|---|---|
| `PREROUTING` | 数据包刚进入网络栈 |
| `INPUT` | 发往本机 |
| `FORWARD` | 经过本机继续转发 |
| `OUTPUT` | 本机产生的数据包 |
| `POSTROUTING` | 数据包准备离开网络栈 |

### 数据包经过 iptables 的路径

理解“四表五链”最重要的并不是死记，而是理解数据包路径。

#### 发往本机

```text
网卡
  │
  ▼
PREROUTING
  │
  ▼
路由判断
  │
  ▼
INPUT
  │
  ▼
本机应用
```

#### 本机转发

```text
网卡
  │
  ▼
PREROUTING
  │
  ▼
路由判断
  │
  ▼
FORWARD
  │
  ▼
POSTROUTING
  │
  ▼
网卡
```

#### 本机主动发送

```text
本机应用
  │
  ▼
OUTPUT
  │
  ▼
POSTROUTING
  │
  ▼
网卡
```

这三条路径基本构成了理解 Linux 防火墙的核心。

:::tip
不要把“五链”理解成五个独立的规则集合。

**链描述数据包所处的位置，表描述规则的功能。**

因此“表”和“链”是两个不同维度。
:::

### iptables 规则

一个基本规则可以写成：

```bash
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
```

可以拆开理解：

```text
-A INPUT
   ↓
把规则添加到 INPUT 链

-p tcp
   ↓
匹配 TCP

--dport 80
   ↓
目标端口 80

-j ACCEPT
   ↓
匹配成功后接受
```

常见动作：

| Target | 含义 |
|---|---|
| `ACCEPT` | 接受 |
| `DROP` | 静默丢弃 |
| `REJECT` | 拒绝并通常返回错误信息 |
| `LOG` | 记录日志 |
| `DNAT` | 目标地址转换 |
| `SNAT` | 源地址转换 |

### DROP 与 REJECT

两者都可以阻止连接，但行为不同。

```text
DROP
客户端 ───────X
        没有响应
```

```text
REJECT
客户端 ───────X
        收到拒绝
```

所以：

- `DROP` 更像“直接不理你”
- `REJECT` 更像“明确告诉你不允许”

在故障排查中，两种行为产生的现象也不同。

---

## iptables 中的 NAT

NAT 是防火墙体系中非常重要的一部分。

最常见的是：

```text
内网主机
192.168.1.100
     │
     ▼
NAT 网关
203.0.113.10
     │
     ▼
Internet
```

### SNAT

修改：

```text
源地址
```

例如：

```text
192.168.1.100:50000
        ↓
203.0.113.10:50000
```

常用于：

> 内网主机访问公网。

### DNAT

修改：

```text
目标地址
```

例如：

```text
203.0.113.10:80
        ↓
192.168.1.100:8080
```

常用于：

> 公网请求进入内网服务器。

这也是很多端口映射、端口转发的基础。

---

## firewalld

### 为什么有了 iptables 还需要 firewalld

iptables 的问题并不是能力不足，而是：

> **直接管理大量底层规则时，复杂度比较高。**

firewalld 在此之上提供了更加抽象的管理方式。

```text
管理员
   │
   ▼
firewalld
   │
   ▼
防火墙规则体系
   │
   ▼
nftables / Netfilter
```

在现代 RHEL 中，firewalld 与 nftables 是主要的防火墙管理体系；对于复杂、高性能的场景，也可以直接使用 nftables。

### Zone

firewalld 最核心的概念之一是：

> **Zone**

不同 Zone 表示不同的信任级别。

例如：

```text
public
internal
external
trusted
drop
block
```

网络接口或来源地址可以关联到某个 Zone，然后由该 Zone 定义允许什么流量。

```text
                firewalld
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    public       internal      trusted
       │            │            │
    HTTP/HTTPS    内部服务       高信任
```

### 开放服务与端口

firewalld 可以直接按照服务管理：

```bash
firewall-cmd --list-services
```

或者直接放行端口：

```bash
firewall-cmd --add-port=8080/tcp
```

永久配置：

```bash
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --reload
```

firewalld 将运行时配置和永久配置分开管理，因此临时修改与持久化修改需要区别对待。

:::warning
在远程服务器上修改防火墙时，最危险的问题之一不是“规则写错”，而是：

> **把自己的 SSH 连接一起封掉。**

因此修改远程主机防火墙时，应始终先确认管理连接和备用访问方式。
:::

---

## nftables 与现代 Linux 防火墙

现代 Linux 防火墙体系可以理解为：

```text
                 Netfilter
                    │
        ┌───────────┴───────────┐
        │                       │
   iptables                 nftables
    传统体系                   新体系
        │                       │
        └───────────┬───────────┘
                    │
                 内核网络栈
```

需要特别注意：

> **学习 iptables 依然非常重要，因为“四表五链”是理解 Linux 防火墙历史与网络数据包处理流程的经典知识。**

但在较新的 RHEL 系统中，iptables 传统框架已经不再是推荐的新防火墙配置模型。

因此学习顺序可以是：

```text
Netfilter
   ↓
iptables 四表五链
   ↓
firewalld
   ↓
nftables
```

这样既能应对传统面试题，也能理解现代 Linux。

---

# Web 服务体系

## Web 服务器与应用服务器

不要把 Nginx、Apache、Tomcat 当成完全相同的软件。

| 组件 | 类型 | 主要职责 |
|---|---|---|
| Nginx | Web Server / Reverse Proxy | HTTP、静态资源、反向代理、负载均衡 |
| Apache HTTP Server | Web Server | HTTP、虚拟主机、模块化扩展 |
| Tomcat | Servlet 容器 / Java Web 容器 | 执行 Java Web 应用 |
| Spring Boot | Java 应用框架 | 实际业务逻辑 |
| Kafka | 消息与事件流平台 | 异步通信、消息传递 |
| Redis | 内存数据存储 | 缓存、Session、计数等 |
| RabbitMQ | 消息代理 | 消息队列、异步通信 |

一个常见系统架构：

```text
Client
  │
  │ HTTPS
  ▼
Nginx :443
  │
  │ Reverse Proxy
  ▼
Tomcat :8080
  │
  ├──────► Redis :6379
  │
  ├──────► Kafka :9092
  │
  └──────► MySQL :3306
```

这也是 Linux 运维中最常见的一类服务组合。

---

## Nginx

### Nginx 是什么

Nginx 是高性能的 Web 服务器和反向代理服务器。

它的典型用途包括：

- 提供静态资源
- HTTP / HTTPS 服务
- 反向代理
- 负载均衡
- TLS 终止
- 请求转发

Nginx 采用 master/worker 进程模型，由 master 管理配置和 worker，worker 实际处理请求。

### Nginx 进程模型

```text
                 Master
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       Worker   Worker   Worker
          │        │        │
          └────────┴────────┘
                 请求
```

通常：

- Master 负责读取配置、管理 Worker
- Worker 负责处理客户端请求

---

## Nginx 安装

以 RHEL / CentOS Stream 为例：

```bash
dnf install nginx
```

启动：

```bash
systemctl start nginx
```

设置开机启动：

```bash
systemctl enable nginx
```

也可以一步完成：

```bash
systemctl enable --now nginx
```

检查：

```bash
systemctl status nginx
```

测试配置：

```bash
nginx -t
```

重新加载：

```bash
systemctl reload nginx
```

### start、restart、reload 的区别

| 操作 | 含义 |
|---|---|
| `start` | 启动服务 |
| `stop` | 停止服务 |
| `restart` | 停止后重新启动 |
| `reload` | 重新读取配置，尽量不中断已有连接 |

修改 Nginx 配置时，优先使用：

```bash
nginx -t
systemctl reload nginx
```

而不是每次直接 `restart`。

---

## Nginx 配置结构

Nginx 配置核心是：

```text
nginx.conf
   │
   ├── events
   │
   └── http
         │
         ├── server
         │      └── location
         │
         └── upstream
```

例如：

```nginx
http {
    server {
        listen 80;
        server_name example.com;

        location / {
            root /usr/share/nginx/html;
        }
    }
}
```

这里可以理解成：

```text
http
 └── server
      ├── listen
      ├── server_name
      └── location
```

### server

表示一个虚拟服务器。

### location

决定某个 URL 路径应该如何处理。

例如：

```nginx
location /static/ {
    root /var/www;
}
```

### upstream

用于定义后端服务器组。

```nginx
upstream backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
}
```

---

## Nginx 静态资源服务

最简单的 Nginx 用途就是：

```text
浏览器
   │
   ▼
Nginx
   │
   ▼
/var/www/html
   │
   ├── index.html
   ├── css/
   ├── js/
   └── images/
```

配置示例：

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

---

## 反向代理

### 正向代理与反向代理

#### 正向代理

客户端知道自己在访问代理：

```text
Client
   │
   ▼
Proxy
   │
   ▼
Internet
```

典型用途是：

> 客户端通过代理访问外部资源。

#### 反向代理

客户端并不知道后面的真实服务器：

```text
Client
   │
   ▼
Nginx
   │
   ▼
Backend Server
```

例如：

```text
https://example.com/api/users
              │
              ▼
         Nginx :443
              │
              ▼
         Tomcat :8080
```

客户端访问的是 Nginx，Nginx 再把请求转发给后端。

---

## Nginx 反向代理

配置：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

请求流程：

```text
浏览器
   │
   │ GET /api/user
   ▼
Nginx :80
   │
   │ proxy
   ▼
Tomcat :8080
   │
   ▼
Java 应用
```

这种架构的意义在于：

```text
客户端
   │
   ▼
Nginx
   ├── TLS
   ├── 静态资源
   ├── 访问控制
   ├── 限流
   └── 反向代理
           │
           ▼
       应用服务器
```

于是应用服务器不需要直接暴露在公网。

---

## 动静分离

“动静分离”本质上就是：

> **静态请求和动态请求交给不同的组件处理。**

例如：

```text
                   Nginx
                     │
          ┌──────────┴──────────┐
          │                     │
     /static/*                /api/*
          │                     │
          ▼                     ▼
    静态文件目录              Tomcat
                                │
                                ▼
                            Java 应用
```

Nginx：

```nginx
location /static/ {
    root /var/www;
}
```

动态请求：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080;
}
```

这样：

- HTML / CSS / JS / 图片直接由 Nginx 返回
- API 请求交给 Tomcat
- 可以减少应用服务器处理简单静态资源的压力

---

## Nginx 负载均衡

当一个 Tomcat 已经不足以处理所有请求时，可以增加多个实例：

```text
                    Nginx
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Tomcat-1    Tomcat-2    Tomcat-3
       :8080        :8080        :8080
```

Nginx：

```nginx
upstream backend {
    server 192.168.1.101:8080;
    server 192.168.1.102:8080;
    server 192.168.1.103:8080;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
    }
}
```

Nginx 支持多种 HTTP 负载均衡机制，包括轮询、最少连接以及基于权重的方式。

### 常见负载均衡方式

| 方式 | 思路 |
|---|---|
| Round Robin | 轮流发送 |
| Weighted | 按权重分配 |
| Least Connections | 优先连接数较少的节点 |

例如：

```text
server A weight=3
server B weight=1
```

表示 A 的请求分配权重高于 B。

---

## HTTPS 与 TLS 终止

常见生产架构是：

```text
Client
  │
  │ HTTPS :443
  ▼
Nginx
  │
  │ HTTP :8080
  ▼
Tomcat
```

也就是说：

> TLS 加密在 Nginx 终止。

Nginx 负责：

```text
HTTPS
 │
 ▼
TLS 解密
 │
 ▼
HTTP
 │
 ▼
Tomcat
```

这样后端应用可以专注于业务逻辑，而不用每个实例都单独处理公网 TLS。

---

# Apache HTTP Server

## Apache 是什么

这里的 Apache 指：

> **Apache HTTP Server**

它是经典的 HTTP Web 服务器。

Apache 官方文档提供了：

- HTTP 配置
- 虚拟主机
- 模块
- 访问控制
- 代理
- SSL/TLS
- URL 重写
- 日志
- 性能调优

等完整内容。

---

## Apache 核心概念

Apache 最大的特点之一是：

> **模块化。**

常见功能通过模块实现，例如：

```text
Apache
 │
 ├── MPM
 ├── mod_ssl
 ├── mod_proxy
 ├── mod_rewrite
 └── mod_http
```

其中 `mod_proxy` 可以提供代理和网关能力，并支持负载均衡相关功能。

---

## Apache 安装与管理

```bash
dnf install httpd
```

启动：

```bash
systemctl enable --now httpd
```

查看状态：

```bash
systemctl status httpd
```

配置文件通常位于：

```text
/etc/httpd/
```

日志通常位于：

```text
/var/log/httpd/
```

---

## Apache 虚拟主机

当一台服务器上运行多个网站时，可以使用 Virtual Host：

```text
                 Apache
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   site-a.com  site-b.com  site-c.com
```

例如：

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example
</VirtualHost>
```

Apache 支持基于 IP 和基于名称的虚拟主机，其中现代 Web 部署更常见的是基于域名的 Name-based Virtual Host。

---

# Tomcat

## Tomcat 是什么

Tomcat 是 Java Web 中非常经典的 Servlet 容器。

它和 Nginx 的定位不同：

```text
Nginx
  → 接收 HTTP 请求、代理、静态资源

Tomcat
  → 运行 Java Web 应用
```

可以理解为：

```text
Browser
   │
   ▼
Nginx
   │
   ▼
Tomcat
   │
   ▼
Spring / Servlet Application
```

---

## Tomcat 核心结构

Tomcat 的结构可以简化为：

```text
Server
└── Service
     ├── Connector
     └── Engine
          └── Host
               └── Context
```

官方 Tomcat 文档中：

- `Server` 是顶层容器
- `Service` 将 Connector 与 Engine 组合在一起
- `Connector` 负责与外部客户端通信
- `Engine` 负责处理请求
- `Host` 表示虚拟主机
- `Context` 对应具体 Web 应用

### Connector

Connector 可以理解为：

> **Tomcat 与网络之间的接口。**

例如：

```text
Client
   │
   ▼
Connector :8080
   │
   ▼
Engine
```

### Host

一个 Tomcat 实例可以配置多个虚拟主机。

```text
Engine
 ├── Host A
 │    └── Application
 │
 └── Host B
      └── Application
```

### Context

Context 对应具体 Web 应用。

---

## Tomcat 部署

Tomcat 常见方式是：

```text
JDK
 ↓
Tomcat
 ↓
WAR / Java Web Application
```

安装 JDK 后解压 Tomcat：

```bash
tar -xf apache-tomcat-*.tar.gz
```

然后通过 Tomcat 的启动脚本：

```bash
bin/startup.sh
```

查看进程：

```bash
ps -ef | grep tomcat
```

默认情况下，Tomcat HTTP Connector 常见监听：

```text
8080
```

生产环境里通常不会直接把 Tomcat 暴露给公网，而是：

```text
Internet
    │
    ▼
Nginx :443
    │
    ▼
Tomcat :8080
```

---

# Linux 服务管理

部署 Web 服务以后，还必须考虑：

> **服务怎么启动、停止、重启、开机自动启动，以及异常之后如何排查。**

现代 Linux 通常使用 systemd。

## 基本管理

```bash
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl reload nginx
systemctl enable nginx
systemctl disable nginx
systemctl status nginx
```

查看启动状态：

```bash
systemctl is-enabled nginx
```

### 日志

systemd 管理的服务通常可以通过：

```bash
journalctl -u nginx
```

查看日志。

实时查看：

```bash
journalctl -u nginx -f
```

因此一个基本的服务排查流程可以变成：

```text
服务访问失败
     │
     ▼
systemctl status
     │
     ▼
服务是否运行？
     │
 ┌───┴───┐
否       是
│         │
▼         ▼
启动失败   查看监听端口
│         │
▼         ▼
journalctl   检查防火墙
             │
             ▼
          检查应用日志
```

---

# 常见中间件

## 为什么需要中间件

随着系统复杂度提高：

```text
用户请求
   │
   ▼
Web
   │
   ▼
业务应用
   │
   ├──── 缓存
   ├──── 数据库
   ├──── 消息队列
   ├──── 搜索
   └──── 分布式任务
```

应用程序不应该把所有能力全部自己实现。

因此出现了大量：

> **为应用提供通用能力的基础软件。**

这类软件通常被称为：

> Middleware，中间件。

---

## 常见中间件分类

| 类型 | 典型组件 | 主要用途 |
|---|---|---|
| 缓存 | Redis | 缓存、Session、计数 |
| 消息队列 | RabbitMQ | 异步通信 |
| 消息 / 事件流 | Kafka | 高吞吐事件处理 |
| 数据库 | MySQL、PostgreSQL | 持久化数据 |
| 搜索 | Elasticsearch | 全文检索、日志分析 |
| 注册 / 配置 | Nacos、Consul | 服务发现、配置管理 |

---

# Redis

Redis 是典型的内存数据存储。

常见用途：

```text
数据库
  ▲
  │
Redis
  ▲
  │
应用
```

### 常见用途

#### 缓存

```text
请求
 │
 ▼
Redis
 │
 ├── 命中 → 直接返回
 │
 └── 未命中
       │
       ▼
     MySQL
```

#### Session

多个应用实例共享 Session：

```text
        Redis
       ▲     ▲
       │     │
    Tomcat1 Tomcat2
```

这样用户不需要固定绑定到某一个应用实例。

---

# Kafka

## Kafka 是什么

Kafka 更准确地说是：

> **分布式事件流平台。**

Kafka 官方文档将其用于读取、写入、存储和处理事件；事件被组织到 Topic 中，并由 Broker 持久化保存。

典型模型：

```text
Producer
    │
    ▼
 Kafka
    │
 Topic
    │
 ├────────────┐
 ▼            ▼
Consumer A  Consumer B
```

---

## Kafka 核心概念

### Producer

生产消息：

```text
Application
     │
     ▼
 Producer
```

### Broker

Kafka 服务节点：

```text
Kafka Cluster
 ├── Broker 1
 ├── Broker 2
 └── Broker 3
```

### Topic

消息的逻辑分类。

例如：

```text
order-created
payment
user-login
```

### Partition

Topic 可以进一步拆分为多个 Partition：

```text
Topic: order

├── Partition 0
├── Partition 1
├── Partition 2
└── Partition 3
```

Partition 是 Kafka 实现：

- 并行处理
- 扩展吞吐
- 数据分布

的重要基础。

### Consumer

消费者从 Topic 中读取消息：

```text
Producer
   │
   ▼
 Topic
   │
 ├── Consumer A
 ├── Consumer B
 └── Consumer C
```

---

## Kafka 与传统消息队列

Kafka 与 RabbitMQ 都可以做消息异步处理，但设计思路不同。

| 特性 | Kafka | RabbitMQ |
|---|---|---|
| 核心定位 | 事件流平台 | 消息代理 |
| 高吞吐 | 很强 | 较强 |
| 消息持久化 | 核心能力 | 支持 |
| Topic / Partition | 核心概念 | 不同模型 |
| 消费模型 | Consumer Group | Consumer |
| 常见场景 | 日志、事件流、大数据 | 业务消息、任务队列 |

Kafka 更适合：

```text
大量事件
   ↓
持续写入
   ↓
多个消费者分别处理
```

例如：

```text
用户行为
   │
   ▼
 Kafka
 ├── 数据分析
 ├── 日志系统
 ├── 推荐系统
 └── 实时统计
```

---

# Kafka 基本部署思路

现代 Kafka 使用 KRaft 架构进行集群元数据管理。

Kafka 服务通常依赖 Java 环境。

典型部署结构：

```text
JDK
 │
 ▼
Kafka
 │
 ├── Broker
 ├── Topic
 ├── Partition
 └── Consumer Group
```

例如启动 Kafka 后，可以创建 Topic：

```bash
bin/kafka-topics.sh \
  --create \
  --topic test \
  --bootstrap-server localhost:9092
```

生产消息：

```bash
bin/kafka-console-producer.sh \
  --topic test \
  --bootstrap-server localhost:9092
```

消费消息：

```bash
bin/kafka-console-consumer.sh \
  --topic test \
  --bootstrap-server localhost:9092 \
  --from-beginning
```

---

# 一个完整的 Web 服务部署架构

把前面的知识全部串起来，可以得到一个比较典型的 Linux Web 架构：

```text
                         Internet
                             │
                         HTTPS :443
                             │
                             ▼
                     ┌─────────────┐
                     │    Nginx    │
                     │ Reverse     │
                     │ Proxy       │
                     └──────┬──────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
          Static Resource          Tomcat
             /static/                :8080
                                      │
                                      ▼
                                Java Application
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                       Redis        Kafka        MySQL
                         │            │
                         │       ┌────┴────┐
                         │       ▼         ▼
                         │    Consumer   Consumer
                         │
                         └───────────────┘
```

服务器本身则处于防火墙保护之下：

```text
Internet
    │
    ▼
┌───────────────┐
│ firewalld /   │
│ nftables      │
└───────┬───────┘
        │
        ▼
     Nginx
     :443
        │
        ▼
    Tomcat
    :8080
        │
        ├── Redis :6379
        ├── Kafka :9092
        └── MySQL :3306
```

这种架构中，可以形成非常明确的安全边界：

```text
公网
 │
 ├── 443  → Nginx
 │
 └── 80   → Nginx

内网 / 本机
 │
 ├── 8080 → Tomcat
 ├── 6379 → Redis
 ├── 9092 → Kafka
 └── 3306 → MySQL
```

也就是说：

> **不是每个服务都需要暴露给公网。**

通常只需要开放真正需要对外提供服务的端口。

---

# Web 服务故障排查

当用户访问：

```text
https://example.com
```

失败时，不要直接认为是 Nginx 有问题。

可以沿着请求链逐层排查。

## 第一层：DNS

```text
域名
 ↓
是否解析到正确 IP？
```

## 第二层：网络

```text
服务器 IP
 ↓
是否能够到达？
```

## 第三层：防火墙

```text
443
 ↓
是否被 firewalld / nftables 拦截？
```

## 第四层：Nginx

```text
Nginx
 ↓
是否启动？
 ↓
是否监听 443？
 ↓
配置是否正确？
```

## 第五层：反向代理

```text
Nginx
 ↓
Tomcat
```

检查：

- 上游地址是否正确
- 上游端口是否正确
- 后端是否监听
- 连接是否能够建立

## 第六层：应用

```text
Tomcat
 ↓
Java Application
```

继续检查：

- 应用是否启动
- Java 是否异常
- 数据库是否正常
- Redis 是否正常
- Kafka 是否正常

因此：

```text
用户访问失败
      │
      ▼
     DNS
      │
      ▼
    网络
      │
      ▼
    防火墙
      │
      ▼
    Nginx
      │
      ▼
    Tomcat
      │
      ▼
    Java
      │
 ┌────┼────┐
 ▼    ▼    ▼
Redis Kafka DB
```

这就是实际运维中非常重要的：

> **按链路、按层次排查问题。**

---

# 常见服务的核心职责

最后可以把本文涉及的组件放到同一张表里理解：

| 组件 | 解决什么问题 | 常见端口 | 典型位置 |
|---|---|---:|---|
| firewalld | 主机网络访问控制 | — | 主机入口 |
| nftables | 底层数据包过滤 | — | 内核网络栈 |
| iptables | 传统防火墙规则管理 | — | Netfilter |
| Nginx | Web、代理、负载均衡 | 80 / 443 | Web 层 |
| Apache | Web 服务 | 80 / 443 | Web 层 |
| Tomcat | Java Web 应用运行环境 | 8080 | 应用层 |
| Redis | 缓存、内存数据 | 6379 | 中间件 |
| Kafka | 事件流、消息传递 | 9092 | 中间件 |
| RabbitMQ | 消息队列 | 5672 | 中间件 |
| MySQL | 持久化数据 | 3306 | 数据层 |

这里需要牢记一个非常重要的关系：

```text
iptables / nftables / firewalld
        ↓
控制“网络能不能进来”

Nginx / Apache
        ↓
处理 HTTP 请求

Tomcat
        ↓
运行 Java Web 应用

Redis / Kafka / RabbitMQ
        ↓
提供通用基础能力

MySQL / PostgreSQL
        ↓
保存业务数据
```

---

# 一个运维视角下的完整思维模型

学完这些组件后，不应该只记：

```text
Nginx 是什么
Tomcat 是什么
Kafka 是什么
iptables 四表五链是什么
```

更重要的是把它们连起来：

```text
                    用户请求
                       │
                       ▼
                    DNS
                       │
                       ▼
                 公网 IP :443
                       │
                       ▼
              ┌─────────────────┐
              │ Linux Firewall  │
              │ firewalld/nft   │
              └────────┬────────┘
                       │
                       ▼
                    Nginx
               ┌───────┴───────┐
               │               │
          静态资源           反向代理
                               │
                               ▼
                            Tomcat
                               │
                      ┌────────┼────────┐
                      ▼        ▼        ▼
                    Redis    Kafka    MySQL
```

因此，一名 Linux / 运维工程师真正需要掌握的并不是某一条命令，而是：

> **知道一个请求经过哪些组件，知道每个组件负责什么，知道配置在哪里，知道服务如何启动，知道日志在哪里，以及出现故障时应该在哪一层定位。**

## 官方文档

### Linux / 防火墙

- [Red Hat Enterprise Linux — Configuring firewalld](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/)
- [Netfilter 官方项目](https://netfilter.org/)
- [iptables / Netfilter 相关文档](https://netfilter.org/documentation/)

### Nginx

- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [Nginx HTTP Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)

### Apache HTTP Server

- [Apache HTTP Server 2.4 Documentation](https://httpd.apache.org/docs/2.4/)
- [Virtual Host Documentation](https://httpd.apache.org/docs/2.4/vhosts/)
- [mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)

### Tomcat

- [Apache Tomcat Documentation](https://tomcat.apache.org/)
- [Tomcat Configuration Reference](https://tomcat.apache.org/tomcat-11.0-doc/config/)

### Kafka

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Kafka Quickstart](https://kafka.apache.org/quickstart/)