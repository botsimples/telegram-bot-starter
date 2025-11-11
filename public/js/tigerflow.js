(() => {
  const q = sel => document.querySelector(sel);
  const qa = sel => Array.from(document.querySelectorAll(sel));

  const nodesWrap = q('#nodes');
  const edgesCanvas = q('#edges');
  const ctx = edgesCanvas.getContext('2d');

  const state = {
    zoom: 1,
    snap: true,
    dragging: null,    // { id, offX, offY }
    connecting: null,  // { fromNodeId, fromPort }  fromPort: 'out'
    selectedId: null,
    nodes: [],
    edges: [],
    flowId: window.__FLOW_ID__ || '',
    nameEl: q('#flowName'),
  };

  function fitCanvas() {
    const r = edgesCanvas.getBoundingClientRect();
    edgesCanvas.width  = r.width  * devicePixelRatio;
    edgesCanvas.height = r.height * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawEdges();
  }

  function gridSnap(v) {
    if (!state.snap) return v;
    const s = 10;
    return Math.round(v / s) * s;
  }

  function uid() {
    return 'n' + Math.random().toString(36).slice(2,8);
  }

  // ------- NODES -------
  function renderNodes() {
    nodesWrap.innerHTML = '';
    state.nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = 'tf-node' + (state.selectedId === n.id ? ' selected' : '');
      el.style.left = (n.x * state.zoom) + 'px';
      el.style.top  = (n.y * state.zoom) + 'px';
      el.style.transform = `scale(${state.zoom})`;
      el.dataset.id = n.id;

      el.innerHTML = `
        <div class="hd">
          <div class="title">${(n.data.title||n.type).slice(0,24)}</div>
          <div class="ports">
            <div class="tf-port in"    data-port="in"    title="Entrada"></div>
            <div class="tf-port out"   data-port="out"   title="Saída"></div>
          </div>
        </div>
        <div class="body">${n.data.summary || '—'}</div>
      `;
      nodesWrap.appendChild(el);

      // drag start (na área do header)
      const header = el.querySelector('.hd');
      header.addEventListener('mousedown', (ev) => {
        if (ev.button !== 0) return;
        const rect = el.getBoundingClientRect();
        state.dragging = {
          id: n.id,
          offX: (ev.clientX - rect.left) / state.zoom,
          offY: (ev.clientY - rect.top)  / state.zoom
        };
        el.style.cursor = 'grabbing';
      });

      // seleção
      el.addEventListener('mousedown', () => {
        state.selectedId = n.id;
        updateSide();
        renderNodes();
      });

      // conectar
      el.querySelectorAll('.tf-port').forEach(port => {
        port.addEventListener('mousedown', (ev) => {
          ev.stopPropagation();
          const p = port.dataset.port;
          if (p === 'out') {
            state.connecting = { fromNodeId: n.id, fromPort: 'out' };
          } else if (p === 'in' && state.connecting) {
            // finalizar conexão
            if (state.connecting.fromNodeId !== n.id) {
              state.edges.push({ from: `${state.connecting.fromNodeId}:out`, to: `${n.id}:in` });
              state.connecting = null;
              drawEdges();
            }
          }
        });
      });
    });
    drawEdges();
  }

  // ------- EDGES -------
  function getNode(id) { return state.nodes.find(n => n.id === id); }

  function drawEdges() {
    ctx.clearRect(0,0,edgesCanvas.width,edgesCanvas.height);

    // map de portas -> coordenadas
    const portPos = {};
    qa('.tf-node').forEach(el => {
      const id = el.dataset.id;
      const r = el.getBoundingClientRect();
      const header = el.querySelector('.hd').getBoundingClientRect();
      const inPort = el.querySelector('.tf-port.in').getBoundingClientRect();
      const outPort= el.querySelector('.tf-port.out').getBoundingClientRect();

      function mid(c) { return [ (c.left + c.right)/2, (c.top + c.bottom)/2 ]; }

      const [ix, iy] = mid(inPort);
      const [ox, oy] = mid(outPort);

      const cRect = edgesCanvas.getBoundingClientRect();

      portPos[`${id}:in`]  = [ix - cRect.left, iy - cRect.top];
      portPos[`${id}:out`] = [ox - cRect.left, oy - cRect.top];
    });

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.9)';

    state.edges.forEach(e => {
      const a = portPos[e.from], b = portPos[e.to];
      if (!a || !b) return;
      const cp = 0.35;
      const dx = Math.abs(b[0]-a[0]);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.bezierCurveTo(a[0]+dx*cp, a[1], b[0]-dx*cp, b[1], b[0], b[1]);
      ctx.stroke();
    });
  }

  // ------- SIDE PANEL -------
  function updateSide() {
    const sc = document.getElementById('sideContent');
    const n = getNode(state.selectedId);
    if (!n) { sc.innerHTML = '<p>Selecione um bloco…</p>'; return; }
    sc.innerHTML = `
      <label>Título</label>
      <input id="nTitle" value="${n.data.title||''}">
      <label>Resumo/Conteúdo</label>
      <textarea id="nSummary">${n.data.summary||''}</textarea>
      <label>Tipo</label>
      <select id="nType">
        <option ${n.type==='start'?'selected':''}>start</option>
        <option ${n.type==='message'?'selected':''}>message</option>
        <option ${n.type==='delay'?'selected':''}>delay</option>
        <option ${n.type==='condition'?'selected':''}>condition</option>
        <option ${n.type==='action'?'selected':''}>action</option>
      </select>
      <button id="nDel" style="width:100%;background:#2a0000;border:1px solid #550;color:#ffb">Excluir bloco</button>
    `;
    sc.querySelector('#nTitle').oninput   = (e)=>{ n.data.title = e.target.value; renderNodes(); markDirty(); };
    sc.querySelector('#nSummary').oninput = (e)=>{ n.data.summary = e.target.value; renderNodes(); markDirty(); };
    sc.querySelector('#nType').onchange   = (e)=>{ n.type = e.target.value; renderNodes(); markDirty(); };
    sc.querySelector('#nDel').onclick     = ()=>{ 
      // remove edges relacionadas
      state.edges = state.edges.filter(ed => !ed.from.startsWith(n.id+':') && !ed.to.startsWith(n.id+':'));
      state.nodes = state.nodes.filter(x => x.id !== n.id);
      state.selectedId = null;
      renderNodes(); markDirty(); updateSide();
    };
  }

  // ------- PALETTE DRAG-TO-CANVAS -------
  qa('.tf-block').forEach(b=>{
    b.addEventListener('click', ()=> {
      const rect = nodesWrap.getBoundingClientRect();
      const x = gridSnap((rect.width/2)/state.zoom + Math.random()*40-20);
      const y = gridSnap((rect.height/2)/state.zoom + Math.random()*40-20);
      const id = uid();
      state.nodes.push({ id, type:b.dataset.type, x, y, data:{ title: b.innerText, summary:'' } });
      state.selectedId = id;
      renderNodes(); updateSide(); markDirty();
    });
  });

  // ------- MOUSE MOVE / DRAG -------
  document.addEventListener('mousemove', (ev)=>{
    if (!state.dragging) return;
    const n = getNode(state.dragging.id);
    if (!n) return;
    const wrapRect = nodesWrap.getBoundingClientRect();
    const x = (ev.clientX - wrapRect.left)/state.zoom - state.dragging.offX;
    const y = (ev.clientY - wrapRect.top)/state.zoom  - state.dragging.offY;
    n.x = gridSnap(x);
    n.y = gridSnap(y);
    renderNodes();
    markDirty();
  });
  document.addEventListener('mouseup', ()=>{
    if (state.dragging) {
      state.dragging = null;
      qa('.tf-node').forEach(el=> el.style.cursor='grab');
    }
  });

  // ------- ZOOM -------
  function setZoom(z) {
    state.zoom = Math.max(0.5, Math.min(2, z));
    q('#zoomLabel').innerText = Math.round(state.zoom*100)+'%';
    renderNodes();
  }
  q('#btnZoomIn').onclick  = ()=> setZoom(state.zoom+0.1);
  q('#btnZoomOut').onclick = ()=> setZoom(state.zoom-0.1);
  q('#snapToggle').onchange = (e)=> state.snap = e.target.checked;

  // ------- NEW / SAVE / EXPORT -------
  function markDirty(){ q('#flowStatus').innerText='● alterações não salvas'; }
  q('#flowName').oninput = markDirty;

  q('#btnNew').onclick = ()=>{
    state.flowId = '';
    state.nodes = []; state.edges = [];
    q('#flowName').value = 'Novo Fluxo';
    renderNodes(); updateSide();
    q('#flowStatus').innerText='● novo fluxo';
  };

  q('#btnSave').onclick = async ()=>{
    const payload = {
      id: state.flowId || undefined,
      name: q('#flowName').value.trim() || 'Sem título',
      nodes: state.nodes,
      edges: state.edges,
      userId: '' // preencha se necessário
    };
    const res = await fetch('/api/flows', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    state.flowId = data._id;
    q('#flowStatus').innerText='✔ salvo';
    history.replaceState(null, '', '/tigerflow?id='+state.flowId);
  };

  function exportJSON(){
    const blob = new Blob([ JSON.stringify({
      name: q('#flowName').value, nodes: state.nodes, edges: state.edges
    }, null, 2) ], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (q('#flowName').value || 'fluxo')+'.json';
    a.click();
  }
  q('#btnExportJson').onclick = exportJSON;

  async function exportPNG(){
    // desenha nodes provisoriamente no canvas para export
    const c = document.createElement('canvas');
    const wr = edgesCanvas.getBoundingClientRect();
    c.width = wr.width * 2; c.height = wr.height * 2;
    const cx = c.getContext('2d'); cx.scale(2,2);

    // fundo
    cx.fillStyle = '#0a0a0a'; cx.fillRect(0,0,wr.width,wr.height);

    // edges
    cx.lineWidth=2; cx.strokeStyle='rgba(255,204,0,0.9)';
    state.edges.forEach(e=>{
      const fromEl = q(`.tf-node[data-id="${e.from.split(':')[0]}"] .tf-port.out`);
      const toEl   = q(`.tf-node[data-id="${e.to.split(':')[0]}"] .tf-port.in`);
      if (!fromEl || !toEl) return;
      const cRect = edgesCanvas.getBoundingClientRect();
      function mid(r){ return [(r.left+r.right)/2 - cRect.left, (r.top+r.bottom)/2 - cRect.top]; }
      const a = mid(fromEl.getBoundingClientRect());
      const b = mid(toEl.getBoundingClientRect());
      const dx = Math.abs(b[0]-a[0]);
      cx.beginPath();
      cx.moveTo(a[0],a[1]);
      cx.bezierCurveTo(a[0]+dx*0.35,a[1], b[0]-dx*0.35,b[1], b[0],b[1]);
      cx.stroke();
    });

    // nodes (caixa simples)
    state.nodes.forEach(n=>{
      const x = n.x*state.zoom, y=n.y*state.zoom;
      cx.fillStyle='#121212'; cx.strokeStyle='rgba(255,204,0,0.25)';
      cx.lineWidth=1; cx.beginPath();
      cx.roundRect(x,y,160*state.zoom,100*state.zoom,12);
      cx.fill(); cx.stroke();
      cx.fillStyle='#ffcc00'; cx.font=`${12*state.zoom}px sans-serif`;
      cx.fillText(n.data.title||n.type, x+10*state.zoom, y+18*state.zoom);
    });

    const url = c.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = (q('#flowName').value || 'fluxo')+'.png';
    a.click();
  }
  q('#btnExportPng').onclick = exportPNG;

  // ------- LOAD inicial (se veio com ?id=) -------
  async function boot() {
    fitCanvas(); window.addEventListener('resize', fitCanvas);
    q('#snapToggle').checked = true;
    if (state.flowId) {
      const r = await fetch('/api/flows/'+state.flowId);
      if (r.ok) {
        const f = await r.json();
        q('#flowName').value = f.name || 'Fluxo';
        state.nodes = f.nodes || [];
        state.edges = f.edges || [];
        q('#flowStatus').innerText='✔ carregado';
      }
    }
    renderNodes(); updateSide();

    // atalhos
    document.addEventListener('keydown',(e)=>{
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='s') {
        e.preventDefault(); q('#btnSave').click();
      }
      if (e.key==='Delete' && state.selectedId){
        const n = getNode(state.selectedId);
        state.edges = state.edges.filter(ed => !ed.from.startsWith(n.id+':') && !ed.to.startsWith(n.id+':'));
        state.nodes = state.nodes.filter(x => x.id !== n.id);
        state.selectedId = null; renderNodes(); updateSide(); markDirty();
      }
    });
  }
  boot();
})();
