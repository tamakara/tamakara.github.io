---
title: Linux 基础操作
published: 2026-09-09
image: ''
tags: [Linux, 操作系统, 运维]
category: 学习笔记
---
> 本文以 **CentOS** 为主要环境，整理 Linux 日常使用和服务器管理中最基础的操作。
>
> 本文只介绍基础系统操作，不涉及需要额外安装的常用工具，例如 `tar`、`rsync`、`screen`、`nmap`、`sar`、`iostat`、`rz/sz` 等。

## 终端快捷键

Linux 终端中的快捷键主要由**终端驱动、Shell 和 Readline**共同处理。不同快捷键承担的职责并不相同：有些会向前台进程发送信号，有些只是控制当前命令行输入。

Bash 使用 GNU Readline 读取和编辑命令行，因此 `Ctrl + R`、`Ctrl + A`、`Ctrl + E` 等快捷键属于命令行编辑功能。

参考：[Bash Reference Manual - Command Line Editing](https://www.gnu.org/software/bash/manual/html_node/Command-Line-Editing.html)

### `Ctrl + C`：发送 `SIGINT`

```text
Ctrl + C
    ↓
SIGINT (2)
```

`Ctrl + C` 会使终端驱动向当前**前台进程组**发送 `SIGINT`（Interrupt）信号。

例如：

```bash
ping 127.0.0.1
```

运行后按：

```text
Ctrl + C
```

通常会中断 `ping`。

需要区分：

```text
Ctrl + C
→ SIGINT (2)

kill PID
→ 默认发送 SIGTERM (15)
```

`SIGINT` 和 `SIGTERM` 都可以被程序捕获和处理，因此程序可以自行决定收到信号后执行什么操作。

参考：[signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)

### `Ctrl + Z`：发送 `SIGTSTP`

```text
Ctrl + Z
    ↓
SIGTSTP
```

`Ctrl + Z` 会向前台进程组发送 `SIGTSTP`，请求暂停当前进程。

例如：

```bash
ping 127.0.0.1
```

按下：

```text
Ctrl + Z
```

程序会进入 stopped 状态，而不是退出。

查看当前 Shell 管理的作业：

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
Ctrl + C
→ 请求中断程序

Ctrl + Z
→ 请求暂停程序
```

参考：[Bash Reference Manual - Job Control](https://www.gnu.org/software/bash/manual/html_node/Job-Control.html)

### `Ctrl + D`：输入 EOF

`Ctrl + D` **不是信号**。

它表示当前终端输入一个 **EOF（End Of File）**。

当 Shell 正在等待输入，并且当前输入缓冲区为空时，收到 EOF 后通常会结束当前 Shell。

因此：

```text
Ctrl + D
→ 输入 EOF

exit
→ 执行 Shell 的退出命令
```

在交互式 Shell 中，两者通常都表现为退出当前 Shell，但底层含义不同。

另外，Bash 可以通过 `set -o ignoreeof` 改变收到 EOF 后的默认行为。

参考：[Bash Reference Manual - Bash Builtin `set`](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)

### `Ctrl + R`：反向搜索历史命令

```text
Ctrl + R
```

进入 Bash 的历史命令增量反向搜索。

输入关键字，例如：

```text
ssh
```

Bash 会实时搜索历史记录中匹配的命令。

继续按：

```text
Ctrl + R
```

可以继续查找更早的匹配项。

参考：[Bash Reference Manual - Searching for Commands in the History](https://www.gnu.org/software/bash/manual/html_node/Searching.html)

### `Ctrl + L`：清除终端显示

```text
Ctrl + L
```

重新绘制终端显示，使当前可见内容被清除。

效果通常与：

```bash
clear
```

类似。

它不会删除：

```text
Shell 历史记录
```

也不会删除实际文件内容。

### `Ctrl + A`：移动到行首

```text
Ctrl + A
```

将光标移动到当前命令行的开头。

### `Ctrl + E`：移动到行尾

```text
Ctrl + E
```

将光标移动到当前命令行的结尾。

### `Ctrl + ← / →`：按单词移动

```text
Ctrl + ←
```

向左移动一个单词。

```text
Ctrl + →
```

向右移动一个单词。

具体按键行为还会受到终端和 Readline 配置影响。

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

是相对路径。

特殊路径：

```text
.     当前目录
..    父目录
~     当前用户的家目录
/     根目录
```

### `pwd`：查看当前目录

```bash
pwd
```

显示当前 Shell 的工作目录。

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
cd ~       # 当前用户家目录
cd ..      # 上一级目录
cd -       # 上一次所在目录
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

通常可以看到：

```text
文件类型
权限
硬链接数量
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

以更易读的单位显示文件大小：

```bash
ls -lh
```

常用组合：

```bash
ls -lah
```

参考：[GNU Coreutils - `ls`](https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html)

---

## 文件和目录操作

### `mkdir`：创建目录

```bash
mkdir test
```

如果父目录不存在：

```bash
mkdir -p /data/app/logs
```

`-p` 表示自动创建不存在的父目录，并且目标目录已经存在时不会报错。

### `rmdir`：删除空目录

```bash
rmdir test
```

只能删除空目录。

如果目录中还有文件或其他目录，需要使用递归删除方式：

```bash
rm -r test
```

### `touch`：创建文件或更新时间戳

```bash
touch test.txt
```

如果文件不存在：

```text
创建文件
```

如果文件已经存在：

```text
不修改文件内容
更新文件时间戳
```

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

`mv` 同时承担移动和重命名的功能。

在同一个文件系统中移动文件时，通常只是修改目录项；跨文件系统时则可能退化为复制后删除。

参考：[GNU Coreutils - `cp`](https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html)、[GNU Coreutils - `mv`](https://www.gnu.org/software/coreutils/manual/html_node/mv-invocation.html)

### `rm`：删除文件或目录

删除文件：

```bash
rm test.txt
```

删除目录：

```bash
rm -r test
```

强制递归删除：

```bash
rm -rf test
```

其中：

```text
-r    递归处理目录
-f    强制删除，不进行部分确认
```

`rm` 删除的文件**不会进入图形界面的回收站**。

尤其需要注意：

```bash
rm -rf
```

可能造成不可逆的数据丢失，执行前必须确认路径和命令参数。

参考：[GNU Coreutils - `rm`](https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html)

### `ln`：创建链接

#### 硬链接

```bash
ln file.txt hard.txt
```

硬链接创建一个新的目录项，使其与原文件指向同一个 inode。

因此：

```text
file.txt
hard.txt
    ↓
同一个 inode
```

删除其中一个目录项不会立即删除文件数据，只要仍然存在其他硬链接，并且没有其他原因导致 inode 被回收。

硬链接通常不能跨文件系统创建，也不能直接对目录创建普通硬链接。

#### 软链接

```bash
ln -s /opt/app/app.jar app.jar
```

软链接保存的是目标路径：

```text
app.jar
   ↓
/opt/app/app.jar
```

如果目标文件被删除，软链接本身仍然存在，但会变成悬空链接。

---

## 文件内容查看

### `cat`：输出文件内容

```bash
cat app.conf
```

将文件内容直接输出到标准输出。

适合查看较小的文本文件。

### `less`：分页查看

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
n           下一个匹配
N           上一个匹配
q           退出
```

### `more`：分页查看

```bash
more app.log
```

也可以逐页查看文本。

实际排查日志时通常更常使用：

```bash
less app.log
```

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

`-f` 会持续读取文件末尾新增的数据，因此非常适合观察日志。

参考：[GNU Coreutils](https://www.gnu.org/software/coreutils/manual/coreutils.html)

---

## 文件和文本搜索

### `find`：查找文件

按照名称查找：

```bash
find /opt -name "app.jar"
```

按照文件类型查找：

```bash
find /opt -type f
```

其中：

```text
-type f
→ 普通文件

-type d
→ 目录
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

递归搜索：

```bash
grep -r "ERROR" /var/log
```

例如：

```bash
grep -n "ERROR" app.log
```

表示搜索 `ERROR`，同时显示匹配行的行号。

### `wc`：统计文本

```bash
wc app.log
```

默认依次输出：

```text
行数
单词数
字节数
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

需要注意，`wc` 的“行”本质上是统计换行符数量，而不是简单统计“文本看起来有多少行”。

参考：[GNU Coreutils - `wc`](https://www.gnu.org/software/coreutils/manual/html_node/wc-invocation.html)

---

## 命令和系统信息查询

### `which`：查找命令路径

```bash
which java
```

根据当前环境中的 `PATH` 查找对应的可执行文件。

例如：

```text
/usr/bin/java
```

需要注意，`which` 主要用于查找可执行文件，对于 Shell 内建命令并不可靠。

例如：

```bash
which cd
```

可能无法得到有意义的结果，因为 `cd` 通常是 Shell 内建命令。

对于 Bash，可以使用：

```bash
type cd
type java
```

判断命令究竟是：

```text
Shell builtin
alias
function
外部可执行文件
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

Bash 的历史记录具体保存位置和行为还受 `HISTFILE`、`HISTSIZE` 等配置影响。

### `getent`：查询系统名称服务数据库

例如：

```bash
getent passwd root
```

查询用户信息。

```bash
getent group wheel
```

查询用户组信息。

`getent` 通过系统的 **NSS（Name Service Switch）** 查询信息，因此查询结果不一定只来自：

```text
/etc/passwd
/etc/group
```

这也是它与直接：

```bash
cat /etc/passwd
```

的一个重要区别。

### `hostnamectl`：查看主机信息

```bash
hostnamectl
```

可以查看：

```text
主机名
操作系统
内核
架构
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

Shell 会先展开：

```text
$PATH
```

然后将展开后的结果作为参数传给 `echo`。

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

使用 `export` 设置的变量会进入当前 Shell 的**环境变量**，并被该 Shell 启动的子进程继承。

例如：

```text
当前 Shell
   ↓
子进程 A
子进程 B
```

A 和 B 可以读取当前 Shell 导出的变量。

但环境变量不会自动反向影响父 Shell，也不会永久写入系统配置。

如果需要每次登录都生效，通常需要根据使用场景写入：

```text
~/.bashrc
~/.bash_profile
/etc/profile
```

等配置文件。

---

## 用户与用户组

Linux 用户和用户组是权限控制的重要组成部分。

一个文件通常具有：

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

例如：

```text
uid=1000(user1) gid=1000(user1) groups=1000(user1),10(wheel)
```

其中：

```text
uid
→ 用户 ID

gid
→ 用户主组 ID

groups
→ 用户所属的组
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

设置密码：

```bash
passwd user1
```

创建用户和设置密码是两个不同的操作。

### `userdel`：删除用户

```bash
userdel user1
```

同时删除用户家目录：

```bash
userdel -r user1
```

### `usermod`：修改用户

例如将用户加入 `wheel` 组：

```bash
usermod -aG wheel user1
```

其中：

```text
-a
→ append，追加

-G
→ 指定附加组
```

添加附加组时通常使用：

```bash
usermod -aG group user
```

而不是单独使用 `-G`，因为单独使用 `-G` 可能覆盖原有附加组。

参考：[RHEL 9 - Managing users and groups](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-and-groups_configuring-basic-system-settings)

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

Linux 文件权限主要针对：

```text
User
Group
Other
```

三类主体。

基本权限：

```text
r
→ read，读

w
→ write，写

x
→ execute，执行
```

例如：

```text
-rwxr-xr--
```

可以拆成：

```text
-rwx | r-x | r--
```

分别对应：

```text
User | Group | Other
```

第一个字符：

```text
-
```

表示这是普通文件。

如果是：

```text
d
```

则表示目录。

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

需要注意，目录上的 `r`、`w`、`x` 与普通文件并不完全一样：

```text
目录 r
→ 可以读取目录项名称

目录 w
→ 可以创建、删除、重命名目录项

目录 x
→ 可以进入目录，并访问目录中已知名称的对象
```

因此：

```text
目录只有 r
```

并不意味着用户可以正常访问其中所有文件。

### `chown`：修改所有者

修改所有者：

```bash
chown user1 app.log
```

同时修改所有者和所属组：

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

只修改所属组，不修改所有者。

---

## 用户切换与权限提升

### `su`：切换用户

```bash
su user1
```

切换到 `user1` 用户。

登录 Shell：

```bash
su - user1
```

`-` 表示按照登录 Shell 的方式初始化环境，而不是简单地继承当前 Shell 的工作环境。

切换到 root：

```bash
su -
```

### `sudo`：以其他用户身份执行命令

例如：

```bash
sudo systemctl restart myapp
```

如果当前用户拥有对应的 sudo 权限，该命令通常会以 root 身份执行。

`sudo` 并不是“自动拥有 root 权限”，它受：

```text
/etc/sudoers
/etc/sudoers.d/
```

等授权配置控制。

RHEL 默认使用 `wheel` 组管理常见的管理员 sudo 权限。

例如：

```bash
usermod -aG wheel user1
```

然后由 sudoers 规则决定该组是否拥有相应权限。

参考：[RHEL 9 - Managing sudo access](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings)

---

## 进程管理

### `ps`：查看进程

查看当前 Shell 相关进程：

```bash
ps
```

查看完整进程列表：

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
→ 当前进程 ID

PPID
→ 父进程 ID

UID
→ 进程所属用户
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

即请求进程正常终止。

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

`SIGKILL` 不能被进程捕获、忽略或处理，因此程序没有机会执行自己的清理逻辑。

通常应该：

```text
SIGTERM
   ↓
等待程序正常退出
   ↓
仍未退出
   ↓
再考虑 SIGKILL
```

`kill` 的本质是：

```text
向进程发送信号
```

而不是“kill 命令一定会立即杀掉进程”。

参考：[Linux `signal(7)`](https://man7.org/linux/man-pages/man7/signal.7.html)、[Linux `kill(1)`](https://man7.org/linux/man-pages/man1/kill.1.html)

---

## 磁盘空间

### `df`：查看文件系统空间

```bash
df -h
```

常见字段：

```text
Size
→ 文件系统总容量

Used
→ 已使用空间

Avail
→ 普通用户可用空间

Use%
→ 已使用比例

Mounted on
→ 挂载点
```

`df` 关注的是：

```text
文件系统还剩多少空间？
```

而不是某个具体目录有多大。

### `du`：查看目录或文件占用空间

```bash
du -sh /var/log
```

其中：

```text
-s
→ 只显示汇总结果

-h
→ 使用易读单位
```

查看目录下各项：

```bash
du -sh /var/log/*
```

因此：

```text
df
→ 文件系统整体空间

du
→ 文件 / 目录具体占用
```

排查磁盘空间问题时通常两者结合使用。

---

## 网络基础操作

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
目标是否能够通过 ICMP 响应
往返延迟
丢包情况
```

需要注意：

```text
ping 成功
≠
目标 TCP/UDP 端口一定开放
```

因为 `ping` 使用的是 ICMP，而不是 TCP 或 UDP。

### `curl`：发送 HTTP 请求

```bash
curl http://localhost:8080
```

查看响应头：

```bash
curl -I http://localhost:8080
```

发送 POST：

```bash
curl -X POST http://localhost:8080/api/test
```

`curl` 常用于：

```text
测试 Web 服务
测试 REST API
检查 HTTP 响应
```

### `wget`：下载文件

```bash
wget https://example.com/app.tar.gz
```

主要用于从网络下载文件。

因此：

```text
curl
→ 更偏向发送 / 调试网络请求

wget
→ 更偏向下载文件
```

---

## 远程文件复制

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

`scp` 使用 SSH 进行身份认证和传输。

如果是大量目录的重复同步，通常会使用 `rsync`；但它属于额外工具，不在本文基础命令范围内。

---

## Shell 后台运行

### `nohup`：忽略 `SIGHUP`

例如：

```bash
nohup ./app.sh &
```

常见：

```bash
nohup java -jar app.jar > app.log 2>&1 &
```

这里实际涉及多个概念：

```text
nohup
→ 使程序忽略 SIGHUP 的默认终止行为

&
→ 告诉当前 Shell 将命令作为后台作业运行

> app.log
→ 将标准输出重定向到 app.log

2>&1
→ 将标准错误重定向到标准输出
```

因此：

```text
nohup ≠ 后台运行
```

`&` 才是让 Shell 将命令放到后台执行的语法。

`nohup` 解决的是：

```text
终端 / Shell 退出
→ 程序收到 SIGHUP
→ 程序可能随之退出
```

的问题。

如果程序本身由 systemd 管理，更推荐直接使用 `systemctl`，而不是长期依赖 `nohup`。

参考：[GNU Coreutils - `nohup`](https://www.gnu.org/software/coreutils/manual/html_node/nohup-invocation.html)

---

## 软件包管理

CentOS 不同版本的软件包管理工具存在差异。

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

从 CentOS 8 开始，系统的软件包管理技术切换到了 **DNF**。

例如：

```bash
dnf install nginx
dnf remove nginx
dnf search nginx
dnf update
```

在 CentOS 8 等系统中仍然可以使用：

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

现代 CentOS Stream 环境优先掌握：

```bash
dnf
```

即可。

参考：[RHEL 8 - Software management considerations](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/software-management_considerations-in-adopting-rhel-8)

---

## systemd 服务管理

现代 CentOS 使用 **systemd** 管理系统服务。

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

会停止当前服务，然后再次启动。

如果服务当前没有运行，`restart` 通常也会将其启动。

### 重新加载配置

```bash
systemctl reload myapp
```

请求服务重新加载配置。

前提是该服务本身实现了 reload 行为。

`reload` 与 `restart` 的区别：

```text
reload
→ 重新读取配置
→ 通常不停止服务进程

restart
→ 停止并重新启动服务
```

### 重新加载，否则重启

```bash
systemctl reload-or-restart myapp
```

如果服务支持 reload：

```text
→ reload
```

否则：

```text
→ restart
```

### 查看服务状态

```bash
systemctl status myapp
```

可以看到：

```text
服务是否运行
主进程 PID
启动时间
进程状态
最近日志
```

### 设置开机启动

```bash
systemctl enable myapp
```

表示启用该 unit 的开机自动启动。

取消：

```bash
systemctl disable myapp
```

同时启用并立即启动：

```bash
systemctl enable --now myapp
```

参考：[RHEL 9 - Managing systemd](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings)

---

## 服务日志

### `journalctl -u`：查看服务日志

```bash
journalctl -u myapp
```

`-u` 用于按照 systemd unit 过滤日志。

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

还可以直接结合 `systemctl status` 查看服务最近的一部分日志：

```bash
systemctl status myapp
```

参考：[systemd `journalctl`](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)

---

## 定时任务

Linux 可以通过 **cron** 执行周期性任务。

### 编辑当前用户的定时任务

```bash
crontab -e
```

### 查看当前用户的定时任务

```bash
crontab -l
```

### 删除当前用户的全部定时任务

```bash
crontab -r
```

注意：

```bash
crontab -r
```

删除的是当前用户的**整个 crontab**，不是某一条任务。

### Cron 表达式

基本格式：

```text
分 时 日 月 周 命令
```

例如：

```text
0 2 * * * /opt/scripts/backup.sh
```

表示每天：

```text
02:00
```

执行：

```text
/opt/scripts/backup.sh
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

`cron` 的字段支持范围、列表和步长等写法，例如：

```text
*/5 * * * *
```

表示每 5 分钟执行一次。

---

## 系统时间

服务器时间对于日志、认证、数据库以及分布式系统都非常重要。

### `date`：查看当前系统时间

```bash
date
```

查看当前系统时间。

### `timedatectl`：查看时间状态

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

可以帮助判断系统时钟是否已经完成同步。

### 设置系统时区

例如：

```bash
timedatectl set-timezone Asia/Shanghai
```

日本：

```bash
timedatectl set-timezone Asia/Tokyo
```

这里修改的是：

```text
系统时区
```

而不是简单地“把 UTC 时间改成另一个时间”。

### `chronyc sources`：查看时间源

现代 RHEL/CentOS 系通常使用 **chrony** 进行 NTP 时间同步。

查看时间源：

```bash
chronyc sources
```

可以看到当前配置的时间服务器以及各时间源的状态。

### `chronyc tracking`：查看同步状态

```bash
chronyc tracking
```

可以查看：

```text
参考时间源
Stratum
系统时间偏移
最近一次偏移
平均偏移
频率调整
网络延迟
```

其中：

```text
System time
Last offset
RMS offset
```

等字段可以帮助判断本机时钟与参考时间之间的偏差。

参考：[RHEL 9 - Configuring time synchronization](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings)

---

## 常见命令组合

### 查找 Java 进程

```bash
ps -ef | grep java
```

### 搜索日志中的错误

```bash
grep -n "ERROR" app.log
```

### 实时查看错误日志

```bash
tail -f app.log | grep ERROR
```

### 查找指定文件

```bash
find /opt -name "app.jar"
```

### 排查磁盘空间

先查看文件系统：

```bash
df -h
```

再定位具体目录：

```bash
du -sh /var/*
```

### 排查服务

先查看服务状态：

```bash
systemctl status myapp
```

再查看最近日志：

```bash
journalctl -u myapp -n 100
```

最后测试服务：

```bash
curl http://127.0.0.1:8080
```

可以形成一个比较典型的排障流程：

```text
服务状态
   ↓
服务日志
   ↓
进程状态
   ↓
端口 / 网络
   ↓
服务响应
```

---

## 基础操作中的几个核心概念

### `Ctrl + C`、`Ctrl + Z`、`Ctrl + D`

```text
Ctrl + C
→ SIGINT (2)
→ 请求中断前台进程

Ctrl + Z
→ SIGTSTP
→ 请求暂停前台进程

Ctrl + D
→ EOF
→ 结束当前输入
→ 在 Shell 中通常导致 Shell 退出
```

### `kill` 不是“强制杀进程”

```bash
kill PID
```

默认发送：

```text
SIGTERM (15)
```

而：

```bash
kill -9 PID
```

发送：

```text
SIGKILL (9)
```

通常应该：

```text
SIGTERM
   ↓
等待程序正常退出
   ↓
仍然无法退出
   ↓
考虑 SIGKILL
```

### `df` 和 `du`

```text
df
→ 查看文件系统整体空间

du
→ 查看具体文件 / 目录占用
```

### `systemctl restart` 和 `reload`

```text
restart
→ 停止并重新启动服务

reload
→ 请求服务重新读取配置
→ 前提是服务支持 reload
```

### `yum` 和 `dnf`

```text
CentOS 7
→ YUM 3

CentOS 8+
→ DNF
→ yum 作为兼容入口
```

### `nohup` 和 `&`

```text
nohup
→ 处理 SIGHUP

&
→ 后台运行
```

两者解决的问题不同。

---

## 基础命令学习重点

Linux 基础学习不需要一开始记住所有参数，更重要的是能够形成下面的操作思路：

```text
进入服务器
    ↓
确认当前用户和目录
    ↓
浏览文件系统
    ↓
创建 / 移动 / 删除文件
    ↓
查看和搜索文件内容
    ↓
理解用户和文件权限
    ↓
查看进程
    ↓
检查磁盘空间
    ↓
检查网络
    ↓
管理 systemd 服务
    ↓
查看服务日志
    ↓
配置定时任务
    ↓
检查系统时间
```

真正需要掌握的是：

```text
命令
+
参数
+
命令的实际语义
+
多个命令之间如何配合
```

当这些基础操作能够组合起来时，Linux 就不再只是“会几个命令”，而是能够真正用于服务器日常管理和故障排查。
