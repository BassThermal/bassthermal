window.BT_STORE_ASSETS = (() => {
  'use strict';
  const svg = (label, stroke) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect x="48" y="48" width="864" height="444" fill="#050505" stroke="${stroke}" stroke-width="18"/><text x="480" y="308" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="168" font-weight="700" fill="${stroke}">${label}</text></svg>`)}`;
  const dtIcon = 'https://play-lh.googleusercontent.com/txuCsb-AVo50aVIlYS3guP7Gm9tzubyCahQ6QP5Yx7PWYaAwbBchQAfjtTGI99ppK-ulsPZsVC6tQ5wdFbfB%3Dw240-h480';
  const retroIcon = 'https://play-lh.googleusercontent.com/8t7-FbqdA-I9excKBXe4nlUqmcE9Vp80RTw9Q5oPFxhMwD1k6dewHWZEi-O2612N8EDhHObOySKb3DKcC02KVQ%3Dw240-h480';
  const copticIcon = 'https://play-lh.googleusercontent.com/_OvyNICX2Fxyv6AYMoTgcug77sOYBMHlJG9yi3ta4uO8amnY4HMfwQKR1pNFi5A5xlI3F5RvtyeQijnpV24vjwI%3Dw240-h480';
  return {
    generatedAt: '2026-05-11T13:29:00.000Z',
    source: 'seeded manifest; behavior lives in /asset-preview.js',
    apps: {
      dualticker: { icon:{fallback:dtIcon,android:dtIcon,windows:dtIcon,web:dtIcon}, screenshots:{ android:[
        'https://play-lh.googleusercontent.com/EFnNjHnnF74xwiJ2Ns1_Rra0vmd-5AeTc7M_TrpH5briADa-JMB_NX2u120vW7XNomgE6DCbJWWnG3h2IQuY9Q%3Dw526-h296',
        'https://play-lh.googleusercontent.com/I7GhdnM_HIVCmmhmBUDcxQsewyS6Vi-_fFtVg3rqYRzvTM0vPpiP6a-uiBy9bSKgMwQgYH8GpBTJyrIy6zYz%3Dw526-h296'
      ], windows:[svg('DT', '#58a6ff')], web:[
        'https://play-lh.googleusercontent.com/EFnNjHnnF74xwiJ2Ns1_Rra0vmd-5AeTc7M_TrpH5briADa-JMB_NX2u120vW7XNomgE6DCbJWWnG3h2IQuY9Q%3Dw526-h296'
      ] } },
      retrofy: { icon:{fallback:retroIcon,android:retroIcon,windows:retroIcon,web:null}, screenshots:{ android:[
        'https://play-lh.googleusercontent.com/n2ASarOu3Etf3HeWuIO7mEFoiK1KI47kxnDTxjeVqh-KVqq3oWjhMd4Ijo_TP6BlfRiIwsTeEaLvK_0YAu8z%3Dw526-h296',
        'https://play-lh.googleusercontent.com/DkKjhW0g0T_XtK0ew0Y-hDleLsU6AuP_tPCNLSHSi5oZ8gQ6GP0OzOOh2XH8UdPHbFESWR6TtG8ug9OOxuED3Os%3Dw526-h296'
      ], windows:[svg('RF', '#7ee787')], web:[] } },
      'coptic-dictionary': { icon:{fallback:copticIcon,android:copticIcon,windows:copticIcon,web:null}, screenshots:{ android:[
        'https://play-lh.googleusercontent.com/CG2Q4El_lEQlFQRIa2uZe0Jf20QDQASWeWOvkUfGZJyxNF-12JyLNt1JBXrbo0aCukKbD84TG_sehXADI4e15A%3Dw526-h296',
        'https://play-lh.googleusercontent.com/GXRx3j_2Jxy7EkYLzJci7WnUGxyHJ3l_oWsnxSCJgnYpjfbZAZ3VpAu5UU5O2NJjEgEHl3zZEV8vAEsqd7z6H6w%3Dw526-h296'
      ], windows:[svg('CD', '#d29922')], web:[] } },
      'icon-pack-builder': { icon:{fallback:svg('IP','#58a6ff'),windows:svg('IP','#58a6ff'),android:null,web:null}, screenshots:{android:[],windows:[svg('IP','#58a6ff')],web:[]} },
      'favicon-harvester': { icon:{fallback:svg('FH','#ffa657'),windows:svg('FH','#ffa657'),android:null,web:null}, screenshots:{android:[],windows:[svg('FH','#ffa657')],web:[]} },
      'isbn-manager': { icon:{fallback:svg('IS','#d2a8ff'),windows:svg('IS','#d2a8ff'),android:null,web:null}, screenshots:{android:[],windows:[svg('IS','#d2a8ff')],web:[]} },
      'rss-finder': { icon:{fallback:svg('RS','#484f58'),windows:svg('RS','#484f58'),android:null,web:null}, screenshots:{android:[],windows:[],web:[svg('RS','#484f58')]} }
    }
  };
})();

(() => {
  if (document.querySelector('script[data-bt-asset-preview]')) return;
  const script = document.createElement('script');
  script.src = '/asset-preview.js?v=stable-v3';
  script.defer = true;
  script.dataset.btAssetPreview = '1';
  document.head.appendChild(script);
})();
