---
title: Web 服务：Web 服务器与 Http 请求处理
published: 2026-09-13T11:06:03Z
description: 'Web 服务通过 HTTP 请求与响应交付网页、文件和接口数据。'
updated: 2026-09-19
image: ''
tags: [Web, HTTP, Apache, Tomcat, Cookie, Session]
category: 学习笔记
draft: false
lang: ''
---

Web 服务通过 HTTP 请求与响应交付网页、文件和接口数据。理解请求在哪一层处理，有助于区分网络失败、代理错误与应用异常。

# 请求经过哪些组件

```text
客户端 → DNS 解析 → 网络连接与 TLS → Web 入口
                                      ├─ 静态文件
                                      └─ 应用服务 → 数据库等依赖
```

这是常见 HTTPS 部署路径。DNS 和连接可以复用；HTTP/1.1、HTTP/2 通常运行在 TCP 上，HTTP/3 使用基于 UDP 的 QUIC。不同版本共享方法、状态码等 HTTP 语义，但报文编码不同。

Web 服务器、反向代理和应用运行环境是角色，不是互斥产品类别。Apache HTTP Server、Nginx 能提供静态资源和反向代理；Tomcat 能直接处理 HTTP，并提供 Java Servlet 应用运行环境。

# HTTP 请求与响应

以下是 HTTP/1.1 的文本形式示意，不表示 HTTP/2 或 HTTP/3 在线路上的编码：

```http title="请求示意"
GET /health HTTP/1.1
Host: app.example.com
Accept: application/json

```

```http title="响应示意"
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 15

{"status":"ok"}
```

示例响应体为 15 个 ASCII 字节，不计展示时的末尾换行。真实响应的长度和消息边界由服务器按协议生成，不应手写一个与内容不符的 Content-Length。

## 方法与重试

| 方法 | 常见用途 | 重试时的考虑 |
| --- | --- | --- |
| GET、HEAD | 获取资源；HEAD 不返回响应体 | 按语义应安全且幂等 |
| POST | 提交数据或发起处理 | 默认不能假定幂等 |
| PUT | 创建或整体替换目标资源 | 按语义幂等 |
| PATCH | 局部修改 | 是否幂等取决于补丁和应用设计 |
| DELETE | 删除目标资源关联 | 按语义幂等，但多次响应可不同 |
| OPTIONS | 查询通信选项 | 浏览器跨源预检会使用 |

幂等指重复请求的预期作用与一次相同，不要求返回相同状态码。超时不证明服务端未执行；支付、创建订单等操作需使用业务幂等机制，不能盲目重试。

## 状态码与排查方向

| 类别或代码 | 含义与关注点 |
| --- | --- |
| 2xx；200、201、204 | 成功、已创建、成功但无响应内容；仍需核对业务结果 |
| 301、302 | 永久或临时重定向；历史客户端可能把 POST 改为 GET |
| 307、308 | 临时或永久重定向，保留方法 |
| 304 | 条件请求满足缓存复用条件，不是普通跳转 |
| 400、404 | 请求不符合要求，或目标资源未找到/未公开 |
| 401、403 | 认证挑战或拒绝访问；不能简单等同于未登录/已登录 |
| 429 | 请求速率受限，结合 Retry-After 和限流策略 |
| 500 | 服务端内部错误，查应用日志 |
| 502、504 | 代理遇到上游异常或等待超时 |
| 503 | 暂时无法提供服务，可能是维护、过载或无可用后端 |

状态码由返回响应的组件产生。排查时先确认来自入口代理、应用还是中间网关，再选择对应日志。

# 请求头、缓存与状态

| 字段 | 作用 |
| --- | --- |
| Host / :authority | 标识目标主机，用于虚拟主机等路由 |
| Content-Type | 描述消息内容的媒体类型 |
| Accept | 表达客户端接受的响应类型 |
| Authorization | 携带认证凭据 |
| Location | 指示重定向目标或新建资源位置 |
| Cache-Control | 控制存储、有效期与重新验证 |
| ETag / Last-Modified | 为条件请求提供验证依据 |

`no-cache` 允许存储，但复用前通常必须验证；`no-store` 要求不要存储。`private` 限制共享缓存使用，并不意味着传输已经加密。个性化响应不能只因返回 200 就放入共享缓存。

## Cookie 与会话

Cookie 是客户端保存并按域、路径等条件发送的数据。服务端会话通常把状态保存在服务端，通过 Cookie 中的随机会话标识关联用户；两者不是同一个对象。

```http title="会话 Cookie 示例"
Set-Cookie: session_id=opaque-value; Path=/; Secure; HttpOnly; SameSite=Lax
```

Secure 限制安全连接中的发送，HttpOnly 限制脚本直接读取，SameSite 影响跨站发送。它们各有作用，不能替代认证、授权或完整的 CSRF 防护。登录后应轮换会话标识，退出时使服务端会话失效。

多实例部署要明确会话存储和过期策略。若会话只存在单台实例内存中，流量切换后可能丢失；共享会话存储或合适的无状态认证需要结合应用实现选择。

# Apache HTTP Server

Apache httpd 通过虚拟主机区分站点，通过模块提供 TLS、代理和访问控制。包名与服务名在不同发行版中可能是 `apache2` 或 `httpd`。

下面是 Apache 2.4 静态站点配置片段，前提是目标目录已有 index.html、服务用户具有读取权限，并且主配置已经监听 80：

```apache title="加入发行版加载的站点配置"
<VirtualHost *:80>
    ServerName app.example.com
    DocumentRoot /srv/www/app
    <Directory /srv/www/app>
        Require all granted
        Options -Indexes
        AllowOverride None
    </Directory>
</VirtualHost>
```

配置所在目录、启用站点的方式随发行版变化。先用本机提供的 `apachectl configtest` 或 `apache2ctl configtest` 检查，再重载对应服务。

```bash title="在服务器上验证站点选择和响应"
curl --resolve app.example.com:80:127.0.0.1 http://app.example.com/
```

确认返回预期文件，同时检查访问日志。此测试只验证本机路径；还需从实际客户端验证 DNS、网络和防火墙。

# Tomcat 与 Java 应用

Tomcat 管理 Servlet 等 Web 组件的加载和请求处理，并不是完整 Jakarta EE 平台。选择版本时，要共同检查 Java 版本、Servlet 规范和应用依赖；Tomcat 9 的 javax 命名空间与 Tomcat 10 及以后采用的 jakarta 命名空间存在迁移差异。

传统部署可将 WAR 交给指定实例的部署目录，但自动部署方式、上下文路径和生产发布流程由配置决定。`myapp.war` 常对应 `/myapp`，不能只访问根路径就断言应用未启动。

部署后检查启动日志、Connector 的监听地址、应用上下文和实际健康端点。位于反向代理后的 Tomcat 一般只开放必要的内部访问范围；管理应用不应默认暴露到公网。

# 用一次请求定位故障

```bash title="保留 TLS 校验并限制等待时间"
curl -v --connect-timeout 5 --max-time 15 https://app.example.com/health
```

替换成实际地址，按失败阶段判断：

1. 解析失败：检查系统解析器与域名记录。
2. 连接失败：确认服务监听、访问控制、路由及地址族。
3. TLS 失败：核对证书域名、有效期、信任链、SNI 和系统时间。
4. HTTP 错误：关联入口和应用日志，核对 Host、路径、认证及依赖。
5. 返回成功但业务异常：检查响应内容、数据状态和异步任务结果。

通过指定 IP 测试 HTTPS 时，优先用 `curl --resolve 域名:443:地址 https://域名/` 保留 Host、SNI 和证书验证。直接改成 IP URL 可能改变虚拟主机选择。

# 参考资料

- [RFC 9110：HTTP 语义](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9111：HTTP 缓存](https://www.rfc-editor.org/rfc/rfc9111)
- [Apache 2.4 文档](https://httpd.apache.org/docs/2.4/)
- [Tomcat 版本兼容性](https://tomcat.apache.org/whichversion.html)
