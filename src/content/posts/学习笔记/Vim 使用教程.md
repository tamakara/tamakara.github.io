---
title: Vim 使用教程
published: 2026-09-10
image: ''
tags: [Vim, 文本编辑器, Linux, 操作系统, 运维]
category: 学习笔记
---

> 本文介绍 Linux 中常用的文本编辑器 **Vim**，以服务器上的配置文件、日志和代码编辑为主要使用场景。
>
> Vim 是 **Vi 的增强版**。`vi` 是 Unix 早期的经典文本编辑器，而 Vim（Vi IMproved）在兼容 Vi 基本操作的基础上增加了大量功能。Vim 官方文档也专门提供了 [Vi 与 Vim 的差异说明](https://vimhelp.org/vi_diff.txt.html)。

## Vim 的基本模式

Vim 与普通文本编辑器最大的区别之一，是**同一个按键在不同模式下具有不同含义**。

常用模式包括：

```text id="4y5f0x"
Normal Mode（正常模式）
Insert Mode（插入模式）
Visual Mode（可视模式）
Command-line Mode（命令行模式）
```

可以简单理解为：

```text id="2ldm77"
Normal
→ 移动、删除、复制、粘贴、执行操作

Insert
→ 输入文字

Visual
→ 选择文字

Command-line
→ 保存、退出、替换以及执行 Ex 命令
```

Vim 启动后默认进入 **Normal Mode**。

从其他模式返回 Normal Mode，通常使用：

```text id="w7j1x3"
Esc
```

Vim 官方帮助可以在 Vim 内直接通过：

```text id="6ao8hv"
:help
```

打开，也可以使用：

```text id="ne6o3o"
:help insert.txt
:help change.txt
:help visual.txt
:help editing.txt
```

分别查看插入、文本修改、Visual Mode、文件编辑等相关文档。

---

## 打开文件

使用 Vim 打开文件：

```bash id="xq0c0t"
vim app.conf
```

Vim 会将文件内容读入编辑缓冲区。

编辑过程中修改的是：

```text id="i6f4e7"
Vim 缓冲区
```

执行保存后，修改内容才会写入磁盘文件。

因此可以理解为：

```text id="4rrp2o"
文件
 ↓
读取
 ↓
Vim Buffer
 ↓
编辑
 ↓
:w
 ↓
写回文件
```

Vim 官方文档对这一过程有明确说明：编辑文件本质上是“读取文件到 buffer → 修改 buffer → 将 buffer 写回文件”。

---

## 正常模式（Normal Mode）

Normal Mode 是 Vim 最核心的模式。

这个模式下，普通字母通常不是用于输入文字，而是执行移动、删除、复制等操作。

### `i`：在光标前进入插入模式

```text id="qj8hsr"
i
```

在当前光标位置之前进入 Insert Mode。

Vim 官方文档：[Insert mode commands](https://vimhelp.org/insert.txt.html) 对 `i`、`a`、`I`、`A`、`o`、`O` 的行为都有明确说明。

---

### `I`：在第一个非空白字符前插入

```text id="8sq1c5"
I
```

将光标移动到当前行的**第一个非空白字符**处，然后进入 Insert Mode。

例如：

```text id="1vl6ak"
    hello world
```

执行：

```text id="ymn4qy"
I
```

插入位置为：

```text id="w7q9qb"
    |hello world
```

因此不要简单记成：

```text id="9qys9q"
I → 行首
```

更准确的是：

```text id="6npn7f"
I → 当前行第一个非空白字符处
```

---

### `a`：在光标后进入插入模式

```text id="9i8o5u"
a
```

在当前光标位置之后进入 Insert Mode。

---

### `A`：移动到行尾并进入插入模式

```text id="b7v0c4"
A
```

移动到当前行末尾，然后进入 Insert Mode。

---

### `o`：在下一行创建新行

```text id="0h7k2w"
o
```

在当前行下方创建新行，并进入 Insert Mode。

---

### `O`：在上一行创建新行

```text id="kspq3h"
O
```

在当前行上方创建新行，并进入 Insert Mode。

---

## 光标移动

### `gg`：移动到第一行

```text id="7v0y9u"
gg
```

将光标移动到文件第一行。

### `G`：移动到最后一行

```text id="0ulc7d"
G
```

默认将光标移动到最后一行。

也可以指定行号：

```text id="2yrjkp"
10G
```

表示跳转到第 10 行。

Vim 官方的快速参考中对 `gg` 和 `G` 都有明确说明。

---

### `w`：移动到下一个单词

```text id="2fs1c5"
w
```

向前移动到下一个 word 的开头。

---

### `e`：移动到单词结尾

```text id="qvkl32"
e
```

向前移动到当前或下一个 word 的结尾。

---

### `b`：移动到上一个单词开头

```text id="3q7n8e"
b
```

向后移动到前一个 word 的开头。

需要注意，Vim 中的 `word` 有明确的边界定义，并不简单等同于“自然语言中的一个单词”。官方快速参考也将 `w`、`e`、`b` 归类为 **text object motions**。

---

## 复制与粘贴

### `yy`：复制当前行

```text id="b8c7l5"
yy
```

复制当前光标所在的整行。

`yy` 是一种典型的“操作符/动作”组合，可以理解为：

```text id="v6khts"
y
+
y
```

其中 `y` 表示 yank（复制）。

---

### `p`：粘贴

```text id="zq8p7l"
p
```

将最近一次复制或删除的内容放置到当前光标之后。

如果寄存器中的内容是通过 `yy` 复制的一整行，那么 `p` 会将这一行粘贴到**当前行之后**。

---

### `P`：在光标前粘贴

```text id="w5j9xe"
P
```

与 `p` 相反，在当前光标之前进行粘贴。

对于整行文本，通常表现为粘贴到当前行之前。

---

### `[count]p`：重复粘贴

例如：

```text id="y5c4fm"
3p
```

表示重复执行 `p` 三次。

不能简单理解成“固定粘贴三行”，实际结果取决于寄存器中保存的是字符、单词还是整行内容。

---

## 删除与修改

### `dd`：删除当前行

```text id="l6d1s8"
dd
```

删除当前光标所在的整行。

被删除的内容也会进入寄存器，因此可以使用：

```text id="f4o6zq"
p
```

重新粘贴。

---

### `dw`：删除一个移动范围

```text id="v4m0s6"
dw
```

可以理解为：

```text id="j29bl5"
d + w
```

其中：

```text id="f9x8r6"
d → delete
w → 移动到下一个 word
```

Vim 中很多编辑操作都采用这种：

```text id="7hmx0d"
操作符 + Motion
```

的组合方式。

---

### `cw`：修改一个 word

```text id="jxj42m"
cw
```

可以理解为：

```text id="9qvhmr"
c + w
```

其中：

```text id="qz78b5"
c → change
w → word movement
```

执行后会删除对应范围，并进入 Insert Mode。

一个容易踩坑的地方是：Vim 中 `cw` 的行为与单纯理解“`c` + `w`”并不完全一致。官方文档明确指出，`cw` 实际上按 `ce` 的方式工作，这是 Vi 历史遗留下来的特殊行为。

---

### `ci(`：修改括号内部内容

```text id="7g2qj4"
ci(
```

这里：

```text id="fqhqj7"
c  → change
i( → inside parentheses
```

表示修改当前括号内部的内容。

例如：

```text id="m4k2mx"
hello(world)
```

光标位于括号内部时执行：

```text id="b9x1ot"
ci(
```

会删除：

```text id="xw1fck"
world
```

并直接进入 Insert Mode。

类似操作：

```text id="sosx8b"
ci(
ci[
ci{
ci"
ci'
```

可分别作用于不同类型的成对符号。

Vim 官方文档中将这种 `i` / `a` 与成对结构结合的操作归类为 **text objects**。可以在 Vim 中通过：

```text id="ny0nq8"
:help text-objects
```

查看完整说明。

---

## 撤销与重做

### `u`：撤销

```text id="ebl85m"
u
```

撤销最近一次修改。

可以连续执行：

```text id="ju6ypv"
u
u
u
```

进行多次撤销。

---

### `Ctrl + R`：重做

```text id="o5b6cg"
Ctrl + R
```

恢复之前通过 `u` 撤销的修改。

因此：

```text id="x3sn3a"
u
→ undo

Ctrl + R
→ redo
```

Vim 官方将这些操作统一归在 [Undo and Redo](https://vimhelp.org/undo.txt.html) 文档中。

---

### `.`：重复上一次修改

```text id="0x8vul"
.
```

重复最近一次**可重复的编辑操作**。

例如：

```text id="c8w1vw"
dw
```

删除一个范围后：

```text id="1sgn4p"
.
```

可以在另一个位置再次执行相同的修改。

`.` 是 Vim 非常重要的效率特性。官方文档将其归类为 **repeating commands**。

---

## 可视模式（Visual Mode）

Visual Mode 用于选择文本，然后对选中的区域执行删除、复制、修改等操作。

Vim 官方文档对 Visual Mode 有非常完整的说明：[Visual mode](https://vimhelp.org/visual.txt.html)。

### `v`：字符可视模式

```text id="4k8l7u"
v
```

进入 Characterwise Visual Mode，以字符为单位选择文本。

然后移动光标即可扩大选区。

例如：

```text id="k3t2b1"
v
llll
```

选择对应范围后，可以执行：

```text id="p7os6b"
d
```

删除选中内容。

---

### `V`：行可视模式

```text id="0h3p1a"
V
```

进入 Linewise Visual Mode，以整行为单位选择。

例如：

```text id="p9e1v1"
V
j
j
```

可以选择当前行以及下面两行。

---

### `Ctrl + V`：块可视模式

```text id="5w3g6v"
Ctrl + V
```

进入 Blockwise Visual Mode，以**矩形区域**进行选择。

例如：

```text id="25gk54"
aaa 111
bbb 222
ccc 333
```

可以选择：

```text id="3u8kqx"
111
222
333
```

所在的矩形区域。

块可视模式非常适合：

```text id="r42k0c"
批量编辑列
批量删除某一列
批量插入文本
```

Vim 官方文档明确将 `v`、`V`、`Ctrl-V` 分别定义为字符、行、块三种 Visual Mode。

> 在 Windows 某些终端环境中，`Ctrl + V` 可能被终端或其他程序映射为粘贴操作，此时可能需要使用 Vim 文档中介绍的替代方式。

---

### `d`：删除选中的内容

在 Visual Mode 中：

```text id="3pmppn"
d
```

删除当前选区。

同样可以使用：

```text id="xc5pj5"
y
```

复制选区。

---

## 插入模式（Insert Mode）

Insert Mode 用于直接输入文本。

常见进入方式：

```text id="9h7n99"
i
a
I
A
o
O
```

进入后即可直接输入文本。

退出：

```text id="4gugp9"
Esc
```

返回 Normal Mode。

可以形成一个很重要的使用习惯：

```text id="krm3y0"
需要移动 / 删除 / 复制
        ↓
回到 Normal Mode

需要输入文字
        ↓
进入 Insert Mode
```

---

## 命令行模式（Command-line Mode）

在 Normal Mode 下按：

```text id="x8d02f"
:
```

进入 Command-line Mode。

例如：

```text id="n5iqdw"
:w
```

可以执行文件保存。

Vim 官方将这一类功能归入 `editing.txt` 等帮助文档。

### `:w`：保存文件

```text id="g4t2qb"
:w
```

将当前 buffer 写入文件。

如果文件是只读的，或者由于其他原因无法写入，命令会失败；是否可以使用 `:w!` 强制写入还取决于具体情况。官方文档对 `:write` 的行为有详细说明。

---

### `:q`：退出

```text id="xn6p7k"
:q
```

退出当前窗口。

如果当前 buffer 存在未保存修改，Vim 默认不会直接退出，而会提示先保存。

---

### `:q!`：放弃修改并退出

```text id="a3dd9u"
:q!
```

放弃当前未保存的修改并退出。

这里的 `!` 表示强制执行，不再因为当前修改而阻止退出。

---

### `:wq`：保存并退出

```text id="m27o9v"
:wq
```

先保存当前文件，再关闭当前窗口。

如果这是最后一个编辑窗口，则 Vim 退出。

---

### `ZZ`：保存并退出

```text id="xgt4ji"
ZZ
```

`ZZ` 必须在 Normal Mode 下执行。

如果当前文件已经被修改，它会保存文件并关闭当前窗口；如果没有修改，则直接关闭当前窗口。

官方文档将 `ZZ` 与 `:x` 归为同一类“写入并退出”操作。

---

### `ZQ`：不保存退出

```text id="r7o74e"
ZQ
```

在 Normal Mode 下执行，相当于：

```text id="j5m3oi"
:q!
```

---

## 搜索文本

在 Normal Mode 下输入：

```text id="n8zqpd"
/
```

进入搜索输入状态。

例如：

```text id="jz1q4t"
/error
```

按：

```text id="8afk6j"
Enter
```

开始搜索 `error`。

Vim 的 `/` 搜索支持正则表达式模式，相关内容可参考官方 [Pattern and Search Commands](https://vimhelp.org/pattern.txt.html)。

---

### `n`：下一个匹配

```text id="as2z7v"
n
```

跳转到下一个匹配结果。

---

### `N`：上一个匹配

```text id="7c9y8m"
N
```

跳转到上一个匹配结果。

Vim 会记住最近使用的搜索模式，因此：

```text id="v5e0lm"
/error
Enter
n
n
n
```

可以连续跳转到后面的匹配项。

官方文档明确说明 Vim 会保存最近使用的搜索模式，并由 `n` / `N` 重复搜索。

---

## 查找与替换

### `:%s/旧文本/新文本/g`

例如：

```text id="s41z1i"
:%s/foo/bar/g
```

表示将整个文件中的：

```text id="7c4k5r"
foo
```

替换为：

```text id="2qak1j"
bar
```

这里：

```text id="a4m8s1"
:
→ 进入 Command-line Mode

%
→ 当前整个文件

s
→ substitute，替换

foo
→ 查找文本

bar
→ 替换文本

g
→ 每一行进行全部匹配替换
```

因此：

```text id="8y7l4b"
:%s/foo/bar/g
```

可以理解为：

```text id="i4q5a9"
整个文件
+
查找 foo
+
替换为 bar
+
每行全部替换
```

---

### 只替换当前行

```text id="r4n7h0"
:s/foo/bar/g
```

不指定范围时，默认作用于当前行。

---

### 替换指定行

```text id="k5v5uz"
:10,20s/foo/bar/g
```

表示只处理：

```text id="rwy4w5"
第 10 行到第 20 行
```

关于 `:substitute` 的完整语法，可以在 Vim 中查看：

```text id="x8vzgd"
:help :substitute
```

也可以参考官方的 [Pattern and Search Commands](https://vimhelp.org/pattern.txt.html)。

---

## Vim 中的“操作符 + 移动”

Vim 很多操作并不是一个按键完成，而是由：

```text id="2bw0le"
Operator + Motion
```

组成。

例如：

```text id="0pj6si"
dw
```

可以拆成：

```text id="7ni09f"
d → delete
w → word movement
```

表示删除由 `w` 所定义的移动范围。

---

### `yw`：复制一个移动范围

```text id="88a0a5"
yw
```

拆分：

```text id="9z6c0g"
y → yank
w → movement
```

表示复制当前光标到 `w` 所定义范围的内容。

---

### `cw`：修改一个移动范围

```text id="0ay1e9"
cw
```

拆分：

```text id="2gc0mt"
c → change
w → movement
```

执行后进入 Insert Mode。

不过如前面所述，Vim 对 `cw` 有历史兼容行为，官方文档明确说明它实际表现为 `ce`。

---

### `ci(`：结合 Text Object

```text id="t2u45x"
ci(
```

可以理解成：

```text id="3xfqpi"
c
+
i(
```

即：

```text id="vqpw9r"
修改
+
括号内部
```

这也是 Vim “操作符 + Text Object” 思维的典型例子。

---

## 常用操作示例

### 修改一个单词

```text id="e8d9x8"
cw
```

输入新的内容后：

```text id="k5pi5a"
Esc
```

---

### 删除一整行

```text id="9m19q8"
dd
```

---

### 复制一整行

```text id="wmq4t3"
yy
```

---

### 粘贴一整行

```text id="v7o3jv"
p
```

---

### 删除括号里的内容

```text id="xyq3p9"
ci(
```

---

### 选择后删除

```text id="yv6r6m"
v
```

移动光标选择文本后：

```text id="j6n5ak"
d
```

---

### 搜索错误日志

```text id="8qv5ng"
/error
```

然后：

```text id="6b6v4j"
n
```

不断跳转到下一个匹配项。

---

### 全文件字符串替换

```text id="2uy22k"
:%s/old/new/g
```

---

### 保存并退出

```text id="8y2wsa"
:wq
```

---

### 放弃修改并退出

```text id="q7c3ls"
:q!
```

---

## Vim 基础操作流程

编辑服务器配置文件时，可以按照下面的流程：

```text id="g60rzq"
vim app.conf
      ↓
Normal Mode
      ↓
移动光标
      ↓
i / a / o 等
      ↓
Insert Mode
      ↓
输入 / 修改文本
      ↓
Esc
      ↓
Normal Mode
      ↓
:wq
      ↓
保存并退出
```

如果只是查看和搜索：

```text id="9w4d8p"
vim app.conf
      ↓
/error
      ↓
n / N
      ↓
:q
```

如果修改后决定放弃：

```text id="y4gp8e"
:q!
```

---

## 推荐记忆方式

Vim 不建议完全按照“快捷键表”死记。

更重要的是理解：

```text id="k5om5a"
模式
+
操作符
+
移动
+
范围
```

例如：

```text id="0r7q7i"
dw
```

表示：

```text id="e7sj8b"
删除
+
word 移动范围
```

```text id="6k0ynm"
cw
```

表示：

```text id="47n0dp"
修改
+
word 移动范围
```

```text id="j92hsy"
ci(
```

表示：

```text id="h4jy1x"
修改
+
括号内部
```

而：

```text id="l5pvmb"
dd
yy
```

则是常见的整行操作：

```text id="lt56m4"
dd → 删除当前行
yy → 复制当前行
```

这种方式比单纯背诵大量快捷键更容易建立 Vim 的操作体系。

Vim 官方文档本身也是按照这种思路组织的：移动命令、操作符、文本对象、Visual Mode、重复操作等功能分别有独立的帮助章节，可以通过 `:help` 在 Vim 内部继续深入学习。
