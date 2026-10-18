# NEON RIFT · 霓虹裂隙

[![CI](https://github.com/xiaoyang0609/neon-rift/actions/workflows/ci.yml/badge.svg)](https://github.com/xiaoyang0609/neon-rift/actions/workflows/ci.yml)

**在线试玩：<https://xiaoyang0609.github.io/neon-rift/>**

单文件 Canvas 2D 街机射击小游戏。产物是仓库根目录的 `index.html`，双击即可玩，不依赖网络、不依赖任何第三方库。

## 玩法结构

主界面先选 **关卡** 和 **射击模式**，再点「开始任务」。战役关卡按数字顺序排列，**通关上一关才会解锁下一关**：

| # | 关卡 | 波次 | Boss | 奖励 |
|---|---|---|---|---|
| 01 | 边境 OUTER RIM | 3 波 + Boss | DREADNOUGHT | 30 结晶 |
| 02 | 深空 DEEP FIELD | 4 波 + Boss | SENTINEL | 45 结晶 |
| 03 | 裂隙核心 RIFT CORE | 5 波 + Boss | RIFT CORE | 65 结晶 |
| 04 | 熔火要塞 EMBER FORT | 6 波 + Boss | WARFORGE | 90 结晶 |
| 05 | 静默星云 SILENT NEBULA | 7 波 + Boss | VOID EYE | 120 结晶 |
| 06 | 终焉之环 FINAL RING | 8 波 + Boss | OMEGA | 160 结晶 |
| ∞ | 无尽 ENDLESS | 无限 | 每 5 波 RIFT CORE | 不计奖励 |

每关的敌人血量、速度、数量、伤害和 Boss 血量都按关卡系数逐级放大；Boss 半血进入 ENRAGED 二阶段。通关后可按 `N` 直接进下一关。

## 结晶与强化

- 通关获得 **结晶**：首通给「关卡奖励 + 20」，重复通关给 30%
- 主界面右上角的 **✦** 打开强化面板，用结晶永久升级：

| 强化 | 效果 | 上限 |
|---|---|---|
| 火力强化 | 每级 +8% 子弹伤害 | 10 |
| 射速强化 | 每级 -3% 射击间隔 | 8 |
| 船体强化 | 每级 +10 最大结构 | 8 |
| 护盾单元 | 开局多 1 层护盾 | 3 |
| 装甲镀层 | 每级 -4% 受到伤害 | 5 |

强化、解锁进度、结晶余额都存在 localStorage，换浏览器或清缓存会丢失。

四种射击模式（数值可调，见 `src/00-config.js` 的 `WEAPONS`）：

| 模式 | 间隔 | 单发伤害 | 弹速 | 特点 |
|---|---|---|---|---|
| 脉冲 PULSE | 0.1s | 1 | 940 | 均衡，DPS ≈ 10 |
| 重炮 CANNON | 0.3s | 3.5 | 640 | 慢弹高伤，可穿透 3 个目标 |
| 散射 SCATTER | 0.36s | 0.85 × 5 | 790 | 近战爆发，远距离衰减 |
| 双流 TWIN | 0.13s | 0.7 × 2 | 980 | 双管平行，持续输出 |

## 操作

| 操作 | 键位 |
|---|---|
| 移动 | WASD / 方向键 |
| 瞄准 | 鼠标（触屏自动瞄准） |
| 射击 | 鼠标左键 / 空格 |
| 冲刺 | Shift / 鼠标右键 |
| 暂停 | P / Esc |
| 静音 | M |

## 目录

```
neon-rift/
  index.html          构建产物：单文件游戏，双击即玩
  build.mjs           构建脚本：把 src/ 拼成单个 HTML
  docs/
    git-playbook.md   Git 上手指南（含三个练习）
  src/
    template.html    HTML 外壳（含 #settings / #topbar / #rotate 等 DOM）
    style.css        DOM 层样式（设置面板、按钮、竖屏提示）
    05-canvas.js     canvas 与离屏渲染表面（scene / bloom / background）
    00-config.js     关卡表、武器表、调色板、持久化设置
    10-util.js       数学、绘制工具、对象池、按键名称
    20-audio.js      WebAudio 合成音效
    30-input.js      键鼠、触屏摇杆、按键重绑定
    40-state.js      游戏状态、玩家、敌人工厂、波次生成、关卡流程
    50-update.js     全部模拟逻辑（玩家/敌人/子弹/拾取/波次/Boss）
    60-render.js     世界渲染、Bloom 合成、HUD
    70-ui.js         主菜单、设置面板、标题/暂停/结算/通关画面
    80-main.js       自适应尺寸、固定步长主循环、启动
```

构建顺序由文件名数字前缀决定。

## 本地构建

```bash
node build.mjs
```

会生成仓库根目录的 `index.html`（约 93 KB）。双击它就能玩。

改完源码记得重新构建，并把 `src/` 和 `index.html` 一起提交。

## 参与开发

第一次用 Git 的话，先看 [docs/git-playbook.md](docs/git-playbook.md)，里面有针对本仓库的三个练习：改一行并提交、开分支调数值、推到 GitHub 开 PR。

日常流程：

```bash
git switch -c feature/your-idea
# 改 src/...
node build.mjs
git add -A
git commit -m "feat: 你的改动"
git push -u origin feature/your-idea
```

## 设计要点

- **固定步长**：逻辑按 1/120 秒推进（设置里可切回 60Hz），渲染跟随 rAF，高刷屏上 120fps。
- **对象池**：子弹 / 敌弹 / 粒子 / 飘字 / 光环复用，避免长局 GC 抖动。
- **Bloom**：世界先画到离屏 canvas，再降采样模糊叠加；帧率过低时自动关闭，可在设置里重新开启。
- **两套调色板**：正常与色盲模式，敌人颜色按类型在绘制时查表，切换即时生效。
- **输入**：键位可重绑定；触屏为虚拟摇杆 + 自动瞄准 + 自动开火；鼠标右键也可冲刺；开局自动瞄准，移动鼠标后交还手动瞄准。
- **难度**：第 1 关第 1 波只放 2 只慢速无人机做引导；每波清完回 10 点结构；精英怪带词缀（护盾/迅捷/分裂/爆裂）；Boss 半血进入狂暴二阶段。

## 存档

- `neonrift.settings.v2`：设置
- `neonrift.best.v2`：总最高分
- `neonrift.stagebest.v1`：每关最高分
- `neonrift.loadout.v1`：上次选择的关卡与射击模式
- `neonrift.progress.v1`：通关进度与结晶余额
- `neonrift.upgrades.v1`：永久强化等级

## 反馈

问题请开 Issue。
