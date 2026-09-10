---
title: Linux 常用工具
published: 2026-09-09
image: ''
tags: [Linux, 操作系统, 运维]
category: 学习笔记
---

> 本文以 CentOS 为主要环境，整理 Linux 日常使用和服务器管理中常见的实用工具。
> 
> 本文主要介绍通常需要额外安装的工具，并按照文件处理、网络诊断、系统性能监控、终端会话等用途进行分类。
## 文件与压缩工具

### `tar`：文件归档

`tar` 主要用于将多个文件和目录打包成一个归档文件，本身主要负责**归档**，压缩通常由 `gzip` 等程序完成。

创建归档：

```bash
tar -cf app.tar app/
```

解包：

```bash
tar -xf app.tar
```

创建 `gzip` 压缩的归档：

```bash
tar -czf app.tar.gz app/
```

解压：

```bash
tar -xzf app.tar.gz
```

常用参数：

```text
-c    create，创建归档
-x    extract，解包
-f    file，指定归档文件
-z    使用 gzip
-v    显示处理过程
```

例如：

```bash
tar -xzvf app.tar.gz
```

其中 `.tar` 表示归档文件，而 `.tar.gz` 表示经过 gzip 压缩的 tar 归档。

---

### `gzip`：gzip 压缩

`gzip` 主要用于压缩单个文件。

压缩：

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

也可以使用：

```bash
gunzip app.log.gz
```

`gzip` 不负责将多个文件组织成一个归档，因此多个文件通常配合 `tar` 使用：

```bash
tar -czf app.tar.gz app/
```

---

### `zip`：ZIP 压缩

压缩文件：

```bash
zip app.zip app.log
```

递归压缩目录：

```bash
zip -r app.zip app/
```

其中 `-r` 表示递归处理目录。

---

### `unzip`：解压 ZIP 文件

```bash
unzip app.zip
```

指定解压目录：

```bash
unzip app.zip -d /opt/app/
```

---

## 文件同步与远程传输

### `rsync`：文件同步

`rsync` 主要用于本地或远程目录之间的同步。它会比较源文件和目标文件，只传输发生变化的部分，因此非常适合重复同步大量文件。

本地同步：

```bash
rsync -av ./app/ /opt/app/
```

远程同步：

```bash
rsync -av ./app/ user@server:/opt/app/
```

从远程服务器同步到本地：

```bash
rsync -av user@server:/opt/app/ ./app/
```

常用参数：

```text
-a    archive，归档模式
-v    显示详细过程
-z    传输时压缩数据
-P    显示进度，并保留部分传输数据
```

例如：

```bash
rsync -avzP ./app/ user@server:/opt/app/
```

需要特别注意目录末尾的 `/`：

```bash
rsync -av app/ /opt/app/
```

表示同步 `app` 目录**里面的内容**。

而：

```bash
rsync -av app /opt/
```

则通常会得到：

```text
/opt/app/
```

因此使用 `rsync` 时，是否带 `/` 会直接影响同步结果。

---

### `rz` / `sz`：通过 ZMODEM 传输文件

`rz` 和 `sz` 通常由 `lrzsz` 软件包提供。

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

它们依赖当前终端软件支持 ZMODEM，适合通过 SSH 终端快速传输少量文件。

与 `scp`、`rsync` 相比：

```text
scp
→ 直接复制文件

rsync
→ 更适合目录同步

rz / sz
→ 依赖终端软件进行交互式传输
```

---

## 终端会话管理

### `screen`：持久化终端会话

`screen` 可以创建一个独立的终端会话。即使 SSH 连接断开，程序仍然可以继续运行，之后可以重新连接到原来的会话。

创建会话：

```bash
screen
```

或者指定名称：

```bash
screen -S app
```

查看会话：

```bash
screen -ls
```

重新连接：

```bash
screen -r
```

重新连接指定会话：

```bash
screen -r app
```

从当前会话分离：

```text
Ctrl + A
D
```

这里：

```text
Ctrl + A
```

是 `screen` 的命令前缀，之后按：

```text
D
```

表示 detach，即从会话分离。

分离并不会结束会话中的程序。

---

### `tmux`：终端复用

`tmux` 与 `screen` 类似，也可以创建不会随着 SSH 连接关闭而消失的终端会话。

启动：

```bash
tmux
```

创建指定名称的会话：

```bash
tmux new -s app
```

查看会话：

```bash
tmux ls
```

连接：

```bash
tmux attach -t app
```

从会话分离：

```text
Ctrl + B
D
```

`tmux` 除了持久化终端，还提供：

```text
session
window
pane
```

三层结构，可以在一个终端中创建多个窗口和分屏。

---

### `screen` 与 `tmux`

两者解决的问题基本相同：

```text
SSH 连接
   ↓
创建 screen / tmux 会话
   ↓
启动程序
   ↓
断开 SSH
   ↓
程序继续运行
   ↓
重新 SSH
   ↓
重新连接会话
```

两者最大的区别并不是“能不能后台运行”，而是终端复用功能和使用方式不同。

---

## 系统性能监控

### `vmstat`：查看系统整体状态

`vmstat` 可以同时观察：

```text
进程
内存
交换分区
I/O
系统中断
CPU
```

查看一次：

```bash
vmstat
```

每秒采样一次：

```bash
vmstat 1
```

采样 5 次：

```bash
vmstat 1 5
```

它适合快速回答：

```text
CPU 是否繁忙？
内存是否紧张？
是否大量使用 swap？
系统是否存在明显 I/O 压力？
```

`vmstat` 更适合作为“整体状态观察工具”，而不是专门分析某一个硬件指标。

---

### `iostat`：查看磁盘 I/O

`iostat` 属于 `sysstat` 软件包。

安装：

```bash
sudo dnf install sysstat
```

查看基本信息：

```bash
iostat
```

查看设备详细统计：

```bash
iostat -x
```

持续每秒查看：

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

其中：

```text
r/s
→ 每秒读请求数

w/s
→ 每秒写请求数

await
→ I/O 请求平均等待时间

%util
→ 设备处于忙碌状态的时间比例
```

`iostat` 主要用于判断：

```text
磁盘 I/O 是否成为系统瓶颈
```

---

### `sar`：查看系统活动统计

`sar` 同样属于 `sysstat`。

安装：

```bash
sudo dnf install sysstat
```

CPU：

```bash
sar -u
```

内存：

```bash
sar -r
```

网络：

```bash
sar -n DEV
```

磁盘：

```bash
sar -d
```

与 `iostat` 相比：

```text
iostat
→ 重点查看 I/O 设备统计

sar
→ 重点查看系统活动及历史统计
```

在配置好数据采集后，`sar` 可以用于分析过去一段时间的 CPU、内存、网络和 I/O 使用情况。

---

### `free`：查看内存

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

其中 `available` 更适合判断当前系统大致还有多少内存可以提供给新的程序使用。

---

## 进程与资源占用排查

### `lsof`：查看进程打开的文件

`lsof` 可以查看进程当前打开的文件。

查看文件被哪些进程打开：

```bash
lsof /var/log/app.log
```

查看指定进程：

```bash
lsof -p 1234
```

查看指定用户：

```bash
lsof -u user1
```

查看端口：

```bash
lsof -i :8080
```

常见用途：

```text
哪个进程打开了这个文件？
哪个进程占用了这个端口？
文件已经删除，为什么磁盘空间仍然没有释放？
```

---

## 网络诊断与分析

### `ss`：查看 Socket 和端口

`ss` 是现代 Linux 中常用的网络状态查看工具。

查看 TCP 监听端口：

```bash
ss -lnt
```

显示对应进程：

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

常用参数：

```text
-l    listening，监听状态
-n    不解析主机名和服务名
-t    TCP
-u    UDP
-p    显示进程
-a    所有 socket
```

例如：

```bash
ss -lntp
```

可以快速回答：

```text
某个端口是否正在监听？
哪个进程正在监听？
```

---

### `netstat`：传统网络状态查看工具

```bash
netstat -lntp
```

可以查看监听中的 TCP 端口及对应进程。

常见参数：

```text
-l    监听
-n    数字形式显示地址和端口
-t    TCP
-u    UDP
-p    显示进程
-a    所有连接
```

`netstat` 是传统工具，现代 Linux 环境通常优先使用 `ss`。

因此：

```text
ss
→ 推荐掌握

netstat
→ 兼容旧环境和旧教程
```

---

### `nmap`：端口与主机扫描

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

`nmap` 与 `ss` 的观察角度不同：

```text
ss
→ 在目标主机本地查看哪些端口正在监听

nmap
→ 从网络一侧检查哪些端口能够被探测到
```

因此它常用于网络连通性和服务暴露情况的排查。

> 只对自己管理或明确授权的主机进行扫描。

---

### `traceroute`：查看网络路径

安装：

```bash
sudo dnf install traceroute
```

使用：

```bash
traceroute example.com
```

`traceroute` 会尝试显示从本机到目标地址经过的网络路径。

常用于排查：

```text
网络请求经过哪些路由？
延迟主要出现在哪一跳？
网络路径是否发生异常？
```

部分网络设备可能不会响应 traceroute 探测，因此出现 `*` 不一定代表该设备或链路已经发生故障。

---

## 文本处理工具

### `awk`：按字段处理文本

`awk` 特别适合处理具有列结构的文本，例如日志、命令输出和简单的数据文件。

输出第一列：

```bash
awk '{print $1}' data.txt
```

输出第一、第二列：

```bash
awk '{print $1, $2}' data.txt
```

根据条件筛选：

```bash
awk '$3 > 100 {print $0}' data.txt
```

统计：

```bash
awk '{sum += $2} END {print sum}' data.txt
```

常见用途：

```text
提取字段
过滤数据
统计数据
处理日志
```

---

### `sed`：流式编辑文本

替换：

```bash
sed 's/old/new/g' app.conf
```

删除第 5 行：

```bash
sed '5d' app.conf
```

查看第 10～20 行：

```bash
sed -n '10,20p' app.log
```

常见用途：

```text
文本替换
删除指定行
提取指定范围
批量修改配置
```

与 `grep` 的区别：

```text
grep
→ 查找

sed
→ 修改 / 转换 / 提取
```

---

### `xargs`：批量执行命令

`xargs` 可以将标准输入转换成命令参数。

例如：

```bash
find /tmp -name "*.log" | xargs rm
```

相当于将 `find` 的结果交给 `rm` 批量处理。

对于文件名可能包含空格、换行等特殊字符的情况，应使用 NUL 分隔：

```bash
find /tmp -name "*.log" -print0 | xargs -0 rm
```

这里：

```text
-print0
→ 使用 NUL 分隔文件名

-0
→ xargs 按 NUL 分隔输入
```

这样可以更加安全地处理特殊文件名。

---

## JSON 数据处理

### `jq`：处理 JSON

安装：

```bash
sudo dnf install jq
```

格式化 JSON：

```bash
echo '{"name":"Tom","age":18}' | jq
```

获取字段：

```bash
echo '{"name":"Tom","age":18}' | jq '.name'
```

处理 API 返回结果：

```bash
curl http://localhost:8080/api/user | jq
```

例如只获取用户名称：

```bash
curl http://localhost:8080/api/user | jq '.name'
```

`jq` 非常适合：

```text
REST API
JSON 配置
自动化脚本
日志和接口数据处理
```

---

## 目录结构查看

### `tree`：以树形结构查看目录

安装：

```bash
sudo dnf install tree
```

查看当前目录：

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

非常适合快速理解项目目录结构。
