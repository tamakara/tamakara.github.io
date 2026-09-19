---
title: Linux：远程管理与安全
published: 2026-09-13T06:24:34Z
description: '远程管理需要同时解决服务器身份确认、用户认证和访问授权。'
updated: 2026-09-19
image: ''
tags: [Linux, SSH, SELinux, 安全, 运维]
category: 学习笔记
draft: false 
lang: ''
---

远程管理需要同时解决服务器身份确认、用户认证和访问授权。SSH 提供加密通道，实际能否安全维护还取决于密钥管理、服务配置、系统权限与网络暴露范围。

# SSH 与身份认证

SSH 是协议，OpenSSH 是常见实现。连接时涉及两类不同密钥：

| 对象 | 用途 | 常见存放位置 |
| --- | --- | --- |
| 服务器主机密钥 | 向客户端证明服务器身份 | 服务端 /etc/ssh/ssh_host_* |
| 用户认证密钥 | 向服务器证明用户身份 | 客户端私钥与服务端 authorized_keys |
| 已知主机记录 | 保存客户端信任的服务器公钥 | 客户端 ~/.ssh/known_hosts |

首次连接应通过管理控制台、资产记录等可信渠道核对主机指纹。主机密钥变化可能来自重装、地址复用或冒充，应先确认原因；不要直接删除 known_hosts 记录来消除警告。

# 配置公钥登录

示例使用 OpenSSH，远端账户为 `ops`，地址 `server.example.com` 需要替换。先确认本地目标密钥文件不存在，避免覆盖已有密钥。

```bash title="在客户端生成并部署密钥"
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_ops -C "ops workstation"
ssh-copy-id -i ~/.ssh/id_ed25519_ops.pub ops@server.example.com
ssh -i ~/.ssh/id_ed25519_ops -o IdentitiesOnly=yes ops@server.example.com
```

私钥保留在客户端，建议设置口令；只把公钥交给服务器。算法可用性受客户端、服务端版本与组织密码策略影响。没有 ssh-copy-id 时，按服务器管理方式将公钥写入目标账户的 authorized_keys。

远端 `~/.ssh` 通常设置为 `700`，`authorized_keys` 设置为 `600`，并确保属主正确。家目录和路径权限也会影响 OpenSSH 的检查。

必须新开独立会话验证登录成功，再考虑关闭旧认证方式。已有会话可用并不能证明新的认证配置正确。

## 管理连接配置

```sshconfig title="~/.ssh/config"
Host prod-app
    HostName app.internal.example
    User ops
    IdentityFile ~/.ssh/id_ed25519_ops
    IdentitiesOnly yes
    ProxyJump bastion

Host bastion
    HostName bastion.example.com
    User ops
    IdentityFile ~/.ssh/id_ed25519_ops
    IdentitiesOnly yes
```

配置后使用 `ssh prod-app`。`ProxyJump` 通过跳板机转发连接，一般不需要把私钥复制到跳板机。默认不启用 agent forwarding；被转发到不可信主机的认证代理可能被利用。

# 修改 SSH 服务配置

:::warning[保留恢复入口]
修改监听端口或认证策略前，保留当前连接，确认控制台等恢复通道可用，并检查主机防火墙和云安全组。配置重载后，以新会话验证成功再结束旧连接。
:::

1. 查看主配置及其 Include 文件，确认是否存在 Match 条件块。
2. 修改所需选项，避免复制与现有策略冲突的整段配置。
3. 检查语法和有效配置。
4. 重载对应服务，再从实际来源地址建立新连接。

```bash title="服务端检查"
sudo sshd -t
sudo sshd -T
```

`sshd -t` 检查语法和密钥等基本条件；`sshd -T` 输出有效配置。有 Match 条件时，需要用 `-C` 提供对应用户、主机和地址条件检查实际匹配结果。

服务名可能是 `ssh` 或 `sshd`，以本机单元为准。检查通过后执行对应服务的 `systemctl reload`，并查看日志。

`PasswordAuthentication no` 不一定关闭键盘交互式认证；PAM、多因素认证与 `KbdInteractiveAuthentication`、`AuthenticationMethods` 的组合需一并确认。不要在使用多因素认证时盲目禁用其依赖的认证方式。

# 授权与安全策略

## 账户和文件权限

登录成功只证明通过认证，不代表可以访问所有文件。使用专用账户和 sudo 授权需要的管理操作，避免共享私钥和长期共享 root 账户。

撤销访问时，同时检查公钥、证书、密码、现有会话及自动化凭据。仅设置 nologin 或锁定密码，不应被当成覆盖全部访问途径的撤销方案。

## SELinux 与 AppArmor

传统权限和 ACL 控制基于用户身份的访问；SELinux、AppArmor 等机制还可限制进程能访问哪些资源。传统权限满足后仍可能被安全策略拒绝。

SELinux 系统可先只读检查：

```bash
getenforce
ls -Z /srv/www
ps -eZ
sudo ausearch -m AVC -ts recent
sudo restorecon -nRv /srv/www
```

最后一条只预览标签修复。若默认路径标签错误，确认后再用 `restorecon` 应用；自定义路径应先用 `semanage fcontext` 建立符合服务用途的持久规则，再恢复标签。不要把关闭 SELinux 或自动接受所有 audit2allow 建议当作常规修复。

AppArmor 系统可用 `aa-status` 查看启用的配置文件，并根据审计日志检查具体规则。两种机制的策略模型不同，不能直接照搬配置命令。

# 网络暴露与审计

`ss -lntp` 只能证明本机 TCP 监听状态；外部访问还取决于绑定地址、路由、防火墙、NAT 和云安全组。管理端口尽量只对必要来源开放，并从允许及不允许的网络分别验证。

| 症状 | 检查顺序 |
| --- | --- |
| 连接超时 | 目标地址、路由、安全组、防火墙、监听地址 |
| Connection refused | 目标主机是否到达，端口是否监听，是否被主动拒绝 |
| Permission denied | 用户名、认证方法、实际提交的密钥、服务端日志 |
| 公钥正确仍失败 | 文件属主权限、authorized_keys 选项、有效配置、安全策略 |
| 主机密钥变化 | 核对变更记录与可信指纹，确认后更新本地记录 |

客户端可用 `ssh -v` 查看认证过程；服务端使用对应服务的 journal，或发行版配置的认证日志。共享诊断输出前去除主机、用户名等不必要的信息。

# 参考资料

- [OpenSSH 客户端配置](https://man.openbsd.org/ssh_config)
- [OpenSSH 服务端配置](https://man.openbsd.org/sshd_config)
- [OpenSSH 服务端命令](https://man.openbsd.org/sshd)
- [Red Hat：使用 SELinux](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/index)
