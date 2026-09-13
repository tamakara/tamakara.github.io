---
title: 数据库基础：主流 SQL 数据库系统
published: 2026-09-13T23:31:41Z
description: ''
image: ''
tags: [MySQL, PostgreSQL, SQL, 数据库, 备份, 恢复, 索引, 高可用]
category: 学习笔记
draft: false
lang: ''
---

> 在上一篇《Web 服务基础：数据库系统架构》中，已经从整体上了解了 DBMS、关系型数据库、连接、事务和索引等概念。
>
> 本篇进一步落到实际数据库系统，重点介绍 Linux 运维中非常常见的 **MySQL 与 PostgreSQL**。内容覆盖数据库安装与服务管理、用户与权限、备份与恢复、日志、故障排查、性能与索引，以及复制和高可用的基础概念。
>
> 本文关注的是“如何理解和管理数据库系统”，而不是完整的 SQL 教程，因此不会展开大量 SQL 语法，也暂不讨论 Redis、MongoDB 等 NoSQL 数据库。

# MySQL 与 PostgreSQL

MySQL 和 PostgreSQL 都属于：

> **关系型数据库管理系统（RDBMS）**

它们都以：

```text
Table
Row
Column
Primary Key
Transaction
Index
SQL
```

等概念为基础。

但两者在：

```text
SQL 能力
事务实现
索引类型
扩展机制
权限模型
存储架构
复制
```

等方面存在明显差异。

可以先建立这样的认识：

```text
关系型数据库
      │
      ├── MySQL
      │
      └── PostgreSQL
```

它们解决的是相似的问题，但并不是：

```text
两个名字不同、完全相同的数据库
```

更准确地说：

> **MySQL 和 PostgreSQL 是两个独立的 DBMS，各自拥有不同的实现和运维体系。**

---

# MySQL

## MySQL 是什么

MySQL 是一种广泛使用的关系型数据库管理系统。

现代 Linux 环境中，MySQL Server 通常由：

```text
mysqld
```

提供服务。

MySQL 官方文档将 `mysqld` 描述为执行 MySQL Server 核心工作的多线程服务器程序，它负责监听客户端连接并管理数据目录中的数据库和表。[MySQL Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/)

可以简单理解为：

```text
MySQL Client
     │
     ▼
  mysqld
     │
     ├── Connection
     ├── SQL
     ├── Transaction
     ├── Buffer
     ├── Log
     └── Storage Engine
             │
             ▼
          Database
```

---

# MySQL 安装

## Debian / Ubuntu

例如使用系统的软件包管理器：

```bash
sudo apt update
sudo apt install mysql-server
```

安装完成后可以：

```bash
mysql --version
```

查看客户端版本。

然后检查服务：

```bash
sudo systemctl status mysql
```

MySQL 官方 APT 安装文档也以 `mysql-server` 软件包和 `systemctl` 作为 Debian / Ubuntu 环境中的典型安装与管理方式。[Installing MySQL with APT](https://dev.mysql.com/doc/refman/8.4/en/linux-installation-apt-repo.html)

---

## RHEL 系

在 RHEL 系环境中，具体安装方式取决于：

```text
发行版版本
MySQL 官方仓库
系统仓库
```

实际安装前应确认仓库和版本策略。

安装完成后，服务名称可能是：

```text
mysqld
```

可以：

```bash
sudo systemctl status mysqld
```

查看。

MySQL 官方文档也明确说明，使用 RPM 系安装时通常由 systemd 管理 MySQL 服务。[Managing MySQL Server with systemd](https://dev.mysql.com/doc/refman/8.4/en/using-systemd.html)

---

# MySQL 服务管理

常见命令：

```bash
sudo systemctl start mysql
sudo systemctl stop mysql
sudo systemctl restart mysql
sudo systemctl status mysql
```

RHEL 系环境中可能使用：

```bash
sudo systemctl start mysqld
sudo systemctl stop mysqld
sudo systemctl restart mysqld
sudo systemctl status mysqld
```

具体服务名要以实际系统为准。

设置开机启动：

```bash
sudo systemctl enable mysql
```

或者：

```bash
sudo systemctl enable mysqld
```

---

# MySQL 初始安全配置

数据库安装完成后，不应该直接认为：

```text
“服务启动了 = 可以投入生产”
```

还需要处理：

```text
管理员账户
密码 / 认证
匿名账户
远程访问
测试数据库
权限
```

MySQL 官方安全指南建议遵循最小权限原则，并通过 `GRANT` / `REVOKE` 控制账户权限，不应随意授予过大的权限。[MySQL Security Guidelines](https://dev.mysql.com/doc/refman/8.4/en/security-guidelines.html)

---

# MySQL 用户与权限

## 创建用户

MySQL 中使用：

```sql
CREATE USER 'app'@'localhost'
IDENTIFIED BY 'strong-password';
```

这里：

```text
app
```

是数据库账户。

而：

```text
'localhost'
```

表示这个账户对应的来源主机条件。

因此 MySQL 的账户概念可以理解为：

```text
用户名
+
主机条件
```

例如：

```text
'app'@'localhost'
'app'@'192.168.1.10'
'app'@'%'
```

在权限意义上并不等价。

---

## 授予权限

例如：

```sql
GRANT SELECT, INSERT, UPDATE
ON appdb.*
TO 'app'@'localhost';
```

表示：

```text
数据库 appdb
↓
允许 app
↓
SELECT / INSERT / UPDATE
```

查看权限：

```sql
SHOW GRANTS FOR 'app'@'localhost';
```

撤销：

```sql
REVOKE UPDATE
ON appdb.*
FROM 'app'@'localhost';
```

MySQL 官方推荐通过 `GRANT`、`REVOKE` 等机制管理权限，并强调不要授予超出需要范围的权限。[MySQL Security Guidelines](https://dev.mysql.com/doc/refman/8.4/en/security-guidelines.html)

---

# MySQL 远程访问

很多数据库“连接不上”的问题并不一定是：

```text
用户名密码错误
```

还可能是：

```text
监听地址
端口
防火墙
账户 Host 条件
认证插件
```

例如：

```text
应用服务器
192.168.1.10

MySQL
192.168.1.20:3306
```

需要同时确认：

```text
网络可达
+
3306 可访问
+
MySQL 正在监听
+
账户允许该来源连接
```

因此：

> **数据库用户权限和 Linux 网络防火墙是两个不同层次的问题。**

---

# PostgreSQL

## PostgreSQL 是什么

PostgreSQL 是另一套成熟的开源关系型数据库管理系统。

它具有：

```text
SQL
Transaction
MVCC
Index
WAL
Replication
```

等完整数据库能力。

官方 PostgreSQL 18 文档将数据库服务器管理划分为：

```text
Installation
Server Setup and Operation
Server Configuration
Client Authentication
Database Roles
Backup and Restore
High Availability / Replication
```

等章节。[PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)

---

# PostgreSQL 安装

## Debian / Ubuntu

例如：

```bash
sudo apt update
sudo apt install postgresql
```

查看版本：

```bash
psql --version
```

检查服务：

```bash
sudo systemctl status postgresql
```

---

## PostgreSQL 的 Cluster

PostgreSQL 与 MySQL 的一个重要区别，是它经常使用：

> **Database Cluster**

这一概念。

这里的 Cluster 不一定指：

```text
多台服务器组成的集群
```

而是：

> **一个 PostgreSQL Server 实例管理的一组数据库及其共享系统对象。**

可以简单理解：

```text
PostgreSQL Instance
        │
        ▼
   Database Cluster
        │
   ┌────┼────┐
   ▼    ▼    ▼
 db1   db2   db3
```

这与 PostgreSQL 的具体目录结构和系统目录管理方式有关。

因此不要把：

```text
PostgreSQL Cluster
```

和：

```text
PostgreSQL High-Availability Cluster
```

直接画等号。

---

# PostgreSQL 服务管理

使用 systemd 时：

```bash
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

开机启动：

```bash
sudo systemctl enable postgresql
```

具体服务单元名称可能随着发行版和 PostgreSQL 安装方式有所差异。

---

# PostgreSQL 用户与 Role

PostgreSQL 使用：

> **Role（角色）**

管理数据库身份和权限。

官方文档明确指出：

> PostgreSQL 将“用户”和“组”的概念统一在 Role 中。

一个 Role 可以：

```text
登录数据库
拥有对象
拥有权限
继承其他 Role 的权限
```

例如：

```sql
CREATE ROLE app LOGIN PASSWORD 'strong-password';
```

这里：

```text
app
↓
Role

LOGIN
↓
允许登录
```

可以参考官方 [Database Roles](https://www.postgresql.org/docs/18/user-manag.html)。

---

# PostgreSQL 权限

例如：

```sql
GRANT CONNECT
ON DATABASE appdb
TO app;
```

对表授权：

```sql
GRANT SELECT, INSERT, UPDATE
ON TABLE users
TO app;
```

撤销：

```sql
REVOKE UPDATE
ON TABLE users
FROM app;
```

PostgreSQL 权限通常涉及：

```text
Database
Schema
Table
Sequence
Function
```

等对象。

因此在排查：

```text
permission denied
```

时，需要先确定：

```text
哪个 Role
+
哪个对象
+
缺少什么权限
```

---

# MySQL 与 PostgreSQL 权限模型对比

两者都有：

```text
User / Role
Privilege
Grant
Revoke
```

但模型不同。

可以粗略理解：

```text
MySQL
↓
Account
(user + host)

PostgreSQL
↓
Role
(Login / Membership / Privilege)
```

因此不能把 MySQL 的权限命令机械搬到 PostgreSQL。

例如：

```text
MySQL
'user'@'host'

PostgreSQL
Role
```

这就是两个 DBMS 在权限模型上的明显差异。

---

# 数据库连接

## 客户端连接数据库

MySQL 常见：

```bash
mysql -h 127.0.0.1 -P 3306 -u app -p
```

PostgreSQL 常见：

```bash
psql -h 127.0.0.1 -p 5432 -U app -d appdb
```

连接信息通常包含：

```text
Host
Port
Database
User
Password
```

---

# 默认端口

常见默认端口：

| 数据库 | 默认端口 |
|---|---:|
| MySQL | `3306` |
| PostgreSQL | `5432` |

例如：

```text
MySQL
192.168.1.20:3306

PostgreSQL
192.168.1.20:5432
```

实际部署时当然可以修改。

因此排查连接问题时：

> **不要假设数据库一定监听默认端口。**

首先应该使用：

```bash
ss -lntp
```

确认实际监听情况。

---

# 连接池

Web 应用通常不会对每一个 HTTP 请求都重新创建数据库连接。

更典型的方式是：

```text
Application
     │
     ▼
Connection Pool
     │
 ┌───┼───┐
 ▼   ▼   ▼
 C1  C2  C3
     │
     ▼
    DBMS
```

请求：

```text
HTTP Request
    │
    ▼
Application
    │
    ▼
获取连接
    │
    ▼
执行 SQL
    │
    ▼
归还连接
```

连接池过小：

```text
请求等待连接
```

连接池过大：

```text
数据库连接数过多
↓
内存 / CPU / 锁压力增加
```

因此：

> **连接池是应用与数据库之间的重要容量控制点。**

---

# 数据库备份

## 为什么需要备份

数据库存在：

```text
磁盘损坏
误删
误更新
程序 Bug
人为操作错误
勒索 / 攻击
```

等风险。

因此：

> **数据库必须存在独立于数据库本身正常运行机制之外的备份策略。**

需要区分：

```text
事务持久性
```

和：

```text
备份
```

前者解决：

```text
数据库崩溃恢复
```

后者解决：

```text
人为 / 逻辑 / 灾难性数据损失
```

---

# MySQL 备份

## mysqldump

MySQL 中最常见的逻辑备份工具之一：

```bash
mysqldump -u root -p appdb > appdb.sql
```

得到：

```text
appdb.sql
```

之后可以恢复：

```bash
mysql -u root -p appdb < appdb.sql
```

可以简单理解：

```text
Database
   │
   ▼
mysqldump
   │
   ▼
SQL Dump
   │
   ▼
恢复
   │
   ▼
Database
```

---

## MySQL 逻辑备份的特点

逻辑备份的优势：

```text
可读
通用
迁移方便
```

但缺点也很明显：

```text
数据量大时速度较慢
恢复时间可能较长
需要执行大量 SQL
```

因此大型数据库不能只依赖简单的 `mysqldump`。

MySQL 官方文档对逻辑备份、恢复以及其他备份方式都有专门说明。[MySQL Backup and Recovery](https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html)

---

# MySQL 物理备份

物理备份更接近：

```text
复制数据库文件
```

而不是：

```text
导出 SQL
```

例如：

```text
Data Directory
      │
      ▼
Physical Backup
      │
      ▼
Restore
```

物理备份通常更适合：

```text
大型数据库
快速恢复
完整实例迁移
```

但它通常要求：

```text
备份工具
数据库状态
文件一致性
版本兼容
```

等条件更加严格。

MySQL 官方的备份文档同时涵盖逻辑和物理备份方案。

---

# PostgreSQL 备份

PostgreSQL 常见的逻辑备份工具：

```text
pg_dump
pg_dumpall
```

例如：

```bash
pg_dump -U app appdb > appdb.sql
```

恢复：

```bash
psql -U app -d appdb < appdb.sql
```

这里：

```text
pg_dump
↓
备份单个数据库

pg_dumpall
↓
备份整个 PostgreSQL Cluster 的逻辑对象
```

---

# PostgreSQL 自定义格式备份

`pg_dump` 不一定只能输出纯 SQL。

例如：

```bash
pg_dump -Fc -U app appdb > appdb.dump
```

然后可以通过：

```bash
pg_restore -U app -d appdb appdb.dump
```

进行恢复。

相比普通 SQL dump：

```text
Custom Format
↓
更适合配合 pg_restore
↓
可以进行更灵活的恢复操作
```

---

# PostgreSQL 物理备份

PostgreSQL 还支持基于：

```text
Base Backup
+
WAL
```

的物理备份和恢复体系。

例如：

```text
Base Backup
     +
    WAL
     │
     ▼
恢复数据库
```

这与 PostgreSQL 的：

> **WAL（Write-Ahead Logging）**

机制密切相关。

官方文档对 [Backup and Restore](https://www.postgresql.org/docs/18/backup.html) 以及 WAL 归档、基础备份等内容都有详细说明。

---

# MySQL 与 PostgreSQL 备份方式对比

| 方式 | MySQL | PostgreSQL |
|---|---|---|
| 逻辑备份 | `mysqldump` | `pg_dump` |
| 全局逻辑备份 | `mysqldump` 等 | `pg_dumpall` |
| 物理备份 | 有 | 有 |
| 日志恢复能力 | Binlog 等 | WAL |
| 大型生产环境 | 通常需要专门备份方案 | 通常需要专门备份方案 |

因此：

> **备份命令只是第一步，真正重要的是“备份能不能恢复”。**

---

# 恢复测试

一个非常常见的错误是：

```text
每天都有备份
↓
所以数据库安全
```

实际上更重要的问题是：

```text
备份文件存在吗？
       ↓
完整吗？
       ↓
能恢复吗？
       ↓
恢复需要多久？
       ↓
恢复后的数据到哪个时间点？
```

所以数据库备份一定应该包含：

```text
Backup
+
Restore Test
```

---

# RPO 与 RTO

数据库高可用和灾备中经常出现：

### RPO

> **Recovery Point Objective**

表示：

> 可以接受最多丢失多少数据。

例如：

```text
RPO = 5 min
```

意味着故障时希望：

```text
最多损失约 5 分钟的数据变化
```

---

### RTO

> **Recovery Time Objective**

表示：

> 希望在多长时间内恢复服务。

例如：

```text
RTO = 30 min
```

意味着：

```text
故障
↓
30 分钟内恢复服务
```

因此：

```text
RPO
↓
最多丢多少数据

RTO
↓
最多停多久
```

---

# MySQL 日志

MySQL 的日志体系比较丰富。

常见日志包括：

```text
Error Log
General Query Log
Slow Query Log
Binary Log
```

---

## Error Log

记录：

```text
启动错误
崩溃
配置问题
严重异常
```

排查数据库：

```text
启动失败
服务异常
```

时，首先就应该关注 Error Log。

---

## Slow Query Log

慢查询日志用于记录：

> **执行时间超过指定条件的查询。**

它非常适合：

```text
慢 SQL 分析
```

例如：

```text
SQL
 ↓
执行 8 秒
 ↓
Slow Query Log
```

然后进一步：

```text
EXPLAIN
```

检查执行计划。

---

## Binary Log

MySQL Binary Log（Binlog）非常重要。

它记录数据库中发生的：

```text
数据修改事件
```

并广泛用于：

```text
复制
增量恢复
数据同步
```

可以理解为：

```text
Transaction
     │
     ▼
  Binlog
     │
     ├── Replica
     └── Recovery
```

---

# PostgreSQL 日志

PostgreSQL 常见日志用于记录：

```text
启动 / 停止
连接
认证
错误
查询
检查点
恢复
```

具体日志行为由 PostgreSQL 的：

```text
logging_collector
log_statement
log_min_duration_statement
log_min_messages
```

等配置控制。

官方文档中的 [Error Reporting and Logging](https://www.postgresql.org/docs/18/runtime-config-logging.html) 对日志配置进行了详细说明。

---

# PostgreSQL WAL

PostgreSQL 非常重要的机制：

> **WAL（Write-Ahead Log）**

其基本思想是：

```text
数据修改
   │
   ▼
先写 WAL
   │
   ▼
之后再处理数据页面
```

这样数据库崩溃后可以根据 WAL 进行：

```text
Crash Recovery
```

WAL 同时还是：

```text
Streaming Replication
Point-in-Time Recovery
```

等机制的重要基础。

---

# 性能与索引

## 为什么需要索引

例如：

```sql
SELECT *
FROM users
WHERE email = 'alice@example.com';
```

如果：

```text
users
```

有：

```text
1000 万行
```

没有适当索引时，数据库可能需要扫描大量记录。

建立索引后，可以缩小查找范围。

因此：

```text
Index
↓
减少需要检查的数据
↓
提高某些查询效率
```

---

# MySQL 索引

MySQL 中最常见的索引结构之一是：

```text
B-Tree
```

例如：

```sql
CREATE INDEX idx_users_email
ON users(email);
```

查询：

```sql
SELECT *
FROM users
WHERE email = 'alice@example.com';
```

优化器可能选择：

```text
Index Lookup
```

然后定位数据。

---

# PostgreSQL 索引

PostgreSQL 也支持：

```text
B-tree
Hash
GiST
SP-GiST
GIN
BRIN
```

等不同索引类型。

其中最常用的仍然是：

```text
B-tree
```

例如：

```sql
CREATE INDEX idx_users_email
ON users(email);
```

但是 PostgreSQL 的索引体系比简单的：

```text
“只有 B+Tree”
```

更加丰富。

不同索引类型适合：

```text
等值查询
范围查询
全文搜索
数组
JSON
空间数据
大范围顺序扫描
```

等不同场景。

官方文档：[PostgreSQL Indexes](https://www.postgresql.org/docs/18/indexes.html)。

---

# EXPLAIN

不能因为：

```text
“建立了索引”
```

就认为：

```text
“查询一定变快”
```

真正应该观察：

> **执行计划（Execution Plan）**

MySQL：

```sql
EXPLAIN
SELECT *
FROM users
WHERE email = 'alice@example.com';
```

PostgreSQL：

```sql
EXPLAIN
SELECT *
FROM users
WHERE email = 'alice@example.com';
```

可以看到：

```text
Seq Scan
Index Scan
Index Only Scan
Join
Cost
Rows
```

等信息。

---

# 全表扫描

如果数据库决定：

```text
Seq Scan
```

或者：

```text
Full Table Scan
```

不一定表示数据库有问题。

有时候：

```text
表很小
```

或者：

```text
查询返回大量数据
```

全表扫描反而可能比使用索引更划算。

因此：

> **索引优化的核心不是“所有查询都必须走索引”，而是让优化器能够选择合适的访问路径。**

---

# 联合索引

例如：

```sql
CREATE INDEX idx_user
ON users(name, age);
```

可以用于某些涉及：

```text
name
name + age
```

的查询。

但对于：

```text
只查询 age
```

是否能够有效利用这个索引，要结合具体 DBMS 的优化器和执行计划判断。

因此不要机械记成：

```text
有索引
↓
一定使用
```

---

# 慢查询排查

数据库查询变慢时，可以形成：

```text
慢查询
   ↓
找到 SQL
   ↓
EXPLAIN
   ↓
查看执行计划
   ↓
是否全表扫描？
   ↓
索引是否合理？
   ↓
数据量是否增长？
   ↓
是否存在锁等待？
   ↓
CPU / Memory / I/O
```

这样比直接：

```text
“给字段加索引”
```

更加可靠。

---

# 数据库资源

数据库性能不仅取决于 SQL。

还可能受到：

```text
CPU
Memory
Disk I/O
Network
Connections
Locks
Cache
```

影响。

例如：

```text
SQL 很快
但连接池耗尽
```

应用仍然可能：

```text
请求超时
```

又例如：

```text
SQL 没有问题
```

但：

```text
磁盘 I/O 很慢
```

数据库仍然可能整体变慢。

因此：

> **数据库性能问题必须从 SQL、数据库内部状态和操作系统资源三个层次一起看。**

---

# MySQL 存储引擎

MySQL 一个非常重要的概念是：

> **Storage Engine（存储引擎）**

MySQL Server 的通用服务层和具体存储引擎之间存在分层。

常见存储引擎：

```text
InnoDB
```

其中 InnoDB 是现代 MySQL 中最主要的事务型存储引擎。

可以简单理解：

```text
MySQL Server
      │
      ▼
Storage Engine
      │
      ▼
Data / Index
```

这也是为什么 MySQL 的：

```text
事务
锁
索引
日志
```

等行为不能完全脱离存储引擎理解。

---

# PostgreSQL 的存储体系

PostgreSQL 不采用与 MySQL InnoDB 完全相同的“可插拔存储引擎”模型。

它的核心数据管理由 PostgreSQL 本身的存储和执行架构负责。

因此：

```text
MySQL
↓
Storage Engine 是非常重要的架构概念

PostgreSQL
↓
整体数据库引擎架构不同
```

这也是两者学习时不能简单套模板的地方。

---

# MySQL 复制

MySQL 可以通过：

> **Replication**

让一个服务器从另一个服务器同步数据。

可以简单理解为：

```text
Source
   │
   │ Binlog
   ▼
Replica
   │
   ▼
Replay
```

典型架构：

```text
          Primary
             │
          Binlog
             │
       ┌─────┴─────┐
       ▼           ▼
   Replica 1   Replica 2
```

可以用于：

```text
读扩展
备份辅助
故障切换基础
```

但：

> **Replication 不等于完整高可用。**

还需要处理：

```text
故障检测
角色切换
数据一致性
客户端重新连接
```

等问题。

---

# PostgreSQL Streaming Replication

PostgreSQL 常见复制方式：

> **Streaming Replication**

可以简化成：

```text
Primary
   │
   │ WAL
   ▼
Standby
   │
   ▼
Replay
```

Primary 持续产生：

```text
WAL
```

Standby 接收并重放 WAL。

可以构建：

```text
Primary
   │
   ├── Standby 1
   └── Standby 2
```

这样的复制结构。

---

# 主从复制并不等于高可用

这是数据库运维中非常重要的一点。

假设：

```text
Primary
   │
   ▼
Replica
```

即使有 Replica：

```text
Primary 挂了
```

也不代表：

```text
Replica 自动接管
```

因为完整高可用还需要：

```text
故障检测
+
Leader Election / Failover
+
客户端切换
+
数据一致性
+
脑裂防护
```

等机制。

因此：

> **复制是高可用的基础能力之一，而不是高可用方案本身。**

---

# 数据库高可用

一个简单的高可用架构可以理解成：

```text
                 Client
                   │
                   ▼
              Proxy / VIP
                   │
             ┌─────┴─────┐
             │           │
             ▼           ▼
          Primary      Standby
             │           ▲
             │           │
             └── Replication
```

如果：

```text
Primary
```

发生故障：

```text
Failover
   ↓
Standby
   ↓
Promote
   ↓
新的 Primary
```

客户端需要：

```text
重新连接
```

因此一个真正可用的高可用方案一般还需要：

```text
数据库
+
复制
+
故障检测
+
自动 / 半自动切换
+
客户端发现
```

---

# MySQL 与 PostgreSQL 高可用思路

| 方向 | MySQL | PostgreSQL |
|---|---|---|
| 主要复制基础 | Binlog | WAL |
| 常见复制 | Source / Replica | Primary / Standby |
| 日志 | Binlog | WAL |
| 故障切换 | 需要额外机制 | 需要额外机制 |
| 高可用 | Replication + Failover | Streaming Replication + Failover |

因此两套系统虽然：

```text
实现方式不同
```

但运维思想高度相似：

```text
主库
 ↓
复制日志
 ↓
备用节点
 ↓
故障检测
 ↓
切换
 ↓
恢复服务
```

---

# 数据库安全

数据库安全不能只考虑：

```text
用户名
密码
```

还应该包括：

```text
监听地址
网络访问控制
数据库用户
权限
认证
TLS
日志
备份安全
密钥管理
```

例如：

```text
Database
    │
    ├── 不必要的公网暴露
    ├── 弱密码
    ├── 过高权限
    └── 明文传输
```

都可能成为安全风险。

---

# 数据库不要直接暴露公网

如果没有特殊需求：

```text
Internet
   │
   ▼
Database :3306
```

通常不是好的设计。

更常见：

```text
Internet
   │
   ▼
Nginx
   │
   ▼
Application
   │
   ▼
Database
```

也就是说：

> **数据库通常只需要对应用服务器开放，而不是对整个 Internet 开放。**

因此数据库运维和 Linux 防火墙、网络管理是直接联系在一起的。

---

# 数据库故障排查

当 Web 应用出现：

```text
Database connection failed
```

可以建立如下思路：

```text
应用
 ↓
数据库连接配置
 ↓
Host
 ↓
Port
 ↓
网络
 ↓
防火墙
 ↓
数据库监听
 ↓
用户名 / 密码
 ↓
权限
 ↓
数据库本身
```

---

# 典型连接故障

## Connection refused

例如：

```text
Connection refused
```

优先检查：

```bash
ss -lntp
```

确认数据库端口是否监听。

例如：

```text
3306
5432
```

是否存在。

---

## Timeout

例如：

```text
Connection timed out
```

更应该关注：

```text
路由
防火墙
安全组
网络 ACL
链路
```

---

## Authentication failed

如果网络：

```text
正常
```

端口：

```text
正常
```

但认证失败：

```text
Access denied
password authentication failed
```

那么重点关注：

```text
用户名
密码
Host / Source
认证配置
权限
```

---

# MySQL 日志排障

例如 MySQL 启动失败：

```bash
systemctl status mysql
```

先看 systemd 状态。

再查看：

```text
MySQL Error Log
```

重点关注：

```text
配置错误
权限
数据目录
磁盘空间
端口冲突
InnoDB
```

例如：

```text
Disk Full
```

可能导致：

```text
数据库无法写入
日志无法增长
事务失败
```

---

# PostgreSQL 日志排障

PostgreSQL 同样可以：

```text
systemctl status postgresql
```

然后查看对应日志。

重点关注：

```text
认证
监听地址
端口
配置文件
WAL
恢复
磁盘
权限
```

如果出现：

```text
database system is starting up
```

之类的信息，还需要结合当前数据库的：

```text
Recovery
Replication
Startup
```

状态判断。

---

# 一个完整的数据库运维排障模型

可以把前面的内容整合成：

```text
                    Web Request
                         │
                         ▼
                    Application
                         │
                         ▼
                 Connection Pool
                         │
                         ▼
                  Database Connection
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       Network          Port           Auth
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                        DBMS
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
             SQL      Transaction   Lock
              │          │          │
              └──────────┼──────────┘
                         ▼
                     Optimizer
                         │
                         ▼
                       Index
                         │
                         ▼
                     Data / Cache
                         │
                         ▼
                       Disk
```

如果出现：

```text
请求变慢
```

就可以逐层判断：

```text
连接池？
   ↓
网络？
   ↓
数据库连接？
   ↓
锁？
   ↓
SQL？
   ↓
索引？
   ↓
磁盘？
```

而不是一看到数据库慢就：

```text
“加 CPU”
```

或者：

```text
“加索引”
```

---

# MySQL 与 PostgreSQL 的对比

| 项目 | MySQL | PostgreSQL |
|---|---|---|
| 类型 | 关系型数据库 | 关系型数据库 |
| 典型服务 | `mysqld` | PostgreSQL server |
| 默认端口 | `3306` | `5432` |
| 用户模型 | User + Host | Role |
| 常见客户端 | `mysql` | `psql` |
| 逻辑备份 | `mysqldump` | `pg_dump` |
| 关键日志 | Binlog / Error / Slow | WAL / Error / Query Logs |
| 常见索引 | B-Tree | B-tree 等多种 |
| 复制基础 | Binlog | WAL |
| 典型复制 | Source / Replica | Primary / Standby |
| 权限管理 | `GRANT` / `REVOKE` | `GRANT` / `REVOKE` |
| 服务管理 | systemd | systemd |

这里最重要的不是：

```text
谁更好
```

而是：

> **两者都是成熟的关系型数据库，但具体架构、配置和运维工具不同。**

---

# SQL 数据库系统的完整结构

把这篇内容与上一篇的数据库架构结合起来，可以得到：

```text
                        Web Application
                              │
                              ▼
                       Connection Pool
                              │
                              ▼
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
                  MySQL             PostgreSQL
                    │                   │
             ┌──────┼──────┐      ┌─────┼──────┐
             │      │      │      │     │      │
             ▼      ▼      ▼      ▼     ▼      ▼
            SQL   Txn   Index     SQL   Txn   Index
             │      │      │       │     │      │
             └──────┴──────┘       └─────┴──────┘
                    │                   │
                    ▼                   ▼
                 Storage             Storage
                    │                   │
                    ▼                   ▼
                   Disk                Disk
```

运维层面则是：

```text
                   Database Operations
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
    Install              Security             Backup
      │                    │                    │
      ▼                    ▼                    ▼
  systemd             User / Role         Logical Backup
      │               Privilege            Physical Backup
      ▼                    │                    │
   Config                  ▼                    ▼
      │                Network / TLS         Restore
      ▼                                         │
    Logs                                        ▼
      │                                        RPO/RTO
      ▼
 Troubleshooting
      │
      ├── Connection
      ├── SQL
      ├── Lock
      ├── Index
      ├── CPU
      ├── Memory
      └── I/O
                           │
                           ▼
                      High Availability
                           │
                   ┌───────┴───────┐
                   │               │
                Replication      Failover
```

---

# 数据库运维的核心思路

学习 MySQL 和 PostgreSQL，不应该只记：

```text
mysql 怎么安装
psql 怎么安装
```

更重要的是建立下面这套思维：

```text
数据库有没有运行？
        ↓
监听在哪里？
        ↓
谁可以连接？
        ↓
谁拥有什么权限？
        ↓
数据如何备份？
        ↓
备份如何恢复？
        ↓
日志在哪里？
        ↓
SQL 为什么慢？
        ↓
索引是否合理？
        ↓
数据库是否受 CPU / Memory / I/O 限制？
        ↓
主库故障怎么办？
```

最终可以浓缩成：

```text
安装
 ↓
配置
 ↓
权限
 ↓
连接
 ↓
SQL
 ↓
事务
 ↓
索引
 ↓
日志
 ↓
备份
 ↓
恢复
 ↓
复制
 ↓
高可用
```

这套知识已经覆盖了 Linux 运维岗位中最常见的数据库基础能力。

下一篇再继续学习：

```text
NoSQL
```

就可以自然进入：

```text
Redis
MongoDB
```

等非关系型数据库，而不会和 MySQL / PostgreSQL 的关系型数据库体系混在一起。

## 外部参考

- [MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/)
- [MySQL Backup and Recovery](https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html)
- [PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/18/backup.html)
- [PostgreSQL Database Roles](https://www.postgresql.org/docs/18/user-manag.html)
