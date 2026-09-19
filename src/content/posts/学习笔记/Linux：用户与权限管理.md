---
title: Linux：用户与权限管理
published: 2026-09-13T05:18:13Z
description: 'Linux 通过用户身份、用户组和权限控制资源访问。'
updated: 2026-09-19
image: ''
tags: [Linux, 用户, 用户组, 权限, 安全]
category: 学习笔记
draft: false 
lang: ''
---

Linux 通过用户身份、用户组和权限控制资源访问。排查权限问题时，需要同时确认进程以谁的身份运行、路径各级目录是否可进入，以及是否存在 ACL 或安全策略限制。

# 用户与用户组

用户以 UID 标识，组以 GID 标识；用户名只是便于使用的名称。一个用户有一个主组，还可以属于多个附加组。服务通常使用专用账户运行，避免共享管理员身份。

`/etc/passwd` 保存本地账户信息，`/etc/shadow` 保存受保护的密码相关信息；目录服务中的账户不一定出现在这些文件里。查询系统实际采用的身份信息应使用：

```bash title="查询身份"
id
id alice
getent passwd alice
getent group project
```

`id` 不带用户名时显示当前进程的身份；带用户名时查询账户配置。管理员修改附加组后，已有会话通常仍使用原来的组列表，需要重新登录。

## 创建账户与调整组

以下示例由管理员执行，假设 `alice` 和 `project` 尚不存在，且系统提供 shadow-utils：

```bash
sudo groupadd project
sudo useradd -m -s /bin/bash alice
sudo passwd alice
sudo usermod -aG project alice
id alice
```

`-m` 创建家目录，`-aG` 追加附加组。单独使用 `usermod -G` 会替换原有附加组。服务账户的创建参数应遵循软件包或发行版约定，不必为其设置交互式密码。

锁定密码不等于撤销所有访问：SSH 公钥、现有会话和其他认证方式可能仍有效。停用账户时要一起检查授权密钥、会话、计划任务和文件归属；删除账户前先明确数据保留要求。

# 文件与目录权限

`ls -l` 中的 `rwxr-xr--` 对应八进制 `754`：属主读写执行，属组读执行，其他用户只读。普通权限按属主、属组、其他用户选择匹配类别，并不是把三组权限相加。

| 权限 | 普通文件 | 目录 |
| --- | --- | --- |
| r | 读取文件内容 | 列出目录中的名称 |
| w | 修改文件内容 | 配合 x 创建、删除或重命名目录项 |
| x | 尝试执行文件，仍受格式和其他策略限制 | 穿过目录，访问已知名称的对象 |

删除文件主要受父目录权限控制，并不要求文件本身可写。访问深层文件时，路径上的每一级目录都需要搜索权限。

```bash title="查看与调整权限"
ls -ld /srv/project
ls -l /srv/project/report.txt
namei -l /srv/project/report.txt
chmod u=rw,g=r,o= /srv/project/report.txt
```

最后一条命令要求当前用户是文件属主或具备相应权限，将权限设为 `640`。更改属主通常需要管理员权限；不要为解决单个文件问题直接递归修改整棵目录。

## umask 与特殊权限

新文件权限由程序请求的权限去掉 `umask` 屏蔽的位得到，并非普通算术减法。常见程序请求普通文件 `666`、目录 `777`；`umask 027` 通常得到 `640` 和 `750`。默认 ACL 会影响这一过程。

| 机制 | 常见用途 | 边界 |
| --- | --- | --- |
| SUID | 可执行文件按文件属主身份取得有效 UID | 受挂载和安全策略限制；Linux 不按脚本的 SUID 位提升权限 |
| SGID | 目录中新建对象继承目录所属组 | 不会自动授予组写权限 |
| Sticky bit | 共享目录中限制删除或重命名他人文件 | 常见于 /tmp；仍需考虑目录属主和特权用户 |
| ACL | 为指定用户、组设置额外访问规则 | ACL mask 可能限制有效权限 |

使用 `getfacl 路径` 查看 ACL，关注输出中的 `effective`；不能只看某条 ACL 是否写了 `w`。

# 建立共享工作目录

假设 `project` 组和成员已经存在，`/srv/project` 是计划新建的目录，文件系统支持 ACL，系统已安装 `setfacl`：

```bash
sudo mkdir /srv/project
sudo chown root:project /srv/project
sudo chmod 2770 /srv/project
sudo setfacl -d -m u::rwx,g::rwx,m::rwx,o::--- /srv/project
getfacl /srv/project
```

SGID 保证新文件继承 `project` 组，默认 ACL 使常规创建的文件保留组协作权限。程序若明确请求更严格的权限，默认 ACL 不能强行扩大权限。

成员重新登录后，在该目录创建一个测试文件，检查其所属组和 ACL，再由另一位成员验证能否修改。确认成功后删除测试文件。已有文件不会因为目录增加默认 ACL 而自动改变。

# sudo 与最小授权

`sudo` 根据策略以其他身份执行命令。通过 `sudo -l` 查看当前授权，使用 `visudo` 或 `visudo -f /etc/sudoers.d/文件名` 编辑规则并检查语法。

授权应限定需要的操作。允许任意编辑器、Shell，或允许以 root 执行普通用户可修改的脚本，往往等于授予完整管理员权限。规则文件的属主和权限也必须满足 sudo 的要求。

# 权限问题排查

| 症状 | 检查 | 判断与下一步 |
| --- | --- | --- |
| 文件可读却无法打开 | id、namei -l、getfacl | 检查路径搜索权限和 ACL mask |
| 加组后仍无权限 | 当前会话的 id | 重新登录后再验证，不能只查账户配置 |
| 权限位正确仍拒绝访问 | SELinux/AppArmor 日志、挂载选项 | 按策略与路径修复，不使用 chmod 777 绕过 |
| 无法执行脚本 | 解释器、文件格式、x 位、noexec | 分别检查路径、权限和挂载条件 |
| 可写文件无法删除 | 父目录权限、sticky bit、只读挂载 | 文件内容权限不决定目录项删除权限 |

# 参考资料

- [GNU Coreutils：文件权限](https://www.gnu.org/software/coreutils/manual/html_node/File-permissions.html)
- [acl(5)：Linux ACL](https://man7.org/linux/man-pages/man5/acl.5.html)
- [sudoers 手册](https://www.sudo.ws/docs/man/sudoers.man/)
