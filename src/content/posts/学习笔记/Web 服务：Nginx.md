---
title: Web 服务：Nginx
published: 2026-09-13T11:09:45Z
description: 'Nginx 可以提供静态文件、反向代理、TLS 终止和负载均衡。'
updated: 2026-09-19
image: ''
tags: [Web, Nginx, HTTP, HTTPS, 反向代理, 负载均衡, 缓存]
category: 学习笔记
draft: false
lang: ''
---

Nginx 可以提供静态文件、反向代理、TLS 终止和负载均衡。配置时先确定请求如何匹配站点与路径，再增加缓存、限流等策略，最后通过真实请求和日志验证。

# 安装与配置结构

使用发行版认可的软件源安装 Nginx，Debian/Ubuntu 通常使用 `apt install nginx`，RHEL 系列通常使用 `dnf install nginx`。安装和服务管理需要管理员权限，包安装后是否自动启动取决于发行版。

```bash
nginx -v
nginx -V
sudo nginx -T
```

`-V` 显示编译选项和模块，`-T` 检查并输出加载的配置。输出可能包含内部地址或凭据，分享前应审阅。不要假设所有安装都有 sites-enabled，先检查主配置的 include。

| 上下文 | 常见内容 |
| --- | --- |
| main | worker_processes、events、http |
| http | MIME、日志格式、upstream、server |
| server | 监听地址、域名、TLS、location |
| location | URI 对应的静态文件或代理处理 |

进程通常由 master 管理配置和 worker，worker 处理连接。应用配置一般放入已有 http 上下文加载的文件，不能重复嵌套 http。

# 静态文件与请求匹配

以下独立示例要求 `/srv/www/demo/index.html` 已存在，worker 用户可读取文件并穿过父目录，TCP 80 可用：

```nginx title="http 上下文中的站点配置"
server {
    listen 80;
    server_name demo.example.com;
    root /srv/www/demo;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

请求 `/images/logo.png` 对应 `/srv/www/demo/images/logo.png`。`root` 在目录后拼接 URI；`alias` 替换匹配的 location 路径部分，不能直接互换。

Nginx 先按监听地址与域名选择 server，再按 URI 选择 location。精确匹配 `=`、前缀匹配、正则匹配有不同优先规则；复杂规则应针对真实 URI 测试，不能只按配置书写顺序理解。

```bash title="配置检查与实际验证"
sudo nginx -t
sudo systemctl reload nginx
curl --resolve demo.example.com:80:127.0.0.1 http://demo.example.com/
```

只有检查成功才执行 reload。核对返回内容和 access/error 日志，再从外部客户端验证。语法正确不保证路径、权限或后端可用。

# 反向代理与负载均衡

下面是独立的代理站点示例，两个后端应已运行于本机 8081、8082，并能处理 `/api/` 路径：

```nginx title="http 上下文中的 upstream 与 server"
upstream demo_backend {
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    keepalive 16;
}

server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        proxy_pass http://demo_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

本例将 Nginx 作为直接接收客户端的可信入口，覆盖客户端提交的 X-Forwarded-For。若前面还有负载均衡器，应限定可信代理地址并配置真实 IP 处理，后端也只能信任约定代理。直接相信客户端自带的转发头会导致来源伪造。

## proxy_pass 的路径

在普通前缀 `location /api/` 中：

| 配置 | 请求 /api/users 的典型上游路径 |
| --- | --- |
| proxy_pass http://demo_backend; | /api/users |
| proxy_pass http://demo_backend/; | /users |

带 URI 的 proxy_pass 会替换匹配的前缀。正则 location、变量和 rewrite 场景有额外规则，见[代理模块手册](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)。

## 后端选择与故障

默认使用加权轮询；`least_conn` 按活动连接及权重选择，适用于连接处理时长不一的情况；`ip_hash` 提供一定来源粘滞性，但 NAT 聚合和地址变化会影响分布，不能代替可靠的会话存储。

开源 Nginx 的常见后端故障判断来自实际请求的被动检测，`max_fails`、`fail_timeout` 与重试条件共同影响行为。不要将所有失败请求无条件转发到下一台：非幂等请求可能已经执行。主动健康检查能力需要核对具体版本、发行版和模块。

# HTTPS

证书需覆盖实际域名，包含所需中间证书链，并与私钥匹配。私钥只授予必要账户读取权限。下面的 server 是独立 HTTPS 示例，使用前替换证书路径并确认文件存在：

```nginx
server {
    listen 443 ssl;
    server_name demo.example.com;
    ssl_certificate /etc/nginx/certs/demo-fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/demo-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /srv/www/demo;
    location / {
        try_files $uri $uri/ =404;
    }
}
```

按相同的检查、重载流程应用，再使用 `curl --resolve demo.example.com:443:127.0.0.1 https://demo.example.com/` 验证。不要通过 `-k` 跳过证书问题。证书续期流程还要包含配置检查、重载和到期监控。

TLS 在入口终止不意味着入口到后端也已加密；跨不可信网络的上游连接需要单独配置 TLS 和证书验证。

# 缓存与流量控制

## 浏览器缓存与代理缓存

浏览器缓存由 HTTP 响应头控制；代理缓存由 Nginx 保存上游响应。两者可独立启用。

带内容指纹的静态资源适合较长有效期；会更新的 HTML 需要适当重新验证。不要把所有扩展名相同的资源都设成长缓存，而忽略发布与回退方式。

代理缓存需要同时设计缓存键、有效期、失效方式和用户隔离。默认不缓存登录、购物车和个性化接口，不为提高命中率随意忽略 Cache-Control 或 Set-Cookie。启用后应记录缓存状态，验证首次请求、重复请求和数据更新后的行为。

## 限流、并发与带宽

| 指令 | 限制维度 | 注意事项 |
| --- | --- | --- |
| limit_req | 按键统计请求速率 | burst 与 nodelay 改变突发处理方式 |
| limit_conn | 按键统计被模块计入的并发连接/请求 | HTTP/2、HTTP/3 并发请求有特定计数语义 |
| limit_rate | 响应发送速率 | 不等同于用户总带宽配额 |

按 IP 限流前先确认真实 IP 来源；共享出口下多个用户可能被合并。阈值应来自容量测量，并明确拒绝状态、重试提示和监控，不直接复制固定数字。

# 日志与性能排查

可在 http 上下文定义以下日志格式，再在目标 server 中启用：

```nginx
log_format timing '$remote_addr "$request" $status '
                  'rt=$request_time upstream=$upstream_addr '
                  'uct=$upstream_connect_time urt=$upstream_response_time';
```

```nginx title="server 上下文"
access_log /var/log/nginx/demo-access.log timing;
```

总请求时间还包含客户端传输等过程，不等于后端计算耗时。重试多个上游时，相关变量可能包含多个值；应保留请求关联信息分析。

| 症状 | 检查对象与判断 |
| --- | --- |
| 403/404 | 实际 server/location、路径、目录索引、权限和安全标签 |
| 502 | 上游监听、连接失败、协议不匹配、进程退出；结合 error 日志 |
| 504 | 连接或读取阶段超时、后端耗时；先定位再调整超时 |
| 499 | 客户端提前断开，是线索，不直接等于客户端故障 |
| 延迟高 | 总耗时与上游耗时、CPU、连接数、磁盘和网络 |
| 无法建立新连接 | 文件描述符、worker_connections、系统限制与上游连接占用 |

`worker_connections` 是每个 worker 的连接限制之一，并非 RPS。代理还需要上游连接，不能直接将 worker 数乘连接数当成可服务用户数。调整 keepalive、压缩、缓存和缓冲时，一次改变一个有依据的因素，再比较延迟、吞吐量与错误率。

# 参考资料

- [Nginx 入门与管理](https://nginx.org/en/docs/beginners_guide.html)
- [请求处理与匹配](https://nginx.org/en/docs/http/request_processing.html)
- [HTTP 代理模块](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [HTTPS 配置](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [HTTP 负载均衡](https://nginx.org/en/docs/http/load_balancing.html)
