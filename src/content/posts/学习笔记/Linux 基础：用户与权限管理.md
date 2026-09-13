---
title: Linux 基础：用户与权限管理
published: 2026-09-13T05:18:13Z
description: ''
image: ''
tags: [Linux, 用户, 用户组, 权限, 安全]
category: 学习笔记
draft: false 
lang: ''
---

> Linux 是一个多用户系统。同一个服务器上可能同时存在多个用户、多个服务和多个进程，因此系统必须回答两个核心问题：
>
> **“你是谁？”**  
> **“你可以做什么？”**
>
> Linux 的用户与权限体系正是围绕这两个问题建立起来的。本文从 **UID / GID、用户组、`/etc/passwd`** 开始，逐步介绍文件权限、`chmod`、`chown`、`umask`、SUID、SGID、Sticky Bit，以及 `sudo` 和最小权限原则。

# Linux 的用户与权限体系

Linux 的权限控制可以先抽象成：

```text
用户
 │
 ├── UID
 │
 └── 用户组
       │
       ├── 主组
       └── 附加组
              │
              ▼
           文件 / 目录
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
     User   Group   Other
       │      │      │
       └──────┴──────┘
              │
             rwx
```

因此可以把整个权限体系分成几个层次：

```text
身份
 ↓
UID / GID
 ↓
用户与用户组
 ↓
文件所有者
 ↓
User / Group / Other
 ↓
rwx 权限
 ↓
chmod / chown / chgrp
 ↓
特殊权限
 ↓
sudo
```

---

# UID 与 GID

## UID

Linux 使用：

> **UID（User ID）**

来标识用户。

例如：

```text
alice → UID 1000
bob   → UID 1001
```

系统内部更关注：

```text
UID
```

而不是用户名字符串。

可以理解为：

```text
用户名
  ↓
alice
  ↓
UID
  ↓
1000
```

因此：

> 用户名主要用于人类识别，而 UID 是系统识别用户身份的重要标识。

---

## GID

用户组使用：

> **GID（Group ID）**

进行标识。

例如：

```text
developers → GID 1002
```

关系可以理解为：

```text
用户
 ↓
UID

用户组
 ↓
GID
```

文件的所有者和所属组实际上记录的是：

```text
UID
GID
```

而系统工具通常将它们显示成：

```text
用户名
组名
```

---

# `/etc/passwd`

Linux 中常见的本地用户账户信息保存在：

```text
/etc/passwd
```

可以查看：

```bash
cat /etc/passwd
```

每一行代表一个用户账户。

典型格式：

```text
username:x:UID:GID:comment:home:shell
```

例如：

```text
alice:x:1000:1000:Alice:/home/alice:/bin/bash
```

字段可以理解为：

| 字段 | 含义 |
|---|---|
| `username` | 用户名 |
| `x` | 密码字段标记，现代系统通常不直接保存密码哈希 |
| `UID` | 用户 ID |
| `GID` | 用户主组 ID |
| `comment` | 用户描述信息 |
| `home` | 家目录 |
| `shell` | 登录 Shell |

例如：

```text
alice:x:1000:1000:Alice:/home/alice:/bin/bash
     │   │    │
     │   │    └── 主组 GID
     │   └─────── UID
     └─────────── 密码字段占位
```

需要注意：

> 在使用 shadow password 的 Linux 系统中，实际密码哈希通常不直接保存在 `/etc/passwd` 中。

密码相关信息通常在：

```text
/etc/shadow
```

中。

---

# 用户组

用户组用于：

> **将多个用户组织起来，并以组为单位进行权限管理。**

例如：

```text
developers
├── alice
├── bob
└── charlie
```

某个目录可以设置为：

```text
所有者：root
所属组：developers
```

然后给予组成员访问权限。

这样就不需要：

```text
一个用户一个用户地单独授权
```

而可以：

```text
用户
 ↓
加入组
 ↓
获得组对应的访问权限
```

这也是 Linux 权限管理中非常重要的思想。

---

# 主组与附加组

Linux 用户可以属于多个组。

其中有：

> **主组（Primary Group）**

和：

> **附加组（Supplementary Groups）**

---

## 主组

用户账户通常会关联一个主组。

例如：

```text
alice
UID = 1000
主组 = developers
GID = 1000
```

查看当前用户及组信息：

```bash
id
```

可能得到：

```text
uid=1000(alice) gid=1000(developers) groups=1000(developers),1001(docker)
```

这里：

```text
uid=1000
↓
用户 UID

gid=1000
↓
主组 GID

groups=...
↓
用户所属的全部组
```

---

## 附加组

用户还可以属于多个附加组。

例如：

```text
alice
├── developers   ← 主组
├── docker       ← 附加组
└── monitoring   ← 附加组
```

查看：

```bash
groups alice
```

或者：

```bash
id alice
```

---

# 用户管理

Linux 中常见的用户管理命令：

```text
useradd
usermod
userdel
```

---

## `useradd`

创建用户：

```bash
sudo useradd alice
```

指定家目录并创建：

```bash
sudo useradd -m alice
```

指定登录 Shell：

```bash
sudo useradd -m -s /bin/bash alice
```

创建用户并指定主组：

```bash
sudo useradd -m -g developers alice
```

加入附加组：

```bash
sudo useradd -m -G docker,developers alice
```

常见参数：

| 参数 | 含义 |
|---|---|
| `-m` | 创建家目录 |
| `-d` | 指定家目录 |
| `-s` | 指定登录 Shell |
| `-g` | 指定主组 |
| `-G` | 指定附加组 |

需要注意：

```text
-g
↓
主组

-G
↓
附加组
```

这是使用 `useradd` 时非常容易混淆的一组参数。

---

## 设置密码

创建用户后，可以：

```bash
sudo passwd alice
```

设置用户密码。

查看账户状态：

```bash
sudo passwd -S alice
```

密码和账户状态管理与 `/etc/shadow` 有关。

---

# `usermod`

`usermod` 用于修改已有用户。

例如修改 Shell：

```bash
sudo usermod -s /bin/bash alice
```

修改家目录：

```bash
sudo usermod -d /home/alice-new -m alice
```

修改主组：

```bash
sudo usermod -g developers alice
```

添加附加组：

```bash
sudo usermod -aG docker alice
```

这里：

```text
-a
↓
append

-G
↓
附加组
```

所以：

```bash
usermod -aG docker alice
```

表示：

> 将 `alice` 添加到 `docker` 附加组。

---

## `-G` 与 `-aG`

这是用户管理中一个非常重要的细节。

直接：

```bash
usermod -G docker alice
```

会重新设置用户的附加组列表。

而：

```bash
usermod -aG docker alice
```

则表示：

> 在原有附加组基础上追加 `docker`。

因此实际操作中，如果只是“再加入一个组”，通常使用：

```bash
usermod -aG
```

---

# 用户组管理

常见命令：

```text
groupadd
groupmod
groupdel
```

## `groupadd`

创建组：

```bash
sudo groupadd developers
```

指定 GID：

```bash
sudo groupadd -g 2000 developers
```

---

## `groupmod`

修改组信息。

例如修改 GID：

```bash
sudo groupmod -g 2001 developers
```

---

## `groupdel`

删除用户组：

```bash
sudo groupdel developers
```

实际删除之前需要确认：

```text
是否还有用户使用它作为主组？
是否还有文件属于这个组？
```

生产环境不要随意删除正在使用的组。

---

# 查看用户和组信息

常用命令：

```bash
id alice
```

查看用户身份：

```text
UID
GID
主组
附加组
```

查看当前用户：

```bash
whoami
```

查看当前用户的 UID / GID：

```bash
id
```

查看用户组：

```bash
groups
```

这些命令适合在排查：

```text
为什么没有权限？
当前用户属于哪些组？
服务进程以哪个用户运行？
```

时使用。

---

# Linux 文件权限

Linux 文件权限最核心的结构：

```text
User
Group
Other
```

也就是：

```text
文件所有者
文件所属组
其他用户
```

例如：

```bash
ls -l app.conf
```

可能得到：

```text
-rw-r--r-- 1 alice developers 1024 app.conf
```

其中：

```text
-rw-r--r--
│││ │││ │││
│││ │││ ││└── Other
│││ ││└────── Group
││└────────── User
│└─────────── 文件类型
```

更清楚地拆开：

```text
-rw-r--r--

│
├── -
│   → 普通文件
│
├── rw-
│   → User
│
├── r--
│   → Group
│
└── r--
    → Other
```

---

# `rwx` 权限

Linux 基本权限包括：

```text
r
w
x
```

分别表示：

```text
r → read
w → write
x → execute
```

对应：

| 权限 | 含义 |
|---|---|
| `r` | 读取 |
| `w` | 写入 |
| `x` | 执行 |

每一组权限由三个位置组成：

```text
rwx
```

例如：

```text
rwxr-xr--
```

可以拆成：

```text
rwx
↓
User

r-x
↓
Group

r--
↓
Other
```

---

# 文件的 `rwx`

对于普通文件：

### `r`

允许读取文件内容。

```text
cat file.txt
```

通常需要：

```text
r
```

---

### `w`

允许修改文件内容。

---

### `x`

允许将文件作为程序执行。

例如脚本：

```bash
./script.sh
```

通常需要执行权限：

```text
x
```

因此：

```text
文件
r → 看内容
w → 修改内容
x → 执行
```

---

# 目录的 `rwx`

目录的权限含义与普通文件不同。

### `r`

允许读取目录中的名称列表。

也就是可以列出目录内容。

例如：

```bash
ls directory/
```

通常与目录的：

```text
r
```

权限有关。

---

### `w`

允许修改目录中的目录项。

例如：

```text
创建文件
删除文件
重命名文件
```

通常都需要目录的：

```text
w
```

权限。

---

### `x`

目录的 `x` 可以理解为：

> **允许进入目录 / 访问其中对象的路径组件。**

例如：

```bash
cd directory
```

通常需要：

```text
x
```

权限。

---

## 目录权限的一个关键区别

假设：

```text
directory/
└── secret.txt
```

即使：

```text
secret.txt
```

具有：

```text
r--
```

如果用户没有目录的：

```text
x
```

权限，也可能无法通过该路径正常访问文件。

因此：

> **文件权限控制文件本身，目录权限控制目录及其目录项的访问。**

这也是 Linux 权限中非常容易混淆的地方。

---

# 数字权限

Linux 还可以使用数字表示权限。

基本对应：

```text
r = 4
w = 2
x = 1
```

所以：

```text
rwx = 4 + 2 + 1 = 7
rw- = 4 + 2     = 6
r-x = 4     + 1 = 5
r-- = 4         = 4
-wx =     2 + 1 = 3
-w- =     2     = 2
--x =         1 = 1
--- = 0
```

因此：

```text
rwxr-xr--
```

可以写成：

```text
755
```

因为：

```text
rwx = 7
r-x = 5
r-- = 4
```

---

# `chmod`

`chmod` 用于修改文件权限。

## 数字方式

例如：

```bash
chmod 755 script.sh
```

表示：

```text
User  → rwx
Group → r-x
Other → r-x
```

也就是：

```text
rwxr-xr-x
```

再例如：

```bash
chmod 644 app.conf
```

表示：

```text
User  → rw-
Group → r--
Other → r--
```

得到：

```text
rw-r--r--
```

---

## 符号方式

也可以使用：

```bash
chmod u+x script.sh
```

其中：

```text
u
↓
user

g
↓
group

o
↓
other

a
↓
all
```

例如：

```bash
chmod g+w file.txt
```

给所属组增加写权限。

删除：

```bash
chmod o-w file.txt
```

去掉其他用户的写权限。

同时设置：

```bash
chmod u=rwx,g=rx,o=r file
```

---

# `chown`

`chown` 用于修改：

> **文件所有者**

例如：

```bash
sudo chown alice app.conf
```

修改所有者。

也可以同时修改所有者和所属组：

```bash
sudo chown alice:developers app.conf
```

得到：

```text
Owner
↓
alice

Group
↓
developers
```

递归修改目录：

```bash
sudo chown -R alice:developers /opt/app
```

但：

> `-R` 会递归修改整个目录树，生产环境使用时必须确认目标路径。

---

# `chgrp`

如果只想修改文件所属组，可以：

```bash
sudo chgrp developers app.conf
```

例如：

```text
Owner
↓
alice

Group
↓
developers
```

与：

```bash
chown alice:developers app.conf
```

相比：

```text
chgrp
↓
只改变组

chown
↓
可以改变所有者和组
```

---

# `umask`

创建新文件时，并不是简单地：

```text
默认权限 = 某个固定值
```

Linux 会根据：

> **umask**

限制新对象默认获得的权限。

查看当前：

```bash
umask
```

例如：

```text
022
```

---

## umask 的基本思想

常见默认基础权限可以简单理解为：

```text
文件
666

目录
777
```

然后根据：

```text
umask
```

限制相应权限。

例如：

```text
umask = 022
```

常见结果：

```text
文件
666
↓
644

目录
777
↓
755
```

可以理解为：

```text
基础权限
   │
   ▼
 umask
   │
   ▼
实际默认权限
```

需要注意：

> 创建文件时通常不会因为 umask 直接得到可执行权限，因此普通文件通常以 `666` 为基础；目录通常以 `777` 为基础。

---

## 为什么 umask 很重要

例如服务程序创建：

```text
日志
配置
临时文件
上传文件
```

时，这些新文件的初始权限都会受到：

```text
umask
```

影响。

因此当发现：

> “程序创建出来的文件为什么权限不一样？”

应该考虑：

```text
进程用户
+
umask
```

而不仅仅是：

```text
chmod
```

---

# 特殊权限

除了：

```text
r
w
x
```

Linux 还提供：

```text
SUID
SGID
Sticky Bit
```

这三个通常被称为：

> **特殊权限（Special Permissions）**

可以理解为：

```text
基本权限
├── User
├── Group
└── Other

特殊权限
├── SUID
├── SGID
└── Sticky Bit
```

对应数字：

```text
SUID
→ 4xxx

SGID
→ 2xxx

Sticky Bit
→ 1xxx
```

例如：

```text
4755
2755
1777
```

---

# SUID

SUID：

> **Set User ID**

当它应用在可执行文件上时，程序运行过程中通常可以使用：

> **文件所有者的有效用户身份**

执行：

```bash
ls -l /usr/bin/passwd
```

可能看到类似：

```text
-rwsr-xr-x
```

这里：

```text
rws
```

中的：

```text
s
```

表示：

> User 的执行位位置设置了 SUID。

可以粗略理解：

```text
普通程序
↓
以运行者身份执行

SUID 程序
↓
以文件所有者的有效身份运行
```

这类机制允许普通用户执行某些需要更高权限的受控操作。

但同时也意味着：

> SUID 程序属于高敏感权限对象。

如果一个具有 SUID 的程序存在安全漏洞，可能造成严重的权限提升问题。

---

## SUID 的数字形式

SUID 对应：

```text
4xxx
```

例如：

```bash
chmod 4755 program
```

基本权限：

```text
755
```

特殊权限：

```text
4
```

组合：

```text
4755
```

---

# SGID

SGID：

> **Set Group ID**

它在文件和目录上的行为有所不同。

---

## SGID 作用于可执行文件

对可执行文件设置 SGID 后，程序执行时通常会使用：

> **文件所属组的有效组身份**

与 SUID 对应：

```text
SUID
↓
文件所有者身份

SGID
↓
文件所属组身份
```

---

## SGID 作用于目录

SGID 在目录上非常实用。

设置后，该目录中新创建的文件和子目录通常会继承：

> **目录的所属组**

例如：

```text
/opt/project
Owner: root
Group: developers
SGID
```

团队成员：

```text
alice
bob
charlie
```

都可以在这个目录中工作。

创建新文件后：

```text
app.conf
Group: developers
```

这样非常适合：

```text
团队共享目录
项目目录
多用户协作环境
```

---

## SGID 数字形式

SGID：

```text
2xxx
```

例如：

```bash
chmod 2775 /opt/project
```

可以得到：

```text
drwxrwsr-x
```

其中：

```text
s
```

出现在：

```text
Group 的执行位
```

位置。

---

# Sticky Bit

Sticky Bit 主要用于：

> **限制共享目录中的文件删除操作。**

最经典的例子：

```text
/tmp
```

通常可以看到类似：

```text
drwxrwxrwt
```

最后的：

```text
t
```

就是 Sticky Bit。

它的典型效果是：

> 在具有 Sticky Bit 的共享目录中，普通用户通常只能删除自己拥有的文件，或者自己拥有目录时才能执行相应删除操作，而不能随意删除其他用户的文件。

因此：

```text
/tmp
```

可以允许多个用户创建文件：

```text
alice → a.txt
bob   → b.txt
```

但：

```text
alice
```

通常不能直接删除：

```text
bob 的 b.txt
```

这非常适合：

> 多用户共享目录。

---

## Sticky Bit 数字形式

Sticky Bit：

```text
1xxx
```

例如：

```bash
chmod 1777 shared
```

结果类似：

```text
drwxrwxrwt
```

---

# 特殊权限总结

可以用一个非常重要的表理解：

| 权限 | 数字 | 常见位置 | 主要作用 |
|---|---:|---|---|
| SUID | `4xxx` | 可执行文件 | 使用文件所有者的有效用户身份 |
| SGID | `2xxx` | 文件 / 目录 | 使用文件所属组身份；目录中常用于继承组 |
| Sticky Bit | `1xxx` | 目录 | 限制共享目录中的文件删除 |

对应：

```text
4xxx → SUID
2xxx → SGID
1xxx → Sticky Bit
```

例如：

```text
4755
↓
SUID + 755

2755
↓
SGID + 755

1777
↓
Sticky Bit + 777
```

---

# 特殊权限在 `ls -l` 中的表现

普通权限：

```text
rwxr-xr-x
```

加入特殊权限之后，可能看到：

```text
rwsr-xr-x
```

表示：

```text
SUID
```

或者：

```text
rwxrwsr-x
```

表示：

```text
SGID
```

或者：

```text
rwxrwxrwt
```

表示：

```text
Sticky Bit
```

如果对应执行位没有设置，可能看到：

```text
S
```

或者：

```text
T
```

例如：

```text
rwSr--r--
```

这里的：

```text
S
```

表示：

> SUID 设置了，但 User 的执行位没有设置。

类似：

```text
rw-rw-r-T
```

表示：

> Sticky Bit 设置了，但 Other 的执行位没有设置。

---

# `sudo`

前面的文件权限解决的是：

> 普通用户访问文件时拥有什么权限。

但在系统管理中，经常存在另一个问题：

> 普通用户如何执行少量需要管理员权限的操作？

这就是：

> **sudo**

例如：

```bash
sudo systemctl restart nginx
```

可以理解为：

```text
当前用户
   │
   │ sudo
   ▼
授权检查
   │
   ▼
以允许的身份执行命令
```

通常不是让普通用户直接变成：

```text
永久 root
```

而是：

> 根据 sudo 规则临时执行被授权的命令。

---

# `/etc/sudoers`

sudo 的主要配置文件：

```text
/etc/sudoers
```

查看：

```bash
sudo visudo
```

推荐通过：

```bash
visudo
```

修改，而不是直接用普通编辑器修改。

因为 `visudo` 会在保存配置前进行语法检查，避免错误配置导致 sudo 无法正常工作。

---

## sudoers 的基本形式

例如：

```text
alice ALL=(ALL) ALL
```

可以粗略理解为：

```text
alice
 ↓
允许在指定主机
 ↓
以指定用户身份
 ↓
执行指定命令
```

sudoers 的实际语法比这复杂得多，可以通过：

```bash
man sudoers
```

深入了解。

---

# `/etc/sudoers.d/`

生产环境中通常不建议把大量自定义规则全部直接写进：

```text
/etc/sudoers
```

而可以使用：

```text
/etc/sudoers.d/
```

例如：

```text
/etc/sudoers.d/deploy
/etc/sudoers.d/monitoring
```

这样可以将不同用途的授权规则拆开管理：

```text
/etc/sudoers
      │
      └── include
            │
            ├── deploy
            ├── monitoring
            └── developers
```

这种方式更适合：

```text
多人协作
配置管理
自动化部署
权限审计
```

---

# 精细化 sudo 权限

sudo 并不是只有：

```text
允许 root
```

和：

```text
不允许 root
```

两个状态。

可以进行更细粒度的授权。

例如：

```text
允许用户执行 systemctl restart nginx
```

但不允许：

```text
systemctl stop nginx
```

或者：

```text
允许执行某一个固定脚本
```

这种设计比直接：

```text
alice ALL=(ALL) ALL
```

更加符合安全原则。

例如：

```text
运维人员
↓
允许重启指定服务

开发人员
↓
允许查看日志

监控用户
↓
允许读取监控相关信息
```

不同角色获得不同的能力。

---

# 最小权限原则

权限管理中最重要的安全思想之一：

> **最小权限原则（Principle of Least Privilege）**

核心思想是：

> 用户、进程和服务只应该拥有完成任务所必需的最少权限。

例如：

一个 Nginx 服务通常不需要：

```text
任意修改系统文件
任意访问所有用户数据
```

所以应该尽量：

```text
限定运行用户
限定文件权限
限定目录访问
限定 sudo 权限
```

而不是：

```text
一律 root
```

---

## 为什么不应该所有程序都使用 root

如果某个服务存在漏洞：

```text
普通用户权限
↓
攻击影响有限

root 权限
↓
可能影响整个系统
```

因此服务运行身份非常重要。

例如：

```text
nginx
mysql
redis
应用服务
监控程序
```

通常都可以考虑使用：

> 专用服务账户。

这样可以限制：

```text
文件访问范围
系统资源访问
敏感配置读取
命令执行能力
```

这就是权限隔离的重要意义。

---

# 文件权限与 sudo 的区别

这两个概念很容易混在一起。

## 文件权限

解决：

> **当前用户能不能访问这个文件？**

例如：

```text
/etc/app/config.yaml
```

可能要求：

```text
root
```

或者：

```text
某个特定用户组
```

才能读取。

---

## sudo

解决：

> **当前用户能不能以其他授权身份执行某个命令？**

例如：

```bash
sudo systemctl restart nginx
```

这里控制的是：

```text
命令执行权限
```

而不是简单修改：

```text
文件 rwx
```

可以理解成：

```text
文件权限
↓
谁能访问对象

sudo
↓
谁能以什么身份执行哪些命令
```

---

# 一个完整的权限模型

把整篇文章串起来：

```text
                    用户
                     │
             ┌───────┴───────┐
             │               │
            UID           用户组
                             │
                    ┌────────┴────────┐
                    │                 │
                   GID              附加组
                    │
                    ▼
                  文件
                    │
           ┌────────┼────────┐
           ▼        ▼        ▼
         User     Group     Other
           │        │        │
          rwx      rwx      rwx
           │        │        │
           └────────┼────────┘
                    │
             chmod / chown
                    │
            ┌───────┴────────┐
            ▼                ▼
        基本权限          特殊权限
                          │
                   ┌──────┼──────┐
                   ▼      ▼      ▼
                 SUID    SGID   Sticky
                   │      │      │
                   └──────┼──────┘
                          │
                         sudo
                          │
                          ▼
                     管理员授权
```

---

# 实际排查权限问题

运维中经常遇到：

```text
Permission denied
```

这时候不要立即执行：

```bash
chmod 777
```

应该按照权限链路逐步排查。

例如：

```text
1. 当前是谁？
   ↓
whoami
id

2. 文件是谁的？
   ↓
ls -l

3. 用户属于哪些组？
   ↓
id

4. 文件权限是什么？
   ↓
ls -l

5. 路径上的目录有没有 x 权限？
   ↓
逐级检查目录

6. 是否存在 ACL / SELinux 等额外限制？
   ↓
进一步排查

7. 是否需要 sudo？
   ↓
确认授权规则
```

例如：

```bash
ls -l /opt/app/config.yaml
```

得到：

```text
-rw-r----- 1 root developers config.yaml
```

当前用户：

```bash
id
```

发现用户属于：

```text
developers
```

那么它可能可以通过：

```text
Group
↓
r--
```

读取该文件。

而另一个不属于：

```text
developers
```

的用户，就可能无法读取。

---

# 为什么不要随便使用 `chmod 777`

很多初学者遇到：

```text
Permission denied
```

第一反应是：

```bash
chmod 777 file
```

这样确实可能“解决问题”，但实际上可能只是：

> **绕过了问题，而不是解决问题。**

因为：

```text
777
↓
User  rwx
Group rwx
Other rwx
```

意味着其他用户也拥有完整的：

```text
读
写
执行
```

权限。

对于服务器上的：

```text
配置文件
应用数据
脚本
日志
数据库文件
密钥
```

这是非常危险的。

更合理的方法是先判断：

```text
真正需要访问这个文件的是谁？
需要什么权限？
应该通过用户还是用户组授权？
是否需要 sudo？
```

然后只授予所需权限。

---

# 一个典型的团队目录案例

假设有一个开发团队：

```text
alice
bob
charlie
```

统一属于：

```text
developers
```

项目目录：

```text
/opt/project
```

希望：

```text
developers
↓
可以共同读写

其他用户
↓
不能修改
```

可以将目录设置成：

```text
Owner: root
Group: developers
```

并使用：

```bash
sudo chmod 2775 /opt/project
```

这里：

```text
2
↓
SGID

775
↓
基本权限
```

这样目录具有：

```text
drwxrwsr-x
```

SGID 可以让新创建的文件和子目录通常继承：

```text
developers
```

这一组。

于是：

```text
/opt/project
      │
      ├── alice 创建
      │      ↓
      │   developers
      │
      ├── bob 创建
      │      ↓
      │   developers
      │
      └── charlie 创建
             ↓
          developers
```

这就是：

> **用户组 + SGID**

在实际运维中的典型使用场景。

---

# 用户与权限管理的核心思维

最终可以把 Linux 权限问题归结成三个问题：

```text
我是谁？
 ↓
UID / GID / 用户组

我要访问什么？
 ↓
文件 / 目录 / 资源

我有什么权限？
 ↓
User / Group / Other
 ↓
rwx
 ↓
特殊权限 / sudo / 其他安全机制
```

遇到：

```text
Permission denied
```

时，真正应该问的是：

```text
当前用户是谁？
       ↓
属于哪个组？
       ↓
目标文件属于谁？
       ↓
属于哪个组？
       ↓
User / Group / Other 命中了哪一组？
       ↓
这一组有什么 rwx？
       ↓
路径上的目录是否允许访问？
       ↓
是否还有特殊权限或其他安全机制？
```

而不是：

```bash
chmod 777
```

---

## 外部参考

- [Linux man-pages](https://man7.org/linux/man-pages/)
- [useradd(8)](https://man7.org/linux/man-pages/man8/useradd.8.html)
- [usermod(8)](https://man7.org/linux/man-pages/man8/usermod.8.html)
- [chmod(1)](https://man7.org/linux/man-pages/man1/chmod.1.html)
- [sudoers(5)](https://man7.org/linux/man-pages/man5/sudoers.5.html)
