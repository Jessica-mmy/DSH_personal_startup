// dsh-startup-screen (DIY 版) — Host 半
//
// 职责：
//   1. webServer.register 前缀路由 /dsh-startup/*：splash.js / splash.css / config
//   2. webServer.tapIndex 在 index.html 末尾注入样式、配置与 splash.js
//
// 约定（对照 dsh-our-free-model 等真实插件）：
//   - 入口是 apply(ctx, config)，不是 setup()
//   - webServer 是可选服务，用 ctx.inject(['webServer'], ...) 等它出现
//   - 路由用 server.register({ kind, path, handler })，handler 是 (req, res)
//   - HTML 注入用 server.tapIndex(transform)

import { createReadStream } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const id = 'dsh-startup-screen';
export const name = 'dsh-startup-screen';
export const inject = [];

const LIB_DIR = fileURLToPath(new URL('./', import.meta.url));

// ---- 默认配置（与 lib/splash.js 的 DEFAULTS 保持一致）------------------------
export const defaults = {
  enabled: true,
  mode: 'session',            // session | daily | always
  speed: 1,
  allowSkip: true,
  brand1: 'DEEPSEEK',
  brand2: 'SYNTHESIZE INTELLIGENCE',
  brand3a: 'HARNESS',
  brand3b: 'OS',
  orgSub: 'DEEPSEEK HARNESS',
  accent: '#e8a020',
  glitchA: '#e05030',
  phase2: true,
  grantText: 'ACCESS GRANTED',
  grantSub: 'IDENTITY VERIFIED · ALL CLEARANCES PASSED'
};

// tapIndex 注入片段：样式 + 内联配置 + 动画脚本（defer，DOM 解析完即播）
const INDEX_INJECT =
  '<link rel="stylesheet" href="/dsh-startup/splash.css">' +
  '<script>window.__DSH_STARTUP__=' + JSON.stringify(defaults) + ';</script>' +
  '<script defer src="/dsh-startup/splash.js"></script>';

const MIME = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

function sendFile(res, filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('not found');
  });
  stream.pipe(res);
}

// /dsh-startup/* 前缀路由处理器
function createHandler() {
  return function handle(req, res) {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch (e) {
      res.writeHead(400).end('bad request');
      return;
    }

    const rel = pathname.replace(/^\/dsh-startup\/?/, '');

    if (rel === 'splash.js') return sendFile(res, join(LIB_DIR, 'splash.js'));
    if (rel === 'splash.css') return sendFile(res, join(LIB_DIR, 'splash.css'));

    if (rel === 'config') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.method === 'POST') {
        req.resume();
        req.on('end', () => {
          res.end(JSON.stringify({ ok: true }));
        });
        return;
      }
      res.end(JSON.stringify(defaults));
      return;
    }

    if (rel.startsWith('asset/')) {
      // 防目录穿越：解析后必须仍在 lib/assets 内
      const name = decodeURIComponent(rel.slice('asset/'.length));
      const assetsDir = join(LIB_DIR, 'assets') + sep;
      const filePath = normalize(join(LIB_DIR, 'assets', name));
      if (!filePath.startsWith(assetsDir)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      return sendFile(res, filePath);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  };
}

// ---- 供 cordis 调用的入口 ---------------------------------------------------
export function apply(ctx) {
  const logger = ctx.logger ?? console;

  // 桌面端不经过 tapIndex 的 HTML 变换：Web 载体把行表渲染进 index.html，
  // Desktop 载体则随 boot payload 在页面侧、__DSH_BOOT_READY__ 之前应用。
  // 两条通道共用这一张表，所以动画注入必须走 webserver/index-inject 行，
  // 不能只靠 tapIndex。splash.js 自带防重入（__DSH_STARTUP_API__ 已存在即退出），
  // 与下方 tapIndex 在 web 端的双注入是安全的。
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'global', name: '__DSH_STARTUP__', value: defaults });
    table.push({ kind: 'html', placement: 'head', html: '<link rel="stylesheet" href="/dsh-startup/splash.css">' });
    table.push({ kind: 'script-src', placement: 'body', src: '/dsh-startup/splash.js' });
  });

  ctx.inject(['webServer'], scoped => {
    const server = scoped.webServer;

    scoped.effect(() => server.register({
      kind: 'prefix',
      path: '/dsh-startup',
      handler: createHandler()
    }), 'dsh-startup-screen: asset routes');

    scoped.effect(() => server.tapIndex(html =>
      html.replace('</body>', INDEX_INJECT + '</body>')
    ), 'dsh-startup-screen: index inject');

    logger.info?.('dsh-startup-screen: routes + index inject mounted');
  });
}
