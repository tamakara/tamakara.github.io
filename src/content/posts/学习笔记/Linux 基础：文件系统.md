---
title: Linux 基础：文件系统
published: 2026-09-13T02:06:57Z
description: ''
image: ''
tags: [Linux, 文件系统, FHS, 文件, 目录, 路径]
category: 学习笔记
draft: false 
lang: ''
---

> Linux 中的文件并不是简单地“放在磁盘里”，而是通过文件系统组织成一棵统一的目录树。
>
> 理解 **文件系统、FHS、目录树、路径、文件类型、文件查看、文件与目录管理、链接以及挂载**，是后续学习 Linux 权限、磁盘、存储和系统运维的基础。

## 什么是 Linux 文件系统

### 文件系统的作用

文件系统（File System）负责组织和管理存储设备中的数据，并向操作系统和应用程序提供统一的文件访问方式。

一个文件系统需要解决很多问题：

```text
文件存在哪里？
文件叫什么？
文件属于谁？
文件有哪些权限？
文件有多大？
如何找到这个文件？
如何读取和修改这个文件？
```

用户通常不需要直接操作磁盘上的：

```text
扇区
磁盘地址
物理块
```

而是通过：

```text
文件
目录
路径
```

访问数据。

可以简单理解为：

```text
应用程序
    │
    ▼
系统调用
    │
    ▼
Linux VFS
    │
    ▼
具体文件系统
    │
    ▼
块设备 / 存储介质
```

Linux 支持多种文件系统，例如：

```text
ext4
XFS
Btrfs
tmpfs
```

它们的实现和特性不同，但上层程序通常可以通过统一的文件系统接口使用它们。

---

## Linux 的目录树

### 根目录 `/`

Linux 文件系统采用层次化目录结构。

整棵目录树从：

```text
/
```

开始。

它被称为：

> **根目录（Root Directory）**

例如一个典型的 Linux 系统可能是：

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

所有普通文件和目录最终都位于这棵目录树中。

---

### Linux 与 Windows 的路径模型

Windows 常见的是：

```text
C:\
D:\
E:\
```

不同盘符代表不同的逻辑驱动器。

Linux 则通常只有一棵统一的目录树：

```text
                /
                │
       ┌────────┼────────┐
       │        │        │
     /home     /var     /data
       │                 │
       │                 │
    用户文件         可能是另一个文件系统
```

不同的文件系统可以挂载到这棵目录树中的不同位置。

因此 Linux 中：

> **目录树和底层存储设备不是一一对应的。**

---

# FHS：Filesystem Hierarchy Standard

### 什么是 FHS

Linux 中常见目录并不是完全随意设计的。

Filesystem Hierarchy Standard：

> **FHS，文件系统层次结构标准**

用于描述 Unix-like 系统中目录和文件的组织约定。

它的目的之一就是让系统中的目录结构具有较好的：

```text
一致性
可预测性
可移植性
```

不同发行版具体实现可能存在差异，但 FHS 能帮助我们建立一个通用的目录结构认知。

---

## `/etc`：系统配置

```text
/etc
```

通常用于：

> 系统和服务的配置文件。

例如：

```text
/etc/hosts
/etc/fstab
/etc/ssh/
```

运维工作中经常需要修改或查看 `/etc` 下的配置。

例如：

```bash
cat /etc/hosts
```

以及：

```text
/etc/ssh/
```

中的 SSH 配置。

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

用户自己的配置、文件和项目通常会存放在自己的 Home Directory 中。

例如：

```text
/home/alice/project
```

---

## `/root`：root 用户家目录

：

```text
/root
```

是：

> **root 用户的家目录。**

它和：

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
整个文件系统的根

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

例如：

```text
/usr/bin
/usr/sbin
/usr/lib
/usr/share
```

很多系统命令和应用程序都位于这里。

需要注意：

> `/usr` 并不是“普通用户自己的文件夹”。

它描述的是系统中的一组用户空间软件和相关数据。

---

## `/bin` 与 `/sbin`

传统 FHS 中：

```text
/bin
/sbin
```

分别用于存放基本用户命令和系统管理相关命令。

但现代很多 Linux 发行版采用：

> **usr merge**

也就是把部分目录统一到 `/usr` 下，并通过符号链接等方式保持兼容。

因此在某些现代系统中，你可能看到：

```text
/bin -> /usr/bin
/sbin -> /usr/sbin
```

所以学习 FHS 时，更应该理解这些目录的：

> **逻辑用途**

而不是把某台 Linux 机器上的物理目录结构当成绝对规则。

---

## `/var`：变化中的数据

```text
/var
```

用于存放各种：

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
├── ...
└── nginx/
```

其中可能保存系统、服务或应用产生的日志。

可以先建立：

```text
/var
↓
动态数据
```

这样的认识。

---

## `/tmp`：临时文件

```text
/tmp
```

通常用于：

> 临时文件。

应用程序在运行过程中可能产生：

```text
临时数据
临时文件
中间文件
```

并放置在这里。

需要注意：

> `/tmp` 的清理策略由系统和发行版配置决定，不能简单认为“每次重启都会清空”。

---

## `/dev`：设备文件

Linux 中设备通常可以通过：

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

可以粗略理解为：

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

这也是 Linux “Everything is a file” 这种描述背后的重要设计思想之一。

不过需要注意：

> 这是一种帮助理解 Unix/Linux 设计的简化表达，并不意味着所有内核对象在实现上都是普通文件。

---

## `/proc`：进程与内核信息

```text
/proc
```

通常是：

> **procfs 虚拟文件系统**

它不对应普通意义上的磁盘目录。

其中可以看到很多与：

```text
进程
CPU
内存
内核
系统状态
```

有关的信息。

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

下找到相应的信息。

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

它主要提供与：

```text
设备
驱动
内核对象
硬件属性
```

有关的信息。

可以先粗略区分：

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

例如 systemd 管理的服务可能会在这里使用运行时文件。

因此：

```text
/run
↓
Runtime Data
```

这是它最重要的概念。

---

## `/boot`

```text
/boot
```

通常保存系统启动相关文件。

例如：

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

> 可选的第三方软件或附加软件包。

例如某些独立安装的软件可能放在：

```text
/opt/application/
```

---

## `/mnt` 与 `/media`

```text
/mnt
```

通常用于：

> 临时挂载文件系统。

而：

```text
/media
```

通常用于：

> 可移动介质的挂载。

例如：

```text
U 盘
移动硬盘
光盘
```

不同发行版的具体自动挂载行为可能不同。

---

# 路径

## 绝对路径

绝对路径：

> **从根目录 `/` 开始描述对象位置。**

例如：

```text
/etc/hosts
/var/log
/home/alice/project
```

它们都是绝对路径。

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

假设：

```text
当前目录：
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

表示：

> 当前目录。

例如：

```bash
./script.sh
```

表示：

> 当前目录中的 `script.sh`

如果当前目录：

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

表示：

> 当前目录的父目录。

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

---

## `~`：当前用户的家目录

在 Bash 中：

```text
~
```

通常表示：

> 当前用户的 Home Directory。

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

理解为固定的：

```text
/home
```

它表示的是：

```text
当前用户的家目录
```

---

# 当前工作目录

Shell 和进程都有自己的当前工作目录概念。

查看当前 Shell 的工作目录：

```bash
pwd
```

例如：

```text
$ pwd
/home/alice
```

执行：

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

相对路径的解析就是以这个目录为起点。

例如当前位于：

```text
/home/alice/project/src
```

执行：

```bash
cat ../config/app.conf
```

可以逐级解析：

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

这些只是文件名。

Linux 判断文件类型，更依赖：

```text
文件系统中的类型信息
文件内容
执行权限
```

而不是单纯依赖扩展名。

因此：

```text
.txt
.jpg
.exe
```

更多是：

> 人类和应用程序约定俗成的命名方式。

---

## 隐藏文件

Linux 中以：

```text
.
```

开头的文件名，通常被称为：

> **隐藏文件**

例如：

```text
.bashrc
.profile
.gitconfig
```

普通：

```bash
ls
```

通常不会显示这些文件。

而：

```bash
ls -a
```

可以显示隐藏目录项。

例如：

```text
.
..
.bashrc
.profile
Documents
```

需要注意：

> Linux 的“隐藏文件”主要是命名约定，并不是文件系统中额外设置了一个统一的隐藏属性。

---

# 文件与目录

## 目录是什么

在 Linux 中，目录本质上也是文件系统中的一种对象。

目录的核心作用是：

> **保存目录项与名称到文件系统对象的关联。**

例如：

```text
/home/alice/
├── document.txt
├── project/
└── image.jpg
```

目录提供了这些名称与对应文件系统对象之间的组织关系。

因此：

```text
目录
↓
组织文件系统对象
```

而不是简单地理解成：

> “磁盘上的一个文件夹盒子”。

---

# 文件类型

使用：

```bash
ls -l
```

时，每一行最前面通常有一个字符，例如：

```text
-rw-r--r--  1 alice alice  1234 file.txt
drwxr-xr-x  2 alice alice  4096 project
lrwxrwxrwx  1 alice alice     8 config -> app.conf
```

第一个字符表示对象类型。

常见类型：

| 类型标记 | 类型 |
|---|---|
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

不仅可以看到：

```text
权限
所有者
大小
时间
```

还可以通过第一个字符判断：

> **这是哪一种文件系统对象。**

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

`file` 会尝试根据文件内容等信息判断它的类型。

例如一个文件即使名字叫：

```text
hello.txt
```

里面实际可能是其他格式的数据。

所以：

```text
文件名
↓
不一定能准确说明内容

file
↓
根据实际内容判断
```

这在排查：

```text
下载文件
脚本
二进制文件
压缩包
日志
```

时很有用。

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
```

展开。

---

## `pwd`

查看当前工作目录：

```bash
pwd
```

例如：

```text
$ pwd
/home/alice/project
```

---

## `ls`

查看目录内容：

```bash
ls
```

常用：

```bash
ls -l
```

查看详细信息。

```bash
ls -a
```

显示隐藏文件。

```bash
ls -lah
```

通常用于同时查看：

```text
详细信息
隐藏文件
人类易读的文件大小
```

例如：

```text
-rw-r--r--  1 alice alice 1.2K app.log
drwxr-xr-x  2 alice alice 4.0K project
```

---

## `cd`

切换当前工作目录：

```bash
cd /var/log
```

返回上一级：

```bash
cd ..
```

回到用户家目录：

```bash
cd ~
```

或者：

```bash
cd
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
↓
需要时自动创建父目录
```

---

## `touch`

常用于：

> 创建空文件，或者更新文件时间戳。

例如：

```bash
touch test.txt
```

如果文件不存在，会创建它。

如果文件已经存在，`touch` 通常不会覆盖文件内容，而是更新相关时间戳。

---

## `cp`

复制文件：

```bash
cp app.conf app.conf.bak
```

复制目录通常需要：

```bash
cp -r project project-backup
```

例如：

```text
project
   │
   │ cp -r
   ▼
project-backup
```

具体复制行为还会受到符号链接、权限等因素影响。

---

## `mv`

`mv` 可以用于：

```text
移动
重命名
```

例如：

```bash
mv test.txt /tmp/
```

表示移动文件。

而：

```bash
mv old.txt new.txt
```

则表示重命名。

可以理解为：

```text
old.txt
   │
   │ mv
   ▼
new.txt
```

---

## `rm`

删除文件：

```bash
rm test.txt
```

删除目录及其内容通常使用：

```bash
rm -r project
```

例如：

```text
project/
├── a
├── b
└── c

rm -r project

↓

project/
```

需要特别注意：

> `rm` 删除文件后通常不会像桌面系统的回收站那样自动保留一个可恢复副本。

尤其是：

```bash
rm -rf
```

应当非常谨慎。

例如：

```bash
rm -rf some-directory
```

会递归删除目录及其内容，并且不会交互确认。

在生产环境操作时，应当先确认：

```text
当前目录
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

如果目录里面还有文件，通常无法直接删除。

这使得：

```bash
rmdir
```

与：

```bash
rm -r
```

存在明显区别：

```text
rmdir
↓
只删除空目录

rm -r
↓
递归删除目录及内容
```

---

# 文件查看

Linux 中查看文件不能只依赖一个命令。

不同工具适合不同场景。

---

## `cat`

最简单的文件查看命令：

```bash
cat file.txt
```

它会把文件内容输出到标准输出。

例如：

```text
文件
 ↓
cat
 ↓
stdout
 ↓
Terminal
```

适合查看：

```text
较小的配置文件
简单文本
```

如果文件非常大：

```bash
cat large.log
```

可能直接把大量内容一次性输出，阅读体验很差。

---

## `less`

查看较大的文本文件时，常使用：

```bash
less app.log
```

它允许：

```text
向前翻
向后翻
搜索
跳转
退出
```

尤其适合：

```text
日志
配置文件
长文本
```

例如：

```text
less /var/log/app.log
```

在运维中非常常见。

---

## `more`

：

```bash
more file.txt
```

也是分页查看工具。

不过现代 Linux 环境下：

```text
less
```

通常比：

```text
more
```

功能更丰富，因此实际使用中更常见。

---

## `head`

查看文件开头：

```bash
head file.txt
```

默认显示文件开头的一部分内容。

例如：

```bash
head -n 20 app.log
```

表示：

> 查看前 20 行。

特别适合快速确认：

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

例如：

```bash
tail -n 20 app.log
```

查看最后 20 行。

日志排查中特别常见：

```bash
tail -f app.log
```

可以持续观察文件末尾新增内容。

可以理解为：

```text
应用程序
   │
   ▼
不断追加日志
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

`tail -f` 并不是“持续读取整个文件”，而是持续关注文件末尾新增的数据。

---

## `wc`

`wc` 用于统计：

```text
行
词
字节
```

例如：

```bash
wc -l app.log
```

表示统计：

> 文件中的行数。

常见形式：

```bash
wc -l
wc -w
wc -c
```

它也非常适合与管道结合：

```bash
cat app.log | wc -l
```

不过对于这种简单场景：

```bash
wc -l app.log
```

通常更直接。

---

# 文件信息

## `stat`

查看文件的详细元数据：

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

例如：

```text
Access
Modify
Change
```

这些时间概念后续学习文件系统和权限时会进一步涉及。

---

## 文件大小

查看目录大小：

```bash
du -sh project
```

查看文件系统整体空间：

```bash
df -h
```

这两个命令很容易混淆：

```text
du
↓
目录 / 文件实际使用了多少空间

df
↓
文件系统整体还剩多少空间
```

例如：

```text
服务器磁盘满了
        │
        ├── df -h
        │     ↓
        │   文件系统剩余空间
        │
        └── du -sh
              ↓
            找占空间的目录
```

这两个命令在磁盘故障排查中非常重要。

---

# 符号链接

## 什么是符号链接

符号链接（Symbolic Link）可以理解成：

> **指向另一个路径的特殊文件。**

例如：

```bash
ln -s /opt/app/config.yaml config.yaml
```

此时：

```text
config.yaml
      │
      │ symbolic link
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

> **目标路径**

因此目标发生变化时，链接可能失效。

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

就会成为：

> **Broken Symlink**

---

# 硬链接

Linux 中还存在：

> **Hard Link**

例如：

```bash
ln file.txt file2.txt
```

这两个目录项可以指向同一个文件数据和 inode。

简化理解：

```text
file.txt ──┐
            ├──► inode ───► 文件数据
file2.txt ─┘
```

而符号链接则更像：

```text
link ───► 路径 ───► 目标文件
```

因此二者不是简单的“两个文件名”。

---

## 软链接与硬链接对比

| 特性 | 符号链接 | 硬链接 |
|---|---|---|
| 本质 | 特殊文件 | 另一个目录项 |
| 保存 | 目标路径 | 指向同一 inode |
| 跨文件系统 | 通常可以 | 通常不可以 |
| 目标删除后 | 链接可能失效 | 数据仍可通过其他硬链接访问 |
| 常见用途 | 快捷路径、版本切换 | 多个目录项引用同一文件 |

实际运维中经常见到符号链接，例如：

```text
current -> app-v2
```

通过修改链接：

```text
current -> app-v3
```

就可以实现较方便的版本切换。

---

# 挂载与文件系统

## 什么是挂载

Linux 中，一个独立文件系统可以通过：

> **mount（挂载）**

接入现有的目录树。

例如：

```text
/dev/sdb1
    │
    │ mount
    ▼
  /data
```

之后：

```bash
cd /data
```

访问的就是挂载进来的文件系统。

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

于是：

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

Linux 可以把多个文件系统挂载到同一棵目录树：

```text
                    /
                    │
          ┌─────────┼─────────┐
          │         │         │
        /home      /var      /data
          │                   │
      文件系统 A           文件系统 B
```

所以：

```text
/home
/var
/data
```

看起来都是目录，但背后可能来自：

```text
不同的文件系统
```

这也是理解 Linux 存储体系的重要基础。

---

# 文件系统与目录树的关系

把前面的概念串起来：

```text
                     Linux
                       │
                       ▼
                  目录树 /
                       │
          ┌────────────┼────────────┐
          │            │            │
        /home         /var        /data
          │            │            │
          ▼            ▼            ▼
      文件 / 目录   日志 / 数据   挂载文件系统
```

这里最关键的一点是：

> **目录树是用户看到的统一命名空间，而文件系统负责具体组织和存储数据。**

因此：

```text
路径
↓
解决“对象在哪里”

目录
↓
组织对象

文件系统
↓
负责存储和管理对象

挂载
↓
把文件系统接入目录树
```

---

# 文件系统中的基本操作流程

实际使用 Linux 时，可以按照这样的思路理解：

```text
1. 确定当前位置
   ↓
pwd

2. 查看目录内容
   ↓
ls

3. 进入目标目录
   ↓
cd

4. 查看文件
   ↓
cat / less / head / tail

5. 创建 / 复制 / 移动
   ↓
mkdir / touch / cp / mv

6. 删除
   ↓
rm / rmdir

7. 查看详细信息
   ↓
stat / file

8. 判断磁盘空间
   ↓
df / du
```

例如排查一个日志目录：

```bash
cd /var/log
ls -lah
```

找到目标日志后：

```bash
less app.log
```

需要查看最新日志：

```bash
tail -n 50 app.log
```

持续观察：

```bash
tail -f app.log
```

查看文件详细信息：

```bash
stat app.log
```

查看整个文件系统空间：

```bash
df -h
```

查看日志目录占用了多少空间：

```bash
du -sh /var/log
```

这已经覆盖了 Linux 日常文件操作中非常常见的一条工作链路。

---

# Linux 文件系统的整体认识

可以把这一篇的知识整理成这样一张结构图：

```text
Linux 文件系统
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
├── 文件系统对象
│   ├── 普通文件
│   ├── 目录
│   ├── 符号链接
│   ├── 设备
│   ├── FIFO
│   └── Socket
│
├── 文件查看
│   ├── cat
│   ├── less
│   ├── more
│   ├── head
│   ├── tail
│   ├── wc
│   ├── file
│   └── stat
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
└── 存储关系
    ├── 文件系统
    ├── 挂载点
    └── mount
```

从这里继续往后，Linux 文件系统还会进一步涉及：

```text
inode
文件权限
硬链接
软链接
磁盘
分区
文件系统
挂载
LVM
RAID
I/O
```

其中权限、inode、磁盘和挂载机制会在后面的专题中分别展开。

---

## 外部参考

- [Filesystem Hierarchy Standard](https://refspecs.linuxfoundation.org/fhs.shtml)
- [Linux man-pages](https://man7.org/linux/man-pages/)
- [GNU Coreutils Manual](https://www.gnu.org/software/coreutils/manual/)
