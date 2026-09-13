---
title: Web 服务基础：Web 服务器与 Http 请求处理
published: 2026-09-13T11:06:03Z
description: ''
image: ''
tags: [Web, HTTP, Apache, Tomcat, Cookie, Session]
category: 学习笔记
draft: false
lang: ''
---

> Web 服务是 Linux 运维中非常常见的一类服务。无论是部署网站、Java Web 应用，还是排查接口访问问题，都需要理解 HTTP 请求与响应，以及 Web 服务器和应用服务器之间的关系。
>
> 本文从 HTTP 的基本通信模型开始，介绍请求、响应、状态码、Header、Cookie、Session 等核心概念，然后介绍 **Apache HTTP Server** 与 **Tomcat** 的基本定位和工作方式，建立对 Web 服务的整体认知。

## Web 服务是什么

浏览器访问：

```text
https://example.com
```

表面上看只是：

```text
输入网址
    ↓
浏览器显示网页
```

但实际背后经历了：

```text
浏览器
  ↓
DNS
  ↓
建立网络连接
  ↓
HTTPS / TLS
  ↓
HTTP Request
  ↓
Web Server
  ↓
HTTP Response
  ↓
浏览器
```

其中：

```text
HTTP
```

负责规定：

> **客户端和服务器之间应该如何交换 Web 数据。**

而：

```text
Web Server
```

则负责：

```text
接收 HTTP 请求
处理请求
返回 HTTP 响应
```

因此可以先建立一个基本模型：

```text
Client
  │
  │ HTTP Request
  ▼
Web Server
  │
  │ HTTP Response
  ▼
Client
```

---

# HTTP

## 什么是 HTTP

HTTP（Hypertext Transfer Protocol）是 Web 中最核心的应用层协议之一。

HTTP 定义了：

```text
请求
响应
方法
状态码
Header
消息内容
```

等通信规则。

现代 HTTP 标准体系主要由 HTTP Semantics 和不同版本的 HTTP Message Syntax 组成，HTTP/1.1、HTTP/2、HTTP/3 在传输方式上有所不同，但共享许多基本的 HTTP 语义。

可以先记住：

> **HTTP 是应用层协议，负责定义 Web 通信的语义。**

---

## Request / Response

HTTP 最核心的通信模型：

```text
Client
  │
  │ Request
  ▼
Server
  │
  │ Response
  ▼
Client
```

也就是：

> **请求—响应模型（Request / Response）**

例如浏览器请求：

```text
GET /index.html
```

服务器返回：

```text
200 OK
```

以及对应的内容。

---

# HTTP Request

## 请求的基本结构

一个 HTTP 请求可以抽象成：

```text
Request Line
Headers
Blank Line
Body
```

例如：

```http
GET /index.html HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept: text/html
```

可以理解为：

```text
GET /index.html HTTP/1.1
        │
        ├── 方法：GET
        ├── 资源：/index.html
        └── HTTP 版本：HTTP/1.1
```

然后：

```text
Host
User-Agent
Accept
```

属于：

> **Header**

---

## Request Line

请求行通常包含：

```text
Method
Request Target
HTTP Version
```

例如：

```http
GET /index.html HTTP/1.1
```

其中：

```text
GET
↓
Method

/index.html
↓
Request Target

HTTP/1.1
↓
HTTP Version
```

---

# HTTP Method

HTTP 定义了多种请求方法。

常见的有：

```text
GET
POST
PUT
PATCH
DELETE
HEAD
OPTIONS
```

---

## GET

`GET` 通常用于：

> **获取资源。**

例如：

```http
GET /index.html HTTP/1.1
Host: example.com
```

表示：

```text
请返回 /index.html
```

GET 请求通常用于：

```text
查询页面
查询数据
获取文件
```

---

## POST

`POST` 通常用于：

> **向服务器提交数据，要求服务器进行某种处理。**

例如：

```http
POST /login HTTP/1.1
Content-Type: application/json

{
    "username": "alice",
    "password": "123456"
}
```

这里：

```text
Body
↓
真正携带提交的数据
```

---

## PUT

`PUT` 通常用于：

> **创建或整体替换目标资源。**

例如：

```http
PUT /users/100 HTTP/1.1
```

---

## PATCH

`PATCH` 通常用于：

> **对已有资源进行部分修改。**

例如：

```http
PATCH /users/100 HTTP/1.1
```

请求体可能只包含：

```json
{
    "name": "Bob"
}
```

---

## DELETE

`DELETE` 通常用于：

> **删除指定资源。**

例如：

```http
DELETE /users/100 HTTP/1.1
```

---

## HEAD

`HEAD` 与 GET 类似，但服务器通常只返回：

```text
Headers
```

而不返回响应内容。

因此可以用于：

```text
检查资源是否存在
检查 Content-Length
检查 Last-Modified
```

等场景。

例如：

```bash
curl -I https://example.com
```

就可以查看响应头。

---

# HTTP Response

## 响应的基本结构

HTTP 响应可以抽象为：

```text
Status Line
Headers
Blank Line
Body
```

例如：

```http
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1234

<html>
...
</html>
```

可以理解成：

```text
200
↓
Status Code

OK
↓
Reason Phrase
```

之后：

```text
Content-Type
Content-Length
```

属于 Header。

最后：

```text
<html>
...
</html>
```

是 Body。

---

# HTTP Status Code

HTTP 状态码由三位数字组成。

第一位数字表示状态类别：

```text
1xx
2xx
3xx
4xx
5xx
```

可以理解为：

| 状态码 | 含义 |
|---|---|
| `1xx` | 信息响应 |
| `2xx` | 请求成功 |
| `3xx` | 重定向 |
| `4xx` | 客户端请求问题 |
| `5xx` | 服务器处理问题 |

---

## 2xx

### 200 OK

表示：

> 请求成功。

例如：

```text
GET /index.html
        ↓
200 OK
```

---

### 201 Created

表示：

> 请求成功创建了资源。

常见于：

```text
POST
```

或某些资源创建 API。

---

### 204 No Content

表示：

> 请求成功，但响应没有需要返回的内容。

---

# 3xx

### 301 Moved Permanently

表示：

> 资源已经永久移动到新的位置。

例如：

```text
http://example.com
        ↓
301
        ↓
https://example.com
```

---

### 302 Found

表示：

> 当前请求需要临时重定向。

具体重定向行为还涉及客户端和 HTTP 方法的语义，因此不能简单理解成：

```text
302 = 永久跳转
```

---

### 304 Not Modified

表示：

> 资源没有发生变化，可以使用缓存。

典型流程：

```text
浏览器
   │
   │ 条件请求
   ▼
服务器
   │
   │ 304
   ▼
浏览器
   │
   ▼
继续使用缓存
```

---

# 4xx

### 400 Bad Request

表示：

> 服务器无法按照 HTTP 语义理解这个请求。

可能是：

```text
请求格式错误
参数错误
请求语法问题
```

---

### 401 Unauthorized

通常表示：

> 当前请求缺少有效认证凭据，或者认证失败。

它常见于：

```text
登录
Token
HTTP Authentication
```

等场景。

---

### 403 Forbidden

表示：

> 服务器理解了请求，但拒绝提供访问。

因此：

```text
401
↓
认证相关

403
↓
权限 / 访问控制相关
```

不要简单理解成：

```text
401 = 没登录
403 = 登录了
```

实际语义还要根据具体认证机制和应用实现判断。

---

### 404 Not Found

表示：

> 服务器找不到当前请求对应的资源。

例如：

```text
GET /abc.html
        ↓
404 Not Found
```

---

# 5xx

### 500 Internal Server Error

表示：

> 服务器遇到了无法正常处理请求的内部错误。

例如：

```text
Application Exception
        ↓
500
```

---

### 502 Bad Gateway

通常表示：

> 作为网关或代理的服务器从上游服务器获得了无效响应。

典型场景：

```text
Client
  ↓
Apache / Proxy
  ↓
Tomcat
```

如果：

```text
Tomcat
```

没有正确响应，上游代理可能返回：

```text
502 Bad Gateway
```

---

### 503 Service Unavailable

通常表示：

> 服务当前无法处理请求。

可能因为：

```text
服务暂时不可用
过载
维护
资源不足
```

具体原因需要结合服务器和应用日志分析。

---

### 504 Gateway Timeout

通常表示：

> 网关或代理等待上游响应超时。

例如：

```text
Client
  ↓
Web Server
  ↓
Application
  ↓
Database
```

如果上游长时间没有返回结果，就可能出现：

```text
504 Gateway Timeout
```

---

# HTTP Header

## Header 是什么

HTTP Header 用于传递：

> **请求或响应的附加信息。**

例如：

```http
Host: example.com
Content-Type: application/json
Content-Length: 123
User-Agent: curl/8.x
Authorization: Bearer token
```

可以理解成：

```text
HTTP Message
│
├── Body
│
└── Header
     ├── 描述
     ├── 控制
     ├── 协商
     └── 认证
```

---

# 常见 Request Header

### Host

```http
Host: example.com
```

表示客户端请求的目标主机。

在一个 IP 地址对应多个网站的场景中：

```text
同一个 IP
   │
   ├── example.com
   ├── test.com
   └── api.example.com
```

HTTP 请求中的 Host 信息可以帮助服务器判断：

> **客户端请求的是哪个主机名。**

---

### User-Agent

例如：

```http
User-Agent: Mozilla/5.0
```

用于描述客户端的软件类型。

服务器可以据此了解：

```text
浏览器
命令行工具
爬虫
移动端
```

等信息。

---

### Accept

例如：

```http
Accept: text/html
```

表示客户端愿意接收的内容类型。

---

### Authorization

用于携带认证凭据。

例如：

```http
Authorization: Bearer eyJ...
```

常见于：

```text
API
Token Authentication
```

---

# 常见 Response Header

### Content-Type

例如：

```http
Content-Type: text/html
```

表示：

> 响应 Body 的媒体类型。

例如：

```text
text/html
application/json
image/png
```

---

### Content-Length

表示：

> Body 的长度。

例如：

```http
Content-Length: 1024
```

---

### Location

常用于：

```text
301
302
307
308
```

等重定向响应。

例如：

```http
HTTP/1.1 301 Moved Permanently
Location: https://example.com
```

---

### Cache-Control

用于控制缓存行为。

例如：

```http
Cache-Control: max-age=3600
```

表示客户端或中间缓存可以根据缓存规则处理该响应。

---

### Set-Cookie

服务器可以通过：

```http
Set-Cookie
```

向客户端设置 Cookie。

例如：

```http
Set-Cookie: session_id=abc123; Path=/; HttpOnly
```

---

# Cookie

## 什么是 Cookie

HTTP 本身是：

> **无状态（Stateless）**

协议。

例如：

```text
Request 1
↓
Server

Request 2
↓
Server
```

服务器默认不会因为：

```text
Request 1
```

就自动知道：

```text
Request 2
```

一定来自同一个用户。

因此 Web 应用通常需要额外机制保存：

```text
用户身份
登录状态
偏好
会话标识
```

Cookie 就是其中最常见的一种机制。

---

## Cookie 的工作过程

服务器可以返回：

```http
Set-Cookie: session_id=abc123
```

浏览器保存后，在后续符合条件的请求中携带：

```http
Cookie: session_id=abc123
```

于是：

```text
第一次请求

Client
  │
  ▼
Server
  │
  │ Set-Cookie
  ▼
Browser
  │
  ▼
保存 Cookie
```

之后：

```text
Client
  │
  │ Cookie
  ▼
Server
```

服务器就可以根据：

```text
session_id
```

找到对应的会话。

---

# Cookie 的常见属性

Cookie 常见属性包括：

```text
Domain
Path
Expires
Max-Age
Secure
HttpOnly
SameSite
```

---

### Secure

```text
Secure
```

表示 Cookie 通常只应该通过：

```text
HTTPS
```

发送。

---

### HttpOnly

```text
HttpOnly
```

表示浏览器脚本通常不能通过 JavaScript 的：

```text
document.cookie
```

读取该 Cookie。

因此它常用于降低某些场景下 Cookie 被脚本直接读取的风险。

---

### SameSite

```text
SameSite
```

用于控制 Cookie 在跨站请求中的发送行为。

常见值：

```text
Strict
Lax
None
```

它是现代 Web 安全中的重要机制。

---

# Session

## 什么是 Session

Session（会话）通常指：

> **服务器端用于维护用户一次连续交互状态的一种机制。**

它与 Cookie 并不是同一个东西。

例如：

```text
Browser
  │
  │ Cookie: session_id=abc123
  ▼
Server
  │
  ▼
Session Store
  │
  └── abc123
        │
        ├── User = Alice
        ├── Login = true
        └── ...
```

这里：

```text
Cookie
↓
浏览器保存 session_id

Session
↓
服务器保存对应状态
```

因此：

> **Cookie 可以用来承载 Session ID，但 Cookie 和 Session 本身不是同一个概念。**

---

## Session 的典型登录流程

例如用户登录：

```text
1. 用户提交用户名 / 密码
          │
          ▼
2. Server 验证
          │
          ▼
3. 创建 Session
          │
          ▼
4. 返回 Session ID
          │
          ▼
5. 浏览器保存 Cookie
          │
          ▼
6. 后续请求携带 Cookie
          │
          ▼
7. Server 根据 Session ID 找到用户状态
```

可以表示成：

```text
Browser
   │
   │ Login
   ▼
Server
   │
   │ Create Session
   ▼
Session Store
   │
   │ session_id
   ▼
Browser Cookie
   │
   │ session_id
   ▼
Server
```

---

# Cookie 与 Session 的区别

| 对比 | Cookie | Session |
|---|---|---|
| 主要存放位置 | 客户端 | 通常服务器端 |
| 本质 | HTTP 状态信息载体 | 服务端会话状态 |
| 数据量 | 通常较小 | 取决于服务端存储 |
| 常见用途 | 身份标识、偏好 | 登录状态、用户会话 |
| 是否必须配合 | 不一定 | 常通过 Cookie 保存 Session ID |

因此最常见的模型是：

```text
Browser
   │
   │ Cookie
   │ session_id=abc
   ▼
Web Server
   │
   ▼
Session Store
   │
   ▼
User Session
```

---

# Web 服务器

## 什么是 Web Server

Web Server 可以理解为：

> **负责接收和处理 HTTP 请求，并向客户端提供 Web 资源或转发请求的服务器软件。**

常见的 Web Server：

```text
Apache HTTP Server
Nginx
Caddy
```

例如：

```text
Browser
   │
   │ HTTP
   ▼
Apache
   │
   ├── 静态文件
   └── 动态请求
```

---

# Apache HTTP Server

## 什么是 Apache

Apache HTTP Server，简称：

> **Apache httpd**

是历史悠久且非常成熟的 Web 服务器软件。

它可以用于：

```text
提供静态文件
处理 HTTP 请求
HTTPS
虚拟主机
访问控制
日志
反向代理
模块扩展
```

等场景。

官方项目：

[Apache HTTP Server](https://httpd.apache.org/)

---

## Apache 的基本工作方式

例如服务器目录：

```text
/var/www/html/
├── index.html
├── style.css
└── image.png
```

客户端请求：

```http
GET /index.html HTTP/1.1
Host: example.com
```

Apache 可以：

```text
收到 Request
      │
      ▼
解析 Host
      │
      ▼
寻找资源
      │
      ▼
/var/www/html/index.html
      │
      ▼
返回 Response
```

例如：

```http
HTTP/1.1 200 OK
Content-Type: text/html

<html>
...
</html>
```

---

# Apache Virtual Host

一台服务器可以托管多个网站。

例如：

```text
服务器
192.168.1.100
      │
      ├── example.com
      ├── test.com
      └── api.example.com
```

Apache 可以使用：

> **Virtual Host（虚拟主机）**

根据请求中的主机名等信息选择不同的网站配置。

例如：

```text
Host: example.com
        ↓
VirtualHost A

Host: test.com
        ↓
VirtualHost B
```

这样：

> 一个服务器 IP 可以承载多个网站。

---

# Apache Module

Apache 使用模块化设计。

例如：

```text
mod_ssl
mod_proxy
mod_rewrite
mod_headers
```

等模块可以扩展功能。

因此 Apache 可以根据需要加载：

```text
TLS
代理
URL 重写
Header 处理
```

等能力。

---

# Apache 日志

Web Server 的日志对运维非常重要。

Apache 常见两类日志：

```text
Access Log
Error Log
```

---

## Access Log

记录：

```text
谁
什么时候
请求了什么
返回什么状态
```

例如：

```text
192.168.1.10 - - [13/Sep/2026:10:00:00]
"GET /index.html HTTP/1.1"
200
```

---

## Error Log

记录：

```text
配置错误
访问错误
模块错误
代理错误
运行异常
```

例如：

```text
proxy error
connection refused
```

在 Web 故障排查中非常重要。

---

# Tomcat

## 什么是 Tomcat

Tomcat 是 Apache 软件基金会旗下的：

> **Servlet / Jakarta Servlet 容器以及 Web Server 运行环境。**

它主要用于运行：

```text
Java Web Application
```

例如：

```text
Java Application
       │
       ▼
Jakarta Servlet
       │
       ▼
Tomcat
       │
       ▼
HTTP
```

官方项目：

[Apache Tomcat](https://tomcat.apache.org/)

---

# Tomcat 与 Apache HTTP Server 的区别

虽然两者都可以处理 HTTP 请求，但定位并不完全相同。

可以简单理解：

```text
Apache HTTP Server
↓
通用 Web Server

Tomcat
↓
Java Web 应用运行环境 / Servlet 容器
```

Apache 更擅长：

```text
静态资源
HTTP
HTTPS
虚拟主机
代理
访问控制
```

Tomcat 更关注：

```text
Java Web Application
Servlet
JSP
Jakarta EE Web APIs
```

---

# Tomcat 为什么叫 Servlet Container

Java Web 应用中存在：

> **Servlet**

Servlet 是运行在服务器端、用于处理 Web 请求的一种 Java 组件。

Tomcat 提供：

```text
Servlet Container
```

负责：

```text
加载应用
创建 Servlet
接收请求
调用 Servlet
返回响应
管理生命周期
```

可以理解为：

```text
HTTP Request
      │
      ▼
    Tomcat
      │
      ▼
Servlet
      │
      ▼
Java Application
      │
      ▼
HTTP Response
```

---

# Tomcat 部署 Web 应用

传统 Tomcat 部署中经常看到：

```text
webapps/
├── ROOT/
├── manager/
└── myapp/
```

或者：

```text
myapp.war
```

Tomcat 可以根据部署配置加载 Web Application。

例如：

```text
myapp.war
    │
    ▼
Tomcat
    │
    ▼
/myapp
```

客户端访问：

```text
http://server:8080/myapp/
```

请求进入：

```text
Tomcat
```

再由对应的 Java Web 应用处理。

---

# Tomcat 的端口

Tomcat 常见配置中：

```text
8080
```

通常用于 HTTP Connector。

例如：

```text
0.0.0.0:8080
```

表示 Tomcat 监听 TCP 8080 端口。

可以通过：

```bash
ss -lntp
```

查看。

例如：

```text
LISTEN 0 100 0.0.0.0:8080
```

---

# Apache 与 Tomcat 的组合

实际部署 Java Web 应用时，一个非常典型的结构是：

```text
Client
   │
   │ HTTPS :443
   ▼
Apache HTTP Server
   │
   │ Reverse Proxy
   ▼
Tomcat :8080
   │
   ▼
Java Web Application
```

Apache 负责：

```text
HTTPS
静态资源
访问控制
域名
日志
```

Tomcat 负责：

```text
Java Web Application
```

于是形成：

```text
浏览器
   │
   ▼
Apache
   │
   ▼
Tomcat
   │
   ▼
Java Application
```

---

# 为什么不直接让 Tomcat 对外

实际上：

> **Tomcat 完全可以直接接收 HTTP 请求。**

例如：

```text
Browser
   │
   ▼
Tomcat :8080
```

这样就可以工作。

但生产环境中经常在前面增加一个 Web Server / Reverse Proxy：

```text
Browser
   │
   ▼
Apache :443
   │
   ▼
Tomcat :8080
```

原因可能包括：

```text
HTTPS 终止
静态资源处理
多个应用统一入口
域名分流
访问控制
日志
缓存
反向代理
```

这也是后续学习：

```text
Reverse Proxy
Load Balancing
Nginx
Apache Proxy
```

的基础。

---

# 一个完整的 Web 请求

假设：

```text
https://example.com/app/login
```

背后可能是：

```text
Browser
    │
    │ DNS
    ▼
IP Address
    │
    ▼
TCP
    │
    ▼
TLS
    │
    ▼
Apache :443
    │
    │ Reverse Proxy
    ▼
Tomcat :8080
    │
    ▼
Java Application
    │
    ▼
Database
```

然后响应：

```text
Database
    │
    ▼
Java Application
    │
    ▼
Tomcat
    │
    ▼
Apache
    │
    ▼
TLS
    │
    ▼
Browser
```

HTTP 请求本身可能类似：

```http
POST /app/login HTTP/1.1
Host: example.com
Content-Type: application/json
Cookie: session_id=abc123

{
    "username": "alice",
    "password": "******"
}
```

最终服务器返回：

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
    "success": true
}
```

这就把：

```text
HTTP
Cookie
Session
Apache
Tomcat
Java Application
```

这些概念联系了起来。

---

# Web 服务故障排查

当出现：

```text
网页打不开
```

不要一开始就认为：

```text
Apache / Tomcat 挂了
```

应该逐层判断。

可以先形成：

```text
DNS
 ↓
网络
 ↓
TCP
 ↓
TLS
 ↓
Web Server
 ↓
Reverse Proxy
 ↓
Tomcat
 ↓
Application
 ↓
Database / Dependency
```

---

## DNS

首先确认：

```text
example.com
```

是否能够解析到正确 IP。

例如：

```bash
dig example.com
```

或者：

```bash
getent hosts example.com
```

---

## TCP 端口

确认：

```text
443
```

是否可以建立连接。

服务器上：

```bash
ss -lntp
```

确认 Apache：

```text
:443
```

是否监听。

Tomcat 则可能监听：

```text
:8080
```

---

## HTTPS

如果 TCP 正常但 HTTPS 失败：

```bash
curl -vk https://example.com
```

进一步检查：

```text
TLS
证书
协议
SNI
```

等问题。

---

## Apache

继续查看：

```text
Access Log
Error Log
VirtualHost
Proxy 配置
```

确认请求到底有没有到 Apache。

---

## Tomcat

如果 Apache 返回：

```text
502
```

就需要继续检查：

```text
Tomcat 是否运行
8080 是否监听
Apache 是否能连接 Tomcat
Tomcat 是否正常响应
```

例如：

```bash
curl http://127.0.0.1:8080/
```

---

## Application

如果：

```text
Tomcat 正常
```

但返回：

```text
500
```

则继续检查：

```text
Java Application
日志
数据库
缓存
其他依赖服务
```

这就是典型的：

```text
网络
 ↓
Web Server
 ↓
Application Server
 ↓
Application
 ↓
Dependency
```

逐层缩小问题范围的方法。

---

# Web 服务整体模型

现在可以把本文内容串起来：

```text
                         Web 服务
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
        HTTP 协议                       Web Server
             │                             │
      ┌──────┼──────┐              ┌───────┴───────┐
      │      │      │              │               │
   Request Response Header       Apache          Tomcat
      │      │      │              │               │
      │      │      ├── Cookie     │               │
      │      │      └── Auth       │               │
      │      │                     │               │
      │      │                     └──────┬────────┘
      │      │                            │
      │      └── Status Code              ▼
      │                              Java Web App
      │
      └── Method / URL / Body
```

再从部署架构来看：

```text
                    Client
                       │
                       │ HTTPS
                       ▼
                Apache HTTP Server
                       │
                Reverse Proxy
                       │
                       ▼
                   Tomcat
                       │
                       ▼
               Java Web Application
                       │
                       ▼
                    Database
```

---

# Web 服务中的几个核心概念

可以最终把最重要的概念对应起来：

```text
HTTP
↓
规定 Web 通信规则

Request
↓
客户端发送什么

Response
↓
服务器返回什么

Status Code
↓
服务器如何描述处理结果

Header
↓
传递请求 / 响应的附加信息

Cookie
↓
客户端保存的小块状态信息

Session
↓
服务器维护的会话状态

Apache HTTP Server
↓
通用 Web Server

Tomcat
↓
Java Servlet / Web Application 运行环境
```

因此一次典型 Java Web 请求可以理解成：

```text
Browser
   │
   │ HTTP Request
   ▼
Apache
   │
   │ Proxy
   ▼
Tomcat
   │
   ▼
Java Application
   │
   ▼
HTTP Response
   │
   ▼
Apache
   │
   ▼
Browser
```

理解这条链之后，后续学习：

```text
Nginx
反向代理
负载均衡
TLS
Tomcat 集群
Web 日志
JVM
应用监控
```

就会更加自然。

## 外部参考

- [HTTP Semantics — RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)
- [HTTP/1.1 — RFC 9112](https://www.rfc-editor.org/rfc/rfc9112)
- [Apache HTTP Server Documentation](https://httpd.apache.org/docs/)
- [Apache Tomcat Documentation](https://tomcat.apache.org/tomcat-docs/)
- [MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
