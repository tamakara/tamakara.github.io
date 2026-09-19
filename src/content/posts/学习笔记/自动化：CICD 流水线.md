---
title: 自动化：CICD 流水线
description: '说明 CI/CD 中的构建、测试、制品、发布、验证和回滚流程。'
updated: 2026-09-19
published: 2026-09-14T05:03:34Z
description: ''
image: ''
tags: [CI/CD, Jenkins, Docker, 自动化, Linux, 运维]
category: 学习笔记
draft: false
lang: ''
---

> Ansible 解决的是“如何自动化配置和操作服务器”，而 CI/CD 解决的是“代码发生变化以后，如何自动完成构建、测试、打包、发布和回滚”。
>
> CI/CD 的核心不是某个具体工具，而是一条稳定、可重复、可追踪的软件交付流水线。
>
> 本文从 CI、CD、Pipeline 开始，逐步介绍 Docker 镜像 CI/CD、Linux 自动部署、版本发布与回滚，并使用 Jenkins 搭建一个简单的 Pipeline。

# 一、什么是 CI/CD

## 1.1 为什么需要 CI/CD

传统的软件发布流程可能是：

```text
开发者修改代码
      ↓
手动打包
      ↓
手动上传服务器
      ↓
SSH 登录服务器
      ↓
停止旧版本
      ↓
替换文件
      ↓
启动新版本
      ↓
检查
```

当项目越来越大、发布越来越频繁时，手工流程会产生：

```text
重复劳动
人为错误
环境不一致
发布不可追踪
回滚困难
```

CI/CD 的目标就是把这些重复步骤自动化。

典型流程：

```text
Git Push
   ↓
CI
   ├── Build
   ├── Test
   └── Package
          ↓
        Artifact
          ↓
CD
   ├── Deploy
   ├── Verify
   └── Rollback
```

## 1.2 CI

CI（Continuous Integration，持续集成）的核心思想是：

```text
代码频繁集成
+
自动构建
+
自动测试
```

例如：

```text
开发者 A
   │
   ▼
git push
   │
   ▼
CI Pipeline
   │
   ├── Checkout
   ├── Build
   ├── Unit Test
   └── Static Check
```

如果构建或测试失败：

```text
Pipeline Failed
```

开发者就能更早发现问题。

因此：

> **CI 主要关注“代码提交之后能不能稳定地被构建和验证”。**

# 二、CD：Continuous Delivery 与 Continuous Deployment

CD 在实际语境中可能表示两个相近但不同的概念：

```text
Continuous Delivery
持续交付

Continuous Deployment
持续部署
```

## 2.1 Continuous Delivery

持续交付强调：

```text
代码
 ↓
Build
 ↓
Test
 ↓
Package
 ↓
Ready for Release
```

系统自动完成发布前流程，但正式上线可能仍然需要人工确认。

例如：

```text
Build
 ↓
Test
 ↓
Staging
 ↓
Manual Approval
 ↓
Production
```

## 2.2 Continuous Deployment

持续部署进一步自动化：

```text
Code Push
   ↓
Build
   ↓
Test
   ↓
Deploy
   ↓
Production
```

只要流水线通过，就自动部署生产环境。

两者区别可以简单记成：

```text
Continuous Delivery
→ “随时可以发布”

Continuous Deployment
→ “通过验证就自动发布”
```

# 三、Pipeline

## 3.1 什么是 Pipeline

Pipeline（流水线）就是把：

```text
Build
Test
Package
Deploy
Verify
```

等步骤按照一定顺序组织起来。

例如：

```text
                  Pipeline
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
      Build         Test        Deploy
        │            │            │
        ▼            ▼            ▼
      Image       Test Pass      Server
```

一个非常典型的流程：

```text
Checkout
   ↓
Build
   ↓
Test
   ↓
Docker Build
   ↓
Docker Push
   ↓
Deploy
   ↓
Health Check
```

## 3.2 Stage

Pipeline 通常拆分成多个 Stage：

```text
Stage 1: Checkout
Stage 2: Build
Stage 3: Test
Stage 4: Package
Stage 5: Deploy
Stage 6: Verify
```

这样可以让：

```text
执行过程
日志
失败位置
```

更加清晰。

## 3.3 Artifact

Build 完成后通常会产生：

```text
Artifact
```

例如：

```text
app.jar
app.tar.gz
Docker Image
```

典型流程：

```text
Source Code
    ↓
Build
    ↓
Artifact
    ↓
Deploy
```

在容器化环境中，最常见的 Artifact 之一就是：

```text
Docker Image
```

# 四、CI/CD 与 Git

CI/CD 的起点通常是：

```text
Git Repository
```

例如：

```text
Developer
    │
    │ git push
    ▼
Git Repository
    │
    ▼
CI Server
```

触发方式常见：

```text
Push
Pull Request
Tag
Schedule
Manual
```

例如：

```text
push main
   ↓
trigger pipeline
```

或者发布：

```text
git tag v1.2.0
   ↓
build
   ↓
release
```

因此 Git 不只是：

```text
代码备份
```

它还提供：

```text
版本
提交记录
分支
Tag
审核
```

为 CI/CD 提供天然的版本来源。

# 五、Docker 镜像 CI/CD

前面已经学习过 Docker：

```text
Dockerfile
   ↓
docker build
   ↓
Image
   ↓
Container
```

现在把它接入 CI/CD：

```text
Git Push
   ↓
CI
   ↓
Docker Build
   ↓
Docker Image
   ↓
Registry
   ↓
Deploy
```

完整流程：

```text
              Git Repository
                    │
                  Push
                    │
                    ▼
               CI Pipeline
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Build       Test    Docker Build
                              │
                              ▼
                           Image
                              │
                              ▼
                          Registry
                              │
                              ▼
                           Server
                              │
                              ▼
                         Container
```

Docker 官方也提供了针对 CI 平台的 Build / Push Action 和 Buildx 等能力，用于自动构建和推送镜像。 ([docs.docker.com](https://docs.docker.com/build/ci/github-actions/?utm_source=chatgpt.com))

# 六、Docker Image Tag

CI/CD 中不要简单地只使用：

```text
latest
```

更推荐让镜像 Tag 能体现版本。

例如：

```text
myapp:1.0.0
myapp:1.1.0
myapp:1.2.0
```

甚至：

```text
myapp:git-8f3a21c
```

这样：

```text
版本
 ↓
Image Tag
```

建立了明确对应关系。

例如：

```text
v1.4.2
   │
   ▼
myapp:1.4.2
```

发布时：

```text
Production
→ myapp:1.4.2
```

出了问题就可以：

```text
myapp:1.4.1
```

进行回滚。

## 6.1 为什么不要依赖 latest

如果：

```text
myapp:latest
```

昨天是：

```text
1.0
```

今天变成：

```text
1.1
```

那么你无法直接从：

```text
latest
```

知道生产环境具体运行的是哪个版本。

因此：

```text
可追踪版本
```

非常重要。

# 七、Docker Registry

镜像构建之后，需要放到 Registry：

```text
CI
 │
 │ docker push
 ▼
Registry
 │
 │ docker pull
 ▼
Production
```

例如：

```bash
docker build -t registry.example.com/myapp:1.0.0 .
```

登录：

```bash
docker login registry.example.com
```

推送：

```bash
docker push registry.example.com/myapp:1.0.0
```

服务器：

```bash
docker pull registry.example.com/myapp:1.0.0
```

这样生产服务器不需要自己：

```text
Git clone
 ↓
Maven build
 ↓
npm build
```

而只需要：

```text
Pull Image
 ↓
Run Container
```

# 八、一个完整的 Docker CI Pipeline

例如 Java 项目：

```text
Git Push
   ↓
Checkout
   ↓
Maven Build
   ↓
Unit Test
   ↓
Docker Build
   ↓
Docker Push
   ↓
Deploy
```

Dockerfile：

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY target/app.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

构建：

```bash
mvn clean package

docker build \
  -t registry.example.com/myapp:${VERSION} .
```

推送：

```bash
docker push \
  registry.example.com/myapp:${VERSION}
```

最终：

```text
myapp:1.0.0
```

进入 Registry。

# 九、Linux 自动部署 Web 服务

假设服务器：

```text
Linux
Docker
```

需要部署：

```text
Web Application
```

手工方式：

```text
ssh server
 ↓
docker pull
 ↓
docker stop
 ↓
docker rm
 ↓
docker run
```

可以自动化成：

```text
CI
 ↓
Registry
 ↓
SSH
 ↓
Linux Server
 ↓
docker pull
 ↓
replace container
```

## 9.1 基本部署脚本

例如：

```bash
#!/usr/bin/env bash

set -euo pipefail

IMAGE="registry.example.com/myapp:1.0.0"
CONTAINER="myapp"

docker pull "$IMAGE"

docker stop "$CONTAINER" || true
docker rm "$CONTAINER" || true

docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p 8080:8080 \
  "$IMAGE"
```

这里：

```text
set -euo pipefail
```

可以减少脚本静默失败。

## 9.2 部署流程

```text
Registry
   │
   ▼
docker pull
   │
   ▼
Stop Old
   │
   ▼
Remove Old
   │
   ▼
Run New
   │
   ▼
Health Check
```

但这种：

```text
停止旧版本
→ 启动新版本
```

存在短暂服务中断。

因此生产环境可能进一步使用：

```text
Rolling Update
Blue-Green
Canary
```

等发布策略。

# 十、应用发布

## 10.1 发布版本

假设当前：

```text
v1.2.0
```

准备发布：

```text
v1.3.0
```

完整流程：

```text
Git Tag v1.3.0
       │
       ▼
      CI
       │
       ├── Build
       ├── Test
       └── Docker Build
              │
              ▼
        myapp:1.3.0
              │
              ▼
           Registry
              │
              ▼
          Production
```

这样每一次发布都具有：

```text
Git Version
Image Version
Deployment Version
```

三者之间的对应关系。

# 十一、应用版本回滚

## 11.1 为什么需要回滚

假设：

```text
v1.3.0
```

发布之后：

```text
5xx ↑
Latency ↑
Application Error
```

这时候最快的恢复方式可能不是：

```text
现场修改代码
```

而是：

```text
Rollback
```

回到：

```text
v1.2.0
```

## 11.2 Docker 回滚

因为镜像具有明确版本：

```text
myapp:1.2.0
myapp:1.3.0
```

可以直接：

```bash
docker pull registry.example.com/myapp:1.2.0
```

然后重新启动：

```bash
docker run ...
```

最终：

```text
Production
   │
   ▼
myapp:1.2.0
```

## 11.3 回滚的前提

回滚不是简单地：

```text
“把旧镜像重新启动”
```

还需要确认：

```text
数据库 Schema
配置文件
依赖版本
数据格式
API 兼容性
```

例如：

```text
v1.3.0
 ↓
数据库迁移
 ↓
Schema changed
```

这时候直接：

```text
Application → v1.2.0
```

可能无法工作。

因此真正可靠的回滚体系还需要考虑：

```text
应用版本
+
配置版本
+
数据库迁移
```

之间的兼容性。

# 十二、Blue-Green Deployment

为了减少发布过程中的中断，可以同时运行两个版本：

```text
                  Load Balancer
                       │
              ┌────────┴────────┐
              ▼                 ▼
          Blue v1.2          Green v1.3
          Production          Testing
```

新版本：

```text
Green v1.3
```

部署完成后进行验证：

```text
Health Check
Smoke Test
```

确认正常后：

```text
Traffic
Blue → Green
```

切换：

```text
之前：
LB → Blue

之后：
LB → Green
```

如果出现问题：

```text
Green
  X
  │
  ▼
Traffic → Blue
```

快速回滚。

# 十三、Canary Deployment

Canary（灰度发布）不是一次把所有流量切换到新版本。

例如：

```text
100% Traffic
       │
       ▼
90% → v1.2
10% → v1.3
```

观察：

```text
Error Rate
Latency
CPU
Business Metrics
```

如果正常：

```text
80 / 20
```

再：

```text
50 / 50
```

最终：

```text
0 / 100
```

这样可以降低新版本故障的影响范围。

# 十四、Jenkins

## 14.1 Jenkins 是什么

Jenkins 是一个自动化服务器，提供大量插件和 Pipeline 能力，可以用于构建、测试和持续交付。

Jenkins 的 Pipeline 是通过代码描述交付过程的重要机制，通常使用 `Jenkinsfile` 保存 Pipeline 定义。Jenkins 官方推荐把 `Jenkinsfile` 放入源码控制，以获得代码审查、审计和单一事实来源等好处。 ([jenkins.io](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/?utm_source=chatgpt.com))

可以理解为：

```text
Jenkins
   │
   ├── Build
   ├── Test
   ├── Package
   ├── Docker
   └── Deploy
```

## 14.2 Jenkins Controller 与 Agent

Jenkins 可以通过：

```text
Controller
   │
   ├── Agent 1
   ├── Agent 2
   └── Agent 3
```

分配任务。

简单理解：

```text
Controller
→ 管理 Pipeline

Agent
→ 实际执行构建任务
```

因此不一定所有构建工作都直接跑在 Jenkins Controller 上。

# 十五、Jenkins Docker 部署

Jenkins 官方提供 Docker 镜像，并推荐使用 `jenkins/jenkins` 镜像。当前官方 Docker 安装文档还特别说明，如果 Jenkins Pipeline 需要执行 Docker 命令，需要额外配置 Docker CLI / Docker Engine 访问。 ([jenkins.io](https://www.jenkins.io/doc/book/installing/docker/?utm_source=chatgpt.com))

最简单的学习环境：

```bash
docker volume create jenkins-data
```

运行：

```bash
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins-data:/var/jenkins_home \
  jenkins/jenkins:lts
```

查看：

```bash
docker ps
```

查看日志：

```bash
docker logs jenkins
```

访问：

```text
http://<server>:8080
```

## 15.1 为什么需要 Volume

Jenkins 会保存：

```text
Job
Credentials
Plugins
Build Information
Pipeline
Configuration
```

这些数据需要持久化。

因此：

```text
Jenkins Container
       │
       ▼
/var/jenkins_home
       │
       ▼
Volume
```

不能简单把 Jenkins 当作一次性的无状态容器。

## 15.2 Jenkins 与 Docker

如果 Jenkins 需要：

```text
docker build
docker push
```

就需要让 Pipeline 所运行的 Agent 能访问 Docker。

典型架构：

```text
Jenkins
   │
   ▼
Agent
   │
   ▼
Docker CLI
   │
   ▼
Docker Engine
```

也可以采用 Docker-in-Docker 等方式，但安全性和架构复杂度更高。Jenkins 官方的 Docker 安装指南也提供了使用独立 `docker:dind` 容器的示例。 ([jenkins.io](https://www.jenkins.io/doc/book/installing/docker/?utm_source=chatgpt.com))

# 十六、Jenkinsfile

## 16.1 为什么使用 Jenkinsfile

早期 Jenkins 可以直接在 Web UI 里写 Pipeline：

```text
Jenkins UI
   ↓
Pipeline Script
```

但这样存在：

```text
难以版本控制
难以审查
难以迁移
```

更推荐：

```text
Git
 │
 └── Jenkinsfile
```

也就是：

```text
Pipeline as Code
```

Jenkins 官方明确推荐将 `Jenkinsfile` 存入源码管理系统。 ([jenkins.io](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/?utm_source=chatgpt.com))

# 十七、Declarative Pipeline

Jenkins Pipeline 有两种主要语法：

```text
Declarative Pipeline
Scripted Pipeline
```

对于入门，通常从 Declarative Pipeline 开始。

一个最简单的结构：

```groovy
pipeline {
    agent any

    stages {

        stage('Build') {
            steps {
                echo 'Building...'
            }
        }

        stage('Test') {
            steps {
                echo 'Testing...'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying...'
            }
        }
    }
}
```

Jenkins 官方文档将 `pipeline`、`agent`、`stages`、`steps` 作为 Declarative Pipeline 的基本结构。 ([jenkins.io](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/?utm_source=chatgpt.com))

可以理解为：

```text
pipeline
   │
   ├── agent
   │
   └── stages
         ├── Build
         ├── Test
         └── Deploy
```

# 十八、编写一个简易 Jenkins Pipeline

假设项目：

```text
Java + Maven + Docker
```

Jenkinsfile：

```groovy
pipeline {
    agent any

    environment {
        IMAGE = 'registry.example.com/myapp'
        VERSION = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }

        stage('Test') {
            steps {
                sh 'mvn test'
            }
        }

        stage('Docker Build') {
            steps {
                sh """
                    docker build \
                      -t ${IMAGE}:${VERSION} .
                """
            }
        }

        stage('Docker Push') {
            steps {
                sh """
                    docker push \
                      ${IMAGE}:${VERSION}
                """
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    ./deploy.sh ${IMAGE}:${VERSION}
                """
            }
        }
    }
}
```

整体：

```text
Checkout
   ↓
Build
   ↓
Test
   ↓
Docker Build
   ↓
Docker Push
   ↓
Deploy
```

这就是一条最基本的：

```text
CI/CD Pipeline
```

Jenkins 官方示例同样使用 Build → Test → Deploy 这样的阶段结构作为持续交付 Pipeline 的基础模型。 ([jenkins.io](https://www.jenkins.io/doc/book/pipeline/tour/deployment/?utm_source=chatgpt.com))

# 十九、Pipeline 中的 Credentials

CI/CD 经常需要：

```text
Git Token
Registry Password
SSH Key
Cloud Credentials
```

不能直接写：

```groovy
sh 'docker login -u admin -p 123456'
```

这样会产生严重的敏感信息泄露风险。

Jenkins 提供：

```text
Credentials
```

机制来管理这些凭据。

典型：

```text
Jenkins
 │
 └── Credentials
       ├── SSH Key
       ├── Username / Password
       └── Token
```

Pipeline 再引用：

```groovy
withCredentials([
    usernamePassword(
        credentialsId: 'docker-registry',
        usernameVariable: 'REGISTRY_USER',
        passwordVariable: 'REGISTRY_PASSWORD'
    )
]) {
    sh '''
        echo "$REGISTRY_PASSWORD" |
        docker login \
          -u "$REGISTRY_USER" \
          --password-stdin \
          registry.example.com
    '''
}
```

核心原则：

```text
Secrets
≠
代码
```

而应该：

```text
Secrets
→ Credentials Management
```

# 二十、Pipeline 条件控制

## 20.1 测试失败不发布

最基本：

```text
Build
 ↓
Test
 ↓
失败
 X
Deploy
```

也就是说：

```text
Test Failed
→ Pipeline Failed
→ 不应该进入 Production
```

这就是 CI/CD 的重要价值。

## 20.2 Manual Approval

生产环境可能需要人工确认：

```groovy
stage('Production Approval') {
    steps {
        input message: '确认发布到生产环境？'
    }
}
```

形成：

```text
Build
 ↓
Test
 ↓
Staging
 ↓
Manual Approval
 ↓
Production
```

这更接近：

```text
Continuous Delivery
```

# 二十一、自动部署与 Ansible

前一篇已经学习：

```text
Ansible
```

现在可以把 Jenkins 与 Ansible 组合。

```text
Git
 ↓
Jenkins
 ↓
Build
 ↓
Test
 ↓
Docker Image
 ↓
Registry
 ↓
Ansible
 ↓
Linux Server
```

例如：

```groovy
stage('Deploy') {
    steps {
        sh '''
            ansible-playbook \
              -i inventory \
              deploy.yml \
              -e image_tag=${BUILD_NUMBER}
        '''
    }
}
```

这样：

```text
Jenkins
→ 负责 Pipeline

Ansible
→ 负责服务器配置 / 部署
```

职责非常清晰。

# 二十二、CI/CD 与 Kubernetes

前面已经学习 Kubernetes。

因此还可以形成：

```text
Git
 ↓
Jenkins
 ↓
Build
 ↓
Docker Image
 ↓
Registry
 ↓
Kubernetes
 ↓
Deployment
 ↓
Pods
```

例如发布新的镜像：

```yaml
containers:
  - name: app
    image: registry.example.com/myapp:1.3.0
```

然后：

```bash
kubectl apply -f deployment.yaml
```

或者使用：

```bash
kubectl set image deployment/myapp \
  app=registry.example.com/myapp:1.3.0
```

Kubernetes 再负责：

```text
Rolling Update
Self-healing
Scheduling
Service Discovery
```

于是整个技术体系串起来：

```text
Ansible
→ 服务器自动化

Docker
→ 容器化

Kubernetes
→ 容器编排

Jenkins
→ CI/CD

Prometheus
→ Metrics

Grafana
→ Visualization
```

# 二十三、CI/CD 中的健康检查

部署完成：

```text
Container = Running
```

不代表：

```text
Application = Healthy
```

所以发布之后应该执行：

```text
Health Check
```

例如：

```bash
curl -f http://127.0.0.1:8080/health
```

或者：

```text
HTTP 200
```

才认为：

```text
Deploy Successful
```

完整流程：

```text
Deploy
  ↓
Start
  ↓
Health Check
  │
  ├── PASS → Success
  │
  └── FAIL → Rollback
```

这就是：

```text
自动部署
+
自动验证
```

# 二十四、应用发布与自动回滚

可以把前面的内容组合成：

```text
                    Git Push
                       │
                       ▼
                    Jenkins
                       │
                 ┌─────┴─────┐
                 ▼           ▼
               Build        Test
                 │           │
                 └─────┬─────┘
                       ▼
                 Docker Build
                       │
                       ▼
                    Registry
                       │
                       ▼
                    Deploy
                       │
                       ▼
                 Health Check
                  /         \
               PASS         FAIL
                │             │
                ▼             ▼
             Success       Rollback
                              │
                              ▼
                         Previous Version
```

这已经是一条比较完整的 CI/CD 基础流水线。

# 二十五、流水线中的版本管理

一个生产环境应该尽可能做到：

```text
Code Version
     │
     ▼
Build Version
     │
     ▼
Image Version
     │
     ▼
Deployment Version
```

例如：

```text
Git Tag
v2.3.1

Docker Image
myapp:2.3.1

Production
myapp:2.3.1
```

这样：

```text
谁发布的？
什么时候发布的？
发布了什么？
现在运行什么？
如何回滚？
```

都更容易回答。

# 二十六、CI/CD 常见故障排查

## 26.1 Pipeline Build 失败

首先看：

```text
Console Output
```

确定：

```text
Build
Test
Docker Build
Deploy
```

哪个 Stage 失败。

不要直接重新运行：

```text
Build #125
```

而应该先找到失败阶段。

## 26.2 Docker Build 失败

检查：

```text
Dockerfile
Build Context
Base Image
Network
Dependency
```

例如：

```text
COPY target/app.jar
```

但前面的：

```text
mvn package
```

没有生成：

```text
target/app.jar
```

那么 Docker Build 当然会失败。

因此流水线的 Stage 之间存在：

```text
依赖关系
```

## 26.3 Docker Push 失败

重点检查：

```text
Registry
Login
Credentials
Network
Image Tag
Repository
```

例如：

```text
docker push
```

失败：

```text
unauthorized
```

就应该先检查：

```text
Credentials
```

而不是修改 Dockerfile。

## 26.4 Deploy 失败

例如：

```text
docker pull
```

成功：

```text
Deploy
```

却失败。

继续检查：

```text
端口
Volume
Environment
Container Name
旧容器
权限
```

以及：

```bash
docker logs <container>
```

## 26.5 Health Check 失败

例如：

```text
Container = running

HTTP /health
→ 500
```

此时：

```text
Docker 正常
应用异常
```

继续检查：

```text
Application Logs
Database
Redis
Environment
Configuration
```

而不是：

```bash
docker restart
```

不停重启。

# 二十七、CI/CD 安全

CI/CD 可以操作：

```text
源码
镜像
服务器
生产环境
Secrets
```

因此本身就是高权限系统。

应该重点考虑：

```text
凭据保护
最小权限
Registry 权限
SSH Key
Webhook 安全
构建环境隔离
供应链安全
审计
```

例如：

```text
Jenkins
   │
   └── Production SSH Key
```

如果 Jenkins 被完全控制：

```text
攻击者
   ↓
Jenkins
   ↓
SSH Key
   ↓
Production
```

因此：

> **CI/CD 系统本身必须被当作生产基础设施进行安全保护。**

# 二十八、CI/CD 与监控

部署并不意味着流程结束。

一个完整过程应该是：

```text
Deploy
   ↓
Health Check
   ↓
Metrics
   ↓
Logs
   ↓
Business Validation
```

例如：

```text
Jenkins
  │
  ▼
Deploy v1.3.0
  │
  ▼
Prometheus
  │
  ├── Error Rate
  ├── Latency
  └── CPU
  │
  ▼
Grafana
```

如果：

```text
5xx ↑
```

就可以触发：

```text
Rollback
```

所以最终可以形成：

```text
CI/CD
+
Monitoring
+
Logging
```

自动化闭环。

# 二十九、CI/CD 整体架构

把前面几个章节全部连接起来：

```text
                         Developer
                             │
                           Git Push
                             │
                             ▼
                       Git Repository
                             │
                             ▼
                          Jenkins
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
            Build           Test         Security
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                       Docker Build
                             │
                             ▼
                           Image
                             │
                             ▼
                          Registry
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
                Ansible             Kubernetes
                  │                     │
                  ▼                     ▼
             Linux Server              Pods
                  │                     │
                  └──────────┬──────────┘
                             ▼
                         Health Check
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
                Success                Fail
                  │                     │
                  ▼                     ▼
              Monitoring             Rollback
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
       Metrics   Logs    Traces
```

后面的：

```text
Logs
ELK
OpenTelemetry
Observability
```

就可以继续接在这里。

# 三十、自动化体系中的工具分工

到这里，可以把已经学习的工具按照职责整理起来：

| 工具 | 主要解决的问题 |
| --- | --- |
| Ansible | 服务器和配置自动化 |
| Docker | 应用容器化 |
| Kubernetes | 容器集群编排 |
| Jenkins | CI/CD 流水线 |
| Prometheus | Metrics 监控 |
| Grafana | Metrics 可视化 |
| ELK | 日志收集与分析 |
| OpenTelemetry | 遥测数据采集与关联 |

因此它们并不是：

```text
哪个工具最好？
```

而是：

```text
不同层解决不同问题
```

例如：

```text
代码
 ↓
Jenkins
 ↓
Docker
 ↓
Registry
 ↓
Ansible / Kubernetes
 ↓
Application
 ↓
Prometheus / Grafana
 ↓
Logs / ELK
 ↓
OpenTelemetry
```

# 三十一、从手工发布到自动化发布

最原始：

```text
开发者
 ↓
SSH
 ↓
服务器
 ↓
手工部署
```

加入 Docker：

```text
开发者
 ↓
Docker Build
 ↓
Image
 ↓
Server
```

加入 CI：

```text
Git Push
 ↓
Jenkins
 ↓
Build
 ↓
Test
 ↓
Image
```

加入 Registry：

```text
Git
 ↓
Jenkins
 ↓
Build
 ↓
Registry
 ↓
Server
```

加入自动部署：

```text
Git
 ↓
Jenkins
 ↓
Build
 ↓
Test
 ↓
Push Image
 ↓
Deploy
 ↓
Health Check
```

加入监控：

```text
Deploy
 ↓
Health Check
 ↓
Prometheus
 ↓
Grafana
```

最终：

```text
自动构建
+
自动测试
+
自动发布
+
自动验证
+
自动监控
+
快速回滚
```

这就是现代 DevOps / 运维自动化体系的基本雏形。

# 三十二、总结

CI/CD 最核心的概念可以整理成：

```text
CI
→ 持续集成

CD
→ 持续交付 / 持续部署

Pipeline
→ 把整个交付过程组织起来

Artifact
→ 构建产生的可发布产物

Registry
→ 保存和分发 Docker Image

Jenkins
→ 执行 CI/CD Pipeline

Jenkinsfile
→ 用代码定义 Pipeline

Deploy
→ 把版本发布到目标环境

Health Check
→ 验证发布结果

Rollback
→ 出现问题后恢复到稳定版本
```

一条典型流水线：

```text
Git Push
   ↓
Checkout
   ↓
Build
   ↓
Test
   ↓
Docker Build
   ↓
Docker Push
   ↓
Deploy
   ↓
Health Check
   │
   ├── PASS → Release Success
   │
   └── FAIL → Rollback
```

而之前学习的内容可以组合成：

```text
Ansible
→ 自动化服务器

Docker
→ 容器化应用

Kubernetes
→ 管理容器集群

Jenkins
→ 自动化软件交付

Prometheus
→ 监控运行状态

Grafana
→ 展示监控数据

ELK
→ 分析日志

OpenTelemetry
→ 连接 Metrics / Logs / Traces
```

最终形成：

> **CI/CD 的核心目标，是把“代码发生变化”到“一个经过验证的版本安全地运行在生产环境”之间的重复工作自动化，并且让整个过程具备版本追踪、失败阻断、健康验证和快速回滚能力。**

## 外部参考

- [Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/)
- [Jenkinsfile](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins Docker Installation](https://www.jenkins.io/doc/book/installing/docker/)
- [Docker Build with CI](https://docs.docker.com/build/ci/)
