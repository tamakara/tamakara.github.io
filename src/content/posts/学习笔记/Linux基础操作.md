---
title: Linux 基础操作
published: 2026-09-09
updated: 2026-09-09
image: ''
tags: [Linux, 操作系统, 运维]
category: 学习笔记
---
> 本文以 **CentOS** 为主要环境，整理 Linux 日常使用和服务器管理中最基础的操作。
>
> 本文只介绍基础系统操作，不涉及需要额外安装的常用工具，例如 `tar`、`rsync`、`screen`、`nmap`、`sar`、`iostat`、`rz/sz` 等。

---

## 终端快捷键

Linux 终端中的快捷键主要由终端驱动和 Shell 处理。部分快捷键会向前台进程发送信号，部分则只是控制当前命令行输入。

### `Ctrl + C`：发送 `SIGINT`

```text
Ctrl + C
    ↓
SIGINT (2)
```

`Ctrl + C` 会向当前终端的**前台进程组**发送 `SIGINT`（Interrupt）信号。

通常用于中断正在运行的前台程序。

例如：

```bash
ping 127.0.0.1
```

按下：

```text
Ctrl + C
```

程序通常会收到 `SIGINT` 并退出。

注意：

```text
Ctrl + C → SIGINT (2)
kill PID → SIGTERM (15)
```

两者不是同一个信号。

`SIGINT` 可以被程序捕获并处理，因此程序可以根据自己的逻辑决定如何响应。

### `Ctrl + Z`：发送 `SIGTSTP`

```text
Ctrl + Z
    ↓
SIGTSTP
```

`Ctrl + Z` 会向前台进程组发送 `SIGTSTP`，请求暂停当前程序。

例如：

```bash
ping 127.0.0.1
```

按：

```text
Ctrl + Z
```

程序会进入暂停状态，而不是退出。

查看当前 Shell 中的作业：

```bash
jobs
```

恢复到前台：

```bash
fg
```

恢复到后台：

```bash
bg
```

因此：

```text
Ctrl + C → 请求中断程序
Ctrl + Z → 请求暂停程序
```

### `Ctrl + D`：输入 EOF

`Ctrl + D` 严格来说**不是信号**。

它表示当前终端输入一个 **EOF（End Of File）**。

如果 Shell 当前正在等待输入，并且此时没有未处理的字符，收到 EOF 后通常会退出。

例如：

```text
Ctrl + D
```

通常可以结束当前 Shell：

```bash
exit
```

但两者含义并不完全相同：

```text
Ctrl + D → 输入 EOF
exit      → 执行 Shell 内建命令退出
```

### `Ctrl + R`：搜索历史命令

```text
Ctrl + R
```

进入 Bash 历史命令的反向搜索模式。

输入关键字后，例如：

```text
ssh
```

Shell 会搜索历史记录中最近出现的 `ssh` 命令。

继续按：

```text
Ctrl + R
```

可以继续搜索更早的匹配项。

### `Ctrl + L`：清除终端显示

```text
Ctrl + L
```

清除当前终端窗口中的可见内容。

通常可以达到与：

```bash
clear
```

类似的效果。

它不会删除 Shell 历史记录。

### `Ctrl + A`：移动到命令行开头

```text
Ctrl + A
```

将光标移动到当前命令行的开头。

### `Ctrl + E`：移动到命令行结尾

```text
Ctrl + E
```

将光标移动到当前命令行的结尾。

### `Ctrl + ← / →`：按单词移动光标

```text
Ctrl + ←
```

光标向左移动一个单词。

```text
Ctrl + →
```

光标向右移动一个单词。

---

## 目录与路径

Linux 文件系统以：

```text
/
```

作为根目录。

常见目录：

```text
/
├── etc
├── home
├── opt
├── tmp
├── usr
└── var
```

路径主要分为：

```text
绝对路径
相对路径
```

例如：

```text
/var/log/app.log
```

是绝对路径。

而：

```text
./app.log
../app.log
```

属于相对路径。

### `pwd`：查看当前目录

```bash
pwd
```

显示当前 Shell 所在的工作目录。

例如：

```text
/home/user
```

### `cd`：切换目录

```bash
cd /var/log
```

进入 `/var/log`。

常用：

```bash
cd /       # 根目录
cd ~       # 当前用户的家目录
cd ..      # 上一级目录
cd -       # 上一次所在目录
```

特殊路径：

```text
.    当前目录
..   父目录
~    当前用户家目录
/    根目录
```

### `ls`：查看目录内容

```bash
ls
```

查看当前目录内容。

详细信息：

```bash
ls -l
```

显示：

```text
文件类型
权限
所有者
所属组
大小
修改时间
文件名
```

查看隐藏文件：

```bash
ls -a
```

以易读单位显示文件大小：

```bash
ls -lh
```

常用组合：

```bash
ls -lah
```

---

## 文件和目录操作

### `mkdir`：创建目录

```bash
mkdir test
```

创建 `test` 目录。

如果父目录不存在：

```bash
mkdir -p /data/app/logs
```

`-p` 会自动创建不存在的父目录。

### `rmdir`：删除空目录

```bash
rmdir test
```

只能删除**空目录**。

如果目录中还有文件，则不能使用 `rmdir` 删除。

### `touch`：创建文件或修改时间戳

```bash
touch test.txt
```

如果文件不存在，则创建一个空文件。

如果文件已经存在，则不会修改文件内容，只更新文件时间戳。

### `cp`：复制文件或目录

复制文件：

```bash
cp a.txt b.txt
```

复制目录：

```bash
cp -r app /opt/
```

其中：

```text
-r
recursive
递归复制
```

### `mv`：移动或重命名

移动：

```bash
mv app.log /var/log/
```

重命名：

```bash
mv old.txt new.txt
```

Linux 中没有独立的“重命名命令”，重命名实际上就是使用 `mv` 将文件移动到新的名称。

### `rm`：删除文件或目录

删除文件：

```bash
rm test.txt
```

递归删除目录：

```bash
rm -r test
```

强制递归删除：

```bash
rm -rf test
```

其中：

```text
-r  递归删除
-f  强制删除，不提示确认
```

`rm -rf` 不会进入回收站，执行前必须确认目标路径。

### `ln`：创建链接

硬链接：

```bash
ln file.txt hard.txt
```

创建硬链接后，两个目录项指向同一个 inode。

软链接：

```bash
ln -s /opt/app/app.jar app.jar
```

软链接保存的是目标路径。

可以理解为：

```text
app.jar
   ↓
/opt/app/app.jar
```

如果目标文件被删除，软链接会变成悬空链接。

---

## 文件内容查看

### `cat`：输出文件内容

```bash
cat app.conf
```

直接把文件内容输出到标准输出。

适合查看较小的文件。

### `less`：分页查看文件

```bash
less app.log
```

适合查看较大的文件。

常用操作：

```text
↑ / ↓       上下移动
PageUp      向上翻页
PageDown    向下翻页
/keyword    搜索
n           下一个匹配项
q           退出
```

### `more`：分页查看

```bash
more app.log
```

也可以逐页查看文件。

实际排查日志时通常更常使用 `less`。

### `head`：查看文件开头

```bash
head app.log
```

默认显示前 10 行。

指定行数：

```bash
head -n 20 app.log
```

### `tail`：查看文件结尾

```bash
tail app.log
```

默认显示最后 10 行。

指定行数：

```bash
tail -n 100 app.log
```

实时跟踪：

```bash
tail -f app.log
```

`-f` 会持续等待文件新增内容，并将新增内容输出到终端。

因此它非常适合实时观察应用日志。

---

## 文件和文本搜索

### `find`：查找文件

按照名称：

```bash
find /opt -name "app.jar"
```

按照文件类型：

```bash
find /opt -type f
```

其中：

```text
-type f → 普通文件
-type d → 目录
```

例如：

```bash
find /var/log -type f -name "*.log"
```

表示查找 `/var/log` 下所有扩展名为 `.log` 的普通文件。

### `grep`：搜索文本

```bash
grep "ERROR" app.log
```

查找包含 `ERROR` 的行。

忽略大小写：

```bash
grep -i "error" app.log
```

显示行号：

```bash
grep -n "ERROR" app.log
```

递归搜索目录：

```bash
grep -r "ERROR" /var/log
```

常用组合：

```bash
grep -n "ERROR" app.log
```

### `wc`：统计文本

```bash
wc app.log
```

默认输出：

```text
行数
单词数
字节数
文件名
```

只统计行数：

```bash
wc -l app.log
```

只统计单词数：

```bash
wc -w app.log
```

只统计字节数：

```bash
wc -c app.log
```

---

## 命令和系统信息查询

### `which`：查找命令路径

```bash
which java
```

根据当前环境的 `PATH` 查找命令对应的可执行文件。

例如：

```text
/usr/bin/java
```

它回答的是：

```text
当前 Shell 执行这个命令时，找到的是哪个可执行文件？
```

### `history`：查看历史命令

```bash
history
```

查看当前用户保存的历史命令。

例如：

```text
100  ls
101  cd /opt
102  systemctl restart myapp
```

可以通过历史编号执行：

```bash
!102
```

### `getent`：查询系统名称服务数据库

例如：

```bash
getent passwd root
```

查看用户信息。

```bash
getent group wheel
```

查看用户组信息。

`getent` 通过系统的 NSS（Name Service Switch）机制查询信息，因此数据来源不一定只有 `/etc/passwd` 或 `/etc/group`。

### `hostnamectl`：查看主机信息

```bash
hostnamectl
```

可以查看：

```text
主机名
操作系统
内核
系统架构
```

修改主机名：

```bash
hostnamectl set-hostname server01
```

---

## 环境变量

### `echo`：输出内容

```bash
echo "Hello Linux"
```

查看变量：

```bash
echo $PATH
```

`echo` 本身只是输出参数内容，Shell 会先展开：

```text
$PATH
```

然后再把结果交给 `echo` 输出。

### `export`：设置环境变量

```bash
export JAVA_HOME=/opt/java
```

读取：

```bash
echo $JAVA_HOME
```

修改 `PATH`：

```bash
export PATH=$PATH:/opt/java/bin
```

环境变量默认只影响：

```text
当前 Shell
以及当前 Shell 启动的子进程
```

关闭当前 Shell 后，通过这种方式设置的变量通常不会保留。

---

## 用户与用户组

Linux 用户和用户组是权限系统的重要组成部分。

一个文件通常会记录：

```text
所有者 User
所属组 Group
```

### `id`：查看用户身份

```bash
id
```

查看当前用户。

查看指定用户：

```bash
id user1
```

常见信息：

```text
uid
gid
groups
```

分别表示：

```text
UID      用户 ID
GID      主组 ID
groups   所属用户组
```

### `useradd`：创建用户

```bash
useradd user1
```

创建用户。

指定家目录：

```bash
useradd -d /home/user1 user1
```

创建后可以使用：

```bash
passwd user1
```

为用户设置密码。

### `userdel`：删除用户

```bash
userdel user1
```

删除用户。

同时删除用户家目录：

```bash
userdel -r user1
```

### `usermod`：修改用户

例如把用户添加到 `wheel` 组：

```bash
usermod -aG wheel user1
```

其中：

```text
-a   追加
-G   附加用户组
```

使用 `-G` 添加组时通常应该同时使用 `-a`，否则可能覆盖用户原有的附加组。

### `groupadd`：创建用户组

```bash
groupadd developers
```

### `groupdel`：删除用户组

```bash
groupdel developers
```

---

## 文件权限

Linux 权限主要针对：

```text
User
Group
Other
```

三类对象。

每一类都可以拥有：

```text
r  read
w  write
x  execute
```

例如：

```text
-rwxr-xr--
```

可以拆成：

```text
rwx | r-x | r--
```

分别表示：

```text
User   Group   Other
```

### `chmod`：修改权限

例如：

```bash
chmod 755 script.sh
```

权限数字：

```text
r = 4
w = 2
x = 1
```

因此：

```text
7 = rwx
5 = r-x
5 = r-x
```

即：

```text
User  → rwx
Group → r-x
Other → r-x
```

也可以使用符号方式：

```bash
chmod u+x script.sh
```

表示给文件所有者增加执行权限。

### `chown`：修改所有者

```bash
chown user1 app.log
```

同时修改所有者和组：

```bash
chown user1:developers app.log
```

递归修改：

```bash
chown -R user1:developers /opt/app
```

### `chgrp`：修改所属组

```bash
chgrp developers app.log
```

只修改文件所属组，不修改所有者。

---

## 用户切换与权限提升

### `su`：切换用户

```bash
su user1
```

切换为 `user1`。

：

```bash
su -
```

切换到 root，并创建一个登录 Shell 环境。

```bash
su - user1
```

以 `user1` 的登录环境进入 Shell。

### `sudo`：以其他用户身份执行命令

例如：

```bash
sudo systemctl restart myapp
```

通常表示使用 root 权限执行该命令。

两者区别：

```text
su
→ 切换到另一个用户的 Shell

sudo
→ 执行一条具有其他用户权限的命令
```

---

## 进程管理

### `ps`：查看进程

查看当前 Shell 相关进程：

```bash
ps
```

查看全部进程：

```bash
ps -ef
```

例如：

```bash
ps -ef | grep java
```

用于查找 Java 相关进程。

常见字段：

```text
PID
PPID
UID
```

分别表示：

```text
PID  → 当前进程 ID
PPID → 父进程 ID
UID  → 进程所属用户
```

### `top`：实时查看进程

```bash
top
```

可以实时查看：

```text
CPU 使用情况
内存使用情况
进程数量
进程状态
进程资源占用
```

退出：

```text
q
```

### `kill`：向进程发送信号

```bash
kill 1234
```

默认发送：

```text
SIGTERM (15)
```

也就是请求进程正常终止。

明确指定：

```bash
kill -15 1234
```

强制终止：

```bash
kill -9 1234
```

发送：

```text
SIGKILL (9)
```

`SIGKILL` 不能被进程捕获、忽略或处理，因此程序没有机会执行清理工作。

通常应该：

```text
SIGTERM
   ↓
等待正常退出
   ↓
仍然无法退出
   ↓
考虑 SIGKILL
```

`kill` 的本质是：

```text
向进程发送信号
```

并不是“kill 命令永远只负责杀进程”。

---

## 磁盘空间

### `df`：查看文件系统空间

```bash
df -h
```

常见字段：

```text
Size   总容量
Used   已使用
Avail  可用
Use%   使用率
```

`df` 主要回答：

```text
这个文件系统还剩多少空间？
```

### `du`：查看文件或目录占用空间

```bash
du -sh /var/log
```

其中：

```text
-s  只显示汇总结果
-h  使用易读单位
```

查看目录下各项：

```bash
du -sh /var/log/*
```

因此：

```text
df
→ 看整个文件系统

du
→ 看具体哪个目录/文件占空间
```

---

## 基础网络操作

### `ping`：测试 ICMP 连通性

```bash
ping 127.0.0.1
```

指定次数：

```bash
ping -c 4 127.0.0.1
```

可以观察：

```text
是否能够到达目标
往返延迟
丢包情况
```

需要注意：

```text
ping 成功
≠
目标 TCP/UDP 端口一定开放
```

因为 `ping` 使用的是 ICMP。

### `scp`：通过 SSH 复制文件

上传：

```bash
scp app.jar user@server:/opt/app/
```

下载：

```bash
scp user@server:/opt/app/app.jar ./
```

复制目录：

```bash
scp -r app user@server:/opt/
```

基本格式：

```text
scp 源 用户@主机:目标路径
```

`scp` 使用 SSH 进行远程认证和数据传输。

---

## Shell 后台运行

### `nohup`：忽略 `SIGHUP`

例如：

```bash
nohup ./app.sh &
```

常见写法：

```bash
nohup java -jar app.jar > app.log 2>&1 &
```

其中：

```text
nohup
→ 使程序在终端退出等情况下不因 SIGHUP 而结束

&
→ 让 Shell 将命令放到后台执行

> app.log
→ 标准输出重定向到 app.log

2>&1
→ 标准错误重定向到标准输出
```

需要注意：

```text
nohup ≠ 后台运行
```

真正让命令在后台运行的是：

```text
&
```

`nohup` 主要解决的是终端退出后程序受到 `SIGHUP` 的问题。

---

## 软件包管理

CentOS 不同版本的包管理方式存在区别。

### CentOS 7：YUM

CentOS 7 使用传统的：

```bash
yum
```

例如：

```bash
yum install nginx
yum remove nginx
yum search nginx
yum update
```

### CentOS 8+：DNF

从 **CentOS 8** 开始，系统软件包管理技术切换到了 **DNF**。

例如：

```bash
dnf install nginx
dnf remove nginx
dnf search nginx
dnf update
```

CentOS 8 中仍然可以使用：

```bash
yum
```

因为此时 `yum` 已经成为基于 DNF 的兼容入口。

因此可以简单理解为：

```text
CentOS 7
→ YUM 3

CentOS 8+
→ DNF
→ yum 作为兼容入口
```

---

## systemd 服务管理

CentOS 使用 `systemd` 管理系统服务。

主要命令：

```bash
systemctl
```

假设服务名称为：

```text
myapp
```

### 启动服务

```bash
systemctl start myapp
```

### 停止服务

```bash
systemctl stop myapp
```

### 重启服务

```bash
systemctl restart myapp
```

相当于：

```text
停止服务
    ↓
重新启动服务
```

### 重新加载配置

```bash
systemctl reload myapp
```

请求服务重新加载配置。

前提是该服务本身支持 `reload`。

### 重新加载，否则重启

```bash
systemctl reload-or-restart myapp
```

逻辑是：

```text
支持 reload
→ reload

不支持 reload
→ restart
```

### 查看服务状态

```bash
systemctl status myapp
```

可以查看：

```text
服务当前状态
主进程 PID
启动时间
退出状态
最近日志
```

### 设置开机启动

```bash
systemctl enable myapp
```

表示系统启动时自动启动该服务。

取消：

```bash
systemctl disable myapp
```

同时设置开机启动并立即启动：

```bash
systemctl enable --now myapp
```

---

## 服务日志

### `journalctl -u`：查看服务日志

```bash
journalctl -u myapp
```

`-u` 表示按照 systemd unit 过滤日志。

### 实时查看日志

```bash
journalctl -u myapp -f
```

`-f` 表示持续跟踪新产生的日志。

### 查看今天的日志

```bash
journalctl -u myapp --since today
```

### 查看最近日志

```bash
journalctl -u myapp -n 100
```

查看最近 100 条日志记录。

---

## 定时任务

Linux 可以通过 `cron` 执行周期性任务。

### 编辑当前用户的定时任务

```bash
crontab -e
```

### 查看定时任务

```bash
crontab -l
```

### 删除定时任务

```bash
crontab -r
```

注意：

```bash
crontab -r
```

会删除当前用户的整个 crontab，而不是只删除某一条任务。

### Cron 表达式

基本格式：

```text
分 时 日 月 周 命令
```

例如：

```text
0 2 * * * /opt/scripts/backup.sh
```

表示：

```text
每天 02:00 执行 backup.sh
```

格式：

```text
┌──────── 分钟（0-59）
│ ┌────── 小时（0-23）
│ │ ┌──── 日期（1-31）
│ │ │ ┌── 月份（1-12）
│ │ │ │ ┌ 星期（0-7）
│ │ │ │ │
* * * * * command
```

---

## 系统时间

### `date`：查看系统时间

```bash
date
```

显示当前系统时间。

### `timedatectl`：查看系统时间状态

```bash
timedatectl
```

可以查看：

```text
Local time
Universal time
RTC time
Time zone
System clock synchronized
NTP service
```

其中：

```text
System clock synchronized
```

可以用来判断系统时钟是否已经同步。

### 设置系统时区

例如：

```bash
timedatectl set-timezone Asia/Shanghai
```

日本：

```bash
timedatectl set-timezone Asia/Tokyo
```

设置的是：

```text
系统时区
```

而不是简单地把 UTC 时间“改掉”。

### `chronyc sources`：查看时间源

```bash
chronyc sources
```

用于查看当前 chrony 配置的时间源以及时间源状态。

### `chronyc tracking`：查看同步状态

```bash
chronyc tracking
```

可以查看：

```text
当前参考时间源
Stratum
系统时间偏移
频率调整
网络延迟
时间误差
```

其中 `System time`、`Last offset` 等字段可用于判断本机时间与参考时间源之间的偏差。
