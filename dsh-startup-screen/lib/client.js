// dsh-startup-screen (DIY 版) — 浏览器半侧入口 (client.js)
//
// 动画本体由 Host 半侧通过 tapIndex 注入 splash.js 直接播放；
// 本文件负责：
//   1. 在设置页注册一个「启动动画」分区（验证 client 半侧是否加载）
//   2. 展示 /dsh-startup/config 的实时配置（验证 Host 半侧路由是否存活）
//   3. 提供「重播」按钮（调 splash.js 暴露的 window.__DSH_STARTUP_API__.replay）
//
// 约定对齐 dsh-our-free-model/client.js：
//   window.__ModuleLoader__.load({ id, factory })，factory 内 require('react')，
//   exports.apply(ctx) 里用 ctx.slots.inject + ctx.slots.register 挂 settings.section。

(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.__ModuleLoader__) {
    console.warn('[dsh-startup-screen] window.__ModuleLoader__ 不存在，client 半侧未被装载');
    return;
  }

  window.__ModuleLoader__.load({
    id: 'dsh-startup-screen',
    factory: function (require) {
      var module = { exports: {} };
      var exports = module.exports;
      var React = require('react');
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;

      var NS = 'settings.dshStartupScreen';

      function apply(ctx) {
        console.log('[dsh-startup-screen] client apply() 已执行');

        ctx.slots.inject('settings.section', function () {
          return ctx.slots.register({
            name: 'settings.section',
            id: 'dsh-startup-screen',
            order: 90,
            label: function () { return '启动动画'; },
            locale: NS
          }, function (props) {
            return h(SettingsSection, props);
          });
        });
      }

      function SettingsSection() {
        var _s = useState(null);
        var cfg = _s[0], setCfg = _s[1];
        var _e = useState('');
        var err = _e[0], setErr = _e[1];

        useEffect(function () {
          var alive = true;
          fetch('/dsh-startup/config', { headers: { accept: 'application/json' } })
            .then(function (r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.json();
            })
            .then(function (data) { if (alive) setCfg(data); })
            .catch(function (e) { if (alive) setErr(String(e && e.message || e)); });
          return function () { alive = false; };
        }, []);

        function replay() {
          var api = window.__DSH_STARTUP_API__;
          if (api && typeof api.replay === 'function') api.replay();
          else alert('splash.js 未提供 __DSH_STARTUP_API__（Host 半侧注入可能未生效）');
        }

        var box = { padding: '16px', fontFamily: 'monospace', fontSize: '13px' };
        var row = { margin: '6px 0' };
        var btn = {
          padding: '6px 14px', cursor: 'pointer',
          background: '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px'
        };

        return h('div', { style: box },
          h('div', { style: { fontWeight: 'bold', marginBottom: '10px' } }, 'dsh-startup-screen'),
          h('div', row, 'Host 半侧 /dsh-startup/config：',
            cfg ? h('span', { style: { color: '#3fb950' } }, '已连接') : (err ? h('span', { style: { color: '#f85149' } }, '失败：' + err) : '加载中…')),
          cfg ? h('pre', { style: { fontSize: '12px', opacity: 0.8, whiteSpace: 'pre-wrap' } }, JSON.stringify(cfg, null, 2)) : null,
          h('div', row,
            h('span', null, 'splash.js API：',
              window.__DSH_STARTUP_API__ ? h('span', { style: { color: '#3fb950' } }, '已挂载') : h('span', { style: { color: '#d29922' } }, '未挂载（动画可能未注入或已跳过）'))),
          h('button', { style: btn, onClick: replay }, '重播启动动画')
        );
      }

      exports.apply = apply;
      exports.inject = ['slots'];
      exports.name = 'dsh-startup-screen';
      return module.exports;
    }
  });
})();
