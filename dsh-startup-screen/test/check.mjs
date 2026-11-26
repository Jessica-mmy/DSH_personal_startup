import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const lib = join(here, '..', 'lib');

const js = readFileSync(join(lib, 'splash.js'), 'utf8');
const css = readFileSync(join(lib, 'splash.css'), 'utf8');
const html = readFileSync(join(here, '..', 'preview', 'index.html'), 'utf8');

// 1) ES module 语法检查（必须是普通脚本）
const esm = /^\s*import\s/m.test(js) || /^\s*export\s/m.test(js);
console.log('ES module 语法:', esm ? '有（有问题）' : '无（可直接双击运行）');

// 2) 类名一致性：JS 里出现的 bs-* 是否在 CSS 里定义
const used = new Set();
for (const m of js.matchAll(/['"`](bs-[a-z0-9-]+)['"`]/g)) used.add(m[1]);
for (const m of js.matchAll(/classList\.(?:add|contains|toggle)\(\s*['"]([a-z0-9-]+)['"]/g)) used.add(m[1]);
for (const m of js.matchAll(/div\(\s*['"]([^'"]+)['"]/g)) {
  m[1].split(/\s+/).forEach((c) => used.add(c));
}

const missing = [...used]
  .filter((c) => c.startsWith('bs-'))
  .filter((c) => !new RegExp('[.\\s,]' + c + '([\\s,{:.\\[]|$)').test(css));

console.log('\nJS 引用的 bs-* 类名:', [...used].filter((c) => c.startsWith('bs-')).sort().join(' '));
console.log('CSS 中缺失的定义:', missing.length ? missing.join(' ') : '（无）');

// 3) JS 引用的元素 id 是否在 HTML 中存在（config 输入框）
const ids = [...js.matchAll(/getElementById\(['"]([a-z0-9-]+)['"]/g)].map((m) => m[1]);
const missingIds = [...new Set(ids)].filter((id) => !html.includes('id="' + id + '"') && id !== 'dsh-startup-root');
console.log('JS 引用的元素 id 缺失:', missingIds.length ? missingIds.join(' ') : '（无，dsh-startup-root 由 JS 自建）');

// 4) 预览页是否正确加载脚本与样式
console.log('\n预览页加载 splash.css:', html.includes('../lib/splash.css') ? 'OK' : '缺失');
console.log('预览页加载 splash.js :', html.includes('../lib/splash.js') ? 'OK' : '缺失');
console.log('预览页 script 无 type=module:', /<script[^>]*src="\.\.\/lib\/splash\.js"[^>]*type=/.test(html) ? '有（有问题）' : 'OK');
