---
title: 数据库基础：主流 NoSQL 数据库系统
published: 2026-09-13T23:34:12Z
image: ''
tags: [数据库, NoSQL, Redis, MongoDB, Milvus]
category: 学习笔记
draft: false
lang: ''
---

> NoSQL 数据库并不是“不要 SQL 的数据库”这么简单，而是针对缓存、文档、搜索与向量检索等不同场景，对数据模型和访问方式做出的不同取舍。
>
> 本文主要介绍 Redis、MongoDB 与 Milvus，并从 Linux 运维视角理解它们的部署、配置、数据安全、备份恢复与故障排查。

# 一、NoSQL 数据库概述

传统关系型数据库以表、行、列和 SQL 为核心，适合结构化数据以及复杂事务处理。

NoSQL（Not Only SQL）则泛指一类非关系型或非纯关系模型数据库。它们通常针对某类数据模型或访问场景进行了专门优化。

常见类型包括：

| 类型 | 代表系统 | 核心模型 | 常见场景 |
| --- | --- | --- | --- |
| Key-Value | Redis | Key → Value | 缓存、Session、计数器、排行榜 |
| Document | MongoDB | BSON/Document | JSON 类业务数据、内容系统 |
| Wide Column | Cassandra、HBase | 列族 | 海量分布式数据 |
| Graph | Neo4j | Node + Edge | 社交关系、知识图谱 |
| Vector Database | Milvus | Vector + Scalar | 向量检索、RAG、语义搜索 |

因此，**NoSQL 不是某一种数据库，而是一类数据库系统的统称。**

本文选择 Redis、MongoDB 和 Milvus，是因为三者分别代表了当前应用开发与基础设施场景中非常典型的三种数据存储需求：

```text
                  NoSQL / 非关系型数据系统
                           │
          ┌────────────────┼────────────────┐
          │                │                │
        Redis           MongoDB          Milvus
          │                │                │
       Key-Value        Document        Vector
          │                │                │
      高速缓存         灵活业务数据      向量相似度检索
```

# 二、Redis 基础与 Linux 部署

## 2.1 Redis 是什么

Redis 是一种内存型数据存储系统，核心特点是将数据保存在内存中，并提供丰富的数据结构和高性能的数据访问能力。

它最常见的使用方式并不是替代 MySQL、PostgreSQL，而是作为应用系统旁边的一层高速数据存储。

例如：

```text
用户请求
   │
   ▼
 Web / API 服务
   │
   ├──── Redis ────► 高速缓存
   │
   └──── MySQL ────► 持久业务数据
```

因此，一个典型 Web 系统可能同时使用：

```text
MySQL / PostgreSQL
        │
        │ 主业务数据
        ▼
      应用服务
        │
        │ 高频访问数据
        ▼
       Redis
```

Redis 官方文档：
[Redis Documentation](https://redis.io/docs/)

## 2.2 Redis 常见数据类型

Redis 最重要的特点之一，是它提供了多种内置数据结构。

### String

最基础的数据类型：

```text
key → value
```

例如：

```text
user:1001:name → "Alice"
```

可以保存字符串、数字甚至二进制数据。

常见操作：

```bash
SET user:1001:name Alice
GET user:1001:name
```

String 还非常适合计数器：

```bash
SET page:view 100
INCR page:view
```

执行后：

```text
101
```

官方文档：
[Redis Data Types](https://redis.io/docs/latest/develop/data-types/)

### Hash

Hash 可以表示一个对象中的多个字段：

```text
user:1001
 ├── name → Alice
 ├── age  → 20
 └── city → Guangzhou
```

例如：

```bash
HSET user:1001 name Alice age 20 city Guangzhou
HGET user:1001 name
HGETALL user:1001
```

它非常适合保存简单对象。

### List

List 是有序字符串集合：

```bash
LPUSH queue task1
LPUSH queue task2
RPOP queue
```

常用于：

- 简单任务队列
- 消息缓冲
- 最新数据列表

### Set

Set 中的元素具有唯一性：

```bash
SADD tags linux
SADD tags docker
SADD tags linux
```

第二次添加 `linux` 不会产生重复元素。

常用于：

- 标签集合
- 去重
- 集合运算

### Sorted Set

Sorted Set 在元素之外还具有一个 score：

```text
user1 → 100
user2 → 80
user3 → 95
```

因此特别适合排行榜：

```bash
ZADD ranking 100 user1
ZADD ranking 80 user2
ZADD ranking 95 user3
```

然后按照分数排序获取结果。

### Stream

Redis Stream 用于保存一系列消息记录：

```text
message1
message2
message3
...
```

更适合事件流、消息处理等场景。

因此 Redis 常见数据结构可以简单理解为：

| 类型 | 主要特征 | 常见用途 |
| --- | --- | --- |
| String | 单值 | 缓存、计数器 |
| Hash | 字段集合 | 对象 |
| List | 有序序列 | 队列、列表 |
| Set | 唯一集合 | 去重、集合运算 |
| Sorted Set | 元素 + 分数 | 排行榜 |
| Stream | 消息流 | 事件、消息处理 |

## 2.3 Linux 安装 Redis

Redis 官方提供了 Linux 安装方式。

Ubuntu / Debian 可以使用官方 APT 源：

```bash
sudo apt-get install lsb-release curl gpg

curl -fsSL https://packages.redis.io/gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] \
https://packages.redis.io/deb $(lsb_release -cs) main" \
| sudo tee /etc/apt/sources.list.d/redis.list

sudo apt-get update
sudo apt-get install redis
```

参考：
[Redis - Install on Linux](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/)

安装完成后，可以查看服务：

```bash
sudo systemctl status redis-server
```

启动：

```bash
sudo systemctl start redis-server
```

设置开机启动：

```bash
sudo systemctl enable redis-server
```

停止：

```bash
sudo systemctl stop redis-server
```

重启：

```bash
sudo systemctl restart redis-server
```

## 2.4 Redis 默认端口

Redis 默认监听：

```text
6379
```

可以使用：

```bash
ss -lntp | grep 6379
```

检查监听状态。

也可以直接使用客户端：

```bash
redis-cli
```

测试：

```text
127.0.0.1:6379> PING
PONG
```

如果出现：

```text
PONG
```

说明客户端已经成功连接 Redis。

## 2.5 Redis 配置文件

Redis 的具体配置位置取决于安装方式和发行版。

常见配置项包括：

```text
bind
port
protected-mode
requirepass / ACL
maxmemory
maxmemory-policy
appendonly
save
dir
```

查看当前实例配置可以使用：

```bash
redis-cli CONFIG GET port
```

或者：

```bash
redis-cli CONFIG GET maxmemory
```

运维过程中首先应该确认：

```text
配置文件
   │
   ├── 监听地址
   ├── 监听端口
   ├── 内存限制
   ├── 持久化策略
   ├── 日志
   └── 认证与访问控制
```

# 三、Redis 缓存与常见应用场景

## 3.1 Redis 为什么适合缓存

缓存的核心思想是：

```text
             Cache Hit
请求 ───► Redis ─────────► 返回结果
           │
           │ Cache Miss
           ▼
        MySQL / API
```

如果 Redis 中已经存在需要的数据，应用就不需要再次访问数据库。

例如：

```text
GET user:1001
```

如果缓存存在：

```text
Redis → 用户信息
```

否则：

```text
Redis Miss
   │
   ▼
MySQL 查询
   │
   ▼
写入 Redis
   │
   ▼
返回客户端
```

这可以减少数据库压力，同时降低响应延迟。

## 3.2 Cache

最典型的缓存形式：

```text
key:
user:1001

value:
{
    "name": "Alice",
    "age": 20
}
```

并设置过期时间：

```bash
SET user:1001 Alice EX 300
```

表示 300 秒后自动过期。

常见缓存策略包括：

### Cache Aside

应用先查询缓存：

```text
查询 Redis
   │
   ├── 命中 → 返回
   │
   └── 未命中
         │
         ▼
      查询数据库
         │
         ▼
      写入 Redis
```

这是业务系统中非常常见的模式。

## 3.3 Session

Web 应用的 Session 也可以放入 Redis：

```text
Browser
   │
   │ Cookie: SESSION_ID
   ▼
Application
   │
   ▼
Redis
   │
   └── Session Data
```

这样在多个应用实例之间就可以共享 Session：

```text
             ┌── Web 1 ──┐
Client ──────┼── Web 2 ──┼──── Redis
             └── Web 3 ──┘
```

这对于负载均衡后的多实例部署非常有用。

## 3.4 计数器

Redis 的原子递增操作适合实现：

```text
访问量
点赞数
库存计数
API 调用次数
限流计数
```

例如：

```bash
INCR article:1001:view
```

### 原子操作

Redis 提供很多原子操作，例如：

```bash
INCR counter
DECR counter
```

这比先读取再写回更加适合并发计数场景。

## 3.5 排行榜

Sorted Set 天然适合排行榜：

```text
100 userA
98  userC
85  userB
```

应用可以根据 score 获取排名。

例如：

```bash
ZREVRANGE ranking 0 9 WITHSCORES
```

获取前 10 名。

## 3.6 分布式锁

Redis 也经常被用于实现分布式协调机制。

最基本的思想是利用带条件的写入：

```text
SET lock_key unique_value NX EX 30
```

其中：

- `NX`：仅当 key 不存在时设置
- `EX 30`：30 秒后自动过期

实际生产环境中的分布式锁要考虑过期、续期、客户端异常和释放锁安全等问题，因此不能简单理解成“SET 一个 key 就完成了分布式锁”。

# 四、Redis 持久化与数据安全

虽然 Redis 主要使用内存，但它并不是只能存在内存中。

Redis 提供多种持久化方式，其中最核心的是：

```text
RDB
AOF
```

也可以组合使用。

官方文档：
[Redis Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

## 4.1 RDB

RDB 是定期生成数据快照。

可以理解为：

```text
Redis 内存数据
      │
      │ 某个时间点
      ▼
   RDB Snapshot
      │
      ▼
   磁盘文件
```

它保存的是某一时刻的数据状态。

优点：

- 文件紧凑
- 恢复速度通常较快
- 对长期归档和备份比较方便

缺点：

- 两次快照之间发生故障可能丢失部分数据
- 快照生成可能带来额外资源开销

## 4.2 AOF

AOF（Append Only File）记录写操作。

例如：

```text
SET user Alice
INCR counter
DEL session
```

这些写操作会被写入 AOF，Redis 重启后可以重新执行这些操作来恢复数据。

可以理解为：

```text
客户端写入
    │
    ▼
 Redis
    │
    └──► AOF
            │
            ▼
        重放写操作
            │
            ▼
        恢复数据
```

AOF 一般比普通快照具有更细粒度的数据恢复能力，但也会带来额外的磁盘和恢复开销。

## 4.3 RDB + AOF

Redis 可以同时使用 RDB 和 AOF。

典型思路是：

```text
RDB → 快速恢复的基础快照
AOF → 更细粒度的写操作记录
```

应该根据业务的：

```text
数据重要性
可接受数据丢失量
恢复时间要求
磁盘资源
```

选择持久化策略。

## 4.4 备份不能等于持久化

这是运维中非常容易混淆的概念：

```text
开启 AOF
≠
已经完成备份
```

因为 AOF/RDB 本身也是数据库运行时产生的数据文件。

真正的备份还需要考虑：

```text
数据库文件
      │
      ▼
独立存储
      │
      ├── 本机其他磁盘
      ├── NAS
      ├── 对象存储
      └── 远程备份服务器
```

备份必须与原机器故障隔离。

## 4.5 Redis 数据安全

生产环境不要直接把 Redis 暴露到公网。

应该至少考虑：

```text
网络隔离
防火墙
访问控制
认证
最小权限
TLS
备份
监控
```

尤其不能简单认为：

```text
Redis 默认端口 6379
→ 改掉端口
→ 就安全了
```

修改端口只能降低一部分自动化扫描风险，并不能替代认证和网络访问控制。

# 五、Redis 常见故障与性能排查

Redis 的故障排查应该从：

```text
服务
 │
 ├── 进程
 ├── 端口
 ├── 连接
 ├── 内存
 ├── 慢查询
 ├── 热点 Key
 └── 持久化
```

逐层分析。

## 5.1 服务无法启动

首先：

```bash
systemctl status redis-server
```

查看日志：

```bash
journalctl -u redis-server
```

然后检查：

```text
配置文件
端口占用
目录权限
磁盘空间
日志
```

检查端口：

```bash
ss -lntp | grep 6379
```

## 5.2 Redis 内存过高

查看：

```bash
redis-cli INFO memory
```

重点关注：

```text
used_memory
used_memory_peak
maxmemory
mem_fragmentation_ratio
```

如果 Redis 是缓存，通常应该设置合理的：

```text
maxmemory
maxmemory-policy
```

例如缓存场景中可以使用淘汰策略：

```text
allkeys-lru
allkeys-lfu
volatile-lru
volatile-lfu
```

具体选择需要结合业务访问模式。

## 5.3 连接过多

可以查看：

```bash
redis-cli INFO clients
```

以及：

```bash
redis-cli CLIENT LIST
```

常见原因包括：

```text
连接池配置不合理
客户端没有及时释放连接
大量短连接
应用实例数量过多
连接泄漏
```

因此 Redis 连接数异常时，不应该只看 Redis，还需要检查应用侧。

## 5.4 慢查询

Redis 可以记录执行时间较长的命令。

查看慢查询：

```bash
redis-cli SLOWLOG GET
```

需要注意：

Redis 单线程执行模型意味着，一个运行时间过长的命令可能阻塞其他请求。

因此应避免对超大数据集合执行不合理操作，例如：

```text
KEYS *
```

在生产环境中应谨慎使用。

可以优先考虑：

```bash
SCAN 0
```

进行渐进式遍历。

## 5.5 热点 Key

所谓热点 Key，就是某些 Key 被大量请求访问：

```text
大量请求
   │
   ├──► key:A
   ├──► key:A
   ├──► key:A
   └──► key:A
```

如果某个 Redis Key 的访问量远高于其他 Key，可能导致：

```text
单节点压力过高
CPU 增加
网络集中
请求延迟增加
```

排查热点 Key 时需要结合业务访问模式、监控以及 Redis 统计信息综合判断。

# 六、MongoDB 基础与 Linux 部署

## 6.1 MongoDB 是什么

MongoDB 是一种文档型数据库。

它不是：

```text
Table → Row → Column
```

而是更接近：

```text
Database
   │
   └── Collection
          │
          ├── Document
          ├── Document
          └── Document
```

Document 通常使用 BSON 表示，形式上与 JSON 很接近：

```json
{
  "_id": 1001,
  "name": "Alice",
  "age": 20,
  "tags": ["linux", "docker"]
}
```

MongoDB 官方文档：
[MongoDB Documentation](https://www.mongodb.com/docs/)

## 6.2 Database、Collection、Document

MongoDB 的核心层级：

```text
MongoDB
  │
  └── Database
        │
        └── Collection
              │
              └── Document
```

可以类比关系数据库：

| MongoDB | 关系数据库 |
| --- | --- |
| Database | Database |
| Collection | Table |
| Document | Row |
| Field | Column |

但这种对应关系只是帮助理解，两者的数据模型并不完全相同。

## 6.3 MongoDB 文档模型

MongoDB 的一个优势是文档结构灵活。

例如：

```json
{
  "name": "Alice",
  "address": {
    "city": "Guangzhou",
    "country": "China"
  }
}
```

也可以保存数组：

```json
{
  "name": "Alice",
  "skills": [
    "Linux",
    "Docker",
    "Kubernetes"
  ]
}
```

这非常适合结构变化较快的业务数据。

## 6.4 MongoDB 安装

MongoDB 官方建议在 Ubuntu 上使用官方软件源和 APT 安装。

例如 MongoDB 8.0 的 Ubuntu 安装流程：

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg
```

随后配置 MongoDB 官方仓库并安装：

```bash
sudo apt-get install -y mongodb-org
```

不同 Ubuntu 版本对应的软件源配置不同，因此实际安装时应以 MongoDB 官方对应版本文档为准：

[Install MongoDB Community Edition on Ubuntu](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu/)

## 6.5 systemd 服务管理

安装后可以通过：

```bash
sudo systemctl start mongod
```

启动 MongoDB。

查看状态：

```bash
sudo systemctl status mongod
```

开机启动：

```bash
sudo systemctl enable mongod
```

停止：

```bash
sudo systemctl stop mongod
```

重启：

```bash
sudo systemctl restart mongod
```

日志通常可以从 MongoDB 日志文件或 systemd 日志中查看。

## 6.6 MongoDB 默认端口

MongoDB 默认端口通常是：

```text
27017
```

检查：

```bash
ss -lntp | grep 27017
```

然后可以使用：

```bash
mongosh
```

连接数据库。

# 七、MongoDB 配置、用户与权限

## 7.1 MongoDB 配置

MongoDB 常用配置内容包括：

```text
bindIp
port
dbPath
systemLog
security
```

其中：

- `bindIp`：控制监听哪些网络地址
- `port`：控制监听端口
- `dbPath`：数据库文件目录
- `systemLog`：日志配置
- `security`：安全配置

生产环境最重要的原则之一仍然是：

```text
不要无防护暴露数据库到公网
```

## 7.2 用户与角色

MongoDB 使用基于角色的访问控制。

可以创建用户：

```javascript
use admin

db.createUser({
  user: "admin",
  pwd: "strong-password",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" }
  ]
})
```

之后应用应该使用业务专用账号，而不是管理员账号。

例如：

```text
admin
 │
 ├── 管理员账号
 │
 └── application_user
       │
       └── 只访问 application 数据库
```

MongoDB 官方：
[Users and Roles](https://www.mongodb.com/docs/manual/core/security-users/)

## 7.3 最小权限

数据库用户应该遵循最小权限原则：

```text
应用只需要读
→ 授予读权限

应用需要读写
→ 授予读写权限

运维账号
→ 根据管理职责授予管理权限
```

不要让普通应用直接使用超级管理员账号。

# 八、MongoDB 数据备份与恢复

MongoDB 常见逻辑备份工具包括：

```text
mongodump
mongorestore
```

## 8.1 mongodump

备份数据库：

```bash
mongodump \
  --uri="mongodb://localhost:27017/mydb" \
  --out=/backup/mydb
```

结果可能类似：

```text
/backup/mydb/
├── collection1.bson
├── collection1.metadata.json
├── collection2.bson
└── collection2.metadata.json
```

## 8.2 mongorestore

恢复：

```bash
mongorestore \
  --uri="mongodb://localhost:27017/mydb" \
  /backup/mydb
```

备份和恢复首先解决的是：

```text
数据误删
数据库损坏
机器故障后的数据恢复
```

但真正的生产备份还必须考虑：

```text
备份频率
备份位置
备份保留时间
恢复测试
RPO
RTO
```

MongoDB 官方：
[Backup and Restore Methods](https://www.mongodb.com/docs/manual/core/backups/)

## 8.3 备份恢复测试

“已经执行备份命令”不等于“已经具备恢复能力”。

完整流程应该是：

```text
生产 MongoDB
      │
      ▼
    Backup
      │
      ▼
独立存储
      │
      ▼
   定期恢复测试
      │
      ▼
确认数据可以恢复
```

对于运维而言：

```text
Backup
  +
Restore Test
```

才构成真正可验证的备份体系。

# 九、MongoDB 索引与性能基础

## 9.1 为什么需要索引

没有索引时，数据库可能需要扫描大量文档：

```text
Collection
 ├── Document 1
 ├── Document 2
 ├── Document 3
 ├── ...
 └── Document N
```

如果查询：

```javascript
db.users.find({ name: "Alice" })
```

没有适合的索引，就可能扫描大量数据。

建立索引：

```javascript
db.users.createIndex({ name: 1 })
```

数据库可以利用索引快速定位数据。

MongoDB 官方：
[Indexes](https://www.mongodb.com/docs/manual/indexes/)

## 9.2 单字段索引

```javascript
db.users.createIndex({ name: 1 })
```

表示按照 `name` 建立索引。

## 9.3 复合索引

```javascript
db.users.createIndex({
  city: 1,
  age: -1
})
```

字段顺序非常重要。

索引设计必须结合实际查询：

```text
经常查询什么？
排序什么？
过滤什么？
查询字段组合是什么？
```

而不是“索引越多越好”。

## 9.4 索引的代价

索引会提升部分查询性能，但也会带来：

```text
额外磁盘空间
写入成本
内存占用
维护成本
```

因此需要在：

```text
读性能
写性能
存储空间
```

之间进行权衡。

# 十、MongoDB 常见故障排查

## 10.1 服务无法启动

首先：

```bash
sudo systemctl status mongod
```

再查看日志。

重点检查：

```text
配置文件
dbPath
目录权限
端口占用
磁盘空间
日志
```

## 10.2 磁盘空间不足

MongoDB 数据库通常会随着数据量增长而扩大。

查看：

```bash
df -h
```

数据库目录：

```bash
du -sh /var/lib/mongodb
```

如果磁盘接近 100%，数据库可能出现写入失败等问题。

## 10.3 查询变慢

重点检查：

```text
索引
查询条件
返回数据量
排序
并发
磁盘 I/O
```

可以使用查询分析工具，例如：

```javascript
db.users.find({ name: "Alice" }).explain("executionStats")
```

重点观察：

```text
执行计划
扫描文档数量
返回文档数量
执行时间
```

## 10.4 连接问题

从：

```text
客户端
  │
  ▼
MongoDB 端口
  │
  ▼
认证
  │
  ▼
权限
  │
  ▼
数据库
```

逐层排查。

例如先确认：

```bash
ss -lntp | grep 27017
```

再确认网络和认证。

# 十一、Milvus 与向量数据库

## 11.1 什么是向量数据库

Redis 和 MongoDB 主要解决的是：

```text
Key-Value
Document
```

而 Milvus 解决的是：

```text
Vector Similarity Search
```

也就是**向量相似度搜索**。

例如一段文本经过 Embedding 模型后：

```text
"Linux 网络故障排查"
       │
       ▼
Embedding Model
       │
       ▼
[0.13, 0.82, 0.21, ...]
```

得到一个高维向量。

另一段文本：

```text
"Linux 网络连接异常怎么办"
```

也可以转换成向量。

虽然两段文本的字面内容不同，但它们的语义可能很接近，因此向量之间的距离也可能较小。

于是可以进行：

```text
Query Vector
      │
      ▼
Vector Database
      │
      ▼
寻找最相似的 Top-K 向量
```

这就是向量相似度搜索。

Milvus 官方：
[Milvus Documentation](https://milvus.io/docs)

## 11.2 Milvus 的基本模型

Milvus 的核心概念可以简单理解为：

```text
Database
   │
   └── Collection
          │
          ├── Vector Field
          ├── Scalar Field
          └── Primary Key
```

例如：

```text
documents
├── id
├── text
├── category
└── embedding
```

其中：

```text
embedding
    │
    └── [0.12, 0.35, 0.92, ...]
```

就是向量字段。

而：

```text
category
text
id
```

属于标量数据。

## 11.3 为什么普通数据库也能保存向量，却还需要 Milvus

理论上，向量可以保存到普通数据库中。

但是随着数据量增加：

```text
向量维度
      ×
向量数量
      ×
搜索请求数量
```

相似度检索的计算量会迅速增加。

因此，向量数据库通常会针对：

```text
向量存储
向量索引
相似度搜索
Top-K 检索
```

进行专门优化。

Milvus 官方提供多种索引和相似度搜索能力，适合构建大规模向量检索系统。

# 十二、Milvus Linux / Docker 部署

Milvus 的部署方式与 Redis、MongoDB 有明显不同。

Redis / MongoDB 可以直接作为系统服务运行，而 Milvus 很常见的部署方式是：

```text
Docker
Docker Compose
Kubernetes
```

Milvus 官方当前提供 Docker 和 Docker Compose 部署文档。

参考：
[Run Milvus in Docker](https://milvus.io/docs/install_standalone-docker.md)

## 12.1 Docker 部署

准备 Docker 环境后，可以使用官方脚本：

```bash
curl -sfL \
  https://raw.githubusercontent.com/milvus-io/milvus/master/scripts/standalone_embed.sh \
  -o standalone_embed.sh
```

启动：

```bash
bash standalone_embed.sh start
```

查看容器：

```bash
docker ps
```

停止：

```bash
bash standalone_embed.sh stop
```

当前 Milvus 官方文档中的 Standalone Docker 部署默认使用：

```text
Milvus
19530
```

同时会涉及元数据、存储等相关组件；实际部署结构会随 Milvus 版本演进，因此生产环境应以对应版本官方文档为准。

## 12.2 Docker Compose

如果需要更明确地管理组件和数据卷，可以使用 Docker Compose。

典型结构：

```text
Docker Compose
      │
      ├── Milvus
      ├── Metadata Store
      └── Object Storage
```

官方文档：
[Run Milvus with Docker Compose](https://milvus.io/docs/install_standalone-docker-compose.md)

## 12.3 Milvus 端口

Standalone 部署常见服务端口：

```text
19530 → Milvus 服务
```

某些部署中还会提供 Web UI，例如：

```text
9091
```

可以检查：

```bash
ss -lntp
```

或者：

```bash
docker ps
```

确认端口映射。

# 十三、Milvus 数据组织与向量搜索

## 13.1 Collection

Collection 可以理解为 Milvus 中的一组数据集合。

例如：

```text
documents
```

内部包含：

```text
id
title
content
embedding
category
```

其中：

```text
id          → 主键
title       → 标量字段
content     → 标量字段
embedding   → 向量字段
category    → 标量字段
```

## 13.2 Insert

向量经过 Embedding 模型生成后写入 Milvus：

```text
文本
 │
 ▼
Embedding Model
 │
 ▼
Vector
 │
 ▼
Milvus Collection
```

例如：

```text
文档 A
→ [0.12, 0.34, 0.78, ...]

文档 B
→ [0.18, 0.31, 0.75, ...]

文档 C
→ [0.93, 0.12, 0.08, ...]
```

## 13.3 Similarity Search

用户输入：

```text
Linux 网络连接异常怎么办？
```

首先转换成查询向量：

```text
Query
 │
 ▼
Embedding Model
 │
 ▼
Query Vector
 │
 ▼
Milvus
 │
 ├── Document A → 0.92
 ├── Document B → 0.88
 ├── Document C → 0.74
 └── ...
```

最后返回 Top-K 结果。

这也是 RAG（Retrieval-Augmented Generation）系统中非常常见的一种架构。

# 十四、Milvus 的索引与性能基础

向量数据库的查询性能与索引方式高度相关。

基本思想是：

```text
原始向量
   │
   ▼
建立向量索引
   │
   ▼
查询向量
   │
   ▼
快速寻找近似邻居
```

常见思想包括：

```text
精确搜索
近似最近邻搜索（ANN）
```

实际系统会根据：

```text
数据规模
向量维度
召回率要求
延迟要求
内存
磁盘
```

选择合适的索引和参数。

因此，向量数据库优化并不是简单地：

```text
CPU 越高越好
内存越大越好
```

而需要结合：

```text
索引
数据规模
查询模式
向量维度
Top-K
过滤条件
```

综合调整。

# 十五、Milvus 数据安全与运维

虽然 Milvus 经常通过 Docker 部署，但它依然是数据库系统，而不是“启动一个容器就结束”。

运维时需要关注：

```text
容器状态
数据卷
日志
端口
存储
元数据
对象存储
备份
版本升级
```

## 15.1 数据卷

容器本身可以删除，但数据库数据不能依赖容器生命周期。

应该使用：

```text
Docker Volume
或
宿主机持久化目录
```

例如：

```text
Host
 │
 └── volumes/
       └── milvus/
             ├── data
             └── ...
```

否则执行：

```bash
docker rm
```

等操作时可能造成数据风险。

## 15.2 备份

Milvus 的备份不能简单理解成：

```text
docker commit
```

数据库备份需要考虑实际的数据存储、元数据和部署模式。

因此生产环境应该优先采用 Milvus 官方对应版本支持的备份方案，而不是只复制某一个容器目录。

# 十六、Redis、MongoDB、Milvus 对比

| 维度 | Redis | MongoDB | Milvus |
| --- | --- | --- | --- |
| 核心模型 | Key-Value / Data Structure | Document | Vector |
| 主要数据 | 内存数据结构 | BSON 文档 | 向量 + 标量 |
| 典型场景 | 缓存、Session、计数、排行榜 | 业务文档、内容数据 | 向量检索、RAG |
| 查询特点 | Key / Structure | 文档查询 | 相似度搜索 |
| 常见部署 | Linux / Docker | Linux / Docker | Docker / Compose / K8s |
| 默认端口 | 6379 | 27017 | 19530 |
| 重点运维 | 内存、连接、慢查询 | 索引、磁盘、连接 | 容器、存储、索引 |
| 持久化 | RDB / AOF | 数据文件 / 日志机制 | 持久化存储体系 |
| 典型问题 | 内存过高、热点 Key | 慢查询、磁盘不足 | 向量检索性能、存储与组件状态 |

可以用一句话区分：

```text
Redis
→ 我要快速拿到数据。

MongoDB
→ 我要灵活地存储和查询文档。

Milvus
→ 我要快速找到“最相似”的向量。
```

# 十七、NoSQL 数据库故障排查方法

虽然三种数据库的内部实现完全不同，但运维排障可以使用相似的思路。

```text
                数据库故障
                    │
                    ▼
              1. 服务是否正常？
                    │
                    ▼
              2. 端口是否监听？
                    │
                    ▼
              3. 网络是否连通？
                    │
                    ▼
              4. 是否认证成功？
                    │
                    ▼
              5. 是否有权限？
                    │
                    ▼
              6. 数据是否正常？
                    │
                    ▼
              7. 性能是否正常？
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        CPU        Memory      Disk
          │         │         │
          └─────────┼─────────┘
                    ▼
                  日志
                    │
                    ▼
                 恢复能力
```

## 17.1 服务层

Linux 下首先看：

```bash
systemctl status xxx
```

或者 Docker：

```bash
docker ps
docker logs <container>
```

确认：

```text
服务是否启动
容器是否退出
是否反复重启
```

## 17.2 网络层

检查监听：

```bash
ss -lntp
```

从远程客户端测试：

```bash
nc -vz <host> <port>
```

例如：

```bash
nc -vz 192.168.1.10 6379
```

## 17.3 认证与权限

如果：

```text
端口能访问
```

但：

```text
应用仍然无法使用数据库
```

就需要检查：

```text
用户名
密码
认证机制
数据库
角色
权限
```

不要把所有连接问题都归结为“网络不通”。

## 17.4 性能层

当数据库响应变慢时，应区分：

```text
CPU
Memory
Disk I/O
Network
Database Query
Connection Pool
```

例如 Redis：

```text
Memory
Hot Key
Slow Command
Connection
```

MongoDB：

```text
Index
Query Plan
Disk
Lock / Concurrency
Connection
```

Milvus：

```text
Vector Index
Query Load
Memory
Storage
Component Health
```

# 十八、NoSQL 数据库与 Web 应用

实际项目通常不会只使用一种数据库。

例如一个 AI / Web 应用可能采用：

```text
                   Client
                      │
                      ▼
                  API Server
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
      MySQL         Redis        MongoDB
        │             │             │
   业务数据        缓存/Session     文档数据
                      │
                      │
                      ▼
                   Milvus
                      │
                      ▼
                 Vector Search
```

进一步结合 RAG：

```text
                  用户问题
                     │
                     ▼
               Embedding Model
                     │
                     ▼
                  Milvus
                     │
                  Top-K
                     │
                     ▼
               相关文档内容
                     │
                     ▼
                LLM / Agent
                     │
                     ▼
                  最终回答
```

这说明不同数据库并不是简单的竞争关系。

它们解决的是不同问题：

```text
关系数据库
→ 事务与结构化业务数据

Redis
→ 高速缓存与内存数据结构

MongoDB
→ 灵活文档数据

Milvus
→ 向量检索
```

# 十九、从运维视角理解 NoSQL

学习这些数据库时，不应该只记：

```text
6379
27017
19530
```

真正重要的是理解数据库运行在整个系统中的位置。

例如 Redis 内存满了：

```text
Redis
 │
 └── maxmemory / eviction
       │
       ▼
应用缓存命中率下降
       │
       ▼
MySQL 查询压力增加
       │
       ▼
整体响应变慢
```

MongoDB 磁盘满了：

```text
MongoDB
   │
   ▼
磁盘空间不足
   │
   ▼
写入失败
   │
   ▼
应用报错
```

Milvus 存储异常：

```text
Milvus
   │
   ▼
数据 / 元数据 / 对象存储异常
   │
   ▼
Collection 或搜索异常
   │
   ▼
RAG 检索失败
```

因此数据库运维真正关注的是：

```text
数据库
   │
   ├── 进程
   ├── 网络
   ├── 磁盘
   ├── 内存
   ├── 配置
   ├── 权限
   ├── 数据
   ├── 性能
   ├── 日志
   └── 备份恢复
```

# 二十、总结

Redis、MongoDB、Milvus 虽然都可以归入广义的 NoSQL / 非关系型数据系统，但它们的设计目标明显不同：

```text
Redis
→ 高性能 Key-Value / 内存数据结构

MongoDB
→ 灵活的文档数据模型

Milvus
→ 大规模向量数据与相似度搜索
```

从 Linux 运维角度，三者可以进一步归纳为：

```text
安装
 ↓
服务管理
 ↓
配置
 ↓
网络与端口
 ↓
认证与权限
 ↓
数据存储
 ↓
备份恢复
 ↓
性能监控
 ↓
日志排查
 ↓
故障恢复
```

而真正进入生产环境之后，数据库运维的目标并不是单纯让数据库“运行起来”，而是保证：

```text
可用
可靠
安全
可恢复
可观测
可扩展
```

这也是从“会使用数据库”走向“具备数据库运维能力”的关键一步。

## 外部参考

- [Redis Documentation](https://redis.io/docs/)
- [Redis Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [MongoDB Backup and Restore](https://www.mongodb.com/docs/manual/core/backups/)
- [Milvus Documentation](https://milvus.io/docs)