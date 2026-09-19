---
title: Linux：Shell 自动化脚本
published: 2026-09-13T02:11:56Z
description: 'Bash 脚本把系统命令与条件、循环和函数组合成可重复执行的流程。'
updated: 2026-09-19
image: ''
tags: [Linux, Shell, Bash, 脚本, 自动化, 运维]
category: 学习笔记
draft: false 
lang: ''
---

Bash 脚本把系统命令与条件、循环和函数组合成可重复执行的流程。它适合文件处理、检查和命令编排；复杂数据模型、大量并发和长期运行的业务逻辑通常更适合 Python、Go 等语言。

# 解释器与执行环境

脚本首行的 Shebang 决定直接执行时使用的解释器。`#!/usr/bin/env bash` 从 PATH 查找 Bash；固定路径便于控制环境，但要确认目标主机存在该路径。使用数组、双中括号等 Bash 特性时，不要声明为 sh。

| 方式 | 行为 |
|---|---|
| `bash report.sh` | Bash 读取文件，不要求文件有执行权限 |
| `./report.sh` | 需要执行权限，按 Shebang 启动解释器 |
| `source report.sh` | 在当前 Shell 执行，可能改变变量和目录，exit 也可能关闭当前 Shell |

自动任务不应依赖交互式别名、当前目录或个人启动配置。明确工具路径、输入路径、执行用户和输出位置。

# 输入、变量与数据边界

## 参数与引用

赋值等号两边不能加空格；引用变量默认加双引号，避免分词和路径名展开。单引号保留字面文本，双引号允许变量和命令替换。

| 参数 | 含义 |
|---|---|
| $0 | 脚本调用名称 |
| $1、$2 | 位置参数；读取前检查是否提供 |
| $# | 参数数量 |
| "$@" | 保留边界的所有参数 |
| $? | 上一条命令的退出状态，必须及时保存 |

```bash title="先校验输入，再处理"
if (( $# != 1 )); then
    printf '用法：%s 文件路径\n' "$0" >&2
    exit 2
fi
input_file=$1
if [[ ! -f "$input_file" || ! -r "$input_file" ]]; then
    printf '文件不存在或不可读：%s\n' "$input_file" >&2
    exit 1
fi
```

普通变量只属于当前 Shell，export 后会由新启动的子进程继承。函数内部用 local 限定变量，固定值可用 readonly。避免复用 HOME、PATH 等系统变量。

## 数组与文本读取

文件名列表用数组或逐个参数处理，不把多个路径拼成一个字符串再执行。不要通过 eval 重新解释外部输入。

```bash title="保持参数和文本行的边界"
for item in "$@"; do
    printf '%s\n' "$item"
done

while IFS= read -r line || [[ -n "$line" ]]; do
    printf '%s\n' "$line"
done < "$input_file"
```

第一段保留含空格的参数；第二段保留反斜杠及首尾空白，并处理末尾没有换行的最后一行。这两段是独立处理方式，不是文件名解析的通用替代品。Bash 变量不能保存 NUL 字节。

数组可写作 `files=("a.txt" "my file.txt")`，用 `"${files[@]}"` 展开。遍历通配符时需要处理无匹配情况，例如循环内检查 `[[ -f "$file" ]] || continue`。

# 条件、循环与函数

## 条件表达式

| 写法 | 用途与边界 |
|---|---|
| `[ -f "$path" ]` | POSIX 文件测试，括号两侧需要空格 |
| `[[ -n "$value" ]]` | Bash 字符串测试 |
| `(( count > 0 ))` | 整数判断，不支持浮点计算 |
| `[[ "$value" =~ ^[0-9]+$ ]]` | Bash 正则匹配，先校验再做数值计算 |
| `if command; then ...; fi` | 直接使用命令退出状态 |

case 适合固定选项，for 遍历对象，while 根据条件继续。break 结束循环，continue 跳过本次。判断执行用户应用 id 或 Bash 的 EUID，不能信任可被修改的 USER 环境变量。

```bash title="固定选项与明确失败状态"
case "${1-}" in
    check) printf '执行检查\n' ;;
    help) printf '用法：%s {check|help}\n' "$0" ;;
    *) printf '不支持的操作\n' >&2; exit 2 ;;
esac
```

## 函数与结果

函数用 return 返回退出状态，用标准输出传递文本，用标准错误传递诊断。函数的 $1 等参数属于此次函数调用。命令替换会移除输出末尾换行，不适合保存任意原始数据。

```bash title="函数返回状态"
is_readable_file() {
    local candidate=$1
    [[ -f "$candidate" && -r "$candidate" ]]
}
if is_readable_file "/etc/hosts"; then
    printf '文件可读\n'
fi
```

# 错误处理与资源清理

零通常表示成功，非零必须结合命令语义判断：grep 的 1 是没有匹配，2 才表示错误。服务进程处于 active 也不等于接口健康，检查脚本应明确报告它实际验证了什么。

| 选项 | 作用 | 限制 |
|---|---|---|
| set -u | 未设置变量展开时报错 | 不检测所有空字符串 |
| set -e | 部分未处理失败使脚本退出 | if、条件列表等上下文存在例外 |
| set -o pipefail | 管道返回最右侧非零状态 | 上游 SIGPIPE 等也可能造成非零 |

:::important[显式处理关键步骤]
这些选项不能替代错误分支。尤其不要把所有非零状态统一吞掉，也不要默认失败后重试修改操作。重试必须有次数、超时以及幂等条件。
:::

Bash 的 `((count++))` 在旧值为零时返回非零，可能触发 set -e；计数可使用 `count=$((count + 1))`。创建临时文件用 mktemp，并用 trap 清理本次创建的明确路径，不对未经校验的变量执行递归删除。

# 完整示例：生成日志统计

以下脚本只读取一个普通文本文件，把统计写到标准输出，不修改源文件。输入格式规定为“时间、级别、消息”，以空白分隔，级别在第 2 字段。

```bash title="report.sh"
#!/usr/bin/env bash
set -u
set -o pipefail

if (( $# != 1 )); then
    printf '用法：%s 日志文件\n' "$0" >&2
    exit 2
fi
input_file=$1
if [[ ! -f "$input_file" || ! -r "$input_file" ]]; then
    printf '无法读取：%s\n' "$input_file" >&2
    exit 1
fi

if awk '
    NF < 2 { invalid++; next }
    { total++ }
    $2 == "ERROR" { errors++ }
    END {
        printf "records=%d errors=%d invalid=%d\n", total, errors, invalid
        if (invalid > 0) exit 2
    }
' < "$input_file"; then
    exit 0
else
    status=$?
    printf '统计未正常完成，状态：%d\n' "$status" >&2
    exit "$status"
fi
```

在练习目录准备输入：

```text title="app.log（演示数据）"
2026-09-19T10:00:00Z INFO started
2026-09-19T10:01:00Z ERROR timeout
2026-09-19T10:02:00Z ERROR retry
```

先用 `bash -n report.sh` 检查语法，再运行 `bash report.sh app.log`。预期为 `records=3 errors=2 invalid=0`，退出状态为零。分别验证空文件、不可读路径和格式错误行，确认失败不会被误报为成功。此处命令是读者验证步骤，不代表已经在本文环境中执行。

# 配置生成、后台与定时任务

Here Document 适合多行文本；分隔符加引号时不做变量展开：

```bash title="输出字面配置"
cat <<'EOF'
message=$HOME
port=8080
EOF
```

若重定向到文件，先确认目标和覆盖策略；生成配置后先校验，再替换生效文件。Bash 的 Here String `<<<` 适合把短字符串送到标准输入，会追加换行，不是 POSIX sh 语法。

后台启动后要用 wait 收集状态，不能把成功启动等同于执行成功。定时运行可选择 cron 或 systemd timer，需定义工作目录、环境、日志、超时及防重入策略。使用 flock 时还应确认所有入口采用同一锁。

# 常见问题

| 症状 | 检查方向 |
|---|---|
| 手动正常，定时失败 | 用户、PATH、目录、凭据及交互输入 |
| 路径含空格就失败 | 引号、"$@"、数组，避免解析 ls 输出 |
| 管道失败未上报 | pipefail 和各命令退出码含义 |
| 重跑产生重复数据 | 是否检查目标状态、是否支持幂等或事务 |
| 调试日志泄露凭据 | bash -x 会展开参数，敏感部分不要跟踪 |

# 参考资料

- [Bash 手册](https://www.gnu.org/software/bash/manual/)
- [Bash 条件构造](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)
- [Bash set 内建命令](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [ShellCheck 文档](https://www.shellcheck.net/wiki/)：常见脚本缺陷及原因。
