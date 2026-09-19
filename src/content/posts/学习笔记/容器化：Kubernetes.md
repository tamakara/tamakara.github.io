---
title: 容器化：Kubernetes
description: '介绍 Kubernetes 的集群、Pod、Deployment、Service 和配置对象，覆盖基础发布与排障。'
updated: 2026-09-19
published: 2026-09-14T03:14:54Z
image: ''
tags: [Kubernetes, K8s, 容器化, Linux, 运维]
category: 学习笔记
draft: false
lang: ''
---

> Docker 解决的是“如何运行容器”，而 Kubernetes 进一步解决的是“如何在一组机器上持续、可靠地运行和管理大量容器”。
>
> Kubernetes 的核心不是某一条 `kubectl` 命令，而是理解 **Cluster、Node、Pod、Deployment、Service、ConfigMap、Secret、PV/PVC、Ingress、调度与网络** 之间的关系。

# 一、Kubernetes 概述

## 1.1 什么是 Kubernetes

Kubernetes（简称 K8s）是一个用于管理容器化工作负载和服务的平台，核心思想是通过声明式配置和控制器自动维护集群的目标状态。

Docker 更关注：

```text
运行一个容器
```

而 Kubernetes 关注：

```text
运行一组应用
 ↓
保持副本数量
 ↓
发现服务
 ↓
分配资源
 ↓
故障自动恢复
 ↓
滚动更新
 ↓
扩缩容
```

例如：

```text
应用要求：
3 个 Web 实例

Kubernetes
    │
    ├── Pod 1
    ├── Pod 2
    └── Pod 3
```

如果其中一个 Pod 出现故障：

```text
Pod 1
  X
```

控制器会根据声明的目标状态创建新的 Pod，使系统重新回到：

```text
Pod 1
Pod 2
Pod 3
```

这就是 Kubernetes 中非常重要的：

```text
Desired State
```

与：

```text
Actual State
```

之间的持续协调。

Kubernetes 官方概念文档：
[Kubernetes Concepts](https://kubernetes.io/docs/concepts/)

## 1.2 Kubernetes 的核心特点

Kubernetes 的典型能力包括：

```text
容器编排
自动调度
服务发现
负载分发
故障自愈
滚动更新
水平扩缩容
配置管理
存储管理
资源管理
```

因此 Kubernetes 并不是简单的：

```text
“Docker 的批量启动器”
```

它实际上提供了一套完整的：

```text
集群控制系统
```

# 二、Kubernetes Cluster 与 Node

## 2.1 Cluster

Cluster（集群）是 Kubernetes 的整体运行环境。

可以简单理解为：

```text
Kubernetes Cluster
│
├── Control Plane
│
└── Worker Nodes
    ├── Node 1
    ├── Node 2
    └── Node 3
```

Kubernetes 官方架构中，一个集群由控制平面和一个或多个工作节点组成。控制平面负责管理集群状态，Worker Node 负责运行 Pod。

## 2.2 Control Plane

Control Plane 可以理解为 Kubernetes 的“大脑”。

主要组件：

```text
kube-apiserver
etcd
kube-scheduler
kube-controller-manager
```

其中：

### kube-apiserver

Kubernetes 的 API 入口。

```text
kubectl
   │
   ▼
kube-apiserver
```

所有主要的集群资源操作都会通过 Kubernetes API 进行。

### etcd

用于保存 Kubernetes 的集群状态和 API 数据。

```text
kube-apiserver
      │
      ▼
     etcd
      │
      └── Cluster State
```

可以把它理解成 Kubernetes 的核心状态存储。

### kube-scheduler

负责给尚未绑定 Node 的 Pod 选择合适的节点。

```text
Pending Pod
    │
    ▼
kube-scheduler
    │
    ▼
Node
```

### kube-controller-manager

运行各种 Controller，不断比较：

```text
Desired State
      vs
Actual State
```

然后执行对应操作。

例如 Deployment 想要：

```text
replicas = 3
```

当前只有：

```text
2 Pods
```

Controller 就会推动系统创建第 3 个 Pod。

## 2.3 Worker Node

Worker Node 是真正运行工作负载的节点。

主要组件包括：

```text
kubelet
container runtime
kube-proxy（传统 Service 实现中）
```

其中：

### kubelet

kubelet 运行在每个 Node 上，负责确保 Pod 中声明的容器处于运行状态。

可以理解为：

```text
Control Plane
      │
      ▼
Node
      │
   kubelet
      │
      ▼
   Container
```

### Container Runtime

负责实际运行容器。

例如：

```text
containerd
CRI-O
```

Kubernetes 通过 CRI 与容器运行时协作。

### kube-proxy

在传统 Kubernetes Service 实现中，kube-proxy 负责在节点上维护实现 Service 流量转发所需的网络规则。

需要注意：

> kube-proxy 并不是 Kubernetes Pod 网络本身。Pod 网络由 CNI 等网络实现负责。

# 三、Pod

## 3.1 Pod 是什么

Pod 是 Kubernetes 中最小的可部署计算对象。

一个 Pod 可以包含一个或多个容器，这些容器共享：

```text
Network
Storage
生命周期
```

并且通常会被调度到同一个 Node。

最常见的情况：

```text
Pod
└── Container
```

但也可以：

```text
Pod
├── App Container
└── Sidecar Container
```

例如：

```text
Pod
├── application
└── log-agent
```

## 3.2 Pod 网络

每个 Pod 在 Kubernetes 网络模型中拥有自己的 IP。

同一个 Pod 内的容器共享网络命名空间，因此可以通过：

```text
localhost
```

互相通信。

例如：

```text
Pod
├── app :8080
└── sidecar :9000
```

两个容器可以：

```text
localhost:8080
localhost:9000
```

但由于共享同一个网络命名空间，一个 Pod 内两个容器不能同时监听完全相同的端口。

## 3.3 Pod 为什么通常不直接管理

虽然可以直接创建 Pod：

```bash
kubectl run nginx --image=nginx
```

但生产环境一般不直接管理裸 Pod，而是交给：

```text
Deployment
StatefulSet
DaemonSet
Job
CronJob
```

等更高级的控制器管理。

最常见的无状态应用：

```text
Deployment
   ↓
ReplicaSet
   ↓
Pods
```

# 四、Namespace

Namespace 用于在同一个 Kubernetes Cluster 中对资源进行逻辑隔离。

例如：

```text
Cluster
│
├── default
│   ├── web
│   └── redis
│
├── dev
│   ├── web
│   └── redis
│
└── prod
    ├── web
    └── redis
```

查看：

```bash
kubectl get namespaces
```

也可以：

```bash
kubectl get ns
```

创建：

```bash
kubectl create namespace dev
```

之后：

```bash
kubectl get pods -n dev
```

这样就能只查看 `dev` Namespace 中的 Pod。

Namespace 并不是完整的安全边界，但它是 Kubernetes 中组织和隔离资源的重要机制。

# 五、使用 kubectl 管理 Kubernetes

`kubectl` 是 Kubernetes 最常用的命令行工具。

基本结构：

```text
kubectl
   │
   ├── get
   ├── describe
   ├── create
   ├── apply
   ├── edit
   ├── exec
   └── delete
```

## 5.1 kubectl get

查看资源：

```bash
kubectl get pods
```

查看 Deployment：

```bash
kubectl get deployments
```

查看 Service：

```bash
kubectl get svc
```

查看所有 Namespace：

```bash
kubectl get ns
```

查看 Node：

```bash
kubectl get nodes
```

查看更多信息：

```bash
kubectl get pods -o wide
```

## 5.2 kubectl describe

查看资源详细信息：

```bash
kubectl describe pod nginx
```

它特别适合故障排查。

例如可以看到：

```text
Events
Volumes
Containers
Conditions
Node
Image
```

后面的很多故障排查都离不开：

```bash
kubectl describe
```

## 5.3 kubectl create

例如：

```bash
kubectl create deployment nginx \
  --image=nginx
```

创建 Namespace：

```bash
kubectl create namespace dev
```

## 5.4 kubectl apply

Kubernetes 非常强调声明式配置。

例如：

```bash
kubectl apply -f deployment.yaml
```

意思不是：

```text
执行一堆命令
```

而是：

```text
“让集群状态变成 YAML 描述的状态”
```

因此实际生产环境中经常使用：

```text
YAML
   ↓
kubectl apply
   ↓
Kubernetes API
```

## 5.5 kubectl edit

可以直接编辑正在运行的资源：

```bash
kubectl edit deployment nginx
```

Kubernetes 会打开资源当前的 YAML 表示。

不过生产环境通常更推荐：

```text
修改 Git 中的 YAML
      ↓
提交
      ↓
部署
```

而不是长期直接手工 `kubectl edit`，这样更容易保持配置可追踪和可审计。

## 5.6 kubectl exec

进入容器：

```bash
kubectl exec -it nginx -- /bin/sh
```

如果 Pod 中有多个容器，可以指定：

```bash
kubectl exec -it nginx \
  -c app \
  -- /bin/sh
```

常用于排查：

```text
配置
DNS
网络
文件
环境变量
进程
```

## 5.7 kubectl delete

删除资源：

```bash
kubectl delete pod nginx
```

或者：

```bash
kubectl delete -f deployment.yaml
```

需要注意：

如果 Pod 由 Deployment 管理：

```text
Deployment
   ↓
ReplicaSet
   ↓
Pod
```

直接删除 Pod：

```bash
kubectl delete pod nginx
```

并不一定意味着应用永久减少一个副本。

Controller 会发现：

```text
Desired = 3
Actual = 2
```

然后重新创建 Pod。

# 六、Deployment 与 ReplicaSet

## 6.1 Deployment

Deployment 用于声明和管理无状态应用的副本以及更新。

例如：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
```

应用：

```bash
kubectl apply -f deployment.yaml
```

查看：

```bash
kubectl get deployment
```

查看 Pod：

```bash
kubectl get pods
```

## 6.2 ReplicaSet

Deployment 通常不会直接管理 Pod，而是通过 ReplicaSet：

```text
Deployment
     │
     ▼
ReplicaSet
     │
     ├── Pod
     ├── Pod
     └── Pod
```

例如：

```text
replicas: 3
```

意味着 ReplicaSet 会尽可能维持：

```text
3 Pods
```

## 6.3 自愈

假设：

```text
Pod A
Pod B
Pod C
```

其中 Pod B 崩溃：

```text
Pod A
Pod B X
Pod C
```

ReplicaSet 会发现实际数量变成：

```text
2
```

于是创建：

```text
Pod D
```

恢复：

```text
Pod A
Pod C
Pod D
```

这就是 Kubernetes 的控制器模型。

## 6.4 Deployment 更新

修改镜像：

```text
nginx:1.27
↓
nginx:1.28
```

然后：

```bash
kubectl apply -f deployment.yaml
```

Deployment 会创建新的 ReplicaSet，并逐步替换旧 Pod。

```text
Deployment
    │
    ├── Old ReplicaSet
    │      ├── Pod
    │      └── Pod
    │
    └── New ReplicaSet
           ├── Pod
           └── Pod
```

这就是常见的：

```text
Rolling Update
```

查看发布状态：

```bash
kubectl rollout status deployment/nginx
```

查看历史：

```bash
kubectl rollout history deployment/nginx
```

回滚：

```bash
kubectl rollout undo deployment/nginx
```

# 七、Service 与 Kubernetes 网络

Pod 有 IP，但是 Pod 本身并不适合作为稳定的访问入口。

因为 Pod 可能：

```text
被删除
被重新创建
被调度到其他 Node
IP 改变
```

因此 Kubernetes 使用 Service 为一组 Pod 提供稳定的网络入口。

Kubernetes 官方网络模型中，Service 提供稳定的 IP 或 DNS 名称，并通过 EndpointSlice 记录当前后端 Pod。

## 7.1 Service

例如：

```text
             Service
           10.96.10.20
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
     Pod A    Pod B    Pod C
```

Service 一般通过：

```text
Label Selector
```

选择后端 Pod。

例如：

```yaml
selector:
  app: nginx
```

对应：

```yaml
labels:
  app: nginx
```

## 7.2 ClusterIP

默认类型：

```yaml
type: ClusterIP
```

它主要用于集群内部访问。

例如：

```text
backend
   │
   ▼
redis.default.svc.cluster.local
   │
   ▼
Redis Pods
```

可以通过 Service 的 DNS 名称访问。

## 7.3 NodePort

NodePort 会在节点上开放一个端口。

例如：

```yaml
type: NodePort
```

结构：

```text
Client
  │
  ▼
NodeIP:30080
  │
  ▼
Service
  │
  ▼
Pod
```

因此可以通过：

```text
<NodeIP>:NodePort
```

访问服务。

## 7.4 LoadBalancer

在支持云厂商负载均衡器的环境中，可以使用：

```yaml
type: LoadBalancer
```

典型结构：

```text
Internet
   │
   ▼
Cloud Load Balancer
   │
   ▼
Service
   │
   ▼
Pods
```

如果是裸机环境，则需要额外的 LoadBalancer 实现，例如 MetalLB 等方案。

## 7.5 Service 的本质

可以把 Service 理解成：

```text
稳定入口
   +
Pod 集合
```

因此：

```text
Pod
→ 容易变化

Service
→ 提供稳定访问入口
```

# 八、Kubernetes 集群网络基础

Kubernetes 网络涉及多个层次：

```text
Container → Container
Pod → Pod
Pod → Service
External → Service
```

官方文档把这些视为不同的网络问题。

## 8.1 Pod 网络

每个 Pod 获得一个集群范围内唯一的 IP。

基本模型是：

```text
Pod A
10.244.1.10
   │
   │
   ▼
Pod B
10.244.2.20
```

即使两个 Pod 位于不同 Node：

```text
Node 1
  └── Pod A

Node 2
  └── Pod B
```

也应该能够按照 Kubernetes 网络模型直接通信。

## 8.2 CNI

Kubernetes 本身定义网络模型，但不会替你实现整个 Pod 网络。

通常通过 CNI（Container Network Interface）插件实现 Pod 网络。

常见方案包括：

```text
Cilium
Calico
Flannel
```

其职责可能涉及：

```text
Pod IP 分配
跨节点 Pod 通信
网络路由
NetworkPolicy
```

因此：

```text
Kubernetes
   │
   └── 网络模型

CNI
   │
   └── 具体网络实现
```

## 8.3 Service 网络

Service 是另一层抽象：

```text
Pod IP
   ↓
Service IP
   ↓
Service Backend
```

所以排查 Kubernetes 网络问题时，不应该把：

```text
Pod IP
Service IP
Node IP
```

混为一谈。

# 九、ConfigMap 与 Secret

Kubernetes 支持把应用配置与容器镜像分离。

## 9.1 ConfigMap

ConfigMap 用于保存：

```text
非敏感配置
```

例如：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  LOG_LEVEL: info
```

创建：

```bash
kubectl apply -f configmap.yaml
```

ConfigMap 可以通过：

```text
环境变量
命令参数
Volume
```

等方式提供给 Pod。

## 9.2 Secret

Secret 用于保存：

```text
密码
Token
密钥
证书
```

例如：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
stringData:
  DB_USER: app
  DB_PASSWORD: example
```

需要注意：

> Secret 主要表达“这是敏感数据”，并不意味着数据天然就具备完整的安全保护。

生产环境还应该考虑：

```text
RBAC
API Server 安全
静态数据加密
外部 Secret 管理系统
访问审计
```

Kubernetes 官方文档也将 Secret 与 ConfigMap 区分开：ConfigMap 用于非机密配置，Secret 面向密码、Token、Key 等敏感数据。

## 9.3 为什么配置应该与镜像分离

不推荐：

```text
Docker Image
  └── production-config
```

更推荐：

```text
Application Image
       +
ConfigMap / Secret
```

这样：

```text
同一个 Image
      │
      ├── dev
      ├── test
      └── prod
```

只需要注入不同配置。

# 十、Kubernetes Volume、PV 与 PVC

## 10.1 Volume

Pod 可以声明 Volume。

例如：

```yaml
volumes:
  - name: data
    emptyDir: {}
```

然后挂载：

```yaml
volumeMounts:
  - name: data
    mountPath: /data
```

## 10.2 emptyDir

`emptyDir` 会随着 Pod 创建而产生一个空目录。

```text
Pod
└── emptyDir
       └── /data
```

适用于：

```text
临时文件
缓存
Pod 内多个容器共享临时数据
```

但 Pod 被删除后，该 Volume 中的数据也会消失。

因此：

```text
emptyDir
≠
持久化存储
```

## 10.3 PersistentVolume

PV（PersistentVolume）代表集群中的持久化存储资源。

```text
Storage
   │
   ▼
PersistentVolume
```

它可以来自不同存储后端。

## 10.4 PersistentVolumeClaim

PVC（PersistentVolumeClaim）是工作负载对存储的请求：

```text
Pod
 │
 ▼
PVC
 │
 ▼
PV
 │
 ▼
Storage
```

例如：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

Pod 使用 PVC：

```yaml
volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

这样应用就不需要直接关心底层磁盘的具体实现。

# 十一、Ingress 与 HTTP 流量管理

## 11.1 Ingress

Ingress 用于描述从集群外部进入 Kubernetes Service 的 HTTP/HTTPS 路由。

例如：

```text
                Internet
                    │
                    ▼
                 Ingress
              /     |     \
             /      |      \
            ▼       ▼       ▼
          web     api     admin
           │        │        │
        Service  Service  Service
```

Ingress 可以根据：

```text
Host
Path
```

进行路由。

例如：

```text
example.com/
        ↓
web-service

example.com/api
        ↓
api-service

admin.example.com
        ↓
admin-service
```

## 11.2 Ingress Controller

Ingress 资源本身只是 API 对象，并不会自动处理网络流量。

需要实际的 Ingress Controller：

```text
Ingress
    │
    ▼
Ingress Controller
    │
    ▼
Service
```

常见实现包括：

```text
NGINX Ingress Controller
Traefik
HAProxy
```

具体选择取决于集群和平台。

## 11.3 Ingress 的当前定位

Ingress API 从 Kubernetes v1.19 起稳定，但目前已经冻结，不再继续增加新的 API 功能；Kubernetes 官方推荐新项目考虑 Gateway API。

因此学习 Ingress 仍然非常重要，因为大量现有 Kubernetes 集群仍在使用它：

```text
历史与现有系统
→ Ingress

新的流量管理设计
→ Gateway API
```

## 11.4 Ingress 不是什么

Ingress 主要针对：

```text
HTTP
HTTPS
```

它不是一个通用 TCP/UDP 端口代理。

如果需要暴露其他协议，通常仍然会使用：

```text
NodePort
LoadBalancer
Gateway
```

等方案。

# 十二、资源请求、限制与调度

Kubernetes 调度的重要输入之一，就是 Pod 对资源的声明。

最常见的是：

```text
CPU
Memory
```

## 12.1 Requests

例如：

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
```

可以理解为：

```text
“我至少希望调度系统为我考虑这么多资源”
```

Scheduler 会根据 Pod 的资源请求等条件选择合适的 Node。

## 12.2 Limits

例如：

```yaml
resources:
  limits:
    cpu: "1"
    memory: "1Gi"
```

用于限制容器可以使用的资源上限。

因此：

```text
requests
→ 调度参考

limits
→ 资源约束
```

Kubernetes 官方资源管理文档将 Requests、Limits 作为工作负载资源管理的核心机制。

## 12.3 CPU

Kubernetes 中：

```text
1 CPU
= 1 个 CPU 核心或对应计算单位
```

例如：

```text
500m
```

表示：

```text
0.5 CPU
```

## 12.4 Memory

例如：

```text
512Mi
1Gi
2Gi
```

表示内存大小。

## 12.5 为什么必须合理设置资源

如果没有合理的资源声明：

```text
Node
 ├── App A
 ├── App B
 └── App C
```

其中 App A 可能不断消耗资源：

```text
Memory ↑↑↑
CPU    ↑↑↑
```

最终影响整个 Node。

因此 Kubernetes 需要结合：

```text
Requests
Limits
QoS
Scheduling
Eviction
```

来进行资源管理。

# 十三、Kubernetes 调度

Scheduler 的基本流程可以理解成：

```text
Pending Pod
      │
      ▼
Scheduler
      │
      ├── Node 是否满足资源？
      ├── 是否满足约束？
      ├── 是否存在污点？
      ├── 是否满足亲和性？
      └── ...
      │
      ▼
选择 Node
```

例如：

```text
Node A
CPU: 剩余 100m

Pod 需要：
CPU: 500m
```

那么 Pod 不适合调度到 Node A。

而：

```text
Node B
CPU: 剩余 2 CPU
```

则更适合。

因此：

> Kubernetes 调度不是简单地“找一台空闲机器”。

它需要综合考虑资源、节点属性和各种调度约束。

# 十四、kubeadm 搭建 Kubernetes 集群

`kubeadm` 是 Kubernetes 官方提供的集群引导工具之一。

它适合：

```text
学习环境
实验环境
裸机集群
自建 Kubernetes
```

官方文档：
[Installing kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/)

## 14.1 一个典型集群

实验环境可以准备：

```text
Control Plane
192.168.1.10

Worker Node 1
192.168.1.11

Worker Node 2
192.168.1.12
```

整体：

```text
             Control Plane
             192.168.1.10
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
     Node 1     Node 2    Node ...
```

## 14.2 准备条件

具体要求会随着 Kubernetes 版本和发行版变化，但通常需要准备：

```text
Linux
稳定主机名 / DNS
网络连通
容器运行时
kubeadm
kubelet
kubectl
```

此外还需要正确处理：

```text
Swap
内核模块
sysctl
cgroup
防火墙 / 端口
时间同步
```

实际部署应该按照目标 Kubernetes 版本对应的官方 kubeadm 文档逐项准备，而不要完全照抄旧教程。

截至 2026 年 9 月，Kubernetes 官方当前维护的最新三个 minor release 为 1.37、1.36、1.35，其中 1.37.0 于 2026 年 8 月 26 日发布。

## 14.3 安装容器运行时

Kubernetes Node 需要容器运行时。

常见：

```text
containerd
CRI-O
```

例如完成：

```text
containerd
```

安装与配置后，再准备：

```text
kubeadm
kubelet
kubectl
```

## 14.4 初始化 Control Plane

在控制平面节点运行：

```bash
sudo kubeadm init
```

实际生产或多网卡环境中通常需要明确指定：

```text
apiserver-advertise-address
pod-network-cidr
control-plane-endpoint
```

例如：

```bash
sudo kubeadm init \
  --apiserver-advertise-address=192.168.1.10 \
  --pod-network-cidr=10.244.0.0/16
```

这里的：

```text
pod-network-cidr
```

必须与后续选择的 CNI 配置匹配。

## 14.5 配置 kubectl

初始化完成后，通常需要为当前用户配置：

```bash
mkdir -p $HOME/.kube

sudo cp -i /etc/kubernetes/admin.conf \
  $HOME/.kube/config

sudo chown "$(id -u)":"$(id -g)" \
  $HOME/.kube/config
```

测试：

```bash
kubectl get nodes
```

此时可能看到：

```text
NAME      STATUS     ROLES           AGE
master    NotReady   control-plane   ...
```

为什么是：

```text
NotReady
```

因为此时通常还没有安装 Pod Network。

## 14.6 安装 CNI

接下来安装选定的 CNI，例如：

```text
Calico
Cilium
Flannel
```

安装后再检查：

```bash
kubectl get nodes
```

如果网络配置正常，Node 通常会逐渐变成：

```text
Ready
```

## 14.7 加入 Worker Node

在 Worker Node 上先完成：

```text
container runtime
kubeadm
kubelet
```

然后使用 Control Plane 初始化时生成的 join 命令：

```bash
kubeadm join <control-plane>:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

回到 Control Plane：

```bash
kubectl get nodes
```

可以看到：

```text
NAME      STATUS   ROLES
master    Ready    control-plane
worker1   Ready    <none>
worker2   Ready    <none>
```

## 14.8 kubeadm 背后的架构

使用 kubeadm 后，可以进一步理解：

```text
Control Plane
├── kube-apiserver
├── etcd
├── kube-scheduler
├── kube-controller-manager
└── static Pods

Worker
├── kubelet
├── container runtime
└── kube-proxy / CNI
```

kubeadm 常见的控制平面组件可以以 Static Pod 方式运行，这是当前官方 kubeadm 架构中的典型做法。

# 十五、Kubernetes 日志

Kubernetes 中排查应用故障时，最常用的命令之一：

```bash
kubectl logs
```

## 15.1 查看 Pod 日志

```bash
kubectl logs nginx
```

持续查看：

```bash
kubectl logs -f nginx
```

查看上一次崩溃的容器日志：

```bash
kubectl logs nginx --previous
```

## 15.2 多容器 Pod

如果 Pod 中有多个容器：

```bash
kubectl logs nginx -c app
```

指定：

```text
-c <container>
```

## 15.3 日志与容器

通常：

```text
Application
   │
   ├── stdout
   └── stderr
         │
         ▼
    Container Runtime
         │
         ▼
 Kubernetes logs
```

因此应用容器最好能够把关键日志输出到：

```text
stdout
stderr
```

而不是只写在容器内部不易收集的文件里。

生产环境再进一步通过日志系统进行集中收集：

```text
Pod
 │
 ▼
Log Collector
 │
 ▼
Central Log System
```

Kubernetes 本身不会强制绑定某一种日志系统。

# 十六、Events 与故障排查

很多 Kubernetes 故障不是：

```text
Application Exception
```

而是：

```text
Scheduler
Image
Volume
Network
Node
```

层面的问题。

因此：

```bash
kubectl get events
```

以及：

```bash
kubectl describe pod <pod>
```

非常重要。

## 16.1 Pod Pending

例如：

```text
STATUS: Pending
```

排查：

```bash
kubectl describe pod <pod>
```

重点看：

```text
Events
```

常见原因：

```text
资源不足
节点不可用
PVC 未绑定
调度约束
Taint / Toleration
```

## 16.2 ImagePullBackOff

例如：

```text
ImagePullBackOff
ErrImagePull
```

重点检查：

```text
镜像名称
Tag
Registry
网络
认证
imagePullSecrets
```

可以：

```bash
kubectl describe pod <pod>
```

查看 Events。

## 16.3 CrashLoopBackOff

如果 Pod：

```text
启动
 ↓
崩溃
 ↓
重启
 ↓
再次崩溃
```

最终可能出现：

```text
CrashLoopBackOff
```

重点检查：

```bash
kubectl logs <pod>
kubectl logs <pod> --previous
kubectl describe pod <pod>
```

常见原因：

```text
配置错误
环境变量错误
依赖服务不可用
启动命令错误
权限问题
应用本身崩溃
```

## 16.4 Service 无法访问

排查顺序：

```text
Pod
 ↓
Pod IP
 ↓
Pod Label
 ↓
Service Selector
 ↓
EndpointSlice
 ↓
Service
 ↓
Ingress / LoadBalancer
```

例如：

```bash
kubectl get pods --show-labels
```

检查：

```bash
kubectl get svc
```

然后：

```bash
kubectl get endpointslices
```

如果 Service 存在：

```text
Service
```

但没有对应后端：

```text
EndpointSlice = empty
```

通常需要检查：

```text
Selector
Labels
Pod Ready 状态
```

# 十七、Kubernetes 存储故障

如果：

```text
Pod
   ↓
PVC
   ↓
PV
```

其中任何一层异常，都可能导致 Pod 无法正常运行。

检查：

```bash
kubectl get pvc
kubectl get pv
```

详细信息：

```bash
kubectl describe pvc <name>
```

常见问题：

```text
PVC Pending
StorageClass 不存在
PV 无法绑定
权限错误
CSI 异常
存储后端不可用
```

因此 Kubernetes 存储排查不能只看：

```text
Pod
```

而要一直追踪到：

```text
Pod
 ↓
PVC
 ↓
PV
 ↓
StorageClass / CSI
 ↓
Storage Backend
```

# 十八、Kubernetes 网络故障排查

网络排查需要区分：

```text
Pod → Pod
Pod → Service
Node → Pod
External → Service
```

## 18.1 Pod → Pod

检查 Pod：

```bash
kubectl get pods -o wide
```

查看 Pod IP 和 Node。

然后进入容器：

```bash
kubectl exec -it <pod> -- /bin/sh
```

测试：

```bash
ping <pod-ip>
```

或者：

```bash
curl http://<pod-ip>:8080
```

## 18.2 Pod → Service

先查看：

```bash
kubectl get svc
```

再查看 EndpointSlice：

```bash
kubectl get endpointslices
```

检查 DNS：

```bash
kubectl exec -it <pod> -- \
  nslookup <service-name>
```

## 18.3 External → Service

如果使用：

```text
NodePort
LoadBalancer
Ingress
```

则需要继续检查：

```text
外部入口
 ↓
Node / LoadBalancer
 ↓
Service
 ↓
EndpointSlice
 ↓
Pod
```

任何一层异常，都可能导致：

```text
浏览器访问失败
```

# 十九、Helm 基础

当 Kubernetes YAML 增多以后，直接维护大量 YAML 会变得复杂。

例如一个生产应用可能包含：

```text
Deployment
Service
ConfigMap
Secret
Ingress
PVC
HPA
ServiceAccount
```

于是出现了 Helm。

## 19.1 Helm 是什么

Helm 是 Kubernetes 常见的软件包管理工具。

可以理解为：

```text
Helm
   │
   └── Package Manager
             │
             ▼
        Kubernetes
```

Helm 中一个应用包通常叫：

```text
Chart
```

一个 Chart 可以包含：

```text
Chart.yaml
values.yaml
templates/
```

## 19.2 Helm Chart

典型结构：

```text
myapp/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    └── ingress.yaml
```

其中：

```text
templates/
```

保存模板。

而：

```text
values.yaml
```

保存可配置参数。

例如：

```yaml
replicaCount: 3

image:
  repository: nginx
  tag: "1.28"

service:
  port: 80
```

## 19.3 Helm Install

例如：

```bash
helm install myapp ./myapp
```

查看：

```bash
helm list
```

卸载：

```bash
helm uninstall myapp
```

## 19.4 Helm Upgrade

修改：

```text
values.yaml
```

然后：

```bash
helm upgrade myapp ./myapp
```

这样可以复用同一个 Chart：

```text
dev
 ↓
values-dev.yaml

test
 ↓
values-test.yaml

prod
 ↓
values-prod.yaml
```

而不是维护三套几乎相同的 YAML。

## 19.5 Helm 的定位

可以这样理解：

```text
Dockerfile
→ 构建容器镜像

Helm
→ 打包 Kubernetes 应用部署配置
```

它不负责替代：

```text
Kubernetes
```

而是帮助更方便地管理 Kubernetes 应用。

# 二十、Kubernetes 常用命令速查

虽然 Kubernetes 学习不能只靠背命令，但下面这些命令是日常运维中非常常见的。

```bash
# Node
kubectl get nodes
kubectl describe node <node>

# Pod
kubectl get pods
kubectl get pods -o wide
kubectl describe pod <pod>
kubectl logs <pod>
kubectl logs <pod> --previous
kubectl exec -it <pod> -- /bin/sh

# Deployment
kubectl get deployment
kubectl describe deployment <name>
kubectl rollout status deployment/<name>
kubectl rollout history deployment/<name>
kubectl rollout undo deployment/<name>

# Service
kubectl get svc
kubectl describe svc <name>

# Config / Secret
kubectl get configmap
kubectl get secret

# Storage
kubectl get pv
kubectl get pvc

# Events
kubectl get events

# Namespace
kubectl get ns

# Apply / Delete
kubectl apply -f app.yaml
kubectl delete -f app.yaml
```

其中最值得熟悉的是：

```text
get
describe
logs
exec
apply
delete
```

可以把它们理解成：

```text
get
→ 看有什么

describe
→ 看为什么

logs
→ 看应用说了什么

exec
→ 进入容器检查

apply
→ 让集群变成声明的状态

delete
→ 删除资源
```

# 二十一、Kubernetes 故障排查总模型

Kubernetes 故障排查最好不要一上来就：

```bash
kubectl delete pod
```

而应该先定位故障层级。

```text
                    用户访问失败
                         │
                         ▼
                    Ingress / LB
                         │
                         ▼
                      Service
                         │
                         ▼
                     Endpoint
                         │
                         ▼
                        Pod
                    ┌────┴────┐
                    ▼         ▼
                 Container   Volume
                    │
                    ▼
                  Process
                    │
                    ▼
                 Application
```

如果 Pod 本身有问题：

```text
Pod
 │
 ├── Pending
 │
 ├── ImagePullBackOff
 │
 ├── CrashLoopBackOff
 │
 └── Running but not Ready
```

就继续沿着：

```text
kubectl describe
kubectl logs
kubectl logs --previous
kubectl exec
```

进行定位。

如果是网络问题：

```text
Pod IP
 ↓
DNS
 ↓
Service
 ↓
EndpointSlice
 ↓
Ingress / LoadBalancer
```

如果是存储问题：

```text
Pod
 ↓
Volume
 ↓
PVC
 ↓
PV
 ↓
StorageClass / CSI
 ↓
Storage Backend
```

如果是调度问题：

```text
Pod Pending
 ↓
Events
 ↓
Requests
 ↓
Node
 ↓
Taint / Affinity
 ↓
Scheduler
```

# 二十二、Docker 与 Kubernetes 的关系

学习完 Docker 和 Kubernetes，可以把两者放在一起理解。

```text
Docker
│
├── Image
├── Container
├── Network
├── Volume
└── Compose
```

更偏向：

```text
单机容器运行与管理
```

而 Kubernetes：

```text
Cluster
│
├── Node
│
├── Pod
│
├── Deployment
│
├── Service
│
├── ConfigMap / Secret
│
├── PV / PVC
│
├── Ingress / Gateway
│
└── Scheduler
```

更偏向：

```text
集群级容器编排与管理
```

两者并不是：

```text
Docker
VS
Kubernetes
```

的简单竞争关系。

更接近：

```text
Container Image
      │
      ▼
Container Runtime
      │
      ▼
 Kubernetes
      │
      ├── Scheduling
      ├── Networking
      ├── Storage
      ├── Service Discovery
      ├── Scaling
      └── Self-Healing
```

# 二十三、从运维视角理解 Kubernetes

Docker 学习之后，真正值得建立的是 Kubernetes 的整体运行模型：

```text
                        Kubernetes Cluster
                               │
                ┌──────────────┴──────────────┐
                │                             │
          Control Plane                    Nodes
                │                             │
      ┌─────────┼─────────┐          ┌────────┼────────┐
      ▼         ▼         ▼          ▼        ▼        ▼
   API Server  etcd   Scheduler    kubelet   CNI    Runtime
      │
      ▼
 Controllers
      │
      ▼
Deployment
      │
      ▼
ReplicaSet
      │
      ▼
Pods
      │
      ├── ConfigMap / Secret
      ├── Volume / PVC
      └── Resources
```

对外提供服务：

```text
Internet
   │
   ▼
Ingress / Gateway
   │
   ▼
Service
   │
   ▼
Pods
   │
   ▼
Application
```

真正进行故障排查时：

```text
用户
 ↓
Ingress
 ↓
Service
 ↓
Pod
 ↓
Container
 ↓
Process
 ↓
Application
```

而 Pod 无法启动时：

```text
Pod
 ↓
Scheduler
 ↓
Node
 ↓
Image
 ↓
Runtime
 ↓
Volume
 ↓
Network
```

这就是 Kubernetes 运维中最核心的思维方式：

> **不要只记资源对象，而要理解一个请求、一个 Pod 和一份配置是怎样穿过整个 Kubernetes 系统的。**

# 二十四、总结

Kubernetes 的核心知识可以整理成下面这条主线：

```text
Cluster
   │
   ├── Control Plane
   │
   └── Node
        │
        ▼
       Pod
        │
        ▼
   Deployment
        │
        ▼
    ReplicaSet
        │
        ▼
      Pods
        │
        ├── ConfigMap
        ├── Secret
        ├── Volume
        └── Resources
```

网络：

```text
Pod
 │
 ▼
Service
 │
 ├── ClusterIP
 ├── NodePort
 └── LoadBalancer
 │
 ▼
Ingress / Gateway
 │
 ▼
External Traffic
```

存储：

```text
Pod
 ↓
PVC
 ↓
PV
 ↓
Storage
```

网络：

```text
Pod
 ↓
CNI
 ↓
Pod Network
 ↓
Service Network
```

运维：

```text
kubectl get
      ↓
kubectl describe
      ↓
kubectl logs
      ↓
kubectl exec
      ↓
Events
      ↓
Node / Network / Storage / Resource
```

最终可以用一句话概括 Kubernetes：

> **Kubernetes 通过声明式 API 和控制器，把分散在多台机器上的容器组织成一个可以自动调度、自动恢复、扩缩容和对外提供稳定服务的集群系统。**

## 外部参考

- [Kubernetes Concepts](https://kubernetes.io/docs/concepts/)
- [Kubernetes Components](https://kubernetes.io/docs/concepts/overview/components/)
- [Cluster Architecture](https://kubernetes.io/docs/concepts/architecture/)
- [Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Installing kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/)
