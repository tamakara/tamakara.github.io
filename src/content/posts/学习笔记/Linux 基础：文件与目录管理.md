---
title: Linux 基础：文件与目录管理
published: 2026-09-13T02:06:57Z
description: ''
image: ''
tags: [Linux, 文件, 目录, FHS, 路径]
category: 学习笔记
draft: false
lang: ''
---

> Linux 日常使用和运维工作中，大量操作都围绕文件与目录展开。从定位配置文件、查看日志，到创建目录、复制文件、修改配置以及管理链接，都离不开对 Linux 文件与目录体系的理解。
>
> 本文以**文件与目录管理**为主线，介绍 Linux 的目录树、FHS、路径、文件类型、文件查看、文件与目录操作以及文件链接，并简单介绍挂载与目录树之间的关系。
>
> 文件系统的底层实现、磁盘、分区、存储设备、LVM、RAID 以及 I/O 等内容，将在《Linux 基础：存储体系》中进一步展开。

# 文件与目录的基本概念

## 文件与目录

Linux 中的文件和目录通过统一的目录树进行组织。

例如：

```text
/
├── etc/
├── home/
├── opt/
├── tmp/
├── usr/
└── var/
```

用户通常通过：

```text
文件
目录
路径
```

来定位和管理数据。

例如：

```text
/etc/nginx/nginx.conf
/var/log/app.log
/home/alice/project
```

其中：

```text
/etc/nginx/nginx.conf
→ 文件

/var/log/app.log
→ 文件

/home/alice/project
→ 目录
```

因此，文件与目录管理首先需要解决：

```text
文件在哪里？
目录在哪里？
如何找到它？
如何查看它？
如何创建、复制、移动和删除？
```

## 目录的作用

目录用于组织文件系统中的对象。

例如：

```text
/home/alice/

├── document.txt
├── image.jpg
└── project/
```

可以将目录简单理解为：

```text
名称
 ↓
对象
```

之间的组织关系。

因此：

```text
目录
↓
组织文件和其他目录
```

而路径则进一步告诉我们：

```text
对象在哪里
```

---

# Linux 的目录树

## 根目录 `/`

Linux 使用层次化目录结构，整个目录树从：

```text
/
```

开始。

它称为：

> **根目录（Root Directory）**

一个典型的 Linux 系统可能包含：

```text
/
├── boot
├── dev
├── etc
├── home
├── media
├── mnt
├── opt
├── proc
├── root
├── run
├── srv
├── sys
├── tmp
├── usr
└── var
```

这些目录并不意味着：

```text
一个目录 = 一块独立磁盘
```

Linux 可以将不同文件系统挂载到目录树的不同位置。

因此：

```text
目录树
≠
底层存储设备
```

目录树主要负责：

```text
统一组织和定位对象
```

而具体的存储实现属于文件系统和存储体系。

## Linux 与 Windows 的路径模型

Windows 常见：

```text
C:\
D:\
E:\
```

不同盘符通常代表不同的逻辑驱动器。

Linux 则采用统一的目录树：

```text
                  /

        ┌─────────┼─────────┐
        │         │         │
      /home      /var      /data
        │                   │
        │                   │
      用户文件          可能是独立文件系统
```

因此 Linux 中常见：

```text
/home
/var
/data
```

都只是目录路径。

至于目录背后究竟使用：

```text
哪个文件系统
哪个存储设备
```

则由挂载关系决定。

---

# FHS：Filesystem Hierarchy Standard

## 什么是 FHS

Linux 中常见目录并不是完全随意设计的。

FHS（Filesystem Hierarchy Standard，文件系统层次结构标准）用于描述 Unix-like 系统中目录和文件的组织约定。

它的目的之一，是让目录结构具有较好的：

```text
一致性
可预测性
可移植性
```

不同 Linux 发行版的具体实现可能有所不同，但 FHS 可以帮助我们建立统一的目录认知。

---

## `/etc`：系统配置

```text
/etc
```

通常用于保存：

> **系统和服务的配置文件。**

例如：

```text
/etc/hosts
/etc/fstab
/etc/ssh/
```

运维工作中经常需要查看或修改 `/etc` 下的配置：

```bash
cat /etc/hosts
```

可以先记住：

```text
/etc
↓
系统配置
```

---

## `/home`：普通用户家目录

普通用户通常拥有自己的家目录：

```text
/home/alice
/home/bob
```

例如：

```text
/home/
├── alice/
└── bob/
```

用户自己的文件、项目和部分用户级配置通常会放在自己的 Home Directory 中。

例如：

```text
/home/alice/project
```

---

## `/root`：root 用户家目录

```text
/root
```

是：

> **root 用户的家目录。**

它与：

```text
/
```

完全不同。

可以理解成：

```text
/
├── home
│   ├── alice
│   └── bob
│
└── root
```

因此：

```text
/
↓
整个目录树的根

/root
↓
root 用户的 Home Directory
```

---

## `/usr`：用户空间程序与数据

现代 Linux 系统中：

```text
/usr
```

通常包含大量：

```text
用户空间程序
库文件
共享数据
文档
```

常见目录：

```text
/usr/bin
/usr/sbin
/usr/lib
/usr/share
```

很多系统命令和应用程序都位于这里。

需要注意：

> `/usr` 不是“普通用户自己的目录”。

它表示的是一组用户空间软件和相关数据。

---

## `/bin` 与 `/sbin`

传统 FHS 中：

```text
/bin
/sbin
```

分别用于存放基本用户命令和系统管理相关命令。

现代许多 Linux 发行版采用：

> **usr merge**

因此你可能看到：

```text
/bin -> /usr/bin
/sbin -> /usr/sbin
```

所以学习 FHS 时，更应该理解目录的：

> **逻辑用途**

而不是把某一台 Linux 机器上的实际目录结构当作绝对规则。

---

## `/var`：变化中的数据

```text
/var
```

通常用于存放各种：

> **经常变化的数据。**

常见子目录：

```text
/var/log
/var/lib
/var/cache
```

其中：

```text
/var/log
```

对运维尤其重要。

例如：

```text
/var/log/
└── nginx/
```

其中可能保存系统、服务或应用产生的日志。

可以先建立：

```text
/var
↓
动态数据
```

的认识。

---

## `/tmp`：临时文件

```text
/tmp
```

通常用于保存临时数据，例如：

```text
临时文件
中间文件
临时缓存
```

需要注意：

> `/tmp` 的具体清理策略取决于系统和发行版配置，不能简单认为“每次重启都会清空”。

---

## `/dev`：设备文件

Linux 中很多设备可以通过：

```text
/dev
```

下的设备文件访问。

例如：

```text
/dev/null
/dev/zero
/dev/random
```

以及可能出现的磁盘设备：

```text
/dev/sda
/dev/nvme0n1
```

例如：

```text
/dev/sda1
```

可能表示某个磁盘分区。

可以粗略理解：

```text
程序
  ↓
文件接口
  ↓
/dev/xxx
  ↓
Linux Kernel
  ↓
设备驱动
  ↓
硬件
```

“Everything is a file”可以帮助理解这种 Unix/Linux 设计思想，但它并不意味着所有内核对象在实现上都是普通文件。

---

## `/proc`：进程与内核信息

```text
/proc
```

通常是：

> **procfs 虚拟文件系统**

它并不是普通意义上的磁盘目录，而是提供很多与：

```text
进程
CPU
内存
内核
系统状态
```

相关的信息。

例如：

```bash
cat /proc/cpuinfo
```

以及：

```bash
cat /proc/meminfo
```

每个进程通常也可以在：

```text
/proc/<PID>/
```

下找到对应信息。

例如：

```text
/proc/1234/
```

表示 PID 为 `1234` 的进程相关信息。

---

## `/sys`：设备与内核对象

```text
/sys
```

通常是：

> **sysfs 虚拟文件系统**

主要提供与：

```text
设备
驱动
内核对象
硬件属性
```

有关的信息。

可以简单区分：

```text
/proc
↓
进程、系统与内核相关信息

/sys
↓
设备、驱动与内核对象
```

---

## `/run`：运行时数据

```text
/run
```

通常用于保存系统运行期间产生的：

```text
PID 文件
Socket
运行状态
临时运行数据
```

例如 systemd 管理的服务可能会使用这里的运行时文件。

可以理解为：

```text
/run
↓
Runtime Data
```

---

## `/boot`

```text
/boot
```

通常保存系统启动相关文件，例如：

```text
Linux Kernel
initramfs
bootloader 相关文件
```

系统启动过程中会使用这里的内容。

---

## `/opt`

```text
/opt
```

通常用于：

> 可选的第三方软件或附加软件。

例如某些独立部署的软件可能放在：

```text
/opt/application/
```

---

## `/mnt` 与 `/media`

```text
/mnt
```

通常用于临时挂载文件系统。

而：

```text
/media
```

通常与可移动介质的挂载相关，例如：

```text
U 盘
移动硬盘
光盘
```

具体行为会因发行版而有所不同。

---

# 路径

## 绝对路径

绝对路径从根目录：

```text
/
```

开始描述对象位置。

例如：

```text
/etc/hosts
/var/log
/home/alice/project
```

都是绝对路径。

例如：

```text
/etc/ssh/sshd_config
```

可以理解为：

```text
/
└── etc
    └── ssh
        └── sshd_config
```

绝对路径不依赖当前工作目录。

---

## 相对路径

相对路径以：

> **当前工作目录**

作为起点。

假设当前目录：

```text
/home/alice/project
```

执行：

```bash
cat config/app.conf
```

实际访问：

```text
/home/alice/project/config/app.conf
```

因此：

```text
绝对路径
↓
从 / 开始

相对路径
↓
从当前目录开始
```

---

## `.`：当前目录

```text
.
```

表示当前目录。

例如：

```bash
./script.sh
```

表示：

```text
当前目录/script.sh
```

如果当前目录为：

```text
/home/alice/project
```

那么：

```text
./script.sh
```

对应：

```text
/home/alice/project/script.sh
```

---

## `..`：父目录

```text
..
```

表示当前目录的父目录。

例如当前位于：

```text
/home/alice/project
```

那么：

```text
..
```

表示：

```text
/home/alice
```

因此：

```bash
cd ..
```

就是返回上一级目录。

也可以：

```bash
cd ../..
```

向上移动两级。

---

## `~`：当前用户的家目录

在 Bash 中：

```text
~
```

通常表示当前用户的 Home Directory。

例如当前用户：

```text
alice
```

家目录：

```text
/home/alice
```

那么：

```text
~/Documents
```

通常就是：

```text
/home/alice/Documents
```

这里不要把：

```text
~
```

理解成固定的：

```text
/home
```

它表示：

```text
当前用户的家目录
```

因此：

```text
/
↓
根目录

~
↓
当前用户家目录

.
↓
当前目录

..
↓
父目录
```

---

# 当前工作目录

Shell 会维护当前工作目录。

查看：

```bash
pwd
```

例如：

```text
$ pwd
/home/alice
```

切换：

```bash
cd /var/log
```

再次：

```bash
pwd
```

得到：

```text
/var/log
```

相对路径就是以这个位置作为起点。

例如当前：

```text
/home/alice/project/src
```

执行：

```bash
cat ../config/app.conf
```

可以理解成：

```text
/home/alice/project/src
        │
        │ ..
        ▼
/home/alice/project
        │
        │ config/app.conf
        ▼
/home/alice/project/config/app.conf
```

---

# 文件名

## 文件扩展名

Linux 并不会根据文件名后缀强制决定文件类型。

例如：

```text
hello.txt
image.jpg
program.exe
```

首先都只是：

```text
文件名
```

Linux 判断文件类型时，更依赖：

```text
文件系统中的类型信息
文件内容
```

而不是单纯依赖扩展名。

因此：

```text
.txt
.jpg
.exe
```

更多是人类和应用程序约定俗成的命名方式。

---

## 隐藏文件

Linux 中通常以：

```text
.
```

开头的文件名被视为隐藏文件。

例如：

```text
.bashrc
.profile
.gitconfig
.git/
```

普通：

```bash
ls
```

通常不会显示。

使用：

```bash
ls -a
```

可以显示隐藏文件。

需要注意：

> Linux 的“隐藏文件”主要是命名约定，并不是文件系统中额外设置了一个统一的隐藏属性。

---

# 文件类型

使用：

```bash
ls -l
```

时，每一行开头通常有一个字符：

```text
-rw-r--r-- 1 alice alice 1234 file.txt
drwxr-xr-x 2 alice alice 4096 project
lrwxrwxrwx 1 alice alice    8 config -> app.conf
```

第一个字符表示对象类型。

| 类型标记 | 类型 |
| --- | --- |
| `-` | 普通文件 |
| `d` | 目录 |
| `l` | 符号链接 |
| `b` | 块设备 |
| `c` | 字符设备 |
| `p` | FIFO / 命名管道 |
| `s` | Socket |

因此：

```bash
ls -l
```

不仅可以查看：

```text
权限
所有者
大小
时间
```

还可以判断：

> **这是哪一种文件系统对象。**

关于权限、所有者和 inode 的具体含义，会在后续专题中进一步介绍。

---

# 查看文件类型

使用：

```bash
file filename
```

例如：

```bash
file image.jpg
```

`file` 会结合文件内容等信息尝试判断文件类型。

例如一个名为：

```text
hello.txt
```

的文件，实际内容可能是：

```text
ELF executable
```

或者其他二进制格式。

因此：

```text
文件名
↓
不一定能准确说明实际内容

file
↓
根据实际内容判断类型
```

在排查：

```text
下载文件
脚本
二进制文件
压缩包
日志
```

时非常有用。

---

# 文件与目录管理

Linux 最基本的文件操作主要围绕：

```text
创建
查看
复制
移动
重命名
删除
查找
```

展开。

---

## `pwd`

查看当前工作目录：

```bash
pwd
```

---

## `ls`

查看目录内容：

```bash
ls
```

查看详细信息：

```bash
ls -l
```

显示隐藏文件：

```bash
ls -a
```

常用组合：

```bash
ls -lah
```

通常同时表示：

```text
-l
→ 详细信息

-a
→ 包括隐藏文件

-h
→ 人类易读的文件大小
```

---

## `cd`

切换目录：

```bash
cd /var/log
```

返回上一级：

```bash
cd ..
```

进入 Home：

```bash
cd ~
```

切换到上一次目录：

```bash
cd -
```

---

## `mkdir`

创建目录：

```bash
mkdir project
```

创建多级目录：

```bash
mkdir -p project/src/main
```

其中：

```text
-p
→ 自动创建不存在的父目录
```

例如：

```bash
mkdir -p app/config/nginx
```

会得到：

```text
app/
└── config/
    └── nginx/
```

---

## `touch`

常用于创建空文件：

```bash
touch test.txt
```

如果文件已经存在，`touch` 通常不会清空文件内容，而是更新相关时间戳。

---

## `cp`

复制文件：

```bash
cp app.conf app.conf.bak
```

例如修改配置前备份：

```bash
cp /etc/nginx/nginx.conf \
   /etc/nginx/nginx.conf.bak
```

复制到目录：

```bash
cp app.conf /tmp/
```

复制目录通常需要：

```bash
cp -r project project-backup
```

其中：

```text
-r
→ recursive，递归处理目录内容
```

---

## `mv`

`mv` 可以用于：

```text
移动
重命名
```

移动：

```bash
mv test.txt /tmp/
```

重命名：

```bash
mv old.txt new.txt
```

目录也可以：

```bash
mv project project-backup
```

运维中常见的：

```text
配置备份
日志归档
目录切换
版本切换
```

都可能使用 `mv`。

---

## `rm`

删除文件：

```bash
rm test.txt
```

删除目录及其内容：

```bash
rm -r project
```

强制递归删除：

```bash
rm -rf project
```

需要特别注意：

> `rm` 删除文件后通常不会像桌面系统的回收站那样自动保留一个可恢复副本。

尤其是：

```bash
rm -rf
```

应当非常谨慎。

执行前建议确认：

```bash
pwd
```

然后：

```bash
ls
```

同时确认：

```text
目标路径
通配符展开结果
```

再执行删除。

---

## `rmdir`

删除空目录：

```bash
rmdir empty-dir
```

如果目录内还有文件，通常无法直接删除。

因此：

```text
rmdir
↓
删除空目录

rm -r
↓
递归删除目录及内容
```

---

# 文件查看

Linux 中查看文件不能只依赖一个命令，不同工具适合不同场景。

## `cat`

查看较小的文本文件：

```bash
cat file.txt
```

它会将文件内容直接输出到标准输出：

```text
File
 ↓
cat
 ↓
stdout
 ↓
Terminal
```

适合：

```text
简单文本
较小配置文件
```

不适合直接查看非常大的日志文件。

---

## `less`

查看较大的文本文件：

```bash
less app.log
```

支持：

```text
向前翻
向后翻
搜索
跳转
退出
```

例如：

```bash
less /var/log/app.log
```

在运维环境中非常常用。

---

## `more`

也可以：

```bash
more file.txt
```

进行分页查看。

不过现代 Linux 环境下：

```text
less
```

通常功能更丰富、使用更广泛。

---

## `head`

查看文件开头：

```bash
head file.txt
```

指定行数：

```bash
head -n 20 app.log
```

常用于快速确认：

```text
日志格式
配置文件开头
CSV 表头
```

---

## `tail`

查看文件结尾：

```bash
tail app.log
```

指定行数：

```bash
tail -n 20 app.log
```

日志排查中特别常见：

```bash
tail -f app.log
```

持续观察文件末尾新增的内容。

例如：

```text
Application
    │
    ▼
 app.log
    │
    ▼
 tail -f
    │
    ▼
 Terminal
```

`tail -f` 主要关注后续新增内容，而不是反复读取整个文件。

---

## `wc`

统计文件：

```bash
wc -l app.log
```

常见：

```bash
wc -l
wc -w
wc -c
```

分别可以用于统计：

```text
行
单词
字节
```

例如：

```bash
wc -l app.log
```

可以快速统计日志行数。

---

# 文件信息

## `stat`

查看文件详细元数据：

```bash
stat file.txt
```

通常可以看到：

```text
文件类型
权限
UID
GID
文件大小
inode
时间戳
```

常见时间信息包括：

```text
Access
Modify
Change
```

这些概念会在后续文件系统和权限相关内容中进一步展开。

---

## `du`

查看文件或目录占用空间：

```bash
du -sh project
```

例如：

```text
2.4G    project
```

查看子目录：

```bash
du -sh project/*
```

适合回答：

```text
哪个目录占用了很多空间？
```

---

## `df`

查看整个文件系统的空间使用情况：

```bash
df -h
```

可以简单区分：

```text
du
↓
文件 / 目录占用了多少

df
↓
文件系统整体还剩多少
```

例如磁盘空间异常时，可以：

```bash
df -h
```

先确认哪个文件系统接近满载，再：

```bash
du -sh /var/log/*
```

定位具体目录。

更深入的：

```text
磁盘
分区
文件系统
inode
I/O
```

将在《Linux 基础：存储体系》中介绍。

---

# 查找文件

## `find`

实际运维中经常遇到：

> “这个文件到底在哪里？”

可以使用：

```bash
find /var/log -name "*.log"
```

查找：

```text
/var/log
```

下面所有 `.log` 文件。

根据文件类型：

```bash
find /opt -type f
```

查找普通文件。

```bash
find /opt -type d
```

查找目录。

---

## 根据大小查找

例如：

```bash
find /var -type f -size +100M
```

表示查找超过 100 MB 的文件。

特别适合排查：

```text
日志异常增长
临时文件堆积
磁盘空间下降
```

---

## 根据时间查找

例如：

```bash
find /var/log -type f -mtime -1
```

用于查找最近一天修改过的文件。

这可以帮助排查：

```text
最近生成了哪些文件？
最近修改了哪些文件？
```

---

# 符号链接

## 什么是符号链接

符号链接（Symbolic Link）可以理解成：

> **指向另一个路径的特殊文件。**

创建：

```bash
ln -s /opt/app/config.yaml config.yaml
```

形成：

```text
config.yaml
      │
      ▼
/opt/app/config.yaml
```

查看：

```bash
ls -l
```

可能看到：

```text
config.yaml -> /opt/app/config.yaml
```

---

## 符号链接的特点

符号链接保存的是：

```text
目标路径
```

因此目标发生变化或被删除后，链接可能失效。

例如：

```text
link
 │
 └──► /tmp/a.txt
```

如果：

```text
/tmp/a.txt
```

被删除：

```text
link
 │
 └──► 不存在的路径
```

就会形成：

> **Broken Symlink**

---

# 硬链接

Linux 中还存在：

> **Hard Link**

创建：

```bash
ln file.txt file2.txt
```

两个目录项可以指向同一个 inode。

简化理解：

```text
file.txt ──┐
            ├──► inode ───► 文件数据
file2.txt ─┘
```

而符号链接更像：

```text
link
 │
 ▼
路径
 │
 ▼
目标文件
```

因此两者并不是简单的“两个文件名”。

---

## 软链接与硬链接对比

| 特性 | 符号链接 | 硬链接 |
| --- | --- | --- |
| 本质 | 特殊文件 | 另一个目录项 |
| 保存 / 指向 | 目标路径 | 同一个 inode |
| 跨文件系统 | 通常可以 | 通常不可以 |
| 目标删除后 | 链接可能失效 | 其他硬链接仍可访问 |
| 常见用途 | 路径别名、版本切换 | 多个目录项引用同一文件 |

实际运维中经常看到：

```text
current -> app-v2
```

通过切换链接：

```text
current -> app-v3
```

即可方便地切换当前版本。

---

# 挂载与目录树

## 什么是挂载

Linux 可以把一个独立文件系统接入现有目录树，这个过程称为：

> **mount（挂载）**

例如：

```text
/dev/sdb1
    │
    │ mount
    ▼
  /data
```

挂载之后：

```bash
cd /data
```

访问的就是挂载到这个位置的文件系统。

---

## 挂载点

用于接入文件系统的目录称为：

> **Mount Point（挂载点）**

例如：

```text
/
├── home
├── var
└── data
       ▲
       │
     挂载点
```

某个独立文件系统可以挂载到：

```text
/data
```

形成：

```text
/dev/sdb1
     │
     ▼
   /data
     │
     ▼
 Linux 目录树
```

---

## 为什么 Linux 不需要磁盘盘符

Linux 可以把多个文件系统挂载到同一棵目录树中：

```text
                  /

          ┌───────┼────────┐
          │       │        │
        /home    /var     /data
          │                 │
      文件系统 A         文件系统 B
```

因此：

```text
/home
/var
/data
```

看起来都只是目录，但背后可能来自：

```text
不同的文件系统
```

这也是 Linux 存储体系的重要特点。

文件系统、磁盘、分区、挂载、LVM 等内容将在《Linux 基础：存储体系》中进一步展开。

---

# 文件与目录管理的实际工作流

实际使用 Linux 时，可以形成一套比较稳定的工作流程：

```text
确定当前位置
    ↓
pwd
    ↓
查看目录
    ↓
ls
    ↓
定位目标
    ↓
find
    ↓
查看文件
    ↓
less / head / tail
    ↓
查看属性
    ↓
stat / file
    ↓
备份
    ↓
cp
    ↓
修改 / 移动
    ↓
mv
    ↓
验证
```

例如排查一个日志目录：

```bash
cd /var/log

pwd

ls -lah

find . -name "*.log"

less app.log

tail -n 50 app.log

tail -f app.log

stat app.log
```

如果需要确认目录占用：

```bash
du -sh .
```

查看整个文件系统：

```bash
df -h
```

这就是 Linux 日常文件管理中一条非常常见的操作链路。

---

# 文件操作中的安全习惯

Linux 的文件操作权限很高，因此错误操作可能带来严重后果。

## 删除之前确认位置

先：

```bash
pwd
```

再：

```bash
ls
```

确认目标之后再执行：

```bash
rm
```

## 谨慎使用通配符

例如：

```bash
rm *.log
```

执行之前可以先：

```bash
ls *.log
```

确认到底匹配哪些文件。

## 谨慎使用 `rm -rf`

尤其需要警惕：

```text
路径写错
变量为空
通配符匹配范围过大
当前目录判断错误
```

生产环境中建议始终遵循：

```text
先确认
再操作
```

---

# 文件与目录管理中的核心命令

| 命令 | 主要用途 |
| --- | --- |
| `pwd` | 查看当前目录 |
| `ls` | 查看目录内容 |
| `cd` | 切换目录 |
| `mkdir` | 创建目录 |
| `touch` | 创建空文件 / 更新时间戳 |
| `cp` | 复制 |
| `mv` | 移动 / 重命名 |
| `rm` | 删除 |
| `rmdir` | 删除空目录 |
| `cat` | 查看文件 |
| `less` | 分页查看 |
| `head` | 查看开头 |
| `tail` | 查看结尾 |
| `wc` | 统计 |
| `file` | 判断文件类型 |
| `stat` | 查看文件属性 |
| `find` | 查找文件 |
| `du` | 查看文件 / 目录占用 |
| `ln` | 创建链接 |

---

# 文件与目录管理和后续 Linux 内容的关系

这篇主要解决：

```text
文件在哪里？
目录在哪里？
如何定位？
如何查看？
如何创建？
如何复制？
如何移动？
如何删除？
如何查找？
```

在此基础上继续学习：

```text
用户与权限管理
        ↓
谁可以访问和修改文件

文本检索与处理
        ↓
如何分析和处理文件内容

存储体系
        ↓
文件实际如何存储
磁盘如何组织
文件系统如何工作

Shell 自动化
        ↓
如何把这些文件操作自动化
```

可以形成：

```text
文件与目录管理
        │
        ├── 路径
        ├── 文件
        ├── 目录
        ├── 链接
        └── 常用命令
                │
                ▼
        用户与权限管理
                │
                ▼
        文本检索与处理
                │
                ▼
        Shell 自动化
                │
                ▼
        运维自动化
```

而：

```text
磁盘
分区
文件系统
inode
挂载
LVM
RAID
I/O
```

则进一步进入：

```text
Linux 基础：存储体系
```

---

# Linux 文件与目录管理的整体认识

可以将本篇内容归纳为：

```text
Linux 文件与目录
│
├── 目录树
│   └── 根目录 /
│
├── FHS
│   ├── /etc
│   ├── /home
│   ├── /root
│   ├── /usr
│   ├── /var
│   ├── /tmp
│   ├── /dev
│   ├── /proc
│   ├── /sys
│   ├── /run
│   ├── /boot
│   ├── /opt
│   ├── /mnt
│   └── /media
│
├── 路径
│   ├── 绝对路径
│   ├── 相对路径
│   ├── .
│   ├── ..
│   └── ~
│
├── 文件对象
│   ├── 普通文件
│   ├── 目录
│   ├── 符号链接
│   ├── 块设备
│   ├── 字符设备
│   ├── FIFO
│   └── Socket
│
├── 文件查看
│   ├── cat
│   ├── less
│   ├── head
│   ├── tail
│   └── wc
│
├── 文件信息
│   ├── file
│   ├── stat
│   └── du
│
├── 文件查找
│   └── find
│
├── 文件与目录管理
│   ├── pwd
│   ├── ls
│   ├── cd
│   ├── mkdir
│   ├── touch
│   ├── cp
│   ├── mv
│   ├── rm
│   └── rmdir
│
├── 链接
│   ├── 符号链接
│   └── 硬链接
│
└── 存储关系
    ├── 文件系统
    ├── 挂载点
    └── mount
```

对于 Linux 日常工作，可以把最核心的一条线记成：

```text
路径
 ↓
定位文件 / 目录
 ↓
查看
 ↓
创建 / 复制 / 移动 / 删除
 ↓
查找与确认
```

而运维中最重要的习惯则是：

```text
先确认位置
 ↓
再确认目标
 ↓
执行操作
 ↓
验证结果
```

> **Linux 文件与目录管理的核心，就是通过路径定位对象，再使用相应工具完成查看、创建、复制、移动、删除和查找。掌握这些基础操作之后，再结合权限、文本处理和存储体系，才能逐渐建立完整的 Linux 运维能力。**

## 外部参考

- [Filesystem Hierarchy Standard](https://refspecs.linuxfoundation.org/fhs.shtml)
- [Linux man-pages](https://man7.org/linux/man-pages/)
- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
