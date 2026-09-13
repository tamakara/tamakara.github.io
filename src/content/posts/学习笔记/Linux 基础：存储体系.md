---
title: Linux 基础：存储体系
published: 2026-09-13T06:43:25Z
description: ''
image: ''
tags: [Linux, 存储, 磁盘, 文件系统, LVM, RAID, 运维]
category: 学习笔记
draft: false 
lang: ''
---

> Linux 中的“磁盘”并不是一个单独的概念。
>
> 从物理硬盘到应用真正看到的文件，中间可能经过 **存储接口、块设备、分区表、分区、RAID、LVM、文件系统和挂载** 等多个层次。
>
> 如果不理解这些层次，遇到“磁盘满了”“文件系统只读”“挂载失败”“LVM 扩容后空间没增加”“RAID 降级”等问题时，很容易只会执行命令，却不知道问题到底发生在哪一层。
>
> 本文从物理存储开始，建立一套 Linux 存储体系，并进一步介绍 **HDD / SSD、SATA / SAS / NVMe、Block Device、MBR / GPT、UEFI、ext4 / XFS、mount / fstab / UUID、inode、LVM、RAID、扩容与故障排查**。

# Linux 存储体系

学习 Linux 存储时，最容易混淆的是：

```text
硬盘
分区表
分区
RAID
LVM
文件系统
挂载点
```

这些并不是同一个概念，而是位于不同层次。

可以先建立一个整体模型：

```text
物理存储设备
       │
       ▼
存储控制器 / 总线
       │
       ▼
Linux 设备驱动
       │
       ▼
块设备
       │
       ├── 分区表
       │      ↓
       │    分区
       │
       ├── RAID
       │
       └── LVM
              │
              ▼
          块设备 / 逻辑卷
              │
              ▼
          文件系统
              │
              ▼
             挂载
              │
              ▼
          Linux 目录树
```

这里并不存在一条所有服务器都完全相同的路径。

例如最简单的情况：

```text
/dev/sda
   ↓
/dev/sda1
   ↓
XFS
   ↓
/data
```

也可能是：

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

甚至：

```text
多个硬盘
   ↓
RAID
   ↓
RAID 块设备
   ↓
LVM
   ↓
LV
   ↓
文件系统
   ↓
挂载点
```

因此学习 Linux 存储时，最重要的不是记住某一套固定命令，而是知道：

> **当前这个问题发生在哪一层。**

---

# HDD、SSD 与存储介质

## HDD：机械硬盘

HDD（Hard Disk Drive）使用旋转磁盘保存数据。

内部主要包含：

```text
盘片
磁头
主轴电机
执行机构
控制器
```

数据访问大致经历：

```text
盘片旋转
   ↓
磁头移动
   ↓
定位数据
   ↓
读取 / 写入
```

因此 HDD 的访问性能会受到：

```text
寻道时间
+
旋转等待
+
数据传输
```

等因素影响。

这也是为什么机械硬盘：

```text
顺序 I/O
```

通常比：

```text
大量随机小 I/O
```

更容易发挥性能。

例如：

```text
连续读取 1 GB 大文件
↓
较适合 HDD

随机读取大量小文件
↓
磁头频繁移动
↓
延迟明显增加
```

---

## SSD：固态硬盘

SSD（Solid State Drive）使用：

> **NAND Flash**

保存数据。

与 HDD 相比：

```text
没有机械磁头
没有旋转盘片
随机访问延迟更低
```

不过 SSD 并不是简单地把 NAND Flash 直接暴露给操作系统。

内部通常包含：

```text
主控
   ↓
FTL
   ↓
NAND Flash
```

FTL：

> **Flash Translation Layer**

负责将操作系统看到的逻辑块地址映射到底层 NAND 的物理位置。

因此 Linux 通常面对的是：

```text
逻辑块地址
```

而不是：

```text
NAND 物理页
NAND 擦除块
```

SSD 主控还需要处理：

```text
地址映射
垃圾回收
磨损均衡
坏块管理
```

因此：

> 操作系统看到的“块设备”，已经是一个高度抽象化的存储接口。

---

# SATA、SAS 与 NVMe

这些名称经常一起出现，但它们并不完全属于同一层面的概念。

## SATA

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

---

## SAS

SAS：

> **Serial Attached SCSI**

主要用于：

```text
服务器
企业级存储
磁盘阵列
```

等环境。

它面向企业级存储场景，具有较强的可靠性和管理能力。

---

## NVMe

NVMe：

> **Non-Volatile Memory Express**

是一套面向非易失性存储设计的协议，现代 NVMe SSD 通常通过 PCIe 与系统连接。

典型 Linux 设备：

```text
/dev/nvme0n1
```

分区：

```text
/dev/nvme0n1p1
/dev/nvme0n1p2
```

与传统 SATA 设备：

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
```

而：

```text
NVMe SSD
CPU
 ↓
PCIe
 ↓
NVMe
 ↓
SSD
```

实际硬件拓扑会复杂得多，但这个模型足以帮助理解常见设备名称。

Linux 内核的块设备层还提供多队列 I/O 机制，以适应现代存储设备的高并行 I/O。参考：[Linux Kernel Block Layer / blk-mq](https://docs.kernel.org/block/blk-mq.html)。

---

# Block Device：块设备

## 什么是块设备

硬盘在 Linux 中属于典型的：

> **块设备（Block Device）**

例如：

```text
/dev/sda
/dev/sdb
/dev/nvme0n1
```

这些设备允许系统以“块”为单位进行数据访问。

可以简单理解：

```text
应用程序
   ↓
文件系统
   ↓
块设备
   ↓
存储设备
```

这里：

```text
/dev/sda
```

代表的是 Linux 看到的整个块设备。

而：

```text
/dev/sda1
```

则可能是它的一个分区。

---

## `lsblk`

查看块设备结构最常用的工具之一：

```bash
lsblk
```

例如：

```text
NAME        SIZE TYPE MOUNTPOINTS
sda         500G disk
├─sda1        1G part /boot
└─sda2      499G part /
```

其中：

```text
disk
↓
整块磁盘

part
↓
分区
```

如果存在 LVM 或 RAID，还可能看到：

```text
sda
└─sda2
   └─vgdata-lvdata
```

或者：

```text
sda
└─sda1
   └─md0
```

因此：

> `lsblk` 是观察 Linux 存储层级非常重要的入口命令。

参考：[lsblk(8)](https://man7.org/linux/man-pages/man8/lsblk.8.html)。

---

# 分区表、分区与文件系统

这三个概念必须明确区分。

```text
磁盘
 ↓
分区表
 ↓
分区
 ↓
文件系统
```

## 分区表

分区表用于描述：

> **一块磁盘应该如何被划分。**

例如：

```text
/dev/sda

┌──────────────────────────────┐
│        Partition Table       │
├──────────┬────────┬──────────┤
│   sda1   │  sda2  │  sda3    │
└──────────┴────────┴──────────┘
```

常见分区表：

```text
MBR
GPT
```

---

## 分区

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

也可以成为：

```text
RAID 的成员设备
LVM 的 PV
```

因此：

> **分区不等于文件系统。**

---

## 文件系统

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
mkfs.xfs /dev/sdb1
```

表示：

> 在 `/dev/sdb1` 上创建 XFS 文件系统。

最终关系：

```text
磁盘
 ↓
分区
 ↓
文件系统
 ↓
挂载点
```

---

# MBR 与 GPT

## MBR

MBR：

> **Master Boot Record**

属于较早的分区方案。

传统 MBR 分区结构中包括：

```text
主分区
扩展分区
逻辑分区
```

传统情况下最多可以直接定义：

```text
4 个主分区
```

需要更多分区时，可以：

```text
扩展分区
   ↓
逻辑分区
```

传统 512-byte sector 模型下，MBR 通常受到约：

```text
2 TiB
```

的寻址限制。

---

## GPT

GPT：

> **GUID Partition Table**

是现代系统中更常见的分区表方案。

相较于传统 MBR：

```text
支持更大的磁盘
支持更多分区
使用 GUID 标识分区
具有备份分区表结构
```

现代 UEFI 系统通常与 GPT 配合使用。

常见组合：

```text
传统环境
↓
BIOS + MBR

现代环境
↓
UEFI + GPT
```

但二者并不是绝对绑定关系。

也就是说：

```text
UEFI
≠
必须 GPT

BIOS
≠
必须 MBR
```

实际启动方式还取决于固件和操作系统配置。

---

# UEFI

UEFI：

> **Unified Extensible Firmware Interface**

是现代计算机系统中常见的固件接口标准，用于替代传统 BIOS 固件接口中的很多功能。

启动过程可以粗略理解为：

```text
开机
 ↓
UEFI 固件
 ↓
寻找启动项
 ↓
启动 Bootloader
 ↓
Linux Kernel
 ↓
系统启动
```

在 Linux 安装环境中，UEFI 系统通常会存在：

```text
EFI System Partition
```

即：

> **ESP**

它通常使用：

```text
FAT32
```

等文件系统，并保存 EFI 启动相关文件。

因此不要把：

```text
EFI System Partition
```

和：

```text
Linux Root Filesystem
```

混为一谈。

---

# 查看磁盘和分区

常见工具：

```text
lsblk
fdisk
blkid
parted
```

## `lsblk`

```bash
lsblk
```

查看设备层级。

查看文件系统信息：

```bash
lsblk --fs
```

可以同时看到：

```text
设备
文件系统
UUID
挂载点
```

---

## `fdisk`

查看分区：

```bash
fdisk -l
```

可以看到：

```text
磁盘容量
分区起始位置
分区结束位置
扇区
分区类型
```

进入交互模式：

```bash
fdisk /dev/sdb
```

常见操作：

```text
p
↓
查看分区表

n
↓
创建分区

d
↓
删除分区

t
↓
修改分区类型

w
↓
保存并退出

q
↓
退出不保存
```

修改分区表是高风险操作。

> **在生产环境中执行 `fdisk`、`parted` 等分区操作前，必须确认目标设备和备份情况。**

---

## `parted`

查看：

```bash
parted -l
```

进入：

```bash
parted /dev/sdb
```

创建 GPT：

```bash
parted /dev/sdb mklabel gpt
```

创建分区：

```bash
parted /dev/sdb mkpart primary xfs 1MiB 100%
```

这些操作会直接修改磁盘上的分区结构。

---

## `blkid`

查看文件系统标识：

```bash
blkid
```

例如：

```text
/dev/sdb1: UUID="xxxx-xxxx" TYPE="xfs"
```

可以查看：

```text
UUID
LABEL
文件系统类型
```

因此：

```text
lsblk
↓
看设备层级

fdisk
↓
看分区

parted
↓
看 / 修改分区表

blkid
↓
看 UUID 和文件系统
```

---

# RAID

RAID：

> **Redundant Array of Independent Disks**

用于将多个存储设备组织成一个阵列。

主要目标可能包括：

```text
性能
冗余
可用性
```

不同 RAID 级别的能力不同。

需要特别注意：

> **RAID 不是备份。**

---

## 硬件 RAID

硬件 RAID 通常由：

> **RAID 控制器**

负责管理。

可以简化为：

```text
多个硬盘
   ↓
RAID 控制器
   ↓
Linux
   ↓
块设备
```

对于操作系统来说，控制器通常会把整个阵列呈现为一个或多个逻辑块设备。

Linux 不一定直接感知后面的物理磁盘数量。

---

## 软件 RAID

Linux 可以通过：

> **mdraid**

实现软件 RAID。

常用管理工具：

```text
mdadm
```

可以理解为：

```text
多个磁盘
   ↓
mdraid
   ↓
/dev/md0
```

然后：

```text
/dev/md0
   ↓
文件系统
   ↓
挂载
```

`mdadm` 是软件 RAID 的管理工具。

---

# RAID 0

RAID 0：

> **Striping，条带化**

将数据分散到多个磁盘。

例如：

```text
数据：
A1 A2 A3 A4

↓
Disk 1 → A1 A3
Disk 2 → A2 A4
```

优点：

```text
并行 I/O
性能较高
容量利用率高
```

缺点：

```text
没有冗余
```

只要阵列中的一块磁盘损坏：

```text
整个阵列的数据可能不可用
```

因此：

> RAID 0 没有容错能力。

---

# RAID 1

RAID 1：

> **Mirroring，镜像**

相同的数据写入多个磁盘。

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
一块磁盘故障时通常仍可继续运行
```

例如：

```text
2 × 1 TB
↓
可用容量约 1 TB
```

RAID 1 更适合：

```text
可靠性优先
数据镜像
```

的场景。

---

# RAID 5

RAID 5 使用：

```text
条带化
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

奇偶校验分布在多个磁盘上。

RAID 5 通常能够容忍：

```text
1 块磁盘故障
```

通常至少需要：

```text
3 块磁盘
```

但写入时需要计算和维护奇偶校验，因此写入性能和恢复过程都需要额外开销。

---

# RAID 6

RAID 6 类似 RAID 5，但使用：

```text
两组独立的奇偶校验
```

因此通常能够容忍：

```text
同时损坏 2 块磁盘
```

通常至少需要：

```text
4 块磁盘
```

代价是：

```text
更多空间用于校验
更高写入开销
```

---

# RAID 10

RAID 10 可以理解成：

```text
RAID 1
+
RAID 0
```

即：

```text
先镜像
再条带化
```

可以简单表示：

```text
          RAID 0
         /      \
      RAID 1   RAID 1
       /  \     /  \
     Disk Disk Disk Disk
```

特点：

```text
较好的 I/O 性能
具有冗余
容量利用率通常约 50%
```

通常至少需要：

```text
4 块磁盘
```

RAID 10 经常用于：

```text
数据库
高 IOPS
随机读写较多
同时需要冗余
```

等场景。

---

# RAID 对比

| RAID | 核心方式 | 容错 | 常见特点 |
|---|---|---:|---|
| RAID 0 | 条带化 | 0 | 性能 / 容量利用率高 |
| RAID 1 | 镜像 | 1 块磁盘 | 冗余简单可靠 |
| RAID 5 | 条带 + 单校验 | 1 块磁盘 | 容量利用率较高 |
| RAID 6 | 条带 + 双校验 | 2 块磁盘 | 容错能力更强 |
| RAID 10 | 镜像 + 条带 | 取决于故障位置 | 性能和冗余兼顾 |

注意：

> RAID 能否继续工作，不只取决于“坏了几块盘”，还取决于具体 RAID 级别以及故障磁盘的位置。

例如 RAID 10 如果多个故障磁盘恰好属于同一镜像组，也可能导致整个阵列失效。

---

# RAID 不是备份

假设：

```text
RAID 1
Disk 1
Disk 2
```

数据：

```text
重要文件.txt
```

被误删除：

```text
rm important.txt
```

那么删除操作通常也会同步到：

```text
Disk 1
Disk 2
```

同样：

```text
勒索软件
应用误操作
数据库错误写入
```

也会写入阵列。

因此：

```text
RAID
↓
故障容错 / 可用性

Backup
↓
数据恢复
```

两者不是同一个目标。

---

# `mdadm`

假设有：

```text
/dev/sdb1
/dev/sdc1
```

创建 RAID 1：

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

得到：

```text
/dev/sdb1
/dev/sdc1
     ↓
   RAID 1
     ↓
  /dev/md0
```

然后可以：

```bash
mkfs.xfs /dev/md0
```

因此：

> **RAID 自身不是文件系统，它通常向上提供一个新的块设备。**

---

# RAID 故障

实际服务器中更需要关注：

```text
磁盘故障
阵列降级
重建
性能下降
多个磁盘故障
```

查看软件 RAID：

```bash
cat /proc/mdstat
```

或者：

```bash
mdadm --detail /dev/md0
```

如果阵列进入：

```text
degraded
```

通常意味着：

> 阵列仍可能运行，但冗余已经下降。

例如 RAID 1：

```text
正常：

Disk 1 + Disk 2
     ↓
  RAID 1

降级：

Disk 1 + Disk 2
X
     ↓
只剩一个成员
```

此时最重要的不是“还能不能访问”，而是：

> **冗余已经消失，必须尽快处理故障磁盘。**

---

# LVM

LVM：

> **Logical Volume Manager**

用于更灵活地组织和管理存储空间。

传统方式：

```text
磁盘
 ↓
分区
 ↓
文件系统
```

LVM 增加了：

```text
PV
 ↓
VG
 ↓
LV
 ↓
文件系统
```

完整结构：

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

---

# PV、VG、LV

## PV

PV：

> **Physical Volume**

是 LVM 使用的物理存储单元。

例如：

```bash
pvcreate /dev/sdb
```

也可以：

```bash
pvcreate /dev/sdb1
```

于是：

```text
/dev/sdb
   ↓
  PV
```

---

## VG

VG：

> **Volume Group**

可以理解为：

> **LVM 的存储池。**

例如：

```bash
vgcreate vgdata /dev/sdb /dev/sdc
```

得到：

```text
PV1 ─┐
     ├──► VG
PV2 ─┘
```

VG 中的空间可以继续划分给多个逻辑卷。

---

## LV

LV：

> **Logical Volume**

是从 VG 中分配出来的逻辑卷。

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

LV 可以看成：

> **一个供操作系统进一步使用的逻辑块设备。**

---

# LVM 的价值

传统分区：

```text
/dev/sda1 → 100G
/dev/sda2 → 100G
```

空间划分完成后：

```text
调整
```

可能比较麻烦。

LVM：

```text
PV1 ─┐
PV2 ─┼──► VG
PV3 ─┘
```

再从：

```text
VG
```

中划分：

```text
LV1
LV2
LV3
```

这样可以更加灵活地管理空间。

LVM 常见能力：

```text
扩展 LV
缩减 LV
增加 PV
调整 VG
创建 Snapshot
```

但：

> LVM 的操作不是“随便改都不会丢数据”，特别是缩容操作仍然具有较高风险。

---

# 查看 LVM

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

也可以：

```bash
lsblk
```

从整体块设备树中观察 LVM。

例如：

```text
sdb
└─sdb1
   └─vgdata-lvdata
```

---

# LVM 扩容

假设：

```text
VG
↓
还有空闲空间
```

先扩展 LV：

```bash
lvextend -L +20G /dev/vgdata/lvdata
```

这里最容易产生一个误解：

> **LV 扩大，不代表文件系统一定已经扩大。**

因为：

```text
LV
 ↓
文件系统
```

是两个不同层次。

---

## 扩展 XFS

例如挂载点：

```text
/data
```

可以：

```bash
xfs_growfs /data
```

XFS 通常支持：

> **在线扩容**

也就是文件系统挂载状态下进行扩展。

---

## 扩展 ext4

可以：

```bash
resize2fs /dev/vgdata/lvdata
```

因此常见流程：

```text
增加底层空间
      ↓
扩大 LV
      ↓
扩大文件系统
```

对于 LVM + 文件系统：

```text
lvextend
↓
逻辑卷变大

xfs_growfs / resize2fs
↓
文件系统变大
```

二者不要混为一谈。

---

# 在线扩容的完整示例

假设：

```text
/dev/vgdata/lvdata
↓
XFS
↓
/data
```

现在 VG 有额外 20G：

```bash
lvextend -L +20G /dev/vgdata/lvdata
```

然后：

```bash
xfs_growfs /data
```

最后检查：

```bash
df -h /data
```

可以理解成：

```text
VG 空闲空间
   ↓
LV +20G
   ↓
XFS 扩展
   ↓
/data 可用空间 +20G
```

---

# LVM 缩容

扩容通常比较直接，而：

> **缩容危险得多。**

原因是：

```text
LV
 ↓
文件系统
```

不能简单地：

```text
lvreduce
```

然后希望文件系统自动适应。

如果文件系统实际数据已经超过新的目标容量：

```text
数据
 ↓
被截断
 ↓
文件系统损坏
```

因此缩容一般需要：

```text
先确认文件系统支持缩容
↓
先缩文件系统
↓
再缩 LV
```

---

## XFS 的特殊情况

XFS 一个非常重要的特性：

> **XFS 不支持文件系统缩容。**

因此：

```text
XFS
↓
可以扩容
↓
不能直接缩容
```

如果确实需要缩小 XFS 所在的存储空间，通常需要：

```text
备份数据
 ↓
重新创建更小的文件系统
 ↓
恢复数据
```

因此：

> **在规划 LVM 空间时，不要把 XFS 当成“以后随便缩小”的文件系统。**

---

## ext4 缩容

ext4 可以进行缩容，但必须严格按照正确顺序操作。

一般思路：

```text
备份
 ↓
检查文件系统
 ↓
卸载
 ↓
缩小文件系统
 ↓
缩小 LV
 ↓
重新挂载
```

常见命令可能包括：

```bash
e2fsck
resize2fs
lvreduce
```

但缩容属于高风险操作。

生产环境中：

> **备份优先，并严格按照对应发行版和文件系统文档操作。**

---

# LVM Snapshot

LVM 支持：

> **Snapshot**

可以把它理解成：

> **某个时间点上的逻辑卷状态视图。**

例如：

```text
原始 LV
   │
   └── 创建 Snapshot
           │
           ▼
       Snapshot
```

之后原 LV 继续发生写入时：

```text
原 LV
 ↓
数据发生变化
 ↓
Copy-on-Write
 ↓
保存 Snapshot 所需的旧数据
```

因此 Snapshot 可以用于：

```text
升级前保存状态
测试
临时恢复点
数据一致性辅助操作
```

---

## Snapshot 不是备份

Snapshot 仍然依赖：

```text
原始存储
```

如果底层存储发生严重故障：

```text
原卷
 +
Snapshot
```

都可能受到影响。

因此：

```text
Snapshot
↓
快速时间点状态

Backup
↓
独立的数据副本
```

两者不能混淆。

---

# 文件系统

RAID / LVM / 分区完成之后，最终通常需要在块设备上建立：

> **文件系统**

常见：

```text
XFS
ext4
```

RHEL 系系统中，XFS 是常见的默认文件系统，ext4 也被广泛支持。参考：[RHEL 9 — Overview of available file systems](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/overview-of-available-storage-options_managing-storage-devices)。

---

## `mkfs`

创建 XFS：

```bash
mkfs.xfs /dev/sdb1
```

创建 ext4：

```bash
mkfs.ext4 /dev/sdb1
```

如果底层是 LVM：

```bash
mkfs.xfs /dev/vgdata/lvdata
```

如果底层是 RAID：

```bash
mkfs.xfs /dev/md0
```

因此：

```text
分区
 ↓
可以作为文件系统的底层设备

RAID
 ↓
提供块设备
 ↓
可以建立文件系统

LVM LV
 ↓
提供逻辑块设备
 ↓
可以建立文件系统
```

---

# XFS 与 ext4

## XFS

XFS 是 Linux 中非常常见的日志文件系统。

一个非常重要的特点：

```text
支持在线扩容
不支持缩容
```

因此很适合：

```text
大文件系统
服务器数据盘
需要持续扩容的场景
```

---

## ext4

ext4：

> Fourth Extended Filesystem

也是 Linux 中非常成熟、常见的文件系统。

它支持：

```text
扩容
缩容
```

因此在需要后期调整文件系统容量的场景中，有时会比 XFS 更灵活。

不过具体选择还应该根据：

```text
应用需求
发行版
性能
运维习惯
功能需求
```

决定。

---

# inode 与目录项

理解 Linux 文件系统时，另一个非常重要的概念是：

```text
inode
directory entry
```

---

## inode

inode 可以理解为：

> **描述文件对象元数据的核心数据结构。**

通常包含：

```text
文件类型
权限
UID
GID
时间戳
文件大小
数据块相关信息
```

但：

> **文件名本身并不直接保存在 inode 中。**

---

## 目录项

目录中保存的是：

> **文件名到 inode 的关联。**

可以简化理解：

```text
目录项
├── "app.log" → inode 12345
├── "test.txt" → inode 12346
└── "config"   → inode 12347
```

然后 inode 再描述：

```text
inode 12345
   ↓
权限
所有者
大小
时间
数据块
```

因此：

```text
文件名
 ↓
目录项
 ↓
inode
 ↓
文件数据
```

这是理解：

```text
硬链接
软链接
inode
目录
```

的重要基础。

---

# inode 为什么会耗尽

文件系统除了有：

```text
数据块空间
```

之外，还存在：

```text
inode 数量
```

限制。

因此可能出现：

```text
磁盘还有很多 GB 空间
但是无法继续创建文件
```

原因就是：

> **inode 被耗尽。**

例如：

```text
/var/tmp
├── file1
├── file2
├── file3
├── ...
└── file10000000
```

如果产生大量小文件：

```text
数据容量可能还没满
↓
inode 已经耗尽
```

查看 inode：

```bash
df -i
```

查看普通空间：

```bash
df -h
```

因此：

```text
df -h
↓
检查容量

df -i
↓
检查 inode
```

两者都要看。

---

# 挂载

Linux 不使用：

```text
C:
D:
E:
```

这种盘符模型。

Linux 的核心思路是：

> **把文件系统挂载到目录树中。**

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

就可以访问这个文件系统。

---

# `mount`

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

查看当前挂载：

```bash
mount
```

也可以：

```bash
findmnt
```

`findmnt` 在分析复杂挂载关系时通常非常方便。

---

# `umount`

卸载：

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

通常说明：

```text
仍有进程正在使用该文件系统
```

例如：

```text
某进程
  ↓
/data/app.log
  ↓
/data
```

甚至当前 Shell 自己就在：

```bash
cd /data
```

这时也可能导致卸载失败。

排查：

```bash
lsof +D /data
```

或者：

```bash
fuser -vm /data
```

确认哪些进程正在使用挂载点。

然后：

```text
退出目录
停止相关程序
关闭打开的文件
```

再尝试卸载。

---

# UUID

设备名称：

```text
/dev/sda1
/dev/sdb1
```

并不适合作为最稳定的持久化身份标识。

因此 Linux 常使用：

> **UUID**

例如：

```text
UUID=4b8e-xxxx-xxxx
```

查看：

```bash
blkid
```

或者：

```bash
lsblk -f
```

---

# `/etc/fstab`

直接：

```bash
mount /dev/sdb1 /data
```

通常只建立当前运行状态下的挂载关系。

系统重启后：

```text
挂载关系不会因为这条命令自动永久保存
```

因此可以使用：

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
↓
文件系统标识

/data
↓
挂载点

xfs
↓
文件系统类型

defaults
↓
挂载选项

0
↓
dump 相关字段

0
↓
文件系统检查相关字段
```

---

## 修改 fstab 后不要直接重启

编辑：

```bash
/etc/fstab
```

之后，推荐先测试：

```bash
mount -a
```

如果配置正确，应该不会出现错误。

然后再检查：

```bash
findmnt
```

或者：

```bash
df -h
```

这样可以避免：

```text
fstab 配置错误
↓
服务器重启
↓
文件系统无法挂载
↓
影响系统启动
```

生产环境尤其要注意。

---

# 磁盘空间不足

服务器最常见的存储问题之一：

```text
No space left on device
```

遇到这种情况，不应该直接删除文件。

先确认：

```bash
df -h
```

例如：

```text
Filesystem      Size  Used Avail Use%
/dev/sda2       100G   98G    2G  98%
```

说明：

> 文件系统容量已经接近耗尽。

---

# 使用 `du` 定位大目录

先查看：

```bash
du -sh /var/*
```

找出占用空间最大的目录。

例如：

```text
10G /var/log
2G  /var/cache
50G /var/lib
```

继续：

```bash
du -sh /var/lib/*
```

逐层缩小范围。

典型排查：

```text
df -h
 ↓
哪个文件系统满？
 ↓
du -sh
 ↓
哪个目录大？
 ↓
du -sh
 ↓
哪个文件 / 子目录大？
```

---

# `df` 与 `du` 不一致

一个非常经典的问题：

```text
df -h
↓
文件系统 95% 满

du -sh /
↓
看起来没有这么多数据
```

可能原因之一：

> **文件已经被删除，但仍然被进程打开。**

Linux 删除文件时：

```text
目录项被删除
```

但如果进程仍然持有该文件描述符：

```text
inode 和数据块
↓
仍然被进程占用
```

因此：

```text
文件名消失
+
磁盘空间没有释放
```

可以使用：

```bash
lsof | grep '(deleted)'
```

寻找这类文件。

例如：

```text
java
 └── app.log (deleted)
```

说明：

```text
app.log
↓
已经删除

但是 Java 进程
↓
仍然打开它
```

通常需要让相关程序：

```text
关闭文件
重新打开日志
```

或者在合适情况下：

```text
重启服务
```

之后空间才会释放。

这也是为什么：

> **`df` 和 `du` 分别回答不同的问题。**

---

# inode 耗尽

如果：

```bash
df -h
```

空间看起来还有很多：

但是：

```bash
df -i
```

显示：

```text
IUse% 100%
```

说明：

> inode 可能已经耗尽。

典型原因：

```text
大量小文件
缓存文件
临时文件
应用生成大量碎片数据
```

排查思路：

```text
df -i
 ↓
确认哪个文件系统 inode 满
 ↓
du / find
 ↓
寻找大量小文件的目录
```

这时候继续执行：

```bash
rm -rf
```

之前必须先确认：

```text
这些文件是不是可以安全删除？
```

---

# 文件系统只读

另一个常见问题：

```text
Read-only file system
```

例如：

```bash
touch test.txt
```

得到：

```text
Read-only file system
```

不要第一反应执行：

```bash
mount -o remount,rw ...
```

而应该先判断：

> **为什么文件系统会变成只读？**

常见原因包括：

```text
文件系统检测到错误
底层存储发生问题
磁盘 / RAID 故障
内核保护性切换为只读
挂载参数本身是 ro
```

先查看：

```bash
findmnt
```

确认挂载参数。

再查看内核日志：

```bash
dmesg | tail -n 100
```

或者使用：

```bash
journalctl -k
```

重点寻找：

```text
I/O error
filesystem error
XFS
EXT4
read-only
reset
timeout
```

如果存在底层 I/O 错误：

```text
硬件 / RAID / 存储层
        ↓
文件系统
        ↓
只读
```

此时强行 remount 为读写可能进一步造成数据损坏。

正确思路应该是：

```text
先确认底层故障
 ↓
保护数据
 ↓
处理存储问题
 ↓
再恢复文件系统
```

---

# 文件系统损坏

文件系统可能因为：

```text
异常断电
底层设备错误
硬件故障
软件问题
```

发生损坏。

不同文件系统拥有不同的检查与修复工具。

---

## ext4

ext4 常见工具：

```bash
e2fsck
```

例如：

```bash
e2fsck /dev/sdb1
```

但文件系统检查和修复通常应该：

> **在适合的维护状态下进行，避免对正在正常使用的文件系统直接执行修复。**

尤其是根文件系统或正在运行的重要文件系统，不能简单地在线运行修复命令。

---

## XFS

XFS 对应的检查工具：

```bash
xfs_repair
```

例如：

```bash
xfs_repair /dev/sdb1
```

同样需要根据实际情况准备合适的维护环境。

---

# 挂载失败

如果：

```bash
mount /dev/sdb1 /data
```

失败，可以按照层次排查。

### 第一步：确认设备

```bash
lsblk
```

确认：

```text
/dev/sdb1
```

是否真的存在。

---

### 第二步：确认文件系统

```bash
blkid /dev/sdb1
```

查看：

```text
TYPE
UUID
```

---

### 第三步：确认文件系统类型

例如：

```text
xfs
```

却错误指定：

```bash
mount -t ext4 ...
```

当然可能失败。

---

### 第四步：查看内核日志

```bash
dmesg | tail -n 100
```

或者：

```bash
journalctl -k
```

寻找：

```text
I/O error
XFS
EXT4
bad superblock
unknown filesystem
```

等信息。

---

### 第五步：检查挂载点

确认：

```bash
mkdir -p /data
```

目录存在。

如果：

```text
target is busy
```

则检查进程。

---

### 第六步：检查 `/etc/fstab`

如果手动挂载没问题，但系统启动挂载失败：

```text
重点检查 /etc/fstab
```

确认：

```text
UUID
挂载点
文件系统类型
选项
```

是否正确。

---

# I/O 等待

存储故障不一定表现成：

```text
No space left on device
```

有时服务器看起来：

```text
CPU 没满
内存也够
```

但是：

```text
程序非常慢
SSH 卡顿
Web 请求超时
数据库响应缓慢
```

这时候可能存在：

> **I/O Wait**

---

## 什么是 I/O Wait

CPU 在执行过程中可能需要等待：

```text
磁盘 I/O
```

完成。

可以粗略理解：

```text
CPU
 ↓
发起 I/O
 ↓
等待存储设备
 ↓
继续执行
```

如果存储设备响应很慢：

```text
等待时间增加
↓
I/O wait 上升
```

这并不意味着：

> “CPU 坏了”。

而可能意味着：

> **CPU 没有足够快地拿到所需的数据。**

---

# I/O 性能指标

存储性能通常关注：

```text
IOPS
吞吐量
延迟
```

## IOPS

：

> 每秒 I/O 操作次数。

更适合观察：

```text
大量随机小 I/O
```

---

## 吞吐量

表示：

> 单位时间传输多少数据。

例如：

```text
500 MB/s
```

适合：

```text
大文件连续读写
```

---

## 延迟

表示：

> 一次 I/O 完成需要多久。

例如：

```text
1 ms
10 ms
100 ms
```

对于很多数据库和随机 I/O 业务：

> 延迟可能比单纯吞吐量更重要。

---

# `iostat`

查看磁盘 I/O：

```bash
iostat
```

扩展统计：

```bash
iostat -x
```

持续每秒查看：

```bash
iostat -xz 1
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

如果：

```text
await
```

明显升高，同时：

```text
%util
```

长期很高：

```text
存储设备
↓
可能成为瓶颈
```

但也不要单独根据某一个指标下结论，需要结合：

```text
I/O 模式
队列
吞吐
设备类型
业务负载
```

一起判断。

---

# 存储故障排查方法

Linux 存储故障最重要的是：

> **按照层级排查，而不是看到错误就直接执行修复命令。**

可以建立下面这条链：

```text
应用异常
   ↓
文件系统
   ↓
逻辑卷
   ↓
RAID
   ↓
分区
   ↓
块设备
   ↓
驱动 / 控制器
   ↓
物理磁盘
```

不同问题从不同位置开始。

---

# 磁盘满排查

遇到：

```text
No space left on device
```

先：

```bash
df -h
```

再：

```bash
df -i
```

判断：

```text
容量满？
还是 inode 满？
```

如果容量满：

```bash
du -sh /var/*
```

继续找大目录。

如果：

```text
df -h 很高
du 看起来不高
```

再：

```bash
lsof | grep '(deleted)'
```

寻找已经删除但仍被进程打开的文件。

---

# 挂载失败排查

遇到：

```text
mount failed
```

按：

```text
lsblk
 ↓
blkid
 ↓
findmnt
 ↓
dmesg / journalctl -k
 ↓
检查文件系统
 ↓
检查 fstab
```

进行排查。

重点确认：

```text
设备存在吗？
文件系统类型正确吗？
UUID 正确吗？
文件系统损坏了吗？
目标目录存在吗？
底层有没有 I/O 错误？
```

---

# 文件系统只读排查

遇到：

```text
Read-only file system
```

先：

```bash
findmnt
```

确认：

```text
ro
```

还是：

```text
rw
```

再：

```bash
dmesg | tail -n 100
```

以及：

```bash
journalctl -k
```

寻找：

```text
I/O error
filesystem error
disk error
XFS error
EXT4 error
```

如果存在硬件或底层 I/O 错误：

```text
不要直接强制改成 rw
```

而应该继续向下排查：

```text
文件系统
 ↓
RAID
 ↓
控制器
 ↓
磁盘
```

---

# RAID 故障排查

如果怀疑软件 RAID：

```bash
cat /proc/mdstat
```

然后：

```bash
mdadm --detail /dev/md0
```

重点观察：

```text
阵列状态
成员磁盘
是否降级
重建状态
```

如果阵列已经：

```text
degraded
```

意味着：

> 冗余能力已经下降。

此时需要尽快定位故障磁盘，并根据实际 RAID 状态和备件情况进行处理。

---

# LVM 故障排查

如果挂载空间异常，可以：

```bash
pvs
vgs
lvs
```

确认：

```text
PV 是否正常？
VG 是否还有空闲空间？
LV 容量是多少？
```

然后：

```bash
lsblk
```

观察：

```text
物理设备
 ↓
PV
 ↓
VG
 ↓
LV
```

最后：

```bash
df -h
```

确认文件系统实际大小。

一个很典型的问题：

```text
lvextend 成功
 ↓
LV 变大

df -h
 ↓
空间没有变化
```

这通常是因为：

```text
文件系统还没有扩容
```

例如 XFS：

```bash
xfs_growfs /data
```

ext4：

```bash
resize2fs /dev/vgdata/lvdata
```

---

# 一次完整的磁盘初始化

假设服务器增加一块新磁盘：

```text
/dev/sdb
```

最简单的结构：

```text
/dev/sdb
   ↓
GPT
   ↓
/dev/sdb1
   ↓
XFS
   ↓
/data
```

流程可以是：

```text
确认设备
   ↓
lsblk
   ↓
创建分区
   ↓
创建文件系统
   ↓
mkdir /data
   ↓
mount
   ↓
blkid
   ↓
配置 /etc/fstab
   ↓
mount -a
   ↓
df -h
```

---

# RAID + 文件系统

例如：

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

流程：

```text
创建分区
   ↓
mdadm 创建 RAID
   ↓
查看 /proc/mdstat
   ↓
mkfs.xfs /dev/md0
   ↓
mount
   ↓
/data
```

---

# RAID + LVM + 文件系统

更复杂的服务器可能：

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

这种结构的优点是：

```text
RAID
↓
提供磁盘冗余

LVM
↓
提供灵活空间管理

XFS
↓
提供文件系统
```

但代价也是：

> **层次越多，故障排查越需要明确每一层的状态。**

---

# Linux 存储的完整模型

最终可以把 Linux 存储体系理解成：

```text
                         物理存储
                            │
             ┌──────────────┼──────────────┐
             │              │              │
            HDD            SSD          NVMe SSD
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                         块设备
                            │
                  ┌─────────┴─────────┐
                  │                   │
               分区表                RAID
                  │                   │
             ┌────┴────┐              │
             │         │              │
            MBR       GPT             │
             │         │              │
             └────┬────┘              │
                  ▼                   │
                 分区                 │
                  │                   │
                  └─────────┬─────────┘
                            ▼
                           LVM
                      ┌─────┼─────┐
                      │     │     │
                     PV    VG    LV
                                  │
                                  ▼
                              文件系统
                           ┌──────┴──────┐
                           │             │
                          XFS           ext4
                           │             │
                           └──────┬──────┘
                                  ▼
                                mount
                                  │
                                  ▼
                              挂载点
                                  │
                                  ▼
                             Linux 目录树
```

如果遇到故障：

```text
磁盘满
↓
df -h / df -i
```

```text
文件系统只读
↓
findmnt
↓
dmesg / journalctl -k
```

```text
挂载失败
↓
lsblk
↓
blkid
↓
文件系统
↓
fstab
```

```text
RAID 异常
↓
/proc/mdstat
↓
mdadm --detail
```

```text
LVM 空间异常
↓
pvs
vgs
lvs
```

```text
I/O 慢
↓
iostat
↓
内核日志
↓
RAID / 磁盘 / 控制器
```

这就是 Linux 存储运维最核心的排查思路：

> **先确定问题发生在哪一层，再处理这一层的问题。**

---

## 外部参考

- [Red Hat Enterprise Linux — Managing Storage Devices](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/)
- [Red Hat Enterprise Linux — Configuring and Managing Logical Volumes](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/)
- [Linux Kernel — VFS](https://docs.kernel.org/filesystems/vfs.html)
- [Linux Kernel — Block Layer / blk-mq](https://docs.kernel.org/block/blk-mq.html)
- [Linux man-pages](https://man7.org/linux/man-pages/)
