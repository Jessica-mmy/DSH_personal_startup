import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const lib = resolve(here, '..', 'lib');
const preview = resolve(here, '..', 'preview', 'index.html');

const js = readFileSync(join(lib, 'splash.js'), 'utf8');
const css = readFileSync(join(lib, 'splash.css'), 'utf8');
const html = readFileSync(preview, 'utf8');

// 提取预览页里注入的配置块，确认与新 JS 的配置键一致
const cfgMatch = html.match(/window\.__DSH_STARTUP__\s*=\s*\{([\s\S]*?)\};/);
if (!cfgMatch) { console.log('× 预览页没有配置块'); process.exit(1); }

const usedKeys = new Set(
  [...cfgMatch[1].matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm)].map((m) => m[1])
);

const defaultsBlock = js.match(/var DEFAULTS = \{([\s\S]*?)\n  \};/);
const defaultKeys = new Set(
  [...defaultsBlock[1].matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm)].map((m) => m[1])
);

const unknown = [...usedKeys].filter((k) => !defaultKeys.has(k));
const unused = [...defaultKeys].filter((k) => !usedKeys.has(k));

console.log('新 JS 的配置键 :', [...defaultKeys].sort().join(' '));
console.log('预览页传入的键 :', [...usedKeys].sort().join(' '));
console.log('预览页多传（会被忽略）:', unknown.length ? unknown.join(' ') : '（无）');
console.log('预览页未传（用默认值）:', unused.length ? unused.join(' ') : '（无）');

// 预览页控制台字段 → 配置键映射检查
const idToKey = [
  ['fBrand1', 'brand1'], ['fBrand2', 'brand2'],
  ['fBrand3a', 'brand3a'], ['fBrand3b', 'brand3b'],
  ['fOrgSub', 'orgSub'], ['fAccent', 'accent'],
  ['fGlitchA', 'glitchA'], ['fSpeed', 'speed'], ['fSkip', 'allowSkip']
];
const badMap = idToKey.filter(([id]) => !html.includes('id="' + id + '"'));
console.log('\n控制台控件缺失:', badMap.length ? badMap.map(([i]) => i).join(' ') : '（无）');

// 确认 applyConfig 里确实写了这些键
const applyBlock = html.match(/function applyConfig\(\)\s*\{([\s\S]*?)\n  \}/);
const missingWrites = idToKey.filter(([, key]) => !applyBlock[1].includes('c.' + key));
console.log('applyConfig 漏写的键:', missingWrites.length ? missingWrites.map(([, k]) => k).join(' ') : '（无）');
