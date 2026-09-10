---
title: Linux 文件系统
published: 2026-09-10
image: ''
tags: [Linux, 操作系统, 运维]
category: 学习笔记
---
> 本文以 **CentOS** 为主要环境，介绍 Linux 文件系统的基本目录结构，以及各目录在服务器运维中的主要作用。
>
> Linux 文件系统遵循 **FHS（Filesystem Hierarchy Standard，文件系统层次结构标准）** 所定义的目录组织原则。不过，不同发行版以及不同版本的具体实现可能存在差异，因此本文以 **CentOS / RHEL 系**的实际目录布局为主。FHS 3.0 是目前正式发布的 FHS 标准版本。

## `/`

根目录是整个 Linux 文件系统的起点。

Linux 中所有文件和目录都位于根目录 `/` 之下：

```text
/
├── bin
├── boot
├── dev
├── etc
├── home
├── lib
├── media
├── mnt
├── opt
├── proc
├── root
├── run
├── sbin
├── srv
├── sys
├── tmp
├── usr
└── var
```

可以把 `/` 理解为 Linux 文件系统的“根节点”。

---

## `/bin`

`/bin` 用于存放系统运行和用户日常操作所需的基本可执行程序。

传统 FHS 中，`/bin` 主要存放所有用户都可以使用的基本命令，例如：

```text
ls
cp
mv
cat
mkdir
```

不过在现代 CentOS / RHEL 中，系统已经采用 **UsrMerge**。因此 `/bin` 通常是：

```text
/bin → /usr/bin
```

也就是说，现代系统中 `/bin` 和 `/usr/bin` 并不是两套完全独立的程序目录。RHEL 7 起就已经进行了相关目录合并。

---

## `/sbin`

传统上，`/sbin` 用于存放系统管理和维护相关的可执行程序。

例如：

```text
mount
fsck
reboot
```

这些程序通常主要由系统管理员使用。

现代 CentOS / RHEL 同样采用了 UsrMerge，因此：

```text
/sbin → /usr/sbin
```

`/usr/sbin` 中包含系统管理程序，包括部分启动、恢复和维护系统所需的程序。

因此，学习现代 CentOS 时，不需要把 `/sbin` 和 `/usr/sbin` 理解成两套完全独立的目录。

---

## `/boot` —— 运维重点

`/boot` 保存系统启动过程中需要使用的文件。

常见内容包括：

```text
vmlinuz
initramfs
grub2/
```

其中：

```text
vmlinuz
→ Linux 内核镜像

initramfs
→ 系统启动早期使用的临时根文件系统

grub2/
→ GRUB 2 引导相关文件和配置
```

例如：

```text
/boot/vmlinuz-...
/boot/initramfs-...
```

### 为什么 `/boot` 很重要？

系统启动时需要先读取 `/boot` 中的启动文件，然后加载 Linux 内核。

如果 `/boot` 被损坏、文件丢失或空间不足，可能导致：

```text
系统无法正常启动
内核无法加载
内核升级失败
```

### 是否需要单独分区？

在物理服务器等场景中，可以将 `/boot` 单独分区。

现代 RHEL 9 官方推荐的独立 `/boot` 分区大小至少为 **1 GiB**。对于虚拟机和云主机，则可以根据实际存储方案决定是否单独划分。

因此不建议再简单记忆成“`/boot` 固定 500 MB～1 GB”。

---

## `/dev` —— 运维高频

`/dev` 用于存放 Linux 内核提供的**设备文件**。

Linux 会将各种设备以文件形式暴露给用户空间，因此常说：

```text
Linux 中“一切皆文件”
```

但更准确地说，是大量系统资源被提供了类似文件的统一访问接口。

常见设备：

```text
/dev/sda
```

表示一个磁盘设备。

```text
/dev/sda1
```

表示该磁盘上的一个分区。

```text
/dev/null
```

表示空设备。

写入 `/dev/null` 的数据会被直接丢弃：

```bash
echo "hello" > /dev/null
```

```text
/dev/tty
```

表示当前进程关联的终端设备。

`/dev` 并不是普通的磁盘目录，而是由内核、`devtmpfs`、`udev` 等机制共同管理的设备节点。

---

## `/etc` —— 运维核心

`/etc` 主要存放系统和各种服务的**配置文件**。

例如：

```text
/etc/passwd
/etc/shadow
/etc/hosts
/etc/fstab
```

常见文件：

### `/etc/passwd`

保存系统用户的基本信息。

```bash
cat /etc/passwd
```

### `/etc/shadow`

保存用户密码相关的安全信息，通常只有 root 等特权用户能够读取。

### `/etc/hosts`

保存本机的静态主机名解析关系。

例如：

```text
127.0.0.1 localhost
```

### `/etc/fstab`

定义系统启动时需要挂载的文件系统。

### `/etc/cron*`

包含系统级 cron 相关配置。

需要注意：

```text
/etc/cron*
```

与用户执行：

```bash
crontab -e
```

创建的用户级 crontab 并不是一回事。

### `/etc/systemd/system/`

可以存放系统管理员自己创建或修改的 systemd unit。

例如：

```text
/etc/systemd/system/myapp.service
```

RHEL 官方文档也将 `/etc/systemd/system/` 定义为管理员创建或自定义 systemd unit 的重要位置。

实际服务器中，大量软件的配置文件也会位于：

```text
/etc/nginx/
/etc/ssh/
/etc/systemd/
```

等目录。

因此可以把：

```text
/etc
```

理解为：

```text
系统级配置中心
```

---

## `/home`

`/home` 用于存放普通用户的家目录。

例如：

```text
/home/zhangsan
/home/lisi
```

用户登录后，默认工作目录通常就是自己的家目录：

```text
/home/用户名
```

例如：

```bash
cd ~
```

对于用户 `zhangsan`：

```text
~ → /home/zhangsan
```

不同用户通常拥有独立的家目录和权限。

在服务器上，`/home` 中通常保存：

```text
用户文件
用户 Shell 配置
用户 SSH 配置
用户开发环境配置
```

等内容。

---

## `/root`

`/root` 是 **root 用户的家目录**。

它与普通用户家目录不同：

```text
普通用户
→ /home/用户名

root
→ /root
```

因此 root 用户并不使用：

```text
/home/root
```

作为默认家目录。

---

## `/lib`、`/lib64`

这些目录用于存放系统程序运行所需的共享库，以及部分启动所需的重要库文件。

例如：

```text
.so
```

格式的动态链接库。

传统 Linux 目录结构中：

```text
/lib
/lib64
```

曾经用于区分不同架构的库。

但是这里不要简单记成：

```text
/lib   → 32 位
/lib64 → 64 位
```

这种说法在现代 CentOS/RHEL 中并不严谨。

在现代 RHEL 系统中，随着 UsrMerge：

```text
/lib
→ /usr/lib
```

而 64 位系统还可能使用：

```text
/usr/lib64
```

等目录保存对应架构的库。

因此从运维角度，最重要的是理解：

```text
/lib*
/usr/lib*
```

主要用于存放系统程序运行所依赖的库文件，而不是简单根据目录名判断“32 位还是 64 位”。

RHEL 官方文档也说明了 `/lib` 与 `/usr/lib` 的合并关系。

---

## `/media`

`/media` 用于存放**可移动介质的挂载点**。

例如：

```text
U 盘
光盘
移动硬盘
```

桌面 Linux 环境中，桌面系统可能会自动将这些设备挂载到 `/media` 下。

例如：

```text
/media/user/USB
```

服务器环境中通常较少使用。

---

## `/mnt`

`/mnt` 用于提供一个临时的、管理员手动使用的挂载点。

例如：

```bash
mount /dev/sdb1 /mnt
```

也可以提前创建更明确的目录：

```bash
mkdir /mnt/data
mount /dev/sdb1 /mnt/data
```

常用于：

```text
临时挂载磁盘
临时挂载文件系统
临时挂载网络存储
```

`/mnt` 与 `/media` 的主要区别可以简单理解为：

```text
/media
→ 更偏向可移动介质的挂载

/mnt
→ 更偏向管理员手动进行临时挂载
```

---

## `/opt`

`/opt` 用于安装**可选的第三方软件包**。

例如某些大型商业软件可能安装在：

```text
/opt/
```

下面。

常见场景包括：

```text
Oracle
第三方中间件
商业软件
厂商提供的完整软件包
```

例如：

```text
/opt/oracle/
/opt/app/
```

`/opt` 与 `/usr` 的定位不同：

```text
/usr
→ 系统软件和发行版提供的软件资源

/opt
→ 可选的第三方软件
```

FHS 将 `/opt` 定位为附加应用软件包的安装位置。

---

## `/proc` —— 排错高频

`/proc` 是一个由 Linux 内核提供的**虚拟文件系统**，主要用于向用户空间提供进程和内核相关信息。

它不是普通磁盘目录。

例如：

```text
/proc/cpuinfo
/proc/meminfo
/proc/loadavg
/proc/1/
```

查看 CPU 信息：

```bash
cat /proc/cpuinfo
```

查看内存信息：

```bash
cat /proc/meminfo
```

查看系统负载：

```bash
cat /proc/loadavg
```

查看 PID 为 `1` 的进程：

```text
/proc/1/
```

很多进程的信息也可以通过：

```text
/proc/<PID>/
```

查看。

例如：

```text
/proc/1234/status
/proc/1234/cmdline
```

### `/proc` 的特点

```text
虚拟文件系统
由内核动态提供内容
主要反映当前系统状态
```

系统重启后，之前的进程信息也会随之消失。

因此 `/proc` 对：

```text
系统排障
进程分析
CPU / 内存分析
内核参数查看
```

非常重要。

---

## `/sys`

`/sys` 同样是 Linux 提供的虚拟文件系统，通常称为 **sysfs**。

它主要向用户空间暴露：

```text
设备
驱动
总线
内核对象
部分内核参数
```

例如：

```text
/sys/class/
/sys/devices/
/sys/block/
```

查看块设备：

```bash
ls /sys/block/
```

`/proc` 与 `/sys` 可以简单区分为：

```text
/proc
→ 更关注进程和内核运行状态

/sys
→ 更关注设备、驱动以及内核设备模型
```

---

## `/run`

`/run` 用于保存系统运行期间产生的**临时运行时数据**。

例如：

```text
PID 文件
Unix Socket
运行状态文件
服务运行时数据
```

常见：

```text
/run/systemd/
/run/user/
/run/sshd/
```

`/run` 中的数据具有明显的“运行时”特征，系统重启后通常会重新创建，因此不适合存放需要持久保存的数据。

现代系统中：

```text
/var/run
→ 通常指向 /run
```

RHEL 官方将 `/run` 定义为用于保存临时运行时文件的文件系统，并说明其内容在系统重启时会被删除。

---

## `/srv`

`/srv` 用于存放系统对外提供服务时使用的数据。

例如：

```text
网站数据
FTP 数据
其他网络服务数据
```

例如可以设计为：

```text
/srv/www/
/srv/ftp/
```

不过实际生产环境中，很多软件会根据自身规范使用：

```text
/var/www/
/var/lib/<service>/
```

因此 `/srv` 虽然有明确的 FHS 定义，但并不是所有服务器软件都会实际使用它。FHS 将 `/srv` 定义为系统提供服务时使用的数据目录。

---

## `/tmp`

`/tmp` 用于存放**临时文件**。

例如：

```text
程序临时文件
临时下载文件
临时生成文件
临时 Socket
```

它通常允许多个用户使用，因此权限一般具有：

```text
所有用户可写
```

的特征，同时通常设置 sticky bit，防止普通用户删除其他用户创建的文件。

查看：

```bash
ls -ld /tmp
```

常见结果类似：

```text
drwxrwxrwt
```

末尾的：

```text
t
```

表示 sticky bit。

### `/tmp` 中的数据是否一定会自动删除？

不能简单地说：

```text
系统会定期清空 /tmp
```

更准确的说法是：

```text
/tmp 中的文件生命周期通常较短，
系统可以通过 systemd-tmpfiles 等机制对其进行清理，
具体清理规则由系统配置决定。
```

因此：

```text
/tmp
```

中不应该存放需要长期保存的重要业务数据。

Red Hat 文档也明确指出 `/tmp` 用于短期临时数据，并提醒其中大量数据可能消耗文件系统空间。

---

## `/usr`

`/usr` 是 Linux 中非常重要的系统软件资源目录。

这里不要把它简单解释成：

```text
Unix System Resource
```

这种“英文缩写展开”并不是理解 FHS 的重点。

更准确的理解是：

```text
/usr
→ 系统中的大量用户空间程序、库和共享资源
```

典型目录包括：

```text
/usr/bin
/usr/sbin
/usr/lib
/usr/lib64
/usr/share
/usr/local
```

---

### `/usr/bin`

存放大量普通用户可以使用的可执行程序。

例如现代 CentOS 中很多基础命令实际上位于：

```text
/usr/bin/
```

例如：

```text
/usr/bin/ls
/usr/bin/cat
/usr/bin/find
```

由于 UsrMerge：

```text
/bin → /usr/bin
```

所以 `/bin` 中的内容与 `/usr/bin` 实际上高度统一。

---

### `/usr/sbin`

存放系统管理相关的可执行程序。

例如：

```text
/usr/sbin/
```

中的程序主要用于：

```text
系统管理
服务管理
网络管理
系统维护
```

现代系统中的：

```text
/sbin
```

通常与：

```text
/usr/sbin
```

合并。

---

### `/usr/lib`、`/usr/lib64`

用于存放系统程序依赖的库文件以及其他程序运行所需的内部资源。

例如：

```text
共享库
systemd 相关文件
程序内部模块
```

---

### `/usr/share`

用于存放与硬件架构无关的共享资源。

例如：

```text
文档
man 页面
语言文件
时区数据
图标
其他共享数据
```

---

### `/usr/local`

`/usr/local` 用于存放**管理员手动安装的软件**。

这是服务器中非常常见的目录。

例如：

```text
/usr/local/bin/
/usr/local/lib/
/usr/local/src/
```

管理员自己编译安装的软件，经常会安装到：

```text
/usr/local/
```

例如：

```text
/usr/local/nginx/
/usr/local/java/
```

可以简单理解：

```text
/usr
→ 发行版的软件

/usr/local
→ 管理员自己安装的软件
```

不过实际软件的安装路径还需要根据具体软件的安装方式和规范决定。

---

## `/var` —— 运维重点

`/var` 用于保存**经常变化的动态数据**。

与 `/usr` 中相对稳定的软件文件不同：

```text
/var
→ 数据会不断产生、修改、增长
```

这是服务器运维中非常重要的目录。

典型内容：

```text
/var/log
/var/lib
/var/cache
/var/spool
```

---

### `/var/log`

保存系统和各种服务产生的日志。

例如：

```text
系统日志
认证日志
服务日志
应用日志
```

常见排障操作：

```bash
du -sh /var/log/*
```

当服务器出现：

```text
磁盘空间不足
```

时，`/var/log` 是经常需要检查的位置之一。

不过不要理解成：

```text
磁盘爆满 → 一定是 /var/log
```

还应该结合：

```text
df
du
lsof
```

等工具进一步定位。

---

### `/var/lib`

用于保存应用程序或系统服务的**持久化状态数据**。

例如某些服务可能使用：

```text
/var/lib/<service>/
```

保存：

```text
数据库文件
服务状态
持久化数据
缓存或索引
```

需要注意，`/var/lib` 并不等于“数据库目录”。

不同软件会根据自己的设计决定具体的数据存放位置。

---

### `/var/cache`

用于存放应用产生的缓存数据。

缓存的特点是：

```text
可以被重新生成
通常不是最核心的数据
```

例如软件包管理器会使用类似：

```text
/var/cache/
```

的目录保存缓存。

---

### `/var/spool`

用于保存等待处理的数据。

例如：

```text
邮件队列
打印队列
cron 等任务产生的队列数据
```

它与普通持久化业务数据的区别在于：

```text
数据通常处于“等待处理”的状态
```

---

## `/var/tmp`

`/var/tmp` 同样用于临时文件，但与 `/tmp` 相比，更适合保存**生命周期相对更长的临时数据**。

可以简单区分为：

```text
/tmp
→ 短期临时文件

/var/tmp
→ 生命周期相对更长的临时文件
```

两者都不适合存放真正重要的业务数据。

---

## 常见目录之间的关系

掌握 FHS 时，可以重点理解下面这些目录之间的区别：

```text
/etc
→ 配置

/usr
→ 系统软件和共享资源

/opt
→ 第三方可选软件

/var
→ 持续变化的数据

/home
→ 普通用户数据

/root
→ root 用户数据

/tmp
→ 短期临时数据

/var/tmp
→ 较长期临时数据

/run
→ 当前运行时数据

/proc
→ 进程和内核运行状态

/sys
→ 设备、驱动和内核对象

/dev
→ 设备文件

/boot
→ 系统启动文件
```

---

## 从运维角度理解 Linux 文件系统

实际工作中，不需要一开始背住所有目录的每一个细节，更重要的是看到路径后能够快速判断它属于哪一类数据。

例如：

```text
/etc/myapp/
```

看到 `/etc`，首先想到：

```text
配置文件
```

看到：

```text
/var/log/myapp/
```

首先想到：

```text
日志
```

看到：

```text
/var/lib/myapp/
```

首先想到：

```text
持久化状态 / 应用数据
```

看到：

```text
/opt/myapp/
```

首先想到：

```text
第三方软件
```

看到：

```text
/tmp/myapp/
```

首先想到：

```text
临时数据
```

看到：

```text
/run/myapp/
```

首先想到：

```text
运行时数据
```

看到：

```text
/proc/1234/
```

首先想到：

```text
PID 1234 的进程信息
```

这种“**看到路径就知道数据性质**”的能力，比单纯背目录名称更重要。
