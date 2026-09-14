---
title: 容器化基础：Docker
published: 2026-09-14T02:48:40Z
description: ''
image: ''
tags: [Docker, 容器化, Linux, 运维]
category: 学习笔记
draft: false 
lang: ''
---

> Docker 是现代容器化技术中最常见的工具之一。
>
> 学习 Docker 的重点并不是记住大量命令，而是理解 **Image、Container、Registry、Dockerfile、Layer、Network、Volume、Compose** 之间的关系，以及容器出现问题时应该从哪里开始排查。

# 一、Docker 与容器化

## 1.1 什么是容器化

传统部署通常需要在服务器上直接安装：

```text
JDK
Python
Node.js
MySQL
Nginx
各种依赖
```

不同应用之间可能出现：

```text
版本冲突
依赖冲突
环境差异
部署困难
```

容器化则把应用及其运行环境组织成一个相对独立的运行单元：

```text
应用
 +
运行依赖
 +
配置
      │
      ▼
   Container
```

于是可以把应用从：

```text
“在这台机器上安装并运行”
```

转变为：

```text
“运行这个容器”
```

Docker Engine 采用客户端—服务端架构：

```text
docker CLI
    │
    │ Docker API
    ▼
dockerd
    │
    ├── Images
    ├── Containers
    ├── Networks
    └── Volumes
```

其中：

- `docker`：命令行客户端
- `dockerd`：Docker 守护进程
- Image：镜像
- Container：容器
- Network：网络
- Volume：数据卷

## 1.2 容器不是虚拟机

容器经常被称为“轻量级虚拟化”，但它与传统虚拟机并不相同。

典型虚拟机：

```text
物理机
  │
  ▼
Hypervisor
  │
  ├── VM
  │    ├── Guest OS
  │    └── Application
  │
  └── VM
       ├── Guest OS
       └── Application
```

容器：

```text
Host Linux Kernel
       │
       ├── Container
       │    └── Application
       │
       ├── Container
       │    └── Application
       │
       └── Container
            └── Application
```

容器通过 Linux 的命名空间、控制组等机制实现进程、网络、资源等方面的隔离。

因此：

```text
Container
≠
完整虚拟机
```

而是运行在宿主机内核之上的隔离进程环境。

# 二、Docker 核心对象

理解 Docker 最重要的一步，就是先把几个核心对象区分开。

```text
Docker

┌──────────────┐
│   Registry   │
│  镜像仓库     │
└──────┬───────┘
       │ pull / push
       ▼
┌──────────────┐
│    Image     │
│     镜像      │
└──────┬───────┘
       │ run
       ▼
┌──────────────┐
│  Container   │
│     容器      │
└──────────────┘
```

另外：

```text
Dockerfile
    │
    │ build
    ▼
  Image
```

以及：

```text
Container
   │
   ├── Network
   │
   └── Volume / Bind Mount
```

## 2.1 Image

Image（镜像）可以理解为：

> 创建容器所使用的只读模板。

例如：

```text
nginx
redis
ubuntu
postgres
```

都可以作为镜像。

查看本地镜像：

```bash
docker image ls
```

例如：

```text
REPOSITORY   TAG       IMAGE ID
nginx        latest    ...
redis        8         ...
ubuntu       24.04    ...
```

镜像本身并不是正在运行的应用。

```text
Image
   │
   └──► docker run
             │
             ▼
         Container
```

## 2.2 Container

Container（容器）是镜像运行后的实例。

例如：

```bash
docker run -d --name web nginx
```

这条命令的逻辑可以理解为：

```text
nginx Image
     │
     ▼
创建 Container
     │
     ▼
启动 nginx
```

查看运行中的容器：

```bash
docker ps
```

查看所有容器：

```bash
docker ps -a
```

停止：

```bash
docker stop web
```

启动：

```bash
docker start web
```

删除：

```bash
docker rm web
```

因此最核心的关系就是：

```text
Image
  │
  │ run
  ▼
Container
```

同一个镜像可以创建多个容器：

```text
        nginx:latest
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
     web1   web2  web3
```

## 2.3 Registry

Registry（镜像仓库）用于保存和分发镜像。

典型流程：

```text
开发者
  │
  │ docker build
  ▼
Image
  │
  │ docker push
  ▼
Registry
  │
  │ docker pull
  ▼
服务器
```

常见 Registry 包括：

```text
Docker Hub
GitHub Container Registry
私有 Registry
云厂商镜像仓库
```

镜像引用通常类似：

```text
nginx:latest
redis:8
ubuntu:24.04
```

也可以包含 Registry 地址：

```text
ghcr.io/example/myapp:1.0
```

因此：

```text
Registry
→ 存放和分发 Image

Image
→ 创建 Container

Container
→ 实际运行应用
```

# 三、Dockerfile、Build 与 Layer

## 3.1 Dockerfile

Dockerfile 是描述镜像如何构建的文本文件。

Docker 会按照 Dockerfile 中的指令构建镜像。Dockerfile 必须以 `FROM` 开始建立一个基础构建阶段。

最简单的例子：

```dockerfile
FROM nginx:alpine

COPY ./html /usr/share/nginx/html
```

构建：

```bash
docker build -t my-nginx:1.0 .
```

这里：

```text
-t my-nginx:1.0
```

表示给镜像命名。

而：

```text
.
```

表示当前目录作为 Build Context。

## 3.2 常见 Dockerfile 指令

### FROM

指定基础镜像：

```dockerfile
FROM ubuntu:24.04
```

### RUN

在构建阶段执行命令：

```dockerfile
RUN apt-get update && \
    apt-get install -y curl
```

### COPY

把构建上下文中的文件复制到镜像：

```dockerfile
COPY app.jar /app/app.jar
```

### WORKDIR

设置工作目录：

```dockerfile
WORKDIR /app
```

### ENV

设置环境变量：

```dockerfile
ENV APP_ENV=production
```

### EXPOSE

声明应用预期监听的端口：

```dockerfile
EXPOSE 8080
```

需要注意：

```text
EXPOSE
≠
端口发布
```

`EXPOSE` 更多是镜像元数据和文档说明，并不会自动把端口发布到宿主机。真正进行端口发布通常需要在运行容器时使用 `-p`。

### CMD

定义默认启动命令：

```dockerfile
CMD ["java", "-jar", "app.jar"]
```

### ENTRYPOINT

定义容器的主要执行程序：

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`CMD` 与 `ENTRYPOINT` 可以组合使用。

例如：

```dockerfile
ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["--server.port=8080"]
```

## 3.3 Docker Build

构建流程：

```text
Dockerfile
    +
Build Context
    │
    ▼
 Docker Build
    │
    ├── FROM
    ├── RUN
    ├── COPY
    ├── ...
    ▼
   Image
```

执行：

```bash
docker build -t myapp:1.0 .
```

查看镜像：

```bash
docker image ls
```

查看镜像详细信息：

```bash
docker image inspect myapp:1.0
```

## 3.4 Layer

Docker 镜像不是一个简单的大文件，而是由多个只读层组成。

例如：

```text
Application Image
┌─────────────────────┐
│ COPY application     │  Layer
├─────────────────────┤
│ RUN install deps     │  Layer
├─────────────────────┤
│ Base Image           │  Layers
└─────────────────────┘
```

Dockerfile 中的部分指令会形成新的镜像层，而底层层可以被多个镜像复用。

例如：

```text
ubuntu
   │
   ├── app1
   └── app2
```

两个镜像可以共享相同的基础层。

这也是 Docker 镜像缓存和分层存储的重要基础。

## 3.5 Build Cache

假设：

```dockerfile
FROM node:alpine

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
```

如果只修改：

```text
源代码
```

而：

```text
package.json
```

没有改变，那么前面的依赖安装步骤通常可以复用缓存。

因此 Dockerfile 一般会尽量把：

```text
变化少的步骤
```

放在：

```text
变化多的步骤
```

之前。

## 3.6 .dockerignore

构建上下文不应该把所有文件都发送给 Docker。

例如：

```text
.git
node_modules
target
__pycache__
.env
```

可以写入：

```text
.dockerignore
```

减少：

```text
Build Context 大小
```

同时避免把无关文件甚至敏感文件带入构建上下文。Docker 官方 Dockerfile 文档也将 `.dockerignore` 作为控制构建上下文的重要机制。

# 四、运行第一个 Docker 容器

## 4.1 docker run

最简单：

```bash
docker run nginx
```

后台运行：

```bash
docker run -d nginx
```

指定名称：

```bash
docker run -d --name web nginx
```

指定端口：

```bash
docker run -d \
  --name web \
  -p 8080:80 \
  nginx
```

此时：

```text
Host:8080
     │
     ▼
Container:80
     │
     ▼
   nginx
```

访问：

```text
http://localhost:8080
```

## 4.2 容器的生命周期

一个简单的生命周期：

```text
create
  │
  ▼
created
  │
  ▼
running
  │
  ├──── stop ────► stopped
  │
  ▼
exited
  │
  └──── rm ──────► deleted
```

查看状态：

```bash
docker ps -a
```

启动容器：

```bash
docker start web
```

停止：

```bash
docker stop web
```

删除：

```bash
docker rm web
```

## 4.3 容器退出不一定代表 Docker 出错

例如：

```bash
docker run ubuntu
```

可能立即退出。

原因是：

```text
容器运行时依赖前台主进程
```

如果容器中的主进程结束，容器通常也就结束。

因此：

```text
Container
   │
   └── PID 1
         │
         └── 应用主进程
```

应用进程退出：

```text
PID 1 exit
   │
   ▼
Container exited
```

这也是排查“容器启动后立刻停止”时最重要的思路之一。

# 五、Docker 网络

Docker Networking 负责容器之间、容器与宿主机、容器与外部网络之间的通信。Linux Docker Engine 默认存在 `bridge` 网络，也支持 `host`、`none`、overlay 等网络驱动。

## 5.1 查看网络

```bash
docker network ls
```

查看网络详情：

```bash
docker network inspect bridge
```

## 5.2 Bridge

Bridge 是 Docker 最常见的网络模式。

可以理解为：

```text
             Host
              │
           docker0
          /       \
         /         \
Container A       Container B
```

每个连接到 Bridge 网络的容器都会获得自己的网络接口和 IP 地址。

Docker 的 Bridge 网络默认允许同一网络中的容器互相通信，同时通过 NAT/masquerading 为容器提供外部网络访问能力。

创建自定义 Bridge：

```bash
docker network create mynet
```

运行容器：

```bash
docker run -d \
  --name web \
  --network mynet \
  nginx
```

再运行一个：

```bash
docker run -d \
  --name app \
  --network mynet \
  alpine
```

在同一个用户自定义 Bridge 网络中，容器可以通过容器名称进行 DNS 解析：

```text
app
web
```

这比直接依赖容器 IP 更方便，也更适合实际部署。

## 5.3 Host

Host 网络模式会减少容器与宿主机之间的网络隔离，容器直接使用宿主机的网络命名空间，因此不会获得独立的容器 IP。

例如：

```bash
docker run --network host nginx
```

此时 nginx 如果监听：

```text
80
```

实际上就是使用宿主机对应的网络端口。

因此：

```text
host network
→ 更接近直接运行在 Host 上
```

需要注意，在 `host` 模式下使用 `-p` 进行端口映射没有意义，Docker 会忽略这些发布端口选项。

## 5.4 Container 网络

Docker 还支持共享其他容器的网络命名空间，例如：

```bash
docker run --network container:web ...
```

此时两个容器共享同一个网络栈。

这种方式使用场景相对特殊，日常部署中更常见的是：

```text
自定义 bridge
```

## 5.5 端口映射

最常见：

```bash
docker run -d \
  -p 8080:80 \
  nginx
```

含义：

```text
宿主机 8080
     │
     ▼
容器 80
```

可以进一步指定宿主机 IP：

```bash
docker run -d \
  -p 127.0.0.1:8080:80 \
  nginx
```

这样发布端口只绑定到宿主机的本地回环地址。

Docker 官方文档指出，如果不指定宿主机地址，端口发布默认可能绑定到宿主机所有地址，因此发布端口时需要注意暴露范围。

## 5.6 端口映射与容器间通信

假设：

```text
web
  └── 80

app
  └── 8080
```

两者位于：

```text
mynet
```

那么：

```text
web → app:8080
```

并不需要：

```text
-p 8080:8080
```

因为同一 Docker 网络中的容器本身就可以直接通信。

因此：

```text
容器之间通信
→ Docker Network

外部访问容器
→ Publish Port
```

是两个不同的问题。

# 六、Docker Volume 与 Bind Mount

容器的可写层并不适合作为重要业务数据的唯一存储位置。

Docker 官方将 Volume 和 Bind Mount 作为两类主要的文件系统挂载方式。

## 6.1 为什么需要持久化

假设：

```text
Container
   │
   └── /data
```

数据库把数据存放在那里。

然后删除容器：

```bash
docker rm db
```

如果数据只存在容器自身的可写层，那么数据也可能随容器一起消失。

因此：

```text
Container
+
Persistent Storage
```

应该分开理解。

## 6.2 Volume

创建 Volume：

```bash
docker volume create db-data
```

查看：

```bash
docker volume ls
```

使用：

```bash
docker run -d \
  --name mysql \
  -v db-data:/var/lib/mysql \
  mysql
```

结构：

```text
Docker Managed Volume
        │
        ▼
     db-data
        │
        ▼
Container:/var/lib/mysql
```

Volume 的存储位置由 Docker 管理。

Docker 官方将 Volume 定位为适合持久化容器数据，以及在多个容器之间共享数据的一种机制。

## 6.3 Bind Mount

Bind Mount 则直接把宿主机某个文件或目录挂载到容器中。

例如：

```bash
docker run -d \
  -v /opt/myapp/config:/app/config \
  myapp:1.0
```

结构：

```text
Host
└── /opt/myapp/config
          │
          ▼
Container
└── /app/config
```

Bind Mount 的特点是：

```text
宿主机路径明确可见
Docker 不负责选择存储目录
```

因此特别适合：

```text
配置文件
源码
构建产物
开发环境共享目录
```

Docker 官方也明确区分了两者：Volume 的数据目录由 Docker 管理，而 Bind Mount 直接使用宿主机指定的路径。

## 6.4 Volume 与 Bind Mount 对比

| 项目 | Volume | Bind Mount |
| --- | --- | --- |
| 存储路径 | Docker 管理 | 用户指定 |
| 宿主机可见性 | 不强调具体路径 | 明确 |
| 典型用途 | 数据库、持久数据 | 配置、代码、开发 |
| 可移植性 | 相对更好 | 更依赖宿主机目录结构 |
| 管理方式 | `docker volume` | 文件系统路径 |

可以简单记成：

```text
Volume
→ “数据交给 Docker 管理”

Bind Mount
→ “数据目录由我指定”
```

# 七、Docker Logs

容器中的应用通常应该把日志输出到：

```text
stdout
stderr
```

Docker 再负责收集这些输出。

查看日志：

```bash
docker logs web
```

持续查看：

```bash
docker logs -f web
```

只查看最近内容：

```bash
docker logs --tail 100 web
```

带时间：

```bash
docker logs -t web
```

因此：

```text
Application
   │
   ├── stdout
   └── stderr
         │
         ▼
    Docker Logging
         │
         ▼
    docker logs
```

Docker 的具体日志驱动可以配置，Compose 中也可以进一步配置 service 的 logging 行为。

排查容器启动失败时：

```bash
docker ps -a
docker logs <container>
```

往往是最先应该执行的两条命令。

# 八、Docker 资源限制

一个常见误区是：

```text
容器隔离了
→ 那么它就不会影响宿主机
```

实际上，如果没有合理限制，容器中的程序仍可能大量消耗宿主机资源。

因此 Docker 支持对容器进行资源限制。

## 8.1 内存限制

例如：

```bash
docker run -d \
  --memory=512m \
  nginx
```

表示限制容器可以使用的内存。

Docker `run` 支持包括内存限制、CPU 等多种运行时约束。

## 8.2 CPU 限制

例如：

```bash
docker run -d \
  --cpus="1.5" \
  myapp
```

表示限制 CPU 使用量。

Compose 中也可以定义资源限制，例如：

```yaml
services:
  app:
    image: myapp:1.0
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

Compose Deploy Specification 将 CPU、Memory、PIDs 等限制定义为资源约束。

## 8.3 为什么需要资源限制

没有资源限制：

```text
Container
   │
   ├── CPU 高
   └── Memory 高
         │
         ▼
       Host
         │
         ▼
其他服务受到影响
```

有资源限制：

```text
Container
   │
   ├── CPU ≤ limit
   └── Memory ≤ limit
```

这样可以减少单个工作负载拖垮整台机器的风险。

# 九、Healthcheck

“容器在运行”并不一定意味着：

```text
应用正常
```

例如：

```text
Container: running
Process: running
Application: 无法处理请求
```

因此 Docker 提供 Healthcheck。

## 9.1 HEALTHCHECK

Dockerfile：

```dockerfile
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --retries=3 \
            CMD curl -f http://localhost:8080/health || exit 1
```

健康检查返回：

```text
0 → healthy
1 → unhealthy
```

容器启动后会经历：

```text
starting
   │
   ▼
healthy
```

或者：

```text
starting
   │
   ▼
unhealthy
```

Docker 官方文档明确说明，Healthcheck 用于判断容器中的应用是否仍然正常工作，而不仅仅是查看容器进程是否存在。

查看：

```bash
docker inspect <container>
```

可以找到：

```text
State.Health
```

## 9.2 Compose Healthcheck

Compose 也可以定义：

```yaml
services:
  app:
    image: myapp:1.0
    healthcheck:
      test:
        - CMD
        - curl
        - -f
        - http://localhost:8080/health
      interval: 30s
      timeout: 5s
      retries: 3
```

还可以配合：

```yaml
depends_on:
  db:
    condition: service_healthy
```

让依赖服务在健康检查通过后再启动依赖它的服务。

# 十、Docker Compose

## 10.1 为什么需要 Compose

假设一个 Web 项目包含：

```text
Nginx
Backend
MySQL
Redis
```

如果全部使用 `docker run`：

```text
docker run ...
docker run ...
docker run ...
docker run ...
```

命令会非常多。

Compose 可以把多个服务写进一个 YAML 文件。

```text
compose.yaml
     │
     ├── web
     ├── backend
     ├── mysql
     └── redis
```

然后统一管理。

Docker 官方将 Compose 定义为用于多容器应用的配置方式，可以在一个 YAML 文件中管理服务、网络和卷。

## 10.2 一个简单的 Compose

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"

  redis:
    image: redis:8

  db:
    image: postgres:18
    environment:
      POSTGRES_PASSWORD: example
```

启动：

```bash
docker compose up -d
```

查看：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs
```

单独看某个服务：

```bash
docker compose logs web
```

停止：

```bash
docker compose down
```

重新构建：

```bash
docker compose build
```

启动并构建：

```bash
docker compose up -d --build
```

## 10.3 Compose 中的服务

Compose 的核心单位是：

```yaml
services:
```

例如：

```yaml
services:
  backend:
    image: my-backend:1.0

  redis:
    image: redis:8
```

其中：

```text
backend
redis
```

是服务名。

同一个 Compose 项目里的服务可以通过服务名进行访问：

```text
backend → redis:6379
```

而不需要寻找 Redis 容器的实际 IP。

## 10.4 Compose 网络

Compose 默认会为项目创建网络，使服务之间可以通过服务名称通信。

例如：

```text
frontend
    │
    ▼
backend
    │
    ▼
redis
```

应用可以配置：

```text
REDIS_HOST=redis
REDIS_PORT=6379
```

而不是：

```text
REDIS_HOST=172.18.0.3
```

这种方式更适合容器动态创建和替换的环境。

## 10.5 Compose Volume

例如数据库：

```yaml
services:
  db:
    image: postgres:18
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

这里：

```text
db-data
```

是命名 Volume。

也可以使用 Bind Mount：

```yaml
services:
  app:
    image: myapp:1.0
    volumes:
      - ./config:/app/config
```

## 10.6 Compose 完整示例

一个稍完整的 Web 应用：

```yaml
services:

  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:8
    volumes:
      - redis-data:/data
    healthcheck:
      test:
        - CMD
        - redis-cli
        - ping
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  redis-data:
```

这里已经把前面几个概念串起来了：

```text
Dockerfile
    │
    ▼
 Build
    │
    ▼
Image
    │
    ▼
Compose Service
    │
    ▼
Container
    │
    ├── Network
    ├── Healthcheck
    └── Volume
```

# 十一、Docker 常见故障排查

学习 Docker 最重要的内容之一，就是出现问题时能够确定：

```text
到底是镜像问题？
容器问题？
网络问题？
存储问题？
应用问题？
```

推荐按照：

```text
状态
 ↓
日志
 ↓
进程
 ↓
网络
 ↓
存储
 ↓
资源
```

逐层检查。

# 十二、容器启动故障

## 12.1 容器启动后立即退出

首先：

```bash
docker ps -a
```

看：

```text
STATUS
```

例如：

```text
Exited (1)
```

然后：

```bash
docker logs <container>
```

再查看：

```bash
docker inspect <container>
```

重点关注：

```text
Entrypoint
Cmd
Environment
Mounts
NetworkSettings
State
```

典型原因：

```text
启动命令错误
配置文件错误
环境变量缺失
依赖服务不可用
权限错误
端口冲突
```

## 12.2 Exit Code

容器退出状态可以提供重要线索。

例如：

```text
Exited (1)
```

通常表示应用返回了非零退出状态。

如果是：

```text
Exited (0)
```

则更可能是：

```text
主进程正常结束
```

所以排查时不要只看：

```text
容器没启动
```

而应该继续问：

```text
主进程为什么退出？
```

# 十三、Docker 网络故障

## 13.1 端口没有暴露

检查：

```bash
docker ps
```

看：

```text
PORTS
```

例如：

```text
0.0.0.0:8080->80/tcp
```

表示：

```text
Host 8080
   ↓
Container 80
```

如果没有：

```text
-p 8080:80
```

即使 nginx 在容器内部监听 80，也不代表外部客户端可以通过宿主机 8080 访问。

## 13.2 容器内部服务监听错误地址

一个很常见的问题：

```text
应用监听：
127.0.0.1:8080
```

而其他容器访问：

```text
container:8080
```

可能无法连接。

因为：

```text
127.0.0.1
```

表示当前容器自己的回环地址。

容器内的服务如果需要被其他容器访问，通常需要监听适当的容器网络地址，例如：

```text
0.0.0.0:8080
```

这是 Web 应用容器化时非常常见的问题。

## 13.3 DNS 问题

例如：

```text
backend
   │
   └── redis:6379
```

如果：

```text
redis
```

解析失败，就应该检查：

```bash
docker network inspect <network>
```

以及：

```bash
docker exec -it backend getent hosts redis
```

## 13.4 网络排查顺序

可以按照：

```text
容器是否运行
      ↓
网络是否连接
      ↓
DNS 是否解析
      ↓
目标端口是否监听
      ↓
防火墙 / 网络策略
      ↓
应用是否接受请求
```

逐层排查。

# 十四、Docker 存储故障

## 14.1 容器删除后数据丢失

检查：

```bash
docker inspect <container>
```

查看：

```text
Mounts
```

如果数据库没有挂载：

```text
Volume
```

或者：

```text
Bind Mount
```

那么重要数据可能只存在容器可写层。

## 14.2 Volume 不生效

常见问题：

```text
路径写错
权限不对
挂载目标错误
容器内原有数据被挂载覆盖
```

检查：

```bash
docker inspect <container>
```

确认：

```text
Source
Destination
RW
```

## 14.3 宿主机磁盘不足

容器大量写数据时，也可能把宿主机磁盘写满。

检查：

```bash
df -h
```

以及 Docker 磁盘使用：

```bash
docker system df
```

清理无用资源时可以使用：

```bash
docker system prune
```

但是生产环境执行清理命令前必须确认要删除的对象，避免误删仍然需要的资源。

# 十五、Docker 镜像故障

## 15.1 镜像拉取失败

例如：

```bash
docker pull nginx
```

失败时检查：

```text
DNS
网络
Registry
认证
镜像名称
Tag
代理配置
```

## 15.2 镜像不存在

例如：

```text
pull access denied
```

可能是：

```text
镜像名称错误
仓库不存在
仓库为私有
未登录 Registry
```

可以检查：

```bash
docker image ls
```

以及：

```bash
docker login
```

## 15.3 镜像构建失败

执行：

```bash
docker build -t myapp:1.0 .
```

失败时重点检查：

```text
Dockerfile
Build Context
基础镜像
依赖下载
网络
文件路径
权限
缓存
```

特别需要注意：

```dockerfile
COPY
```

只能访问：

```text
Build Context
```

中的文件。

因此：

```bash
docker build -t myapp .
```

中的：

```text
.
```

并不是随便写的，它决定了 Docker 可以看到哪些构建输入。

# 十六、Docker 资源故障

如果：

```text
容器运行很慢
```

不能直接判断成：

```text
Docker 性能差
```

应该先检查：

```bash
docker stats
```

查看容器：

```text
CPU
Memory
Network I/O
Block I/O
```

例如：

```bash
docker stats
```

可能发现：

```text
backend
CPU 185%
MEM 900MB

redis
CPU 5%
MEM 300MB
```

此时就可以进一步定位：

```text
backend
→ CPU 异常
```

再继续查看：

```text
应用日志
线程
请求
代码
```

而不是直接修改 Docker 配置。

# 十七、Docker 故障排查总模型

面对一个容器问题，可以建立如下思维模型：

```text
                    Docker 故障
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
        Image         Container       Runtime
          │              │              │
      build/pull       state/logs    resource
          │              │              │
          └──────────────┼──────────────┘
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
          Network                 Storage
             │                       │
       DNS / port / bridge      volume / mount
             │                       │
             └───────────┬───────────┘
                         ▼
                    Application
```

实际排查时，可以形成一个固定顺序：

```text
1. docker ps -a
        ↓
2. docker logs
        ↓
3. docker inspect
        ↓
4. docker stats
        ↓
5. docker network inspect
        ↓
6. 检查 Volume / Bind Mount
        ↓
7. 宿主机系统资源
        ↓
8. 回到应用本身
```

# 十八、Docker 整体模型

到这里，可以把 Docker 的核心知识串成一个完整体系：

```text
                     Registry
                         │
                    pull / push
                         │
                         ▼
                      Image
                         │
                  Dockerfile / Build
                         │
                         ▼
                    Container
                    /    |    \
                   /     |     \
                  ▼      ▼      ▼
               Network  Volume  Logs
                  │       │
                  │       ▼
                  │    Persistent
                  │      Data
                  │
                  ▼
             Port Mapping
                  │
                  ▼
               External
                Client
```

Compose 则站在更高一层：

```text
                 compose.yaml
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
       backend        redis          db
         │             │             │
         ▼             ▼             ▼
     Container     Container      Container
         │             │             │
         └─────────────┼─────────────┘
                       ▼
                    Network
```

因此可以这样理解：

```text
Dockerfile
→ 怎么构建镜像

Image
→ 应用运行模板

Container
→ 镜像运行实例

Registry
→ 镜像存储与分发

Network
→ 容器怎么通信

Volume / Bind Mount
→ 数据放在哪里

Logs
→ 应用出了什么问题

Healthcheck
→ 应用现在是否健康

Resource Limit
→ 容器最多能消耗多少资源

Compose
→ 多个容器如何组合成一个应用
```

# 十九、从运维角度理解 Docker

对于运维而言，Docker 最重要的并不是：

```bash
docker run
docker stop
docker rm
```

这些命令本身。

真正重要的是理解：

```text
应用
 │
 ├── Image
 │
 ├── Container
 │
 ├── Network
 │
 ├── Storage
 │
 ├── Resource
 │
 ├── Logs
 │
 └── Health
```

当一个服务出现故障：

```text
Web 访问失败
```

应该逐层问：

```text
Container 在运行吗？
        ↓
应用进程存在吗？
        ↓
日志有没有报错？
        ↓
端口有没有监听？
        ↓
端口映射正确吗？
        ↓
Network 正常吗？
        ↓
依赖服务正常吗？
        ↓
Volume 是否正常？
        ↓
磁盘是否满？
        ↓
CPU / Memory 是否异常？
```

这比单纯背诵 Docker 命令更接近真正的容器运维。

# 二十、总结

Docker 可以归纳成下面这条主线：

```text
Dockerfile
    │
    │ build
    ▼
  Image
    │
    │ run
    ▼
Container
    │
    ├── Network
    │      ├── bridge
    │      ├── host
    │      └── port mapping
    │
    ├── Storage
    │      ├── Volume
    │      └── Bind Mount
    │
    ├── Logs
    ├── Healthcheck
    └── Resource Limits
```

而当多个 Container 共同组成一个完整应用时：

```text
Compose
   │
   ├── Service
   ├── Network
   ├── Volume
   └── Healthcheck
```

因此，学习 Docker 最终应该形成这样的认识：

> **镜像负责“装什么”，容器负责“跑起来”，网络负责“怎么通信”，存储负责“数据放哪里”，Compose 负责“多个服务怎么一起运行”，而运维负责“出现问题时找到到底是哪一层出了问题”。**

## 外部参考

- [Docker Engine](https://docs.docker.com/engine/)
- [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Networking](https://docs.docker.com/engine/network/)
- [Docker Storage](https://docs.docker.com/engine/storage/)
- [Docker Compose](https://docs.docker.com/compose/)
