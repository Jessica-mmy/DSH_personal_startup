# 需要音频的字段清单 (DIY 版)

本文件列出启动动画里**所有会出声的槽位**，以及每个槽位当前用的是哪份素材。
你可以在这里规划自己的音频素材，稍后把文件放进 `lib/assets/`，再在 `lib/splash.js` 里引用。

---

## 一、语音台词 —— 6 个槽位（示例）

| 槽位 | 中文主字 | 英文副标题 | 素材文件 | 出声时机 |
|---|---|---|---|---|
| `line-1` | 需要访问许可 | `ACCESS PERMISSION REQUIRED` | `lib/assets/line-1.mp3` | 洗白后第一步，与文字渐显同时 |
| `line-2` | 身份资料确认 | `IDENTITY VERIFICATION` | `lib/assets/line-2.mp3` | 第二步（身份卡 + 等确认） |
| `line-3` | 接收访问需求 | `ACCESS REQUEST RECEIVED` | `lib/assets/line-3.mp3` | 第三步（自动推进） |
| `line-4` | 开始读取权限 | `PERMISSION READ STARTED` | `lib/assets/line-4.mp3` | 第四步（自动推进） |
| `line-5` | 读取完毕 · 核验通过 | `READ COMPLETE · VERIFIED` | `lib/assets/line-5.mp3` | 第五步（自动推进） |
| `line-6` | 欢迎 xxx 访问（终幕） | `WELCOME, XXX` | `lib/assets/line-6.mp3` | 欢迎文案亮起的同一刻 |

> 前 5 句可取自原片真声，终幕为自制落幕词；素材缺失时自动回落 TTS，不影响启动。

---

## 二、界面音效 —— 8 个槽位（示例）

| # | 槽位 | 出声时机 | 素材 | 备注 |
|---|---|---|---|---|
| 1 | `cue` | 每次念台词之前的两声轻提示 | 合成 | 提示音 |
| 2 | `tick` | 文字逐字渐显 | `lib/assets/sfx-tick.mp3` | 单声「哒」 |
| 3 | `step` | 每个阶段推进 | `lib/assets/sfx-tick.mp3` | 阶段推进 |
| 4 | `confirm` | 点按钮 / 按 Enter 确认 | `lib/assets/sfx-tick.mp3` | 确认音 |
| 5 | `tickRun` | 十六进制瀑布开始滚动 | `lib/assets/sfx-ticks-run.mp3` | 整串「哒」 |
| 6 | `sweep` | 黑幕 → 底板的洗白过场 | 合成 | 扫频 |
| 7 | `rise` | 黑幕上标识出现 | 合成 | 上行音 |
| 8 | `chime` | 终幕揭幕 | 合成 | 和声钟 |

---

## 三、素材清单（示例）

```
lib/assets/
├─ line-1.mp3   第 1 步台词
├─ line-2.mp3   第 2 步台词
├─ line-3.mp3   第 3 步台词
├─ line-4.mp3   第 4 步台词
├─ line-5.mp3   第 5 步台词
├─ line-6.mp3   终幕欢迎语
├─ sfx-tick.mp3       单声「哒」
└─ sfx-ticks-run.mp3  整串「哒」
```

Host 经 `/dsh-startup/asset/<文件名>` 只读下发（正则白名单 + 防目录穿越）。

---

## 四、时长怎么定

每一步的停留时间 = `max(视觉基准, 实际音频时长 + 收尾)`，素材播多长，动画就等多久；用户点得快也不掐断语音。只有「跳过 / 揭幕」才真的取消。
