---
title: 自动化：Ansible
description: '使用 Inventory 和 Playbook 描述主机配置，完成可重复的常见自动化任务。'
updated: 2026-09-19
published: 2026-09-14T04:55:56Z
image: ''
tags: [Ansible, 自动化, Linux, 运维]
category: 学习笔记
draft: false
lang: ''
---

> 当服务器数量从 1 台变成 10 台、100 台甚至更多时，依靠 SSH 登录服务器逐台执行命令会越来越低效，也容易产生环境差异。
>
> Ansible 通过 Inventory 管理目标主机，通过 Playbook 描述目标状态，再利用 Modules、Variables、Templates、Handlers 和 Roles 将运维操作自动化。
>
> **Ansible 的核心不是“远程执行命令”，而是把基础设施的配置和运维操作变成可以重复执行的代码。**

# 一、Ansible 概述

## 1.1 什么是 Ansible

Ansible 是一种 IT 自动化工具，可以用于：

```text
配置管理
应用部署
批量执行任务
服务器初始化
服务管理
系统维护
网络设备自动化
```

例如现在有：

```text
web01
web02
web03
web04
```

手工执行：

```bash
ssh web01
ssh web02
ssh web03
ssh web04
```

然后重复：

```bash
apt update
apt install nginx
systemctl enable nginx
systemctl start nginx
```

机器越多，重复劳动越严重。

Ansible 的目标则是：

```text
Inventory
    │
    ▼
Ansible
    │
    ├── web01
    ├── web02
    ├── web03
    └── web04
```

执行一次：

```bash
ansible-playbook deploy.yml
```

就可以批量完成任务。

Ansible 官方：
[Ansible Introduction](https://docs.ansible.com/projects/ansible/latest/getting_started/introduction.html)

## 1.2 Ansible 的核心特点

Ansible 的几个核心特点：

```text
Agentless
YAML
Idempotent
Declarative
```

### Agentless

Ansible 通常不要求在被管理主机上额外安装 Ansible Agent。

典型 Linux 环境：

```text
Control Node
    │
    │ SSH
    ├────────► Managed Node 1
    ├────────► Managed Node 2
    └────────► Managed Node 3
```

Ansible 官方文档明确说明，Managed Node 一般不需要安装 Ansible 本身，而 Control Node 运行 Ansible 并通过 SSH 等方式管理远程节点。

### YAML

Playbook 使用 YAML 编写：

```yaml
- hosts: web
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
```

相比：

```text
Shell Script
```

Playbook 更强调：

```text
我要系统达到什么状态
```

### Idempotent

幂等性是 Ansible 非常重要的设计思想。

例如：

```yaml
state: present
```

意味着：

```text
“确保 nginx 存在”
```

如果已经安装：

```text
不需要重复安装
```

如果没有安装：

```text
执行安装
```

所以：

```text
第一次执行
→ Changed

第二次执行
→ 通常不会再产生变化
```

Ansible 官方也将 idempotence 和 predictability 作为核心设计原则。

# 二、Ansible 架构

## 2.1 Control Node

Control Node 是运行 Ansible 的机器。

例如：

```text
管理服务器
      │
      └── Ansible
```

安装：

```bash
ansible --version
```

可以查看版本。

## 2.2 Managed Node

Managed Node 是被管理的目标机器。

例如：

```text
web01
web02
db01
redis01
```

Linux Managed Node 通常至少需要：

```text
SSH
Python
用户权限
```

具体 Module 的要求可能有所不同。

## 2.3 Inventory

Inventory 是 Ansible 的主机清单。

例如：

```text
web01
web02
web03
db01
redis01
```

可以按角色组织：

```text
web
├── web01
├── web02
└── web03

db
├── db01
└── db02

redis
└── redis01
```

Ansible 官方将 Inventory 定义为组织 Managed Nodes 的主机清单。

因此：

```text
Control Node
      │
      ▼
  Inventory
      │
      ├── web
      ├── db
      └── redis
```

# 三、安装 Ansible

## 3.1 使用 pip 安装

在 Control Node 中，可以使用：

```bash
python3 -m pip install ansible
```

或者使用官方推荐的 Python 包管理方式之一，例如：

```bash
pipx install ansible
```

Ansible 官方当前提供 `ansible` 和 `ansible-core` 两种主要包形态：

```text
ansible
→ 更完整的社区内容集合

ansible-core
→ 核心运行时和内置功能
```

具体安装方式和版本支持应以官方 Installation Guide 为准。

检查：

```bash
ansible --version
```

## 3.2 创建项目目录

例如：

```bash
mkdir -p ~/ansible-demo
cd ~/ansible-demo
```

创建：

```text
inventory
ansible.cfg
playbook.yml
```

最终：

```text
ansible-demo/
├── ansible.cfg
├── inventory
└── playbook.yml
```

# 四、Inventory

## 4.1 INI Inventory

最简单：

```ini
[web]
web01 ansible_host=192.168.1.101
web02 ansible_host=192.168.1.102

[db]
db01 ansible_host=192.168.1.103
```

指定 SSH 用户：

```ini
[web]
web01 ansible_host=192.168.1.101 ansible_user=ubuntu
web02 ansible_host=192.168.1.102 ansible_user=ubuntu
```

## 4.2 YAML Inventory

也可以使用 YAML：

```yaml
all:
  children:

    web:
      hosts:
        web01:
          ansible_host: 192.168.1.101
        web02:
          ansible_host: 192.168.1.102

    db:
      hosts:
        db01:
          ansible_host: 192.168.1.103
```

Ansible 官方支持多种 Inventory 形式，并可以为 Host 或 Group 设置变量。

## 4.3 Group

例如：

```ini
[web]
web01
web02
web03

[db]
db01
db02
```

可以：

```bash
ansible web -m ping
```

只对：

```text
web
```

组执行。

## 4.4 Group of Groups

还可以：

```ini
[frontend]
web01
web02

[backend]
app01
app02

[production:children]
frontend
backend
```

于是：

```text
production
├── frontend
└── backend
```

执行：

```bash
ansible production -m ping
```

就可以管理整个生产环境。

# 五、ansible.cfg

Ansible 可以通过配置文件统一管理默认行为。

例如：

```ini
[defaults]
inventory = ./inventory
host_key_checking = False
interpreter_python = auto_silent
```

这样就不需要每次都：

```bash
ansible -i inventory ...
```

查看当前配置：

```bash
ansible-config dump
```

也可以：

```bash
ansible-config list
```

需要注意：

```text
host_key_checking = False
```

在学习环境中比较方便，但生产环境不应该无条件关闭 SSH 主机密钥验证。

# 六、Ansible Ad-hoc 命令

## 6.1 什么是 Ad-hoc

Ad-hoc Command 用于临时执行任务。

例如：

```bash
ansible all -m ping
```

意思是：

```text
对 Inventory 中的所有主机执行 ping Module
```

官方文档将 `ansible` 命令和 Ad-hoc Commands 作为 Ansible 日常命令行操作的一部分。

## 6.2 ping Module

：

```bash
ansible all -m ansible.builtin.ping
```

成功可能返回：

```text
web01 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

这里：

```text
SUCCESS
→ Ansible 能够正常管理目标主机

changed: false
→ 没有修改目标系统
```

注意：

```text
Ansible ping
```

不是普通 ICMP：

```bash
ping 192.168.1.101
```

它主要用于验证 Ansible 与目标节点之间的管理通信和模块执行环境。

# 七、常见 Ad-hoc 操作

## 7.1 查看主机

```bash
ansible all -m ansible.builtin.command -a "hostname"
```

## 7.2 查看内存

```bash
ansible all \
  -m ansible.builtin.command \
  -a "free -h"
```

## 7.3 查看磁盘

```bash
ansible all \
  -m ansible.builtin.command \
  -a "df -h"
```

## 7.4 查看服务

```bash
ansible web \
  -m ansible.builtin.command \
  -a "systemctl status nginx"
```

不过实际修改系统时，更推荐使用：

```text
专用 Module
```

而不是到处执行：

```text
Shell Command
```

因为 Module 通常能够更好地表达目标状态，并提供幂等行为。

# 八、Module

## 8.1 什么是 Module

Module 是 Ansible 用来执行具体工作的功能单元。

例如：

```text
apt
dnf
service
systemd
file
copy
template
user
group
command
shell
package
```

可以理解为：

```text
Playbook
   │
   ▼
 Module
   │
   ▼
Managed Node
```

例如：

```yaml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
```

这里：

```text
apt
→ Module

name
state
→ Module 参数
```

## 8.2 ansible-doc

查看 Module 文档：

```bash
ansible-doc ansible.builtin.apt
```

例如：

```bash
ansible-doc ansible.builtin.copy
```

这是非常实用的命令。

不要记住所有参数，更推荐：

```bash
ansible-doc <module>
```

需要什么就查什么。

# 九、Playbook

## 9.1 什么是 Playbook

Playbook 是 Ansible 自动化任务的主要描述形式。

典型结构：

```text
Playbook
   │
   └── Play
        │
        └── Tasks
              │
              ├── Task 1
              ├── Task 2
              └── Task 3
```

Ansible 官方将 Play 定义为将目标主机映射到任务的执行上下文，Playbook 则由一个或多个 Play 组成。

## 9.2 第一个 Playbook

```yaml
---
- name: Install nginx
  hosts: web
  become: true

  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Start nginx
      ansible.builtin.systemd:
        name: nginx
        state: started
        enabled: true
```

运行：

```bash
ansible-playbook playbook.yml
```

指定 Inventory：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml
```

## 9.3 Play 的主要组成

一个 Play 常见：

```yaml
- name: Web server
  hosts: web
  become: true

  vars:
    http_port: 80

  tasks:
    ...
```

核心部分：

```text
name
hosts
vars
tasks
handlers
roles
```

# 十、Task

Task 是一个具体操作。

例如：

```yaml
tasks:

  - name: Install nginx
    ansible.builtin.apt:
      name: nginx
      state: present
```

每个 Task 通常具有：

```text
name
module
module arguments
```

例如：

```text
Task
 │
 └── apt
      ├── name
      └── state
```

## 10.1 Task 顺序

默认情况下，Playbook 中的 Task 按照定义顺序执行：

```text
Task 1
 ↓
Task 2
 ↓
Task 3
 ↓
Task 4
```

因此可以建立：

```text
安装
 ↓
配置
 ↓
启动
```

这样的执行流程。

# 十一、变量 Variables

## 11.1 为什么需要变量

假设开发环境：

```text
port = 8080
```

生产环境：

```text
port = 80
```

如果把数字直接写死：

```yaml
port: 8080
```

不同环境就需要修改 Playbook。

更好的方式：

```yaml
http_port: 8080
```

然后：

```yaml
port: "{{ http_port }}"
```

Ansible 官方支持在 Inventory、Playbook、Role、命令行等多处定义变量，并按照变量优先级规则处理。

## 11.2 Playbook 变量

```yaml
vars:
  app_name: myapp
  app_port: 8080
```

引用：

```yaml
- name: Show app port
  ansible.builtin.debug:
    msg: "Application port is {{ app_port }}"
```

## 11.3 Inventory 变量

例如：

```ini
[web]
web01 ansible_host=192.168.1.101
web02 ansible_host=192.168.1.102
```

也可以进一步设置：

```text
group_vars/
host_vars/
```

组织变量。

## 11.4 Extra Vars

运行时传入：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml \
  -e "app_port=8080"
```

Extra Vars 具有很高的变量优先级。

# 十二、Facts

## 12.1 什么是 Facts

Ansible 可以自动收集远程主机的信息。

例如：

```text
操作系统
IP 地址
CPU
内存
磁盘
文件系统
主机名
```

这些数据称为：

```text
Facts
```

Ansible 官方文档将远程系统信息称为 Facts，并通过 `setup` Module 收集。

查看：

```bash
ansible web \
  -m ansible.builtin.setup
```

## 12.2 使用 Facts

例如根据操作系统执行不同任务：

```yaml
- name: Install package
  ansible.builtin.package:
    name: nginx
    state: present
```

也可以访问：

```text
ansible_facts
```

例如：

```yaml
- name: Show OS
  ansible.builtin.debug:
    var: ansible_facts.distribution
```

这让 Playbook 能够根据目标机器的实际环境动态执行。

# 十三、Conditionals

## 13.1 when

有时任务只应该在特定条件下执行。

例如：

```yaml
- name: Install nginx on Debian
  ansible.builtin.apt:
    name: nginx
    state: present
  when: ansible_facts.distribution in ["Ubuntu", "Debian"]
```

Red Hat 系：

```yaml
- name: Install nginx on RedHat
  ansible.builtin.dnf:
    name: nginx
    state: present
  when: ansible_facts.os_family == "RedHat"
```

于是：

```text
Ubuntu
 → apt

RHEL / Fedora
 → dnf
```

## 13.2 Condition 的意义

这使一个 Playbook 能适应：

```text
多个发行版
多个环境
多个节点类型
```

而不是：

```text
一台机器一个脚本
```

# 十四、Loops

## 14.1 基本循环

例如安装多个软件包：

```yaml
- name: Install packages
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop:
    - curl
    - vim
    - git
```

逻辑：

```text
item = curl
item = vim
item = git
```

## 14.2 为什么需要循环

如果没有 loop：

```yaml
- apt:
    name: curl

- apt:
    name: vim

- apt:
    name: git
```

重复内容很多。

使用：

```yaml
loop:
```

更简洁。

# 十五、常用 Module

## 15.1 package / apt / dnf

跨发行版时：

```yaml
ansible.builtin.package:
  name: nginx
  state: present
```

Debian / Ubuntu：

```yaml
ansible.builtin.apt:
```

RHEL / Fedora：

```yaml
ansible.builtin.dnf:
```

## 15.2 service / systemd

例如：

```yaml
- name: Start nginx
  ansible.builtin.systemd:
    name: nginx
    state: started
    enabled: true
```

对应：

```text
systemctl start nginx
systemctl enable nginx
```

## 15.3 file

创建目录：

```yaml
- name: Create application directory
  ansible.builtin.file:
    path: /opt/myapp
    state: directory
    owner: root
    group: root
    mode: "0755"
```

## 15.4 copy

复制文件：

```yaml
- name: Copy config
  ansible.builtin.copy:
    src: files/app.conf
    dest: /etc/myapp/app.conf
    mode: "0644"
```

## 15.5 user

创建用户：

```yaml
- name: Create deploy user
  ansible.builtin.user:
    name: deploy
    shell: /bin/bash
    create_home: true
```

# 十六、Template 与 Jinja2

## 16.1 为什么需要 Template

如果配置文件中存在：

```text
端口
域名
IP
路径
环境
```

直接复制固定文件并不灵活。

例如：

```text
dev
→ port=8080

prod
→ port=80
```

可以使用：

```text
Jinja2 Template
```

## 16.2 模板

例如：

```text
templates/nginx.conf.j2
```

内容：

```nginx
server {
    listen {{ http_port }};

    server_name {{ server_name }};

    location / {
        proxy_pass http://{{ backend_host }}:{{ backend_port }};
    }
}
```

Playbook：

```yaml
- name: Deploy nginx config
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/conf.d/app.conf
    mode: "0644"
```

最终不同机器可能生成：

```text
server01
listen 80;

server02
listen 8080;
```

因为变量不同。

## 16.3 Template 的核心

可以理解成：

```text
Template
   +
Variables
   │
   ▼
Rendered Config
```

Ansible 官方也支持在模板中使用 Jinja2 语法处理变量、循环和条件。

# 十七、Handlers

## 17.1 为什么需要 Handler

假设修改了：

```text
nginx.conf
```

修改后才需要：

```bash
systemctl reload nginx
```

如果配置没有发生变化：

```text
不需要 reload
```

这就是 Handler 的用途。

```yaml
tasks:

  - name: Deploy nginx config
    ansible.builtin.template:
      src: nginx.conf.j2
      dest: /etc/nginx/conf.d/app.conf
    notify:
      - Reload nginx

handlers:

  - name: Reload nginx
    ansible.builtin.systemd:
      name: nginx
      state: reloaded
```

逻辑：

```text
Template changed
      │
      ▼
notify
      │
      ▼
Handler
      │
      ▼
Reload nginx
```

如果文件：

```text
没有变化
```

则：

```text
Handler 不执行
```

这也是幂等性的重要体现。

# 十八、Become 与权限提升

很多运维操作需要 root：

```text
安装软件
修改 /etc
管理 systemd
创建系统用户
```

Ansible 常用：

```yaml
become: true
```

例如：

```yaml
- hosts: web
  become: true

  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
```

运行时也可以：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml \
  -b
```

这里：

```text
-b
→ become
```

通常最终通过：

```text
sudo
```

等方式获得目标权限。

因此：

```text
SSH User
   │
   ▼
Become / sudo
   │
   ▼
Root-level Task
```

# 十九、Command 与 Shell

## 19.1 command

执行命令：

```yaml
- name: Check hostname
  ansible.builtin.command:
    cmd: hostname
```

## 19.2 shell

需要 Shell 特性时：

```yaml
- name: Check logs
  ansible.builtin.shell:
    cmd: "journalctl -u nginx | tail -n 20"
```

但应该注意：

> **能使用专用 Module 时，优先使用 Module，而不是把所有操作都写成 Shell。**

例如：

不要：

```yaml
ansible.builtin.shell:
  cmd: "systemctl start nginx"
```

更推荐：

```yaml
ansible.builtin.systemd:
  name: nginx
  state: started
```

因为：

```text
systemd Module
→ 表达目标状态

shell systemctl
→ 只是执行命令
```

后者更难保证幂等性。

# 二十、Check Mode 与 Diff

## 20.1 Check Mode

运行：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml \
  --check
```

可以在尽可能不修改目标系统的情况下，预览哪些任务可能产生变化。

这对于生产环境非常有价值：

```text
修改之前
 ↓
--check
 ↓
确认变化
 ↓
正式执行
```

## 20.2 Diff

对于部分文件修改操作，可以：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml \
  --diff
```

查看配置变化。

例如：

```text
old config
     ↓
new config
```

这样比直接修改生产配置更安全。

# 二十一、Ansible Playbook 的幂等性

考虑：

```yaml
- name: Ensure nginx installed
  ansible.builtin.apt:
    name: nginx
    state: present
```

第一次：

```text
changed = true
```

第二次：

```text
changed = false
```

因为：

```text
目标状态已经满足
```

这就是：

```text
Idempotency
```

## 21.1 为什么幂等性重要

假设：

```text
100 台服务器
```

需要反复执行：

```text
安装
配置
更新
```

如果脚本每次都会：

```text
重复修改
重复创建
重复启动
```

就很危险。

而幂等自动化强调：

```text
Desired State
      │
      ▼
当前状态检查
      │
      ├── 已满足 → 不修改
      │
      └── 未满足 → 修改
```

因此 Playbook 可以安全地反复执行。

# 二十二、Roles

## 22.1 为什么需要 Role

一个大型 Playbook 很容易越来越长：

```text
install
configure
deploy
firewall
monitor
backup
...
```

全部写在：

```text
playbook.yml
```

会越来越难维护。

于是可以拆成：

```text
Role
```

## 22.2 Role 目录

典型结构：

```text
roles/
└── nginx/
    ├── tasks/
    │   └── main.yml
    ├── handlers/
    │   └── main.yml
    ├── templates/
    ├── files/
    ├── vars/
    ├── defaults/
    ├── meta/
    └── README.md
```

Ansible 官方将 Role 定义为用于复用 Tasks、Handlers、Variables、Templates、Files 等自动化内容的一种组织方式。

## 22.3 使用 Role

Playbook：

```yaml
- name: Deploy web server
  hosts: web
  become: true

  roles:
    - nginx
```

于是：

```text
Playbook
   │
   ▼
 nginx Role
   │
   ├── Tasks
   ├── Handlers
   ├── Templates
   └── Variables
```

## 22.4 Role 的价值

Role 的本质是：

```text
复用
组织
抽象
```

例如：

```text
nginx-role
mysql-role
redis-role
docker-role
node-exporter-role
```

以后换一批服务器：

```text
重新执行 Role
```

就可以快速完成环境部署。

# 二十三、Ansible Vault

自动化配置中经常需要：

```text
密码
Token
SSH Key
数据库凭证
```

不应该直接写在 Git 仓库的普通 YAML 中：

```yaml
db_password: "123456"
```

Ansible 提供：

```text
ansible-vault
```

用于加密敏感数据。

创建：

```bash
ansible-vault create secrets.yml
```

编辑：

```bash
ansible-vault edit secrets.yml
```

运行 Playbook：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml \
  --ask-vault-pass
```

这样：

```text
Git
 ↓
加密文件
 ↓
Ansible Vault
```

而不是：

```text
Git
 ↓
明文密码
```

# 二十四、Ansible Galaxy 与 Collections

Ansible 自动化内容不一定全部自己编写。

还可以使用：

```text
Collections
Roles
```

通过：

```bash
ansible-galaxy
```

管理。

例如：

```bash
ansible-galaxy collection install community.general
```

查看：

```bash
ansible-galaxy collection list
```

当前 Ansible 生态大量功能已经通过 Collections 组织。

因此：

```text
ansible-core
      │
      ├── Built-in Modules
      │
      └── Collections
             │
             ├── community.general
             ├── vendor collections
             └── ...
```

# 二十五、一个完整的 Web 服务 Playbook

现在把前面的知识组合起来。

目录：

```text
ansible-demo/
├── inventory
├── playbook.yml
└── templates/
    └── nginx.conf.j2
```

Inventory：

```ini
[web]
web01 ansible_host=192.168.1.101
web02 ansible_host=192.168.1.102
```

Playbook：

```yaml
---
- name: Deploy web server
  hosts: web
  become: true

  vars:
    http_port: 8080
    server_name: example.local

  tasks:

    - name: Install nginx
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Deploy nginx config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/conf.d/app.conf
        mode: "0644"
      notify:
        - Reload nginx

    - name: Ensure nginx is running
      ansible.builtin.systemd:
        name: nginx
        state: started
        enabled: true

  handlers:

    - name: Reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

模板：

```nginx
server {
    listen {{ http_port }};

    server_name {{ server_name }};

    location / {
        return 200 "Hello from {{ inventory_hostname }}\n";
    }
}
```

执行：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml
```

最终：

```text
Control Node
     │
     ▼
Inventory
     │
     ▼
Playbook
     │
     ├── Install nginx
     ├── Render Template
     ├── Start nginx
     └── Handler
           │
           ▼
       Managed Nodes
```

# 二十六、Ansible 执行过程

理解 Ansible 时，可以把一次 Playbook 执行抽象为：

```text
ansible-playbook
        │
        ▼
    Inventory
        │
        ▼
      Hosts
        │
        ▼
      Facts
        │
        ▼
       Tasks
        │
        ▼
      Modules
        │
        ▼
   Managed Nodes
        │
        ▼
Desired State
```

例如：

```text
“nginx 必须安装并运行”
```

Ansible 会检查：

```text
当前状态
```

再决定：

```text
需要修改
还是
已经满足
```

因此它不是简单的：

```text
SSH
+
Shell Script
```

而是：

```text
Desired State
+
State Reconciliation
```

# 二十七、Ansible 常见故障排查

自动化工具本身也会出问题。

排查时建议按照：

```text
Inventory
 ↓
Network
 ↓
SSH
 ↓
Privilege
 ↓
Module
 ↓
Variable
 ↓
Task
 ↓
Managed Service
```

逐层定位。

# 二十八、Inventory 故障

例如：

```bash
ansible web -m ping
```

返回：

```text
No hosts matched
```

先检查：

```bash
ansible-inventory \
  -i inventory \
  --graph
```

查看：

```text
web
├── web01
└── web02
```

再：

```bash
ansible-inventory \
  -i inventory \
  --list
```

确认 Inventory 是否被正确解析。

# 二十九、SSH 故障

如果：

```text
UNREACHABLE
```

首先从 SSH 入手：

```bash
ssh user@192.168.1.101
```

检查：

```text
IP
端口
用户名
SSH Key
密码
Known Hosts
防火墙
```

如果手工 SSH 都连接不上：

```text
Ansible 通常也不可能正常工作
```

因此：

```text
Ansible 问题
```

有时候根本不是 Ansible 本身的问题，而是：

```text
基础网络 / SSH
```

## 29.1 指定 SSH Key

Inventory：

```ini
[web]
web01 ansible_host=192.168.1.101 \
      ansible_user=ubuntu \
      ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

也可以命令行：

```bash
ansible web \
  -m ping \
  --private-key ~/.ssh/id_ed25519
```

# 三十、权限问题

如果出现：

```text
Permission denied
```

检查：

```text
SSH User
sudo
become
```

例如：

```yaml
become: true
```

还要确认：

```text
用户是否可以 sudo
是否需要密码
sudo 配置是否允许
```

运行：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml \
  -K
```

可以提示输入 Become 密码。

# 三十一、Module 故障

如果：

```text
Module failed
```

可以：

```bash
ansible-doc <module>
```

检查参数。

也可以增加详细输出：

```bash
ansible-playbook \
  -i inventory \
  playbook.yml \
  -vvv
```

`-vvv` 会输出更详细的执行信息。

对于进一步排查：

```text
Module 参数
Python
权限
目标系统
模块兼容性
```

都需要考虑。

# 三十二、变量问题

如果出现：

```text
'xxx' is undefined
```

检查：

```text
变量名称
变量作用域
Inventory
group_vars
host_vars
Role
Extra Vars
```

可以使用：

```yaml
- name: Debug variable
  ansible.builtin.debug:
    var: app_port
```

帮助确认变量实际值。

## 32.1 变量优先级

Ansible 存在复杂的变量优先级体系。

初学阶段不需要背完整优先级表，但应该知道：

```text
同一个变量
在不同位置重复定义
```

最终只会有一个值真正生效。

因此大型项目中最好：

```text
明确变量来源
避免重复定义
```

官方变量文档提供了完整的变量优先级规则。

# 三十三、Playbook 调试

## 33.1 Verbosity

```bash
ansible-playbook -v playbook.yml
```

更详细：

```bash
ansible-playbook -vvv playbook.yml
```

可以看到：

```text
连接
模块
参数
执行结果
```

## 33.2 Debug Module

例如：

```yaml
- name: Debug hostname
  ansible.builtin.debug:
    var: inventory_hostname
```

或者：

```yaml
- name: Debug message
  ansible.builtin.debug:
    msg: "Port is {{ http_port }}"
```

这在排查：

```text
变量
条件
Facts
```

时非常有用。

# 三十四、Ansible 运维自动化的典型应用

Ansible 可以覆盖大量运维任务：

```text
服务器初始化
软件安装
用户管理
SSH 配置
Nginx 部署
数据库部署
Docker 部署
Kubernetes 节点初始化
日志配置
监控 Agent 部署
防火墙配置
定时任务
应用发布
```

例如：

```text
新服务器上线
      │
      ▼
Ansible
      │
      ├── 创建用户
      ├── 配置 SSH
      ├── 配置时区
      ├── 安装 Docker
      ├── 安装 node_exporter
      ├── 配置 Nginx
      └── 加入监控
```

原本可能需要：

```text
30 分钟
```

自动化之后可以变成：

```text
ansible-playbook bootstrap.yml
```

# 三十五、Ansible 与 Docker / Kubernetes

前面已经学习：

```text
Docker
Kubernetes
```

Ansible 则可以站在更高层做自动化。

例如：

```text
Ansible
    │
    ├── 安装 Docker
    ├── 配置 Docker
    ├── 部署 Compose
    │
    └── 准备 Kubernetes Node
              │
              ├── containerd
              ├── kubeadm
              ├── kubelet
              └── 网络配置
```

因此：

```text
Docker
→ 容器运行

Kubernetes
→ 容器编排

Ansible
→ 自动化配置和部署
```

三者解决的问题不同。

# 三十六、Ansible 与 CI/CD

Ansible 还可以被 CI/CD 调用：

```text
Git Push
   │
   ▼
CI Pipeline
   │
   ▼
Build
   │
   ▼
Docker Image
   │
   ▼
Ansible
   │
   ▼
Server
```

例如：

```text
GitHub Actions
      │
      ▼
ansible-playbook deploy.yml
      │
      ▼
Production Server
```

这样就可以形成：

```text
代码提交
 ↓
自动测试
 ↓
构建镜像
 ↓
自动部署
```

Ansible 可以作为发布流程中的一个执行步骤，具体编排取决于现有流水线。

# 三十七、Ansible 项目推荐目录

小型项目：

```text
ansible/
├── ansible.cfg
├── inventory
└── site.yml
```

稍大的项目：

```text
ansible/
├── ansible.cfg
├── inventory/
│   ├── production
│   └── development
├── group_vars/
├── host_vars/
├── playbooks/
│   ├── site.yml
│   ├── web.yml
│   └── db.yml
├── roles/
│   ├── nginx/
│   ├── docker/
│   └── node_exporter/
└── requirements.yml
```

这样能够把：

```text
主机
变量
Playbook
Role
依赖
```

分别组织起来。

Ansible 官方也提供了按功能组织 Inventory、Playbook、Roles、Variables、Files 等内容的示例项目结构。

# 三十八、从手工运维到自动化运维

传统方式：

```text
服务器 1
   ↓
SSH
   ↓
手工操作

服务器 2
   ↓
SSH
   ↓
手工操作

服务器 3
   ↓
SSH
   ↓
手工操作
```

容易出现：

```text
人为失误
环境不一致
配置漂移
重复劳动
难以审计
```

Ansible：

```text
              Playbook
                  │
                  ▼
              Inventory
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
    Server 1    Server 2    Server 3
      │           │           │
      └───────────┼───────────┘
                  ▼
           Desired State
```

于是：

```text
同一份配置
→ 多台机器
→ 重复执行
→ 保持一致
```

# 三十九、Ansible 核心模型

学习到这里，可以把 Ansible 浓缩成：

```text
                    Ansible
                       │
              ┌────────┴────────┐
              ▼                 ▼
          Control Node       Inventory
              │                 │
              └────────┬────────┘
                       ▼
                    Playbook
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
          Tasks      Variables   Templates
            │                     │
            ▼                     ▼
         Modules                Config
            │
            ▼
       Managed Nodes
            │
            ▼
      Desired State
```

Role 再提供：

```text
复用与组织
```

Vault 提供：

```text
敏感变量保护
```

Check Mode 提供：

```text
执行前验证
```

Handlers 提供：

```text
变更后的条件化操作
```

# 四十、Ansible 故障排查总模型

最终可以形成一套固定排查顺序：

```text
                Playbook 执行失败
                        │
                        ▼
                  Inventory 正确吗？
                        │
                        ▼
                   Host 能解析吗？
                        │
                        ▼
                    SSH 能连接吗？
                        │
                        ▼
                   权限是否足够？
                        │
                        ▼
                    Module 正确吗？
                        │
                        ▼
                   Variables 正确吗？
                        │
                        ▼
                    Task 失败原因
                        │
                        ▼
                   服务本身正常吗？
```

常用命令：

```bash
# 查看版本
ansible --version

# 检查 Inventory
ansible-inventory -i inventory --graph

# 测试连接
ansible all -m ansible.builtin.ping

# 查看 Module
ansible-doc ansible.builtin.apt

# 执行 Playbook
ansible-playbook -i inventory playbook.yml

# 检查模式
ansible-playbook -i inventory playbook.yml --check

# 查看配置变化
ansible-playbook -i inventory playbook.yml --diff

# 更详细日志
ansible-playbook -i inventory playbook.yml -vvv
```

# 四十一、总结

Ansible 的核心知识可以整理成：

```text
Inventory
→ 管理哪些机器

Playbook
→ 要做什么

Task
→ 一个具体步骤

Module
→ 用什么方式完成

Variable
→ 不同机器有什么差异

Facts
→ 机器当前是什么状态

Template
→ 根据变量生成配置

Handler
→ 配置变化后执行什么

Role
→ 如何复用和组织自动化内容

Vault
→ 如何保存敏感数据

Become
→ 如何执行需要高权限的操作

Check Mode
→ 执行之前如何检查
```

完整执行链：

```text
Inventory
    │
    ▼
Playbook
    │
    ▼
Tasks
    │
    ├── Variables
    ├── Facts
    ├── Conditions
    ├── Loops
    ├── Templates
    └── Handlers
    │
    ▼
Modules
    │
    ▼
Managed Nodes
    │
    ▼
Desired State
```

最终可以用一句话理解 Ansible：

> **Ansible 把原本需要运维人员逐台 SSH 登录执行的重复操作，转换成可以批量执行、重复运行和版本管理的自动化配置。**

而从运维视角看，它真正重要的价值是：

```text
少手工
少错误
保持一致
可重复
可审计
可扩展
```

当服务器只有一台时：

```text
Ansible
```

看起来可能有些“重”。

但当环境变成：

```text
10 台
100 台
1000 台
```

甚至需要：

```text
Docker
Kubernetes
监控
日志
应用发布
```

一起维护时，自动化就会逐渐从：

```text
“方便的工具”
```

变成：

```text
“基础设施管理的一部分”
```

## 外部参考

- [Ansible Documentation](https://docs.ansible.com/)
- [Installing Ansible](https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html)
- [Getting Started with Ansible](https://docs.ansible.com/projects/ansible/latest/getting_started/index.html)
- [Ansible Playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html)
- [Ansible Roles](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html)
