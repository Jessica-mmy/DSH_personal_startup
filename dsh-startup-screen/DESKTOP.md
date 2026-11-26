# 桌面端适配说明 (DIY 版)

本插件同时支持两种 DSH：

| | web profile | desktop profile |
|---|---|---|
| 载体 | `dsh web` 起的本地服务 | DeepSeek Harness Desktop（Electron 桌面端） |
| profile 目录 | `%USERPROFILE%\.dsh\profiles\web` | `%USERPROFILE%\.dsh\profiles\desktop` |
| 安装 | `dsh plugin --profile web add …` | `dsh plugin --profile desktop add …` |
| 重启方式 | 关掉启动器窗口再重新双击 | 完全退出桌面端再打开 |

插件本体是**同一份代码**，不需要两个包。

桌面端（Windows）播放启动动画期间可把标题栏整层透明化：最小化/最大化/关闭按钮与其底色一并不可见，播放结束自动还原。

---

## 一、装到桌面端

```bash
# 1) 先完全退出 DeepSeek Harness Desktop（进程不要留着）
# 2) 再装
dsh plugin --profile desktop add ./dsh-startup-screen
# 3) 重新打开桌面端
```

Windows 上也可以双击 `安装.cmd`：它会自动识别 `web` / `desktop` 两个 profile 并逐个安装。

**为什么必须先退出桌面端**：desktop profile 的 `package.json` 由桌面端进程加锁管理，进程在跑的时候写进去会被覆盖。

---

## 二、验证

打开开发者工具看 console，读取：

```js
window.__DSH_STARTUP_BOOT__   // 'index' = Host 的 tapIndex 注入；'client' = 浏览器半侧自举
```

手查路由（把 `<端口>` 换成桌面端实际端口）：

```
http://127.0.0.1:<端口>/dsh-startup/splash.js
```

返回 **401** → 路由已注册，插件是活的；返回 **404** → 没装成功。
