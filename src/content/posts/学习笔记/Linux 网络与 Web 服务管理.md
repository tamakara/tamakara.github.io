---
title: Linux 网络与 Web 服务管理
published: 2026-09-12
image: ''
tags: [Linux, 网络, Nginx, Apache, Tomcat, MySQL, PostgreSQL, MongoDB, Redis, Kafka, 防火墙, 运维]
category: 学习笔记
---

> 本文以 RHEL / CentOS Stream 为主要环境，整理 Linux 服务器中的网络管理、防火墙、Web 服务、数据库以及常见基础服务。
>
> 内容重点放在实际运维中的服务部署、网络访问、防火墙规则、Nginx 配置、反向代理、缓存、负载均衡、数据库管理以及 Web 服务故障排查。

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
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                  Redis         Kafka       MySQL / PG
```

从运维角度看，可以把这一体系拆成几个层次：

| 类别 | 主要内容 | 典型组件 |
|---|---|---|
| 网络 | 网卡、IP、路由、端口、连接 | `ip`、`ss` |
| 防火墙 | 数据包过滤、NAT、访问控制 | iptables、nftables、firewalld |
| Web 服务 | HTTP、静态资源、反向代理 | Nginx、Apache |
| 应用服务 | Java Web 应用运行环境 | Tomcat |
| 数据库 | 持久化、查询、事务 | MySQL、PostgreSQL、MongoDB |
| 缓存 | 高速数据访问、Session | Redis |
| 消息与事件 | 异步通信、事件流 | Kafka、RabbitMQ |
| 服务管理 | 启动、停止、日志 | systemd、journal |

可以把一个完整系统理解成：

```text
网络
  ↓
防火墙
  ↓
Web Server
  ↓
应用服务
  ↓
缓存 / 消息
  ↓
数据库
```

实际运维工作中，经常需要回答：

> **请求有没有到达服务器 → 有没有被防火墙拦截 → Web 服务有没有正常监听 → 反向代理能不能连接后端 → 应用有没有正常运行 → 数据库和中间件是否正常。**

---

# Linux 网络管理

## 网络接口、IP 与路由

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

## 端口与网络连接

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

常见默认端口：

| 服务 | 常见端口 |
|---|---:|
| HTTP | 80 |
| HTTPS | 443 |
| SSH | 22 |
| Tomcat | 8080 |
| MySQL | 3306 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Redis | 6379 |
| Kafka | 9092 |

需要注意：

> **端口号本身并不能决定运行的是什么服务。**

例如任何程序都可以监听 `8080`，端口只是操作系统提供给网络服务进行通信的编号。

## 网络连通性与路径排查

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

常见工具：

```bash
ping 192.168.1.1
```

检查基本 IP 连通性。

```bash
traceroute example.com
```

观察到目标主机之间经过的路径。

```bash
ss -lntup
```

确认本机是否真的有服务监听目标端口。

更复杂时，可以使用 `tcpdump` 抓取数据包：

```bash
tcpdump -i eth0 port 80
```

可以帮助判断：

- 请求是否进入服务器
- 响应是否发出
- TCP 三次握手是否完成
- 哪一端没有继续发送数据

---

# Linux 防火墙

## 防火墙到底在做什么

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

基本流程：

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

# iptables 与 Netfilter

## Netfilter 是什么

`iptables` 并不是 Linux 内核中的防火墙本身。

Linux 内核提供的是 **Netfilter** 框架，它在网络协议栈的特定位置提供 Hook；用户空间工具再利用这些机制配置具体规则。

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

因此：

```text
Netfilter
   ↓
内核中的网络包处理框架

iptables
   ↓
传统的规则配置工具
```

---

## iptables 四表五链

iptables 最经典的知识点就是：

> **四表五链**

### 四张表

| 表 | 主要用途 | 典型场景 |
|---|---|---|
| `filter` | 数据包过滤 | 允许 / 拒绝 |
| `nat` | 地址转换 | SNAT / DNAT |
| `mangle` | 修改数据包属性 | TTL、标记等 |
| `raw` | 提前处理数据包 | 影响连接跟踪 |

其中最常用的是：

```text
filter
```

用于：

> **决定数据包是否允许通过。**

而：

```text
nat
```

主要用于：

> **处理源地址、目标地址以及相关 NAT 操作。**

### 五条链

| Chain | 作用 |
|---|---|
| `PREROUTING` | 数据包进入网络栈后的早期阶段 |
| `INPUT` | 发往本机的数据包 |
| `FORWARD` | 经由本机转发的数据包 |
| `OUTPUT` | 本机产生的数据包 |
| `POSTROUTING` | 数据包离开网络栈前的阶段 |

---

## 数据包经过 iptables 的路径

理解“四表五链”最重要的并不是死记，而是理解数据包路径。

### 发往本机

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

### 本机转发

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

### 本机主动发送

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

:::tip
不要把“五链”理解成五个独立的规则集合。

**链描述数据包所处的位置，表描述规则的功能。**

因此“表”和“链”是两个不同维度。
:::

---

## iptables 规则

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

常见 Target：

| Target | 含义 |
|---|---|
| `ACCEPT` | 接受 |
| `DROP` | 静默丢弃 |
| `REJECT` | 拒绝 |
| `LOG` | 记录日志 |
| `DNAT` | 目标地址转换 |
| `SNAT` | 源地址转换 |

---

## DROP 与 REJECT

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

所以可以简单理解为：

- `DROP`：直接丢弃，不主动返回拒绝信息
- `REJECT`：明确返回拒绝

两种行为在故障排查时产生的现象不同。

---

# NAT

NAT 是网络地址转换机制，在 Linux 防火墙体系中通常通过 Netfilter 相关机制实现。

## SNAT

SNAT 修改：

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

## DNAT

DNAT 修改：

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

因此常见端口映射可以理解成：

```text
公网 IP:80
   │
   ▼
NAT 网关
   │
   ▼
内网 IP:8080
```

---

# firewalld

## 为什么有了 iptables 还需要 firewalld

iptables 能力很强，但直接管理大量底层规则时复杂度较高。

firewalld 提供了更高层次的管理方式：

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

因此可以将它们理解成不同抽象层次：

```text
firewalld
   ↓
更高层的管理接口

nftables
   ↓
现代规则配置体系

Netfilter
   ↓
Linux 内核网络包处理框架
```

---

## Zone

firewalld 的核心概念之一是：

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

网络接口或来源可以关联到某个 Zone，由 Zone 决定允许哪些服务。

```text
                firewalld
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    public       internal      trusted
       │            │            │
    HTTP/HTTPS    内部服务       高信任
```

## 开放服务与端口

查看已允许的服务：

```bash
firewall-cmd --list-services
```

开放端口：

```bash
firewall-cmd --add-port=8080/tcp
```

永久配置：

```bash
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --reload
```

firewalld 区分运行时配置和永久配置，因此临时修改与持久化修改需要注意区别。

:::warning
在远程服务器上修改防火墙时，最危险的问题之一不是“规则写错”，而是：

> **把自己的 SSH 连接一起封掉。**

修改远程服务器防火墙前，应先确认管理连接和备用访问方式。
:::

---

# nftables

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
                 网络栈
```

学习路线可以是：

```text
Netfilter
   ↓
iptables 四表五链
   ↓
firewalld
   ↓
nftables
```

这样既能理解传统 Linux 防火墙，也能了解现代 Linux 的配置方式。

---

# Web 服务

## Web 服务器与应用服务器

Nginx、Apache、Tomcat 虽然都与 Web 应用有关，但职责并不相同。

| 组件 | 类型 | 主要职责 |
|---|---|---|
| Nginx | Web Server / Reverse Proxy | HTTP、静态资源、反向代理、负载均衡、缓存 |
| Apache HTTP Server | Web Server | HTTP、虚拟主机、模块化扩展 |
| Tomcat | Servlet 容器 | 运行 Java Web 应用 |
| Spring Boot | Java 应用框架 | 实际业务逻辑 |

一个常见架构：

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
  ▼
Java Application
```

---

# Nginx

## Nginx 是什么

Nginx 是常见的 Web 服务器和反向代理服务器。

典型用途：

- 静态资源
- HTTP / HTTPS
- 反向代理
- 负载均衡
- TLS 终止
- HTTP 缓存
- 请求转发

Nginx 采用 master / worker 进程模型。

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

- Master 负责配置和进程管理
- Worker 负责实际处理请求

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

一步完成：

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

## start、restart、reload

| 操作 | 含义 |
|---|---|
| `start` | 启动服务 |
| `stop` | 停止服务 |
| `restart` | 重新启动 |
| `reload` | 重新加载配置 |

修改 Nginx 配置时，通常：

```bash
nginx -t
systemctl reload nginx
```

---

# Nginx 配置结构

Nginx 配置可以理解为：

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

## server

表示一个虚拟服务器。

```nginx
server {
    listen 80;
    server_name example.com;
}
```

## location

决定不同 URL 路径如何处理。

```nginx
location /static/ {
    root /var/www;
}
```

## upstream

用于定义后端服务器组。

```nginx
upstream backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
}
```

---

# Nginx 静态资源管理

Nginx 最简单的用途就是直接提供静态文件。

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

适合：

- HTML
- CSS
- JavaScript
- 图片
- 字体
- 前端构建产物

---

# HTTP 状态码

HTTP 状态码是 Web 服务运维中必须掌握的内容。

一个 HTTP 响应通常包含：

```text
HTTP/1.1 200 OK
Content-Type: text/html

<html>...</html>
```

其中：

```text
200
```

就是状态码。

## 状态码分类

| 类别 | 含义 | 说明 |
|---|---|---|
| `1xx` | Informational | 信息响应 |
| `2xx` | Success | 请求成功 |
| `3xx` | Redirection | 重定向 |
| `4xx` | Client Error | 客户端请求存在问题 |
| `5xx` | Server Error | 服务端处理失败 |

## 常见状态码

| 状态码 | 含义 | 常见场景 |
|---|---|---|
| `200 OK` | 请求成功 | 正常页面、API |
| `201 Created` | 创建成功 | 创建资源 |
| `202 Accepted` | 已接受 | 异步任务 |
| `204 No Content` | 成功但无内容 | DELETE、部分更新 |
| `301 Moved Permanently` | 永久重定向 | 域名迁移、HTTP → HTTPS |
| `302 Found` | 临时重定向 | 登录跳转 |
| `304 Not Modified` | 资源未修改 | 浏览器缓存 |
| `307 Temporary Redirect` | 临时重定向 | 保留原请求方法 |
| `308 Permanent Redirect` | 永久重定向 | 保留原请求方法 |
| `400 Bad Request` | 请求错误 | 参数格式错误 |
| `401 Unauthorized` | 未认证 | 身份认证失败或缺失 |
| `403 Forbidden` | 禁止访问 | 权限不足 |
| `404 Not Found` | 资源不存在 | URL / 文件不存在 |
| `405 Method Not Allowed` | 方法不允许 | 请求方法不匹配 |
| `408 Request Timeout` | 请求超时 | 请求未及时完成 |
| `409 Conflict` | 请求冲突 | 资源状态冲突 |
| `413 Content Too Large` | 请求内容过大 | 文件上传过大 |
| `429 Too Many Requests` | 请求过多 | 限流 |
| `500 Internal Server Error` | 服务端内部错误 | 程序异常 |
| `501 Not Implemented` | 未实现 | 功能未实现 |
| `502 Bad Gateway` | 网关错误 | 上游服务异常 |
| `503 Service Unavailable` | 服务不可用 | 服务停机、过载、维护 |
| `504 Gateway Timeout` | 网关超时 | 上游响应超时 |

---

## 4xx 与 5xx

可以先建立一个简单判断：

```text
4xx
 ↓
请求已经到达服务端
但请求存在问题
```

例如：

```text
400
401
403
404
405
429
```

而：

```text
5xx
 ↓
服务器处理请求时出现问题
```

例如：

```text
500
502
503
504
```

---

## 502、503、504

### 502 Bad Gateway

通常表示：

> **Nginx 等网关在处理上游响应时发生错误。**

例如：

```text
Nginx
  │
  X────► Tomcat
```

常见原因：

- Tomcat 没启动
- 上游地址错误
- 上游端口错误
- 连接被拒绝
- 上游服务异常

排查：

```text
Nginx
 ↓
proxy_pass
 ↓
目标 IP / 端口
 ↓
Tomcat
```

### 503 Service Unavailable

表示：

> **当前服务暂时无法处理请求。**

可能与：

- 服务停机
- 服务过载
- 维护
- 上游暂时不可用

有关。

### 504 Gateway Timeout

表示：

> **网关等待上游服务响应超时。**

例如：

```text
Client
   │
   ▼
Nginx
   │
   │ 等待
   │
   ▼
Tomcat
   │
   └─────── 长时间没有响应
```

此时可以继续向下排查：

```text
Nginx
   ↓
Tomcat
   ↓
Java Application
   ↓
Redis / Kafka
   ↓
Database
```

:::important
看到 `502`、`503`、`504` 时，不应该简单地认为“**Nginx 出问题了**”。

Nginx 很可能只是把上游服务的问题表现成 HTTP 错误返回给客户端。
:::

---

# Nginx 反向代理

## 正向代理与反向代理

### 正向代理

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

### 反向代理

客户端只看到前端服务器：

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

Nginx 可以在这里承担：

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

---

# Nginx 动静分离

动静分离就是：

> **静态请求和动态请求交给不同组件处理。**

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

静态资源：

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

- 静态资源由 Nginx 直接返回
- API 请求交给 Tomcat
- 应用服务器不用处理大量简单静态资源请求

---

# Nginx 缓存

Nginx 的缓存可以从两个角度理解：

```text
                    Nginx
                      │
          ┌───────────┴───────────┐
          │                       │
      HTTP缓存控制             服务端缓存
          │                       │
      浏览器缓存             proxy_cache
      协商缓存               fastcgi_cache
```

## HTTP 缓存控制

Nginx 可以通过 HTTP 响应头告诉客户端：

> 这个资源是否可以缓存，以及缓存多久。

例如：

```nginx
location ~* \.(jpg|jpeg|png|gif|css|js)$ {
    expires 7d;
    add_header Cache-Control "public";
}
```

## 常见缓存 Header

| Header | 作用 |
|---|---|
| `Cache-Control` | 控制缓存行为 |
| `Expires` | 指定缓存过期时间 |
| `ETag` | 标识资源版本 |
| `Last-Modified` | 表示资源最后修改时间 |
| `If-None-Match` | 根据 ETag 判断资源是否变化 |
| `If-Modified-Since` | 根据修改时间判断资源是否变化 |

### ETag 与 304

第一次请求：

```text
浏览器
   │
   ▼
服务器
   │
   ├── ETag: "abc123"
   └── Cache-Control: max-age=3600
   │
   ▼
浏览器缓存
```

浏览器再次请求：

```http
If-None-Match: "abc123"
```

服务器发现资源没有变化：

```http
304 Not Modified
```

浏览器继续使用本地缓存。

:::tip
`304 Not Modified` 并不是请求失败。

它表示：

> **资源没有变化，可以继续使用缓存中的版本。**
:::

---

## Nginx 代理缓存

Nginx 还可以缓存后端服务器返回的 HTTP 响应。

```text
Client
   │
   ▼
Nginx
   │
   ├── 缓存命中 ──────► 直接返回
   │
   └── 缓存未命中
             │
             ▼
          Tomcat
             │
             ▼
          Nginx缓存
             │
             ▼
           Client
```

基本配置：

```nginx
proxy_cache_path /var/cache/nginx
    levels=1:2
    keys_zone=my_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;

server {
    location /api/ {
        proxy_cache my_cache;
        proxy_pass http://backend;
    }
}
```

核心指令：

| 指令 | 作用 |
|---|---|
| `proxy_cache_path` | 定义缓存目录和缓存区域 |
| `proxy_cache` | 指定使用的缓存区域 |
| `proxy_cache_valid` | 指定不同状态码的缓存时间 |
| `proxy_cache_key` | 定义缓存键 |
| `proxy_cache_bypass` | 满足条件时绕过缓存 |
| `proxy_no_cache` | 满足条件时不保存响应 |

例如：

```nginx
proxy_cache_valid 200 10m;
proxy_cache_valid 404 1m;
```

表示：

```text
200 → 缓存 10 分钟
404 → 缓存 1 分钟
```

## FastCGI 缓存

对于 FastCGI 后端，Nginx 还可以使用：

```text
fastcgi_cache
```

例如：

```text
Client
  │
  ▼
Nginx
  │
  ▼
PHP-FPM
```

因此 Nginx 缓存体系可以理解为：

| 缓存类型 | 缓存位置 | 典型用途 |
|---|---|---|
| 浏览器缓存 | 客户端 | CSS、JS、图片 |
| 代理缓存 | Nginx | 后端 HTTP 响应 |
| FastCGI 缓存 | Nginx | FastCGI 动态页面 |
| 应用缓存 | 应用 / Redis | 业务数据 |

:::important
**HTTP 缓存控制**和**Nginx 服务端缓存**不是同一个概念。

前者主要通过 HTTP Header 控制客户端如何使用资源；后者是 Nginx 自己保存后端响应。
:::

---

# Nginx 负载均衡

当一个 Tomcat 无法承担全部请求时，可以运行多个实例：

```text
                    Nginx
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Tomcat-1    Tomcat-2    Tomcat-3
       :8080        :8080        :8080
```

配置：

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

## 常见负载均衡方式

| 方式 | 思路 |
|---|---|
| Round Robin | 轮流分配 |
| Weighted | 根据权重分配 |
| Least Connections | 优先连接数较少的节点 |

例如：

```text
server A weight=3
server B weight=1
```

表示 A 的请求分配权重高于 B。

实际生产环境还需要考虑：

- 健康检查
- 节点故障摘除
- 会话保持
- 连接超时
- 重试
- 后端连接数

---

# HTTPS 与 TLS 终止

常见生产架构：

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

可以让 TLS 在 Nginx 处终止：

```text
HTTPS
 │
 ▼
Nginx
 │
 ├── TLS 解密
 │
 ▼
HTTP
 │
 ▼
Tomcat
```

这样后端应用可以专注于业务处理。

---

# Nginx 日志

Web 服务故障排查离不开日志。

Nginx 常见日志：

```text
access.log
error.log
```

## Access Log

访问日志通常记录：

- 客户端地址
- 请求方法
- URL
- HTTP 状态码
- 响应大小
- User-Agent
- Referer
- 请求时间等

例如：

```text
192.168.1.10 - - [12/Sep/2026:12:00:00 +0800]
"GET /api/user HTTP/1.1"
200
1024
```

它适合回答：

> **谁访问了什么、什么时候访问、返回了什么状态码。**

## Error Log

错误日志用于记录 Nginx 处理过程中的异常。

例如：

```text
connect() failed (111: Connection refused)
while connecting to upstream
```

这类日志通常说明需要进一步检查：

```text
Nginx
   │
   X────► 上游服务
```

---

# Apache HTTP Server

## Apache 是什么

这里的 Apache 指：

> **Apache HTTP Server**

它是经典的 HTTP Web 服务器。

主要能力包括：

- HTTP 服务
- 虚拟主机
- 模块化扩展
- URL 重写
- 代理
- SSL/TLS
- 日志
- 访问控制

## Apache 核心概念

Apache 的主要特点之一是：

> **模块化。**

例如：

```text
Apache
 │
 ├── MPM
 ├── mod_ssl
 ├── mod_proxy
 ├── mod_rewrite
 └── mod_http
```

其中 `mod_proxy` 可以提供代理和网关能力。

## Apache 安装与管理

```bash
dnf install httpd
```

启动：

```bash
systemctl enable --now httpd
```

查看：

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

# Apache 虚拟主机

一台服务器可以运行多个网站：

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

实际 Web 部署中最常见的是基于域名的 Name-based Virtual Host。

---

# Tomcat

## Tomcat 是什么

Tomcat 是 Java Web 中经典的 Servlet 容器。

它和 Nginx 的职责不同：

```text
Nginx
  → 接收 HTTP 请求、静态资源、反向代理

Tomcat
  → 运行 Java Web 应用
```

典型架构：

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

## Tomcat 核心结构

可以简化为：

```text
Server
└── Service
     ├── Connector
     └── Engine
          └── Host
               └── Context
```

可以理解为：

| 组件 | 作用 |
|---|---|
| `Server` | 顶层容器 |
| `Service` | 组织 Connector 与 Engine |
| `Connector` | 负责网络通信 |
| `Engine` | 处理请求 |
| `Host` | 虚拟主机 |
| `Context` | 具体 Web 应用 |

### Connector

Connector 可以理解为：

> **Tomcat 与外部网络之间的接口。**

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

一个 Tomcat 实例可以配置多个虚拟主机：

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

# Tomcat 部署

典型关系：

```text
JDK
 ↓
Tomcat
 ↓
WAR / Java Web Application
```

解压 Tomcat：

```bash
tar -xf apache-tomcat-*.tar.gz
```

启动：

```bash
bin/startup.sh
```

查看：

```bash
ps -ef | grep tomcat
```

Tomcat HTTP Connector 常见监听：

```text
8080
```

生产环境一般不会直接把 Tomcat 暴露给公网：

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

# 数据库

数据库是 Web 系统中负责**持久化业务数据**的核心基础服务。

典型链路：

```text
用户
 │
 ▼
Nginx
 │
 ▼
Tomcat / Application
 │
 ▼
Database
```

与缓存和消息系统不同：

```text
Redis
 ↓
偏高速访问 / 缓存

Kafka
 ↓
事件流 / 消息传递

MySQL / PostgreSQL / MongoDB
 ↓
数据持久化
```

---

# MySQL

## MySQL 是什么

MySQL 是常见的关系型数据库管理系统。

关系型数据库主要使用：

```text
数据库
 └── 表
      ├── 行
      └── 列
```

例如：

```text
users
┌────┬──────────┬─────┐
│ id │ username │ age │
├────┼──────────┼─────┤
│  1 │ alice    │ 20  │
│  2 │ bob      │ 21  │
└────┴──────────┴─────┘
```

常见特性：

- SQL
- 事务
- 索引
- 用户权限
- 主从复制
- 数据备份

## MySQL 安装

以 RHEL / CentOS Stream 为例：

```bash
dnf install mysql-server
```

启动：

```bash
systemctl enable --now mysqld
```

检查：

```bash
systemctl status mysqld
```

常见端口：

```text
3306
```

## MySQL 运维重点

学习 Linux 运维中的 MySQL，重点不应该只是 SQL 语法，而应该关注：

```text
MySQL
├── 安装
├── 服务管理
├── 端口
├── 配置文件
├── 数据目录
├── 用户与权限
├── 日志
├── 备份恢复
└── 性能排查
```

---

# PostgreSQL

## PostgreSQL 是什么

PostgreSQL 同样属于关系型数据库。

```text
PostgreSQL
   │
   ├── Database
   ├── Schema
   ├── Table
   ├── Index
   └── Transaction
```

常见特点：

- 强大的 SQL 能力
- 事务支持
- 丰富的数据类型
- 扩展机制
- JSON 数据处理
- GIS 等扩展能力

常见端口：

```text
5432
```

## PostgreSQL 运维重点

和 MySQL 类似，可以从：

```text
安装
 ↓
服务管理
 ↓
配置
 ↓
用户与权限
 ↓
数据库 / Schema
 ↓
日志
 ↓
备份
 ↓
性能
```

这些方向学习。

---

# MongoDB

## MongoDB 是什么

MongoDB 与 MySQL、PostgreSQL 不同，它属于文档型 NoSQL 数据库。

关系型数据库：

```text
Table
 ├── Row
 └── Column
```

MongoDB：

```text
Database
 └── Collection
      └── Document
```

例如：

```json
{
    "name": "alice",
    "age": 20,
    "skills": [
        "Linux",
        "Docker"
    ]
}
```

数据通常以 BSON 文档形式存储。

常见端口：

```text
27017
```

## MongoDB 适合什么场景

比较适合：

- 数据结构变化较大的系统
- 文档型数据
- 部分快速迭代业务
- JSON 风格数据

但并不是：

> “NoSQL 一定比 MySQL 快”。

选择数据库应该根据数据模型、事务需求、一致性要求、查询方式等因素决定。

---

# 三类数据库对比

| 数据库 | 类型 | 数据模型 | 常见端口 | 常见场景 |
|---|---|---|---:|---|
| MySQL | 关系型 | 表 / 行 / 列 | 3306 | Web 业务 |
| PostgreSQL | 关系型 | 表 / 行 / 列 | 5432 | 复杂业务、分析 |
| MongoDB | 文档型 NoSQL | Collection / Document | 27017 | 文档型数据 |

从运维角度，它们虽然类型不同，但都需要关注：

```text
服务
 ↓
端口
 ↓
配置
 ↓
数据目录
 ↓
日志
 ↓
权限
 ↓
备份
 ↓
性能
 ↓
高可用
```

---

# 数据库备份

数据库运维中非常重要的一点：

> **数据库正常运行，不代表数据就是安全的。**

典型备份思路：

```text
数据库
   │
   ├── 全量备份
   ├── 增量 / 日志
   └── 定期恢复验证
```

备份需要考虑：

- 备份频率
- 保存周期
- 存储位置
- 异地备份
- 恢复速度
- 恢复验证

:::warning
**备份成功 ≠ 数据一定可以恢复。**

真正可靠的备份必须定期进行恢复验证。
:::

---

# 缓存与消息服务

数据库之外，Web 系统中还经常出现：

```text
缓存
消息队列
事件流
```

典型组件：

```text
Redis
Kafka
RabbitMQ
```

它们通常可以统一理解为：

> **应用与数据库之间的基础服务。**

---

# Redis

## Redis 是什么

Redis 是典型的内存数据存储系统。

常见用途：

- 缓存
- Session
- 分布式锁
- 计数
- 排行榜
- 临时数据

典型架构：

```text
Application
   │
   ▼
 Redis
   │
   ▼
Database
```

## Redis 缓存

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

因此：

```text
Redis
 ↓
降低数据库访问压力
 ↓
提高热点数据访问速度
```

## Redis Session

多个应用实例可以共享 Redis 中的 Session：

```text
        Redis
       ▲     ▲
       │     │
    Tomcat1 Tomcat2
```

这样可以减少应用实例之间的状态依赖。

## Redis 运维重点

```text
Redis
├── 安装
├── 端口
├── 配置
├── 内存
├── 持久化
├── 用户 / ACL
├── 日志
└── 性能
```

常见端口：

```text
6379
```

---

# Kafka

## Kafka 是什么

Kafka 更准确地说是：

> **分布式事件流平台。**

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

## Kafka 核心概念

### Producer

消息生产者：

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

消息的逻辑分类：

```text
order-created
payment
user-login
```

### Partition

Topic 可以拆分成多个 Partition：

```text
Topic: order

├── Partition 0
├── Partition 1
├── Partition 2
└── Partition 3
```

Partition 是 Kafka 实现并行处理、数据分布和吞吐扩展的重要基础。

### Consumer

消费者读取消息：

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

### Consumer Group

多个消费者可以组成 Consumer Group：

```text
Topic
   │
   ├── Partition 0 ──► Consumer A
   ├── Partition 1 ──► Consumer B
   └── Partition 2 ──► Consumer C
```

同一个 Consumer Group 中的消费者可以共同处理一个 Topic。

---

# Kafka 与 RabbitMQ

Kafka 与 RabbitMQ 都可以实现消息异步处理，但设计思路有所不同。

| 特性 | Kafka | RabbitMQ |
|---|---|---|
| 核心定位 | 事件流平台 | 消息代理 |
| 高吞吐 | 很强 | 较强 |
| 消息持久化 | 核心能力 | 支持 |
| Partition | 核心概念 | 无对应概念 |
| Consumer Group | 核心概念 | 不同模型 |
| 常见场景 | 日志、事件流、大数据 | 任务队列、业务消息 |

例如：

```text
用户操作
   │
   ▼
 Kafka
 ├── 数据分析
 ├── 日志系统
 ├── 推荐系统
 └── 实时统计
```

---

# Kafka 基本部署

Kafka 服务通常运行在 Java 环境之上。

典型结构：

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

创建 Topic：

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

# Linux 服务管理

部署 Web、数据库、中间件后，最终都需要回到一个基本问题：

> **服务怎么运行？**

现代 Linux 通常使用 systemd。

## 基本操作

```bash
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl reload nginx
systemctl enable nginx
systemctl disable nginx
systemctl status nginx
```

查看是否开机启动：

```bash
systemctl is-enabled nginx
```

## 服务日志

```bash
journalctl -u nginx
```

实时查看：

```bash
journalctl -u nginx -f
```

不同服务通常还拥有自己的日志目录。

例如：

```text
Nginx
└── /var/log/nginx/

Apache
└── /var/log/httpd/

Tomcat
└── logs/

MySQL
└── 根据配置确定

PostgreSQL
└── 根据配置确定
```

因此排查服务时通常需要结合：

```text
systemctl
   +
监听端口
   +
配置文件
   +
服务日志
```

---

# Web 服务故障排查

假设用户访问：

```text
https://example.com
```

失败。

不要第一时间认定是 Nginx 出问题。

可以沿着完整链路排查。

## DNS

```text
域名
 ↓
DNS
 ↓
是否解析到正确 IP？
```

## 网络

```text
服务器 IP
 ↓
是否能够到达？
```

## 防火墙

```text
443
 ↓
是否被 firewalld / nftables 拦截？
```

## Nginx

```text
Nginx
 ↓
是否运行？
 ↓
是否监听 443？
 ↓
配置是否正确？
```

## 反向代理

```text
Nginx
 ↓
Tomcat
```

检查：

- `proxy_pass` 是否正确
- 上游 IP 是否正确
- 上游端口是否正确
- 后端服务是否监听

## 应用

```text
Tomcat
 ↓
Java Application
```

继续检查：

- 应用是否正常启动
- Java 是否异常
- 数据库是否正常
- Redis 是否正常
- Kafka 是否正常

最终链路：

```text
用户
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
Java Application
 │
 ├────► Redis
 │
 ├────► Kafka
 │
 └────► MySQL / PostgreSQL / MongoDB
```

---

# 常见故障现象与排查方向

| 现象 | 优先检查 |
|---|---|
| 无法连接服务器 | 网络、路由、防火墙 |
| `Connection refused` | 目标端口是否有服务监听 |
| `Timeout` | 网络、防火墙、服务处理时间 |
| `403` | 权限、访问控制、Web 配置 |
| `404` | URL、资源路径、路由 |
| `500` | 应用程序日志 |
| `502` | Nginx 与上游服务之间的连接 |
| `503` | 服务是否可用、是否过载 |
| `504` | 上游服务是否响应超时 |
| 数据库连接失败 | 数据库服务、端口、账号、权限 |
| Redis 连接失败 | Redis 服务、端口、认证、网络 |
| Kafka 消费异常 | Broker、Topic、Partition、Consumer Group |

---

# 一个完整的 Web 服务部署架构

把本文涉及的组件全部串起来，可以得到一个典型的 Linux Web 架构：

```text
                              Internet
                                  │
                              HTTPS :443
                                  │
                                  ▼
                         ┌────────────────┐
                         │     Nginx      │
                         │                │
                         │ 静态资源       │
                         │ 反向代理       │
                         │ HTTPS          │
                         │ 缓存           │
                         │ 负载均衡       │
                         └───────┬────────┘
                                 │
                                 ▼
                         ┌────────────────┐
                         │     Tomcat     │
                         │     :8080      │
                         └───────┬────────┘
                                 │
                      ┌──────────┼──────────┐
                      │          │          │
                      ▼          ▼          ▼
                   Redis       Kafka      Database
                   :6379       :9092       │
                                            │
                                 ┌──────────┼──────────┐
                                 ▼          ▼          ▼
                               MySQL       PostgreSQL  MongoDB
                                :3306        :5432      :27017
```

服务器本身：

```text
Internet
    │
    ▼
┌────────────────────┐
│ firewalld / nftables│
└──────────┬─────────┘
           │
           ▼
        Nginx
         :443
           │
           ▼
        Tomcat
         :8080
           │
     ┌─────┼─────────┐
     ▼     ▼         ▼
   Redis  Kafka    Database
```

从公网安全边界来看，通常只需要：

```text
公网
 │
 ├── 80  → Nginx
 └── 443 → Nginx
```

而：

```text
8080 → Tomcat
6379 → Redis
9092 → Kafka
3306 → MySQL
5432 → PostgreSQL
27017 → MongoDB
```

这些服务通常不应该直接暴露给整个公网，而应根据实际架构限制访问范围。

---

# 常见服务核心职责

| 类别 | 组件 | 核心职责 | 常见端口 |
|---|---|---|---:|
| 防火墙 | firewalld | 主机访问控制 | — |
| 防火墙 | nftables | 数据包规则管理 | — |
| 防火墙 | iptables | 传统规则管理 | — |
| Web | Nginx | Web、代理、缓存、负载均衡 | 80 / 443 |
| Web | Apache | HTTP、虚拟主机 | 80 / 443 |
| 应用 | Tomcat | Java Web 应用 | 8080 |
| 数据库 | MySQL | 关系型数据持久化 | 3306 |
| 数据库 | PostgreSQL | 关系型数据持久化 | 5432 |
| 数据库 | MongoDB | 文档型数据存储 | 27017 |
| 缓存 | Redis | 缓存、Session、KV | 6379 |
| 消息 | Kafka | 事件流、消息传递 | 9092 |
| 消息 | RabbitMQ | 消息代理、任务队列 | 5672 |

---

# 整体运维思维模型

学完这些内容之后，不应该只记：

```text
Nginx 是什么
Tomcat 是什么
MySQL 是什么
Kafka 是什么
iptables 四表五链是什么
```

更重要的是理解：

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
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
                  Redis      Kafka      Database
                                         │
                              ┌──────────┼──────────┐
                              ▼          ▼          ▼
                            MySQL       PG      MongoDB
```

出现问题时，再反向沿着链路检查：

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
 Java Application
      │
 ┌────┼─────────────┐
 ▼    ▼             ▼
Redis Kafka       Database
```

因此 Linux 运维真正需要掌握的不是某一条命令，而是：

> **知道请求经过哪些组件，知道每个组件负责什么，知道配置在哪里，知道服务如何启动，知道日志在哪里，以及出现故障时应该从哪一层开始定位。**

---

# 官方文档

## Linux / 防火墙

- [Red Hat Enterprise Linux — Configuring firewalld](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/)
- [Netfilter 官方项目](https://netfilter.org/)
- [Netfilter Documentation](https://netfilter.org/documentation/)

## Nginx

- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [Nginx HTTP Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [Nginx Proxy Module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

## Apache HTTP Server

- [Apache HTTP Server 2.4 Documentation](https://httpd.apache.org/docs/2.4/)
- [Virtual Host Documentation](https://httpd.apache.org/docs/2.4/vhosts/)
- [mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)

## Tomcat

- [Apache Tomcat Documentation](https://tomcat.apache.org/)
- [Tomcat Configuration Reference](https://tomcat.apache.org/tomcat-11.0-doc/config/)

## MySQL

- [MySQL Documentation](https://dev.mysql.com/doc/)

## PostgreSQL

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## MongoDB

- [MongoDB Documentation](https://www.mongodb.com/docs/)

## Redis

- [Redis Documentation](https://redis.io/docs/)

## Kafka

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Kafka Quickstart](https://kafka.apache.org/quickstart/)

## RabbitMQ

- [RabbitMQ Documentation](https://www.rabbitmq.com/docs)