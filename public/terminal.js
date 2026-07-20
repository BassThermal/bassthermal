(() => {
  'use strict';
  let box, input, out, catalogPromise;
  const commands = { help:'commands: help, apps, open <slug>, clear, close', close:'close terminal' };
  function loadCatalog(){ return catalogPromise ||= fetch('/catalog-lite.json').then(r=>r.json()).catch(()=>({apps:[]})); }
  function create(){ if(box) return; box=document.createElement('section'); box.className='bt-terminal'; box.hidden=true; box.innerHTML='<div class="bt-terminal-title"><span>bt:terminal</span><button type="button" aria-label="Close terminal">×</button></div><div class="bt-terminal-output" tabindex="0"></div><form class="bt-terminal-form"><span>bt:~$</span><input autocomplete="off" aria-label="Terminal command" /></form>'; document.body.appendChild(box); out=box.querySelector('.bt-terminal-output'); input=box.querySelector('input'); restore(); box.querySelector('button').onclick=hide; box.querySelector('form').onsubmit=e=>{e.preventDefault(); run(input.value.trim()); input.value='';}; drag(box.querySelector('.bt-terminal-title')); print('BassThermal terminal. Type help.'); }
  function show(){ create(); box.hidden=false; clamp(); input.focus(); loadCatalog(); }
  function hide(){ if(box) { save(); box.hidden=true; } }
  function toggle(){ if(box && !box.hidden) hide(); else show(); }
  function print(s){ out.insertAdjacentHTML('beforeend', `<div>${esc(s)}</div>`); out.scrollTop=out.scrollHeight; }
  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  async function run(cmd){ if(!cmd) return; print(`bt:~$ ${cmd}`); if(cmd==='clear'){out.textContent='';return;} if(cmd==='close'){hide();return;} if(cmd==='help'){print(commands.help);return;} const c=await loadCatalog(); if(cmd==='apps'){print(c.apps.filter(a=>a.visibility?.showInAppOverlay).map(a=>`${a.slug} — ${a.name}`).join('\n'));return;} if(cmd.startsWith('open ')){const slug=cmd.slice(5).trim(); const a=c.apps.find(x=>x.slug===slug); if(a?.links?.website) location.href=a.links.website; else print('not found'); return;} print('unknown command'); }
  function restore(){ try{const s=JSON.parse(localStorage.btTerminal||'{}'); Object.assign(box.style,{left:s.left,top:s.top,width:s.width,height:s.height});}catch{} }
  function save(){ if(!box) return; localStorage.btTerminal=JSON.stringify({left:box.style.left,top:box.style.top,width:box.style.width,height:box.style.height}); }
  function clamp(){ if(innerWidth<700){box.removeAttribute('style');return;} if(!box.style.left){box.style.width='720px';box.style.height='420px';box.style.left=Math.max(12,(innerWidth-720)/2)+'px';box.style.top=Math.max(12,(innerHeight-420)/2)+'px';} }
  function drag(handle){ let sx,sy,l,t; handle.addEventListener('pointerdown',e=>{ if(innerWidth<700) return; sx=e.clientX; sy=e.clientY; l=box.offsetLeft; t=box.offsetTop; handle.setPointerCapture(e.pointerId); }); handle.addEventListener('pointermove',e=>{ if(sx==null) return; box.style.left=Math.min(innerWidth-80,Math.max(0,l+e.clientX-sx))+'px'; box.style.top=Math.min(innerHeight-60,Math.max(0,t+e.clientY-sy))+'px'; }); handle.addEventListener('pointerup',()=>{sx=null; save();}); }
  document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();toggle();} else if(e.key==='Escape'&&box&&!box.hidden) hide(); });
})();
