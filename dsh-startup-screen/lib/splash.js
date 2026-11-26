/* dsh-startup-screen (DIY) — 暗色终端风格开机动画运行时
 *
 * 普通 script（无 import/export），双击 preview/index.html 即可播放。
 *
 * 风格参考：黑底琥珀磷光终端 · 扫描线 · 暗角 · 流光扫描带
 * 时序：徽记逐笔写出 → 字标从左到右擦出 → 开机文字浮出 → 左下角日志滚动
 *      → 收尾白闪 → 淡出揭幕
 *
 * 想换标志：改 buildLogo() 里的 SVG 内容即可，绘制逻辑不用动。
 */

(function () {
  'use strict';

  // 防重复注入：脚本被挂两次时第二个直接退出
  if (window.__DSH_STARTUP_API__) return;

  // ── 默认配置 ──────────────────────────────────────────────────────────────
  var DEFAULTS = {
    enabled: true,
    mode: 'session',            // session | daily | always
    speed: 1,
    allowSkip: true,
    brand1: 'DEEPSEEK',         // 字标
    brand2: 'SYNTHESIZE INTELLIGENCE',
    brand3a: 'HARNESS',
    brand3b: 'OS',
    orgSub: 'DEEPSEEK HARNESS', // 开机文字前缀
    accent: '#e8a020',          // 磷光主色
    glitchA: '#e05030',         // 红点缀色
    phase2: true,               // 第二段：权限校验窗口墙
    grantText: 'ACCESS GRANTED',
    grantSub: 'IDENTITY VERIFIED · ALL CLEARANCES PASSED'
  };

  function readCfg() {
    var out = {}, k;
    for (k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k];
    }
    var ext = window.__DSH_STARTUP__;
    if (ext && typeof ext === 'object') {
      for (k in ext) {
        if (Object.prototype.hasOwnProperty.call(ext, k) && ext[k] !== undefined && ext[k] !== null) {
          out[k] = ext[k];
        }
      }
    }
    return out;
  }

  var cfg = readCfg();

  // ── 桌面端标题栏配色 ──────────────────────────────────────────────────────
  // 对齐 dsh-550c-boot 的做法：桌面 preload 在 body 里插入一个隐藏探针元素
  // <span style="position:fixed;visibility:hidden;pointer-events:none;
  // background-color:var(--dsw-specific-sidebar-fill);color:var(--dsw-alias-label-primary)">
  // 并用 MutationObserver 监听 head，当 head childList 变化时重新测量探针的
  // computedStyle，通过 windowsAppearance IPC 调 setTitleBarOverlay({color, symbolColor})
  // 同步给原生标题栏。
  //
  // 动画期间我们往 head 里插一个 <style>，用 !important 把探针的 background-color
  // 改成 transparent，color 改成动画的 accent，这样原生标题栏会变成"透明底 + 金色符号"，
  // 视觉上按钮"悬浮"在动画上方而不是突兀的白条。节点删除后观察器自动恢复。
  var CAPTION_STYLE_ID = 'dsh-startup-caption-theme';

  function mountCaptionTheme() {
    if (document.getElementById(CAPTION_STYLE_ID)) return;
    var platform = document.documentElement.dataset.platform;
    if (!platform) return; // 不是桌面端

    var accent = cfg.accent || '#e8a020';
    var el = document.createElement('style');
    el.id = CAPTION_STYLE_ID;
    // 直接改探针元素的 computedStyle，而不是改 CSS 变量（preload 读的是前者）
    el.textContent =
      'body>span[style*="dsw-specific-sidebar-fill"]' +
      '{background-color:transparent !important;color:' + accent + ' !important}';
    document.head.appendChild(el);
  }

  function unmountCaptionTheme() {
    var el = document.getElementById(CAPTION_STYLE_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ── 运行时状态 ────────────────────────────────────────────────────────────
  var root = null;
  var els = {};
  var timers = [];
  var finished = false;
  var skippable = false;

  function later(fn, ms) {
    var t = setTimeout(function () {
      var i = timers.indexOf(t);
      if (i >= 0) timers.splice(i, 1);
      if (!finished) fn();
    }, Math.max(0, ms));
    timers.push(t);
    return t;
  }

  function clearAllTimers() {
    timers.forEach(clearTimeout);
    timers.length = 0;
  }

  function scaled(ms) {
    var s = Number(cfg.speed) || 1;
    if (s < 0.25) s = 0.25;
    if (s > 6) s = 6;
    return ms / s;
  }

  // ── 是否该播 ──────────────────────────────────────────────────────────────
  var SEEN_KEY = 'dsh-startup-screen:seen';

  function shouldPlay() {
    if (!cfg.enabled) return false;
    try {
      if (cfg.mode === 'always') return true;
      if (cfg.mode === 'daily') {
        var today = new Date().toDateString();
        if (window.localStorage.getItem(SEEN_KEY) === today) return false;
        window.localStorage.setItem(SEEN_KEY, today);
        return true;
      }
      if (window.sessionStorage.getItem(SEEN_KEY)) return false;
      window.sessionStorage.setItem(SEEN_KEY, '1');
      return true;
    } catch (e) {
      return true;   // 存储不可用时一律播放
    }
  }

  // ── SVG 工具 ──────────────────────────────────────────────────────────────
  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
      }
    }
    return n;
  }

  // ── 标志（自行绘制的徽记 + 字标，不含任何第三方 logo）────────────────────
  function buildLogo() {
    var el = svgEl('svg', {
      'class': 'bs-logo',
      viewBox: '0 0 820 250',
      xmlns: NS,
      'aria-hidden': 'true'
    });

    var paths = svgEl('g', { 'class': 'bs-paths' });

    // ① 徽记：外环 / 内虚线环 / 内切三角 / 顶部刻度 / 红芯
    paths.appendChild(svgEl('circle', {
      'class': 'bs-stroke', cx: '118', cy: '125', r: '64', 'stroke-width': '2'
    }));
    paths.appendChild(svgEl('circle', {
      'class': 'bs-stroke', cx: '118', cy: '125', r: '49',
      'stroke-width': '1', 'stroke-dasharray': '4 6', 'data-soft': '1'
    }));
    paths.appendChild(svgEl('path', {
      'class': 'bs-stroke', d: 'M118 82 L155 146 L81 146 Z',
      'stroke-width': '2', 'stroke-linejoin': 'round'
    }));
    paths.appendChild(svgEl('path', {
      'class': 'bs-stroke', d: 'M118 61 L118 79', 'stroke-width': '2'
    }));
    paths.appendChild(svgEl('circle', {
      'class': 'bs-veil bs-core', cx: '118', cy: '125', r: '7'
    }));

    // ② 字标
    var word = svgEl('text', { 'class': 'bs-veil bs-word', x: '214', y: '132' });
    word.textContent = String(cfg.brand1 || 'DEEPSEEK');
    paths.appendChild(word);

    // ③ 细分隔线
    paths.appendChild(svgEl('line', {
      'class': 'bs-veil bs-rule', x1: '216', y1: '152', x2: '742', y2: '152'
    }));

    // ④ 副标题（等宽）
    var sub = svgEl('text', { 'class': 'bs-veil bs-sub', x: '216', y: '180' });
    sub.textContent = String(cfg.brand2 || 'SYNTHESIZE INTELLIGENCE');
    paths.appendChild(sub);

    // ⑤ 产品行
    var prod = svgEl('text', { 'class': 'bs-veil bs-prod', x: '216', y: '220' });
    prod.textContent = (String(cfg.brand3a || '') + ' ' + String(cfg.brand3b || '')).trim();
    paths.appendChild(prod);

    el.appendChild(paths);
    return el;
  }

  // 元素必须先挂进文档，getTotalLength 才可靠
  function prepareLogo(logo) {
    var order = Array.prototype.slice.call(logo.querySelectorAll('.bs-stroke, .bs-veil'));
    var items = [];

    order.forEach(function (n) {
      var isStroke = n.classList.contains('bs-stroke');
      if (isStroke) {
        if (n.getAttribute('data-soft')) {
          // 虚线环不用 dash 偏移（会露出），改用整体淡入
          n.style.opacity = '0';
          items.push({ node: n, kind: 'fade' });
          return;
        }
        var len = 0;
        try { len = n.getTotalLength ? n.getTotalLength() : 0; } catch (e) { len = 0; }
        if (!len) {
          n.style.opacity = '0';
          items.push({ node: n, kind: 'fade' });
          return;
        }
        n.style.strokeDasharray = String(len);
        n.style.strokeDashoffset = String(len);
        n.style.opacity = '1';
        items.push({ node: n, kind: 'stroke' });
      } else {
        n.style.clipPath = 'inset(0 100% 0 0)';
        n.style.webkitClipPath = 'inset(0 100% 0 0)';
        n.style.opacity = '1';
        items.push({ node: n, kind: 'veil' });
      }
    });

    return items;
  }

  // 逐项写出，返回总时长
  function playLogo(logo, items) {
    var base = scaled(220);
    var gap = scaled(185);

    items.forEach(function (item, i) {
      later(function () {
        var n = item.node;
        if (item.kind === 'stroke') {
          n.style.transition = 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)';
          n.style.strokeDashoffset = '0';
        } else if (item.kind === 'fade') {
          n.style.transition = 'opacity .55s ease';
          n.style.opacity = '1';
        } else {
          n.style.transition = 'clip-path .64s cubic-bezier(.4,0,.2,1)';
          n.style.clipPath = 'inset(0 0 0 0)';
          n.style.webkitClipPath = 'inset(0 0 0 0)';
        }
      }, base + i * gap);
    });

    var total = base + items.length * gap + scaled(400);

    later(function () { logo.classList.add('bs-done'); }, total);

    return total;
  }

  // ── 开机日志 ──────────────────────────────────────────────────────────────
  var LOG_LINES = [
    { t: 'BOOT ROM v2.14 — CHECKSUM OK', cls: 'bs-ok' },
    { t: 'CORE ONLINE · SESSION ENCRYPTED', cls: 'bs-ok' },
    { t: 'MEMORY TEST 16384 MB — PASS', cls: '' },
    { t: 'LOADING KERNEL IMAGE', cls: '' },
    { t: 'CRYPTO SUBSYSTEM — READY', cls: 'bs-ok' },
    { t: 'HANDSHAKE WITH HOST', cls: '' },
    { t: 'SESSION TOKEN ACQUIRED', cls: 'bs-hl' },
    { t: 'ARCHIVE SURFACE CALIBRATED', cls: '' },
    { t: 'AWAITING ACCESS PERMISSION', cls: 'bs-hl' }
  ];

  function pushLog(line) {
    var row = document.createElement('div');
    row.className = 'bs-logline ' + (line.cls || '');

    var arrow = document.createElement('span');
    arrow.className = 'bs-arrow';
    arrow.textContent = '›';

    var txt = document.createElement('span');
    txt.textContent = line.t;

    row.appendChild(arrow);
    row.appendChild(txt);
    els.log.appendChild(row);

    while (els.log.childElementCount > 10) {
      els.log.removeChild(els.log.firstChild);
    }
  }

  // ── DOM 搭建 ──────────────────────────────────────────────────────────────
  function mount() {
    root = document.getElementById('dsh-startup-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'dsh-startup-root';
      document.body.appendChild(root);
    }
    root.className = 'bs-root';
    root.style.setProperty('--bs-amber', cfg.accent || '#e8a020');
    root.style.setProperty('--bs-red', cfg.glitchA || '#e05030');
    root.innerHTML = '';

    function div(cls) {
      var d = document.createElement('div');
      d.className = cls;
      return d;
    }

    var stage = div('bs-stage');
    var logo = buildLogo();
    stage.appendChild(logo);

    var bootText = div('bs-boottext');
    var label = document.createElement('span');
    label.textContent = (cfg.orgSub || 'DEEPSEEK HARNESS') + ' SYSTEM BOOT';
    var cursor = document.createElement('span');
    cursor.className = 'bs-cursor';
    bootText.appendChild(label);
    bootText.appendChild(cursor);
    stage.appendChild(bootText);

    var log = div('bs-log');

    var tl = div('bs-corner bs-tl');
    tl.textContent = '▮ ' + (cfg.brand1 || 'DEEPSEEK') + ' // BOOT SEQUENCE';

    var tr = div('bs-corner bs-tr');
    tr.textContent = 'v1.0.0 · ' + (String(cfg.brand3a || '') + ' ' + String(cfg.brand3b || '')).trim();

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'bs-skip';
    skip.textContent = 'SKIP · ESC';
    skip.hidden = !cfg.allowSkip;

    var flash = div('bs-flash');

    root.appendChild(div('bs-scan'));
    root.appendChild(div('bs-sweep'));
    root.appendChild(div('bs-vig'));
    root.appendChild(stage);
    root.appendChild(log);
    root.appendChild(tl);
    root.appendChild(tr);
    root.appendChild(skip);
    root.appendChild(flash);

    els = {
      stage: stage, logo: logo, bootText: bootText, log: log,
      tl: tl, tr: tr, skip: skip, flash: flash
    };

    skip.addEventListener('click', function (e) {
      e.stopPropagation();
      finish();
    });

    // 点画面任意处也能跳过
    root.addEventListener('click', function () {
      if (skippable) finish();
    });

    document.addEventListener('keydown', onKey, true);

    document.documentElement.classList.add('bs-lock');
    mountCaptionTheme();
    void root.offsetWidth;
    root.classList.add('bs-in');

    return logo;
  }

  function onKey(e) {
    if (!skippable) return;
    if (e.key === 'Escape' && cfg.allowSkip) {
      e.preventDefault();
      finish();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      finish();
    }
  }

  // ══ 第二段：权限校验窗口墙 ══════════════════════════════════════════════
  //
  //  底层：4 个窗口按 2×2 拼接铺满整屏，内容各不相同，持续刷屏
  //  上层：依次叠加 4 个窗口，覆盖在底层之上，内容同样各不相同
  //  终幕前：统一停刷，每个窗口落一段「校验完成」结论
  //  最后：中央展开 ACCESS GRANTED

  var STREAM_TIMERS = [];

  function stopAllStreams() {
    for (var i = 0; i < STREAM_TIMERS.length; i++) clearInterval(STREAM_TIMERS[i]);
    STREAM_TIMERS.length = 0;
  }

  function startStream(fn, baseMs) {
    var s = Math.max(0.25, Number(cfg.speed) || 1);
    var id = setInterval(fn, Math.max(16, Math.round(baseMs / s)));
    STREAM_TIMERS.push(id);
    return id;
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function hexw(n) {
    var s = '', h = '0123456789ABCDEF';
    for (var i = 0; i < n; i++) s += h[Math.floor(Math.random() * 16)];
    return s;
  }

  function padl(s, n) {
    s = String(s);
    while (s.length < n) s = ' ' + s;
    return s;
  }

  function dots(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '.';
    return s;
  }

  // ── 各类内容的刷屏生成器 ─────────────────────────────────────────────────

  var KERNEL_T = [
    'Initializing cgroup subsys cpuset',
    'Linux version 6.6.14-hardened (gcc 13.2.0 #1 SMP PREEMPT)',
    'Command line: console=ttyS0 quiet root=/dev/mapper/vault0',
    'BIOS-provided physical RAM map:',
    'ACPI: RSDP 0x00000000000F05B0 000024 (v02 BOCHS)',
    'ACPI: XSDT 0x00000000BFFE1200 00009C (v01 BOCHS BXPCFACP)',
    'Memory: 16337288K/16777216K available',
    'SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=16',
    'rcu: Preemptible hierarchical RCU implementation',
    'smpboot: CPU0: Intel Xeon Platinum 8375C @ 2.90GHz',
    'clocksource: tsc-early: mask: 0xffffffffffffffff',
    'Mount-cache hash table entries: 65536',
    'Security Framework initialized',
    'AppArmor: AppArmor initialized',
    'audit: initializing netlink subsys',
    'cryptd: max_cpu_qlen set to 1000',
    'pci 0000:00:1f.2: [8086:2829] type 00 class 0x010601',
    'ahci 0000:00:1f.2: AHCI 0001.0300 32 slots 6 ports',
    'sd 0:0:0:0: [sda] 209715200 512-byte logical blocks',
    'EXT4-fs (dm-0): mounted filesystem with ordered data mode',
    'systemd[1]: Detected architecture x86-64',
    'systemd[1]: Set hostname to <vault-node-07>',
    'random: crng init done',
    'tpm_tis 00:05: TPM 2.0 device found (firmware 7.85)',
    'integrity: Loading X.509 certificate: UEFI:db',
    'ima: policy update completed, entries=48'
  ];

  function genKernel() {
    var t = (Math.random() * 1.4).toFixed(6);
    return { text: '[ ' + padl(t, 10) + ' ] ' + pick(KERNEL_T), cls: 'dim' };
  }

  function genHex() {
    var addr = '0x' + hexw(6);
    var bytes = '';
    for (var i = 0; i < 16; i++) {
      bytes += hexw(2) + (i === 7 ? '  ' : ' ');
    }
    var asc = '';
    for (var j = 0; j < 16; j++) {
      var c = Math.floor(Math.random() * 95) + 32;
      asc += (c >= 32 && c < 127) ? String.fromCharCode(c) : '.';
    }
    return { text: addr + '  ' + bytes + ' ' + asc, cls: '' };
  }

  var FS_NAMES = [
    'id_rsa.pub', 'authorized_keys', 'vault.sock', 'session.db',
    'attest.quote', 'root_ca.pem', 'pcrs.bin', 'ledger.log',
    'policy.json', 'quorum.ring', 'nonce.cache', 'seal.key',
    'audit.trail', 'mesh.conf', 'lease.tbl', 'token.jwt'
  ];
  var FS_DIRS = [
    '/sys/kernel/security', '/etc/ssl/private', '/var/lib/vault',
    '/run/secrets', '/opt/harness/core', '/proc/self/attr',
    '/dev/mapper', '/srv/attest'
  ];

  function genFs() {
    var perm = pick(['drwxr-xr-x', '-rw-r--r--', '-rw-------', '-rwsr-xr-x', 'lrwxrwxrwx']);
    var size = Math.floor(Math.random() * 900000) + 120;
    var d = pick(FS_DIRS);
    var n = pick(FS_NAMES);
    var t = padl(Math.floor(Math.random() * 24), 2) + ':' + padl(Math.floor(Math.random() * 60), 2);
    return { text: perm + '  root root ' + padl(size, 7) + '  ' + t + '  ' + d + '/' + n, cls: '' };
  }

  var NET_FLAGS = ['[S.]', '[S.]', '[P.]', '[.]', '[F.]', '[R.]'];

  function genNet() {
    var h = Math.floor(Math.random() * 24);
    var m = Math.floor(Math.random() * 60);
    var s = Math.floor(Math.random() * 60);
    var ms = padl(Math.floor(Math.random() * 1000), 3);
    var len = Math.floor(Math.random() * 1400) + 40;
    return {
      text: padl(h, 2) + ':' + padl(m, 2) + ':' + padl(s, 2) + '.' + ms +
            '  RX eth0  len ' + padl(len, 4) + '  ' + hexw(4) + ' > ' + hexw(4) +
            '  ' + pick(NET_FLAGS) + ' seq ' + hexw(4),
      cls: Math.random() < 0.12 ? 'warn' : ''
    };
  }

  var AUTH_ITEMS = [
    'identity.signature', 'clearance.level', 'biometric.match',
    'session.token', 'integrity.sha256', 'certificate.chain',
    'policy.gate', 'entropy.pool', 'memory.enclave', 'channel.cipher',
    'handshake.rounds', 'attest.quote', 'scope.grant', 'nonce.replay',
    'clock.skew', 'key.rotation', 'tpm.pcr', 'audit.trail',
    'quorum.vote', 'lease.ttl', 'mesh.route', 'vault.unseal',
    'guard.watchdog', 'profile.load', 'origin.allow', 'sandbox.escape',
    'role.bind', 'scope.escalate', 'ledger.append', 'attest.fresh'
  ];

  function genAuth() {
    var k = pick(AUTH_ITEMS);
    var v = pick(['VERIFY', 'PASS', 'OK', 'MATCH', 'TRUSTED', 'SEALED', 'GRANTED']);
    var r = Math.random();
    var cls = r < 0.08 ? 'warn' : 'ok';
    return { text: '  [OK] ' + k + ' ' + dots(Math.max(2, 26 - k.length)) + ' ' + v, cls: cls };
  }

  function genCrypto() {
    var r = Math.random();
    if (r < 0.25) return { text: '  sha256(' + hexw(4) + ') = ' + hexw(56), cls: 'dim' };
    if (r < 0.5) return { text: '  hmac-sha256 0x' + hexw(32) + '  OK', cls: 'ok' };
    if (r < 0.7) return { text: '  [ATTEST] quote sig verified · pcr0-7 consistent', cls: 'ok' };
    if (r < 0.85) return { text: '  [RNG] 4096 bits drawn from /dev/hwrng', cls: 'dim' };
    return { text: '  [KDF] hkdf-sha384  rounds=3  salt=0x' + hexw(16), cls: '' };
  }

  var POLICY_RULES = [
    'allow read  /var/lib/vault/**  if clearance >= LV-5',
    'deny  write /etc/ssl/private   unless role=admin',
    'allow exec  /opt/harness/bin/* if signature=valid',
    'deny  net   outbound:*         if sandbox=on',
    'allow mount /dev/mapper/vault0 if quorum>=5',
    'deny  ptrace any              unless audit=open',
    'allow bind  tcp:8443          if tls>=1.3',
    'deny  escalate to root        always'
  ];

  function genPolicy() {
    var r = Math.random();
    if (r < 0.55) return { text: '  eval: ' + pick(POLICY_RULES), cls: 'dim' };
    if (r < 0.8) return { text: '  => ' + pick(['ALLOW', 'ALLOW', 'DENY']), cls: r < 0.72 ? 'ok' : 'bad' };
    return { text: '  policy.engine: rule #' + Math.floor(Math.random() * 240) + ' applied', cls: '' };
  }

  function genVault() {
    var r = Math.random();
    if (r < 0.3) return { text: '  seal.state = ' + pick(['SEALED', 'UNSEALED', 'ROTATING']), cls: 'dim' };
    if (r < 0.55) return { text: '  unseal.key share ' + Math.floor(Math.random() * 5 + 1) + '/5 accepted', cls: 'ok' };
    if (r < 0.75) return { text: '  [BARRIER] encrypting block ' + hexw(6) + ' ... done', cls: '' };
    if (r < 0.9) return { text: '  [LEASE] ttl=' + Math.floor(Math.random() * 3600) + 's renewed', cls: 'dim' };
    return { text: '  [AUDIT] append entry #' + Math.floor(Math.random() * 90000), cls: 'ok' };
  }

  function genScope() {
    var k = pick(['read', 'write', 'exec', 'mount', 'net', 'ptrace', 'bind']);
    var t = pick(['/var/lib/vault', '/etc/ssl', '/opt/harness', '/proc/self', 'tcp:8443']);
    return {
      text: '  scope.' + k + ' ' + t + ' ' + dots(Math.max(2, 22 - t.length)) + ' ' +
            pick(['RWX', 'R--', 'RW-', 'GRANTED']),
      cls: 'ok'
    };
  }

  // 每个类型：view = 刷屏时的表现形式，done = 通过时的表现形式
  var KINDS = {
    kernel: { title: 'KERNEL // BOOT', view: 'log', gen: genKernel,
              done: { view: 'log', head: 'BOOT COMPLETE',
                      lines: ['[ 0.000000 ] Booting Linux on physical CPU 0x0',
                              '[ 0.041218 ] Rootfs mounted read-only',
                              '[ 0.118902 ] systemd: Reached target Multi-User',
                              'BOOT_SEQUENCE_COMPLETE · 214 services · 0 failures'] } },
    hex: { title: 'FIRMWARE // IMAGE', view: 'hex', gen: genHex,
           done: { view: 'hex', head: 'IMAGE VERIFIED',
                   lines: ['0x7F3A0C00  ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + '  ..SHA256..',
                           '0x7F3A0C10  ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + '  ..SIGNOK...',
                           '0x7F3A0C20  ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + '  ..PCRMATCH',
                           'IMAGE_INTEGRITY_VERIFIED · sha256 ' + hexw(12)] } },
    fs: { title: 'FILESYSTEM // SCAN', view: 'bar', gen: genFs,
          done: { view: 'bars', label: 'PATHS AUTHORIZED',
                  bars: [['/etc/ssl/private', 100], ['/var/lib/vault', 100], ['/run/secrets', 100]] } },
    net: { title: 'NETWORK // TRACE', view: 'swarm', gen: genNet,
           done: { view: 'bars', label: 'CHANNEL SECURE',
                   bars: [['CARRIER', 100], ['INTEGRITY', 100], ['ROUTE', 100]] } },
    auth: { title: 'AUTH // GATE-01', view: 'log', gen: genAuth,
            done: { view: 'stamp', stamp: 'PASS', head: 'IDENTITY VERIFIED',
                    lines: ['identity.signature ..... MATCH',
                            'biometric.match ........ 99.8%',
                            'clearance.level ........ LV-7'] } },
    crypto: { title: 'CRYPTO // ATTEST', view: 'bars', gen: genCrypto,
              done: { view: 'bars', label: 'ATTESTATION PASSED',
                      bars: [['ECDSA P-384', 100], ['SHA-256', 100], ['AES-256-GCM', 100], ['HMAC', 100]] } },
    policy: { title: 'POLICY // ENFORCE', view: 'swarm', gen: genPolicy,
              done: { view: 'stamp', stamp: 'PASS', head: 'POLICY SATISFIED',
                      lines: ['allow 18  ·  deny 0  ·  default-deny intact',
                              '32 rules evaluated · 0 violations',
                              'POLICY_ENFORCEMENT_COMPLETE'] } },
    vault: { title: 'VAULT // UNSEAL', view: 'bar', gen: genVault,
             done: { view: 'bars', label: 'VAULT ACCESS GRANTED',
                     bars: [['shard 1/5', 100], ['shard 2/5', 100], ['shard 3/5', 100],
                            ['shard 4/5', 100], ['shard 5/5', 100]] } },
    scope: { title: 'SCOPE // BIND', view: 'hex', gen: genScope,
             done: { view: 'hex', head: 'SCOPE BOUND',
                     lines: ['0x00A1F000  ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + '  ..RWX.....',
                             '0x00A1F010  ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + '  ..GRANTED',
                             '0x00A1F020  ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + ' ' + hexw(2) + '  ..BOUND...',
                             'SCOPE_BINDING_COMPLETE · 7 capabilities'] } }
  };

  // ── 窗口构建 ─────────────────────────────────────────────────────────────

  function buildWindow(slot, kindKey, index) {
    var kind = KINDS[kindKey];

    var outer = document.createElement('div');
    outer.className = 'bs-win';
    outer.style.left = slot.x + 'px';
    outer.style.top = slot.y + 'px';
    outer.style.width = slot.w + 'px';
    outer.style.height = slot.h + 'px';
    outer.style.zIndex = String(40 + index);

    var inner = document.createElement('div');
    inner.className = 'bs-win-in';

    // 标题栏
    var bar = document.createElement('div');
    bar.className = 'bs-win-bar';

    var dotsEl = document.createElement('span');
    dotsEl.className = 'bs-win-dots';
    for (var d = 0; d < 3; d++) dotsEl.appendChild(document.createElement('i'));

    var title = document.createElement('span');
    title.className = 'bs-win-title';
    title.textContent = kind.title;

    var tag = document.createElement('span');
    tag.className = 'bs-win-tag';
    tag.textContent = '0x' + hexw(6);

    var ctrl = document.createElement('span');
    ctrl.className = 'bs-win-ctrl';
    ctrl.textContent = '─  □  ✕';

    bar.appendChild(dotsEl);
    bar.appendChild(title);
    bar.appendChild(tag);
    bar.appendChild(ctrl);

    // 刷屏正文
    var body = document.createElement('div');
    body.className = 'bs-win-body';

    // 终态区（停刷后由 settleWindow 填充）
    var done = document.createElement('div');
    done.className = 'bs-win-done';
    done.hidden = true;

    // 底部进度 + 状态
    var foot = document.createElement('div');
    foot.className = 'bs-win-foot';
    var barFill = document.createElement('i');
    var status = document.createElement('span');
    status.className = 'bs-win-status';
    status.textContent = kind.view === 'swarm' ? 'VERIFYING' : 'STREAMING';
    foot.appendChild(barFill);
    foot.appendChild(status);

    inner.appendChild(bar);
    inner.appendChild(body);
    inner.appendChild(done);
    inner.appendChild(foot);
    outer.appendChild(inner);

    var win = {
      el: outer, body: body, done: done,
      fill: barFill, status: status,
      kind: kind, kindKey: kindKey
    };

    // 按 view 建立刷屏表现
    if (kind.view === 'bar' || kind.view === 'bars') win.view = buildBarView(body, kindKey);
    else if (kind.view === 'swarm') win.view = buildSwarmView(body, kindKey);
    else win.view = null;

    return win;
  }

  // 往任意容器里追加一行滚动文字
  function makeLogger(container, max) {
    return function (line) {
      var row = document.createElement('div');
      row.className = 'bs-ln' + (line.cls ? ' ' + line.cls : '');
      row.textContent = line.text;
      container.appendChild(row);
      while (container.childElementCount > (max || 40)) {
        container.removeChild(container.firstChild);
      }
      container.scrollTop = container.scrollHeight;
    };
  }

  // 刷屏时的表现 A：进度条 + 滚动文字
  // 三种变体，各自布局不同，避免两个窗口长得一样
  function buildBarView(body, kindKey) {
    var wrap = document.createElement('div');
    wrap.className = 'bs-mix bs-mix-bar';

    var logBox = document.createElement('div');
    logBox.className = 'bs-mix-log';
    wrap.appendChild(logBox);
    var log = makeLogger(logBox, 26);

    // 先挂进 body，避免任何分支提前 return 导致空白
    body.appendChild(wrap);

    if (kindKey === 'fs') {
      // ── 变体 1：双进度条 + 大号百分比
      var meters = document.createElement('div');
      meters.className = 'bs-meter';

      function bar(caption) {
        var row = document.createElement('div');
        row.className = 'bs-meter-row';
        var cap = document.createElement('span');
        cap.className = 'bs-meter-cap';
        cap.textContent = caption;
        var track = document.createElement('span');
        track.className = 'bs-meter-track';
        var fill = document.createElement('i');
        track.appendChild(fill);
        var val = document.createElement('span');
        val.className = 'bs-meter-val';
        val.textContent = '0%';
        row.appendChild(cap);
        row.appendChild(track);
        row.appendChild(val);
        meters.appendChild(row);
        return { fill: fill, val: val };
      }

      var m1 = bar('FS_SCAN');
      var m2 = bar('INODES');
      var big = document.createElement('div');
      big.className = 'bs-meter-big';
      meters.appendChild(big);
      wrap.insertBefore(meters, logBox);

      var p = 0;
      return { tick: function () {
        p = Math.min(100, p + 1.5 + Math.random() * 2.4);
        m1.fill.style.width = p + '%';
        m1.val.textContent = Math.round(p) + '%';
        var q = Math.min(100, p * (0.84 + Math.random() * 0.12));
        m2.fill.style.width = q + '%';
        m2.val.textContent = Math.round(q) + '%';
        big.textContent = padl(Math.round(p), 3) + ' / 100';
        log({ text: 'scan ' + pick(FS_DIRS) + '/' + pick(FS_NAMES) +
                    '  ' + Math.round(p) + '%', cls: 'dim' });
      } };

    } else if (kindKey === 'vault') {
      // ── 变体 2：5 格 shard 逐格点亮 + 无大号数字
      var cells = document.createElement('div');
      cells.className = 'bs-cells';

      var cellEls = [];
      for (var c = 0; c < 5; c++) {
        var cell = document.createElement('div');
        cell.className = 'bs-cell';
        var idx = document.createElement('span');
        idx.className = 'bs-cell-idx';
        idx.textContent = 'S' + (c + 1);
        var state = document.createElement('span');
        state.className = 'bs-cell-state';
        state.textContent = 'LOCKED';
        cell.appendChild(idx);
        cell.appendChild(state);
        cells.appendChild(cell);
        cellEls.push({ el: cell, state: state });
      }
      wrap.insertBefore(cells, logBox);

      var lit = 0;
      return { tick: function () {
        if (lit < 5 && Math.random() < 0.34) {
          cellEls[lit].el.classList.add('bs-on');
          cellEls[lit].state.textContent = 'OK';
          log({ text: 'shard ' + (lit + 1) + '/5 unsealed · share accepted', cls: 'ok' });
          lit++;
        } else {
          log({ text: pick(['unseal.key share ' + (lit + 1) + '/5 pending',
                           '[BARRIER] block ' + hexw(6) + ' sealed',
                           '[LEASE] ttl=' + Math.floor(Math.random() * 3600) + 's',
                           'seal.state = ' + pick(['SEALED', 'ROTATING'])]), cls: 'dim' });
        }
        if (lit >= 5) log({ text: 'ALL SHARDS UNSEALED · quorum reached', cls: 'hl' });
      } };

    } else {
      // ── 变体 3：四条哈希进度 + 十六进制摘要
      var rows = document.createElement('div');
      rows.className = 'bs-bars4';

      var names = ['ECDSA P-384', 'SHA-256', 'AES-256-GCM', 'HMAC'];
      var fills = [];
      names.forEach(function (n) {
        var row = document.createElement('div');
        row.className = 'bs-meter-row';
        var cap = document.createElement('span');
        cap.className = 'bs-meter-cap';
        cap.textContent = n;
        var track = document.createElement('span');
        track.className = 'bs-meter-track';
        var fill = document.createElement('i');
        track.appendChild(fill);
        var val = document.createElement('span');
        val.className = 'bs-meter-val';
        val.textContent = '0%';
        row.appendChild(cap);
        row.appendChild(track);
        row.appendChild(val);
        rows.appendChild(row);
        fills.push({ fill: fill, val: val });
      });
      wrap.insertBefore(rows, logBox);

      return { tick: function () {
        for (var f = 0; f < fills.length; f++) {
          var v = Math.min(100, parseFloat(fills[f].val.textContent) + 1.2 + Math.random() * 3.4);
          fills[f].fill.style.width = v + '%';
          fills[f].val.textContent = Math.round(v) + '%';
        }
        log({ text: pick(['sha256(' + hexw(4) + ') = ' + hexw(40),
                          'hmac 0x' + hexw(24) + '  OK',
                          'hkdf rounds=3 salt=0x' + hexw(12),
                          '[RNG] ' + hexw(16)]), cls: 'dim' });
      } };
    }
  }

  // 刷屏时的表现 B：多路身份校验矩阵 + 快速操作日志
  // 一批小格子随机 RUN → OK / NO，配合滚动日志和计数器，
  // 让单个窗口也有「并发执行大量校验」的忙碌感
  function buildSwarmView(body, kindKey) {
    var wrap = document.createElement('div');
    wrap.className = 'bs-mix bs-mix-swarm';

    var kind = KINDS[kindKey];

    // 顶部计数条：OPS / CHK / REJ
    var stats = document.createElement('div');
    stats.className = 'bs-swarm-stats';

    function stat(label) {
      var s = document.createElement('span');
      s.className = 'bs-swarm-stat';
      s.textContent = label + ' ';
      var b = document.createElement('b');
      s.appendChild(b);
      stats.appendChild(s);
      return b;
    }
    var opsB = stat('OPS');
    var chkB = stat('CHK');
    var rejB = stat('REJ');
    wrap.appendChild(stats);

    // 校验矩阵：格子随机进入 RUN → OK / NO
    var prefixes = kindKey === 'net'
      ? ['TLS', 'DTLS', 'PKT', 'RTP', 'SCTP', 'QUIC', 'IPsec', 'GRE']
      : ['RULE', 'SCOPE', 'ACL', 'ROLE', 'DLP', 'RATE', 'QUOTA', 'POL'];

    var grid = document.createElement('div');
    grid.className = 'bs-swarm-grid';

    var cells = [];
    for (var c = 0; c < 18; c++) {
      var cell = document.createElement('div');
      cell.className = 'bs-swarm-cell';
      var nm = document.createElement('span');
      nm.className = 'bs-swarm-name';
      nm.textContent = pick(prefixes) + '·' + padl(c + 1, 2);
      var st = document.createElement('span');
      st.className = 'bs-swarm-state';
      st.textContent = '···';
      cell.appendChild(nm);
      cell.appendChild(st);
      grid.appendChild(cell);
      cells.push({ el: cell, st: st, mode: 'idle', cool: 1 + Math.floor(Math.random() * 8) });
    }
    wrap.appendChild(grid);

    // 滚动文字
    var logBox = document.createElement('div');
    logBox.className = 'bs-mix-log';
    wrap.appendChild(logBox);
    var log = makeLogger(logBox, 22);

    body.appendChild(wrap);

    var ops = 0, chk = 0, rej = 0;

    function fmt(n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function setCell(cell, mode) {
      cell.mode = mode;
      cell.el.className = 'bs-swarm-cell' + (mode === 'idle' ? '' : ' bs-' + mode);
      cell.st.textContent =
        mode === 'idle' ? '···' : mode === 'run' ? 'RUN' : mode === 'ok' ? 'OK' : 'NO';
    }

    // tick 驱动格子状态机 + 计数 + 日志行
    return { tick: function () {
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (cell.cool > 0) {
          cell.cool--;
          if (cell.cool === 0 && cell.mode !== 'idle') setCell(cell, 'idle');
          continue;
        }
        if (Math.random() < 0.16) {
          if (cell.mode === 'idle') {
            setCell(cell, 'run');
            chk++;
            cell.cool = 1;
          } else if (cell.mode === 'run') {
            var bad = Math.random() < 0.06;
            setCell(cell, bad ? 'bad' : 'ok');
            ops++;
            if (bad) rej++;
            cell.cool = 2 + Math.floor(Math.random() * 5);
          }
        }
      }

      opsB.textContent = fmt(ops);
      chkB.textContent = fmt(chk);
      rejB.textContent = fmt(rej);

      log(kind.gen());
    } };
  }

  function pushLine(win, line) {
    var row = document.createElement('div');
    row.className = 'bs-ln' + (line.cls ? ' ' + line.cls : '');
    row.textContent = line.text;
    win.body.appendChild(row);

    // 限制节点数，超出就丢掉最旧的
    while (win.body.childElementCount > 420) {
      win.body.removeChild(win.body.firstChild);
    }

    // 滚到底，形成持续刷屏的观感
    win.body.scrollTop = win.body.scrollHeight;
  }

  // ── 布局：底层 4 窗拼接铺满（大小不一，仍严丝合缝）───────────────────────

  function tile4(vw, vh) {
    var g = 8;

    // 横向分割点：上排左边窄、下排左边宽
    var splitTop = 0.40;    // 上排：左窗占 40% 宽
    var splitBot = 0.63;    // 下排：左窗占 63% 宽

    // 纵向分割点：上排矮、下排高
    var splitRow = 0.38;

    var innerW = vw - g * 3;
    var innerH = vh - g * 3;

    var topH = Math.round(innerH * splitRow);
    var botH = innerH - topH;

    var tlW = Math.round(innerW * splitTop);
    var trW = innerW - tlW;

    var blW = Math.round(innerW * splitBot);
    var brW = innerW - blW;

    return [
      { x: g,               y: g,               w: tlW, h: topH },  // 左上：窄而矮
      { x: g + tlW + g,     y: g,               w: trW, h: topH },  // 右上：宽而矮
      { x: g,               y: g + topH + g,    w: blW, h: botH },  // 左下：宽而高
      { x: g + blW + g,     y: g + topH + g,    w: brW, h: botH }   // 右下：窄而高
    ];
  }

  // ── 布局：上层叠加窗口（随机位置，彼此错开覆盖）─────────────────────────

  function overlaySlots(vw, vh, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var w = Math.round(vw * (0.30 + Math.random() * 0.16));
      var h = Math.round(vh * (0.32 + Math.random() * 0.22));
      var x = Math.round(24 + Math.random() * Math.max(1, vw - w - 48));
      var y = Math.round(24 + Math.random() * Math.max(1, vh - h - 48));
      out.push({ x: x, y: y, w: w, h: h });
    }
    return out;
  }

  // ── 主流程 ───────────────────────────────────────────────────────────────

  function enterPhase2() {
    // 第一阶段内容退场
    fadeOutEl(els.stage, 380);
    fadeOutEl(els.log, 380);
    fadeOutEl(els.tl, 380);
    fadeOutEl(els.tr, 380);

    var wall = document.createElement('div');
    wall.className = 'bs-wall';
    root.appendChild(wall);
    els.wall = wall;

    var vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;

    var wins = [];
    var all = [];

    // ① 底层 4 个窗口，大小不一地拼接铺满整屏
    //    kernel / auth 文字滚动；fs 进度条+文字；net 校验矩阵+日志
    var baseKinds = ['kernel', 'fs', 'auth', 'net'];
    var baseSlots = tile4(vw, vh);
    var baseTicks = { kernel: 34, fs: 60, auth: 46, net: 56 };

    baseKinds.forEach(function (k, i) {
      later(function () {
        var win = buildWindow(baseSlots[i], k, i);
        win.el.classList.add('bs-win-tile');
        wall.appendChild(win.el);
        wins.push(win);
        all.push(win);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { win.el.classList.add('bs-win-in2'); });
        });

        var step = baseTicks[k] || 40;
        startStream(function () {
          if (win.view) win.view.tick();
          else pushLine(win, win.kind.gen());
        }, step);
      }, scaled(i * 55));
    });

    // ② 上层依次叠加 4 个窗口
    //    vault shard 格 / policy 校验矩阵 / crypto 四哈希进度 / hex 十六进制
    var overKinds = ['vault', 'policy', 'crypto', 'hex'];
    var overSlots = overlaySlots(vw, vh, overKinds.length);
    var overTicks = { vault: 62, policy: 58, crypto: 70, hex: 54 };

    overKinds.forEach(function (k, i) {
      later(function () {
        var win = buildWindow(overSlots[i], k, 10 + i);
        wall.appendChild(win.el);
        all.push(win);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { win.el.classList.add('bs-win-in2'); });
        });

        var step = overTicks[k] || 50;
        startStream(function () {
          if (win.view) win.view.tick();
          else pushLine(win, win.kind.gen());
        }, step);
      }, scaled(430 + i * 190));
    });

    // ③ 停刷：所有窗口定格，逐个落「校验完成」结论
    var stopAt = 3100;
    later(function () {
      stopAllStreams();
      all.forEach(function (win, i) {
        later(function () { settleWindow(win, i); }, i * 45);
      });
    }, scaled(stopAt));

    // ④ 终幕大字：压在所有窗口之上
    var grantAt = stopAt + all.length * 45 + 260;
    later(function () { showGrant(); }, scaled(grantAt));

    // ⑤ 大字亮起后，背后的窗口整体退场
    later(function () { dismissWall(); }, scaled(grantAt + 700));

    // ⑥ 收尾：让大字多停留一会儿再白闪
    later(function () { finish(); }, scaled(grantAt + 3200));
  }

  // 终幕时让窗口墙整体退场，只留中央大字
  function dismissWall() {
    if (!els.wall) return;
    var wins = els.wall.querySelectorAll('.bs-win');
    for (var i = 0; i < wins.length; i++) {
      (function (n) {
        setTimeout(function () {
          n.style.transition = 'opacity .55s ease, transform .55s ease, filter .55s ease';
          n.style.opacity = '0';
          n.style.transform = 'scale(.97)';
          n.style.filter = 'blur(2px)';
        }, n * 26);
      })(i);
    }
  }

  // ── 终态：每个窗口一种不同的「通过」表现 ─────────────────────────────────

  function doneEl(cls) {
    var d = document.createElement('div');
    d.className = 'bs-dn ' + (cls || '');
    return d;
  }

  // A. 日志收束：列出最后几行并打出结论
  function settleLog(win, d) {
    var head = doneEl('bs-dn-head');
    head.textContent = d.head;
    win.done.appendChild(head);

    (d.lines || []).forEach(function (t, i) {
      var row = doneEl('bs-ln');
      row.textContent = t;
      win.done.appendChild(row);
      later(function () {
        if (row.parentNode) row.classList.add('bs-in');
      }, i * 90);
    });

    var ok = doneEl('bs-dn-ok bs-in');
    ok.textContent = '✓ ' + d.head;
    win.done.appendChild(ok);
  }

  // B. 十六进制校验尾块
  function settleHex(win, d) {
    var head = doneEl('bs-dn-head');
    head.textContent = d.head;
    win.done.appendChild(head);

    (d.lines || []).forEach(function (t, i) {
      var row = doneEl('bs-ln dim');
      row.textContent = t;
      win.done.appendChild(row);
      later(function () {
        if (row.parentNode) row.classList.add('bs-in');
      }, i * 70);
    });

    var tag = doneEl('bs-dn-code bs-in');
    tag.textContent = 'HASH ✓ MATCH  ·  SIGNATURE ✓ VALID';
    win.done.appendChild(tag);
  }

  // C. 进度条全部拉满
  function settleBars(win, d) {
    var cap = doneEl('bs-dn-cap');
    cap.textContent = d.label;
    win.done.appendChild(cap);

    (d.bars || []).forEach(function (b, i) {
      var row = doneEl('bs-dn-row');
      var name = document.createElement('span');
      name.className = 'bs-dn-name';
      name.textContent = b[0];
      var track = document.createElement('span');
      track.className = 'bs-dn-track';
      var fill = document.createElement('i');
      track.appendChild(fill);
      row.appendChild(name);
      row.appendChild(track);
      win.done.appendChild(row);

      later(function () {
        if (!row.parentNode) return;
        fill.style.width = (b[1] != null ? b[1] : 100) + '%';
      }, 90 + i * 80);
    });
  }

  // D. 盖章式通过
  function settleStamp(win, d) {
    var head = doneEl('bs-dn-head');
    head.textContent = d.head;
    win.done.appendChild(head);

    var stamp = doneEl('bs-dn-stamp');
    stamp.textContent = d.stamp;
    win.done.appendChild(stamp);

    later(function () {
      if (stamp.parentNode) stamp.classList.add('bs-in');
    }, 120);

    (d.lines || []).forEach(function (t) {
      var row = doneEl('bs-ln dim');
      row.textContent = t;
      win.done.appendChild(row);
    });
  }

  var SETTLERS = { log: settleLog, hex: settleHex, bars: settleBars, stamp: settleStamp };

  // 窗口定格：切到各自的终态视图
  function settleWindow(win, i) {
    if (!win || !win.el || !win.el.parentNode) return;

    win.el.classList.add('bs-win-pass');
    win.status.textContent = 'COMPLETE';
    win.fill.style.width = '100%';

    // 收起刷屏区，露出终态区
    win.body.style.display = 'none';
    win.done.hidden = false;

    var d = win.kind.done || { view: 'log', head: 'COMPLETE', lines: [] };
    var fn = SETTLERS[d.view] || settleLog;
    fn(win, d);
  }

  // 淡出并彻底移除，保证第一段不残留在窗口墙下面
  function fadeOutEl(el, ms) {
    if (!el) return;
    var sec = (ms / 1000) + 's';
    el.style.transition = 'opacity ' + sec + ' ease, transform ' + sec + ' ease';
    el.style.opacity = '0';
    el.style.transform = 'scale(.985)';
    el.style.pointerEvents = 'none';
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, ms + 60);
  }

  // 中央展开的通过文字
  function showGrant() {
    if (!root) return;

    // 只做轻压暗，让大字仍明显压在窗口之上，而不是被暗幕吞掉
    var dimmer = document.createElement('div');
    dimmer.className = 'bs-grant-dim';
    root.appendChild(dimmer);
    requestAnimationFrame(function () { dimmer.classList.add('bs-on'); });

    var grant = document.createElement('div');
    grant.className = 'bs-grant';

    var main = document.createElement('div');
    main.className = 'bs-grant-main';
    main.textContent = String(cfg.grantText || 'ACCESS GRANTED');

    var sub = document.createElement('div');
    sub.className = 'bs-grant-sub';
    sub.textContent = String(cfg.grantSub || 'IDENTITY VERIFIED · ALL CLEARANCES PASSED');

    grant.appendChild(main);
    grant.appendChild(sub);

    var edgeL = document.createElement('i');
    edgeL.className = 'bs-grant-edge bs-grant-edge-l';
    var edgeR = document.createElement('i');
    edgeR.className = 'bs-grant-edge bs-grant-edge-r';
    grant.appendChild(edgeL);
    grant.appendChild(edgeR);

    root.appendChild(grant);
    els.grant = grant;

    // 基础状态即可见；动画只负责「展开」过程。
    grant.classList.add('bs-grant-in');

    // 兜底：动画结束后清掉展开动画，锁定为完全可见的终态，并开始呼吸
    setTimeout(function () {
      if (!grant) return;
      grant.classList.remove('bs-grant-in');
      grant.classList.add('bs-grant-lit');
      grant.style.opacity = '1';
      grant.style.clipPath = 'inset(0 0 0 0)';
      grant.style.webkitClipPath = 'inset(0 0 0 0)';
    }, 560);
  }

  // ── 主流程 ────────────────────────────────────────────────────────────────
  function boot() {
    var logo = mount();

    // 挂在文档里之后再测量路径长度
    var items = prepareLogo(logo);
    var drawTotal = playLogo(logo, items);

    later(function () {
      els.bootText.classList.add('bs-show');
    }, scaled(2000));

    var logStart = 1050;
    var logGap = 205;
    LOG_LINES.forEach(function (line, i) {
      later(function () { pushLog(line); }, scaled(logStart + i * logGap));
    });

    later(function () { skippable = true; }, scaled(650));

    // 第一段收尾时机：标志写完、日志打完，取较晚者
    var logEnd = logStart + (LOG_LINES.length - 1) * logGap;
    var phase1End = Math.max(drawTotal + scaled(1300), logEnd + scaled(950));

    later(function () {
      if (cfg.phase2) enterPhase2();
      else finish();
    }, phase1End);
  }

  // ── 收尾 ──────────────────────────────────────────────────────────────────
  function finish() {
    if (finished) return;
    finished = true;
    skippable = false;
    clearAllTimers();
    stopAllStreams();
    document.removeEventListener('keydown', onKey, true);

    if (els.flash) els.flash.classList.add('bs-fire');

    setTimeout(function () {
      if (root) root.classList.add('bs-out');
    }, 220);

    setTimeout(function () {
      if (root) { root.remove(); root = null; }
      document.documentElement.classList.remove('bs-lock');
      unmountCaptionTheme();
      window.__DSH_STARTUP_BOOT__ = window.__DSH_STARTUP_BOOT__ || 'client';
      window.dispatchEvent(new CustomEvent('dsh-startup:done'));
    }, 700);
  }

  // ── 对外 API ──────────────────────────────────────────────────────────────
  function replay() {
    clearAllTimers();
    stopAllStreams();
    document.removeEventListener('keydown', onKey, true);
    if (root) { root.remove(); root = null; }
    document.documentElement.classList.remove('bs-lock');
    unmountCaptionTheme();
    finished = false;
    skippable = false;
    cfg = readCfg();
    boot();
  }

  window.__DSH_STARTUP_API__ = { replay: replay, skip: finish };

  // ── 启动 ──────────────────────────────────────────────────────────────────
  if (!shouldPlay()) {
    document.documentElement.classList.remove('bs-lock');
    unmountCaptionTheme();
    var stale = document.getElementById('dsh-startup-root');
    if (stale) stale.remove();
    window.__DSH_STARTUP_BOOT__ = window.__DSH_STARTUP_BOOT__ || 'client';
    return;
  }

  try {
    boot();
  } catch (err) {
    console.error('[dsh-startup-screen] 启动失败：', err);
    finished = true;
    clearAllTimers();
    if (root) root.remove();
    document.documentElement.classList.remove('bs-lock');
    unmountCaptionTheme();
  }
})();
