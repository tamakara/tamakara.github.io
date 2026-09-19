---
title: Linux：文件与目录管理
published: 2026-09-13T02:06:57Z
description: 'Linux 通过一棵从根目录 / 开始的目录树组织文件。'
updated: 2026-09-19
image: ''
tags: [Linux, 文件, 目录, FHS, 路径]
category: 学习笔记
draft: false
lang: ''
---

Linux 通过一棵从根目录 / 开始的目录树组织文件。路径用于定位对象，文件系统负责保存对象，挂载把文件系统接入目录树。目录不一定对应独立磁盘，设备文件也不是普通数据文件。

# 目录布局与路径

## 常见目录

[FHS](https://refspecs.linuxfoundation.org/fhs.shtml) 定义常见布局约定，发行版和应用可以存在差异。现代系统常采用 usr merge，例如 /bin 链接到 /usr/bin。

| 目录 | 用途 |
|---|---|
| /etc | 系统和服务配置 |
| /home、/root | 普通用户及 root 的家目录；/root 与根目录 / 不同 |
| /usr | 用户空间程序、库和共享数据，不是个人文件目录 |
| /usr/local、/opt | 本机管理的软件、附加软件 |
| /var/log、/var/lib、/var/cache | 日志、持久状态、可再生成的缓存 |
| /tmp、/run | 临时数据、运行时状态；不能作为持久存储 |
| /dev | 块设备、字符设备等设备节点 |
| /proc、/sys | 进程、内核、设备和驱动信息接口 |
| /boot | 内核及启动相关文件 |
| /mnt、/media | 临时挂载、可移动介质，实际位置依发行版而异 |
| /srv | 本机服务提供的数据，应用不一定默认采用 |

/tmp 是否清理由系统策略决定，不能假设固定在每次重启时清空。/proc 和 /sys 的许多内容由内核动态生成，修改可写条目可能改变系统行为。

## 绝对路径与相对路径

绝对路径从 / 开始，相对路径以当前工作目录为起点。句点表示当前目录，两个句点表示父目录。Bash 中未引用的 ~ 会展开为家目录，而 `"~/file"` 通常不会展开；需要引用时用 `"$HOME/file"`。

```bash title="先确认位置"
pwd
pwd -P
ls -lah
```

pwd 默认可能保留逻辑符号链接路径，pwd -P 显示物理路径。自动化操作用明确路径，并检查 cd 是否成功，避免在错误目录继续执行。

# 文件类型与元数据

## 识别对象

| ls -l 首字符 | 类型 |
|---|---|
| - | 普通文件 |
| d | 目录 |
| l | 符号链接 |
| b、c | 块设备、字符设备 |
| p、s | 命名管道、Unix 域套接字 |

文件扩展名是命名约定，不保证实际内容类型。以句点开头的名称通常被普通 ls 隐藏，这不是权限保护。

```bash title="查看文件属性"
ls -ld /etc /etc/hosts
file /etc/hosts
stat /etc/hosts
```

file 根据内容及其他信息推测格式，stat 查看大小、权限、所有者、inode 和时间。mtime 是内容修改时间，ctime 是 inode 状态变更时间，不能把 ctime 当作创建时间；atime 的更新受挂载策略影响。创建时间是否可用取决于文件系统和工具支持。

# 查看与查找

## 阅读文本

| 需求 | 命令 | 注意 |
|---|---|---|
| 小文件 | `cat /etc/hosts` | 不直接输出未知二进制文件 |
| 大文本 | `less app.log` | / 搜索，n 继续，q 退出 |
| 开头 / 结尾 | `head -n 20 app.log` / `tail -n 50 app.log` | 先判断数据格式和时间范围 |
| 跟踪日志 | `tail -F app.log` | GNU tail 按文件名跟踪并重试，适合重命名轮转 |
| 计数 | `wc -l app.log` | 统计换行符，末尾无换行的记录可能不计入 |

tail -f 默认跟踪打开的文件描述符；轮转后可能仍观察旧文件。跟踪输出不完整时，应确认日志实际位置及轮转方式。

## 查找对象

```bash title="限制搜索范围"
find /var/log -type f -name '*.log'
find /var/log -type f -size +100M
find /var/log -type f -mtime -1
```

-name 使用文件名通配符，必须引用，防止先由 Shell 展开。GNU find 的 M 以 MiB 为单位并按单位向上取整比较；-mtime -1 表示不足一个 24 小时周期，不是自然日“今天”。权限错误表示未能完整遍历，不应忽略后声称搜索无遗漏。

# 创建、复制、移动与删除

## 常用操作

| 操作 | 示例 | 验证 |
|---|---|---|
| 创建目录 | `mkdir -p project/config` | ls -ld 确认层级 |
| 创建空文件或更新时间 | `touch project/config/app.conf` | stat；已有内容不会清空 |
| 复制文件 | `cp -i app.conf app.conf.bak` | cmp 或 diff |
| 保留属性复制目录 | `cp -a project project-backup` | 检查内容、所有者和权限 |
| 重命名 | `mv -i old.conf new.conf` | 确认新旧路径 |
| 删除空目录 | `rmdir empty-dir` | 非空时拒绝删除 |
| 删除文件 | `rm -i -- obsolete.txt` | 确认对象确实不再需要 |

cp 和 mv 的目标是已有目录时，会把源放入该目录，不一定覆盖目录本身。GNU 工具的 -- 结束选项解析，适合处理以短横线开头的名称。跨文件系统 mv 需要复制再删除，不应视作原子重命名。

:::warning[删除与覆盖]
rm 通常不经过回收站。递归操作前确认绝对路径、挂载关系和匹配范围，不把 rm -rf 作为默认方式。交互确认不能代替备份；操作前后目录仍可能被其他程序修改。
:::

## 示例：准备配置副本

在独立练习目录执行，所有路径都由本次创建的临时目录限定：

```bash title="创建、复制、修改并核对"
demo_dir=$(mktemp -d)
mkdir -p "$demo_dir/config"
printf 'port=8080\n' > "$demo_dir/config/app.conf"
cp -p "$demo_dir/config/app.conf" "$demo_dir/config/app.conf.bak"
printf 'port=9090\n' > "$demo_dir/config/app.conf"
diff -u "$demo_dir/config/app.conf.bak" "$demo_dir/config/app.conf"
```

预期差异只包含端口变化。diff 返回 1 表示存在差异，不是工具故障；真实配置还需应用自己的检查和重载验证。本例保留临时目录便于检查，不执行自动递归清理。

# 链接

## 硬链接与符号链接

inode 保存文件元数据并关联数据；目录项把名称关联到 inode。硬链接增加一个指向同一 inode 的名称，符号链接则是保存目标路径的独立对象。

| 维度 | 硬链接 | 符号链接 |
|---|---|---|
| 创建 | ln source alias | ln -s target link |
| 跨文件系统 | 不支持 | 可以 |
| 目录目标 | 一般不允许创建目录硬链接 | 支持 |
| 删除一个名称 | 其他硬链接仍能访问 | 目标被删后可能悬空 |
| 修改内容 | 所有硬链接看到同一文件变化 | 跟随路径访问目标 |

相对符号链接的目标以**链接所在目录**为基准，不是创建时任意工作目录。用 readlink 查看保存的路径，用 readlink -f 解析实际路径；解析成功与文件存在仍应分别确认。

## 使用时的判断

多个硬链接不是独立备份。删除所有目录项后，如果进程仍打开文件，空间可能继续占用。符号链接切换也不保证运行中的服务重新读取目标，需按应用机制重载并检查。

# 挂载与空间定位

挂载将文件系统接到目录上；原目录已有内容会被遮挡，并未因此删除。不要在未确认挂载成功时把业务数据写入预期挂载点。

```bash title="确认路径实际使用的文件系统"
findmnt -T /var/log
df -hT /var/log
df -i /var/log
du -xhd1 /var/log
```

df 报告文件系统整体用量，du 汇总可遍历对象占用。GNU du 的 -x 限定同一文件系统。差异可能来自权限、已删除但仍打开的文件、快照、稀疏文件或元数据，不能据此直接认定统计错误。

# 常见问题

| 症状 | 检查与下一步 |
|---|---|
| 文件存在但无法读取 | 路径中每一级目录的搜索权限、文件权限、ACL 和安全策略 |
| 链接失效 | readlink，确认相对基准与目标存在性 |
| 删除后空间未回收 | 检查打开的已删除文件；按服务机制关闭或重开，不盲目杀进程 |
| 写入提示空间不足 | df -h 与 df -i，区分块空间和 inode |
| 复制后权限异常 | 复制选项、执行身份、目标文件系统是否支持属性 |

# 参考资料

- [FHS 3.0](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html)
- [GNU Coreutils](https://www.gnu.org/software/coreutils/manual/)
- [GNU Findutils](https://www.gnu.org/software/findutils/manual/)
- [Linux path_resolution(7)](https://man7.org/linux/man-pages/man7/path_resolution.7.html)
