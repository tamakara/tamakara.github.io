---
title: 监控：Prometheus 与 Grafana
description: '介绍指标采集、Prometheus 查询、Grafana 可视化和基础告警流程。'
updated: 2026-09-19
published: 2026-09-14T04:20:11Z
image: ''
tags: [Prometheus, Grafana, 监控, Linux, 运维]
category: 学习笔记
draft: false
lang: ''
---

> 监控系统需要持续采集、保存、查询、可视化和告警。
>
> 但这些命令主要解决“现在发生了什么”，而监控系统需要进一步解决“持续采集、保存、查询、可视化和告警”。
>
> Prometheus 负责采集和存储指标，PromQL 负责查询，Grafana 负责把这些数据展示出来，并进一步形成 Dashboard 与告警。

# 一、Prometheus 与 Grafana 概述

## 1.1 为什么需要监控系统

在 Linux 主机上，可以先用以下命令查看当前状态：

```bash
top
free -h
df -h
ss -lntp
systemctl status nginx
```

查看当前系统状态。

但是这些工具存在一个问题：

```text
需要人工执行
```

例如：

```text
CPU = 30%
```

只能说明：

```text
现在 CPU 大约是 30%
```

如果希望知道：

```text
过去 24 小时 CPU 怎么变化？
什么时候开始升高？
部署之后有没有明显变化？
什么时候超过阈值？
```

就需要持续采集并保存数据。

因此监控系统的基本流程是：

```text
目标主机
   │
   ▼
指标暴露
   │
   ▼
Prometheus
   │
   ├── 采集
   ├── 存储
   └── 查询
        │
        ▼
      PromQL
        │
        ▼
      Grafana
        │
        ├── Dashboard
        └── Alerting
```

## 1.2 Prometheus 是什么

Prometheus 是开源的监控与告警工具，同时具备时间序列数据库能力。

它最核心的数据模型是：

```text
Metric
+
Labels
+
Timestamp
+
Value
```

例如：

```text
http_requests_total{
    job="api",
    method="GET",
    status="200"
}
```

在某一个时间点可能对应：

```text
15320
```

随着时间变化：

```text
10000
11000
12500
13800
15320
...
```

这些数据就组成了一条时间序列。

Prometheus 官方将自己的核心特点概括为：

- 多维度时间序列数据模型
- PromQL 查询语言
- HTTP Pull 模型
- Service Discovery
- 本地时间序列存储
- 告警规则与 Alertmanager

官方文档：
[Prometheus Overview](https://prometheus.io/docs/introduction/overview/) 

## 1.3 Grafana 是什么

Grafana 更偏向：

```text
查询
+
可视化
+
Dashboard
+
告警
```

它本身不是 Prometheus 的替代品。

典型关系：

```text
Prometheus
    │
    │ PromQL
    ▼
 Grafana
    │
    ├── Graph
    ├── Gauge
    ├── Table
    ├── Stat
    └── Alert
```

Grafana 通过 Data Source 连接外部数据系统。

除了 Prometheus，还可以连接：

```text
Loki
Elasticsearch
MySQL
PostgreSQL
InfluxDB
CloudWatch
...
```

也就是说：

```text
Prometheus
→ 保存和提供 Metrics

Grafana
→ 查询和展示 Metrics
```

Grafana 官方：
[Grafana Data Sources](https://grafana.com/docs/grafana/latest/datasources/) 

# 二、Prometheus 的核心数据模型

## 2.1 Metric

Metric 就是需要观察的指标。

例如：

```text
CPU 使用率
内存使用量
磁盘空间
HTTP 请求数
HTTP 错误数
数据库连接数
```

可以用：

```text
node_cpu_seconds_total
node_memory_MemAvailable_bytes
node_filesystem_avail_bytes
```

等指标表示。

## 2.2 Labels

Prometheus 最大的特点之一就是：

```text
Labels
```

例如：

```text
http_requests_total{
    method="GET",
    status="200",
    instance="10.0.0.10:8080"
}
```

同一个 Metric：

```text
http_requests_total
```

通过不同的 Label 可以形成不同的时间序列：

```text
method=GET
status=200

method=GET
status=500

method=POST
status=200
```

因此：

```text
Metric Name
+
Labels
```

共同确定一条具体的时间序列。

Prometheus 官方数据模型：
[Data model](https://prometheus.io/docs/concepts/data_model/) 

## 2.3 Label Cardinality

Label 虽然非常强大，但不能无限制地增加。

例如：

```text
user_id
request_id
session_id
```

如果每个请求都产生不同的 Label 值：

```text
request_id=abc001
request_id=abc002
request_id=abc003
...
```

就会产生大量时间序列。

这就是：

```text
High Cardinality
```

可能导致：

```text
内存增加
磁盘增加
查询变慢
```

因此 Prometheus 中需要谨慎设计 Label。

一般来说：

```text
服务名
实例
HTTP Method
HTTP Status
环境
```

这类有限集合更适合作为 Label。

而：

```text
用户 ID
订单 ID
请求 ID
UUID
```

通常不适合直接作为高频 Metric Label。

# 三、Prometheus 的 Pull 模型

## 3.1 Prometheus 如何获取指标

Prometheus 最典型的工作方式是：

```text
Exporter / Application
        │
        │ HTTP /metrics
        ▼
    Prometheus
```

Prometheus 主动去目标地址抓取：

```text
GET /metrics
```

这就是：

```text
Pull
```

模型。

官方文档明确说明，Prometheus 默认通过 HTTP Pull 模型采集时间序列。

## 3.2 /metrics

很多 Prometheus Exporter 会提供：

```text
/metrics
```

例如：

```text
http://10.0.0.10:9100/metrics
```

内容通常类似：

```text
# HELP node_cpu_seconds_total ...
# TYPE node_cpu_seconds_total counter

node_cpu_seconds_total{
    cpu="0",
    mode="idle"
} 12345
```

因此：

```text
/metrics
→ 向 Prometheus 暴露可采集指标
```

## 3.3 Push 与 Pull

Prometheus 主要采用：

```text
Pull
```

但也支持某些特殊场景下通过 Pushgateway 接收短生命周期任务推送的数据。

不过应该注意：

```text
Pushgateway
≠
Prometheus 默认采集方式
```

对于长期运行的服务，通常优先使用：

```text
Prometheus → Pull → Target
```

# 四、Exporter

## 4.1 Exporter 是什么

Exporter 可以理解为：

```text
把某个系统的数据
转换成 Prometheus Metrics
```

例如：

```text
Linux
  │
  ▼
node_exporter
  │
  ▼
/metrics
  │
  ▼
Prometheus
```

不同系统可能使用不同 Exporter：

```text
Linux
→ node_exporter

MySQL
→ mysqld_exporter

Redis
→ redis_exporter

PostgreSQL
→ postgres_exporter
```

这使 Prometheus 能够统一采集不同系统的指标。

## 4.2 node_exporter

Linux 主机监控中最常见的是：

```text
node_exporter
```

它可以暴露：

```text
CPU
Memory
Disk
Network
Filesystem
Load
...
```

因此：

```text
Linux Kernel / /proc / /sys
             │
             ▼
        node_exporter
             │
             ▼
         /metrics
```

官方：
[node_exporter](https://github.com/prometheus/node_exporter)

# 五、安装 Prometheus

Prometheus 可以直接以二进制方式运行，也可以运行在容器中。

对于理解 Linux 运维，直接二进制部署是一个很好的学习方式：

```text
Linux
 ├── prometheus
 └── node_exporter
```

而实际项目中也常见：

```text
Docker
 ├── prometheus
 └── grafana
```

## 5.1 创建 Prometheus 用户

生产环境不应该默认使用 root 运行 Prometheus。

例如：

```bash
sudo useradd \
  --no-create-home \
  --shell /usr/sbin/nologin \
  prometheus
```

创建目录：

```bash
sudo mkdir -p /etc/prometheus
sudo mkdir -p /var/lib/prometheus
```

设置权限：

```bash
sudo chown -R prometheus:prometheus \
  /etc/prometheus \
  /var/lib/prometheus
```

## 5.2 配置文件

Prometheus 的核心配置文件通常是：

```text
prometheus.yml
```

一个最简单的配置：

```yaml
global:
  scrape_interval: 15s

scrape_configs:

  - job_name: prometheus
    static_configs:
      - targets:
          - localhost:9090
```

这里：

```text
scrape_interval
```

决定采集间隔。

例如：

```text
15s
```

意味着：

```text
每 15 秒采集一次
```

## 5.3 启动 Prometheus

直接运行：

```bash
prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus
```

验证：

```bash
curl http://127.0.0.1:9090/-/ready
```

如果正常，Prometheus Web UI 通常可以通过：

```text
http://<server>:9090
```

访问。

# 六、使用 systemd 管理 Prometheus

将 Prometheus 作为长期运行的服务时，可以使用 systemd。

创建：

```text
/etc/systemd/system/prometheus.service
```

例如：

```ini
[Unit]
Description=Prometheus
After=network.target

[Service]
User=prometheus
Group=prometheus

ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus

Restart=on-failure

[Install]
WantedBy=multi-user.target
```

重新加载：

```bash
sudo systemctl daemon-reload
```

启动：

```bash
sudo systemctl start prometheus
```

设置开机启动：

```bash
sudo systemctl enable prometheus
```

查看：

```bash
systemctl status prometheus
```

日志：

```bash
journalctl -u prometheus
```

这样就把上一篇 Linux 服务监控的知识连接到了 Prometheus：

```text
systemd
   │
   ▼
Prometheus Service
   │
   ▼
Metrics
```

# 七、配置 node_exporter

## 7.1 启动 node_exporter

node_exporter 默认监听：

```text
9100
```

启动后：

```bash
curl http://127.0.0.1:9100/metrics
```

如果能够看到：

```text
node_cpu_seconds_total
node_memory_...
node_filesystem_...
```

说明 Exporter 工作正常。

## 7.2 systemd

也可以把 node_exporter 配置成服务：

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter

ExecStart=/usr/local/bin/node_exporter

Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

检查：

```bash
systemctl status node_exporter
```

## 7.3 Prometheus 配置 Target

修改：

```yaml
scrape_configs:

  - job_name: node
    static_configs:
      - targets:
          - 127.0.0.1:9100
```

然后让 Prometheus 重新加载配置。

最简单的方式可以直接重启：

```bash
sudo systemctl restart prometheus
```

生产环境也可以通过 Prometheus 提供的配置 reload 机制减少中断。

# 八、Target 与 Job

Prometheus 中非常重要的两个概念：

```text
Job
Target
```

例如：

```yaml
- job_name: linux
  static_configs:
    - targets:
        - 192.168.1.10:9100
        - 192.168.1.11:9100
        - 192.168.1.12:9100
```

这里：

```text
job = linux
```

而：

```text
targets
=
192.168.1.10:9100
192.168.1.11:9100
192.168.1.12:9100
```

可以理解为：

```text
Job
 │
 ├── Target A
 ├── Target B
 └── Target C
```

Prometheus 会根据配置定期抓取这些 Target。

# 九、Prometheus Targets 页面

Prometheus 自带 Web UI。

打开：

```text
http://<prometheus>:9090
```

然后查看：

```text
Status
→ Targets
```

可以看到：

```text
UP
DOWN
```

例如：

```text
linux/node
192.168.1.10:9100
UP
```

表示：

```text
Prometheus
   ↓
192.168.1.10:9100
   ↓
成功采集
```

如果：

```text
DOWN
```

可能是：

```text
Exporter 没启动
端口错误
网络不通
防火墙
DNS
目标机器故障
```

因此：

> **Prometheus Targets 页面本身就是非常重要的故障排查入口。**

# 十、PromQL 基础

PromQL 是 Prometheus 的查询语言。

官方文档：
[PromQL basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) 

## 10.1 查询 Metric

例如：

```promql
node_load1
```

表示查询：

```text
1 分钟 Load
```

又例如：

```promql
node_memory_MemAvailable_bytes
```

表示：

```text
可用内存
```

## 10.2 Label 过滤

例如：

```promql
node_load1{instance="192.168.1.10:9100"}
```

只查询某个实例。

也可以：

```promql
http_requests_total{status="500"}
```

查询：

```text
HTTP 500
```

## 10.3 Rate

很多指标是 Counter，例如：

```text
http_requests_total
```

它通常只增加：

```text
100
120
140
...
```

如果我们想知道：

```text
每秒增加多少请求
```

可以使用：

```promql
rate(http_requests_total[5m])
```

意思可以理解为：

```text
根据最近 5 分钟的数据
计算平均每秒增长速度
```

## 10.4 Sum

例如：

```promql
sum(rate(http_requests_total[5m]))
```

将多个时间序列聚合到一起。

## 10.5 By

例如：

```promql
sum by (status) (
  rate(http_requests_total[5m])
)
```

可以得到：

```text
200 → xxx req/s
404 → xxx req/s
500 → xxx req/s
```

因此 PromQL 的核心能力之一就是：

```text
选择
+
过滤
+
计算
+
聚合
```

官方文档也将 PromQL 定义为用于实时选择和聚合时间序列数据的函数式查询语言。

# 十一、常用 Linux 监控 PromQL

## 11.1 CPU

CPU 使用率可以从：

```text
node_cpu_seconds_total
```

计算。

常见查询：

```promql
100 - (
  avg by (instance) (
    rate(node_cpu_seconds_total{
      mode="idle"
    }[5m])
  ) * 100
)
```

结果：

```text
CPU 使用率 %
```

## 11.2 Memory

可以使用：

```promql
100 * (
  1 -
  node_memory_MemAvailable_bytes
  /
  node_memory_MemTotal_bytes
)
```

得到大致的：

```text
Memory 使用率
```

这与上一篇：

```bash
free -h
```

所观察的概念对应。

## 11.3 Disk

例如：

```promql
100 * (
  1 -
  node_filesystem_avail_bytes
  /
  node_filesystem_size_bytes
)
```

可以估算文件系统使用率。

## 11.4 Network

例如统计网络接收速率：

```promql
rate(
  node_network_receive_bytes_total[5m]
)
```

发送：

```promql
rate(
  node_network_transmit_bytes_total[5m]
)
```

这样上一篇：

```text
ip
ss
网络统计
```

就进入了持续监控体系。

# 十二、Prometheus 的指标类型

Prometheus 常见 Metric Type：

```text
Counter
Gauge
Histogram
Summary
```

## 12.1 Counter

Counter 表示只增不减的累计值。

例如：

```text
HTTP 请求总数
错误请求总数
```

类似：

```text
100
120
150
180
```

适合计算：

```promql
rate(...)
increase(...)
```

## 12.2 Gauge

Gauge 表示可以上下变化的当前值。

例如：

```text
CPU 温度
内存使用量
并发连接数
队列长度
```

可能：

```text
100
80
120
60
```

## 12.3 Histogram

Histogram 用于观察一组数值的分布。

最常见：

```text
HTTP 请求耗时
```

例如：

```text
0.1s
0.2s
0.5s
1s
2s
```

Histogram 可以帮助回答：

```text
P50
P90
P95
P99
```

这对于服务性能监控非常重要。

## 12.4 Summary

Summary 也可以描述分布和分位数，但它与 Histogram 在计算方式和适用场景上有所区别。

初学阶段最需要掌握：

```text
Counter
Gauge
Histogram
```

# 十三、Grafana 安装与运行

Grafana 可以直接安装在 Linux 上，也可以运行在 Docker 中。

对于学习环境，可以使用 Docker Compose 快速启动：

```yaml
services:

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

启动：

```bash
docker compose up -d
```

查看：

```bash
docker compose ps
```

日志：

```bash
docker compose logs grafana
```

访问：

```text
http://<server>:3000
```

Grafana 官方安装文档：
[Install Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/)

# 十四、Grafana Data Source

Grafana 启动之后，需要告诉它：

```text
数据在哪里？
```

这就是：

```text
Data Source
```

例如：

```text
Grafana
   │
   ▼
Prometheus
http://prometheus:9090
```

Grafana 官方把 Data Source 定义为连接到实际数据存储后端的连接；Grafana 可以通过这些数据源查询、可视化和告警，而不会要求把数据迁移到 Grafana 中。

添加 Prometheus：

```text
Connections
   ↓
Data Sources
   ↓
Prometheus
```

填写：

```text
URL
```

例如 Docker Compose 环境：

```text
http://prometheus:9090
```

而不是：

```text
http://localhost:9090
```

这是容器化环境中非常常见的区别：

```text
Grafana Container
       │
       │
       ▼
prometheus:9090
```

这里的：

```text
prometheus
```

是 Compose 网络中的服务名。

# 十五、Grafana Dashboard

Dashboard 是 Grafana 最核心的使用方式之一。

可以包含多个 Panel：

```text
┌──────────────────────────────────────┐
│ CPU Usage                            │
│              /\                      │
│         /\   /  \__                  │
│ _______/  \_/       \___             │
└──────────────────────────────────────┘

┌───────────────────┐
│ Memory Usage      │
│       62%         │
└───────────────────┘

┌───────────────────┐
│ Disk Usage        │
│       74%         │
└───────────────────┘
```

一个 Linux Server Dashboard 可以包含：

```text
CPU
Memory
Load
Disk
Network
Filesystem
```

## 15.1 Panel

每个 Panel 通常包含：

```text
Query
+
Visualization
```

例如：

```promql
node_load1
```

然后选择：

```text
Time Series
```

就可以看到 Load 随时间变化的曲线。

## 15.2 常见 Visualization

Grafana 中常见：

```text
Time Series
Stat
Gauge
Table
Bar Chart
```

不同数据应该选择合适的展示方式。

例如：

```text
CPU 趋势
→ Time Series

当前 CPU
→ Gauge / Stat

多个服务状态
→ Table / Stat
```

# 十六、Grafana 变量

当 Dashboard 面向多个主机时，不能为每台机器建立一张完全独立的 Dashboard。

可以使用：

```text
Variables
```

例如：

```text
instance
```

用户选择：

```text
192.168.1.10:9100
```

Dashboard 自动切换。

例如 PromQL：

```promql
node_load1{
  instance="$instance"
}
```

于是：

```text
一个 Dashboard
     │
     ├── server1
     ├── server2
     ├── server3
     └── server4
```

这对于实际运维非常重要。

# 十七、Prometheus 告警

## 17.1 为什么需要 Alert

监控系统不应该要求运维人员：

```text
一直盯着 Grafana
```

例如：

```text
凌晨 3 点
CPU > 95%
```

应该主动产生：

```text
Alert
```

而不是等到早上才发现。

Prometheus 的传统告警体系可以理解为：

```text
Prometheus
    │
    │ Alert Rule
    ▼
 Alert
    │
    ▼
Alertmanager
    │
    ├── Grouping
    ├── Inhibition
    ├── Silence
    └── Notification
```

Prometheus 官方明确将告警分成两个部分：Prometheus 中定义和评估告警规则，Alertmanager 负责对告警进行聚合、抑制、静默和通知。

## 17.2 Alert Rule

例如：

```yaml
groups:
  - name: node
    rules:

      - alert: HighCPUUsage
        expr: |
          (
            100 - (
              avg by (instance) (
                rate(node_cpu_seconds_total{
                  mode="idle"
                }[5m])
              ) * 100
            )
          ) > 90
        for: 5m

        labels:
          severity: warning

        annotations:
          summary: "CPU 使用率过高"
          description: "实例 {{ $labels.instance }} CPU 使用率超过 90%"
```

这里：

```text
expr
→ 告警条件

for
→ 持续多久才触发

labels
→ 告警分类

annotations
→ 告警描述
```

## 17.3 为什么需要 for

假设：

```text
CPU = 95%
```

只持续：

```text
10 秒
```

可能只是瞬时波动。

如果规定：

```yaml
for: 5m
```

则表示：

```text
条件持续 5 分钟
```

才触发。

这样可以减少：

```text
瞬时波动
→ 大量误告警
```

# 十八、Alertmanager

Alertmanager 并不是用来计算：

```text
CPU > 90%
```

它主要负责收到 Prometheus 产生的告警后进行：

```text
Grouping
Inhibition
Silencing
Routing
Notifications
```

例如：

```text
Prometheus
  │
  ├── CPU Alert
  ├── Memory Alert
  ├── Disk Alert
  └── Service Alert
          │
          ▼
     Alertmanager
          │
          ├── Group
          ├── Route
          └── Notify
               │
               ├── Email
               ├── Webhook
               └── On-call
```

官方：
[Alerting Overview](https://prometheus.io/docs/alerting/latest/overview/)

# 十九、Grafana Alerting

现在 Grafana 自身也提供完整的 Alerting 能力。

例如：

```text
Grafana
   │
   ▼
Prometheus Data Source
   │
   ▼
PromQL
   │
   ▼
Alert Rule
```

Grafana 官方目前支持：

```text
Grafana-managed alert rules
```

也可以查看 Prometheus 自己管理的规则；对于 Prometheus 原生告警规则，Grafana 中主要作为查看入口，而规则修改仍然需要回到 Prometheus 配置或规则文件中。

因此学习阶段可以先这样理解：

```text
Prometheus
→ Metrics + PromQL + 原生告警规则

Alertmanager
→ 告警聚合与通知

Grafana
→ Dashboard + Query + Grafana Alerting
```

# 二十、Prometheus 与 Grafana 的典型架构

一个最基础的 Linux 监控系统：

```text
                 Linux Server
                     │
                     ▼
               node_exporter
                     │
                  /metrics
                     │
                     ▼
                Prometheus
             ┌───────┴────────┐
             │                │
          TSDB             PromQL
                                │
                                ▼
                             Grafana
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                Dashboard                 Alert
```

多个服务器：

```text
Node 1 ── node_exporter ──┐
Node 2 ── node_exporter ──┤
Node 3 ── node_exporter ──┤
Node 4 ── node_exporter ──┤
                           ▼
                       Prometheus
                           │
                           ▼
                        Grafana
```

# 二十一、Service Discovery

前面的配置：

```yaml
static_configs:
  - targets:
      - 192.168.1.10:9100
```

属于：

```text
Static Configuration
```

服务器多了以后：

```text
100 台
500 台
1000 台
```

手动维护就很麻烦。

因此 Prometheus 支持：

```text
Service Discovery
```

例如 Kubernetes 环境中，可以通过 Kubernetes Service Discovery 动态发现目标。

```text
Kubernetes
   │
   ├── Pod
   ├── Service
   └── Node
        │
        ▼
Service Discovery
        │
        ▼
Prometheus
```

这也是 Prometheus 非常适合云原生环境的重要原因之一。

# 二十二、Kubernetes 与 Prometheus

前面的 Kubernetes 文章里学习了：

```text
Node
Pod
Service
Deployment
```

现在可以将它们与监控连接起来：

```text
Kubernetes
    │
    ├── Node
    │     └── node_exporter
    │
    ├── Pod
    │     └── application metrics
    │
    └── Service
            │
            ▼
       Prometheus
            │
            ▼
         Grafana
```

这样：

```text
Kubernetes
→ 管理工作负载

Prometheus
→ 观察工作负载

Grafana
→ 展示观察结果
```

# 二十三、一个完整的 Linux 监控案例

假设现在有：

```text
Server A
192.168.1.10

Server B
192.168.1.11
```

每台服务器运行：

```text
node_exporter
```

架构：

```text
Server A
  │
  └── node_exporter :9100
          │
          ▼
          ┐
          │
Server B  │
  │       │
  └── node_exporter :9100
          │
          ▼
      Prometheus
          │
          ▼
       Grafana
```

Prometheus 配置：

```yaml
scrape_configs:

  - job_name: linux
    static_configs:
      - targets:
          - 192.168.1.10:9100
          - 192.168.1.11:9100
```

在 Prometheus 中查询：

```promql
up
```

结果：

```text
serverA → 1
serverB → 1
```

如果：

```text
serverB → 0
```

就说明 Prometheus 当前无法成功采集：

```text
192.168.1.11:9100
```

进一步排查：

```text
node_exporter
   ↓
端口 9100
   ↓
网络
   ↓
防火墙
   ↓
服务器
```

这就是监控系统与 Linux 运维排障的结合。

# 二十四、Prometheus 常见故障

## 24.1 Target DOWN

现象：

```text
Prometheus
→ Targets
→ DOWN
```

第一步：

```bash
curl http://<target>:9100/metrics
```

如果直接失败：

```text
Exporter
   ↓
网络
   ↓
端口
```

继续检查：

```bash
systemctl status node_exporter
```

以及：

```bash
ss -lntp | grep 9100
```

## 24.2 Prometheus 启动失败

首先：

```bash
systemctl status prometheus
```

然后：

```bash
journalctl -u prometheus
```

如果修改了 YAML：

```text
YAML 格式错误
```

可能导致 Prometheus 无法加载配置。

因此修改配置后应该先验证配置，而不是直接不断重启服务。

## 24.3 查询没有数据

例如：

```promql
node_cpu_seconds_total
```

没有返回数据。

排查：

```text
Metric 是否存在
       ↓
Target 是否 UP
       ↓
Exporter 是否正常
       ↓
Prometheus 是否成功采集
       ↓
时间范围是否正确
       ↓
Label 是否匹配
```

尤其注意：

```promql
instance="..."
```

写错后也可能导致：

```text
No data
```

## 24.4 Grafana 没有数据

首先不要马上修改 Dashboard。

先检查：

```text
Grafana
   ↓
Data Source
   ↓
Prometheus
   ↓
PromQL
   ↓
Metrics
```

在 Grafana Data Source 中进行连接测试。

Grafana 当前官方文档也把 Prometheus 作为标准 Data Source，并提供 PromQL Query Editor。

如果 Data Source 正常，再检查：

```text
Dashboard Query
```

# 二十五、监控系统的几个重要原则

## 25.1 监控不是越多越好

如果一个 Dashboard：

```text
1000 个 Panel
```

看起来非常“专业”。

但真正故障时：

```text
找不到重点
```

就失去了监控的价值。

更好的方式是：

```text
Overview
   ↓
发现异常
   ↓
Service
   ↓
Host
   ↓
Detail
```

## 25.2 从业务目标设计指标

不要只监控：

```text
CPU
Memory
Disk
```

还要问：

```text
用户是否能够访问？
请求是否成功？
响应是否变慢？
错误率有没有增加？
```

例如 Web 服务：

```text
Availability
Latency
Traffic
Errors
```

这些比单纯：

```text
CPU = 50%
```

更接近业务健康程度。

## 25.3 监控指标应该能解释问题

例如发现：

```text
HTTP 5xx ↑
```

接下来应该能够通过：

```text
CPU
Memory
Database Connections
Latency
```

进一步判断：

```text
资源不足？
数据库问题？
网络问题？
应用本身异常？
```

这样监控才真正成为：

```text
故障排查工具
```

# 二十六、从 Metrics 走向 Logs

到这里，我们主要处理的是：

```text
Metrics
```

例如：

```text
CPU = 80%
Memory = 70%
QPS = 1000
Latency = 200ms
```

它们很适合回答：

```text
发生了什么？
什么时候发生？
严重程度如何？
```

但是它们往往不能直接回答：

```text
为什么发生？
```

于是需要：

```text
Logs
```

例如：

```text
2026-09-14 10:30:01 ERROR
Database connection refused
```

因此后续会进入：

```text
Metrics
→ Prometheus

Visualization
→ Grafana

Logs
→ 日志收集 / ELK

Metrics + Logs + Traces
→ OpenTelemetry / 可观测性体系
```

# 二十七、监控体系整体模型

目前已经可以把前两篇监控内容串起来：

```text
Linux Server
     │
     ├── CPU
     ├── Memory
     ├── Disk
     ├── Network
     ├── Process
     └── Service
            │
            ▼
        Exporter
            │
            ▼
       Prometheus
            │
            ├── Time Series
            ├── PromQL
            └── Alert Rules
                    │
                    ▼
               Alertmanager
                    │
                    ▼
                Notification

            Prometheus
                 │
                 ▼
              Grafana
                 │
                 ├── Dashboard
                 ├── Visualization
                 └── Alerting
```

而完整的可观测性体系会继续扩展成：

```text
                  Observability
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Metrics        Logs        Traces
          │            │            │
      Prometheus       │        OpenTelemetry
          │            │            │
       Grafana       ELK/...        │
          │            │            │
          └────────────┼────────────┘
                       ▼
                   Correlation
                       │
                       ▼
                  Root Cause
```

# 二十八、Prometheus 与 Grafana 的关系总结

最后可以用一句非常简单的话区分两者：

```text
Prometheus
→ “把指标收进来、存下来、查出来”

Grafana
→ “把数据展示出来，让人看懂”
```

更加完整地说：

```text
Exporter
   ↓
Metrics
   ↓
Prometheus
   ├── Storage
   ├── PromQL
   └── Alert Rules
         ↓
    Alertmanager

Prometheus
   ↓
Grafana
   ├── Dashboard
   ├── Visualization
   └── Alerting
```

而上一篇 Linux 服务监控中的：

```text
top
free
df
iostat
ss
systemctl
journalctl
```

现在变成了：

```text
人工查看
     ↓
Exporter
     ↓
Prometheus
     ↓
Grafana
     ↓
持续监控
```

因此：

> **Prometheus 解决“持续采集和查询指标”，Grafana 解决“把指标组织成可视化界面”，而 Exporter 则负责把 Linux、数据库和其他系统的状态转换成 Prometheus 能理解的 Metrics。**

## 外部参考

- [Prometheus Overview](https://prometheus.io/docs/introduction/overview/)
- [Prometheus Data Model](https://prometheus.io/docs/concepts/data_model/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
