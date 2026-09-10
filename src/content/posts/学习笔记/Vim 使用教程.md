---
title: Vim 使用教程
published: 2026-09-10
image: ''
tags: [Vim, 文本编辑器, Linux, 操作系统, 运维]
category: 学习笔记
---
> 本文介绍 Linux 中常用的文本编辑器 **Vim**，以服务器上的配置文件、日志和代码编辑为主要使用场景。
>
> Vim 是 **Vi 的增强版**。`vi` 最早来源于 Unix，Vim（Vi IMproved）在兼容 Vi 基本操作的基础上增加了大量功能，因此许多 Linux 系统中输入 `vi` 时，实际启动的也可能是 Vim 或其兼容版本。本文以现代 Vim 的常用操作为主。

## Vim 的基本模式

Vim 与普通文本编辑器最大的区别之一，是**同一个键在不同模式下具有完全不同的含义**。

常用模式：

```text
Normal Mode（正常模式）
    ↓
Insert Mode（插入模式）

Normal Mode
    ↓
Visual Mode（可视模式）

Normal Mode
    ↓
Command-line Mode（命令行模式）
```

其中：

```text
Normal
→ 移动光标、删除、复制、粘贴、执行命令

Insert
→ 输入文本

Visual
→ 选择文本

Command-line
→ 执行保存、退出、替换、搜索等命令
```

Vim 启动后默认处于 **Normal Mode**。

从其他模式返回 Normal Mode，最常用的方法是：

```text
Esc
```

---

## 打开文件

使用 Vim 打开文件：

```bash
vim app.conf
```

如果文件不存在，Vim 会创建一个新的编辑缓冲区，保存时才会真正写入文件。

也可以直接：

```bash
vim
```

不指定文件进入 Vim。

退出 Vim：

```text
:q
```

---

## 正常模式（Normal Mode）

Normal Mode 是 Vim 最核心的模式。

在这个模式中输入普通字母通常不是为了输入文本，而是执行编辑和移动操作。

### `i`：在光标前进入插入模式

```text
i
```

在当前光标位置**之前**进入 Insert Mode。

例如光标位于：

```text
abc|def
```

按：

```text
i
```

后输入：

```text
XYZ
```

得到：

```text
abcXYZ|def
```

---

### `I`：移动到行首的第一个非空白字符并插入

```text
I
```

`I` 会将光标移动到**当前行第一个非空白字符的位置**，然后进入 Insert Mode。

例如：

```text
    hello world
```

光标无论原来位于这一行什么位置，执行：

```text
I
```

后，插入位置位于：

```text
    |hello world
```

因此：

```text
I
→ 当前行第一个非空白字符处进入插入模式
```

它与：

```text
0i
```

并不完全相同。

`0` 会移动到行的最开头，包括缩进产生的空格。

---

### `a`：在光标后进入插入模式

```text
a
```

在当前光标位置**之后**进入 Insert Mode。

例如：

```text
abc|def
```

按：

```text
a
```

后，输入内容会插入到当前字符之后。

---

### `A`：移动到行尾并插入

```text
A
```

移动到当前行末尾，然后进入 Insert Mode。

常用于在一行末尾继续添加内容。

---

### `o`：在下一行创建新行

```text
o
```

在当前行的**下一行**创建一个新行，并进入 Insert Mode。

例如：

```text
hello
world
```

当前光标位于 `hello` 行时执行：

```text
o
```

会变成：

```text
hello
|
world
```

---

### `O`：在上一行创建新行

```text
O
```

在当前行的**上一行**创建一个新行，并进入 Insert Mode。

---

## 光标移动

### `gg`：移动到第一行

```text
gg
```

将光标移动到文件第一行。

---

### `G`：移动到最后一行

```text
G
```

将光标移动到文件最后一行。

---

### `w`：移动到下一个单词

```text
w
```

向前移动到下一个 word 的开头。

---

### `e`：移动到当前/下一个单词的结尾

```text
e
```

向前移动到一个 word 的结尾。

---

### `b`：移动到上一个单词的开头

```text
b
```

向后移动到前一个 word 的开头。

---

## 复制与粘贴

### `yy`：复制当前行

```text
yy
```

复制当前光标所在的整行。

例如：

```text
hello
world
```

光标位于 `hello` 行执行：

```text
yy
```

会将这一整行复制到 Vim 的寄存器中。

---

### `p`：在光标后粘贴

```text
p
```

将最近一次复制或删除的内容放到当前光标之后。

对于使用 `yy` 复制的整行内容，`p` 会将内容粘贴到**当前行的下一行**。

例如：

```text
hello
world
```

光标位于 `hello` 行：

```text
yy
p
```

结果：

```text
hello
hello
world
```

---

### `P`：在光标前粘贴

```text
P
```

与 `p` 相反，将内容粘贴到当前光标之前。

对于整行内容，通常表现为粘贴到当前行的上一行。

---

### `[count]p`：重复粘贴

例如：

```text
3p
```

表示执行 3 次 `p` 操作。

注意，`3p` 的含义是**重复 put 操作三次**，不能简单理解成“粘贴三行”。最终插入多少行还取决于寄存器中保存的内容。

---

## 删除

### `dd`：删除当前行

```text
dd
```

删除当前光标所在的整行。

被 `dd` 删除的内容也会进入 Vim 的寄存器，因此之后可以使用：

```text
p
```

或：

```text
P
```

重新粘贴。

---

### `dw`：删除一个 word

```text
dw
```

从当前光标位置开始，执行一次 `d` 操作，并使用 `w` 作为移动范围。

可以理解为：

```text
d + w
→ 删除光标到下一个 word 边界之间的文本
```

实际删除范围与光标所在位置、单词边界有关，因此不要简单理解成“无论光标在哪里都删除整个单词”。

---

### `cw`：修改一个 word

```text
cw
```

执行：

```text
c + w
```

其中：

```text
c = change
w = word movement
```

它会删除指定范围的文本，并立即进入 Insert Mode。

因此：

```text
cw
```

非常适合“删除当前内容并马上重新输入”。

例如：

```text
hello world
```

光标位于 `hello` 开头时执行：

```text
cw
```

输入：

```text
Linux
```

即可把原来的内容修改掉。

---

### `ci(`：修改括号内的内容

```text
ci(
```

其中：

```text
c  → change
i( → inside parentheses
```

表示修改当前括号内部的文本。

例如：

```text
hello(world)
```

光标位于括号内部时：

```text
ci(
```

会删除：

```text
world
```

并直接进入 Insert Mode。

类似操作：

```text
ci(
ci[
ci{
ci"
ci'
```

分别可以用于修改不同成对符号内部的内容。

例如：

```text
ci{
```

表示修改 `{}` 内部的内容。

---

## 撤销与重做

### `u`：撤销

```text
u
```

撤销上一次修改操作。

例如：

```text
输入内容
↓
u
↓
撤销这次修改
```

可以连续按 `u` 撤销多次修改。

---

### `Ctrl + R`：重做

```text
Ctrl + R
```

恢复之前被 `u` 撤销的修改。

可以简单理解为：

```text
u
→ undo，撤销

Ctrl + R
→ redo，重做
```

---

### `.`：重复上一次修改

```text
.
```

重复最近一次可以重复执行的修改操作。

例如：

```text
dw
```

删除一个 word 后，再移动到其他位置：

```text
.
```

可以再次执行相同的删除操作。

`.` 是 Vim 中非常重要的效率操作，尤其适合对多个位置执行相同修改。

---

## 可视模式

### `v`：字符可视模式

```text
v
```

进入 Visual Mode，并以**字符**为单位选择文本。

然后可以使用：

```text
h
j
k
l
```

或方向键移动光标扩大选择范围。

例如选中后：

```text
d
```

可以删除选中的内容。

---

### `Shift + V`：行可视模式

```text
V
```

进入 **Visual Line Mode**，以整行为单位选择。

例如：

```text
V
j
j
```

表示选择当前行以及下面两行。

选择完成后可以：

```text
d
```

删除所选行。

---

### `Ctrl + V`：块可视模式

```text
Ctrl + V
```

进入 **Visual Block Mode**。

与普通 Visual Mode 不同，它可以按照矩形区域进行选择。

例如：

```text
aaa 111
bbb 222
ccc 333
```

可以选择：

```text
111
222
333
```

对应的矩形区域。

这种模式非常适合：

```text
批量编辑列
批量删除相同位置字符
批量添加文本
```

---

### `d`：删除选中内容

在 Visual Mode 中：

```text
d
```

删除当前选中的文本。

例如：

```text
v
```

选择文本后：

```text
d
```

即可删除选择内容。

---

## 插入模式（Insert Mode）

进入方式：

```text
i
a
I
A
o
O
```

进入 Insert Mode 后，就可以像普通文本编辑器一样输入文字。

例如：

```text
i
```

进入后输入：

```text
Hello Linux
```

即可正常编辑文本。

退出 Insert Mode：

```text
Esc
```

返回 Normal Mode。

需要养成一个非常重要的习惯：

```text
需要移动、删除、复制
→ 先 Esc 回 Normal Mode

需要输入文字
→ 再进入 Insert Mode
```

---

## 命令行模式（Command-line Mode）

在 Normal Mode 下按：

```text
:
```

进入 Command-line Mode。

底部会出现：

```text
:
```

然后可以输入命令。

### `:w`：保存

```text
:w
```

将当前缓冲区内容写入文件。

---

### `:q`：退出

```text
:q
```

退出 Vim。

如果文件有未保存的修改：

```text
E37: No write since last change
```

Vim 会拒绝直接退出。

---

### `:q!`：不保存退出

```text
:q!
```

放弃当前未保存的修改并退出。

---

### `:wq`：保存并退出

```text
:wq
```

先保存，再退出。

也可以：

```text
ZZ
```

在 Normal Mode 下直接保存并退出。

`ZZ` 与 `:wq` 在常见场景下效果相近，但并非所有边界行为都完全等价。

---

### `:w` + `:q`

也可以分两步：

```text
:w
:q
```

先保存，再退出。

---

## 文本搜索

在 Normal Mode 下按：

```text
/
```

然后输入搜索内容：

```text
/error
```

按：

```text
Enter
```

开始搜索。

例如：

```text
/error
```

表示搜索：

```text
error
```

---

### `n`：下一个匹配项

搜索完成后：

```text
n
```

移动到下一个匹配位置。

---

### `N`：上一个匹配项

```text
N
```

移动到上一个匹配位置。

因此：

```text
n
→ 下一个匹配

N
→ 上一个匹配
```

---

### 搜索与命令行模式的关系

严格来说：

```text
/
```

并不是一个独立于 Command-line Mode 的 Vim 模式。

它会进入一种以搜索命令为输入的**命令行状态**。

因此可以理解为：

```text
:
→ 输入 Ex 命令

/
→ 输入正向搜索模式

?
→ 输入反向搜索模式
```

搜索完成后按：

```text
Enter
```

即可执行搜索，再按：

```text
Esc
```

可以取消当前搜索输入。

---

## 查找并替换

### `:%s/旧文本/新文本/g`

例如：

```text
:%s/foo/bar/g
```

表示将当前文件中所有行里的：

```text
foo
```

替换为：

```text
bar
```

其中：

```text
:
→ 进入 Command-line Mode

%
→ 当前整个文件

s
→ substitute，替换

foo
→ 要查找的内容

bar
→ 替换后的内容

g
→ 每一行中进行全部匹配，而不是只替换该行第一个匹配
```

因此：

```text
:%s/foo/bar/g
```

可以理解为：

```text
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

```text
:s/foo/bar/g
```

不写 `%` 时，默认作用范围为当前行。

---

### 只替换指定行

例如：

```text
:10,20s/foo/bar/g
```

表示只处理：

```text
第 10 行 ～ 第 20 行
```

---

## Vim 中常见的编辑组合

Vim 很多命令实际上由：

```text
操作符 + 移动命令
```

组合而成。

例如：

```text
dw
```

可以理解为：

```text
d + w
```

即：

```text
删除 + 移动到下一个 word
```

再例如：

```text
cw
```

即：

```text
修改 + 移动到下一个 word
```

类似地：

```text
yw
```

表示：

```text
复制 + word 移动范围
```

因此：

```text
d + movement
c + movement
y + movement
```

构成了 Vim 非常重要的一套操作方式。

---

## 常用操作示例

### 修改一个单词

```text
cw
```

输入新内容：

```text
Esc
```

---

### 删除一整行

```text
dd
```

---

### 复制一整行

```text
yy
```

---

### 粘贴复制内容

```text
p
```

---

### 删除括号内部内容

```text
ci(
```

---

### 删除选中的内容

```text
v
```

选择文本后：

```text
d
```

---

### 搜索错误日志

```text
/error
```

然后：

```text
n
```

不断跳转到下一个匹配项。

---

### 将整个文件中的字符串替换

```text
:%s/old/new/g
```

---

### 强制退出而不保存

```text
:q!
```

---

## Vim 基础操作流程

实际编辑服务器上的配置文件时，可以按照下面的流程：

```text
vim app.conf
     ↓
进入 Normal Mode
     ↓
使用移动命令找到目标位置
     ↓
i / a / o 等进入 Insert Mode
     ↓
修改文本
     ↓
Esc
     ↓
回到 Normal Mode
     ↓
:wq
     ↓
保存并退出
```

如果只是查看文件：

```text
vim app.conf
     ↓
搜索 /error
     ↓
n / N
     ↓
:q
```

如果需要放弃修改：

```text
:q!
```

---

## Vim 最需要掌握的思维方式

Vim 不应该只记成一堆快捷键，而应该理解为：

```text
模式
+
操作符
+
移动
+
范围
```

例如：

```text
dw
```

表示：

```text
d → 删除
w → 移动一个 word
```

```text
cw
```

表示：

```text
c → 修改
w → 一个 word 的移动范围
```

```text
ci(
```

表示：

```text
c
+
i(
→ 修改括号内部内容
```

而：

```text
dd
yy
```

则属于常用的整行操作：

```text
dd → 删除当前行
yy → 复制当前行
```

掌握这种组合方式后，Vim 中大量命令实际上可以通过规律推导出来，而不是全部依靠死记硬背。
