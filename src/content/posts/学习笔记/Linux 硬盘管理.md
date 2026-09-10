---
title: Linux 硬盘管理
published: 2026-09-11
image: ''
tags: [Linux, 硬盘, 文件系统, 运维]
category: 学习笔记
---

> 本文以 **CentOS / RHEL 系 Linux** 为主要环境，从硬盘硬件、块设备、分区表、分区、RAID、LVM、文件系统和挂载等方面理解 Linux 的硬盘管理机制。
>
> 本文重点建立从“物理硬盘”到“Linux 文件系统”的完整认知，并介绍 `lsblk`、`fdisk`、`blkid`、`parted`、`mkfs`、`mount`、LVM 和 RAID 等基础内容。

## 硬盘管理的整体结构

学习 Linux 硬盘管理时，最容易混淆的是：

```text
硬盘
分区表
分区
RAID
LVM
文件系统
挂载点
```

这些并不是同一个概念，而是处于不同层次。

可以先建立一个整体认识：

```text
物理硬盘
    ↓
存储控制器 / 总线
    ↓
Linux 设备驱动
    ↓
块设备
    ↓
分区表 / 分区
    ↓
存储管理层
    ↓
文件系统
    ↓
挂载
    ↓
Linux 目录树
```

其中“存储管理层”并不是固定存在的一层，实际环境可能加入：

```text
RAID
LVM
加密
```

等技术。

例如一块普通硬盘：

```text
/dev/sda
    ↓
/dev/sda1
    ↓
XFS
    ↓
/data
```

也可以是：

```text
/dev/sda
/dev/sdb
    ↓
RAID 1
    ↓
/dev/md0
    ↓
XFS
    ↓
/data
```

还可以是：

```text
/dev/sda
    ↓
LVM PV
    ↓
VG
    ↓
LV
    ↓
XFS
    ↓
/data
```

如果同时使用 RAID 和 LVM，则可能是：

```text
多个硬盘
    ↓
RAID
    ↓
块设备
    ↓
LVM
    ↓
逻辑卷
    ↓
文件系统
    ↓
挂载点
```

因此学习 Linux 存储时，重点不是记住某一条命令，而是理解不同层之间的关系。

---

## HDD 与 SSD

在理解 Linux 如何管理硬盘之前，先了解物理存储设备本身。

常见的本地存储设备主要包括：

```text
机械硬盘 HDD
固态硬盘 SSD
```

两者都可以向 Linux 提供块存储，但底层实现完全不同。

### HDD：机械硬盘

HDD（Hard Disk Drive）通过旋转的磁性盘片保存数据。

内部主要包含：

```text
盘片
磁头
主轴电机
执行机构
控制器
```

可以简单理解为：

```text
盘片旋转
    ↓
磁头移动
    ↓
定位数据位置
    ↓
读取 / 写入
```

传统 HDD 的访问存在明显的机械寻址过程。

主要延迟来自：

```text
寻道
+
旋转等待
+
数据传输
```

因此随机访问通常比顺序访问更慢。

例如：

```text
连续读取大量数据
→ 更容易发挥顺序吞吐能力

大量随机读取小数据
→ 机械寻道带来较明显的延迟
```

### SSD：固态硬盘

SSD（Solid State Drive）没有机械盘片和磁头，而是使用 NAND Flash 保存数据。

通常具有：

```text
无机械运动部件
随机访问延迟较低
并行访问能力较强
```

SSD 内部也不是简单地把 NAND Flash 直接暴露给操作系统。

通常还存在：

```text
主控
    ↓
Flash Translation Layer（FTL）
    ↓
NAND Flash
```

FTL 负责将操作系统看到的逻辑地址映射到底层 NAND 的物理位置。

因此 Linux 通常看到的是：

```text
逻辑块地址空间
```

而不是 NAND Flash 的具体物理页和擦除块。

### SSD 为什么需要垃圾回收和磨损均衡？

NAND Flash 的写入机制并不是简单的：

```text
覆盖旧数据
→ 写入新数据
```

SSD 控制器通常还要处理：

```text
地址映射
垃圾回收
磨损均衡
坏块管理
```

因此：

```text
操作系统
→ 面对块设备

SSD 主控
→ 管理 NAND Flash 的具体物理细节
```

这种抽象使 Linux 可以用统一的块设备接口管理 HDD、SATA SSD 和 NVMe SSD。

Linux 内核的块设备层也针对现代 SSD / NVMe 的高并行 I/O 能力提供了多队列机制。([Linux Kernel - blk-mq](https://docs.kernel.org/block/blk-mq.html))

---

## SATA、SAS 与 NVMe

常见的存储接口或协议包括：

```text
SATA
SAS
NVMe
```

### SATA

SATA 是常见的存储接口。

典型设备：

```text
SATA HDD
SATA SSD
```

Linux 中可能看到：

```text
/dev/sda
/dev/sdb
```

等设备。

### SAS

SAS（Serial Attached SCSI）主要应用于服务器和企业级存储环境。

常见于：

```text
服务器
存储阵列
企业级磁盘
```

### NVMe

NVMe 是面向非易失性存储设计的协议，通常通过 PCIe 连接。

典型 NVMe SSD 在 Linux 中可能显示为：

```text
/dev/nvme0n1
```

其分区可能是：

```text
/dev/nvme0n1p1
/dev/nvme0n1p2
```

与传统：

```text
/dev/sda
/dev/sda1
```

相比，NVMe 的命名方式不同。

可以简单理解为：

```text
SATA SSD

CPU
 ↓
SATA
 ↓
SSD


NVMe SSD

CPU
 ↓
PCIe
 ↓
NVMe SSD
```

实际硬件拓扑会更加复杂，但这个模型足以帮助理解 Linux 中不同设备名称的来源。

---

## Linux 如何管理硬盘

Linux 并不会直接让应用程序操作硬盘的物理结构。

中间存在多个抽象层，可以简化为：

```text
应用程序
    ↓
系统调用
    ↓
VFS
    ↓
文件系统
    ↓
块设备层
    ↓
设备驱动
    ↓
存储控制器
    ↓
硬盘
```

### VFS

VFS（Virtual File System）是 Linux 内核中的虚拟文件系统层。

它向上提供统一的文件访问接口。

例如应用程序执行：

```text
open()
read()
write()
```

不需要直接知道底层使用的是：

```text
XFS
ext4
```

还是其他文件系统。

VFS 将不同文件系统统一到 Linux 的文件访问模型中。([Linux Kernel - VFS](https://docs.kernel.org/filesystems/vfs.html))

### 块设备

硬盘属于典型的**块设备（Block Device）**。

Linux 中常见：

```text
/dev/sda
/dev/sdb
/dev/nvme0n1
```

都是块设备。

可以使用：

```bash
lsblk
```

查看。

例如：

```text
NAME        SIZE TYPE MOUNTPOINTS
sda         500G disk
├─sda1        1G part /boot
└─sda2      499G part /
```

这里：

```text
disk
→ 整块磁盘

part
→ 磁盘分区
```

---

## 硬盘、分区表、分区和文件系统

这几个概念必须明确区分。

### 硬盘

硬盘是实际的存储设备。

例如：

```text
/dev/sda
/dev/nvme0n1
```

代表 Linux 看到的块设备。

### 分区表

分区表描述：

```text
这块硬盘应该如何划分
```

例如：

```text
/dev/sda

┌──────────────────────────────┐
│        Partition Table       │
├──────────┬────────┬──────────┤
│  sda1    │  sda2  │  sda3    │
└──────────┴────────┴──────────┘
```

常见分区表：

```text
MBR
GPT
```

### 分区

分区是硬盘上的一个逻辑区域。

例如：

```text
/dev/sda1
/dev/sda2
/dev/sda3
```

一个分区可以：

```text
建立文件系统
```

也可以作为：

```text
LVM
RAID
```

等存储管理层的底层设备。

### 文件系统

文件系统负责组织：

```text
文件
目录
元数据
数据块
```

常见 Linux 文件系统：

```text
XFS
ext4
```

例如：

```bash
mkfs.xfs /dev/sda2
```

表示在 `/dev/sda2` 上创建 XFS 文件系统。

需要特别注意：

```text
分区
≠
文件系统
```

例如：

```text
硬盘
 ↓
分区
 ↓
文件系统
 ↓
挂载
```

这四个步骤是不同的事情。

---

## MBR 与 GPT

分区表决定了硬盘上的分区如何描述。

### MBR

MBR（Master Boot Record）是较早使用的分区方案。

传统 MBR 支持：

```text
主分区
扩展分区
逻辑分区
```

传统情况下最多可以直接定义：

```text
4 个主分区
```

如果需要更多分区，可以使用：

```text
扩展分区
    ↓
逻辑分区
```

传统 MBR 在典型 512 字节扇区模型下存在约 2 TiB 的地址范围限制。

### GPT

GPT（GUID Partition Table）是现代系统中更常见的分区表方案。

相较于传统 MBR，GPT：

```text
支持更大的磁盘
支持更多分区
使用 GUID 标识分区
具有备份分区表结构
```

UEFI 系统通常与 GPT 配合使用。

可以简单理解：

```text
传统环境
→ MBR + BIOS

现代环境
→ GPT + UEFI
```

但两者并不是绝对绑定关系。

参考：[RHEL 9 - Managing storage devices](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/)

---

## 查看硬盘和分区

最常用的几个命令：

```text
lsblk
fdisk
blkid
parted
```

### `lsblk`：查看块设备结构

```bash
lsblk
```

这是日常查看硬盘结构最直观的命令。

例如：

```text
NAME        SIZE TYPE MOUNTPOINTS
sda         500G disk
├─sda1        1G part /boot
└─sda2      499G part /
```

查看文件系统信息：

```bash
lsblk --fs
```

可以直接看到：

```text
设备
文件系统
UUID
挂载点
```

### `fdisk -l`：查看分区信息

```bash
fdisk -l
```

可以查看：

```text
磁盘容量
分区起始位置
分区结束位置
扇区数量
分区类型
```

它比较适合分析分区表的具体布局。

### `blkid`：查看 UUID 和文件系统

```bash
blkid
```

例如：

```text
/dev/sda1: UUID="xxxx-xxxx" TYPE="xfs"
/dev/sda2: UUID="yyyy-yyyy" TYPE="xfs"
```

主要用于确认：

```text
UUID
LABEL
文件系统类型
```

### `parted -l`：查看分区表

```bash
parted -l
```

可以看到：

```text
磁盘
分区表类型
分区
分区大小
```

例如：

```text
Partition Table: gpt
```

表示使用 GPT。

因此：

```text
lsblk
→ 直观看设备层级

fdisk -l
→ 查看详细分区信息

blkid
→ 查看 UUID / 文件系统

parted -l
→ 查看分区表和分区结构
```

参考：

[lsblk(8)](https://man7.org/linux/man-pages/man8/lsblk.8.html)

[fdisk(8)](https://man7.org/linux/man-pages/man8/fdisk.8.html)

[blkid(8)](https://man7.org/linux/man-pages/man8/blkid.8.html)

[parted(8)](https://man7.org/linux/man-pages/man8/parted.8.html)

---

## 创建分区

磁盘分区可以使用：

```text
fdisk
parted
```

### `fdisk`

例如：

```bash
fdisk /dev/sdb
```

进入交互界面后，可以使用：

```text
m
→ 查看帮助

p
→ 查看当前分区表

n
→ 创建分区

d
→ 删除分区

t
→ 修改分区类型

w
→ 保存并退出

q
→ 不保存退出
```

### `parted`

进入：

```bash
parted /dev/sdb
```

查看：

```bash
parted -l
```

创建 GPT：

```bash
parted /dev/sdb mklabel gpt
```

创建分区：

```bash
parted /dev/sdb mkpart primary xfs 1MiB 100%
```

这些操作会修改硬盘上的分区信息。

因此在实际服务器上执行前，必须确认：

```text
目标硬盘
现有分区
现有数据
备份情况
```

**不要在包含重要数据的硬盘上直接执行分区表修改操作。**

参考：[RHEL 9 - Creating partitions](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-partitions_managing-storage-devices)

---

## RAID 磁盘阵列

RAID（Redundant Array of Independent Disks）可以把多个存储设备组织成一个阵列。

主要目的包括：

```text
提高性能
提供冗余
提高可用性
```

具体能获得什么能力，取决于 RAID 类型。

Linux 中可以使用：

```text
软件 RAID
硬件 RAID
```

两种方式。

### 硬件 RAID

硬件 RAID 由独立的 RAID 控制器管理。

对于操作系统来说，RAID 控制器通常会把整个阵列呈现成普通块设备。

可以理解为：

```text
多个硬盘
    ↓
RAID 控制器
    ↓
Linux
    ↓
/dev/sda
```

Linux 不一定需要直接知道后面到底有多少块物理硬盘。

### 软件 RAID

Linux 可以通过 `mdraid` 实现软件 RAID。

RHEL 中的软件 RAID 主要通过：

```text
mdraid
```

子系统实现，并使用：

```bash
mdadm
```

进行管理。([RHEL 9 - Managing RAID](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices))

注意：

> `mdadm` 通常需要额外安装，因此它属于软件 RAID 工具，而不是最基础的文件系统命令。

### RAID 0

RAID 0 使用：

```text
Striping
→ 条带化
```

将数据分散到多个磁盘。

例如：

```text
数据

A1 A2 A3 A4
↓  ↓  ↓  ↓

Disk 1 → A1 A3
Disk 2 → A2 A4
```

主要特点：

```text
性能提高
容量可以利用多个磁盘
没有数据冗余
```

因此：

```text
任何一块磁盘损坏
→ 整个阵列的数据可能无法恢复
```

RAID 0 不能提供容错能力。

### RAID 1

RAID 1 使用：

```text
Mirroring
→ 镜像
```

将相同数据写入多个磁盘。

例如：

```text
数据 A
  ↓
┌───────┐
│       │
Disk 1  Disk 2
  A       A
```

特点：

```text
有冗余
一块磁盘损坏时仍可继续访问数据
可用容量低于所有磁盘容量之和
```

典型的两盘 RAID 1：

```text
2 × 1 TB
→ 可用容量约 1 TB
```

### RAID 5

RAID 5 使用：

```text
数据条带化
+
分布式奇偶校验
```

例如：

```text
Disk 1   Disk 2   Disk 3
  A1       A2       P1
  A3       P2       A4
  P3       A5       A6
```

奇偶校验数据分布在不同磁盘上。

RAID 5 可以在：

```text
单块磁盘损坏
```

的情况下通过剩余数据和奇偶校验重建。

通常至少需要：

```text
3 块磁盘
```

### RAID 6

RAID 6 与 RAID 5 类似，但使用两组独立的奇偶校验。

因此可以容忍：

```text
同时损坏 2 块磁盘
```

通常至少需要：

```text
4 块磁盘
```

代价是：

```text
更多容量用于校验
写入开销更高
```

### RAID 10

RAID 10 可以理解为：

```text
RAID 1
+
RAID 0
```

先做镜像，再进行条带化。

例如：

```text
      RAID 0
     /      \
  RAID 1   RAID 1
   / \       / \
 Disk Disk  Disk Disk
```

特点：

```text
较好的随机 I/O 性能
具有磁盘冗余
容量利用率通常约为 50%
```

通常至少需要：

```text
4 块磁盘
```

### 常见 RAID 对比

```text
RAID 0
→ 条带化
→ 高性能
→ 无冗余

RAID 1
→ 镜像
→ 冗余
→ 容量利用率较低

RAID 5
→ 条带化 + 单校验
→ 可容忍 1 块磁盘故障

RAID 6
→ 条带化 + 双校验
→ 可容忍 2 块磁盘故障

RAID 10
→ 镜像 + 条带化
→ 性能与冗余兼顾
```

RAID 并不等于备份。

例如：

```text
RAID 1
```

可以在一块磁盘故障时继续工作，但如果：

```text
误删除文件
文件被恶意加密
应用写入错误数据
```

RAID 通常也会把这些变化同步到其他副本。

因此：

```text
RAID
→ 提供冗余 / 可用性

备份
→ 提供数据恢复能力
```

两者不是同一个概念。

### 创建软件 RAID

假设有：

```text
/dev/sdb1
/dev/sdc1
```

可以使用 `mdadm` 创建 RAID 1：

```bash
mdadm --create /dev/md0 \
      --level=1 \
      --raid-devices=2 \
      /dev/sdb1 /dev/sdc1
```

查看：

```bash
mdadm --detail /dev/md0
```

查看内核中的阵列状态：

```bash
cat /proc/mdstat
```

最终可以得到：

```text
/dev/sdb1
/dev/sdc1
    ↓
RAID 1
    ↓
/dev/md0
```

然后可以在 `/dev/md0` 上创建文件系统：

```bash
mkfs.xfs /dev/md0
```

这说明 RAID 本身仍然不是文件系统。

它提供的是一个新的块设备：

```text
物理磁盘
   ↓
RAID
   ↓
/dev/md0
```

参考：[RHEL 9 - Managing RAID](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices)

---

## LVM 逻辑卷

LVM（Logical Volume Manager）用于更加灵活地管理块存储。

传统分区通常是：

```text
硬盘
 ↓
分区
 ↓
文件系统
```

例如：

```text
/dev/sda2
    ↓
XFS
    ↓
/
```

LVM 则在中间增加了一层抽象：

```text
物理存储
    ↓
PV
    ↓
VG
    ↓
LV
    ↓
文件系统
    ↓
挂载点
```

### PV：Physical Volume

PV（Physical Volume）是 LVM 使用的物理存储单元。

它可以是：

```text
整块磁盘
```

也可以是：

```text
磁盘分区
```

例如：

```bash
pvcreate /dev/sdb
```

或者：

```bash
pvcreate /dev/sdb1
```

初始化后：

```text
/dev/sdb
    ↓
PV
```

### VG：Volume Group

VG（Volume Group）可以理解为：

```text
LVM 的存储池
```

多个 PV 可以加入同一个 VG：

```text
/dev/sdb
    ↓
PV ─┐
    │
/dev/sdc
    ↓
PV ─┤
    ↓
   VG
```

例如：

```bash
vgcreate vgdata /dev/sdb /dev/sdc
```

于是：

```text
PV + PV
  ↓
 VG
```

VG 中的空间可以继续划分成多个 LV。

### LV：Logical Volume

LV（Logical Volume）是从 VG 中分配出来的逻辑卷。

例如：

```bash
lvcreate -L 50G -n lvdata vgdata
```

得到：

```text
VG
 ↓
LV
 ↓
/dev/vgdata/lvdata
```

可以把 LV 理解成：

```text
一个可供操作系统使用的逻辑块设备
```

然后创建文件系统：

```bash
mkfs.xfs /dev/vgdata/lvdata
```

再挂载：

```bash
mkdir /data
mount /dev/vgdata/lvdata /data
```

完整流程：

```text
/dev/sdb
/dev/sdc
   ↓
  PV
   ↓
  VG
   ↓
  LV
   ↓
 XFS
   ↓
 /data
```

### LVM 为什么有用？

传统分区：

```text
/dev/sda1 → 100G
/dev/sda2 → 100G
```

一旦容量划分完成，后续调整可能比较麻烦。

LVM 则可以把多个物理存储加入一个 VG：

```text
PV1 ─┐
PV2 ─┼→ VG
PV3 ─┘
```

然后从 VG 中按需要创建：

```text
LV1
LV2
LV3
```

因此 LVM 可以：

```text
跨多个物理卷组织空间
动态扩展逻辑卷
重新分配存储空间
创建快照
```

RHEL 官方文档将 LVM 的主要组成部分定义为 PV、VG 和 LV，并支持在多个 PV 之间分配和管理逻辑卷。([RHEL 9 - LVM](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/))

### 查看 LVM

查看 PV：

```bash
pvs
```

查看 VG：

```bash
vgs
```

查看 LV：

```bash
lvs
```

也可以使用：

```bash
lsblk
```

观察 LVM 与底层块设备之间的层级关系。

例如：

```text
sdb
└─vgdata-lvdata
```

### 扩展逻辑卷

假设 VG 中还有空闲空间：

```bash
lvextend -L +20G /dev/vgdata/lvdata
```

表示：

```text
LV
+
20G
```

但要注意：

> 扩大 LV 不一定等于文件系统已经扩大。

逻辑卷和文件系统属于不同层次：

```text
LV
 ↓
文件系统
```

因此扩展之后，通常还需要根据文件系统类型执行对应的扩容操作。

例如 XFS：

```bash
xfs_growfs /data
```

ext4：

```bash
resize2fs /dev/vgdata/lvdata
```

因此：

```text
lvextend
→ 扩展逻辑卷

xfs_growfs / resize2fs
→ 扩展文件系统
```

两者不要混为一谈。

### LVM 快照

LVM 还支持快照。

快照可以理解为：

```text
某一时刻的逻辑卷状态
```

例如：

```text
原 LV
 ↓
创建 Snapshot
```

之后原 LV 发生变化时，LVM 可以利用写时复制（Copy-on-Write）机制保存快照所需要的数据状态。

常见用途包括：

```text
临时备份点
升级前保存状态
测试
```

但是：

> LVM Snapshot 不是传统意义上的长期备份。

快照本身仍然依赖底层存储，如果原有存储发生严重故障，快照也可能受到影响。

RHEL 官方文档说明 LVM 快照保存的是逻辑卷创建快照时的时间点状态，并采用 Copy-on-Write 机制跟踪变化。([RHEL 9 - LVM snapshots](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/advanced-logical-volume-management_configuring-and-managing-logical-volumes))

---

## 文件系统

经过分区、RAID 或 LVM 后，最终通常需要在某个块设备上创建文件系统。

常见文件系统：

```text
XFS
ext4
```

RHEL 9 中 XFS 是默认文件系统，ext4 也得到支持。([RHEL 9 - Available file systems](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/overview-of-available-storage-options_managing-storage-devices))

### `mkfs`：创建文件系统

XFS：

```bash
mkfs.xfs /dev/sdb1
```

ext4：

```bash
mkfs.ext4 /dev/sdb1
```

如果使用 LVM：

```bash
mkfs.xfs /dev/vgdata/lvdata
```

如果使用 RAID：

```bash
mkfs.xfs /dev/md0
```

因此：

```text
分区
→ 可以建立文件系统

RAID
→ 可以提供块设备

LVM LV
→ 可以提供逻辑块设备

最终都可以成为文件系统的底层设备
```

### 文件系统负责什么？

文件系统负责组织：

```text
文件
目录
元数据
数据块
```

例如：

```text
/data/app.log
```

并不直接对应“硬盘上的某个固定位置”。

文件系统通过自己的数据结构管理：

```text
文件名
文件元数据
数据块
目录关系
```

因此：

```text
硬盘
→ 提供存储介质

RAID / LVM / 分区
→ 提供和组织块空间

文件系统
→ 在块空间中组织文件和目录
```

---

## 挂载文件系统

Linux 不使用：

```text
C:
D:
E:
```

这种盘符体系。

Linux 将文件系统挂载到统一的目录树中。

例如：

```text
/dev/sdb1
    ↓
XFS
    ↓
/data
```

之后：

```bash
cd /data
```

就可以访问这个文件系统中的内容。

### `mount`：挂载文件系统

创建挂载点：

```bash
mkdir /data
```

挂载：

```bash
mount /dev/sdb1 /data
```

指定文件系统：

```bash
mount -t xfs /dev/sdb1 /data
```

也可以使用 UUID：

```bash
mount UUID=xxxx-xxxx /data
```

### `umount`：卸载文件系统

```bash
umount /data
```

或者：

```bash
umount /dev/sdb1
```

如果出现：

```text
target is busy
```

通常说明仍有进程正在使用这个文件系统。

例如：

```text
进程
 ↓
/data/app.log
 ↓
/data
```

此时需要先处理相关进程或工作目录，再卸载文件系统。

参考：

[mount(8)](https://man7.org/linux/man-pages/man8/mount.8.html)

[umount(8)](https://man7.org/linux/man-pages/man8/umount.8.html)

---

## `/etc/fstab`：持久化挂载

直接执行：

```bash
mount /dev/sdb1 /data
```

通常只建立当前运行状态下的挂载关系。

系统重启后，需要重新挂载。

因此 Linux 通常使用：

```text
/etc/fstab
```

保存持久化挂载配置。

例如：

```text
UUID=xxxx-xxxx  /data  xfs  defaults  0  0
```

可以拆成：

```text
UUID=xxxx-xxxx
→ 文件系统标识

/data
→ 挂载点

xfs
→ 文件系统类型

defaults
→ 挂载选项

0
→ dump 相关字段

0
→ fsck 检查顺序
```

使用 UUID 的一个重要原因是：

```text
/dev/sda1
```

这样的设备名称并不是最稳定的持久化标识，而 UUID 可以用于更加稳定地识别文件系统。

参考：[RHEL 9 - Persistently mounting file systems](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_persistently-mounting-file-systems_managing-file-systems)

---

## inode 与硬盘空间

Linux 文件系统不仅管理：

```text
磁盘容量
```

还需要管理：

```text
inode
```

inode 用于保存文件的元数据，例如：

```text
文件类型
权限
所有者
时间
数据块信息
```

因此可能出现：

```text
硬盘还有空间

但是 inode 已经耗尽
```

例如大量创建很小的文件：

```text
/tmp
├── file1
├── file2
├── file3
├── ...
└── file10000000
```

可能使 inode 大量消耗。

查看 inode 使用情况：

```bash
df -i
```

因此排查磁盘问题时不能只看：

```bash
df -h
```

还要知道：

```bash
df -i
```

---

## 硬盘空间与 I/O

硬盘管理除了：

```text
容量
分区
文件系统
挂载
```

还需要关注：

```text
I/O 性能
```

常见指标：

```text
IOPS
→ 每秒 I/O 操作次数

吞吐量
→ 单位时间传输的数据量

延迟
→ 一次 I/O 完成所需要的时间
```

不同业务关注点不同。

例如：

```text
大文件连续读写
→ 更关注吞吐量

大量随机小 I/O
→ 更关注 IOPS 和延迟
```

HDD 的机械结构使其随机访问受到明显的寻道和旋转等待影响，而 SSD / NVMe 没有这些机械运动部件，并且可以提供更高的并行 I/O 能力。Linux 内核的块设备层也针对现代存储设备提供了多队列 I/O 机制。([Linux Kernel - blk-mq](https://docs.kernel.org/block/blk-mq.html))

后续如果需要进行性能分析，可以继续学习：

```text
iostat
iotop
sar
```

这些属于系统性能监控工具，这里不展开。

---

## `df` 与 `du`

实际运维中，最常用的磁盘空间检查命令之一是：

```bash
df -h
```

它主要回答：

```text
这个文件系统还剩多少空间？
```

而：

```bash
du -sh /var/log
```

主要回答：

```text
这个目录中的文件占用了多少空间？
```

因此：

```text
df
→ 文件系统层面的空间

du
→ 文件 / 目录层面的空间
```

例如：

```text
df
→ /
→ 使用率 95%

du
→ /var
→ 找到日志目录占用大量空间

继续排查
→ 日志
→ 缓存
→ 数据文件
→ 临时文件
```

---

## 一次完整的硬盘初始化流程

假设服务器中新加入一块：

```text
/dev/sdb
```

最简单的方式：

```text
/dev/sdb
    ↓
创建 GPT
    ↓
创建分区
/dev/sdb1
    ↓
创建 XFS
    ↓
挂载到 /data
```

如果采用 LVM：

```text
/dev/sdb
    ↓
PV
    ↓
VG
    ↓
LV
    ↓
XFS
    ↓
/data
```

如果采用软件 RAID：

```text
/dev/sdb1
/dev/sdc1
    ↓
RAID 1
    ↓
/dev/md0
    ↓
XFS
    ↓
/data
```

如果同时使用 RAID 和 LVM：

```text
/dev/sdb
/dev/sdc
/dev/sdd
/dev/sde
    ↓
RAID
    ↓
/dev/md0
    ↓
LVM PV
    ↓
VG
    ↓
LV
    ↓
XFS
    ↓
/data
```

这也是实际服务器存储架构中经常出现的组合。

---

## 常见存储层次

将整篇文章串起来，可以得到：

```text
物理硬盘
    │
    ├── HDD
    ├── SATA SSD
    └── NVMe SSD
    │
    ↓
块设备
    │
    ├── /dev/sda
    ├── /dev/sdb
    └── /dev/nvme0n1
    │
    ↓
分区表
    │
    ├── MBR
    └── GPT
    │
    ↓
分区
    │
    ├── /dev/sda1
    └── /dev/sda2
    │
    ↓
可选存储层
    │
    ├── RAID
    ├── LVM
    └── 其他存储管理层
    │
    ↓
文件系统
    │
    ├── XFS
    └── ext4
    │
    ↓
挂载
    │
    ↓
目录
```

其中 RAID 和 LVM 并不是固定的先后关系。

例如：

```text
硬盘
↓
RAID
↓
LVM
↓
文件系统
```

也可以：

```text
硬盘
↓
LVM
↓
文件系统
```

还可以直接：

```text
硬盘
↓
分区
↓
文件系统
```

因此看到一个实际服务器时，应该使用：

```bash
lsblk
```

从设备层级开始观察，而不是看到 `/data` 就直接认为它对应某一个物理硬盘。

---

## 官方文档

深入学习 Linux 硬盘与存储管理时，可以优先参考：

* [RHEL 9 - Managing storage devices](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/)
* [RHEL 9 - Configuring and managing logical volumes](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/)
* [Linux Kernel - VFS](https://docs.kernel.org/filesystems/vfs.html)
* [Linux Kernel - Block Layer](https://www.kernel.org/doc/html/latest/block/index.html)
* [Linux Kernel - blk-mq](https://docs.kernel.org/block/blk-mq.html)
* [Linux `lsblk(8)`](https://man7.org/linux/man-pages/man8/lsblk.8.html)
* [Linux `fdisk(8)`](https://man7.org/linux/man-pages/man8/fdisk.8.html)
* [Linux `blkid(8)`](https://man7.org/linux/man-pages/man8/blkid.8.html)
* [Linux `mount(8)`](https://man7.org/linux/man-pages/man8/mount.8.html)
