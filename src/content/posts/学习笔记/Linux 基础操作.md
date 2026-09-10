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

Linux 终端中的快捷键主要由**终端驱动、Shell 和 Readline**共同处理。不同快捷键承担的职责并不相同：有些会向前台进程组发送信号，有些则负责控制当前命令行输入。

Bash 使用 GNU Readline 编辑交互式命令行，因此 `Ctrl + R`、`Ctrl + A`、`Ctrl + E` 等快捷键属于命令行编辑功能。

参考：[Bash Reference Manual - Command Line Editing](https://www.gnu.org/software/bash/manual/html_node/Command-Line-Editing.html)

### `Ctrl + C`：发送 `SIGINT`

```text
Ctrl + C
    ↓
SIGINT (2)
```

`Ctrl + C` 会使终端驱动向当前前台进程组发送 `SIGINT`（Interrupt）信号。

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

`SIGINT` 和 `SIGTERM` 都可以被进程捕获和处理，因此程序收到信号后可以执行自己的清理逻辑。

参考：[Linux signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)

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

当交互式 Shell 正在等待输入，并且当前输入缓冲区为空时，收到 EOF 后通常会退出当前 Shell。

因此：

```text
Ctrl + D
→ 输入 EOF

exit
→ 执行 Shell 内建命令退出
```

两者在交互式 Shell 中通常都会表现为退出当前 Shell，但底层含义不同。

### `Ctrl + R`：反向搜索历史命令

```text
Ctrl + R
```

进入 Bash 的历史命令增量反向搜索。

输入关键字，例如：

```text
ssh
```

Bash 会搜索历史记录中包含该关键字的命令。

继续按：

```text
Ctrl + R
```

可以继续向更早的历史记录搜索。

参考：[Bash Reference Manual - Searching for Commands in the History](https://www.gnu.org/software/bash/manual/html_node/Searching.html)

### `Ctrl + L`：清除终端显示

```text
Ctrl + L
```

重新绘制当前终端显示。

通常可以达到与：

```bash
clear
```

类似的视觉效果。

它不会删除：

```text
Shell 历史记录
```

也不会删除任何文件内容。

### `Ctrl + A`：移动到行首

```text
Ctrl + A
```

将光标移动到当前命令行开头。

### `Ctrl + E`：移动到行尾

```text
Ctrl + E
```

将光标移动到当前命令行结尾。

### `Ctrl + ← / →`：按单词移动

```text
Ctrl + ←
```

向左移动一个单词。

```text
Ctrl + →
```

向右移动一个单词。

具体行为会受到终端和 Readline 配置影响。

---

## 目录与路径

Linux 文件系统以：

```text
/
```

作为根目录。

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

以易读单位显示文件大小：

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

`-p` 会自动创建不存在的父目录。

### `rmdir`：删除空目录

```bash
rmdir test
```

只能删除空目录。

如果目录中还有内容，需要使用：

```bash
rm -r test
```

### `touch`：创建文件或更新时间戳

```bash
touch test.txt
```

如果文件不存在，则创建文件。

如果文件已经存在，则不会修改文件内容，而是更新文件的时间戳。

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

`mv` 同时用于移动和重命名。

在同一文件系统中移动文件时，通常只需要修改目录项；跨文件系统时则可能需要执行复制后删除。

参考：[GNU Coreutils - `cp`](https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html)、[GNU Coreutils - `mv`](https://www.gnu.org/software/coreutils/manual/html_node/mv-invocation.html)

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
-r
→ 递归处理目录

-f
→ 强制删除
```

`rm` 删除的文件不会进入图形界面的回收站。

执行 `rm -rf` 前必须确认目标路径。

参考：[GNU Coreutils - `rm`](https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html)

### `ln`：创建链接

#### 硬链接

```bash
ln file.txt hard.txt
```

硬链接创建一个新的目录项，使它与原文件指向同一个 inode。

因此：

```text
file.txt
hard.txt
    ↓
同一个 inode
```

删除其中一个目录项后，只要仍有其他硬链接指向该 inode，文件数据仍然存在。

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

如果目标不存在，软链接本身仍然可以存在，但会成为悬空链接。

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

适合查看较大的文本文件。

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

表示搜索 `ERROR`，同时显示匹配行号。

### `wc`：统计文本

```bash
wc app.log
```

默认显示：

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

`wc -l` 统计的是换行符数量，因此严格来说不是简单地统计“看起来有多少行”。

参考：[GNU Coreutils - `wc`](https://www.gnu.org/software/coreutils/manual/html_node/wc-invocation.html)

---

## 命令和系统信息查询

### `which`：查找命令路径

```bash
which java
```

根据当前环境的 `PATH` 查找可执行文件。

例如：

```text
/usr/bin/java
```

需要注意，`which` 主要用于查找外部可执行文件，对于 Shell 内建命令并不适合。

例如：

```bash
which cd
```

可能得不到有效结果，因为 `cd` 通常是 Shell 内建命令。

可以使用：

```bash
type cd
type java
```

查看命令具体是什么类型。

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

执行指定历史命令：

```bash
!102
```

Bash 历史记录还受到 `HISTFILE`、`HISTSIZE` 等配置影响。

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

`getent` 通过系统的 **NSS（Name Service Switch）** 查询信息，因此结果不一定只来自：

```text
/etc/passwd
/etc/group
```

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

Shell 会先展开：

```text
$PATH
```

然后把展开后的结果作为参数传给 `echo`。

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

使用 `export` 设置的变量会成为当前 Shell 的环境变量，并被当前 Shell 启动的子进程继承。

例如：

```text
当前 Shell
   ↓
子进程 A
子进程 B
```

A 和 B 都可以读取已经导出的变量。

但环境变量不会自动反向影响父 Shell，也不会永久写入系统配置。

如果需要每次启动 Shell 都生效，通常需要写入：

```text
~/.bashrc
~/.bash_profile
/etc/profile
```

等配置文件。

---

## 用户与用户组

Linux 用户和用户组是权限控制的重要组成部分。

文件通常具有：

```text
所有者 User
所属组 Group
```

### `id`：查看用户身份

```bash
id
```

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

指定家目录：

```bash
useradd -d /home/user1 user1
```

设置密码：

```bash
passwd user1
```

创建用户与设置密码是两个不同的操作。

### `userdel`：删除用户

```bash
userdel user1
```

同时删除用户家目录：

```bash
userdel -r user1
```

### `usermod`：修改用户

例如将用户添加到 `wheel` 组：

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

而不是单独使用 `-G`，因为单独使用 `-G` 可能覆盖用户原有的附加组。

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

第一个字符表示文件类型：

```text
-
→ 普通文件

d
→ 目录
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

### 目录权限的特殊含义

目录上的 `r`、`w`、`x` 与普通文件不同。

```text
目录 r
→ 可以读取目录中的名称列表

目录 w
→ 可以创建、删除、重命名目录项

目录 x
→ 可以进入目录，并访问其中已知名称的对象
```

因此：

```text
目录只有 r
```

并不意味着用户可以正常访问目录中的所有文件。

### `chown`：修改所有者

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

切换到 `user1`。

使用登录方式：

```bash
su - user1
```

`-` 会以登录 Shell 的方式初始化环境。

切换到 root：

```bash
su -
```

### `sudo`：以其他用户身份执行命令

例如：

```bash
sudo systemctl restart myapp
```

如果当前用户拥有相应权限，该命令通常会以 root 身份执行。

`sudo` 并不意味着当前用户永久获得 root 权限，而是根据 sudoers 配置授权某些命令或操作。

相关配置：

```text
/etc/sudoers
/etc/sudoers.d/
```

参考：[RHEL 9 - Managing sudo access](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings)

---

## 进程管理

### `ps`：查看进程

查看当前进程：

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

用于查找 Java 进程。

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
CPU
内存
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

`SIGKILL` 无法被进程捕获、忽略或处理，因此程序没有机会执行自己的清理逻辑。

通常应该：

```text
SIGTERM
   ↓
等待正常退出
   ↓
仍未退出
   ↓
考虑 SIGKILL
```

`kill` 的本质是：

```text
向进程发送信号
```

并不是简单意义上的“杀掉进程”。

参考：[Linux `signal(7)`](https://man7.org/linux/man-pages/man7/signal.7.html)

---

## 磁盘空间

### `df`：查看文件系统空间

```bash
df -h
```

常见字段：

```text
Size
→ 总容量

Used
→ 已使用空间

Avail
→ 可用空间

Use%
→ 使用率

Mounted on
→ 挂载点
```

`df` 主要回答：

```text
这个文件系统还剩多少空间？
```

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
→ 看文件系统整体空间

du
→ 看具体目录 / 文件占用
```

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
ICMP 是否能够得到响应
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

### `curl`：发送网络请求

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

适合：

```text
测试 Web 服务
测试 HTTP API
检查 HTTP 响应
```

### `wget`：下载文件

```bash
wget https://example.com/app.tar.gz
```

主要用于从网络下载文件。

因此可以简单区分：

```text
curl
→ 更偏向请求和调试

wget
→ 更偏向下载
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

`scp` 使用 SSH 完成远程认证和数据传输。

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

这条命令实际上组合了多个 Shell 特性：

```text
nohup
→ 使程序忽略 SIGHUP

&
→ 让 Shell 将命令作为后台作业运行

> app.log
→ 重定向标准输出

2>&1
→ 将标准错误重定向到标准输出
```

因此：

```text
nohup
≠
后台运行
```

真正使命令进入后台的是：

```text
&
```

而 `nohup` 主要解决的是终端退出后程序因收到 `SIGHUP` 而结束的问题。

如果程序本身应该长期作为服务器服务运行，更推荐使用 `systemd` 管理。

参考：[GNU Coreutils - `nohup`](https://www.gnu.org/software/coreutils/manual/html_node/nohup-invocation.html)

---

## Shell 运算符

Shell 中有一组非常重要的特殊语法，用于连接命令、重定向输入输出以及进行命令替换。

本文重点介绍：

```text
-
|
`
<
<<
<<<
>
>>
```

其中可以分成三类：

```text
管道
→ |

输入 / 输出重定向
→ < << <<< > >>

命令替换
→ `command`
```

Bash 官方文档将这些功能分别归入 Pipelines、Redirections 和 Command Substitution。([Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html))

### `-`：标准输入 / 输出中的特殊约定

`-` 本身不是一个统一的 Shell 运算符，它通常作为**命令参数中的特殊文件名约定**使用。

最常见的含义是：

```text
-
→ 使用标准输入或标准输出
```

具体含义取决于命令本身。

例如某些命令：

```bash
cat -
```

表示从标准输入读取内容。

又例如：

```bash
tar -cf - app/
```

这里的 `-` 表示将归档数据写到标准输出。

因此不能简单记成：

```text
- = 标准输入
```

更准确的是：

```text
-
→ 许多 Unix 命令约定的“标准输入 / 标准输出”占位符
→ 具体语义由命令决定
```

它与 `<`、`>` 这种由 Shell 直接解释的重定向符号不是同一类语法。

---

### `|`：管道

```bash
command1 | command2
```

管道会将：

```text
command1
```

的标准输出连接到：

```text
command2
```

的标准输入。

例如：

```bash
ps -ef | grep java
```

执行过程可以理解为：

```text
ps -ef
   │
   │ stdout
   ↓
  pipe
   ↓
grep java
   │
   │ stdout
   ↓
终端
```

因此：

```text
|
→ 前一个命令的 stdout
→ 连接到后一个命令的 stdin
```

需要注意，默认情况下只有标准输出进入管道，标准错误仍然保持原来的去向。

如果希望标准输出和标准错误一起进入管道，可以使用 Bash 的：

```bash
command1 |& command2
```

它等价于：

```bash
command1 2>&1 | command2
```

参考：[Bash Reference Manual - Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)

---

### `>`：覆盖写入

```bash
command > file
```

将命令的标准输出重定向到文件。

例如：

```bash
echo "hello" > test.txt
```

如果：

```text
test.txt
```

不存在，则创建文件。

如果已经存在：

```text
原有内容
↓
被截断
↓
写入新的内容
```

因此：

```text
>
→ 重定向 stdout
→ 如果目标文件存在，默认先截断
```

参考：[Bash Reference Manual - Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

---

### `>>`：追加写入

```bash
command >> file
```

与 `>` 不同，它不会清空原文件，而是将输出追加到文件末尾。

例如：

```bash
echo "hello" >> app.log
```

再次执行：

```bash
echo "world" >> app.log
```

结果：

```text
hello
world
```

因此：

```text
>
→ 覆盖

>>
→ 追加
```

---

### `<`：标准输入重定向

```bash
command < file
```

将：

```text
file
```

作为命令的标准输入。

例如：

```bash
wc -l < app.log
```

这里：

```text
app.log
→ stdin
→ wc
```

与：

```bash
wc -l app.log
```

相比，后者是把 `app.log` 作为命令参数传给 `wc`。

而 `<` 是由 Shell 把文件打开后连接到程序的标准输入。

参考：[Bash Reference Manual - Redirecting Input](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

---

### `<<`：Here Document

```bash
command << EOF
内容
EOF
```

`<<` 用于创建 **Here Document（Here 文档）**。

Shell 会持续读取后续内容，直到遇到单独一行的结束标记。

例如：

```bash
cat << EOF
hello
world
EOF
```

相当于把：

```text
hello
world
```

作为 `cat` 的标准输入。

其中：

```text
EOF
```

只是一个常见的结束标记，并不是固定关键字，也可以使用：

```text
END
DATA
EOF
```

例如：

```bash
cat << END
hello
END
```

都可以。

如果结束标记没有加引号：

```bash
cat << EOF
Hello $USER
EOF
```

其中的变量、命令替换等内容会按照 Bash 的规则进行展开。

如果使用：

```bash
cat << 'EOF'
Hello $USER
EOF
```

则不会对 Here Document 的内容进行参数展开、命令替换等操作。

参考：[Bash Reference Manual - Here Documents](https://www.gnu.org/software/bash/manual/html_node/Here-Documents.html)

---

### `<<<`：Here String

```bash
command <<< "string"
```

`<<<` 可以将一个字符串直接作为命令的标准输入。

例如：

```bash
wc -c <<< "hello"
```

这里：

```text
"hello"
→ stdin
→ wc
```

Bash 会在字符串末尾额外添加一个换行符。

因此：

```bash
command <<< "hello"
```

和：

```bash
printf '%s\n' "hello" | command
```

在常见场景下具有类似效果。

`<<<` 是 Bash 提供的扩展，并不属于传统 POSIX `sh` 的标准语法。

参考：[Bash Reference Manual - Here Strings](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

---

### `` `command` ``：反引号命令替换

例如：

```bash
echo `date`
```

Shell 会先执行：

```bash
date
```

然后将命令输出替换到原位置。

可以理解为：

```text
`date`
   ↓
执行 date
   ↓
得到输出
   ↓
替换原来的 `date`
```

不过现代 Bash 更推荐：

```bash
echo $(date)
```

而不是：

```bash
echo `date`
```

原因是：

```text
$(...)
```

可读性更好，也更容易嵌套。

例如：

```bash
echo $(basename $(pwd))
```

而反引号形式在嵌套时需要额外转义，复杂情况下可读性较差。

Bash 官方文档也明确指出，`` `command` `` 是历史兼容形式，而 `$(command)` 是推荐形式。([Bash Reference Manual - Command Substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html))

---

### `$(command)`：推荐的命令替换

虽然本文主要讨论你原来的运算符，但实际使用中更推荐直接掌握：

```bash
$(command)
```

例如：

```bash
echo "Today is $(date)"
```

执行 `date`，然后将输出嵌入字符串中。

常见用途：

```bash
cd "$(dirname "$file")"
```

或者：

```bash
files=$(find /tmp -type f)
```

需要注意，命令替换会去除命令输出末尾的换行符。

另外，如果命令替换结果包含空格、通配符等内容，是否进行进一步的词拆分和路径展开还取决于是否使用引号。

参考：[Bash Reference Manual - Command Substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html)

---

## 文件描述符与重定向

理解 `<`、`>`、`2>&1` 等语法之前，需要先知道 Linux 中最常见的三个文件描述符：

```text
0
→ stdin
→ 标准输入

1
→ stdout
→ 标准输出

2
→ stderr
→ 标准错误
```

因此：

```bash
command > app.log
```

实际上是：

```bash
command 1> app.log
```

而：

```bash
command < input.txt
```

实际上是：

```bash
command 0< input.txt
```

### `2>`：重定向标准错误

```bash
command 2> error.log
```

表示：

```text
stderr
→ error.log
```

例如：

```bash
ls /not-exist 2> error.log
```

错误信息会写入：

```text
error.log
```

而正常输出仍然保持原来的位置。

---

### `2>&1`：将标准错误重定向到标准输出

```bash
command > app.log 2>&1
```

执行顺序：

```text
command > app.log
→ stdout → app.log

2>&1
→ stderr → stdout 当前指向的位置
→ app.log
```

最终：

```text
stdout → app.log
stderr → app.log
```

这也是：

```bash
nohup java -jar app.jar > app.log 2>&1 &
```

中非常关键的一部分。

需要注意：

```text
重定向是从左到右处理的
```

因此：

```bash
command > app.log 2>&1
```

和：

```bash
command 2>&1 > app.log
```

并不等价。

第一种：

```text
stdout → app.log
stderr → stdout → app.log
```

第二种执行时：

```text
stderr → 当前 stdout
```

此时 stdout 仍然指向终端。

随后：

```text
stdout → app.log
```

因此 stderr 仍然会输出到终端。

参考：[Bash Reference Manual - Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

---

## Shell 运算符综合示例

### 管道 + 文本搜索

```bash
ps -ef | grep java
```

```text
ps
→ 输出进程列表
→ 管道
→ grep
→ 过滤 java
```

### 输出重定向

```bash
ls -lah > files.txt
```

```text
ls
→ stdout
→ files.txt
```

### 追加日志

```bash
echo "server started" >> app.log
```

```text
echo
→ stdout
→ 追加到 app.log
```

### 输入重定向

```bash
wc -l < app.log
```

```text
app.log
→ stdin
→ wc
```

### 标准输出和错误一起写入日志

```bash
command > app.log 2>&1
```

```text
stdout → app.log
stderr → app.log
```

### Here Document

```bash
cat << EOF
server:
  port: 8080
EOF
```

### Here String

```bash
grep "error" <<< "this is an error message"
```

### 命令替换

```bash
echo "Current time: $(date)"
```

---

## 常见概念之间的关系

Shell 命令执行时，通常会同时涉及：

```text
命令
+
参数
+
标准输入
+
标准输出
+
标准错误
+
重定向
+
管道
+
命令替换
```

例如：

```bash
ps -ef | grep java > java.log 2>&1
```

可以拆解为：

```text
ps -ef
   ↓
stdout
   ↓
|
   ↓
grep java
   ↓
stdout → java.log

stderr → java.log
```

再例如：

```bash
echo "$(date)" >> app.log
```

执行顺序可以理解为：

```text
$(date)
→ 执行 date
→ 得到时间字符串

echo
→ 输出字符串

>>
→ 追加到 app.log
```

掌握这些运算符之后，就能够理解大量 Linux 命令组合，而不是只能机械记忆单条命令。

---

## 软件包管理

CentOS 不同版本的软件包管理工具存在区别。

### CentOS 7：YUM

CentOS 7 使用：

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

CentOS 8 中仍然可以使用：

```bash
yum
```

因为 `yum` 已经成为基于 DNF 的兼容入口。

因此：

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

假设服务名为：

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

停止当前服务后重新启动。

### 重新加载配置

```bash
systemctl reload myapp
```

请求服务重新读取配置。

前提是该服务实现了 reload 行为。

### 重新加载，否则重启

```bash
systemctl reload-or-restart myapp
```

逻辑：

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

### 设置开机启动

```bash
systemctl enable myapp
```

取消：

```bash
systemctl disable myapp
```

立即启动并设置开机启动：

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

### 实时查看

```bash
journalctl -u myapp -f
```

### 查看今天的日志

```bash
journalctl -u myapp --since today
```

### 查看最近 100 条

```bash
journalctl -u myapp -n 100
```

还可以结合：

```bash
systemctl status myapp
```

一起排查服务问题。

参考：[systemd `journalctl`](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)

---

## 定时任务

Linux 可以通过 **cron** 执行周期性任务。

### 编辑当前用户的定时任务

```bash
crontab -e
```

### 查看定时任务

```bash
crontab -l
```

### 删除当前用户的全部定时任务

```bash
crontab -r
```

注意：

```text
crontab -r
→ 删除当前用户整个 crontab
```

不是只删除某一条任务。

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

例如：

```text
*/5 * * * * /opt/scripts/check.sh
```

表示每 5 分钟执行一次。

---

## 系统时间

服务器时间对于日志、认证、数据库和分布式系统都非常重要。

### `date`：查看系统时间

```bash
date
```

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

不是简单地修改 UTC 时间。

### `chronyc sources`：查看时间源

```bash
chronyc sources
```

查看当前配置的 NTP 时间源和状态。

### `chronyc tracking`：查看同步状态

```bash
chronyc tracking
```

可以查看：

```text
参考时间源
Stratum
系统时间偏移
最近偏移
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

等信息可以用于判断本机时钟与参考时间源之间的偏差。

参考：[RHEL 9 - Configuring time synchronization](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings)

---

## 官方文档

深入学习 Linux 时，可以优先参考：

* [Bash Reference Manual](https://www.gnu.org/software/bash/manual/)
* [GNU Coreutils](https://www.gnu.org/software/coreutils/manual/)
* [Linux man-pages](https://man7.org/linux/man-pages/)
* [Red Hat Enterprise Linux Documentation](https://docs.redhat.com/)
* [systemd Documentation](https://www.freedesktop.org/wiki/Software/systemd/)
