---
title: Linux：终端与 Shell
published: 2026-09-13T02:05:45Z
description: '终端提供文本交互界面，Shell 解释命令，程序执行具体操作。'
updated: 2026-09-19
image: ''
tags: [Linux, Shell, Bash, 终端, 作业控制]
category: 学习笔记
draft: false
lang: ''
---

终端提供文本交互界面，Shell 解释命令，程序执行具体操作。本文以 Linux 上的 Bash 为例，说明命令解析、环境配置、输入输出与作业控制；其他 Shell 的语法和启动文件可能不同。

# 终端与命令解释器

| 对象 | 职责 | 常见实例 |
|---|---|---|
| 终端模拟器 | 显示输出、接收输入，通过伪终端连接程序 | GNOME Terminal、Windows Terminal |
| Shell | 解释命令语言，处理展开、重定向和作业 | Bash、Zsh、Fish |
| 命令 | 执行具体操作，可以是内建功能或外部程序 | cd、ls、grep |

TTY 是终端设备接口的通称，桌面终端和 SSH 交互会话通常使用 PTY（伪终端）。Bash 是 Shell 的一种实现，不是终端本身。

```text
终端模拟器 ←→ PTY ←→ Bash → 内建命令或外部程序
```

用 `tty` 查看终端设备；无控制终端的任务可能显示“not a tty”。`$SHELL` 通常记录登录 Shell，不能据此确定当前解释器；在 Bash 中可用 `printf '%s\n' "$BASH_VERSION"` 查看版本。

# 命令解析与查找

## 参数、引号与展开

在 `ls -l /var/log` 中，Shell 组织参数，`-l` 的含义由 `ls` 解释。执行前，Shell 还会处理变量、命令替换和路径名展开。

| 写法 | 含义 | 使用场景 |
|---|---|---|
| `'$HOME'` | 字面文本 | 固定字符串、正则表达式 |
| `"$HOME"` | 展开变量并保持为一个参数 | 路径和变量 |
| `$value` | 展开后可能继续分词和匹配路径 | 不用于不受控文本 |
| `*.log` | 匹配当前目录路径 | 与正则表达式区分 |
| `"$(date +%F)"` | 用命令标准输出替换，去掉末尾换行 | 获取短文本结果 |

```bash title="让含空格的路径保持为一个参数"
report_name='daily report.txt'
printf '%s\n' "$report_name"
```

默认 Bash 中，通配符无匹配时通常保留原样；不要假设它会自动生成空列表。命令替换不适合存放二进制数据。

## 内建命令与 PATH

`cd`、`export`、`jobs` 操作当前 Shell 的状态，属于内建命令；外部程序在自己的进程中运行，不能直接改变父 Shell 的工作目录和变量。

```bash title="检查命令来源"
type -a ls
type cd
command -v bash
printf '%s\n' "$PATH"
```

`type -a` 能识别别名、函数、内建命令和程序。外部程序按 `PATH` 中以冒号分隔的目录搜索，顺序影响结果；含斜杠的命令，例如 `./tool`，按指定路径执行。

:::tip[命令版本与预期不符]
先查 `type -a` 和 `PATH`，再查版本。程序移动后可用 `hash -r` 清除 Bash 缓存的路径。不要把当前目录或其他用户可写目录放在管理员搜索路径前面。
:::

# 变量与启动环境

## 变量的作用范围

赋值写作 `name=value`，等号两边不加空格。普通变量属于当前 Shell，`export` 后才会进入之后启动的子进程环境。子进程修改自己的变量，不会反向更新父进程。

```bash title="检查变量是否被继承"
demo_message=hello
bash -c 'printf "%s\n" "${demo_message-未设置}"'
export demo_message
bash -c 'printf "%s\n" "$demo_message"'
unset demo_message
```

两次输出预期分别为“未设置”和“hello”。`LANG=C command` 可仅为一次命令设置环境。不要用系统变量保存无关的临时值。

| 变量 | 用途 |
|---|---|
| HOME | 用户家目录 |
| PWD、OLDPWD | 当前及上次工作目录 |
| PATH | 可执行程序搜索路径 |
| LANG、LC_* | 语言、排序、时间等区域设置 |
| SHELL | 通常为登录 Shell 路径 |

## 交互式与登录 Shell

“是否交互”和“是否登录”是两个维度。终端窗口通常启动交互式非登录 Shell，SSH 登录通常启动登录 Shell，`bash script.sh` 通常是非交互式 Shell。

| Bash 启动方式 | 主要启动文件 |
|---|---|
| 登录 Shell | /etc/profile，然后读取 ~/.bash_profile、~/.bash_login、~/.profile 中第一个存在且可读的文件 |
| 交互式非登录 Shell | ~/.bashrc，发行版可能另有系统级文件 |
| 普通非交互式 Bash | 按规则使用 BASH_ENV，不应假设读取 ~/.bashrc |

登录配置常主动加载 `~/.bashrc`，但这不是所有环境的固定关系。以 `sh` 启动和远程命令还有特殊规则，见 [Bash 启动文件](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)。

别名适合放在交互配置中；服务和定时任务应显式设置环境及工作目录。修改配置后先检查语法，再开新终端验证；`source` 会立即执行文件内容，不只是刷新设置。

# 输入输出与命令组合

## 文件描述符与重定向

程序通常通过文件描述符 0 读取标准输入，通过 1 写标准输出，通过 2 写标准错误。它们可以连接终端、文件或管道。

| 写法 | 作用 |
|---|---|
| `command < input.txt` | 从文件读取输入 |
| `command > output.txt` | 创建或截断输出文件 |
| `command >> output.txt` | 追加标准输出 |
| `command 2> error.txt` | 单独保存标准错误 |
| `command > all.txt 2>&1` | 将两种输出写入同一文件 |

重定向从左向右处理。`2>&1` 复制标准输出当时的去向，所以 `command 2>&1 > output.txt` 不会把两者都写入文件。

:::warning[重定向可能先清空文件]
不要写 `sort data.txt > data.txt`，应写入独立临时文件，核对后再替换。重定向由当前 Shell 执行，仅给命令加 sudo 不会自动提升重定向权限。
:::

## 管道、条件执行与退出状态

`a | b` 将 a 的标准输出接到 b 的标准输入，标准错误默认不进入管道。Bash 默认用最后一个命令的状态作为管道状态；启用 `set -o pipefail` 后，有失败时返回最右侧非零状态。

`$?` 表示刚执行完成的命令或管道状态，应立即读取。零通常代表成功，但非零要结合工具判断，例如 grep 返回 1 表示没有匹配。

| 组合 | 条件 |
|---|---|
| `a && b` | a 返回零才执行 b |
| `a || b` | a 返回非零才执行 b |
| `a; b` | 无论 a 成功与否都继续执行 b |

## 示例：统计记录并核对

以下示例在临时目录生成演示数据，统计包含固定字符串 ERROR 的行数，不是单词出现次数。

```bash title="生成数据、统计和核对"
demo_dir=$(mktemp -d)
printf '%s\n' 'INFO started' 'ERROR timeout' 'ERROR retry failed' > "$demo_dir/app.log"
grep -F 'ERROR' "$demo_dir/app.log" | wc -l > "$demo_dir/error-count.txt"
cat "$demo_dir/error-count.txt"
grep -nF 'ERROR' "$demo_dir/app.log"
```

预期计数为 2，最后一条命令列出第 2、3 行作为依据。实际日志应先确认可读，避免把读取失败误判为零条错误。

# 作业与终端操作

## 前台、后台与暂停

作业是当前 Shell 管理的任务，一个管道可能包含多个进程。作业号只在当前 Shell 有意义，PID 则标识系统中的进程。

```bash title="在交互式 Bash 中查看作业"
sleep 120 &
jobs -l
```

根据实际编号用 `fg %1` 调回前台，按 `Ctrl+Z` 暂停后可用 `bg %1` 在后台继续。用 `jobs -l` 区分 Running、Stopped、Done，不要把暂停当作结束。

`&` 只表示 Shell 不等待，不保证断开连接后继续运行。需要保持交互会话时可使用 tmux，长期服务交给服务管理器。后台任务读取终端时也可能被暂停。

## 常用按键

下表以 Bash 默认 Readline Emacs 模式为准；终端或用户配置可能改变映射。

| 按键 | 作用 |
|---|---|
| Ctrl+C | 通常向前台进程组发送 SIGINT |
| Ctrl+Z | 通常发送 SIGTSTP，暂停前台任务 |
| Ctrl+D | 空输入处表示 EOF，Shell 可能因此退出 |
| Ctrl+A / Ctrl+E | 到命令行开头 / 末尾 |
| Ctrl+U / Ctrl+K | 删除光标前 / 后的文本 |
| Ctrl+W | 删除光标前的一个词 |
| Ctrl+R | 搜索历史，执行前核对完整命令 |
| Ctrl+L | 重绘显示，不删除历史 |
| Tab | 补全命令或路径 |

终端规范模式下，Ctrl+D 前已有待输入字符时，先把这些字符交给程序，未必立即产生 EOF。它不是终止进程的信号。

# 常见问题

| 症状 | 检查与下一步 |
|---|---|
| command not found | 检查拼写、安装状态、type -a 与 PATH |
| 文件存在却不能执行 | 检查权限、解释器路径、换行格式和挂载选项 |
| 手动正常，自动任务失败 | 对照解释器、工作目录、环境及用户权限 |
| 输出文件为空 | 独立运行上游命令，检查输入权限和退出状态 |
| 输入无响应 | 检查前台程序；若误触 Ctrl+S 且启用流控，用 Ctrl+Q 恢复 |
| 子程序读不到变量 | 确认变量在启动子程序之前已 export |

# 参考资料

- [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/)：展开、环境和作业控制。
- [Bash Redirections](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)：重定向规则。
- [Bash Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)：管道退出状态。
- [Readline](https://www.gnu.org/software/bash/manual/html_node/Readline.html)：命令行编辑。
