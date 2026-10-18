# Git 上手指南（针对本仓库）

这份文档只讲这个项目里用得上的 Git 操作。照着做一遍，你就掌握了日常 90% 的用法。

---

## 0. 先认识仓库

```
neon-rift/
├─ index.html        ← 构建产物（单文件游戏，直接双击就能玩）
├─ build.mjs         ← 构建脚本
├─ src/              ← 真正的源码，按编号顺序拼接
├─ docs/             ← 文档（本文件）
├─ README.md
├─ LICENSE
└─ .gitignore
```

**改代码的流程永远是**：改 `src/` → 运行 `node build.mjs` → `index.html` 更新 → 提交。

`index.html` 也提交进仓库，是为了让没装 Node 的人 clone 下来就能玩。

---

## 1. Git 的三个区域

```
工作区（你正在改的文件）
   │  git add
   ▼
暂存区（这次准备提交的内容）
   │  git commit
   ▼
版本库（历史记录，可以回退）
```

记住一句话：**`add` 挑要提交的，`commit` 拍一张快照。**

---

## 2. 先看看现在的状态

在仓库根目录（`neon-rift`）打开 PowerShell：

```bash
git status
git log --oneline --graph --decorate -10
git remote -v
```

- `status`：哪些文件改了、哪些已暂存
- `log`：提交历史，`--graph` 看分支合并
- `remote -v`：远程仓库地址（本地还没推送时是空的）

> 小技巧：输入 `git status` 后，Git 经常直接告诉你下一步该敲什么。

---

## 3. 练习一：改一行，提交一次

### 3.1 动手改

用记事本 / VS Code 打开 `README.md`，在文件末尾新增两行：

```markdown
## 反馈

问题请开 Issue。
```

保存。

### 3.2 看 Git 发现了什么

```bash
git status
```

预期输出里会出现：

```
modified:   README.md
```

### 3.3 看具体改了什么

```bash
git diff
```

`-` 开头是删掉的，`+` 开头是新增的，`@@` 是位置。

### 3.4 暂存

```bash
git add README.md
git status
```

现在它变成了 `Changes to be committed`（绿色）。

再看一次暂存区的内容：

```bash
git diff --staged
```

### 3.5 提交

```bash
git commit -m "docs: 调整构建小节标题"
```

### 3.6 看结果

```bash
git log --oneline -3
```

这一条提交就进了历史。

### 3.7 反悔药

- 还没 `add`，想丢弃改动：`git restore README.md`
- 已经 `add`，想撤出暂存区：`git restore --staged README.md`
- 已经 `commit`，但还没推送：`git reset --soft HEAD~1`（改动会回到暂存区）

---

## 4. 练习二：开分支，调武器数值

分支 = 一条独立的改动线。改坏了随时切回主分支，不影响 `main`。

### 4.1 建分支并切过去

```bash
git switch -c balance/pulse-rate
```

`-c` 表示新建。`git branch` 可以看到当前所在分支（前面有 `*`）。

### 4.2 改数值

打开 `src/00-config.js`，找到 `WEAPONS` 里的 `pulse`，把

```js
interval: 0.105,
```

改成 `0.1`（射速略快一点）。

### 4.3 重新构建

```bash
node build.mjs
```

`index.html` 会更新。双击打开，选「脉冲」试手感。

### 4.4 提交

```bash
git status
git diff src/00-config.js
git add src/00-config.js index.html
git commit -m "balance: 脉冲射击间隔 0.105 -> 0.1"
```

> 源码和构建产物要一起提交，否则别人拉下来看到的还是旧数值。

### 4.5 合并回 main

```bash
git switch main
git merge --no-ff balance/pulse-rate
```

`--no-ff` 会强制生成一个合并提交，历史里能清楚看到「这里合并过一个分支」。

### 4.6 删掉用完的分支

```bash
git branch -d balance/pulse-rate
git log --oneline --graph -6
```

### 4.7 万一改砸了

在分支上不想留了，切回 main 直接删分支：

```bash
git switch main
git branch -D balance/pulse-rate
```

---

## 5. 练习三：推到 GitHub

### 5.1 看远程

```bash
git remote -v
```

应该能看到 `origin`。

### 5.2 推 main

```bash
git push origin main
```

第一次推送后，之后直接 `git push` 即可。

### 5.3 用分支 + PR 的方式改东西

真实项目里，`main` 一般不允许直接推，都是开分支提 PR。

```bash
git switch -c feature/score-bonus
# ...改代码、构建、提交...
git push -u origin feature/score-bonus
```

`-u` 把本地分支和远程分支绑定，以后这个分支直接 `git push`。

然后二选一：

**命令行建 PR：**

```bash
gh pr create --fill
```

`--fill` 会自动用提交信息填标题和描述。

**网页建 PR：** 推送后打开仓库页面，会看到黄色的「Compare & pull request」按钮，点它。

### 5.4 合并 PR 之后

```bash
git switch main
git pull
git branch -d feature/score-bonus
```

---

## 6. 常用命令速查

| 想做什么 | 命令 |
|---|---|
| 看状态 | `git status` |
| 看未暂存的改动 | `git diff` |
| 看已暂存的改动 | `git diff --staged` |
| 暂存某个文件 | `git add <file>` |
| 暂存所有改动 | `git add -A` |
| 提交 | `git commit -m "说明"` |
| 看历史 | `git log --oneline --graph` |
| 看某次提交改了什么 | `git show <commit>` |
| 建分支并切换 | `git switch -c <branch>` |
| 切换分支 | `git switch <branch>` |
| 合并分支 | `git merge --no-ff <branch>` |
| 拉取远程更新 | `git pull` |
| 推送 | `git push` |
| 看远程 | `git remote -v` |
| 打标签 | `git tag -a v3.0.0 -m "版本说明"` |
| 临时存一下改动 | `git stash` / `git stash pop` |

---

## 7. 冲突是怎么回事

两个人改了同一行，合并时 Git 不知道该留哪个，就会停下来问你。

文件里会出现：

```
<<<<<<< HEAD
你当前分支的内容
=======
要合并进来的内容
>>>>>>> other-branch
```

处理步骤：

1. 打开文件，保留想要的内容，删掉 `<<<<<<<`、`=======`、`>>>>>>>` 这三行
2. `git add <file>`
3. `git commit`（Git 会预填合并信息）

想放弃这次合并：`git merge --abort`

---

## 8. 提交信息约定

本项目用「类型: 描述」的格式，一行说清楚做了什么：

| 类型 | 用途 | 例子 |
|---|---|---|
| feat | 新功能 | `feat: 主界面增加关卡选择` |
| fix | 修 bug | `fix: 修复死亡后仍能加分` |
| balance | 数值调整 | `balance: 重炮伤害 3.2 -> 3.5` |
| docs | 文档 | `docs: 补充构建说明` |
| refactor | 重构 | `refactor: 拆分渲染模块` |
| chore | 杂项 | `chore: 更新 .gitignore` |

原则：**一次提交只做一件事**，标题不超过 50 字，细节写在正文（`git commit` 不加 `-m` 会打开编辑器）。

---

## 9. 这个仓库的工作流

1. 有想法 → 在 GitHub 开 Issue（或在本地记 TODO）
2. `git switch -c feature/xxx`
3. 改 `src/`，`node build.mjs`，本地试玩
4. `git add -A && git commit -m "feat: ..."`
5. `git push -u origin feature/xxx`
6. 开 PR，自己 review 一下 diff，合并
7. 回到 main：`git switch main && git pull`

---

## 10. 安全提醒

- **永远不要提交密钥**（API key、token、密码）。这个仓库用不到任何密钥。
- 不确定某个文件该不该提交时，先 `git status` 看看，再决定要不要加进 `.gitignore`。
- `git push` 之前先 `git status`，确认没有把无关文件带上去。
- 公共仓库一旦推送就很难彻底删除，敏感内容务必在第一次提交前就排除。

---

## 11. 出问题了怎么办

```bash
git status          # 90% 的问题这里会告诉你怎么修
git log --oneline   # 找到要回到的那个提交
git help <command>  # 官方帮助
```

实在乱了，先别删 `.git` 目录，把 `git status` 的输出发出来，通常都能救回来。
