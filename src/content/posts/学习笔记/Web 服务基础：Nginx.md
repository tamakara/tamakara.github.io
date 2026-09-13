---
title: Web 服务基础：Nginx
published: 2026-09-13T11:09:45Z
description: ''
image: ''
tags: [Web, Nginx, HTTP, HTTPS, 反向代理, 负载均衡, 缓存]
category: 学习笔记
draft: false
lang: ''
---

> Nginx 是 Linux 环境中非常常见的 Web 服务器和反向代理软件。它既可以直接提供静态网站，也可以作为应用服务器前面的统一入口，负责 HTTPS、反向代理、缓存、负载均衡、访问控制和日志处理。
>
> 本文从 Nginx 的安装和配置结构开始，逐步介绍**静态资源托管、反向代理、动静分离、HTTPS 与 TLS、HTTP 缓存、代理缓存、负载均衡、日志分析、限流与连接控制以及性能优化**，建立完整的 Nginx 运维认知。

## Nginx 是什么

Nginx 是一个高性能的：

```text
HTTP Web Server
Reverse Proxy
Content Cache
Load Balancer
```

同时也支持：

```text
TCP / UDP Proxy
Mail Proxy
```

等能力。

官方文档将 Nginx 定义为：

> **HTTP Web Server、Reverse Proxy、Content Cache、Load Balancer 等。**

因此 Nginx 不应该只理解成：

```text
“一个 Web 服务器”
```

更准确的理解是：

```text
                    Nginx
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
   Web Server      Reverse Proxy    Load Balancer
       │               │                │
       ▼               ▼                ▼
 静态资源 / 网站     后端应用          多实例
```

官方首页：[nginx.org](https://nginx.org/)。

---

# 为什么需要 Nginx

假设一台服务器运行：

```text
Java Application
```

它可能直接监听：

```text
8080
```

客户端访问：

```text
http://server:8080
```

完全可以工作。

但生产环境中通常希望：

```text
客户端
   │
   │ HTTPS :443
   ▼
 Nginx
   │
   │ HTTP / HTTPS
   ▼
Application :8080
```

这样 Nginx 可以承担：

```text
HTTPS
静态文件
域名分流
访问日志
反向代理
缓存
负载均衡
限流
```

后端应用则专注于：

```text
业务逻辑
```

于是形成：

```text
Client
  │
  ▼
Nginx
  │
  ▼
Application
```

---

# Nginx 的基本架构

Nginx 与传统“一进程一个请求”的服务器模型不同。

Nginx 的典型运行结构是：

```text
             Master Process
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
     Worker      Worker      Worker
     Process     Process     Process
```

官方 Beginner's Guide 介绍了这种：

```text
master process
+
worker processes
```

的基本架构，其中 Master 主要负责读取配置和维护 Worker，Worker 负责实际处理请求。[Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)

这种架构非常适合高并发网络服务。

---

# 安装 Nginx

不同 Linux 发行版的安装方式不同。

## Debian / Ubuntu

可以直接通过系统软件包管理器：

```bash
sudo apt update
sudo apt install nginx
```

安装完成后：

```bash
nginx -v
```

查看版本。

---

## RHEL / Rocky Linux / AlmaLinux

可以使用：

```bash
sudo dnf install nginx
```

然后：

```bash
nginx -v
```

查看版本。

不同发行版提供的 Nginx 版本可能不同。如果需要特定版本，应进一步考虑官方仓库或发行版仓库的版本策略，而不要默认认为系统仓库一定是最新版本。

---

# 启动与停止 Nginx

如果系统使用 systemd，可以：

```bash
sudo systemctl start nginx
```

查看状态：

```bash
sudo systemctl status nginx
```

停止：

```bash
sudo systemctl stop nginx
```

重启：

```bash
sudo systemctl restart nginx
```

设置开机启动：

```bash
sudo systemctl enable nginx
```

---

# reload 与 restart

修改配置后，不一定需要：

```bash
systemctl restart nginx
```

通常更适合：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

先测试配置：

```bash
nginx -t
```

如果配置合法，再：

```bash
systemctl reload nginx
```

可以减少对已有连接和服务的影响。

因此：

```text
修改配置
   ↓
nginx -t
   ↓
配置正确？
   │
   ├── 否 → 修复配置
   │
   └── 是
        ↓
      reload
```

Nginx 官方 Beginner's Guide 也将配置测试、启动、停止和重新加载作为基本管理流程。[Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)

---

# Nginx 配置文件

不同发行版的配置目录可能存在差异。

常见位置：

```text
/etc/nginx/
```

其中可能包含：

```text
/etc/nginx/nginx.conf
/etc/nginx/conf.d/
/etc/nginx/sites-available/
/etc/nginx/sites-enabled/
```

例如 Debian / Ubuntu 系统中，经常使用：

```text
sites-available
sites-enabled
```

组织虚拟主机配置。

---

# Nginx 配置结构

Nginx 配置不是传统意义上的：

```text
key=value
```

而是一套：

> **指令（Directive） + 上下文（Context）**

结构。

例如：

```nginx
http {
    server {
        listen 80;

        location / {
            root /var/www/html;
        }
    }
}
```

可以理解成：

```text
main
 │
 └── http
      │
      └── server
           │
           └── location
```

---

## http

```nginx
http {
}
```

通常用于定义：

```text
HTTP 服务相关配置
```

例如：

```text
MIME
日志
缓存
server
upstream
```

等。

---

## server

```nginx
server {
}
```

可以理解为：

> 一个虚拟服务器配置。

例如：

```nginx
server {
    listen 80;
    server_name example.com;
}
```

它可以根据：

```text
IP
Port
Host
```

等信息匹配请求。

---

## location

```nginx
location / {
}
```

用于根据请求 URI 匹配不同处理逻辑。

例如：

```nginx
location /api/ {
    proxy_pass http://backend;
}

location /static/ {
    root /var/www;
}
```

于是：

```text
/api/
↓
后端应用

/static/
↓
静态文件
```

这也是 Nginx 实现：

> **反向代理 + 动静分离**

的重要基础。

---

# 静态资源与网站托管

## 什么是静态资源

静态资源指服务器可以直接返回、通常不需要经过业务计算生成的文件。

例如：

```text
HTML
CSS
JavaScript
图片
字体
视频
下载文件
```

例如：

```text
/var/www/html/

├── index.html
├── css/
├── js/
└── images/
```

Nginx 可以直接提供这些内容。

---

# root

例如：

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/html;
}
```

客户端请求：

```text
GET /index.html
```

Nginx 会根据：

```text
root
+
URI
```

寻找对应文件。

可以简单理解为：

```text
URI
/index.html
    │
    ▼
root
/var/www/html
    │
    ▼
/var/www/html/index.html
```

Nginx 官方静态文件文档对 `root`、URI 与文件路径之间的对应关系有详细说明。[Serve Static Content](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)

---

# index

如果用户访问：

```text
/
```

可以使用：

```nginx
index index.html;
```

例如：

```nginx
server {
    root /var/www/html;
    index index.html;
}
```

那么：

```text
GET /
```

可能最终返回：

```text
/var/www/html/index.html
```

---

# 静态网站完整配置

一个简单的网站：

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/example;
    index index.html;
}
```

目录：

```text
/var/www/example/
├── index.html
├── css/
├── js/
└── images/
```

请求：

```text
http://example.com/
```

过程：

```text
Client
   │
   │ HTTP Request
   ▼
Nginx
   │
   │ 查找静态文件
   ▼
/var/www/example/index.html
   │
   ▼
HTTP Response
   │
   ▼
Client
```

---

# 反向代理

## 什么是反向代理

Nginx 可以把收到的 HTTP 请求转发给后端服务器。

例如：

```text
Client
   │
   │ HTTP
   ▼
Nginx
   │
   │ proxy
   ▼
Backend :8080
```

Nginx 对客户端而言是：

> **服务端入口。**

后端应用则位于：

```text
Nginx
↓
Upstream
```

后面。

---

# proxy_pass

最基本的反向代理配置：

```nginx
server {
    listen 80;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

客户端访问：

```text
http://example.com/api
```

Nginx 接收到请求后，可以把请求转发给：

```text
http://127.0.0.1:8080
```

Nginx 官方 `ngx_http_proxy_module` 文档中，`proxy_pass` 用于设置被代理服务器的协议和地址。[ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

# 请求头转发

反向代理环境中，Nginx 通常需要向后端传递原始请求中的一些信息。

例如：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

这样后端应用可以知道：

```text
原始 Host
客户端 IP
代理链
原始协议
```

等信息。

特别是：

```text
X-Forwarded-For
```

在存在多层代理时非常重要。

---

# 反向代理的请求路径

假设：

```text
Client
IP = 192.168.1.10
```

访问：

```text
https://example.com/api/users
```

结构：

```text
Client
   │
   │ HTTPS
   ▼
Nginx :443
   │
   │ HTTP
   ▼
Tomcat :8080
   │
   ▼
Java Application
```

可以理解为：

```text
TLS
↓
Nginx
↓
解密
↓
HTTP Request
↓
proxy_pass
↓
Tomcat
```

这也是生产环境中常见的：

> **TLS Termination**

模式。

---

# 动静分离

## 什么是动静分离

在实际 Web 系统中：

```text
静态资源
```

和：

```text
动态请求
```

通常不需要由同一个程序处理。

例如：

```text
/static/
↓
Nginx

/api/
↓
Tomcat
```

于是：

```text
Client
   │
   ▼
Nginx
   │
   ├── /static/ ─────► 静态文件
   │
   └── /api/ ────────► Backend
```

这就是典型的：

> **动静分离**

---

## 动静分离配置

例如：

```nginx
server {
    listen 80;
    server_name example.com;

    location /static/ {
        root /var/www/example;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

这样：

```text
/static/app.js
```

由：

```text
Nginx
```

直接提供。

而：

```text
/api/users
```

交给：

```text
Backend
```

处理。

---

# HTTPS 与 TLS

## HTTPS 在 Nginx 中是什么

生产环境中经常让：

```text
Nginx
```

直接负责：

```text
TLS
```

形成：

```text
Client
   │
   │ HTTPS
   ▼
Nginx
   │
   │ HTTP / HTTPS
   ▼
Backend
```

这叫：

> **TLS Termination**

这样后端应用可以不直接承担公网 TLS 连接。

---

# HTTPS 配置

一个最基本的 Nginx HTTPS 配置：

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/nginx/certs/example.com.crt;
    ssl_certificate_key /etc/nginx/certs/example.com.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

官方 Nginx HTTPS 配置文档中，HTTPS Server 至少需要：

```text
listen ... ssl
ssl_certificate
ssl_certificate_key
```

等相关配置。[Configuring HTTPS Servers](https://nginx.org/en/docs/http/configuring_https_servers.html)

---

# 证书与私钥

HTTPS 最重要的两个文件：

```text
Certificate
Private Key
```

例如：

```text
example.com.crt
example.com.key
```

其中：

```text
Certificate
↓
可以发送给客户端

Private Key
↓
必须严格保护
```

Nginx 的官方文档也明确要求私钥受到限制，并且需要让 Nginx 的 Master Process 能够读取。[Configuring HTTPS Servers](https://nginx.org/en/docs/http/configuring_https_servers.html)

---

# TLS 版本

现代环境通常至少考虑：

```text
TLS 1.2
TLS 1.3
```

例如：

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

不要在没有明确兼容性需求的情况下继续启用过时的 SSL / TLS 版本。

---

# HTTP → HTTPS

实际网站中经常需要将：

```text
http://example.com
```

重定向到：

```text
https://example.com
```

例如：

```nginx
server {
    listen 80;
    server_name example.com;

    return 301 https://$host$request_uri;
}
```

流程：

```text
HTTP
 │
 ▼
301
 │
 ▼
HTTPS
```

---

# HTTP 缓存

## 为什么需要缓存

假设用户反复请求：

```text
app.js
style.css
logo.png
```

这些资源很少变化。

如果每次都重新生成和发送：

```text
Server
 ↓
Disk
 ↓
Application
 ↓
Network
```

会浪费资源。

因此可以利用：

> **HTTP Cache**

减少重复传输。

---

# Cache-Control

HTTP 缓存通常通过响应头控制。

例如：

```http
Cache-Control: max-age=3600
```

表示：

```text
该响应可以按照缓存规则缓存一段时间
```

Nginx 可以通过：

```nginx
expires
```

等配置帮助生成缓存相关响应头。

例如：

```nginx
location ~* \.(css|js|png|jpg|jpeg|gif|svg)$ {
    expires 7d;
}
```

这样静态资源可以拥有较长的浏览器缓存时间。

---

# Cache-Control 与 Nginx 缓存

需要区分两个概念：

```text
浏览器缓存
```

与：

```text
Nginx Proxy Cache
```

前者是：

```text
Client
↓
保存响应
```

后者则是：

```text
Nginx
↓
保存后端响应
```

二者不是同一种缓存。

可以理解为：

```text
          Response
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
 Browser Cache   Nginx Cache
```

---

# 代理缓存

## 为什么需要 Proxy Cache

假设：

```text
1000 个客户端
```

请求：

```text
/api/data
```

如果每次都转发到：

```text
Backend
```

后端压力会很大。

可以让 Nginx：

```text
第一次
Client → Nginx → Backend
             ↓
           Cache

后续
Client → Nginx
             ↓
           Cache
```

这样后端可以少处理大量重复请求。

---

# proxy_cache_path

Nginx 可以配置：

```nginx
proxy_cache_path /var/cache/nginx
                 levels=1:2
                 keys_zone=my_cache:10m
                 max_size=1g
                 inactive=60m
                 use_temp_path=off;
```

其中：

```text
/var/cache/nginx
↓
缓存文件目录

keys_zone
↓
缓存元数据共享内存区域

max_size
↓
缓存大小限制

inactive
↓
长期未访问缓存的处理时间
```

官方 `ngx_http_proxy_module` 对 `proxy_cache_path` 和 `proxy_cache` 等指令进行了详细说明。[ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

# proxy_cache

例如：

```nginx
proxy_cache_path /var/cache/nginx
                 keys_zone=my_cache:10m
                 max_size=1g
                 inactive=60m;

server {
    location /api/ {
        proxy_pass http://backend;

        proxy_cache my_cache;
        proxy_cache_valid 200 10m;
    }
}
```

可以理解为：

```text
Request
   │
   ▼
Nginx
   │
   ├── Cache Hit ──► 直接返回
   │
   └── Cache Miss
          │
          ▼
       Backend
          │
          ▼
        Response
          │
          ▼
        Cache
```

---

# 哪些内容不适合随便缓存

代理缓存并不是：

```text
所有响应都缓存
```

例如：

```text
用户登录
购物车
个人信息
订单状态
实时数据
```

通常需要非常谨慎处理。

特别是包含：

```text
Cookie
Authorization
Set-Cookie
```

等用户状态信息的响应。

因此缓存策略必须结合：

```text
请求
响应
用户身份
Cache-Control
业务语义
```

共同设计。

Nginx 官方文档也提供了 `proxy_no_cache`、`proxy_cache_bypass`、`proxy_ignore_headers` 等控制机制，用于处理具体缓存策略。[ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

# 负载均衡

## 为什么需要负载均衡

假设只有一个后端：

```text
Nginx
   │
   ▼
App 1
```

所有请求都进入：

```text
App 1
```

当流量增加后，可以运行多个实例：

```text
             Nginx
                │
       ┌────────┼────────┐
       │        │        │
       ▼        ▼        ▼
     App 1    App 2    App 3
```

Nginx 就可以承担：

> **Load Balancer**

角色。

---

# upstream

Nginx 使用：

```nginx
upstream
```

定义后端服务器组。

例如：

```nginx
upstream backend {
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
}
```

然后：

```nginx
server {
    listen 80;

    location / {
        proxy_pass http://backend;
    }
}
```

请求就会被分配给：

```text
App 1
App 2
App 3
```

---

# Round Robin

默认情况下，Nginx HTTP upstream 使用：

> **Round Robin**

即轮询：

```text
Request 1 → App 1
Request 2 → App 2
Request 3 → App 3
Request 4 → App 1
Request 5 → App 2
```

官方 Nginx 负载均衡文档明确说明，未特别配置时默认使用 Round Robin。[Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html)

---

# Weight

可以为不同服务器设置权重：

```nginx
upstream backend {
    server 127.0.0.1:8081 weight=3;
    server 127.0.0.1:8082 weight=1;
}
```

可以粗略理解为：

```text
App 1
↓
权重 3

App 2
↓
权重 1
```

因此 App 1 获得更多请求。

适合：

```text
机器性能不同
实例规格不同
```

等场景。

---

# Least Connections

可以使用：

```nginx
upstream backend {
    least_conn;

    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}
```

它会倾向于选择：

> **当前活跃连接较少的后端。**

适用于：

```text
请求处理时间差异较大
```

的场景。

Nginx 官方文档将 `least_conn` 作为一种可选 HTTP 负载均衡算法。[Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html)

---

# ip_hash

还可以：

```nginx
upstream backend {
    ip_hash;

    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}
```

根据客户端 IP 进行哈希，使相同来源更倾向于访问相同后端。

这可以在某些：

```text
会话粘滞
```

场景中使用。

不过：

> **如果应用本身支持无状态设计或共享 Session，就不应该为了“方便”而默认依赖 IP Hash。**

---

# 后端故障处理

Nginx 还会对 upstream 的失败情况进行一定程度的处理。

例如：

```text
App 1
↓
连续请求失败
↓
Nginx 暂时减少选择
```

相关参数包括：

```text
max_fails
fail_timeout
proxy_next_upstream
```

Nginx 官方文档把这些机制称为：

> **in-band / passive health checks**

即根据实际请求的失败情况判断后端是否暂时不可用。[Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html)

需要注意：

> 开源 Nginx 与 NGINX Plus 在主动健康检查等高级能力上存在差异。

---

# 日志

## 为什么日志重要

Web 服务排障中，日志非常重要。

Nginx 常见日志：

```text
access.log
error.log
```

---

# Access Log

Access Log 记录客户端请求。

例如可以包含：

```text
客户端 IP
时间
请求方法
URI
状态码
响应大小
Referer
User-Agent
响应时间
```

典型：

```text
192.168.1.10
"GET /index.html HTTP/1.1"
200
1024
```

---

## log_format

Nginx 可以自定义日志格式。

例如：

```nginx
log_format main
    '$remote_addr - $remote_user [$time_local] '
    '"$request" $status $body_bytes_sent '
    '"$http_referer" "$http_user_agent" '
    '$request_time';
```

然后：

```nginx
access_log /var/log/nginx/access.log main;
```

其中：

```text
$request_time
```

可以帮助观察：

> **Nginx 从收到请求到完成处理的时间。**

---

# Error Log

Error Log 主要记录：

```text
配置问题
连接错误
代理错误
文件错误
权限问题
运行异常
```

例如反向代理：

```text
connect() failed
```

就可能意味着：

```text
Nginx
   │
   │ 连接
   ▼
Backend
   X
```

后端没有正常接受连接。

---

# 日志与请求分析

日志不仅用于：

```text
“出了问题以后查原因”
```

也可以用于：

```text
性能分析
流量分析
攻击分析
访问趋势分析
```

例如：

```text
状态码统计
```

可以发现：

```text
200
↓
正常请求

404
↓
资源不存在

499
↓
客户端提前关闭连接

500
↓
应用错误

502
↓
上游响应异常

503
↓
服务不可用

504
↓
上游超时
```

因此日志本质上是：

> **观察 Web 服务行为的重要数据源。**

---

# 限流

## 为什么需要限流

假设某个接口：

```text
/api/login
```

突然收到：

```text
10000 requests/s
```

如果应用只能处理：

```text
1000 requests/s
```

就可能导致：

```text
CPU 飙高
连接堆积
线程耗尽
数据库压力增加
服务雪崩
```

因此需要：

> **Rate Limiting**

---

# limit_req

Nginx 可以使用：

```nginx
limit_req_zone
```

和：

```nginx
limit_req
```

实现请求速率限制。

例如：

```nginx
limit_req_zone $binary_remote_addr
                zone=api_limit:10m
                rate=10r/s;
```

然后：

```nginx
location /api/ {
    limit_req zone=api_limit;
}
```

可以理解为：

```text
客户端
   │
   │ Requests
   ▼
Nginx
   │
   ├── 正常速率 → Backend
   │
   └── 超过限制 → 延迟 / 拒绝
```

具体行为取决于相关参数配置。

---

# limit_conn

除了限制：

```text
请求速率
```

还可以限制：

```text
并发连接数
```

例如：

```nginx
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    limit_conn addr 20;
}
```

可以理解为：

```text
同一来源
↓
最多允许一定数量的并发连接
```

因此：

```text
limit_req
↓
限制请求速率

limit_conn
↓
限制并发连接
```

是两个不同的概念。

---

# 响应速率限制

Nginx 还可以限制向客户端发送响应数据的速度。

例如：

```nginx
location /download/ {
    limit_rate 1m;
}
```

可以用于控制：

```text
下载速度
```

但：

> **连接数限制、请求速率限制和响应带宽限制不是同一个维度。**

不要把：

```text
limit_req
limit_conn
limit_rate
```

混为一谈。

Nginx 核心模块文档分别定义了这些能力。[ngx_http_core_module](https://nginx.org/en/docs/http/ngx_http_core_module.html)

---

# 性能优化

## 性能优化的核心

Nginx 本身已经是面向高并发设计的服务器。

因此：

> **性能优化不应该理解成“把所有参数调大”。**

真正的优化应该建立在：

```text
测量
 ↓
定位瓶颈
 ↓
修改配置
 ↓
再次测量
```

之上。

---

# Worker Processes

可以根据 CPU 情况配置：

```nginx
worker_processes auto;
```

例如：

```nginx
worker_processes auto;
```

让 Nginx 根据可用 CPU 资源选择 Worker 数量。

但也不要简单认为：

```text
Worker 越多
↓
性能越好
```

实际性能还受到：

```text
CPU
连接数
I/O
TLS
上游应用
网络
```

等因素影响。

---

# Worker Connections

例如：

```nginx
events {
    worker_connections 4096;
}
```

表示单个 Worker 可以同时处理的连接数量上限之一。

不过：

> **worker_connections 不是“每秒请求数”。**

连接数：

```text
Concurrent Connections
```

和：

```text
Requests Per Second
```

是不同指标。

此外，一个请求可能涉及多个连接，而反向代理场景中 Nginx 同时需要维护：

```text
客户端连接
+
上游连接
```

所以不能简单用：

```text
worker_processes × worker_connections
```

直接推导实际可服务的 HTTP 并发量。

---

# Keepalive

HTTP 长连接可以减少反复建立 TCP 连接的开销。

例如没有长连接：

```text
Request
 ↓
TCP Connect
 ↓
Response
 ↓
Close
```

而 Keepalive 可以：

```text
TCP Connect
   │
   ├── Request 1
   ├── Request 2
   ├── Request 3
   └── ...
```

因此可以减少：

```text
TCP 建连次数
TLS 握手次数
```

Nginx 对客户端连接和 upstream 连接都有相应的 Keepalive 配置。

---

# 压缩

对于：

```text
HTML
CSS
JavaScript
JSON
```

等文本内容，可以使用压缩减少网络传输量。

例如：

```nginx
gzip on;
gzip_types text/plain text/css application/json
           application/javascript text/xml application/xml;
```

原理：

```text
原始响应
   ↓
Compression
   ↓
较小的响应
   ↓
Network
```

它通常能够：

```text
减少网络带宽
```

但也会增加：

```text
CPU
```

因此同样需要根据实际负载进行权衡。

Nginx 官方文档也将压缩 / 解压缩作为 HTTP 服务能力之一。[NGINX Web Server](https://docs.nginx.com/nginx/admin-guide/web-server/)

---

# 静态资源优化

对于大型网站，静态资源通常是 Nginx 最擅长的场景之一。

可以结合：

```text
Cache-Control
ETag
Last-Modified
gzip
文件缓存
open_file_cache
```

等能力减少：

```text
磁盘 I/O
网络流量
重复计算
```

例如：

```text
HTML
↓
短缓存

JS / CSS
↓
长缓存 + 文件指纹

图片
↓
较长缓存
```

实际缓存时间取决于资源更新策略。

---

# open_file_cache

Nginx 可以缓存某些文件相关的信息，例如：

```nginx
open_file_cache max=1000 inactive=20s;
```

可以减少某些情况下反复执行：

```text
open
stat
```

等文件系统操作。

但这属于具体优化手段：

> **只有在确认文件访问是瓶颈时才应该考虑。**

不要在不了解工作负载的情况下堆叠优化参数。

---

# upstream Keepalive

反向代理情况下，Nginx 与后端之间也可以复用连接。

例如：

```nginx
upstream backend {
    server 127.0.0.1:8080;

    keepalive 32;
}
```

这样可以减少：

```text
Nginx
  │
  │ 每次重新连接
  ▼
Backend
```

变成：

```text
Nginx
  │
  ├── Request 1
  ├── Request 2
  ├── Request 3
  └── ...
  │
  ▼
Backend
```

对于大量短请求的代理场景可能有明显意义。

---

# Nginx 性能优化思路

真正进行性能优化时，可以按照：

```text
第一步：测量
    ↓
CPU？
Memory？
Network？
Disk？
Latency？
RPS？
Connections？

第二步：定位
    ↓
Nginx？
TLS？
Static File？
Upstream？
Database？

第三步：修改
    ↓
Worker
Keepalive
Cache
Compression
Buffer
Connection Limit

第四步：验证
    ↓
再次压测 / 观察

第五步：比较
    ↓
是否真的改善？
```

因此：

> **性能优化不是背配置，而是建立“指标 → 瓶颈 → 调整 → 验证”的闭环。**

---

# 一个完整的 Nginx Web 架构

把本文所有内容结合起来，一个比较典型的生产架构可能是：

```text
                         Internet
                            │
                            ▼
                     ┌─────────────┐
                     │    Nginx    │
                     │   :443      │
                     └──────┬──────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
         静态资源        Proxy Cache      Rate Limit
             │              │              │
             │         Cache Hit           │
             │              │              │
             └──────────────┼──────────────┘
                            │
                       Cache Miss
                            │
                            ▼
                       Load Balance
                    ┌───────┼───────┐
                    │       │       │
                    ▼       ▼       ▼
                  App 1   App 2   App 3
                    │       │       │
                    └───────┼───────┘
                            │
                            ▼
                        Database
```

与此同时：

```text
Client
   │
   ▼
Nginx
   │
   ├── Access Log
   └── Error Log
```

因此 Nginx 可以同时承担：

```text
Web Server
Reverse Proxy
TLS Endpoint
Static File Server
Cache
Load Balancer
Rate Limiter
Log Collector
```

等多个角色。

---

# 一个实际配置示例

下面把：

```text
HTTPS
静态资源
反向代理
负载均衡
日志
限流
```

组合起来。

```nginx
http {
    log_format main
        '$remote_addr - $remote_user [$time_local] '
        '"$request" $status $body_bytes_sent '
        '"$http_referer" "$http_user_agent" '
        '$request_time';

    access_log /var/log/nginx/access.log main;
    error_log  /var/log/nginx/error.log;

    limit_req_zone $binary_remote_addr
                   zone=api_limit:10m
                   rate=10r/s;

    upstream backend {
        server 127.0.0.1:8081;
        server 127.0.0.1:8082;

        keepalive 32;
    }

    server {
        listen 80;
        server_name example.com;

        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name example.com;

        ssl_certificate     /etc/nginx/certs/example.com.crt;
        ssl_certificate_key /etc/nginx/certs/example.com.key;

        root /var/www/example;
        index index.html;

        location /static/ {
            expires 7d;
        }

        location /api/ {
            limit_req zone=api_limit;

            proxy_pass http://backend;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

这份配置可以看成：

```text
HTTP
 ↓
301
 ↓
HTTPS
 ↓
Nginx
 │
 ├── /static/
 │      ↓
 │   本地文件
 │
 └── /api/
        ↓
     Rate Limit
        ↓
   Reverse Proxy
        ↓
   Load Balance
      ┌─┴─┐
      ▼   ▼
    App1 App2
```

---

# Nginx 排障思路

Nginx 出现问题时，不应该只看：

```text
nginx 是否启动
```

而应该分层排查。

---

## 配置问题

首先：

```bash
nginx -t
```

确认配置语法。

如果：

```text
syntax is ok
test is successful
```

再 reload。

---

## 监听问题

检查：

```bash
ss -lntp
```

确认：

```text
80
443
```

是否监听。

---

## 静态文件问题

如果：

```text
404
```

检查：

```text
root
location
URI
文件权限
文件是否存在
```

例如：

```bash
ls -l /var/www/example/
```

---

## 反向代理问题

如果：

```text
502 Bad Gateway
```

重点检查：

```text
Nginx
   │
   ▼
Upstream
```

例如：

```bash
ss -lntp
```

确认：

```text
8080 / 8081 / 8082
```

是否监听。

再：

```bash
curl http://127.0.0.1:8080
```

直接测试后端。

---

## 超时问题

如果：

```text
504 Gateway Timeout
```

重点关注：

```text
Nginx
   │
   ▼
Upstream
   │
   ▼
Application
   │
   ▼
Database
```

可能是：

```text
应用处理太慢
数据库查询太慢
上游连接失败
网络延迟
超时参数
```

等问题。

---

## HTTPS 问题

如果：

```text
443
```

可连接但浏览器提示证书问题，可以检查：

```text
证书
私钥
证书链
域名
SNI
TLS 版本
```

例如：

```bash
openssl s_client -connect example.com:443 -servername example.com
```

可以进一步观察 TLS 握手和证书链。

---

# Nginx 与前面内容的连接

到这里，可以把：

```text
Web 服务基础：Web 服务器与 Http 请求处理
```

中的知识和 Nginx 连接起来。

前一篇讲：

```text
HTTP Request
HTTP Response
Status Code
Header
Cookie
Session
Apache
Tomcat
```

这一篇则进一步学习：

```text
Nginx
 │
 ├── 接收 HTTP Request
 ├── 根据 server / location 匹配
 ├── 提供静态资源
 ├── 反向代理到 Tomcat / Java
 ├── 处理 HTTPS
 ├── 缓存 Response
 ├── 进行负载均衡
 ├── 记录 Access / Error Log
 └── 进行流量控制
```

于是一个典型 Web 系统可以形成：

```text
                         Client
                            │
                            │ HTTPS
                            ▼
                        Nginx :443
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          Static File      Cache        Rate Limit
              │             │             │
              └─────────────┼─────────────┘
                            │
                         Proxy
                            │
                            ▼
                       Load Balance
                            │
                 ┌──────────┼──────────┐
                 ▼          ▼          ▼
              Tomcat 1   Tomcat 2   Tomcat 3
                 │          │          │
                 └──────────┼──────────┘
                            ▼
                         Database
```

这基本就是 Linux 运维中非常典型的一套 Web 服务架构。

## 外部参考

- [NGINX Documentation](https://nginx.org/en/docs/)
- [NGINX Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [NGINX HTTP Server Documentation](https://docs.nginx.com/nginx/admin-guide/web-server/)
- [NGINX Reverse Proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [NGINX HTTP Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)
