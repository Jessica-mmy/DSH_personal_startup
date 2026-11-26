# 安装说明 (DIY 版)

## 一、直接安装（推荐）

```bash
dsh plugin --profile web add ./dsh-startup-screen
```

Windows 上双击 `安装.cmd` 也一样，它会自动识别 `web` / `desktop` 两个 profile 并逐个安装。

装完 **重启 dsh web**（关掉启动器窗口再重新双击）。刷新页面就能看到启动动画。

### 为什么必须用 `dsh plugin add`

DSH 靠 **`dsh.profile.bundles`** 这个层堆栈决定加载哪些插件，而
`dsh plugin add` 是包装命令，装完之后 DSH 会自动把「声明了 `dsh.bundle` 的依赖」并入层堆栈 —— 插件自带的
`cordis.patch.yml` 就是在那时候作为一层被应用的。

**手工把目录拷进 `node_modules` 不会被识别。**

---

## 二、手工安装（不用 pnpm）

1. 把 `plugin/` 目录解压到任意位置
2. 让 profile 能解析到它 —— 在 `~/.dsh/profiles/web/node_modules/` 下建目录联接：

   ```cmd
   mklink /J "%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-startup-screen" "解压路径\plugin"
   ```

3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 末尾追加：

   ```yaml
   - insert:
       - id: dsh-startup-screen
         name: dsh-startup-screen
   ```

4. 重启 dsh web

---

## 三、验证装好了

重启后，访问插件路由：

- `/dsh-startup/splash.js` 返回 **401** → 路由已注册（401 是插件自己的信任栅栏，正常）
- 返回 **404** → 没装成功，或没重启

---

## 四、卸载

```bash
dsh plugin --profile web remove dsh-startup-screen
```

---

## 五、环境要求

| 项 | 要求 |
|---|---|
| 平台 | DSH **web** profile / DSH **desktop** profile |
| Node | **>= 20** |
| 运行时依赖 | 无（`dependencies` / `peerDependencies` 都是空的） |
