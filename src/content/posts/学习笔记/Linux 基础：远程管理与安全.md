---
title: Linux 基础：远程管理与安全
published: 2026-09-13T06:24:34Z
description: ''
image: ''
tags: [Linux, SSH, SELinux, 安全, 运维]
category: 学习笔记
draft: false 
lang: ''
---

> Linux 服务器通常不会直接连接显示器操作，而是通过 SSH 进行远程管理。
>
> 远程登录只是第一层安全问题。真正的服务器安全还需要考虑 **身份认证、文件权限、访问控制、SELinux、网络暴露、账号安全以及安全审计**。
>
> 本文从 SSH 远程管理开始，介绍密码认证、公钥认证、`authorized_keys`、`~/.ssh/config`，再进一步理解 DAC 与 MAC、SELinux Context、Policy、Enforcing / Permissive，以及 Linux 服务器中常见的权限边界和安全检查思路。

# SSH 远程管理

## 什么是 SSH

SSH：

> **Secure Shell**

是一套用于在不安全网络上提供安全远程访问的协议体系。

Linux 服务器中最常见的实现是：

> **OpenSSH**

SSH 可以用于：

```text
远程登录
远程执行命令
安全传输文件
端口转发
隧道通信
```

最常见的场景：

```bash
ssh user@server
```

例如：

```bash
ssh alice@192.168.1.10
```

整体过程：

```text
客户端
   │
   │ SSH
   ▼
服务器 22 端口
   │
   ▼
sshd
   │
   ▼
身份认证
   │
   ▼
创建用户会话
```

---

# SSH 登录过程

一次 SSH 登录可以粗略分成：

```text
建立 TCP 连接
      ↓
SSH 协议协商
      ↓
密钥交换
      ↓
建立加密通信
      ↓
用户认证
      ↓
建立 Shell / 会话
```

因此：

> SSH 并不是“用户名 + 密码直接发送给服务器”。

连接建立后，双方会通过 SSH 协议完成加密通信，然后再进行用户认证。

---

# SSH 密码认证

最简单的方式：

```bash
ssh alice@server
```

服务器要求输入密码：

```text
alice@server's password:
```

输入正确后进入系统。

这种方式的优点是：

```text
简单
容易上手
```

但在服务器环境中，密码容易受到：

```text
暴力破解
密码泄露
重复密码
钓鱼
```

等风险影响。

因此服务器管理通常更推荐：

> **SSH 公钥认证**

---

# SSH 公钥认证

SSH 公钥认证使用：

```text
Private Key
Public Key
```

一对密钥。

可以简单理解为：

```text
客户端
│
├── 私钥
│
└── 公钥
```

其中：

> **私钥必须由用户自己保管。**

而：

> **公钥可以放到服务器上。**

因此：

```text
私钥
↓
客户端保存

公钥
↓
服务器保存
```

---

## 公钥认证的基本过程

假设：

```text
客户端：alice
服务器：server
```

客户端：

```text
~/.ssh/id_ed25519
~/.ssh/id_ed25519.pub
```

服务器：

```text
~/.ssh/authorized_keys
```

登录过程可以理解为：

```text
客户端
 │
 │ 持有私钥
 │
 ▼
服务器
 │
 │ 保存对应公钥
 │
 ▼
认证挑战
 │
 ▼
客户端使用私钥证明身份
 │
 ▼
服务器使用公钥验证
 │
 ▼
认证成功
```

这里并不是把：

```text
私钥
```

发送给服务器。

> **私钥始终应该留在客户端。**

---

# 生成 SSH 密钥

现代 OpenSSH 中常见：

```bash
ssh-keygen -t ed25519
```

生成后通常会得到：

```text
~/.ssh/id_ed25519
~/.ssh/id_ed25519.pub
```

分别是：

```text
id_ed25519
↓
私钥

id_ed25519.pub
↓
公钥
```

可以查看公钥：

```bash
cat ~/.ssh/id_ed25519.pub
```

典型形式类似：

```text
ssh-ed25519 AAAA... alice@client
```

---

## 私钥为什么重要

如果：

```text
公钥泄露
```

通常不是最严重的问题。

但如果：

```text
私钥泄露
```

攻击者可能利用它进行身份认证。

因此：

```text
私钥
↓
不能随意复制
不能上传到公共仓库
不能发送给他人
```

尤其不要把：

```text
~/.ssh/id_ed25519
```

提交到：

```text
GitHub
公开网盘
聊天记录
代码仓库
```

---

# SSH Agent 与私钥密码

私钥本身还可以设置：

> **Passphrase**

例如：

```bash
ssh-keygen -t ed25519
```

生成密钥时设置一个密码。

这样即使私钥文件被别人取得：

```text
私钥文件
+
不知道 Passphrase
```

仍然增加了进一步使用的难度。

在频繁使用多个 SSH 会话时，可以配合：

```text
ssh-agent
```

缓存解锁后的密钥。

例如：

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

这样就不需要每次 SSH 都重新输入私钥 Passphrase。

---

# `authorized_keys`

服务器端公钥认证最重要的文件之一：

```text
~/.ssh/authorized_keys
```

例如用户：

```text
alice
```

那么文件通常是：

```text
/home/alice/.ssh/authorized_keys
```

其中可以存放一个或多个公钥：

```text
ssh-ed25519 AAAA... alice@laptop
ssh-ed25519 BBBB... alice@desktop
```

表示：

```text
允许多个客户端
↓
使用各自对应的私钥
↓
登录 alice
```

因此：

```text
客户端私钥
      │
      │ 对应
      ▼
服务器 authorized_keys 中的公钥
```

---

## authorized_keys 的权限

SSH 对相关文件权限比较敏感。

例如：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

通常可以保持：

```text
~/.ssh
↓
700

authorized_keys
↓
600
```

同时需要保证：

```text
目录和文件的所有者正确
```

例如：

```bash
chown -R alice:alice ~/.ssh
```

实际系统中的 OpenSSH 配置还可能受到：

```text
StrictModes
SELinux
文件系统权限
```

等因素影响。

因此遇到：

```text
公钥明明配置了却无法登录
```

时，不应该只检查公钥内容。

---

# ssh-copy-id

如果服务器允许密码登录，可以使用：

```bash
ssh-copy-id alice@server
```

它通常会帮助将当前用户的公钥追加到服务器：

```text
~/.ssh/authorized_keys
```

之后就可以使用：

```bash
ssh alice@server
```

进行公钥认证。

本质上仍然是：

```text
本地公钥
↓
服务器 authorized_keys
```

---

# `~/.ssh/config`

当服务器越来越多时：

```bash
ssh alice@192.168.1.10
```

这样的命令会越来越难记。

OpenSSH 客户端支持：

```text
~/.ssh/config
```

用于保存主机配置。

例如：

```text
Host app-server
    HostName 192.168.1.10
    User alice
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

之后可以直接：

```bash
ssh app-server
```

SSH 客户端会自动使用：

```text
HostName
User
Port
IdentityFile
```

等配置。

---

## 多服务器配置

例如：

```text
Host app01
    HostName 10.0.0.11
    User deploy
    IdentityFile ~/.ssh/id_ed25519

Host app02
    HostName 10.0.0.12
    User deploy
    IdentityFile ~/.ssh/id_ed25519

Host db01
    HostName 10.0.0.21
    User admin
    IdentityFile ~/.ssh/db_key
```

这样可以：

```bash
ssh app01
ssh app02
ssh db01
```

而不需要重复输入完整参数。

这对于：

```text
运维服务器
开发环境
测试环境
生产环境
跳板机
```

尤其方便。

---

# SSH 跳板机

在实际生产环境中，目标服务器可能不能直接从互联网访问：

```text
Internet
   │
   ▼
Jump Host
   │
   ▼
Internal Server
```

OpenSSH 可以使用：

```text
ProxyJump
```

例如：

```text
Host internal-server
    HostName 10.0.0.20
    User admin
    ProxyJump bastion
```

然后：

```bash
ssh internal-server
```

客户端会自动：

```text
客户端
 ↓
跳板机
 ↓
内部服务器
```

这种设计可以减少内部服务器直接暴露在公网中的数量。

---

# SSH 安全配置思路

SSH 服务端通常由：

```text
sshd
```

提供。

配置文件常见：

```text
/etc/ssh/sshd_config
```

修改后通常需要重新加载或重启服务。

例如：

```bash
sudo systemctl reload sshd
```

具体服务名称可能根据发行版有所区别。

---

## SSH 安全重点

服务器上的 SSH 安全通常应该关注：

```text
允许哪些用户登录？
允许哪些认证方式？
是否允许 root 直接登录？
是否允许密码认证？
是否限制登录来源？
是否有暴露在公网？
```

这些问题比：

```text
“SSH 默认是不是 22 端口”
```

更加重要。

---

# root 远程登录

直接允许：

```text
root
```

通过 SSH 登录会增加攻击面。

更常见的思路是：

```text
普通用户
   ↓
SSH 登录
   ↓
sudo
   ↓
执行被授权的管理员操作
```

例如：

```bash
ssh alice@server
```

然后：

```bash
sudo systemctl restart nginx
```

而不是：

```text
直接使用 root 登录所有操作
```

这样可以保留：

```text
用户身份
操作记录
权限边界
```

---

# 从 SSH 到主机安全

SSH 解决的是：

> **“谁可以远程连接服务器？”**

但登录之后还有更大的问题：

```text
用户能访问什么？
进程能访问什么？
服务能访问什么？
哪个程序可以修改哪些文件？
```

这就进入 Linux 的：

> **访问控制**

体系。

---

# DAC 与 MAC

Linux 中常见的访问控制可以先区分：

```text
DAC
MAC
```

---

## DAC：自主访问控制

DAC：

> **Discretionary Access Control**

Linux 最基本的文件权限模型就属于 DAC。

例如：

```text
文件：
/opt/app/config.yaml

Owner:
alice

Group:
developers

权限：
rw-r-----
```

系统根据：

```text
用户身份
用户组
文件所有者
文件权限
```

判断是否允许访问。

也就是我们前面学习过的：

```text
User
Group
Other
 ↓
rwx
```

因此：

```text
chmod
chown
chgrp
```

都属于这一基础访问控制体系的重要组成部分。

---

# MAC：强制访问控制

MAC：

> **Mandatory Access Control**

与 DAC 相比，MAC 会在传统 Unix 权限之外，再增加一套更强制性的安全策略。

最常见的实现之一：

> **SELinux**

可以理解为：

```text
DAC
 ↓
Linux 文件权限

MAC
 ↓
额外安全策略

最终访问
 ↓
两层限制共同作用
```

因此一个进程：

```text
即使 Linux 文件权限允许
```

也可能因为：

```text
SELinux 策略不允许
```

而被拒绝。

---

# SELinux

SELinux：

> **Security-Enhanced Linux**

它为 Linux 提供基于安全策略的访问控制能力。

可以先建立这样的认识：

```text
传统 Linux 权限
      │
      ▼
  Owner / Group / Other
      │
      ▼
      DAC
      │
      ▼
    SELinux
      │
      ▼
      MAC
```

因此：

> **SELinux 不是用来替代 `chmod` 的。**

它是在传统权限之外增加另一层访问控制。

---

# SELinux Context

SELinux 中非常重要的概念：

> **Security Context**

查看文件 Context：

```bash
ls -Z
```

例如可能看到：

```text
-rw-r--r--. alice developers system_u:object_r:httpd_config_t:s0 app.conf
```

其中：

```text
system_u:object_r:httpd_config_t:s0
```

就是 SELinux Context。

可以拆成：

```text
user
:
role
:
type
:
level
```

具体 SELinux 实现中还存在更复杂的安全标识关系，但入门阶段最需要关注的通常是：

> **Type**

---

# SELinux Type

例如：

```text
httpd_config_t
```

这是一个 SELinux 类型。

系统可以通过类型判断：

```text
哪个进程
↓
可以访问
↓
哪种类型的对象
```

因此传统 Linux 权限可能是：

```text
-rw-r-----
```

但 SELinux 还会进一步判断：

```text
httpd_t
是否允许访问
httpd_config_t？
```

如果策略不允许：

```text
访问仍然失败
```

即使传统文件权限看起来没有问题。

---

# SELinux Policy

SELinux 最核心的组成之一：

> **Policy（安全策略）**

策略规定：

```text
哪个主体
可以对
哪个对象
进行
什么操作
```

可以抽象成：

```text
Subject
  │
  │ 访问
  ▼
Object
  │
  ▼
Policy 判断
  │
  ├── Allow
  │
  └── Deny
```

例如：

```text
nginx 进程
   ↓
访问某个文件
   ↓
SELinux Policy
   ↓
是否允许？
```

如果策略不允许：

```text
Permission denied
```

或者出现 SELinux AVC 拒绝记录。

---

# SELinux 工作模式

SELinux 常见模式：

```text
Enforcing
Permissive
Disabled
```

---

## Enforcing

```text
Enforcing
```

表示：

> SELinux 策略正常强制执行。

如果策略禁止：

```text
访问
```

系统会：

```text
拒绝访问
```

同时通常会记录相关安全事件。

这是生产环境常见的工作模式。

---

## Permissive

```text
Permissive
```

表示：

> 不实际阻止访问，但会记录违反策略的行为。

可以理解为：

```text
Enforcing
↓
真正拦截

Permissive
↓
只记录 / 不实际强制拒绝
```

因此 Permissive 很适合：

```text
测试策略
排查问题
开发阶段
```

但并不应该把它理解成：

> “SELinux 已经完全关闭”。

因为 SELinux 仍然会：

```text
进行策略检查
记录拒绝
```

---

## 查看 SELinux 状态

可以使用：

```bash
getenforce
```

得到：

```text
Enforcing
```

或者：

```text
Permissive
```

更详细：

```bash
sestatus
```

可以查看：

```text
SELinux status
Current mode
Policy
```

---

# 不要用关闭 SELinux 解决所有权限问题

部署程序时经常会出现：

```text
Permission denied
```

初学者可能直接：

```text
关闭 SELinux
```

这种做法并不推荐。

因为更好的排查顺序是：

```text
传统文件权限
   ↓
Owner / Group / Other
   ↓
路径权限
   ↓
ACL
   ↓
SELinux Context
   ↓
SELinux Policy
   ↓
审计日志
```

只有确定：

> SELinux 策略确实阻止了预期操作

之后，再针对具体策略进行处理。

而不是：

```text
遇到问题
↓
setenforce 0
↓
“解决”
```

---

# SELinux Context 与文件移动

SELinux 环境中，一个非常常见的问题是：

```text
文件内容没问题
Linux 权限也没问题
但是服务仍然无法访问
```

这时可能是：

> 文件的 SELinux Context 不正确。

例如：

```text
Web 服务
↓
需要访问某类文件
↓
文件的 Context 不符合策略
↓
访问被 SELinux 拒绝
```

查看：

```bash
ls -Z /var/www/html
```

可以确认 Context。

因此部署 Web 服务时，不能只考虑：

```text
chmod
chown
```

还需要考虑：

```text
SELinux Context
```

---

# 权限边界

Linux 安全的核心并不是：

> “有没有 root 用户。”

而是：

> **每个用户和进程拥有多大的权限边界。**

例如：

```text
普通用户
 ↓
只能访问自己的文件

Web 服务账户
 ↓
只能访问 Web 数据

数据库账户
 ↓
只能访问数据库相关资源

管理员
 ↓
通过 sudo 获取必要权限
```

可以理解为：

```text
用户 / 进程
      │
      ▼
   权限边界
      │
      ├── 文件
      ├── 目录
      ├── 设备
      ├── 网络
      └── 系统管理操作
```

---

# 最小权限原则

服务器安全中非常重要的一条原则：

> **最小权限原则（Principle of Least Privilege）**

即：

> 一个用户、进程或服务只获得完成任务所需要的最少权限。

例如：

```text
Nginx
↓
不需要拥有整个系统的 root 权限
```

而应该尽量：

```text
专用服务账户
+
限定文件权限
+
限定目录权限
+
必要的 Linux capabilities / sudo 权限
```

同样：

```text
开发人员
```

也不应该因为“方便”而拥有：

```text
全部 root 权限
```

---

# 暴露端口与攻击面

服务器安全不仅仅是：

```text
账号
密码
权限
```

网络暴露同样重要。

假设服务器开放：

```text
22  → SSH
80  → HTTP
443 → HTTPS
8080 → Java 应用
3306 → MySQL
6379 → Redis
```

如果：

```text
3306
6379
```

本来只应该供内部应用访问，却直接暴露到公网：

```text
Internet
   │
   ├── 22
   ├── 80
   ├── 443
   ├── 3306
   └── 6379
```

那么攻击面就会增加。

---

## 最小暴露原则

更合理的思路：

```text
公网
 │
 ├── 80
 ├── 443
 └── 22
       │
       ▼
   Web / SSH

内部网络
 │
 ├── 8080
 ├── 3306
 └── 6379
```

也就是说：

> **服务不需要被公网访问，就不要直接暴露在公网。**

可以通过：

```text
防火墙
安全组
VPC
ACL
反向代理
跳板机
```

等机制缩小网络暴露面。

---

# 端口开放不等于服务安全

即使：

```text
只开放 443
```

也不代表服务完全安全。

还需要考虑：

```text
服务版本
漏洞
身份认证
TLS
访问控制
日志
配置
依赖
```

例如：

```text
80 / 443
```

开放是 Web 服务正常工作所需要的。

但：

```text
Web 应用
↓
存在漏洞
```

仍然可能成为攻击入口。

因此：

> **减少暴露面是第一步，而不是安全的全部。**

---

# 账号安全

服务器账号安全可以从几个方向考虑：

```text
账号数量
密码策略
SSH 密钥
登录权限
sudo 权限
失效账号
登录审计
```

---

## 删除不需要的账号

系统中可能存在：

```text
临时测试账号
旧员工账号
旧部署账号
废弃服务账号
```

这些账号如果继续存在，就可能成为额外攻击面。

因此应该定期确认：

```text
这个账号是否还需要？
这个账号还能不能登录？
这个账号属于哪些组？
这个账号拥有多少权限？
```

---

## 限制 Shell

有些账户只需要运行服务，并不需要交互式登录。

例如可以使用：

```text
/usr/sbin/nologin
```

或者：

```text
/bin/false
```

作为其登录 Shell。

这样可以减少：

```text
服务账号
↓
交互式登录能力
```

---

# SSH 密钥安全

SSH 密钥管理也应该遵循最小权限原则。

例如：

```text
一个人
↓
自己的密钥

一个服务
↓
专用密钥

一个环境
↓
尽量独立密钥
```

不要让：

```text
所有服务器
```

都共享：

```text
同一个私钥
```

否则一旦泄露：

```text
一个私钥
↓
大量服务器同时受影响
```

更合理的是：

```text
服务器 A → Key A
服务器 B → Key B
生产环境 → Production Key
测试环境 → Test Key
```

根据实际规模进行密钥分离。

---

# sudo 审计

使用：

```bash
sudo
```

执行管理操作，可以留下更清晰的用户身份边界。

例如：

```text
alice
 ↓
sudo systemctl restart nginx
```

相比：

```text
所有人直接使用 root
```

更容易回答：

```text
是谁执行的？
执行了什么？
什么时候执行的？
```

这对：

```text
生产环境
多人协作
安全审计
故障追踪
```

非常重要。

---

# SSH 登录审计

Linux 通常会记录认证相关事件。

可以结合系统日志查看：

```text
成功登录
失败登录
sudo
SSH 认证
```

不同发行版的日志位置和日志体系可能不同。

使用 systemd 的系统可以先通过：

```bash
journalctl
```

查看相关日志。

例如：

```bash
journalctl -u sshd
```

也可以根据实际发行版检查：

```text
auth.log
secure
journal
```

等日志。

---

# 安全审计

安全审计的核心不是：

> “服务器有没有配置某一个安全工具。”

而是持续确认：

```text
谁可以登录？
谁拥有管理员权限？
哪些端口暴露？
哪些服务正在运行？
哪些账号已经失效？
哪些文件权限异常？
是否存在异常认证？
是否出现策略拒绝？
```

可以建立这样的检查模型：

```text
身份
 ↓
账号和组

认证
 ↓
SSH / 密钥 / 密码

授权
 ↓
文件权限 / sudo / SELinux

网络
 ↓
监听端口 / 防火墙 / 暴露面

服务
 ↓
运行中的服务

日志
 ↓
认证 / sudo / SELinux / 系统事件
```

---

# 一个实际的服务器安全检查流程

假设拿到一台新 Linux 服务器，可以先进行：

### 1. 查看当前身份

```bash
whoami
id
```

确认：

```text
当前用户
UID
GID
所属组
```

---

### 2. 查看 SSH 配置

检查：

```text
/etc/ssh/sshd_config
```

重点关注：

```text
允许哪些用户？
是否允许 root 登录？
是否允许密码认证？
使用什么认证方式？
```

---

### 3. 检查 SSH 密钥

确认：

```text
~/.ssh/
~/.ssh/authorized_keys
```

查看：

```bash
ls -la ~/.ssh
```

以及：

```bash
cat ~/.ssh/authorized_keys
```

确认：

```text
是否存在陌生公钥？
文件权限是否合理？
```

---

### 4. 查看监听端口

```bash
ss -lntup
```

确认：

```text
服务器到底开放了哪些网络服务？
```

然后问：

```text
这个端口真的需要对外开放吗？
```

---

### 5. 检查账号

例如：

```bash
cat /etc/passwd
```

以及：

```bash
getent passwd
```

重点寻找：

```text
不再使用的账号
异常账号
具有登录 Shell 的服务账号
```

---

### 6. 检查管理员权限

查看：

```bash
sudo -l
```

确认当前用户能够执行哪些 sudo 操作。

管理员则应该进一步审查：

```text
/etc/sudoers
/etc/sudoers.d/
```

---

### 7. 检查 SELinux

```bash
getenforce
```

以及：

```bash
sestatus
```

确认：

```text
Enforcing
Permissive
```

等状态。

---

### 8. 检查文件权限

重点关注：

```text
配置文件
SSH 密钥
脚本
服务目录
敏感数据
```

例如：

```bash
ls -l /etc/ssh/
ls -la ~/.ssh/
```

---

### 9. 检查系统日志

使用：

```bash
journalctl
```

重点关注：

```text
SSH 登录失败
sudo 操作
服务启动失败
SELinux 拒绝
```

---

# Linux 远程管理与安全的完整模型

将全文内容串起来：

```text
                    远程管理与安全
                           │
          ┌────────────────┴────────────────┐
          │                                 │
       远程访问                           主机安全
          │                                 │
         SSH                                │
          │                                 │
   ┌──────┼──────┐                    ┌─────┴─────┐
   │      │      │                    │           │
认证     密钥   配置                  DAC         MAC
   │      │      │                    │           │
密码   Public  ~/.ssh/config       rwx        SELinux
       Key                         chmod       Context
   │      │                         chown       Policy
   │      │                         sudo        Enforcing
   │      │                                      │
   └──────┘                                      │
                                                │
                              ┌─────────────────┴───────────────┐
                              │                                 │
                         网络暴露                            安全审计
                              │                                 │
                         监听端口                          账号审计
                         防火墙                            登录审计
                         安全组                            sudo 审计
                         最小暴露                          SELinux 日志
                              │
                              └───────────┬─────────────────────┘
                                          ▼
                                  最小权限原则
```

从运维角度来看，一个安全的 Linux 服务器并不是：

```text
安装一个安全软件
```

而是多个层次共同建立边界：

```text
身份
 ↓
认证
 ↓
授权
 ↓
文件权限
 ↓
SELinux
 ↓
网络边界
 ↓
日志与审计
```

任何一层出现问题，都可能影响整个系统的安全性。

---

# 远程管理的安全原则

可以把实际运维中的核心原则归纳成：

```text
1. 不需要登录的人不要允许登录

2. 不需要 root 的操作不要直接使用 root

3. 不需要公网访问的服务不要暴露公网

4. 不需要写权限的用户不要给予写权限

5. 不需要交互登录的服务账号不要提供 Shell

6. 不需要的端口不要开放

7. 不使用的账号和密钥及时清理

8. 不要通过关闭 SELinux 来绕过权限问题

9. 使用日志和审计记录关键管理操作
```

最终目的并不是让服务器：

```text
“绝对无法访问”
```

而是建立合理的：

> **权限边界和攻击面。**

即：

```text
需要访问的人
↓
能够访问

需要执行的操作
↓
能够执行

不需要的访问
↓
被拒绝
```

这就是 Linux 运维安全中非常核心的思想。

---

## 外部参考

- [OpenSSH Manual Pages](https://man.openbsd.org/ssh)
- [OpenSSH Documentation](https://www.openssh.com/manual.html)
- [sudoers(5)](https://man7.org/linux/man-pages/man5/sudoers.5.html)
- [SELinux Project](https://www.selinuxproject.org/)
- [Linux man-pages](https://man7.org/linux/man-pages/)
