# dsh-startup-screen (DIY 版)

DeepSeek Harness 的启动界面与启动动画插件 —— **暗色终端片头风格**。

黑底琥珀磷光 · 扫描线 · 暗角 · 流光扫描带；标志逐笔写出 → 开机文字浮出 →
左下角日志滚动 → 白闪 → 淡出揭幕。

> 风格参考 [dsh-550c-boot](https://github.com/yannicksong0106/dsh-550c-boot) 的终端片头语汇，
> 但**标志、文案、配色全部自己重画**，不含 550C 的任何图形素材。

---

## 项目结构

```
dsh-startup-screen/
├── package.json            # Node 包清单 + DSH bundle 声明
├── cordis.patch.yml        # bundle 层声明
├── README.md               # 本文件
├── INSTALL.md              # 安装说明
├── DESKTOP.md              # 桌面端适配说明
├── AUDIO-FIELDS.md         # 音频槽位清单
├── LICENSE
├── 安装.cmd / 打开预览.cmd
├── lib/
│   ├── index.js            # Host 半：路由 + index.html 注入
│   ├── splash.js           # 开机动画运行时（标志绘制 / 日志 / 白闪 / 跳过）
│   ├── splash.css          # 全部样式
│   └── client.js           # 设置面板骨架
├── test/
│   └── check.mjs           # 骨架一致性校验
└── preview/
    └── index.html          # 离线预览页（双击即播）
```

---

## 动画时序

整套分两段，总长约 **9 秒**（速度 1× 时）。

### 第一段 · 厂牌开机（约 4 秒）

| 时刻 | 内容 |
|---|---|
| 0.22s 起，每 0.19s 一项 | 徽记逐笔描边写出：外环 → 虚线内环 → 三角 → 刻度 → 红芯 |
| 接续 | 字标、分隔线、副标题、产品行依次从左到右擦出 |
| 2.0s | 开机文字浮出，末尾带闪烁光标 |
| 1.05s 起，每 0.21s 一条 | 左下角开机日志逐行打出（共 9 条） |
| 写完时 | 标志进入呼吸辉光 |

### 第二段 · 权限校验（约 6.5 秒）

| 时刻 | 内容 |
|---|---|
| 0 → 0.2s | 底层 4 个窗口**大小不一地拼接铺满整屏**（KERNEL / FIRMWARE / FILESYSTEM / NETWORK） |
| 0.43s 起，每 0.19s 一个 | 上层依次叠加 4 个窗口（AUTH / CRYPTO / POLICY / VAULT），覆盖在底层之上 |
| 全程 | 每个窗口持续刷屏，**8 个窗口只用 2 个是文字滚动**，其余用进度条 / 校验矩阵 / 十六进制 |
| 约 3.1s | **所有窗口停止滚动**，各自切换到不同的通过形态 |
| 约 3.9s | 中央展开 `ACCESS GRANTED`，**压在所有窗口最上层** |
| 约 4.6s | 背后的窗口整体淡出消失，只留大字 |
| 约 7.1s | 大字停留约 2.5 秒后白闪 → 揭幕 |

随时可跳过：点画面、按 `Esc` / `Enter` / 空格，或点右下角 `SKIP`。

底层四个窗口的分割比例写在 `tile4()` 里：

| 窗口 | 横向 | 纵向 |
|---|---|---|
| 左上 | 40% | 38% |
| 右上 | 60% | 38% |
| 左下 | 63% | 62% |
| 右下 | 37% | 62% |

改 `splitTop` / `splitBot` / `splitRow` 三个变量即可调整比例，仍然是严丝合缝铺满。

---

## 预览

双击 `preview\index.html` 即可播放（无需安装、无需起服务）。
右上角控制台可实时改：

- 主字标 / 副标题 / 产品行 / 开机文字前缀
- 第二段开关、通过大字、通过副标题
- 磷光主色 / 红点缀色
- 播放速度、是否允许跳过

改完点「↻ 重播」立即生效。

---

## 自定义

### 第二段的窗口与内容

窗口分两层：

| 层 | 数量 | 布局 | 刷屏表现 | 通过表现 |
|---|---|---|---|---|
| 底层 | 4 | 大小不一地拼接，严丝合缝铺满整屏 | 文字 / 进度条 / 校验矩阵 | 日志 / 进度条 / 盖章 |
| 上层 | 4 | 随机位置，依次叠加覆盖 | 进度条 / 校验矩阵 / 文字 / 十六进制 | 进度条 / 盖章 / 十六进制 |

**刷屏时只有 2 个窗口是文字滚动**（KERNEL、AUTH），其余用不同形式：

| 形式 | 窗口 | 表现 |
|---|---|---|
| 文字滚动 | KERNEL、AUTH | 内核日志 / 校验项逐行刷 |
| 进度条 | FILESYSTEM、VAULT | 两条进度条持续推进 + 大号百分比读数 |
| 校验矩阵 | NETWORK、POLICY | 18 个校验格随机 RUN → OK/NO + OPS/CHK/REJ 计数 + 快速滚动日志 |
| 十六进制 | FIRMWARE | 内存地址 + 16 字节 + ASCII 侧栏 |

**通过时每个窗口的终态各不相同**（由 `KINDS[k].done.view` 决定）：

| 终态 | 窗口 | 表现 |
|---|---|---|
| `log` | KERNEL | 列出最后 4 行日志，末尾 `✓ BOOT COMPLETE` |
| `bars` | FILESYSTEM / VAULT / CRYPTO / NETWORK | 多条进度条依次拉满 |
| `stamp` | AUTH / POLICY | 中央「PASS」印章旋转盖下 + 身份摘要 |
| `hex` | FIRMWARE | 十六进制校验尾块 + `HASH ✓ MATCH` |

每类内容在 `lib/splash.js` 的 `KINDS` 里定义，一个条目包含三件事：

```js
kernel: {
  title: 'KERNEL // BOOT',       // 窗口标题
  view:  'log',                  // 刷屏形式：log | hex | bar | swarm
  gen:   genKernel,              // 刷屏时反复调用，返回 { text, cls }
  done:  { view: 'log',          // 通过形式：log | hex | bars | stamp
           head: 'BOOT COMPLETE',
           lines: [...] }        // 或 bars / stamp 各自的字段
}
```

底层窗口由 `tile4()` 按非均分比例计算位置；上层由 `overlaySlots()` 随机生成。
停刷时刻由 `stopAt` 控制（默认 3100ms），大字停留时长由 `grantAt + 3200` 控制，
调这两个就能改第二段节奏。

### 终幕大字

在设置里改，或直接改 `DEFAULTS`：

```js
grantText: 'ACCESS GRANTED',
grantSub: 'IDENTITY VERIFIED · ALL CLEARANCES PASSED'
```

### 换成自己的标志

`lib/splash.js` 里的 `buildLogo()` 就是标志定义，改这里的 SVG 即可：

```js
// ① 徽记：描边类，逐笔写出
paths.appendChild(svgEl('circle', {
  class: 'bs-stroke', cx: '118', cy: '125', r: '64', 'stroke-width': '2'
}));

// ② 字标：填充类，从左到右擦出
var word = svgEl('text', { class: 'bs-veil bs-word', x: '214', y: '132' });
word.textContent = 'DEEPSEEK';
paths.appendChild(word);
```

规则只有两条：

| 类名 | 效果 |
|---|---|
| `bs-stroke` | 用描边逐笔写出（适合线条图形、几何徽记） |
| `bs-veil` | 从左到右擦出（适合文字、实心图形） |

不需要改绘制逻辑，加进 `paths` 就自动排进动画队列。

---

## 安装（先不着急）

```bash
dsh plugin --profile web add ./dsh-startup-screen
```

详见 [INSTALL.md](INSTALL.md)。

---

License: MIT
