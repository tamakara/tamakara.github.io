---
title: Linux：软件包管理与常用工具
published: 2026-09-13T02:20:46Z
description: '软件包管理器负责安装、升级和跟踪软件及其依赖。'
updated: 2026-09-19
image: ''
tags: [Linux, 软件包管理, RPM, DNF, 常用工具, 运维]
category: 学习笔记
draft: false 
lang: ''
---

软件包管理器负责安装、升级和跟踪软件及其依赖。日常维护应先确认发行版、软件来源和变更影响，再验证软件是否真正可用。

# 软件包与软件源

| 生态 | 包格式与底层工具 | 常用上层工具 |
| --- | --- | --- |
| Debian、Ubuntu | .deb、dpkg | APT：交互使用 apt，脚本通常使用 apt-get |
| Fedora、RHEL 系列 | .rpm、RPM | DNF，旧版本系统也可能使用 YUM |

底层工具管理本地包及安装记录，上层工具结合软件源解析和下载依赖。不同发行版及版本的软件包不能仅凭扩展名通用安装。DNF 4 与 DNF 5 的部分选项和插件行为不同，应以本机版本手册为准。

软件源决定能安装什么版本、由谁提供维护。使用发行版或软件项目认可的仓库，核对签名密钥来源；HTTPS 和包签名解决不同问题，不能通过关闭签名校验来处理仓库错误。

```bash title="确认环境"
cat /etc/os-release
command -v apt
command -v dnf
```

未找到某个命令在这里是正常结果，后续只选择适合当前发行版的一组命令。

# 查询与安装

| 任务 | APT 系统 | DNF 系统 |
| --- | --- | --- |
| 搜索软件 | apt search nginx | dnf search nginx |
| 查看候选包信息 | apt show nginx | dnf info nginx |
| 查看已安装版本 | dpkg-query -W nginx | rpm -q nginx |
| 查看包内文件 | dpkg -L nginx | rpm -ql nginx |
| 查找已安装文件归属 | dpkg -S /usr/bin/curl | rpm -qf /usr/bin/curl |

软件名、包名和可执行文件名不一定一致。查看来源与候选版本后，再安装所需软件。例如安装 `curl`：

```bash title="Debian / Ubuntu"
sudo apt update
apt policy curl
sudo apt install curl
curl --version
```

```bash title="Fedora / RHEL 系列"
dnf info curl
sudo dnf install curl
curl --version
```

安装前阅读事务清单，确认是否要移除、替换或升级其他包。包安装成功只说明包事务完成；对于服务，还需验证配置、监听地址和实际请求。

## 更新与卸载

`apt update` 更新软件包索引，不升级已安装软件。`dnf check-update` 检查可用更新；返回码 `100` 表示有更新，不能在自动化中一律当作命令失败。

升级前查看受影响的服务、兼容性说明和重启要求。数据库等有状态服务还需要可恢复的备份。不要把一次全系统升级当作解决某个依赖问题的默认步骤。

卸载时先查看即将移除的包和依赖。APT 的 `remove` 与 `purge` 对包配置的处理不同，但两者都不意味着所有业务数据一定被删除或保留；以软件的数据路径和卸载脚本为准。

# 归档、压缩与文件传输

## tar、gzip 与 zip

归档把多个对象装入一个文件；压缩减少数据体积。`tar` 常用于归档，`gzip` 压缩数据流，ZIP 则同时支持多文件封装与压缩。

假设当前目录包含要归档的 `reports/`，且目标文件不存在：

```bash
tar -czf reports.tar.gz reports/
tar -tzf reports.tar.gz
mkdir restore-preview
tar -xzf reports.tar.gz -C restore-preview
```

先查看归档成员，再解压到新目录，检查内容后再使用。不要直接以 root 将不明归档解压到系统目录。`gzip 文件` 通常用压缩文件替换原文件；需要保留源文件时可以使用 `gzip -c 文件 > 文件.gz`，并避免覆盖已有目标。

## rsync 与 scp

`scp` 适合简单复制；现代 OpenSSH 的 scp 默认使用 SFTP 传输。`rsync` 适合比较并增量同步，远端通常也需要安装 rsync。

```bash title="先预览，再同步"
rsync -ani ./reports/ backup@example.com:/srv/backup/reports/
rsync -ai ./reports/ backup@example.com:/srv/backup/reports/
```

示例地址需要替换，远端目录应已授权给该用户。`reports/` 表示复制目录内容；不带尾部斜杠时通常还会包含该目录名。核对预览中的目标路径，再执行正式同步。

同步不等于保留历史备份：误改的数据也可能被同步。默认不要增加 `--delete`；它会删除目标侧多余文件，需要单独审阅删除清单。

# 会话与辅助工具

| 需求 | 工具 | 使用边界 |
| --- | --- | --- |
| 网络断开后继续交互任务 | tmux | 会话可重连，但不替代服务管理和故障重启 |
| HTTP 请求检查 | curl | 区分 DNS、连接、TLS 和 HTTP 状态 |
| JSON 筛选 | jq | 先确认字段结构和缺失值处理 |
| 设备与进程 I/O 采样 | sysstat 中的 iostat、pidstat | 连续采样并结合业务负载判断 |
| 文件传输终端集成 | rz、sz | 需要终端支持相应协议，并非所有 SSH 客户端可用 |

```bash title="tmux 基本操作"
tmux new -s maintenance
```

在会话中按 `Ctrl+b`，再按 `d` 分离；使用 `tmux attach -t maintenance` 重新连接。`tmux ls` 可确认会话是否仍在。需要开机启动、重启策略和日志管理的长期进程应交给服务管理器。

# 常见问题

| 症状 | 优先检查 |
| --- | --- |
| 找不到软件包 | 发行版版本、软件源、索引是否更新及真实包名 |
| 仓库签名失败 | 系统时间、密钥来源、仓库地址和密钥轮换公告 |
| 包管理器被锁定 | 是否有其他安装或自动更新进程；不要直接删除锁文件 |
| 已安装却找不到命令 | 包文件列表、PATH、实际提供命令的子包 |
| 升级后行为变化 | 版本说明、配置差异、服务日志及回退条件 |

# 参考资料

- [Debian：APT](https://www.debian.org/doc/manuals/debian-reference/ch02.en.html)
- [DNF 命令参考](https://dnf.readthedocs.io/en/latest/command_ref.html)
- [GNU tar 手册](https://www.gnu.org/software/tar/manual/)
- [rsync 手册](https://download.samba.org/pub/rsync/rsync.1)
