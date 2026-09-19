---
title: Linux 基础：存储体系
published: 2026-09-13T06:43:25Z
updated: 2026-09-19
description: '从存储介质、协议与设备连接，到分区、RAID、LVM、文件系统和挂载，结合磁盘初始化、扩容与故障定位理解 Linux 存储体系。'
image: ''
tags: [Linux, 存储, 磁盘, 文件系统, LVM, RAID, 运维]
category: 学习笔记
draft: false
lang: ''
---

Linux 中，设备容量、逻辑卷容量和文件系统可用空间是不同的量。理解它们之间的关系，才能判断新增的容量去了哪里、哪个设备承载了数据，以及故障应从哪一层开始检查。

本文以本地块存储为主，先建立存储结构，再介绍设备识别、空间管理、挂载和常见故障定位。命令采用现代 Linux 常见工具；修改设备或系统配置的示例使用 `sudo`，实际执行前应核对设备、文件系统类型和工具版本。

# 存储体系概览

从文件路径向下看，一种常见结构是：

```text title="文件如何落到存储设备上" frame="none"
应用访问 /data/report.csv
          │
          ▼
挂载在 /data 的文件系统       组织文件、目录和元数据
          │
          ▼
LVM 逻辑卷（可选）           分配和调整容量
          │
          ▼
RAID 阵列（可选）            按所选级别提供条带化、镜像或校验
          │
          ▼
整盘或分区                  提供可寻址的块空间
          │
          ▼
驱动、控制器与设备连接
          │
          ▼
物理存储设备                实际保存数据
```

这不是所有系统都必须遵循的固定流水线。整盘、分区、软件 RAID 设备和 LVM 逻辑卷都可以表现为**块设备**；文件系统通常建立在最终交给它的那个块设备上。

| 常见布局 | 示例 | 特点 |
| --- | --- | --- |
| 分区上直接建立文件系统 | `/dev/sdb1 → XFS → /data` | 结构简单 |
| 软件 RAID 上建立文件系统 | `两块盘的分区 → /dev/md0 → XFS → /data` | 容错能力取决于 RAID 级别 |
| LVM 管理文件系统容量 | `整盘或分区 → PV → VG → LV → ext4 → /data` | 便于分配和扩展容量 |
| RAID 与 LVM 组合 | `成员设备 → RAID → PV → VG → LV → XFS → /data` | 分别承担阵列管理与容量管理 |

分区表描述设备上的分区位置，不是每次文件读写都要经过的独立存储层。RAID 可以使用整盘或分区，LVM 也可以使用整盘、分区或 RAID 设备；云主机看到的磁盘则可能已经由底层平台完成冗余。

:::tip[先找到承载数据的设备]
排查 `/data` 的问题时，先用 `findmnt -T /data` 找到承载这个路径的文件系统，再用 `lsblk` 查看设备关系。不要仅凭 `/dev/sdb` 这样的名称猜测它的用途。
:::

# 存储介质与设备连接

购买或识别一块硬盘时，需要分别回答：**数据存在哪里、主机使用什么命令、通过什么连接传输、设备长什么样且能否安装**。这些是不同维度，不能用一个“接口类型”概括所有差别。

## 存储介质：HDD 与 SSD

**HDD（Hard Disk Drive，机械硬盘）**依靠旋转盘片和磁头存取数据。连续读写时磁头移动较少，顺序吞吐较好；大量分散的小请求会增加寻道和旋转等待。它通常适合容量需求大、随机访问要求相对低的场景。

**SSD（Solid State Drive，固态硬盘）**通常使用 NAND 闪存，没有机械寻道过程，随机访问延迟通常更低。控制器通过闪存转换层（FTL）管理逻辑地址与闪存位置的映射，并处理垃圾回收、磨损均衡等工作。

| 关注点 | HDD | SSD |
| --- | --- | --- |
| 主要性能限制 | 寻道、转速及连续传输能力 | 控制器、闪存、连接带宽和工作负载 |
| 随机小块 I/O | 容易受机械延迟限制 | 通常明显优于 HDD |
| 选型指标 | 容量、转速、记录方式、工作负载评级 | 延迟、持续写入性能、写入寿命、掉电保护 |
| 日常观察 | 介质错误、待处理扇区、温度 | 介质错误、剩余寿命、温度及节流 |

SSD 不等于 NVMe：SSD 可以通过 SATA、SAS 或 PCIe 等方式连接。比较性能时也不能只看标称顺序读写速度，还要看请求大小、读写比例、队列深度和持续负载表现。

## 命令集、协议与主机控制器接口

命令集规定“可以请求设备做什么”，例如读写、刷新缓存和查询状态；协议还规定请求与完成信息如何交换。主机控制器接口则解决驱动如何操作控制器的问题。

| 名称 | 主要角色 | 理解要点 |
| --- | --- | --- |
| ATA 命令集 | 存储设备命令集 | SATA 磁盘通常使用 ATA 命令 |
| SCSI 命令集 | 一组存储及其他设备命令集 | 可通过 SAS、iSCSI 等不同传输方式使用 |
| NVMe | 面向非易失性存储的协议与规范体系 | 包括基础规范、I/O 命令集和传输规范 |
| AHCI | SATA 主机控制器的软件编程接口 | 驱动通过它操作控制器；它不是硬盘外形或连接器 |

常见的本地 NVMe SSD 通过 PCIe 连接，但 NVMe 并不只支持 PCIe。[NVM Express 规范](https://nvmexpress.org/specifications/)还定义了 RDMA、TCP 等传输方式，因此“NVMe 设备”不必然意味着“插在本机 PCIe 插槽中的设备”。

ATA、SCSI 和 NVMe 的历史与覆盖范围不同。这里按使用时需要判断的问题区分角色，而不是把每套规范都当成只属于某一层。SCSI 架构与 SAS 标准可从 [T10 技术委员会](https://www.t10.org/)查阅。

## 总线与互连：SATA、SAS、PCIe

| 名称 | 连接特点 | 常见用途 |
| --- | --- | --- |
| SATA（Serial ATA） | 面向存储设备的串行接口标准，覆盖物理连接及相关协议层 | HDD、SATA SSD |
| SAS（Serial Attached SCSI） | 面向存储的串行互连，支持扩展器及多路径等能力 | 服务器磁盘、存储机箱 |
| PCIe（PCI Express） | 通用高速串行互连，通过代际和通道数共同决定链路带宽 | NVMe SSD、网卡、GPU 等 |

SATA、SAS 规范本身覆盖多个层面，因此称它们为“存储接口标准”或“存储互连”更准确；PCIe 是通用互连，不是某一种硬盘协议。PCIe 设备还要核对插槽实际提供的代际与通道数，例如物理上能安装，不代表一定能以设备最高带宽运行。

SAS 控制器通常可以接入 SATA 盘，但仍要确认控制器和背板支持；SATA 控制器不能因此反过来使用 SAS 盘。双端口、多路径和热插拔也需要设备、背板、控制器与软件共同支持，不能仅凭名称推断。

## 外形规格与连接器

**外形规格（form factor）**描述尺寸、安装方式等约束，**连接器**关系到触点、电气连接和机械配合。它们与设备使用的协议有关联，但不是一一对应。

| 标识 | 说明 | 安装前需要确认 |
| --- | --- | --- |
| 3.5 英寸、2.5 英寸 | 常见驱动器外形规格 | 盘位、厚度、供电、背板及支持的接口 |
| SATA 数据与电源连接器 | 常见 SATA 驱动器分别使用 7 针数据和 15 针电源连接器 | 数据连接、供电及背板兼容性 |
| M.2 | 包含卡形、尺寸和插接等定义的规格 | 卡长、键位，以及插槽支持 SATA 还是 PCIe |
| U.2 | 常用于 2.5 英寸 PCIe/NVMe 驱动器连接，关联 SFF-8639 连接器 | 主机端、线缆、背板的布线和支持能力 |
| AIC（Add-in Card） | 安装在扩展槽中的板卡形态 | PCIe 插槽尺寸、通道、散热；多盘转接卡还可能要求通道拆分 |

例如，M.2 2280 表示常见的 22 mm × 80 mm 卡尺寸，不能据此判断设备采用 SATA 还是 NVMe。键位可以排除部分不兼容组合，但最终应以设备和主板手册为准。[SATA-IO 的 M.2 说明](https://sata-io.org/developers/sata-ecosystem/sata-m2-card)也明确指出，M.2 卡形与连接器规格可以承载 SATA、PCIe 等不同接口。

## 把几个维度组合起来

| 设备描述 | 介质 | 命令或协议 | 互连 | 外形或连接 |
| --- | --- | --- | --- | --- |
| 2.5 英寸 SATA SSD | NAND 闪存 | ATA | SATA | 2.5 英寸，SATA 连接器 |
| M.2 SATA SSD | NAND 闪存 | ATA | SATA | M.2，尺寸与键位按产品规格 |
| M.2 NVMe SSD | NAND 闪存 | NVMe | PCIe | M.2，尺寸与键位按产品规格 |
| 2.5 英寸 SAS HDD | 磁性盘片 | SCSI | SAS | 2.5 英寸，SAS 连接器 |
| U.2 NVMe SSD | NAND 闪存 | NVMe | PCIe | 常见为 2.5 英寸，U.2 连接 |

这也解释了为什么两块外形相同的 SSD 可能无法互换，而使用相同协议的 SSD 又可能拥有完全不同的外观。

# 块设备与设备识别

## 设备名称表示什么

块设备向上提供按逻辑块地址访问的存储空间。设备文件是访问入口，其名称并不能完整描述后面的物理结构。

| 名称示例 | 含义 | 注意事项 |
| --- | --- | --- |
| `/dev/sda`、`/dev/sda1` | 一个磁盘类设备及其第一个分区 | SATA、SAS、USB 存储或 RAID 逻辑盘都可能出现为 `sd*` |
| `/dev/nvme0n1`、`/dev/nvme0n1p1` | NVMe 命名空间及其第一个分区 | `n1` 表示命名空间；不能直接等同于一块物理盘 |
| `/dev/vda`、`/dev/vda1` | 常见 virtio 块设备及其分区 | 常见于虚拟机，后端由平台决定 |
| `/dev/md0` | Linux MD 软件阵列设备 | 向上仍然表现为块设备 |
| `/dev/vgdata/lvdata` | LVM 逻辑卷路径 | 便于识别所属卷组和逻辑卷 |

设备枚举顺序可能改变。持久挂载通常使用文件系统 UUID；定位物理设备还应结合序列号、WWN、控制器槽位和 `/dev/disk/by-id/` 等信息。

## 用 `lsblk` 建立设备地图

```bash title="查看设备关系、型号和文件系统"
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
lsblk -d -o NAME,SIZE,MODEL,SERIAL,TRAN,ROTA
lsblk -f
```

第一条命令可能得到：

```text title="示例输出：LVM 上的文件系统" frame="none"
NAME                 SIZE TYPE FSTYPE      MOUNTPOINTS
sdb                  100G disk
└─sdb1               100G part LVM2_member
  └─vgdata-lvdata      80G lvm  xfs         /data
```

这里 `sdb1` 被 LVM 使用，真正承载 XFS 的是 `vgdata-lvdata`。不能对 `sdb1` 再执行格式化，否则会覆盖下层元数据。

`TRAN` 是系统报告的传输类型，`ROTA` 表示设备报告的旋转属性；虚拟设备、USB 桥接或硬件 RAID 可能隐藏或改写这些信息。字段为空或 `ROTA=0` 都不足以证明底层硬件的完整情况。较旧版本若不支持 `MOUNTPOINTS`，可使用 `MOUNTPOINT` 并配合 `findmnt`。

## 补充确认分区与标识

```bash title="只读查看分区和签名"
sudo fdisk -l /dev/sdb
sudo blkid /dev/sdb1
sudo wipefs --no-act /dev/sdb
```

`fdisk -l` 查看分区布局；`blkid` 识别文件系统等元数据；`wipefs --no-act` 只列出可识别签名，不擦除数据。签名检查没有结果，也不能证明设备从未使用或没有需要保留的数据。

字段含义及设备关系的显示限制见 [lsblk(8)](https://man7.org/linux/man-pages/man8/lsblk.8.html)。

# 分区与分区表

## 分区不等于文件系统

分区是在块设备上划出的地址范围；分区表记录这些范围的位置、大小和类型。一个分区可以承载文件系统、交换空间、LVM PV 或 RAID 成员元数据。

例如，`parted` 创建分区时指定 `xfs`，并不代表已经创建 XFS。创建文件系统还需要单独执行 `mkfs.xfs`。整盘也可以直接用于文件系统或 LVM，并不是必须分区。

## MBR 与 GPT

| 比较项 | MBR | GPT |
| --- | --- | --- |
| 分区描述 | 4 个主分区表项；可用扩展分区容纳逻辑分区 | 使用分区项数组，无须扩展分区机制 |
| 容量范围 | 采用 512 字节逻辑扇区时，常见寻址限制约 2 TiB | 支持更大的地址范围 |
| 元数据 | 主要结构位于设备开头 | 有主、备份头和分区项数组，并有校验机制 |
| 标识 | 传统分区类型编码 | 分区类型 GUID、分区唯一 GUID |
| 新建数据盘 | 主要用于兼容旧环境 | 通常优先选择 |

GPT 常见默认分区项数量是 128，但并非其不可改变的理论上限。磁盘容量显示还涉及单位差异：厂商的 TB 通常按十进制计算，TiB 按二进制计算。[^capacity]

[^capacity]: 1 TB = 10¹² 字节；1 TiB = 2⁴⁰ 字节。一块标称 1 TB 的设备约为 0.91 TiB，分区、文件系统元数据等还会占用空间。

## UEFI 与 EFI 系统分区

UEFI 是固件接口规范，GPT 是分区表方案，二者不是同一种事物。现代 Linux 安装常使用 UEFI 与 GPT，但不要把这种常见组合理解为所有环境下的绝对绑定。

UEFI 启动通常通过 **EFI 系统分区（ESP）**中的 EFI 程序加载引导器。常见 Linux 安装使用 FAT32 格式的 ESP，挂载到 `/boot/efi` 或 `/efi`；它与保存系统文件的根文件系统不同，`/boot` 也不一定就是 ESP。

可以检查 `/sys/firmware/efi` 是否存在，辅助判断当前系统是否通过 UEFI 启动；容器内看到的结果不能替代宿主机检查。普通数据盘的分区和挂载通常无须修改 ESP。规范定义见 [UEFI Specifications](https://uefi.org/specifications)。

# RAID

RAID（Redundant Array of Independent Disks，独立磁盘冗余阵列）把多个成员设备组织为阵列。不同级别在可用容量、性能和容错能力之间做不同取舍；名称中有“冗余”，并不意味着每个级别都具备冗余。

## 硬件 RAID 与 Linux 软件 RAID

**硬件 RAID**由专用控制器管理成员盘，通常向 Linux 暴露一个或多个逻辑盘。`lsblk` 无法代替控制器管理工具：成员盘状态、槽位、缓存保护和重建进度需要用厂商工具检查。

**Linux 软件 RAID**通常由内核 MD 驱动实现，使用 `mdadm` 管理。成员设备可以是整盘或分区，阵列设备例如 `/dev/md0`。它可以直接承载文件系统，也可以成为 LVM 的下层设备。

## RAID 0：条带化

数据按条带分散到多个成员，多个设备可以并行处理请求。例如两个成员分别保存数据块 `A1、A3` 和 `A2、A4`。

RAID 0 没有镜像或校验冗余。任一成员失效都可能使整个文件系统不可用，适合可以重建的临时数据，不适合作为需要容错的数据存储。性能收益取决于负载和实现，不能保证简单地按磁盘数量倍增。

## RAID 1：镜像

同一份数据保存在多个成员上。常见的双盘镜像中，两块 1 TB 的盘提供约 1 TB 阵列容量，可容忍其中一块盘故障。

镜像便于理解，常用于系统盘或容量较小的重要数据卷。读取可能受益于多成员调度，写入需要维护各个副本；镜像数量越多，可用容量比例越低。

## RAID 5：分布式单校验

数据与一份校验信息分布在成员上，通常至少需要三块盘，可容忍一块成员盘故障。等容量成员的近似可用容量为 `(N - 1) × S`。

小块随机写可能涉及旧数据、旧校验的读取和更新；全条带写的处理方式不同。重建还会读取其余成员并占用 I/O 资源，因此选型不能只看容量利用率，也要考虑重建期间的性能和再次故障风险。

## RAID 6：分布式双校验

RAID 6 使用两份独立校验信息，通常至少需要四块盘，可容忍任意两块成员盘故障。等容量成员的近似可用容量为 `(N - 2) × S`。

相比 RAID 5，它在重建期间保留更多容错余量，但也需要更多校验空间和写入处理。具体性能仍取决于实现、缓存和工作负载。

## RAID 10：镜像与条带化

常见的四盘 RAID 10 先组成两个双盘镜像组，再在镜像组之间条带化：

```text title="常见双副本 RAID 10" frame="none"
                   条带化
                /          \
          镜像组 A          镜像组 B
          磁盘 1、2         磁盘 3、4
```

这种布局通常提供总容量的约一半。它保证能容忍任意一块盘故障；多盘同时故障能否继续工作，取决于是否仍为每份数据保留至少一个有效副本。例如磁盘 1 和 3 同时失效仍可能工作，磁盘 1 和 2 同时失效则会丢失镜像组 A。

RAID 10 常用于随机读写较多、同时需要冗余的场景。Linux MD RAID10 还有不同布局，不能把四盘双镜像的结论不加条件地套到所有实现。

## 容量与容错对比

下表假设成员健康且容量相同，`N` 为成员数、`S` 为单盘容量；忽略元数据开销，热备盘不计入可用容量。RAID 1 按双盘镜像、RAID 10 按常见偶数盘双副本布局比较。

| 级别 | 常见最少盘数 | 近似可用容量 | 成员故障容忍能力 | 主要取舍 |
| --- | --- | --- | --- | --- |
| RAID 0 | 2 | `N × S` | 无 | 容量利用率高，没有冗余 |
| RAID 1 | 2 | `S` | 双盘镜像可坏 1 块 | 简单，容量成本较高 |
| RAID 5 | 3 | `(N - 1) × S` | 任意 1 块 | 容量与单盘容错折中 |
| RAID 6 | 4 | `(N - 2) × S` | 任意 2 块 | 双盘容错，校验开销更高 |
| RAID 10 | 4 | `N × S / 2` | 至少任意 1 块，多盘故障看位置 | 随机 I/O 与冗余兼顾 |

:::important[RAID 保护的边界]
RAID 主要应对成员设备故障，无法保留被误删或覆盖的数据，也无法替代独立备份。热备盘可以缩短开始重建前的等待，但不代表重建已经完成，更不会改变阵列原有的校验级别。
:::

## 查看阵列状态

```bash title="检查 Linux MD 阵列"
cat /proc/mdstat
sudo mdadm --detail /dev/md0
```

双盘 RAID 1 的 `/proc/mdstat` 中，`[UU]` 通常表示两个成员都在；`[U_]` 表示缺少一个成员。还需要结合 `mdadm --detail` 的阵列状态、活动成员、失败成员和重建进度判断。

看到 `degraded` 时，先确认故障成员与物理槽位的对应关系、其余成员健康状态和备份，再按设备与阵列文档安排更换。不要把 `mdadm --create` 当成恢复已有阵列的通用命令。创建、持久组装及成员替换的完整条件见 [mdadm(8)](https://man7.org/linux/man-pages/man8/mdadm.8.html) 和 [Linux MD 文档](https://docs.kernel.org/admin-guide/md.html)。

# LVM

LVM（Logical Volume Manager，逻辑卷管理器）在块设备之上管理容量，让文件系统不必直接绑定到某一块盘的固定分区。普通线性 LVM 本身不提供冗余；如果一个 LV 跨越多个 PV，丢失其中一个 PV 可能影响整个文件系统。

## PV、VG 与 LV

| 对象 | 全称 | 作用 | 常用查看命令 |
| --- | --- | --- | --- |
| PV | Physical Volume，物理卷 | 将整盘、分区或 RAID 设备交给 LVM 使用 | `pvs` |
| VG | Volume Group，卷组 | 汇集一个或多个 PV 的空间 | `vgs` |
| LV | Logical Volume，逻辑卷 | 从 VG 分配容量，向上提供块设备 | `lvs` |

```text title="卷组中的容量分配" frame="none"
/dev/sdb1（PV） ─┐                 ┌─ lvdata → XFS → /data
                ├─ vgdata（VG） ──┤
/dev/sdc1（PV） ─┘                 └─ lvlogs → ext4 → /srv/logs
```

VG 中未分配的空间和文件系统中的可用空间不是同一个量。`vgs` 的 `VFree` 表示还能分配给 LV 的空间，`df` 的 `Avail` 表示文件系统内还能使用的空间。

## 查看容量落在哪一层

```bash title="查看 LVM 容量及下层设备"
sudo pvs -o pv_name,vg_name,pv_size,pv_free
sudo vgs -o vg_name,vg_size,vg_free
sudo lvs -o lv_name,vg_name,lv_size,segtype,devices
findmnt -T /data
```

`segtype` 有助于识别线性卷、条带卷或精简卷等类型。下面的扩容流程针对普通厚置备 LV；thin pool 还需要单独观察数据区和元数据区，不能仅看 `VFree`。

## 扩容：先准备可分配空间

有三种常见情况，应按实际结构选择，不要依次执行所有分支。

| 当前情况 | 需要处理的层 | 判断结果 |
| --- | --- | --- |
| VG 已有足够空闲空间 | 直接扩 LV | `vgs` 的 `VFree` 满足目标增量 |
| 给现有 VG 新增磁盘 | 新设备 → 新 PV → 加入 VG | `pvs` 出现新成员，`VFree` 增加 |
| 原磁盘在平台侧扩大 | 系统识别新容量 → 必要时扩大分区 → `pvresize` | 原 PV 变大，`VFree` 增加 |

例如，确认 `/dev/sdc` 是可清空的独立新盘，且未挂载、未被 LVM/RAID/交换空间使用后，可以将**整盘**加入现有卷组。`pvcreate` 会写入 LVM 元数据，不能用于已有数据的设备：

```bash title="仅适用于确认可清空的新盘"
sudo pvcreate /dev/sdc
sudo vgextend vgdata /dev/sdc
sudo pvs
sudo vgs
```

这里采用整盘 PV，不要再对这块盘创建分区。示例中的设备身份确认方法与[新磁盘初始化示例](#新磁盘初始化示例)相同。

如果平台扩大的是已有磁盘，应先用 `lsblk` 确认系统看到了新容量。PV 若在 `/dev/sdb1` 上，还需按实际布局扩大分区并让内核识别新边界，最后才运行 `sudo pvresize /dev/sdb1`；PV 若直接在整盘上，则对整盘执行 `pvresize`。扩大分区时必须保持原起始位置，不能通过重建文件系统“应用”新增空间。具体边界条件见 [pvresize(8)](https://man7.org/linux/man-pages/man8/pvresize.8.html)。

## 扩容：扩大 LV 和文件系统

假设 `/dev/vgdata/lvdata` 是普通 LV，已挂载到 `/data`，VG 至少还有 20 GiB 空闲空间。先确认设备与文件系统类型：

```bash title="扩容前检查"
findmnt -T /data -o SOURCE,TARGET,FSTYPE,OPTIONS
sudo lvs /dev/vgdata/lvdata
sudo vgs vgdata
```

然后扩大 LV：

```bash title="在现有大小上增加 20 GiB" "+20G"
sudo lvextend -L +20G /dev/vgdata/lvdata
```

`+20G` 表示增加 20 GiB；没有 `+` 时表示目标总大小。LV 扩大后，文件系统还需要使用新增空间。**以下两种命令按实际文件系统二选一。**

### XFS

XFS 扩容要求文件系统处于挂载状态，使用挂载点作为操作目标：

```bash title="扩大挂载在 /data 的 XFS"
sudo xfs_growfs /data
```

### ext4

现代 Linux 上的 ext4 通常支持在线扩容，操作目标是承载文件系统的块设备：

```bash title="扩大逻辑卷上的 ext4"
sudo resize2fs /dev/vgdata/lvdata
```

### 验证扩容结果

最后比较逻辑卷和文件系统大小：

```bash title="扩容后验证"
sudo lvs /dev/vgdata/lvdata
lsblk -f
findmnt -T /data
df -hT /data
```

这里预期 LV 和文件系统容量都增加，但 `df` 的可用空间不保证恰好增加 20 GiB：文件系统元数据、保留空间及期间的写入都会影响结果。若 `lvextend` 成功而文件系统扩容失败，应保留已扩大的 LV，检查原因后重试文件系统扩容，不要用 `lvreduce` 回退容量。

`lvextend -r` 可以在支持的环境中同时调整文件系统；分两步展示有助于明确哪一层失败。工具行为见 [lvextend(8)](https://man7.org/linux/man-pages/man8/lvextend.8.html)、[xfs_growfs(8)](https://man7.org/linux/man-pages/man8/xfs_growfs.8.html) 和 [resize2fs(8)](https://man7.org/linux/man-pages/man8/resize2fs.8.html)。

## 缩容与快照的边界

扩容和缩容不能简单反向操作。ext4 缩容需要卸载文件系统，按“备份 → 卸载 → 检查 → 缩文件系统 → 缩 LV → 挂载验证”的顺序处理。先缩 LV 可能截断文件系统仍在使用的区域。

XFS 的缩容能力应以发行版和工具版本正式支持的功能为准；在 RHEL 9 等常见部署中，应按不支持缩容规划，需要更小容量时采用迁移到新文件系统的方式，不把实验性能力作为通用操作方案。

LVM 快照保存某个时间点的卷视图，可辅助备份或短期回退，但它通常仍与原卷共享底层存储，不能替代独立备份。传统快照的写时复制空间耗尽会使快照失效；精简快照还受 thin pool 数据及元数据容量限制。数据库等应用也需要相应的一致性措施，不能把块层快照自动视为应用一致的备份。

深入操作可参考 [LVM 管理文档](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/)。

# 文件系统

文件系统在块空间中组织文件内容、目录和元数据。格式化、调整块设备容量、挂载文件系统是不同操作：`mkfs` 创建新的文件系统，扩容工具调整已有文件系统，`mount` 则把文件系统接入目录树。

## ext4 与 XFS

| 比较项 | ext4 | XFS |
| --- | --- | --- |
| 常见使用 | 通用 Linux 文件系统，生态成熟 | 通用文件系统，也常用于大容量和并行 I/O 场景 |
| 扩容 | 现代系统通常支持在线扩容 | 需要在挂载状态下扩容 |
| 缩容 | 支持离线缩容 | 常见发行版部署按不支持缩容规划 |
| inode 分配 | 创建文件系统时确定数量，扩容等操作可能改变总量 | 按需分配，仍受空间与配置限制 |
| 创建工具 | `mkfs.ext4` | `mkfs.xfs` |
| 常见离线检查工具 | `e2fsck` | `xfs_repair` |

两者都支持日志功能，但日志主要帮助文件系统在异常后恢复一致性，不能保证应用尚未持久化的数据不丢失。文件系统也不存在脱离工作负载的绝对性能排名，选型还要考虑发行版支持、备份工具和恢复需求。

:::caution[格式化会创建新的文件系统]
对已有数据的设备执行 `mkfs` 可能破坏原有文件系统。挂载失败、空间未增加或设备显示异常时，都不应把重新格式化当作修复步骤。
:::

## FAT32、exFAT 与 NTFS：跨系统交换数据

Linux 数据卷常用 ext4 或 XFS，但 U 盘、移动硬盘、Windows 分区和 EFI 系统分区还经常使用 FAT32、exFAT 或 NTFS。选择时除了容量，还要确认目标系统和设备的读写支持。

| 文件系统 | 常见用途 | 关键能力与限制 | Linux 中的常见类型或驱动名 |
| --- | --- | --- | --- |
| FAT32 | 广泛兼容的 U 盘、嵌入式设备及常见 ESP | 单个文件最大为 4 GiB − 1 字节；不提供原生 Unix 权限和日志 | `vfat` |
| exFAT | 需要跨 Windows、macOS、Linux 交换大文件的移动存储 | 支持超过 4 GiB 的文件；不提供原生 Unix 权限和文件系统日志，旧设备可能不支持 | `exfat` |
| NTFS | Windows 系统盘和数据盘、与 Windows 共享的磁盘 | 支持大文件、ACL 和元数据日志；Linux 下的权限映射及功能取决于驱动和挂载选项 | 内核 `ntfs3` 或用户态 `ntfs-3g` |

FAT32 的单文件限制与整个卷的容量是两回事：即使还有大量空闲空间，也无法保存一个 5 GiB 的文件。exFAT 解决了这类大文件交换需求，但不能因此认为所有只支持 FAT32 的设备都能识别 exFAT。FAT 的格式和 Linux 挂载行为可参考 [Linux VFAT 文档](https://docs.kernel.org/filesystems/vfat.html)，exFAT 的能力定义见 [Microsoft exFAT 规范](https://learn.microsoft.com/en-us/windows/win32/fileio/exfat-specification)。

FAT32 和 exFAT 不像 ext4 那样持久保存每个文件的 Unix 属主与权限，Linux 通常通过 `uid`、`gid`、`umask` 等挂载选项呈现访问权限。需要 Unix 权限、符号链接等语义的服务数据目录，不宜仅为跨系统兼容而改用这两种格式。

使用 NTFS 时先确认发行版安装和启用了哪一种驱动；内核 `ntfs3` 与 `ntfs-3g` 的选项和支持能力不能混用。Windows 休眠或快速启动留下的卷状态可能使读写挂载被拒绝，应回到 Windows 完成正常关闭和必要检查，不用强制挂载绕过保护。内核驱动能力见 [NTFS3 文档](https://docs.kernel.org/filesystems/ntfs3.html)。

对已有设备，先用 `lsblk -f` 或 `blkid` 识别实际类型。缺少驱动或工具时按发行版安装相应支持，不要为解决“无法挂载”直接格式化；可移动存储写入结束后应正常卸载再拔出。

## Btrfs 与其他常见挂载类型

**Btrfs** 是 Linux 上另一种本地文件系统，支持写时复制、数据与元数据校验、子卷和快照。它适合需要这些能力且发行版与维护工具支持的场景；快照与原数据共享存储，不等于独立备份。子卷、共享数据和元数据分配还会影响容量统计，不能只按普通分区大小理解，可结合 `btrfs filesystem usage <挂载点>` 查看。具体选择与维护边界见 [Btrfs 官方文档](https://btrfs.readthedocs.io/en/latest/)。

`findmnt` 还可能显示 `tmpfs`、`nfs` 或 `cifs`。这些应与本地磁盘文件系统区分：`tmpfs` 使用虚拟内存，可能使用交换空间，卸载或重启后数据不保留；NFS 和 SMB/CIFS 则通过网络访问远端存储。它们不是新建本地数据盘时与 ext4、FAT32 等直接互换的格式选项。

实际选择可以从用途出发：Linux 服务数据先考虑发行版支持的 ext4/XFS；需要子卷和快照等能力时评估 Btrfs；大文件跨系统交换常考虑 exFAT；兼容旧设备时核实 FAT32；已有 Windows 数据卷通常保留 NTFS 并确认驱动支持。

## inode、目录项与文件内容

以 ext4、XFS 等 Linux 文件系统为例，inode 保存文件类型、权限、属主、时间戳以及数据位置等元数据；目录项建立“名称 → inode”的关系。文件名属于目录内容，不是 inode 内部的文件名字段。不同文件系统的磁盘格式不同，不能把这套布局直接套到 FAT32 等格式上。

```text title="名称与文件的关系" frame="none"
/data/report.csv ──目录项──► inode ──► 文件数据
/data/report.bak ──目录项──► 同一个 inode（硬链接）
```

删除一个名称不一定立即释放数据：还要看是否存在其他硬链接，以及是否有进程仍然打开这个文件。最后一个名称被删除但文件仍被进程打开时，空间通常要等最后一个引用关闭后才释放。

## 分别检查容量和 inode

```bash title="两种空间限制"
df -hT /data
df -i /data
```

`df -hT` 查看文件系统类型、容量及使用量，`df -i` 查看 inode 使用情况。大量小文件可能让 ext4 的 inode 先于数据空间耗尽；XFS 虽然动态分配 inode，也仍可能受剩余空间及元数据分配限制。

inode 耗尽时，定位文件数量异常的目录往往比只寻找大文件更有效。配额也可能限制特定用户或项目，即使整个文件系统还有空闲空间，也不代表所有写入都能继续。

# 挂载与持久化配置

## 挂载点与当前状态

挂载把文件系统接到一个目录上。例如把 `/dev/sdb1` 挂载到 `/data` 后，访问 `/data` 就是在访问该文件系统。

```bash title="挂载一个已经创建文件系统的设备"
sudo mkdir -p /data
sudo mount /dev/sdb1 /data
findmnt --mountpoint /data
```

挂载会遮住目录中原有内容，不会自动搬迁或合并这些文件。因此应先检查挂载点是否已被使用、目录中是否有数据。

`findmnt -T /data` 查找承载该路径的文件系统，即使 `/data` 并非独立挂载点，也可能返回根文件系统；`findmnt --mountpoint /data` 则用于核实 `/data` 本身是否已挂载。这一区别在排查“数据写到系统盘”时尤其重要。

## UUID 与 `/etc/fstab`

手工 `mount` 不会自动生成开机挂载配置。`/etc/fstab` 描述持久挂载关系，通常使用文件系统 UUID，避免依赖可能变化的设备枚举名称。

```bash title="读取文件系统标识"
sudo blkid /dev/sdb1
```

例如，XFS 的配置行可以是：

```ini title="/etc/fstab：示例 UUID 需替换" "UUID=11111111-2222-4333-8444-555555555555"
UUID=11111111-2222-4333-8444-555555555555 /data xfs defaults 0 0
```

| 字段 | 本例值 | 含义 |
| --- | --- | --- |
| 文件系统来源 | `UUID=…` | 文件系统 UUID，不是 GPT 的 `PARTUUID` |
| 挂载点 | `/data` | 文件系统接入的目录 |
| 类型 | `xfs` | 文件系统类型 |
| 挂载选项 | `defaults` | 使用一组默认选项，具体效果还受文件系统及环境影响 |
| dump 标记 | `0` | 不由传统 `dump` 调度备份 |
| 检查顺序 | `0` | 不通过传统 fsck 启动检查流程检查 XFS |

非根 ext4 数据卷通常使用末字段 `2`，根文件系统常为 `1`，还需结合发行版启动机制。磁盘克隆可能复制文件系统 UUID，因此 UUID 也需要避免重复。

`nofail` 适用于允许缺盘时继续启动的数据盘，不应为消除错误而无条件添加。若业务必须依赖 `/data`，还应确保服务在挂载失败时不会继续向根文件系统中的同名目录写入；systemd 服务可通过 `RequiresMountsFor=/data` 声明挂载依赖。

## 检查配置与实际挂载

编辑前备份 `fstab`，编辑后先检查其可解析性和可用性：

```bash title="检查 fstab"
sudo findmnt --verify --verbose
```

在 systemd 系统上，修改后还应让管理器重新加载配置：

```bash title="仅适用于 systemd 系统"
sudo systemctl daemon-reload
```

对尚未挂载的新数据卷，可以执行 `sudo mount /data`，让 `mount` 从 `fstab` 读取来源、类型和选项，再用 `findmnt --mountpoint /data` 确认结果。

:::important[配置检查不等于实际挂载成功]
`findmnt --verify` 不会真正挂载文件系统；`mount -a` 则会尝试挂载符合条件的 fstab 条目，并通常跳过已经挂载的文件系统。因此，`mount -a` 没有报错不能证明已有挂载的选项已经更新，也不能保证下次启动的所有依赖都满足。
:::

对已使用的文件系统，应在合适的维护条件下验证重新挂载或卸载后挂载，不要为了测试配置直接中断业务。配置字段与行为见 [fstab(5)](https://man7.org/linux/man-pages/man5/fstab.5.html)、[mount(8)](https://man7.org/linux/man-pages/man8/mount.8.html) 和 [findmnt(8)](https://man7.org/linux/man-pages/man8/findmnt.8.html)。

## 卸载与占用检查

```bash title="卸载数据卷"
sudo umount /data
```

出现 `target is busy` 时，先退出位于该挂载点内的工作目录，再检查进程和子挂载：

```bash title="定位挂载点占用"
findmnt -R /data
sudo fuser -vm /data
```

让相关应用关闭文件或正常停止后，再重新卸载。`umount -l` 的延迟卸载不会立刻结束所有引用，不能把它作为后续格式化或修复已具备安全条件的证明。

# 新磁盘初始化示例

目标是在一块**确认可清空的新数据盘** `/dev/sdb` 上建立 GPT 分区和 XFS，并挂载到 `/data`。这是一个独立示例，不与其他章节中的 LVM 布局叠加；系统盘、已有 RAID 成员或 PV 不适用。

示例按常见的 systemd/udev 系统编写，需要 `parted`、`xfsprogs`、`util-linux`，以及用于检查现有 PV 的 `lvm2`。命令中的 `/dev/sdb` 只是示例设备名，不能据此认定真实机器上的同名设备就是新盘。

## 1. 确认设备身份与挂载点

```bash title="修改前只读检查"
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS,MODEL,SERIAL
sudo fdisk -l /dev/sdb
sudo wipefs --no-act /dev/sdb
sudo pvs
cat /proc/mdstat
swapon --show
findmnt --mountpoint /data
```

结合序列号、容量、平台分配记录或物理槽位确认目标。若已有分区，还需逐个检查其文件系统签名和用途；设备没有挂载也可能正在被 LVM、RAID、交换空间或其他程序使用。

`findmnt --mountpoint /data` 没有结果仅表示它不是当前挂载点。若目录已经存在，还要检查是否为空；若是符号链接或已有业务数据，先解决路径和迁移问题再继续。

:::caution[下面的操作会改写目标设备]
`mklabel` 会写入新的分区表，`mkfs.xfs` 会创建文件系统。只有设备身份、已有用途和数据保留要求都已确认后，才继续执行。发现旧签名或命令拒绝操作时先调查，不添加强制选项绕过保护。
:::

## 2. 创建分区并等待系统识别

```bash title="在确认可清空的 /dev/sdb 上创建 GPT"
sudo parted --script /dev/sdb mklabel gpt
sudo parted --script --align optimal /dev/sdb mkpart data xfs 1MiB 100%
sudo partprobe /dev/sdb
sudo udevadm settle
lsblk -o NAME,SIZE,TYPE,FSTYPE /dev/sdb
```

这里的 `data` 是 GPT 分区名称，`xfs` 是分区创建时的文件系统类型提示，文件系统尚未创建。确认 `/dev/sdb1` 已出现且大小符合预期；内核若无法重新读取分区表，应停止并检查占用情况。

## 3. 创建文件系统并临时挂载

```bash title="创建 XFS 并验证挂载"
sudo mkfs.xfs /dev/sdb1
sudo mkdir -p /data
sudo mount /dev/sdb1 /data
findmnt --mountpoint /data -o SOURCE,TARGET,FSTYPE,OPTIONS
df -hT /data
```

预期来源为新分区，类型为 `xfs`，目标为 `/data`。新文件系统顶层目录通常由 root 拥有，后续应按应用用户分配目录和权限，不能用放开所有权限代替权限规划。

## 4. 保存配置并验证通过 fstab 挂载

读取 UUID，并备份、编辑配置：

```bash title="准备持久化配置"
sudo blkid /dev/sdb1
sudo cp --backup=numbered /etc/fstab /etc/fstab.before-data
sudoedit /etc/fstab
```

加入一行，将占位内容替换为实际 UUID：

```ini title="加入 /etc/fstab 的 XFS 条目"
UUID=<实际文件系统UUID> /data xfs defaults 0 0
```

检查配置；以下按 systemd 系统示范：

```bash title="校验配置并重新加载"
sudo findmnt --verify --verbose
sudo systemctl daemon-reload
```

本例是尚未交给业务使用的新文件系统，可以退出该目录后卸载，再只指定挂载点进行挂载，以确认 fstab 条目被实际使用：

```bash title="仅针对本例的新数据卷验证"
cd /
sudo umount /data
sudo mount /data
findmnt --mountpoint /data -o SOURCE,TARGET,FSTYPE,OPTIONS
df -hT /data
```

每一步失败都应先处理原因，不继续执行后续步骤。对照来源、类型、挂载点和容量确认结果后，再交给应用使用；不需要通过立即重启来试错。

# 容量、性能与故障定位

从出问题的路径开始，先确认文件系统和设备，再判断异常属于哪一层。先收集状态与日志，有助于避免把上层症状误当成下层故障。

| 症状 | 第一组检查 | 重点区分 |
| --- | --- | --- |
| 无法继续写入 | `df -hT`、`df -i`、配额 | 数据空间、inode、配额限制 |
| `df` 高而 `du` 不高 | `findmnt`、`du -x`、`lsof +L1` | 检查范围、已删除仍打开的文件、被挂载遮住的数据 |
| 挂载失败 | `lsblk -f`、`blkid`、内核日志 | 设备、类型、参数、底层 I/O 错误 |
| 只读或 I/O 错误 | `findmnt`、`journalctl -k` | 配置只读、保护性只读、文件系统关闭或设备故障 |
| 扩容后容量未增加 | `lsblk`、`pvs`、`vgs`、`lvs`、`df` | 容量停留在哪一层 |
| 响应变慢 | `iostat`、`pidstat`、内核日志 | 工作负载变化、排队、重建、设备错误 |

## 空间不足：容量、inode 与配额

假设异常路径位于 `/data`：

```bash title="确认路径归属与空间限制"
findmnt -T /data
df -hT /data
df -i /data
sudo du -xhd1 /data
```

`du -x` 限制在同一个文件系统内统计，避免把嵌套挂载也计算进来；`-d1` 先看一层目录，找到占用大的目录后再向下缩小范围。它需要遍历目录，大目录树上可能有明显 I/O 开销。

- **容量满**：检查日志增长、临时文件、保留策略与业务数据，明确数据用途后再清理或扩容。
- **inode 满**：关注缓存、会话、队列等大量小文件目录；GNU `du --inodes -x -d1 /data` 可辅助查找。
- **总空间充足但特定用户写入失败**：检查用户、组或项目配额；工具取决于文件系统与配额配置。

`No space left on device` 不只表示物理磁盘字节用完；`Disk quota exceeded` 则通常应优先检查配额。容器中还可能受自己的可写层、挂载命名空间或平台限制影响。

## `df` 与 `du` 为什么不同

`df` 统计文件系统分配情况，`du` 遍历可见目录并统计文件占用，两者口径不同。先确认统计的是同一个文件系统，并考虑权限不足、文件系统元数据和保留空间。

```bash title="查找链接数为零但仍被打开的文件"
sudo lsof +L1
```

结合设备、路径、进程和文件大小判断是否与目标文件系统有关。若日志被删除但服务仍保持文件描述符，应按服务支持的方式重新打开日志，或安排正常重启；再比较 `df` 的变化。再次删除路径并不能释放那个已无名称的文件。

还有一种情况是：应用先向 `/data` 写入数据，随后在该目录挂载了另一文件系统。旧数据被遮住，但仍占用原文件系统的空间。检查这些数据需要合适的维护或独立查看方式，不应直接卸载正在使用的业务文件系统。

## 挂载失败或挂载点忙

```bash title="收集挂载失败的上下文"
lsblk -f
sudo blkid /dev/sdb1
sudo findmnt --verify --verbose
sudo journalctl -k -b -n 100 --no-pager
```

按错误信息缩小范围：

1. **设备或 UUID 不存在**：检查设备是否识别、阵列是否组装、LV 是否激活，以及配置是否引用了旧 UUID。
2. **类型、选项或超级块相关错误**：核对实际文件系统类型、内核支持与挂载参数；通用报错不能单独证明文件系统损坏。
3. **目标目录不合适**：检查路径、权限、现有挂载和子挂载。
4. **出现 timeout、reset 或 I/O error**：继续检查控制器、链路、磁盘和阵列，不要只反复尝试挂载。

没有 systemd 日志的环境可查看 `sudo dmesg`。挂载点忙时结合 `findmnt -R /data` 和 `fuser -vm /data` 定位占用；不要直接强制终止未知业务进程。

## 只读、文件系统错误与修复边界

```bash title="检查实际挂载选项与内核错误"
findmnt -T /data -o SOURCE,TARGET,FSTYPE,OPTIONS
sudo journalctl -k -b -n 200 --no-pager
```

只读可能来自显式 `ro` 配置，也可能是文件系统错误后的保护行为。不同文件系统的反应不一样：ext4 可以按错误策略重新挂载为只读，XFS 遇到严重错误可能进入 shutdown 状态，此时即使挂载选项仍显示 `rw`，读写也可能返回错误。

先确认底层存储健康，再制定备份、维护和修复方案。不要把 `mount -o remount,rw` 当成通用修复，也不要直接对仍在使用的文件系统运行离线修复工具。

| 文件系统 | 离线只检查、不修改的常用入口 | 条件与限制 |
| --- | --- | --- |
| ext4 | `e2fsck -fn <设备>` | 文件系统应已卸载；挂载状态下的检查结果不可靠 |
| XFS | `xfs_repair -n <设备>` | 文件系统应已卸载；未回放的日志可能阻止完整检查 |

即便是不修改模式，也需要考虑故障盘的读取压力。介质持续报错时应优先考虑数据保护，而不是反复扫描。XFS 的 `xfs_repair -L` 会清除日志，可能丢失元数据更新，不应作为默认选项。

维护条件和恢复限制见 [e2fsck(8)](https://man7.org/linux/man-pages/man8/e2fsck.8.html) 与 [xfs_repair(8)](https://man7.org/linux/man-pages/man8/xfs_repair.8.html)。

## RAID 降级与 LVM 容量异常

RAID 降级时先使用 `cat /proc/mdstat` 和 `mdadm --detail` 确认成员及重建状态；硬件 RAID 则使用控制器工具。重建会增加剩余成员负载，阵列仍可读写不代表冗余已经恢复。

LVM 容量异常可以逐层比较：

```text title="容量检查顺序" frame="none"
lsblk：磁盘、分区是否已变大？
   ↓
pvs：PV 是否已经识别新增空间？
   ↓
vgs：VG 是否有可分配的空闲空间？
   ↓
lvs：目标 LV 是否已扩大？
   ↓
findmnt + df：是否查看了正确的文件系统，它是否已扩容？
```

如果 LV 已经变大而 `df` 没变化，通常应检查文件系统扩容步骤；如果 PV 缺失，先检查设备、阵列与连接状态，不能对原设备重新执行 `pvcreate`。

## I/O 性能：把指标与负载一起看

存储性能至少包含三个维度：

| 指标 | 含义 | 解读时需要的背景 |
| --- | --- | --- |
| IOPS | 每秒完成或处理的 I/O 数量，具体口径取决于工具 | 请求大小、随机或顺序、读写比例 |
| 吞吐量 | 单位时间传输的数据量 | 块大小、并发、链路和设备能力 |
| 延迟 | 请求完成所需时间 | 平均值、尾延迟、队列深度及业务要求 |

同样是 10,000 IOPS，4 KiB 请求对应的吞吐量约为 39 MiB/s，1 MiB 请求则约为 9.8 GiB/s。因此不能脱离请求大小比较 IOPS，也不能拿顺序大块吞吐量推断数据库随机访问表现。

安装 `sysstat` 后，可持续观察设备与进程：

```bash title="观察区间统计，按 Ctrl+C 结束"
iostat -xz -y 1
pidstat -d 1
```

两条命令可在不同终端运行。`iostat` 的 `-y` 跳过启动以来的首份累计报告，便于观察当前区间。常用字段如下，具体名称可能随版本变化：

| 字段 | 含义 | 不应直接推导的结论 |
| --- | --- | --- |
| `r/s`、`w/s` | 每秒设备读写请求数 | 不等于应用每秒系统调用次数 |
| `rkB/s`、`wkB/s` | 读写吞吐量 | 高吞吐不一定意味着高延迟 |
| `r_await`、`w_await` | 平均请求耗时，包含排队和服务时间 | 不是仅在设备内部处理的时间，也不是尾延迟 |
| `aqu-sz` | 平均未完成请求数量，旧版本常称 `avgqu-sz` | 队列深并不必然异常，要结合延迟与吞吐 |
| `%util` | 统计区间内设备有 I/O 处理的时间比例 | 对并行 SSD、RAID，接近 100% 不等于已用尽全部性能 |

`%iowait` 是 CPU 时间统计中的一个类别，不是磁盘忙碌率，也不能直接定位哪块盘出现瓶颈。应把设备延迟、队列、吞吐、应用响应时间与正常基线一起比较，并检查是否存在阵列重建、备份扫描、温度节流、链路重置等变化。

如果需要继续确认设备健康，可按设备类型使用 `smartctl -a <设备>` 或 `nvme smart-log <控制器设备>`；硬件 RAID 后的磁盘可能需要控制器专用透传参数。健康状态正常也不能排除链路或性能问题。

指标定义见 [iostat(1)](https://man7.org/linux/man-pages/man1/iostat.1.html)。内核请求队列的实现细节可继续阅读 [blk-mq](https://docs.kernel.org/block/blk-mq.html)。

# 参考资料

以下资料用于核对术语、操作条件和实现差异；实际操作以所用发行版和本机工具版本的手册为准。

| 主题 | 资料 | 可进一步查阅的内容 |
| --- | --- | --- |
| NVMe | [NVM Express Specifications](https://nvmexpress.org/specifications/) | 基础规范、命令集、PCIe 与网络传输规范 |
| SATA | [SATA-IO：The SATA Ecosystem](https://sata-io.org/developers/sata-ecosystem) | SATA 技术及外形生态 |
| SCSI 与 SAS | [T10 Technical Committee](https://www.t10.org/) | SCSI 架构、命令集与 SAS 标准 |
| 固件与分区 | [UEFI Specifications](https://uefi.org/specifications) | UEFI、GPT 与 ESP 定义 |
| Linux 存储管理 | [RHEL 9：Managing Storage Devices](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/) | 设备识别、存储管理与平台支持条件 |
| LVM | [RHEL 9：Configuring and Managing Logical Volumes](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/) | 卷管理、快照与容量调整 |
| 软件 RAID | [Linux MD](https://docs.kernel.org/admin-guide/md.html) | 阵列状态、同步、恢复及内核接口 |
| 命令参数 | [Linux manual pages](https://man7.org/linux/man-pages/) | `lsblk`、`mount`、`mdadm`、LVM 与文件系统工具手册 |
