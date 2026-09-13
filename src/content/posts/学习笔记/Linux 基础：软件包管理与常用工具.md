---
title: Linux 基础：软件包管理与常用工具
published: 2026-09-13T02:20:46Z
description: ''
image: ''
tags: [Linux, 软件包管理, RPM, DNF, 常用工具, 运维]
category: 学习笔记
draft: false 
lang: ''
---
> Linux 日常运维除了使用系统自带命令，还经常需要安装额外的软件，例如 `vim`、`git`、`tmux`、`rsync`、`jq`、`sysstat`、`nmap` 等。
>
> Linux 中的软件并不是简单地“下载一个文件然后运行”，而是通常通过**软件包管理器**负责安装、升级、卸载以及依赖关系处理。与此同时，服务器管理还会大量使用压缩、同步、监控、网络诊断、终端会话和数据处理等工具。
>
> 本文主要以 **RHEL / CentOS / Rocky Linux / AlmaLinux 一类系统中的 RPM + DNF 体系**为主，同时介绍 Linux 运维中非常常见的实用工具。

## Linux 软件包管理

### 什么是软件包

软件包（Package）可以理解为：

> **将软件运行所需要的文件按照一定格式组织起来的安装单元。**

一个软件包可能包含：

```text
可执行文件
配置文件
动态库
文档
服务文件
依赖信息
```

例如安装一个 Web 服务器：

```text
nginx
```

实际上并不是只得到一个：

```text
nginx
```

可执行文件。

它可能还需要：

```text
配置文件
动态库
systemd service
日志目录
其他依赖包
```

因此现代 Linux 通常通过软件包管理系统统一管理这些内容。

---

# RPM 与 DNF

## RPM

在 RHEL 系列发行版中，软件包通常使用：

```text
.rpm
```

格式。

RPM 是：

> **Red Hat Package Manager**

它负责处理单个 RPM 软件包，例如：

```bash
rpm -q bash
```

查询已安装的 Bash。

查看软件包详细信息：

```bash
rpm -qi bash
```

查看软件包包含哪些文件：

```bash
rpm -ql bash
```

查询某个文件属于哪个软件包：

```bash
rpm -qf /usr/bin/bash
```

因此：

```text
rpm
↓
直接管理 RPM 软件包
```

---

## DNF

在现代 RHEL 系发行版中，更常用的是：

> **DNF**

DNF 建立在 RPM 软件包体系之上，除了能够安装和卸载 RPM 包，还会处理：

```text
软件仓库
依赖关系
版本
更新
软件搜索
```

因此：

```text
RPM
↓
软件包格式与底层管理

DNF
↓
更高层的软件包管理
```

实际使用 Linux 服务器时，通常优先使用：

```bash
dnf
```

而不是手动操作 RPM 文件。

---

# DNF 基本操作

## 搜索软件

例如：

```bash
dnf search nginx
```

可以搜索软件包。

查看软件包详细信息：

```bash
dnf info nginx
```

---

## 安装软件

例如：

```bash
sudo dnf install nginx
```

安装多个软件：

```bash
sudo dnf install vim git curl wget
```

整个过程通常包括：

```text
查找软件包
   ↓
检查仓库
   ↓
解析依赖
   ↓
下载软件包
   ↓
安装
```

---

## 卸载软件

```bash
sudo dnf remove nginx
```

DNF 会根据软件包依赖关系处理相关操作。

---

## 更新软件

更新所有可升级软件：

```bash
sudo dnf upgrade
```

有些系统也支持：

```bash
sudo dnf update
```

在现代 DNF 环境中，两者在常见使用场景下通常等价或高度接近。

---

## 查看已安装软件

例如：

```bash
dnf list installed
```

查看指定软件：

```bash
dnf list installed nginx
```

---

## 查看可更新软件

```bash
dnf check-update
```

它可以帮助确认当前系统中有哪些软件存在更新。

---

## 清理缓存

DNF 会维护软件包缓存。

可以使用：

```bash
sudo dnf clean all
```

清理缓存数据。

一般不需要频繁手动清理，只有在：

```text
仓库缓存异常
磁盘空间不足
软件仓库状态异常
```

等情况下才会考虑。

---

# 软件仓库

### 什么是 Repository

DNF 通常不是直接从某个随机网站下载软件，而是通过：

> **Software Repository（软件仓库）**

获取软件包。

可以理解为：

```text
DNF
 │
 ▼
软件仓库
 │
 ├── nginx
 ├── vim
 ├── git
 ├── rsync
 └── ...
```

仓库同时提供：

```text
软件包
版本
依赖信息
元数据
```

因此：

```text
dnf install nginx
```

背后实际上包含：

```text
查询仓库
 ↓
找到 nginx
 ↓
解析依赖
 ↓
下载相关包
 ↓
安装
```

---

## 软件源配置

RHEL 系系统中的仓库配置通常位于：

```text
/etc/yum.repos.d/
```

例如：

```text
/etc/yum.repos.d/example.repo
```

查看当前软件仓库：

```bash
dnf repolist
```

可以看到系统当前启用的仓库。

这也是排查：

```text
为什么找不到某个软件？
为什么无法安装？
为什么软件版本不对？
```

时需要关注的地方。

---

# RPM 常用查询

虽然日常更推荐使用 DNF 安装和升级软件，但理解 RPM 查询功能仍然非常有用。

## 查看软件是否安装

```bash
rpm -q nginx
```

---

## 查看软件版本

```bash
rpm -q bash
```

可能得到：

```text
bash-5.x.x-...
```

---

## 查看软件详细信息

```bash
rpm -qi nginx
```

可以查看：

```text
名称
版本
架构
安装时间
打包者
描述
```

---

## 查看软件安装了哪些文件

```bash
rpm -ql nginx
```

可以帮助回答：

```text
配置文件在哪里？
二进制文件在哪里？
systemd service 在哪里？
日志目录在哪里？
```

---

## 根据文件查软件包

例如：

```bash
rpm -qf /usr/bin/bash
```

可以回答：

> `/usr/bin/bash` 属于哪个 RPM 软件包？

这在排查系统文件来源时非常有用。

---

# Debian / Ubuntu：APT

Linux 软件包管理并不是只有 RPM / DNF。

Debian、Ubuntu 等系统通常使用：

```text
.deb
```

软件包体系以及：

> **APT**

常见操作：

```bash
sudo apt update
sudo apt install nginx
sudo apt remove nginx
sudo apt upgrade
```

搜索：

```bash
apt search nginx
```

查看信息：

```bash
apt show nginx
```

可以形成这样的对应关系：

| RHEL 系 | Debian 系 |
|---|---|
| RPM | DEB |
| DNF | APT |
| `dnf install` | `apt install` |
| `dnf remove` | `apt remove` |
| `dnf upgrade` | `apt upgrade` |

需要注意：

> RPM / DNF 和 DEB / APT 是不同的软件包体系。

因此写跨发行版脚本时，不能假设所有 Linux 都存在：

```bash
dnf
```

或者：

```bash
apt
```

---

# 压缩与归档工具

软件安装之外，服务器管理还经常需要处理：

```text
压缩包
备份文件
日志
发布包
程序目录
```

其中最重要的工具之一就是：

```text
tar
```

---

## `tar`：文件归档

`tar` 主要用于：

> **归档（Archive）**

它本身主要负责把多个文件和目录组织成一个归档文件。

例如：

```bash
tar -cf app.tar app/
```

得到：

```text
app.tar
```

解包：

```bash
tar -xf app.tar
```

---

## tar + gzip

如果希望同时使用 gzip 压缩：

```bash
tar -czf app.tar.gz app/
```

解压：

```bash
tar -xzf app.tar.gz
```

这里：

```text
tar
↓
归档

gzip
↓
压缩
```

所以：

```text
.tar
↓
归档

.tar.gz
↓
gzip 压缩的 tar 归档
```

常用参数：

| 参数 | 含义 |
|---|---|
| `-c` | 创建归档 |
| `-x` | 解包 |
| `-f` | 指定归档文件 |
| `-z` | 使用 gzip |
| `-v` | 显示处理过程 |

例如：

```bash
tar -xzvf app.tar.gz
```

表示：

```text
解压
+
gzip
+
显示过程
+
指定文件
```

GNU tar 的完整行为可以参考 [GNU tar Manual](https://www.gnu.org/software/tar/manual/)。

---

# `gzip`：gzip 压缩

`gzip` 主要针对单个文件进行压缩。

例如：

```bash
gzip app.log
```

生成：

```text
app.log.gz
```

解压：

```bash
gzip -d app.log.gz
```

或者：

```bash
gunzip app.log.gz
```

需要注意：

> `gzip` 本身主要负责压缩，不负责把多个文件组织成一个归档。

因此多个文件通常配合：

```bash
tar
```

使用：

```bash
tar -czf app.tar.gz app/
```

---

# `zip` 与 `unzip`

ZIP 是另一种常见压缩格式。

压缩文件：

```bash
zip app.zip app.log
```

压缩整个目录：

```bash
zip -r app.zip app/
```

解压：

```bash
unzip app.zip
```

指定解压目录：

```bash
unzip app.zip -d /opt/app/
```

在跨平台场景中：

```text
zip
↓
通常比 tar.gz 更常见于 Windows / Linux 之间的文件交换
```

---

# 文件同步与传输

## `rsync`

`rsync` 主要用于：

> **目录同步和文件传输**

本地同步：

```bash
rsync -av ./app/ /opt/app/
```

远程同步：

```bash
rsync -av ./app/ user@server:/opt/app/
```

远程同步到本地：

```bash
rsync -av user@server:/opt/app/ ./app/
```

它的一个重要特点是：

> 会尽量只传输发生变化的数据。

因此非常适合：

```text
项目同步
备份
部署
大量文件重复传输
```

---

## rsync 常用参数

| 参数 | 含义 |
|---|---|
| `-a` | archive，归档模式 |
| `-v` | 显示详细信息 |
| `-z` | 传输过程中压缩 |
| `-P` | 显示进度并保留部分传输数据 |

例如：

```bash
rsync -avzP ./app/ user@server:/opt/app/
```

---

## rsync 的目录 `/`

使用 `rsync` 时一个非常容易出错的地方是：

> **源目录最后有没有 `/`。**

例如：

```bash
rsync -av app/ /opt/app/
```

表示：

> 同步 `app` 目录中的内容。

而：

```bash
rsync -av app /opt/
```

通常会得到：

```text
/opt/app/
```

可以直观理解为：

```text
app/
 ↓
同步里面的内容

app
 ↓
把 app 本身作为目录进行同步
```

实际部署脚本中一定要特别注意这一点。

---

# `scp`：简单文件传输

如果只是想通过 SSH 快速复制文件，可以使用：

```bash
scp app.tar.gz user@server:/opt/
```

从远程复制到本地：

```bash
scp user@server:/opt/app.tar.gz .
```

复制目录：

```bash
scp -r app/ user@server:/opt/
```

可以简单区分：

```text
scp
↓
简单复制

rsync
↓
同步 / 增量传输
```

如果需要重复部署相同目录，通常 `rsync` 更有优势。

---

# `rz` / `sz`

`rz` 和 `sz` 通常由：

```text
lrzsz
```

软件包提供。

安装：

```bash
sudo dnf install lrzsz
```

接收文件：

```bash
rz
```

发送文件：

```bash
sz app.log
```

它们依赖当前终端软件对：

> **ZMODEM**

的支持。

因此更适合：

```text
SSH 终端
少量文件
交互式传输
```

可以大致比较：

```text
scp
↓
直接通过 SSH 复制

rsync
↓
适合目录同步

rz / sz
↓
依赖终端软件的交互式文件传输
```

---

# 终端会话管理

服务器运维中经常遇到一个问题：

```text
SSH 断开了
程序怎么办？
```

如果程序直接依附于当前终端，会话结束可能影响程序运行。

这时可以使用：

```text
screen
tmux
```

---

## `screen`

创建：

```bash
screen
```

指定名称：

```bash
screen -S app
```

查看：

```bash
screen -ls
```

重新连接：

```bash
screen -r
```

从当前会话分离：

```text
Ctrl + A
D
```

其中：

```text
Ctrl + A
↓
screen 命令前缀

D
↓
detach
```

分离不会结束会话中的程序。

---

## `tmux`

`tmux` 同样可以创建持久化终端会话。

启动：

```bash
tmux
```

创建指定名称：

```bash
tmux new -s app
```

查看：

```bash
tmux ls
```

连接：

```bash
tmux attach -t app
```

分离：

```text
Ctrl + B
D
```

---

## tmux 的 session、window 与 pane

`tmux` 不仅可以保持终端会话，还提供：

```text
session
├── window
│   ├── pane
│   └── pane
│
└── window
    ├── pane
    └── pane
```

因此可以：

```text
一个 SSH
 ↓
一个 tmux session
 ↓
多个 window
 ↓
每个 window 多个 pane
```

非常适合服务器开发和运维。

---

## screen 与 tmux

两者都可以解决：

```text
SSH 连接
   ↓
创建持久化会话
   ↓
启动程序
   ↓
SSH 断开
   ↓
程序继续运行
   ↓
重新 SSH
   ↓
重新连接会话
```

可以简单记忆：

```text
screen
↓
经典、简单、兼容性好

tmux
↓
现代、功能丰富、分屏能力强
```

实际工作中掌握其中一个即可，另外一个知道基本概念。

---

# 系统性能监控工具

当服务器“变慢”时，需要回答：

```text
CPU 是否繁忙？
内存是否不足？
磁盘 I/O 是否异常？
是否在使用 swap？
```

这时可以使用：

```text
free
vmstat
iostat
sar
```

---

## `free`：查看内存

```bash
free -h
```

常见字段：

```text
total
used
free
buff/cache
available
```

其中：

> **`available` 通常比简单观察 `free` 更适合判断系统当前还可以提供多少内存给新的程序使用。**

因此不能简单认为：

```text
free 很低
↓
内存一定不足
```

Linux 会积极利用空闲内存作为缓存。

---

# `vmstat`：观察系统整体状态

`vmstat` 可以同时观察：

```text
进程
内存
交换
I/O
系统中断
CPU
```

查看一次：

```bash
vmstat
```

每秒采样：

```bash
vmstat 1
```

采样 5 次：

```bash
vmstat 1 5
```

它适合回答：

```text
系统是否整体繁忙？
是否存在明显内存压力？
是否大量使用 swap？
是否存在 I/O 压力？
```

因此：

> `vmstat` 更像一个系统整体状态观察工具。

---

# `iostat`：分析磁盘 I/O

`iostat` 通常由：

```text
sysstat
```

软件包提供。

安装：

```bash
sudo dnf install sysstat
```

查看：

```bash
iostat
```

查看扩展设备统计：

```bash
iostat -x
```

持续观察：

```bash
iostat -x 1
```

常见指标：

```text
r/s
w/s
rkB/s
wkB/s
await
%util
```

可以粗略理解：

```text
r/s
↓
每秒读请求

w/s
↓
每秒写请求

await
↓
I/O 请求平均等待时间

%util
↓
设备忙碌程度
```

它主要用于判断：

> **磁盘 I/O 是否可能成为系统瓶颈。**

---

# `sar`：系统活动统计

`sar` 同样属于：

```text
sysstat
```

可以观察：

```text
CPU
内存
网络
磁盘
```

例如：

```bash
sar -u
```

查看 CPU：

```bash
sar -u
```

查看内存：

```bash
sar -r
```

查看网络：

```bash
sar -n DEV
```

查看磁盘：

```bash
sar -d
```

可以简单区分：

```text
iostat
↓
重点看当前 I/O

sar
↓
更侧重系统活动统计和历史数据
```

如果配置好了 sysstat 数据采集，`sar` 还可以用于查看过去一段时间的系统活动。

---

# 进程与资源排查

## `lsof`

`lsof` 可以查看：

> **进程打开的文件。**

例如：

```bash
lsof /var/log/app.log
```

可以查看：

> 哪些进程正在使用这个文件。

查看指定 PID：

```bash
lsof -p 1234
```

查看指定用户：

```bash
lsof -u alice
```

查看端口：

```bash
lsof -i :8080
```

因此：

```text
文件被谁打开？
↓
lsof file

哪个进程占用了端口？
↓
lsof -i :8080

进程打开了什么？
↓
lsof -p PID
```

在服务器故障排查中非常实用。

---

# 网络诊断工具

网络问题是运维中非常常见的一类问题：

```text
端口有没有监听？
网络是否连通？
经过哪些路由？
远端端口是否开放？
```

可以使用：

```text
ss
ping
traceroute
nmap
curl
```

---

## `ss`：查看 Socket 和端口

现代 Linux 中通常优先使用：

```bash
ss
```

查看 TCP 监听端口：

```bash
ss -lnt
```

显示进程：

```bash
ss -lntp
```

查看所有 TCP 连接：

```bash
ss -ant
```

查看 UDP：

```bash
ss -lun
```

常见参数：

| 参数 | 含义 |
|---|---|
| `-l` | listening |
| `-n` | 数字形式显示地址和端口 |
| `-t` | TCP |
| `-u` | UDP |
| `-p` | 显示进程 |
| `-a` | 所有 socket |

例如：

```bash
ss -lntp
```

可以快速回答：

```text
8080 有没有监听？
谁在监听 8080？
```

---

## `netstat`

传统环境中还经常遇到：

```bash
netstat
```

例如：

```bash
netstat -lntp
```

不过现代 Linux 通常优先使用：

```bash
ss
```

因此：

```text
ss
↓
优先掌握

netstat
↓
了解旧系统 / 旧教程
```

---

# `ping`

最基础的网络连通性测试：

```bash
ping example.com
```

可以用于初步判断：

```text
DNS 是否能解析
目标是否能够响应 ICMP
往返延迟大致如何
```

但：

> **ping 不通不等于所有网络服务都不可用。**

原因可能包括：

```text
目标禁止 ICMP
防火墙过滤
网络策略限制
```

因此实际排查时不能只依赖 `ping`。

---

# `traceroute`

查看从本机到目标的网络路径：

```bash
traceroute example.com
```

它可以帮助观察：

```text
经过哪些网络节点？
哪一跳延迟较高？
路径在哪里发生变化？
```

但部分设备可能不会响应探测，因此出现：

```text
*
```

并不一定代表该链路真的发生故障。

---

# `nmap`

`nmap` 用于：

> **主机和端口探测。**

安装：

```bash
sudo dnf install nmap
```

扫描主机：

```bash
nmap 192.168.1.10
```

扫描指定端口：

```bash
nmap -p 80,443 192.168.1.10
```

扫描端口范围：

```bash
nmap -p 1-1000 192.168.1.10
```

它和 `ss` 的角度不同：

```text
ss
↓
从目标主机本地观察监听情况

nmap
↓
从网络角度探测端口
```

只应对：

> **自己管理或明确获得授权的主机进行扫描。**

---

# `curl`：HTTP 与接口测试

`curl` 是服务器运维中非常重要的工具。

请求网页：

```bash
curl https://example.com
```

只查看响应头：

```bash
curl -I https://example.com
```

指定请求方法：

```bash
curl -X POST https://example.com/api
```

发送 JSON：

```bash
curl \
  -H 'Content-Type: application/json' \
  -d '{"name":"linux"}' \
  https://example.com/api
```

因此：

```text
curl
↓
HTTP / HTTPS 测试
↓
API 调试
↓
服务健康检查
↓
自动化脚本
```

是运维中非常值得掌握的命令。

---

# 文本处理工具

Shell 自动化中经常需要处理：

```text
日志
配置
命令输出
统计结果
```

常见工具包括：

```text
grep
awk
sed
cut
sort
uniq
xargs
```

这些工具在《Linux 基础：文本检索与处理》中已经系统介绍，这里只强调它们在自动化运维中的位置。

例如：

```bash
grep "ERROR" app.log
```

筛选日志。

```bash
awk '{print $1}' app.log
```

提取字段。

```bash
sort file.txt | uniq -c
```

统计重复内容。

```bash
find . -name "*.log" | xargs ...
```

将搜索结果交给其他命令处理。

典型思路：

```text
获取数据
 ↓
grep
 ↓
过滤
 ↓
awk / cut
 ↓
提取
 ↓
sort
 ↓
排序
 ↓
uniq / wc
 ↓
统计
```

---

# JSON 工具

## `jq`

现代运维中大量系统会通过 API 输出：

> **JSON**

这时 `jq` 非常有用。

安装：

```bash
sudo dnf install jq
```

格式化：

```bash
echo '{"name":"Tom","age":18}' | jq
```

获取字段：

```bash
echo '{"name":"Tom","age":18}' | jq '.name'
```

也可以处理 API 返回结果：

```bash
curl https://example.com/api/user | jq
```

获取字段：

```bash
curl https://example.com/api/user | jq '.name'
```

因此：

```text
curl
 ↓
获取 JSON
 ↓
jq
 ↓
提取数据
```

是现代 Linux 自动化中非常常见的一种组合。

---

# `tree`：查看目录结构

`tree` 可以使用树形结构展示目录。

安装：

```bash
sudo dnf install tree
```

查看：

```bash
tree
```

限制深度：

```bash
tree -L 2
```

例如：

```text
app/
├── bin/
├── conf/
├── logs/
└── lib/
```

非常适合：

```text
理解项目目录
检查部署结构
快速查看文件层次
```

---

# 常用工具选择

面对实际问题时，不应该只记住命令，而应该建立工具选择的直觉。

| 场景 | 工具 |
|---|---|
| 安装软件 | `dnf` / `apt` |
| 查询 RPM | `rpm` |
| 压缩归档 | `tar` |
| gzip 压缩 | `gzip` |
| ZIP | `zip` / `unzip` |
| 文件同步 | `rsync` |
| 简单复制 | `scp` |
| 终端会话 | `tmux` / `screen` |
| 查看内存 | `free` |
| 系统整体状态 | `vmstat` |
| 磁盘 I/O | `iostat` |
| 系统活动统计 | `sar` |
| 查看进程打开文件 | `lsof` |
| 查看端口 | `ss` |
| 网络路径 | `traceroute` |
| 端口探测 | `nmap` |
| HTTP 请求 | `curl` |
| JSON 处理 | `jq` |
| 目录树 | `tree` |
| 文本搜索 | `grep` |
| 文本分析 | `awk` |
| 文本修改 | `sed` |

---

# 一个实际的服务器排查流程

假设用户反馈：

> “服务器上的 Web 服务访问很慢。”

可以先从宏观状态开始：

```bash
uptime
free -h
vmstat 1 5
```

观察：

```text
CPU
内存
load
swap
I/O
```

如果怀疑磁盘：

```bash
iostat -xz 1
```

如果怀疑网络服务：

```bash
ss -lntp
```

确认：

```text
80
443
8080
```

等端口是否监听。

再测试 HTTP：

```bash
curl -I http://localhost
```

查看响应状态。

如果怀疑日志：

```bash
tail -n 100 /var/log/nginx/access.log
```

再：

```bash
grep "500" /var/log/nginx/access.log
```

统计状态码：

```bash
awk '{print $9}' /var/log/nginx/access.log \
    | sort \
    | uniq -c \
    | sort -nr
```

如果发现磁盘空间不足：

```bash
df -h
```

然后：

```bash
du -sh /var/log/*
```

寻找占用空间较大的目录。

如果某个端口无法启动：

```bash
ss -lntp
```

检查端口是否已经被其他进程占用。

再：

```bash
lsof -i :8080
```

确认具体进程。

这就是运维工作中非常典型的：

```text
现象
 ↓
系统状态
 ↓
资源
 ↓
网络
 ↓
服务
 ↓
日志
 ↓
定位
```

---

# 工具之间的组合

Linux 工具真正强大的地方并不在于：

> “每个工具都非常复杂。”

而在于：

> **不同工具可以通过标准输入、标准输出和管道组合起来。**

例如：

```bash
ps -ef | grep nginx
```

或者：

```bash
ss -lntp | grep 8080
```

再比如：

```bash
df -h | grep '^/dev'
```

以及：

```bash
curl -s https://example.com/api | jq '.data'
```

它们都是：

```text
工具 A
 ↓
输出
 ↓
工具 B
 ↓
继续处理
```

这也是 Linux 命令行设计非常重要的思想：

```text
小工具
 +
标准输入输出
 +
管道
 =
复杂操作
```

---

# 运维工具学习路线

这些工具不需要一次性全部记住。

可以按照实际使用频率逐步掌握。

第一阶段：

```text
dnf
rpm
tar
rsync
scp
curl
ss
```

第二阶段：

```text
tmux
lsof
free
vmstat
iostat
grep
awk
sed
```

第三阶段：

```text
sar
nmap
jq
tree
screen
```

等实际遇到问题再深入。

真正重要的是：

> **知道遇到什么问题应该想到什么工具。**

例如：

```text
软件装不上
↓
dnf / rpm

压缩包
↓
tar

目录同步
↓
rsync

SSH 文件复制
↓
scp

端口问题
↓
ss / lsof

HTTP 服务问题
↓
curl

磁盘 I/O
↓
iostat

内存问题
↓
free / vmstat

历史性能
↓
sar

JSON
↓
jq
```

这比单纯背诵大量命令更加实用。

---

# Linux 常用工具的整体认识

可以把这一篇的工具体系理解成：

```text
Linux 常用工具
│
├── 软件包管理
│   ├── rpm
│   ├── dnf
│   └── apt
│
├── 文件与压缩
│   ├── tar
│   ├── gzip
│   ├── zip
│   └── unzip
│
├── 文件传输与同步
│   ├── scp
│   ├── rsync
│   └── rz / sz
│
├── 终端会话
│   ├── tmux
│   └── screen
│
├── 系统性能
│   ├── free
│   ├── vmstat
│   ├── iostat
│   └── sar
│
├── 进程与资源
│   └── lsof
│
├── 网络诊断
│   ├── ss
│   ├── ping
│   ├── traceroute
│   ├── nmap
│   └── curl
│
├── 文本处理
│   ├── grep
│   ├── awk
│   ├── sed
│   ├── cut
│   ├── sort
│   └── uniq
│
└── 数据处理
    ├── jq
    └── tree
```

这些工具共同组成了 Linux 运维工作中的基础工具箱。

后续学习：

```text
Linux 进程管理
Linux 存储
Linux 网络诊断
Shell 自动化
Nginx
Docker
Kubernetes
监控与可观测性
```

时，这些命令都会反复出现。

因此真正需要形成的能力并不是：

```text
“我背过多少 Linux 命令”
```

而是：

```text
看到问题
   ↓
判断属于哪个系统领域
   ↓
选择合适工具
   ↓
组合多个工具
   ↓
得到证据
   ↓
定位问题
```

这才是 Linux 运维工具真正的使用方式。

---

## 外部参考

- [DNF Documentation](https://dnf.readthedocs.io/)
- [RPM Documentation](https://rpm.org/documentation.html)
- [GNU tar Manual](https://www.gnu.org/software/tar/manual/)
- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
- [Linux man-pages](https://man7.org/linux/man-pages/)
