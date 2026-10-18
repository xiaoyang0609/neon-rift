# 项目说明

## 项目是什么

NEON RIFT（霓虹裂隙）——单文件 Canvas 2D 街机射击游戏。浏览器直接打开 `index.html` 就能玩，不需要服务器、不需要联网、不需要安装依赖。

## 技术栈

- 原生 JavaScript（ES5 风格）+ Canvas 2D + WebAudio 合成音效
- 无第三方运行时依赖
- 源码在 `src/`，由 `build.mjs` 按文件名数字顺序拼接成 `index.html`
- Node.js 只用于构建和测试（>= 18）

## 当前阶段（v3）

- 做：3 个关卡（4 / 6 / 8 波 + 各 1 个 Boss）、4 种射击模式、精英词缀、Boss 二阶段、触屏摇杆、设置面板、键位重绑定
- 不做：联机、账号系统、服务端排行榜、移动端原生打包

## 硬性规则（必须遵守）

1. 每次改动必须创建一次 git commit，信息使用 `feat: / fix: / balance: / docs: / chore: / refactor:` 前缀。
2. 每次改动必须运行 `node build.mjs`，再运行 `node test/smoke.mjs`，全部通过才算完成。
3. 源码和构建产物 `index.html` 必须一起提交。
4. 遇到不确定的需求，先提问，不要自行假设。

## 常用命令

- 构建：`node build.mjs`
- 冒烟测试：`node test/smoke.mjs`
- 本地试玩：双击 `index.html`

## 目录

```
index.html        构建产物（提交进仓库）
build.mjs         构建脚本
src/              源码，按编号顺序拼接
test/smoke.mjs    无浏览器冒烟测试（vm + Canvas 桩）
docs/             文档
```
