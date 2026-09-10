---
title: Linux 文件系统
published: 2026-09-10
image: ''
tags: [Linux, 文件, 操作系统, 运维]
category: 学习笔记
---
> 本文以 **CentOS** 为主要环境，介绍 Linux 文件系统的基本目录结构，以及各目录在服务器运维中的主要作用。
>
> Linux 文件系统遵循 **FHS（Filesystem Hierarchy Standard，文件系统层次结构标准）** 所定义的目录组织原则。不过，不同发行版以及不同版本的具体实现可能存在差异，因此本文以 **CentOS / RHEL 系**的实际目录布局为主。[FHS 3.0 官方文档](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.pdf)

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

可以把 `/` 理解为整个文件系统的根节点。

---

## `/bin`

传统 FHS 中，`/bin` 用于存放系统运行和用户日常操作所需的基本可执行程序，例如：

```text
ls
cp
mv
cat
mkdir
```

不过，现代 CentOS / RHEL 已经采用 **UsrMerge**。在这类系统中：

```text
/bin → /usr/bin
```

因此 `/bin` 与 `/usr/bin` 并不是两套完全独立的程序目录。

例如：

```bash
ls -l /bin
```

在现代系统中通常可以看到它指向：

```text
/usr/bin
```

所以学习现代 CentOS 时，可以重点理解：

```text
/usr/bin
→ 系统和用户常用的可执行程序
```

而 `/bin` 更多是为了兼容传统目录结构而保留。

参考：[RHEL 文件系统布局](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/managing-file-systems-in-image-mode-for-rhel)

---

## `/sbin`

传统上，`/sbin` 用于存放系统管理和维护相关的可执行程序，例如：

```text
mount
fsck
reboot
```

这些程序主要用于系统管理、启动、恢复和维护。

现代 CentOS / RHEL 同样采用 UsrMerge：

```text
/sbin → /usr/sbin
```

因此现代系统中不需要把 `/sbin` 和 `/usr/sbin` 理解为两套完全独立的目录。

可以简单理解为：

```text
/usr/bin
→ 普通用户程序

/usr/sbin
→ 系统管理程序
```

不过这种区分主要是目录组织上的传统约定，**并不意味着 `/usr/sbin` 中的所有程序都只能由 root 执行**。

---

## `/boot`

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
→ GRUB 2 引导相关文件
```

例如：

```text
/boot/vmlinuz-...
/boot/initramfs-...
```

### 为什么 `/boot` 很重要？

系统启动过程中，Bootloader 需要读取 `/boot` 中的启动文件，然后加载 Linux 内核。

如果 `/boot` 中的关键文件损坏、丢失，或者在内核更新时空间不足，都可能导致：

```text
无法正常启动系统
内核无法加载
内核更新失败
```

### 是否需要单独分区？

在 RHEL 9 的裸机安装推荐方案中，`/boot` 可以作为独立文件系统，并且官方建议大小至少为 **1 GiB**。对于计划长期保留多个内核的系统，还需要根据实际情况增加空间。

同时，RHEL 9 文档说明 `/boot` 必须位于独立磁盘分区上，而不能使用 LVM 逻辑卷。该建议主要针对裸机安装，虚拟机和云环境需要根据具体平台决定。

参考：[RHEL 9 推荐分区方案](https://docs.redhat.com/zh-cn/documentation/red_hat_enterprise_linux/9/html/performing_a_standard_rhel_9_installation/recommended-partitioning-scheme_partitioning-reference)

---

## `/dev`

`/dev` 用于提供 Linux 的**设备文件**。

Linux 将大量设备通过文件接口暴露给用户空间，因此可以使用类似操作普通文件的方式访问设备。

常见设备：

```text
/dev/sda
```

通常表示一个块设备，例如磁盘。

```text
/dev/sda1
```

表示该磁盘上的某个分区。

```text
/dev/null
```

是一个特殊设备，写入其中的数据会被直接丢弃：

```bash
echo "hello" > /dev/null
```

```text
/dev/tty
```

表示当前进程关联的终端设备。

需要注意：

```text
Linux 一切皆文件
```

更适合作为帮助理解 Linux 设计思想的说法，而不是严格意义上的定义。设备、进程信息、套接字等对象并不都是真正意义上的普通文件。

现代 Linux 中，`/dev` 的设备节点通常由内核的 `devtmpfs` 和用户空间的 `udev` 等机制共同管理，并不是一个普通的静态磁盘目录。

---

## `/etc`

`/etc` 主要用于保存系统以及系统服务的**配置文件**。

例如：

```text
/etc/passwd
/etc/shadow
/etc/hosts
/etc/fstab
```

### `/etc/passwd`

保存系统用户的基本信息，例如：

```text
用户名
UID
GID
家目录
默认 Shell
```

查看：

```bash
cat /etc/passwd
```

---

### `/etc/shadow`

保存用户认证相关的敏感信息，包括密码哈希等内容。

该文件通常只有 root 或具有相应权限的用户可以读取。

---

### `/etc/hosts`

保存本机静态主机名解析关系。

例如：

```text
127.0.0.1 localhost
```

当系统进行名称解析时，`/etc/hosts` 是否优先于 DNS，还要结合系统的 NSS 配置判断。

---

### `/etc/fstab`

保存文件系统的静态挂载配置。

例如系统启动时需要自动挂载某个磁盘，就可以在这里定义。

常见字段包括：

```text
设备 / UUID
挂载点
文件系统类型
挂载选项
dump
fsck 顺序
```

---

### `/etc/cron*`

包含系统级 cron 相关配置。

例如：

```text
/etc/crontab
/etc/cron.d/
/etc/cron.hourly/
/etc/cron.daily/
```

需要注意，它与用户执行：

```bash
crontab -e
```

建立的用户级 crontab 并不是同一个机制。

---

### `/etc/systemd/system/`

用于存放系统管理员创建或自定义的 systemd unit。

例如：

```text
/etc/systemd/system/myapp.service
```

实际服务器中，很多软件也会在 `/etc` 下提供自己的配置目录，例如：

```text
/etc/ssh/
/etc/nginx/
/etc/systemd/
```

因此可以从运维角度把：

```text
/etc
```

理解成：

```text
系统级配置目录
```

参考：[systemd Unit 文件](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd)

---

## `/home`

`/home` 用于存放普通用户的家目录。

例如：

```text
/home/zhangsan
/home/lisi
```

对于用户 `zhangsan`：

```text
~ → /home/zhangsan
```

可以通过：

```bash
cd ~
```

进入自己的家目录。

用户的家目录通常用于保存：

```text
个人文件
Shell 配置
SSH 配置
开发环境配置
```

等用户级数据。

具体家目录位置也可以通过用户账户信息进行配置，并不要求所有系统都必须使用 `/home`。

---

## `/root`

`/root` 是 **root 用户的家目录**。

普通用户通常：

```text
/home/用户名
```

而 root 默认：

```text
/root
```

因此：

```text
/root
```

并不是：

```text
/home/root
```

---

## `/lib`、`/lib64`

这些目录及其对应的 `/usr/lib*` 目录主要用于保存系统程序运行所需的库文件。

例如：

```text
.so
```

格式的共享库。

传统 Linux 目录结构中，可以看到：

```text
/lib
/lib64
```

但现代 CentOS / RHEL 已经采用 UsrMerge，因此 `/lib` 通常与 `/usr/lib` 关联。

例如：

```text
/lib → /usr/lib
```

同时，在 64 位系统中还可能存在：

```text
/usr/lib64
```

因此不要简单记成：

```text
/lib   → 32 位
/lib64 → 64 位
```

这种说法对于现代系统并不严谨。

更重要的是理解：

```text
/usr/lib*
→ 系统程序运行所需的库和相关资源
```

参考：[RHEL 文件系统布局](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/managing-file-systems-in-image-mode-for-rhel)

---

## `/media`

`/media` 用于作为**可移动介质**的挂载点。

例如：

```text
U 盘
光盘
移动硬盘
```

桌面 Linux 环境中的桌面管理程序可能会自动将可移动设备挂载到 `/media` 下，例如：

```text
/media/user/USB
```

服务器环境中通常较少直接使用该目录。

---

## `/mnt`

`/mnt` 用于提供一个由管理员手动使用的临时挂载点。

例如：

```bash
mount /dev/sdb1 /mnt
```

也可以创建专用目录：

```bash
mkdir /mnt/data
mount /dev/sdb1 /mnt/data
```

适合：

```text
临时挂载磁盘
临时挂载文件系统
临时挂载网络存储
```

可以简单区分：

```text
/media
→ 更偏向可移动介质

/mnt
→ 更偏向管理员手动临时挂载
```

---

## `/opt`

`/opt` 用于安装**可选的附加软件包**。

例如某些第三方商业软件可能安装在：

```text
/opt/
```

下面：

```text
/opt/oracle/
/opt/app/
```

常见于：

```text
第三方商业软件
厂商提供的软件包
独立部署的应用
```

与 `/usr` 相比：

```text
/usr
→ 系统软件及其资源

/opt
→ 可选的附加软件
```

FHS 将 `/opt` 定义为用于安装附加应用软件包的目录。

参考：[FHS `/opt`](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch03s13.html)

---

## `/proc`

`/proc` 是 Linux 内核提供的**虚拟文件系统**，主要用于向用户空间提供进程和内核相关信息。

它不是普通的磁盘目录，其中的许多内容是内核实时生成的。

例如：

```text
/proc/cpuinfo
/proc/meminfo
/proc/loadavg
/proc/1/
```

查看 CPU：

```bash
cat /proc/cpuinfo
```

查看内存：

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

每个正在运行的进程通常都有对应的：

```text
/proc/<PID>/
```

例如：

```text
/proc/1234/status
/proc/1234/cmdline
```

### `/proc` 的特点

```text
虚拟文件系统
由内核提供数据
反映当前系统状态
```

因此：

```text
/proc
→ 系统运行状态的一个重要观察接口
```

它对于：

```text
进程排查
CPU / 内存分析
内核参数查看
系统故障排查
```

都非常重要。

Linux 内核官方文档：[The `/proc` Filesystem](https://docs.kernel.org/filesystems/proc.html)

---

## `/sys`

`/sys` 是 Linux 提供的另一个虚拟文件系统，通常称为 **sysfs**。

它主要用于向用户空间暴露 Linux 内核设备模型相关的信息，包括：

```text
设备
驱动
总线
设备属性
内核对象
```

常见目录：

```text
/sys/class/
/sys/devices/
/sys/block/
```

例如：

```bash
ls /sys/block/
```

可以看到系统中的块设备。

可以简单区分：

```text
/proc
→ 主要关注进程和系统运行状态

/sys
→ 主要关注设备、驱动以及内核设备模型
```

Linux 内核官方文档：[sysfs](https://docs.kernel.org/filesystems/sysfs.html)

---

## `/run`

`/run` 用于保存系统运行期间产生的**运行时数据**。

例如：

```text
PID 文件
Unix Socket
服务运行时状态
其他临时运行时信息
```

常见目录：

```text
/run/systemd/
/run/user/
/run/sshd/
```

这些数据通常只在当前系统启动周期内有效。

系统重启后，`/run` 通常会被重新创建，因此不应该在这里存放需要长期保存的数据。

现代系统中：

```text
/var/run
→ 通常指向 /run
```

因此：

```text
/var/run
```

主要是为了兼容旧路径。

参考：[RHEL 系统文件系统](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/managing-file-systems-in-image-mode-for-rhel)

---

## `/srv`

`/srv` 用于保存系统对外提供服务时使用的数据。

例如：

```text
/srv/www/
/srv/ftp/
```

可以用于保存：

```text
网站数据
FTP 数据
其他网络服务数据
```

不过实际生产环境中，具体软件不一定使用 `/srv`。

例如某些 Web 服务可能使用：

```text
/var/www/
/var/lib/<service>/
```

FHS 对 `/srv` 的定义是“由该系统提供的服务所使用的数据”。

参考：[FHS `/srv`](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch03s17.html)

---

## `/tmp`

`/tmp` 用于存放**临时文件**。

例如：

```text
程序临时文件
临时生成文件
临时处理数据
```

`/tmp` 通常允许多个用户写入，因此通常具有 sticky bit。

查看：

```bash
ls -ld /tmp
```

常见结果：

```text
drwxrwxrwt
```

最后的：

```text
t
```

表示设置了 sticky bit。

它可以防止普通用户删除其他用户在该目录中创建的文件。

### `/tmp` 会自动清空吗？

不能简单理解为：

```text
系统定期清空 /tmp
```

更准确地说，系统可以通过：

```text
systemd-tmpfiles
```

等机制按照配置对临时文件进行清理，具体清理策略取决于系统配置。

因此：

```text
/tmp
```

不适合存放需要长期保存的重要数据。

Linux `tmpfiles.d` 官方文档：[tmpfiles.d](https://www.freedesktop.org/software/systemd/man/latest/tmpfiles.d.html)

---

## `/usr`

`/usr` 是 Linux 中非常重要的系统软件资源目录。

不建议把 `/usr` 简单解释成某个英文缩写。更准确的理解是：

```text
/usr
→ 大量用户空间程序、库和共享资源
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

例如：

```text
/usr/bin/ls
/usr/bin/cat
/usr/bin/find
```

现代 CentOS 中，很多传统位于 `/bin` 下的命令实际上位于：

```text
/usr/bin
```

而：

```text
/bin → /usr/bin
```

是现代 UsrMerge 布局的一部分。

---

### `/usr/sbin`

存放系统管理相关的可执行程序，例如一些：

```text
系统管理工具
服务管理工具
网络管理工具
系统维护工具
```

现代系统中：

```text
/sbin → /usr/sbin
```

---

### `/usr/lib`、`/usr/lib64`

用于保存系统程序依赖的库以及程序运行所需的相关资源。

例如：

```text
共享库
程序内部模块
systemd 相关文件
```

不要仅凭 `/lib`、`/lib64` 这样的名称判断程序是 32 位还是 64 位，应结合系统架构和具体库文件判断。

---

### `/usr/share`

用于保存与 CPU 架构无关的共享数据。

例如：

```text
man 页面
文档
语言文件
时区数据
图标
其他共享资源
```

---

### `/usr/local`

`/usr/local` 用于放置**本地管理员安装的软件和资源**。

例如：

```text
/usr/local/bin/
/usr/local/lib/
/usr/local/src/
```

管理员自己编译安装的软件，经常会使用：

```text
/usr/local/
```

例如：

```text
/usr/local/nginx/
/usr/local/java/
```

因此可以粗略理解为：

```text
/usr
→ 系统安装的软件

/usr/local
→ 本机管理员额外安装的软件
```

但具体软件应该安装在哪里，仍需要结合软件本身的安装方式和规范决定。

---

## `/var`

`/var` 用于保存**经常变化的动态数据**。

与 `/usr` 中相对稳定的软件文件不同：

```text
/var
→ 数据会不断产生、修改和增长
```

服务器上的很多运行数据都与 `/var` 有关，因此它是运维中非常重要的目录。

常见子目录：

```text
/var/log
/var/lib
/var/cache
/var/spool
```

参考：[FHS `/var`](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch03s15.html)

---

### `/var/log`

保存系统和服务产生的日志。

例如：

```text
系统日志
认证日志
服务日志
应用日志
```

服务器出现磁盘空间不足时，经常需要检查：

```bash
du -sh /var/log/*
```

但不要简单认为：

```text
磁盘爆满
→ 一定是 /var/log
```

还需要结合：

```text
df
du
lsof
```

等工具定位。

---

### `/var/lib`

用于保存应用程序或系统服务的**持久化状态数据**。

例如：

```text
/var/lib/<service>/
```

可以保存：

```text
应用状态
持久化数据
数据库相关文件
索引
其他服务状态
```

FHS 对 `/var/lib` 的定义更准确地说是 **Variable State Information**，即与具体主机和应用运行状态有关、需要跨进程或重启保留的数据。

因此不要简单理解成：

```text
/var/lib
→ 数据库目录
```

不同软件会根据自身设计决定实际的数据路径。

参考：[FHS `/var/lib`](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch05s08.html)

---

### `/var/cache`

用于保存可以重新生成的缓存数据。

例如：

```text
软件包缓存
应用缓存
其他临时缓存
```

缓存通常不是系统运行不可替代的核心数据，因此其生命周期和清理方式通常与持久化数据不同。

---

### `/var/spool`

用于保存等待处理的数据。

例如：

```text
邮件队列
打印队列
其他任务队列
```

可以理解为：

```text
数据已经产生
↓
等待对应服务进一步处理
```

FHS 将 `/var/spool` 定义为保存等待某种后续处理的数据。

参考：[FHS `/var/spool`](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch05s15.html)

---

## `/var/tmp`

`/var/tmp` 同样用于保存临时文件，但其设计目标是让文件能够拥有比 `/tmp` **更长的生命周期**。

可以简单理解：

```text
/tmp
→ 更偏向短期临时数据

/var/tmp
→ 更偏向生命周期较长的临时数据
```

两者都不适合存放真正重要、必须长期保存的业务数据。

FHS 明确将 `/var/tmp` 定义为用于保存“在系统重启后不应被删除”的临时文件，因此它与 `/tmp` 的生命周期设计并不相同。参考：[FHS `/var/tmp`](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/ch05s15.html)

---

## 常见目录之间的关系

掌握 FHS 时，可以重点理解下面这些目录的职责：

```text
/boot
→ 系统启动文件

/dev
→ 设备文件

/etc
→ 系统和服务配置

/home
→ 普通用户家目录

/root
→ root 用户家目录

/opt
→ 可选的第三方软件

/proc
→ 进程和内核运行状态

/sys
→ 设备、驱动和内核设备模型

/run
→ 当前系统运行时数据

/srv
→ 系统对外提供服务时的数据

/tmp
→ 短期临时数据

/usr
→ 系统软件、库和共享资源

/var
→ 持续变化的动态数据
```

其中最值得优先记住的是：

```text
/etc
→ 配置

/usr
→ 软件

/var
→ 动态数据

/home
→ 普通用户数据

/root
→ root 用户数据

/tmp
→ 临时数据

/run
→ 运行时数据

/proc
→ 进程 / 内核运行状态

/sys
→ 设备 / 驱动

/dev
→ 设备文件

/boot
→ 启动文件
```

---

## 从运维角度理解 Linux 文件系统

实际工作中，不需要一开始记住每个目录的所有细节。更重要的是看到一个路径，就能够快速判断它属于什么类型的数据。

例如：

```text
/etc/myapp/
```

首先想到：

```text
配置
```

```text
/var/log/myapp/
```

首先想到：

```text
日志
```

```text
/var/lib/myapp/
```

首先想到：

```text
持久化状态 / 应用数据
```

```text
/opt/myapp/
```

首先想到：

```text
第三方软件
```

```text
/usr/local/myapp/
```

首先想到：

```text
管理员本地安装的软件
```

```text
/tmp/myapp/
```

首先想到：

```text
临时数据
```

```text
/run/myapp/
```

首先想到：

```text
运行时数据
```

```text
/proc/1234/
```

首先想到：

```text
PID 1234 的进程相关信息
```

这种“**看到路径就能判断数据性质**”的能力，比单纯背诵目录名称更重要。

---

## 官方文档

深入学习时，可以优先参考以下资料：

* [Filesystem Hierarchy Standard 3.0](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.pdf)
* [Red Hat Enterprise Linux 文档](https://docs.redhat.com/)
* [Linux Kernel Documentation — proc](https://docs.kernel.org/filesystems/proc.html)
* [Linux Kernel Documentation — sysfs](https://docs.kernel.org/filesystems/sysfs.html)
* [systemd tmpfiles.d](https://www.freedesktop.org/software/systemd/man/latest/tmpfiles.d.html)
