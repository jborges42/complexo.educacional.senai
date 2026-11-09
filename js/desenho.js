'use strict';
/* Editor da planta no estilo dos quadros brancos (Miro, Excalidraw). Só age no modo edição, seção "Planta".
   - Câmera própria: a roda rola a vista; Ctrl/⌘ + roda ou pinça dão zoom no ponto do mouse; Espaço, botão do meio ou a Mão arrastam.
   - Ferramentas: sala, zona e circulação (arrastar desenha), parede (ponto a ponto), porta, texto e indicação de acesso.
   - Seleção: clique, Shift+clique, laço no vazio; 8 alças; Alt+arrastar duplica; Shift trava o eixo; Ctrl/⌘ (no Mac, ⌘) desliga o ímã.
   - As paredes do contorno de uma sala acompanham a sala (mover, redimensionar, duplicar, excluir). Arrastar uma parede encostada em
     outras empurra: as paredes ligadas esticam e os espaços com a borda inteira sobre ela mudam de tamanho. */

// TOL < 1: as coordenadas são inteiras e o menor passo é 1, então uma parede a 1 unidade da borda não é dela.
const TOL = .5, IMA_PX = 6, PERTO_PX = 160, ZMIN = 0.15, ZMAX = 8, TOPO_UI = 60;
const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const FERRAMENTAS = {
  sel: ['Selecionar e mover', 'V', 'Clique para selecionar · arraste para mover · Shift+clique soma à seleção · arraste no vazio para pegar uma área · dois cliques renomeiam'],
  mao: ['Mover a vista', 'H', 'Arraste para mover a vista · a roda do mouse rola · Ctrl + roda (ou pinça) dá zoom'],
  sala: ['Sala', 'S', 'Arraste para desenhar a sala (um clique cria uma sala padrão) · Shift deixa quadrada'],
  zona: ['Zona aberta', 'Z', 'Arraste para desenhar uma zona aberta (contorno tracejado, sem paredes)'],
  piso: ['Circulação', 'C', 'Arraste para desenhar uma área de circulação (corredor, hall)'],
  parede: ['Parede', 'P', 'Clique ponto a ponto (ou arraste) para desenhar paredes retas · Esc, Enter ou dois cliques terminam'],
  porta: ['Porta', 'O', 'Clique sobre uma parede para pôr a porta · ela abre para o lado em que você clicou'],
  texto: ['Texto', 'T', 'Clique onde o texto deve ficar e digite'],
  acesso: ['Indicação de acesso', 'A', 'Arraste do texto até o ponto de acesso para desenhar a seta (ex.: ENTRADA)'],
};
const DESENHAM = new Set(['sala', 'zona', 'piso', 'parede', 'porta', 'texto', 'acesso']);
const NOVO = { sala: ['Nova sala', 'ensino', 140, 100], zona: ['Nova zona', 'conv', 140, 100], piso: ['Circulação', 'circ', 160, 60] };
const cam = { x: 0, y: 0, k: 1, w: 0, h: 0, local: null };
let cadeia = null, guias = [], previa = null, ultimaPrevia = '', copiados = null, panorama = null, teclaEspaco = false;
let ultimoClique = null, ultimoPonto = null, pontoMenu = null, rafDesenho = 0, gesto = null;

const editandoPlanta = () => estado.modo === 'editar' && estado.secao === 'planta';
const upx = n => n / cam.k; // pixels da tela → unidades da planta
const limitaZoom = k => Math.min(ZMAX, Math.max(ZMIN, k));
const horiz = p => Math.abs(p[1] - p[3]) < .5, vert = p => Math.abs(p[0] - p[2]) < .5;
const copia = v => JSON.parse(JSON.stringify(v));
const semIma = e => MAC ? e.metaKey : e.ctrlKey;
const MODK = MAC ? '⌘' : 'Ctrl';

/* ---------- Câmera ---------- */
// Ponto do mouse nas coordenadas da planta (já descontado o espelhamento aplicado em #conteudo).
function pontoSVG(e) { const g = $('#conteudo', base) || base, p = new DOMPoint(e.clientX, e.clientY).matrixTransform(g.getScreenCTM().inverse()); return [p.x, p.y]; }
const tamanhoVista = () => [vista.clientWidth, vista.clientHeight];
// viewBox da câmera; o desenhar() só pede isto no editor da planta (fora dele a planta se ajusta sozinha ao espaço).
function camVB() {
  const [w, h] = tamanhoVista();
  if (!w || !h) return null;
  if (cam.local !== estado.local) { cadeia = null; previa = null; enquadrar(false); } // outra área: a parede em andamento não continua lá
  else if (w !== cam.w || h !== cam.h) { cam.x += (cam.w - w) / 2 / cam.k; cam.y += (cam.h - h) / 2 / cam.k; } // mantém o centro
  cam.w = w; cam.h = h;
  return [cam.x, cam.y, w / cam.k, h / cam.k];
}
// Ajusta a câmera para a área inteira caber na tela.
function enquadrar(redesenhar = true) {
  const bb = limites(Lc()), [w, h] = tamanhoVista();
  if (!w || !h) return;
  cam.local = estado.local;
  cam.k = limitaZoom(Math.min((w - 48) / bb[2], (h - TOPO_UI - 48) / bb[3]));
  cam.x = bb[0] + bb[2] / 2 - w / 2 / cam.k;
  cam.y = bb[1] + bb[3] / 2 - (h + TOPO_UI) / 2 / cam.k;
  cam.w = w; cam.h = h;
  if (redesenhar) desenhar();
}
function zoomEm(sx, sy, fator) {
  const k = limitaZoom(cam.k * fator);
  if (k === cam.k) return;
  const wx = cam.x + sx / cam.k, wy = cam.y + sy / cam.k;
  cam.k = k; cam.x = wx - sx / k; cam.y = wy - sy / k;
  fecharEdicoes();
  agendarDesenho();
}
const zoomNoCentro = fator => zoomEm(cam.w / 2, cam.h / 2, fator);
const zoomPara = k => zoomNoCentro(k / cam.k);
function rolarCamera(dx, dy) { cam.x -= dx / cam.k; cam.y -= dy / cam.k; fecharEdicoes(); agendarDesenho(); }
function agendarDesenho() { if (!rafDesenho) rafDesenho = requestAnimationFrame(() => { rafDesenho = 0; desenhar(); }); }
// Leva um espaço que está fora da tela para o meio da vista. imediato: redesenha já (usado quando o foco do Tab chega nele).
function mostrarNaTela(id, imediato = false) {
  const a = Lc().ambientes.find(x => x.id === id), g = $('#conteudo', base);
  if (!a || !g || !editandoPlanta()) return;
  const r = base.getBoundingClientRect(), m = g.getScreenCTM();
  const p = new DOMPoint(a.x, a.y).matrixTransform(m), q = new DOMPoint(a.x + a.w, a.y + a.h).matrixTransform(m);
  const fora = Math.max(p.x, q.x) < r.left + 40 || Math.min(p.x, q.x) > r.right - 40 || Math.max(p.y, q.y) < r.top + TOPO_UI || Math.min(p.y, q.y) > r.bottom - 40;
  if (!fora) return false;
  cam.x -= (r.left + r.width / 2 - (p.x + q.x) / 2) / cam.k;
  cam.y -= (r.top + r.height / 2 - (p.y + q.y) / 2) / cam.k;
  if (imediato) desenhar(); else agendarDesenho();
  return true;
}
// Foco do teclado (Tab) num espaço fora da vista: a câmera vai até ele. O redesenho devolve o foco ao elemento novo
// com refocando = true, e aí a câmera não se mexe. O navegador ainda rolaria a página atrás do espaço: quando foi a
// câmera que o trouxe, a rolagem volta a ser a de antes do Tab.
let refocando = false, rolagemAntesDoTab = null;
document.addEventListener('keydown', e => { if (e.key === 'Tab') rolagemAntesDoTab = [scrollX, scrollY]; }, true);
base.addEventListener('focusin', e => {
  const g = e.target.closest?.('.amb'), r = rolagemAntesDoTab;
  rolagemAntesDoTab = null;
  if (g && !refocando && editandoPlanta() && mostrarNaTela(g.dataset.id, true) && r) requestAnimationFrame(() => scrollTo(r[0], r[1]));
});
// Chamado pelo desenhar(): grade do fundo acompanhando a câmera, percentual do zoom e saída da tela cheia fora do editor.
function hudCamera(vb) {
  const s = vista.style;
  if (!vb) {
    // Fora do editor da planta (outra seção, visitante, telão): nada do editor fica aberto por cima.
    s.backgroundSize = s.backgroundPosition = '';
    fecharMenuCtx();
    const c = $('.renomear', vista);
    if (c) { c.descartar = true; c.blur(); c.remove(); }
    if (document.body.classList.contains('editor-cheio') && !editandoPlanta()) alternarCheio(false);
    return;
  }
  let g = 25;
  while (g * cam.k < 12) g *= 2;
  if (g === 25 && g * cam.k > 60) g = 5;
  s.backgroundSize = `${g * cam.k}px ${g * cam.k}px`;
  s.backgroundPosition = `${-cam.x * cam.k}px ${-cam.y * cam.k}px`;
  $('#z-pct').textContent = `${Math.round(cam.k * 100)}%`;
  $('.renomear', vista) && posicionarCaixa();
}

/* ---------- Ímã (encaixe) ---------- */
// Linhas que atraem: as bordas dos espaços e as paredes (menos o que está sendo mexido). Cada linha guarda até onde vai
// no outro eixo (a..b), para só atrair o que passa perto dela e para desenhar a guia.
function linhasEncaixe(pac) {
  const L = Lc(), xs = [], ys = [];
  for (const a of L.ambientes) {
    if (pac?.ids.has(a.id)) continue;
    for (const v of [a.x, a.x + a.w]) xs.push({ v, a: a.y, b: a.y + a.h });
    for (const v of [a.y, a.y + a.h]) ys.push({ v, a: a.x, b: a.x + a.w });
  }
  L.paredes.forEach((p, i) => {
    if (pac?.paredes.has(i)) return;
    const [x1, y1, x2, y2] = p, ya = Math.min(y1, y2), yb = Math.max(y1, y2), xa = Math.min(x1, x2), xb = Math.max(x1, x2);
    xs.push({ v: x1, a: ya, b: yb }, { v: x2, a: ya, b: yb });
    ys.push({ v: y1, a: xa, b: xb }, { v: y2, a: xa, b: xb });
  });
  return { xs, ys };
}
// A linha mais perto de algum dos valores (até IMA_PX na tela), entre as que passam perto de [lo, hi] no outro eixo.
function imaMaisPerto(vals, ls, lo, hi) {
  const lim = upx(IMA_PX), perto = upx(PERTO_PX);
  let m = null;
  for (const l of ls) {
    if (l.b < lo - perto || l.a > hi + perto) continue;
    for (const c of vals) { const d = l.v - c; if (Math.abs(d) <= lim && (!m || Math.abs(d) < Math.abs(m.d))) m = { d, l }; }
  }
  return m;
}
const guiaV = (m, a, b) => guias.push([m.l.v, Math.min(m.l.a, a) - upx(14), m.l.v, Math.max(m.l.b, b) + upx(14)]);
const guiaH = (m, a, b) => guias.push([Math.min(m.l.a, a) - upx(14), m.l.v, Math.max(m.l.b, b) + upx(14), m.l.v]);
// Desloca a caixa [x0,y0,x1,y1] por (dx,dy) encaixando uma borda numa linha; sem linha perto, anda de 5 em 5.
function encaixarCaixa(bb, dx, dy, pac, livre, fixoX = false, fixoY = false) {
  if (livre) return [fixoX ? 0 : Math.round(dx), fixoY ? 0 : Math.round(dy)];
  const { xs, ys } = linhasEncaixe(pac);
  const mx = !fixoX && imaMaisPerto([bb[0] + dx, bb[2] + dx], xs, bb[1] + dy, bb[3] + dy);
  const my = !fixoY && imaMaisPerto([bb[1] + dy, bb[3] + dy], ys, bb[0] + dx, bb[2] + dx);
  const fx = fixoX ? 0 : Math.round(mx ? dx + mx.d : sn(dx)), fy = fixoY ? 0 : Math.round(my ? dy + my.d : sn(dy));
  if (mx) guiaV(mx, bb[1] + fy, bb[3] + fy);
  if (my) guiaH(my, bb[0] + fx, bb[2] + fx);
  return [fx, fy];
}
// Encaixa um ponto; ex/ey dizem que coordenadas podem andar.
function encaixarPonto(x, y, pac, livre, ex = true, ey = true) {
  if (livre) return [ex ? Math.round(x) : x, ey ? Math.round(y) : y];
  const { xs, ys } = linhasEncaixe(pac), mx = ex && imaMaisPerto([x], xs, y, y), my = ey && imaMaisPerto([y], ys, x, x);
  const fx = mx ? mx.l.v : ex ? sn(x) : x, fy = my ? my.l.v : ey ? sn(y) : y;
  if (mx) guiaV(mx, fy, fy);
  if (my) guiaH(my, fx, fx);
  return [fx, fy];
}
// Ponto da parede: a partir de um ponto anterior, só anda na horizontal ou na vertical.
function pontoParede(x, y, de, livre) {
  if (!de) return encaixarPonto(x, y, null, livre);
  return Math.abs(x - de[0]) >= Math.abs(y - de[1])
    ? [encaixarPonto(x, de[1], null, livre, true, false)[0], de[1]]
    : [de[0], encaixarPonto(de[0], y, null, livre, false, true)[1]];
}

/* ---------- Paredes que pertencem às salas ---------- */
const temContorno = a => (a.tipo || 'sala') === 'sala' && a.forma !== 'elipse';
// A parede está inteira sobre uma das bordas do retângulo do espaço.
function naBorda(p, a) {
  const [x1, y1, x2, y2] = p;
  if (horiz(p)) return (Math.abs(y1 - a.y) <= TOL || Math.abs(y1 - a.y - a.h) <= TOL) && Math.min(x1, x2) >= a.x - TOL && Math.max(x1, x2) <= a.x + a.w + TOL;
  if (vert(p)) return (Math.abs(x1 - a.x) <= TOL || Math.abs(x1 - a.x - a.w) <= TOL) && Math.min(y1, y2) >= a.y - TOL && Math.max(y1, y2) <= a.y + a.h + TOL;
  return false;
}
// O que acompanha a seleção. paredes: as escolhidas e as do contorno das salas escolhidas (quando todas as salas donas estão
// na seleção); compart: as do contorno que uma sala de fora também usa; portas: as que estão nas paredes que vão junto.
function pacote(sel = estado.selecao) {
  const L = Lc(), ids = new Set(), conj = { parede: new Set(), porta: new Set(), marca: new Set(), texto: new Set() };
  for (const s of sel) if (s.tipo === 'amb') ids.add(s.id); else conj[s.tipo]?.add(s.i);
  const paredes = conj.parede, portas = conj.porta, selP = new Set(paredes), selD = new Set(portas), compart = new Set();
  if (ids.size) {
    const salas = L.ambientes.filter(temContorno);
    L.paredes.forEach((p, i) => {
      if (paredes.has(i)) return;
      const donos = salas.filter(a => naBorda(p, a));
      if (!donos.some(a => ids.has(a.id))) return;
      (donos.every(a => ids.has(a.id)) ? paredes : compart).add(i);
    });
  }
  for (const i of paredes) portasNaParede(L.paredes[i]).forEach(j => portas.add(j));
  return { ids, paredes, portas, marcas: conj.marca, textos: conj.texto, compart, selP, selD };
}
// Parede dividida com uma sala que fica: a sala que se mexe leva uma cópia e a vizinha continua com a dela.
function separarCompartilhadas(L, pac) {
  for (const i of pac.compart) { L.paredes.push([...L.paredes[i]]); pac.paredes.add(L.paredes.length - 1); }
  pac.compart.clear();
}
// Mesma parede nos dois sentidos (para juntar as repetidas).
const chaveParede = q => { const [a, b, c, d] = q.slice(0, 4).map(Math.round); return a < c || (a === c && b <= d) ? `${a},${b},${c},${d}` : `${c},${d},${a},${b}`; };
// Ao soltar: parede movida que caiu exatamente sobre outra vira uma só (passa a ser dividida pelas duas salas), e trecho
// que encolheu até sumir (sala diminuída por cima dele) sai, com as portas dele (prenderPortas as encolheu junto até zerar).
function limparParedes(L, movidas) {
  const fixas = new Set(L.paredes.filter((_, i) => !movidas.has(i)).map(chaveParede));
  const remover = new Set([...movidas].filter(i => { const q = L.paredes[i]; return q && (Math.hypot(q[2] - q[0], q[3] - q[1]) < 2 || fixas.has(chaveParede(q))); }));
  const portas = new Set(L.portas.flatMap((d, i) => d.w < 2 ? [i] : []));
  if (!remover.size && !portas.size) return;
  const antes = (s, i) => [...s].filter(j => j < i).length;
  L.paredes = L.paredes.filter((_, i) => !remover.has(i));
  L.portas = L.portas.filter((_, i) => !portas.has(i));
  selecionar(estado.selecao.filter(s => !(s.tipo === 'parede' && remover.has(s.i)) && !(s.tipo === 'porta' && portas.has(s.i)))
    .map(s => s.tipo === 'parede' ? { ...s, i: s.i - antes(remover, s.i) } : s.tipo === 'porta' ? { ...s, i: s.i - antes(portas, s.i) } : s));
}
// Cria paredes só nos trechos do contorno que ainda não têm parede. Retorna quantas criou.
function criarContorno(L, a) {
  let n = 0;
  for (const [x1, y1, x2, y2] of [[a.x, a.y, a.x + a.w, a.y], [a.x + a.w, a.y, a.x + a.w, a.y + a.h], [a.x, a.y + a.h, a.x + a.w, a.y + a.h], [a.x, a.y, a.x, a.y + a.h]]) {
    const h = y1 === y2, c = h ? y1 : x1;
    let livres = [[h ? x1 : y1, h ? x2 : y2]];
    for (const p of L.paredes) {
      if (!(h ? horiz(p) : vert(p)) || Math.abs((h ? p[1] : p[0]) - c) > TOL) continue;
      const pa = Math.min(h ? p[0] : p[1], h ? p[2] : p[3]), pb = Math.max(h ? p[0] : p[1], h ? p[2] : p[3]);
      livres = livres.flatMap(([s, t]) => pb <= s || pa >= t ? [[s, t]] : [[s, pa], [pb, t]].filter(([u, v]) => v - u >= 2));
    }
    for (const [s, t] of livres) { L.paredes.push(h ? [s, c, t, c, 0] : [c, s, c, t, 0]); n++; }
  }
  return n;
}
// Caixa do que está selecionado. soEstrutura: para o ímã, o arco das portas não conta como borda quando há espaços ou paredes.
function caixaDe(pac, soEstrutura = false) {
  const L = Lc();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const inc = (a, b, c = a, d = b) => { x0 = Math.min(x0, a, c); y0 = Math.min(y0, b, d); x1 = Math.max(x1, a, c); y1 = Math.max(y1, b, d); };
  for (const a of L.ambientes) if (pac.ids.has(a.id)) inc(a.x, a.y, a.x + a.w, a.y + a.h);
  for (const i of pac.paredes) inc(...L.paredes[i].slice(0, 4));
  if (!(soEstrutura && (pac.ids.size || pac.paredes.size))) for (const i of pac.portas) { const [x, y, w, h] = portaBB(L.portas[i]); inc(x, y, x + w, y + h); }
  for (const i of pac.marcas) { const m = L.marcas[i]; inc(m.x, m.y); inc(...m.seta); }
  for (const i of pac.textos) inc(L.textos[i].x, L.textos[i].y);
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
}

/* ---------- Operações sobre os dados (o = cópia do local tirada no começo do arrasto) ---------- */
function transladar(L, o, pac, dx, dy) {
  L.ambientes.forEach((a, k) => { if (pac.ids.has(a.id)) { a.x = o.ambientes[k].x + dx; a.y = o.ambientes[k].y + dy; } });
  for (const i of pac.paredes) { const q = o.paredes[i]; L.paredes[i] = [q[0] + dx, q[1] + dy, q[2] + dx, q[3] + dy, ...q.slice(4)]; }
  for (const i of pac.portas) { L.portas[i].x = o.portas[i].x + dx; L.portas[i].y = o.portas[i].y + dy; }
  for (const i of pac.marcas) { const m = o.marcas[i]; Object.assign(L.marcas[i], { x: m.x + dx, y: m.y + dy, seta: m.seta.map((v, j) => v + (j % 2 ? dy : dx)) }); }
  for (const i of pac.textos) { L.textos[i].x = o.textos[i].x + dx; L.textos[i].y = o.textos[i].y + dy; }
}
// Nova caixa da sala: pontas de parede que estavam numa borda vão com a borda, cada trecho fica dentro da borda nova
// (o que sair inteiro some ao soltar) e as portas vão junto, sem passar do fim do trecho.
function redimensionarSala(L, o, k, r, pac) {
  const oa = o.ambientes[k];
  Object.assign(L.ambientes[k], r);
  escalarRotulo(L.ambientes[k], oa);
  const fx = v => Math.abs(v - oa.x) <= TOL ? r.x : Math.abs(v - oa.x - oa.w) <= TOL ? r.x + r.w : v;
  const fy = v => Math.abs(v - oa.y) <= TOL ? r.y : Math.abs(v - oa.y - oa.h) <= TOL ? r.y + r.h : v;
  const cx = v => Math.min(Math.max(v, r.x), r.x + r.w), cy = v => Math.min(Math.max(v, r.y), r.y + r.h);
  for (const i of pac.paredes) {
    const q = o.paredes[i], n = [fx(q[0]), fy(q[1]), fx(q[2]), fy(q[3]), ...q.slice(4)];
    if (horiz(q)) { n[0] = cx(n[0]); n[2] = cx(n[2]); } else if (vert(q)) { n[1] = cy(n[1]); n[3] = cy(n[3]); }
    L.paredes[i] = n;
  }
  for (const j of pac.portas) { const d = o.portas[j]; if (d.o === 'h') L.portas[j].y = fy(d.y); else L.portas[j].x = fx(d.x); }
  for (const i of pac.paredes) prenderPortas(L, o, i, pac.portas);
}
// Texto com posição própria (lx/ly) acompanha o tamanho novo do espaço, na mesma proporção (não fica fora dele).
function escalarRotulo(a, oa) {
  if (oa.lx != null) a.lx = Math.round(oa.lx * a.w / oa.w);
  if (oa.ly != null) a.ly = Math.round(oa.ly * a.h / oa.h);
}
// As portas que estavam na parede i (na cópia o) ficam dentro do trecho novo dela: deslizam para dentro e, se o trecho ficou
// menor que a porta, encolhem junto (a que zera sai ao soltar, em limparParedes). so: só estas portas (a cópia de uma parede
// dividida fica sobre a linha da parede vizinha, e as portas da vizinha não são da sala).
function prenderPortas(L, o, i, so) {
  const q = L.paredes[i], q0 = o.paredes[i], h = horiz(q0);
  if (!h && !vert(q0)) return;
  const lo = Math.min(h ? q[0] : q[1], h ? q[2] : q[3]), hi = Math.max(h ? q[0] : q[1], h ? q[2] : q[3]), k = h ? 'x' : 'y';
  for (const j of portasNaParede(q0, o.portas)) if (!so || so.has(j)) {
    const d = L.portas[j];
    d.w = Math.min(o.portas[j].w, hi - lo);
    d[k] = Math.round(Math.min(Math.max(o.portas[j][k], lo), hi - d.w));
  }
}
// Porta copiada ou arrastada sem a parede dela: encosta na parede mais perto do ponto (x, y); sem parede perto, fica onde está.
function encostarPorta(n, x, y) {
  const pr = paredeProxima(x, y, upx(40));
  if (!pr) return n;
  const [x1, y1, x2, y2] = Lc().paredes[pr.i], lo = Math.min(pr.h ? x1 : y1, pr.h ? x2 : y2), hi = Math.max(pr.h ? x1 : y1, pr.h ? x2 : y2);
  const w = Math.min(n.w, hi - lo), ini = Math.round(Math.min(Math.max((pr.h ? x : y) - w / 2, lo), hi - w));
  return pr.h ? { ...n, x: ini, y: y1, o: 'h', w } : { ...n, x: x1, y: ini, o: 'v', w };
}
// O que encosta numa parede: espaços com uma borda inteira sobre ela (bordas: mudam de tamanho junto), salas com a borda
// sobre a linha dela mas mais compridas que ela (limites: a parede não entra nelas e, ao se afastar, deixa para elas uma cópia
// do trecho) e pontas de paredes perpendiculares sobre ela (fixa: a parede é também de uma sala que não muda de tamanho).
function ligacoesParede(L, i) {
  const p = L.paredes[i], h = horiz(p);
  if (!h && !vert(p)) return { ligado: false };
  const c = h ? p[1] : p[0], lo = Math.min(h ? p[0] : p[1], h ? p[2] : p[3]), hi = Math.max(h ? p[0] : p[1], h ? p[2] : p[3]);
  const sobre = (x, y) => Math.abs((h ? y : x) - c) <= TOL && (h ? x : y) >= lo - TOL && (h ? x : y) <= hi + TOL;
  const pontas = [], bordas = [], limites = [];
  L.ambientes.forEach((a, k) => {
    if (a.forma === 'elipse') return;
    const [s0, s1] = h ? [a.x, a.x + a.w] : [a.y, a.y + a.h], [b0, b1] = h ? [a.y, a.y + a.h] : [a.x, a.x + a.w];
    const lado = Math.abs(b0 - c) <= TOL ? 0 : Math.abs(b1 - c) <= TOL ? 1 : -1;
    if (lado < 0 || s1 <= lo + TOL || s0 >= hi - TOL) return;
    if (s0 >= lo - TOL && s1 <= hi + TOL) bordas.push([k, lado]);
    else if (temContorno(a)) limites.push([k, lado]);
  });
  const fixas = L.ambientes.filter((a, k) => temContorno(a) && !bordas.some(([b]) => b === k));
  L.paredes.forEach((q, j) => {
    if (j === i || Math.hypot(q[2] - q[0], q[3] - q[1]) < 1 || !(h ? vert(q) : horiz(q))) return;
    for (const k of [0, 1]) if (sobre(q[2 * k], q[2 * k + 1])) pontas.push([j, k, fixas.some(a => naBorda(q, a))]);
  });
  return { ligado: pontas.length + bordas.length + limites.length > 0, h, lo, hi, pontas, bordas, limites, portas: portasNaParede(p) };
}
function empurrarParede(L, o, ar, dx, dy, livre) {
  const inf = ar.info, i = ar.alvo.i, q = o.paredes[i], h = inf.h, e = h ? 1 : 0, { lo, hi } = inf;
  let d = h ? dy : dx;
  if (livre) d = Math.round(d);
  else {
    const { xs, ys } = linhasEncaixe({ ids: new Set(inf.bordas.map(([k]) => o.ambientes[k].id)), paredes: new Set([i, ...inf.pontas.map(([j]) => j)]) });
    const m = imaMaisPerto([(h ? q[1] : q[0]) + d], h ? ys : xs, lo, hi);
    d = Math.round(m ? d + m.d : sn(d));
    if (m) (h ? guiaH : guiaV)(m, lo, hi);
  }
  // Nenhum espaço fica com menos de 10, nenhuma parede ligada com menos de 5 e a parede não entra numa sala mais comprida que ela.
  let min = -Infinity, max = Infinity;
  for (const [k, b] of inf.bordas) { const t = h ? o.ambientes[k].h : o.ambientes[k].w; if (b === 0) max = Math.min(max, t - 10); else min = Math.max(min, 10 - t); }
  for (const [j, k] of inf.pontas) { const w = o.paredes[j], mv = w[2 * k + e], ou = w[2 * (1 - k) + e]; if (mv > ou) min = Math.max(min, ou + 5 - mv); else max = Math.min(max, ou - 5 - mv); }
  for (const [, b] of inf.limites) if (b === 0) max = Math.min(max, 0); else min = Math.max(min, 0);
  if (inf.limites.some(([, b]) => b === 0 ? d > 0 : d < 0)) dica('A parede encosta numa sala mais comprida que ela e não entra nela. Para aumentar, puxe a alça da sala.', 3);
  d = Math.min(max, Math.max(min, d));
  L.paredes.length = o.paredes.length; // o arrasto chama esta função a cada movimento: os trechos da chamada anterior saem
  L.paredes[i] = h ? [q[0], q[1] + d, q[2], q[3] + d, ...q.slice(4)] : [q[0] + d, q[1], q[2] + d, q[3], ...q.slice(4)];
  for (const j of inf.portas) L.portas[j][h ? 'y' : 'x'] = o.portas[j][h ? 'y' : 'x'] + d;
  const novos = [];
  for (const [j, k, fixa] of inf.pontas) {
    const w = [...o.paredes[j]], mv = w[2 * k + e], ou = w[2 * (1 - k) + e], nv = mv + d;
    L.paredes[j] = w;
    if (!fixa) { w[2 * k + e] = nv; prenderPortas(L, o, j); continue; }
    // Parede que é também de uma sala que fica: ela não estica (a sala continuaria dona dela) nem encolhe (abriria um buraco
    // na sala). O pedaço entre a ponta antiga e a nova vira um trecho à parte e, ao encolher, a parede se divide no ponto novo.
    if (!d) continue;
    const t = [...w];
    t[2 * k + e] = nv; t[2 * (1 - k) + e] = mv;
    novos.push(t);
    if (Math.abs(nv - ou) < Math.abs(mv - ou)) w[2 * k + e] = nv;
  }
  if (d) for (const [k] of inf.limites) {
    const a = o.ambientes[k], t = [...q];
    t[1 - e] = Math.max(lo, h ? a.x : a.y); t[3 - e] = Math.min(hi, h ? a.x + a.w : a.y + a.h);
    novos.push(t);
  }
  for (const t of novos) if (!L.paredes.some(p => chaveParede(p) === chaveParede(t))) L.paredes.push(t);
  for (const [k, b] of inf.bordas) {
    const a = L.ambientes[k], oa = o.ambientes[k];
    if (h) { if (b === 0) { a.y = oa.y + d; a.h = oa.h - d; } else a.h = oa.h + d; }
    else if (b === 0) { a.x = oa.x + d; a.w = oa.w - d; } else a.w = oa.w + d;
    escalarRotulo(a, oa);
  }
  return d;
}
// Porta numa parede desliza ao longo dela sem passar das pontas; porta solta anda livre e encosta na parede mais perto.
function deslizarPorta(L, o, ar, dx, dy) {
  const d0 = o.portas[ar.j], q = o.paredes[ar.parede], h = d0.o === 'h';
  if (!q) { L.portas[ar.j] = encostarPorta({ ...d0, x: Math.round(d0.x + dx), y: Math.round(d0.y + dy) }, d0.x + dx + (h ? d0.w / 2 : 0), d0.y + dy + (h ? 0 : d0.w / 2)); return; }
  let v = Math.round(h ? d0.x + dx : d0.y + dy);
  if (q) { const lo = Math.min(h ? q[0] : q[1], h ? q[2] : q[3]), hi = Math.max(h ? q[0] : q[1], h ? q[2] : q[3]); v = Math.min(Math.max(v, lo), Math.max(lo, hi - d0.w)); }
  L.portas[ar.j][h ? 'x' : 'y'] = v;
}
function moverPonta(L, o, ar, x, y, livre) {
  const i = ar.alvo.i, q = o.paredes[i], k = ar.ponta, h = horiz(q), v = vert(q);
  let [nx, ny] = encaixarPonto(q[2 * k] + x - ar.x0, q[2 * k + 1] + y - ar.y0, { ids: new Set(), paredes: new Set([i]) }, livre, !v, !h);
  if (h) ny = q[2 * k + 1];
  if (v) nx = q[2 * k];
  const ox = q[2 - 2 * k], oy = q[3 - 2 * k];
  if (Math.hypot(nx - ox, ny - oy) < 5) return null;
  const nq = [...q];
  nq[2 * k] = nx; nq[2 * k + 1] = ny;
  L.paredes[i] = nq;
  prenderPortas(L, o, i);
  return Math.round(Math.hypot(nx - ox, ny - oy));
}
function paredeProxima(x, y, lim = upx(14)) {
  let m = null;
  Lc().paredes.forEach((p, i) => {
    const h = horiz(p);
    if (!h && !vert(p)) return;
    const [x1, y1, x2, y2] = p, fora = h ? x < Math.min(x1, x2) || x > Math.max(x1, x2) : y < Math.min(y1, y2) || y > Math.max(y1, y2);
    const d = fora ? Infinity : Math.abs(h ? y - y1 : x - x1);
    if (d <= lim && (!m || d < m.d)) m = { i, d, h };
  });
  return m;
}
// Portas que estão sobre a linha da parede (a ferramenta e o ímã sempre põem a porta exatamente na parede). Com folga maior,
// a porta da parede vizinha, a poucas unidades, iria junto com a sala ao mover e seria apagada com ela.
function portasNaParede(p, portas = Lc().portas) {
  const h = Math.abs(p[1] - p[3]) < .5;
  return portas.map((d, i) => ({ d, i })).filter(({ d }) => (d.o === 'h') === h && Math.abs((h ? d.y : d.x) - (h ? p[1] : p[0])) <= TOL
    && (h ? d.x >= Math.min(p[0], p[2]) - 1 && d.x <= Math.max(p[0], p[2]) : d.y >= Math.min(p[1], p[3]) - 1 && d.y <= Math.max(p[1], p[3]))).map(({ i }) => i);
}
// Porta na parede mais próxima do ponto, abrindo para o lado do ponto.
function portaNoPonto(x, y) {
  const pr = paredeProxima(x, y);
  if (!pr) return null;
  const [x1, y1, x2, y2] = Lc().paredes[pr.i], lo = Math.min(pr.h ? x1 : y1, pr.h ? x2 : y2), hi = Math.max(pr.h ? x1 : y1, pr.h ? x2 : y2);
  const w = Math.min(30, Math.max(8, hi - lo)), ini = Math.round(Math.min(Math.max((pr.h ? x : y) - w / 2, lo), hi - w));
  const lado = (pr.h ? y - y1 : x - x1) < 0 ? -1 : 1;
  return pr.h ? { x: ini, y: y1, o: 'h', w, lado } : { x: x1, y: ini, o: 'v', w, lado };
}

/* ---------- Criar, duplicar, copiar, excluir ---------- */
function proximoNome(nome, usados) {
  const m = String(nome).match(/^(.*?)(\d+)$/), raiz = m ? m[1] : `${nome} `, larg = m ? m[2].length : 1;
  let n = m ? +m[2] : 1, novo;
  do { n++; novo = raiz + String(n).padStart(larg, '0'); } while (usados.has(novo));
  return novo;
}
function extrair(pac) {
  const L = Lc(), copiadas = [...pac.paredes, ...pac.compart];
  return copia({
    ambientes: L.ambientes.filter(a => pac.ids.has(a.id)),
    paredes: copiadas.map(i => ({ p: L.paredes[i], sel: pac.selP.has(i) })),
    // solta: a porta vai sem a parede dela (precisa encostar numa parede no destino)
    portas: [...pac.portas].map(i => ({ d: L.portas[i], sel: pac.selD.has(i), solta: !copiadas.some(j => portasNaParede(L.paredes[j]).includes(i)) })),
    marcas: [...pac.marcas].map(i => L.marcas[i]),
    textos: [...pac.textos].map(i => L.textos[i]),
  });
}
// Vaga para a cópia de uma porta na mesma parede da original: a mais perto dela (à direita ou embaixo primeiro), sem cobrir
// outra porta nem passar das pontas. Sem parede (porta solta) ou sem vaga, devolve null.
function vagaAoLado(d) {
  const L = Lc(), h = d.o === 'h', k = h ? 'x' : 'y', c = h ? d.y : d.x;
  const q = L.paredes.find(p => (h ? horiz(p) : vert(p)) && Math.abs((h ? p[1] : p[0]) - c) <= TOL
    && d[k] >= Math.min(h ? p[0] : p[1], h ? p[2] : p[3]) - TOL && d[k] + d.w <= Math.max(h ? p[0] : p[1], h ? p[2] : p[3]) + TOL);
  if (!q) return null;
  const lo = Math.min(h ? q[0] : q[1], h ? q[2] : q[3]), hi = Math.max(h ? q[0] : q[1], h ? q[2] : q[3]);
  const ocup = L.portas.filter(e => e.o === d.o && Math.abs((h ? e.y : e.x) - c) <= TOL).map(e => [e[k], e[k] + e.w]), g = 2;
  const v = ocup.flatMap(([a, b]) => [b + g, a - d.w - g]).sort((u, w) => Math.abs(u - d[k]) - Math.abs(w - d[k]))
    .find(v => v >= lo && v + d.w <= hi && !ocup.some(([a, b]) => v < b + g && v + d.w > a - g));
  return v === undefined ? null : { ...d, [k]: v };
}
// Insere cópias deslocadas de (dx, dy). Os espaços ganham id novo; o nome só muda (Sala 1 → Sala 2) se já existir na área,
// e a cópia perde as anotações do croqui. recorte: o que foi recortado (⌘X) volta inteiro, com o texto da planta e o croqui.
// Porta que vai sem a parede: com aoLado (duplicar), fica ao lado da original na mesma parede; senão encosta na parede mais perto.
function inserir(itens, dx, dy, aoLado = false, recorte = false) {
  const L = Lc(), c = copia(itens), usados = new Set(L.ambientes.map(a => a.nome)), sel = [];
  const pac = { ids: new Set(), paredes: new Set(), portas: new Set(), marcas: new Set(), textos: new Set(), compart: new Set() };
  for (const a of c.ambientes) {
    a.id = novoId(); a.x += dx; a.y += dy;
    if (usados.has(a.nome)) renomear(a, proximoNome(a.nome, usados));
    usados.add(a.nome);
    if (!recorte) { delete a.croqui; delete a.postit; }
    L.ambientes.push(a); pac.ids.add(a.id); sel.push({ tipo: 'amb', id: a.id });
  }
  for (const { p, sel: s } of c.paredes) { const i = L.paredes.push([p[0] + dx, p[1] + dy, p[2] + dx, p[3] + dy, ...p.slice(4)]) - 1; pac.paredes.add(i); if (s) sel.push({ tipo: 'parede', i }); }
  for (const { d, sel: s, solta } of c.portas) {
    const h = d.o === 'h', n = { ...d, x: d.x + dx, y: d.y + dy }, meio = h ? n.w / 2 : 0, meioV = h ? 0 : n.w / 2;
    const fim = !solta ? n : aoLado ? vagaAoLado(d) || n : encostarPorta(n, n.x + meio, n.y + meioV);
    const i = L.portas.push(fim) - 1;
    pac.portas.add(i);
    if (s) sel.push({ tipo: 'porta', i });
  }
  for (const m of c.marcas) { const i = L.marcas.push({ ...m, x: m.x + dx, y: m.y + dy, seta: m.seta.map((v, j) => v + (j % 2 ? dy : dx)) }) - 1; pac.marcas.add(i); sel.push({ tipo: 'marca', i }); }
  for (const t of c.textos) { const i = L.textos.push({ ...t, x: t.x + dx, y: t.y + dy }) - 1; pac.textos.add(i); sel.push({ tipo: 'texto', i }); }
  return { sel, pac };
}
function caixaItens(c) {
  const xs = [], ys = [];
  c.ambientes.forEach(a => { xs.push(a.x, a.x + a.w); ys.push(a.y, a.y + a.h); });
  c.paredes.forEach(({ p }) => { xs.push(p[0], p[2]); ys.push(p[1], p[3]); });
  c.marcas.forEach(m => { xs.push(m.x, m.seta[0], m.seta[2]); ys.push(m.y, m.seta[1], m.seta[3]); });
  c.textos.forEach(t => { xs.push(t.x); ys.push(t.y); });
  c.portas.forEach(({ d }) => { xs.push(d.x); ys.push(d.y); });
  return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null;
}
function duplicarSelecao() {
  if (!estado.selecao.length) return;
  const teclado = base.contains(document.activeElement); // com o mouse, o foco (e a câmera) não vão para a cópia
  const L = Lc(), antes = JSON.stringify(dados), { sel, pac } = inserir(extrair(pacote()), 20, 20, true);
  selecionar(sel);
  limparParedes(L, pac.paredes);
  registrar(antes);
  render();
  if (teclado) focarSelecao();
  dica('Cópia criada ao lado · arraste para encaixar', 4);
}
function copiarSelecao(recorte = false) {
  if (!estado.selecao.length) return;
  const itens = extrair(pacote());
  copiados = { itens, caixa: caixaItens(itens), local: estado.local, recorte };
  if (!recorte) dica(`Copiado · ${MODK}+V cola onde estiver o mouse`, 4);
}
// Colar onde está o mouse. A parede que cai exatamente sobre outra (a dividida com a vizinha) vira uma só.
function colar(onde = ultimoPonto) {
  if (!copiados) return;
  const bb = copiados.caixa, L = Lc();
  let dx = copiados.local === estado.local ? 20 : 0, dy = dx;
  if (onde && bb) { dx = sn(onde[0] - (bb[0] + bb[2]) / 2); dy = sn(onde[1] - (bb[1] + bb[3]) / 2); }
  const antes = JSON.stringify(dados), { sel, pac } = inserir(copiados.itens, dx, dy, false, copiados.recorte);
  copiados.recorte = false; // colar de novo faz uma cópia
  selecionar(sel);
  limparParedes(L, pac.paredes);
  registrar(antes);
  render();
}
// Exclui a seleção e o que a acompanha (as aulas ficam na planilha: um espaço excluído só deixa de aparecer na planta).
// focar: o foco do teclado estava na planta, então vai para o espaço seguinte.
function excluirSelecao(focar = base.contains(document.activeElement)) {
  if (!estado.selecao.length) return;
  const L = Lc(), pac = pacote(), salas = L.ambientes.filter(a => pac.ids.has(a.id));
  const idx = Math.max(0, L.ambientes.findIndex(a => pac.ids.has(a.id)));
  const antes = JSON.stringify(dados), n = estado.selecao.length + pac.paredes.size - pac.selP.size;
  salas.forEach(excluirAmbiente);
  L.paredes = L.paredes.filter((_, i) => !pac.paredes.has(i));
  L.portas = L.portas.filter((_, i) => !pac.portas.has(i));
  L.marcas = L.marcas.filter((_, i) => !pac.marcas.has(i));
  L.textos = L.textos.filter((_, i) => !pac.textos.has(i));
  selecionar([]);
  registrar(antes);
  render();
  if (focar) { const els = $$('#base .amb'); els[Math.min(idx, els.length - 1)]?.focus({ preventScroll: true }); }
  dica(`${n} ${n === 1 ? 'item excluído' : 'itens excluídos'} · ${MODK}+Z desfaz`, 4);
}
// Campos X, Y, Largura e Altura do inspetor: mesma regra do mouse (as paredes da sala acompanham).
function ajustarPeloInspetor(a, campo, v) {
  const L = Lc(), k = L.ambientes.indexOf(a), pac = pacote([{ tipo: 'amb', id: a.id }]);
  if (k < 0) return;
  separarCompartilhadas(L, pac);
  const o = copia(L), r = { x: a.x, y: a.y, w: a.w, h: a.h, [campo]: v };
  if (campo === 'x' || campo === 'y') transladar(L, o, pac, r.x - a.x, r.y - a.y);
  else redimensionarSala(L, o, k, r, pac);
  limparParedes(L, pac.paredes);
}
function ordemZ(frente) {
  const L = Lc(), ids = new Set(estado.selecao.filter(s => s.tipo === 'amb').map(s => s.id));
  if (!ids.size) return;
  const antes = JSON.stringify(dados), sel = L.ambientes.filter(a => ids.has(a.id)), resto = L.ambientes.filter(a => !ids.has(a.id));
  L.ambientes = frente ? [...resto, ...sel] : [...sel, ...resto];
  if (JSON.stringify(dados) !== antes) registrar(antes);
  render();
}
function contornoSelecao() {
  const L = Lc(), antes = JSON.stringify(dados);
  const n = L.ambientes.filter(a => estaSel('amb', a.id) && a.forma !== 'elipse').reduce((s, a) => s + criarContorno(L, a), 0);
  if (n) registrar(antes);
  render();
  dica(n ? `${n} ${n === 1 ? 'parede criada' : 'paredes criadas'} no contorno.` : 'O contorno já tem paredes.', 4);
}
function selecionarTudo() {
  const L = Lc(), idx = (l, tipo) => l.map((_, i) => ({ tipo, i }));
  selecionar([...L.ambientes.map(a => ({ tipo: 'amb', id: a.id })), ...idx(L.paredes, 'parede'), ...idx(L.portas, 'porta'), ...idx(L.marcas, 'marca'), ...idx(L.textos, 'texto')]);
  render();
}
// Dois cliques na porta: troca a dobradiça e depois o lado em que ela abre (as quatro posições).
function girarPorta(i) {
  const d = Lc().portas[i];
  if (!d) return;
  const antes = JSON.stringify(dados);
  if (!d.inv) d.inv = true;
  else { delete d.inv; d.lado = -d.lado; }
  registrar(antes);
  render();
}
// Setas: as mesmas regras do mouse (porta desliza na parede, parede ligada empurra, sala leva as paredes dela).
function empurrarSelecao([sx, sy], passo) {
  const L = Lc(), antes = JSON.stringify(dados), o = copia(L), dx = sx * passo, dy = sy * passo, um = estado.alvo;
  const info = um?.tipo === 'parede' ? ligacoesParede(L, um.i) : null;
  if (um?.tipo === 'porta') deslizarPorta(L, o, { j: um.i, parede: L.paredes.findIndex(q => portasNaParede(q).includes(um.i)) }, dx, dy);
  else if (info?.ligado) empurrarParede(L, o, { info, alvo: um }, dx, dy, true);
  else {
    const pac = pacote();
    separarCompartilhadas(L, pac);
    transladar(L, copia(L), pac, dx, dy);
    limparParedes(L, pac.paredes);
  }
  if (JSON.stringify(dados) !== antes) registrar(antes);
  render();
}
function criarEspaco(ar) {
  const L = Lc(), t = ar.ferr, [nome, cat, pw, ph] = NOVO[t];
  let [x0, y0] = ar.p0, [x1, y1] = ar.p1, x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
  if (!ar.ativo || w < 10 || h < 10) { w = pw; h = ph; x = sn(x0 - w / 2); y = sn(y0 - h / 2); } // um clique: tamanho padrão no ponto
  const a = { id: novoId(), nome, cat, tipo: t, x, y, w, h, ...(t === 'zona' && { rx: 12 }), ...(t === 'sala' && { aloc: true }) };
  L.ambientes.push(a);
  const n = t === 'sala' && estado.comParedes ? criarContorno(L, a) : 0;
  selecionarAlvo({ tipo: 'amb', id: a.id });
  registrar(ar.antes);
  usarFerramenta('sel', false);
  render();
  dica(`${nome === 'Circulação' ? 'Circulação criada' : `${nome} criada`}${n ? ` com ${n} ${n === 1 ? 'parede' : 'paredes'}` : ''} · digite o nome e tecle Enter`, 5);
  renomearInline(a.id);
}
// Criar pelo teclado (Enter com a ferramenta escolhida, ou o botão da barra acionado pelo teclado): no meio da vista.
const CRIA = new Set(['sala', 'zona', 'piso', 'texto', 'acesso']);
function criarNoCentro(f) {
  const r = vista.getBoundingClientRect(), g = $('#conteudo', base);
  if (!g || !CRIA.has(f)) return;
  const p = new DOMPoint(r.left + r.width / 2, r.top + (r.height + TOPO_UI) / 2).matrixTransform(g.getScreenCTM().inverse()), x = sn(p.x), y = sn(p.y);
  const ar = { p0: [x, y], p1: [x, y], ativo: false, antes: JSON.stringify(dados), ferr: f };
  if (f === 'texto') novoTexto(x, y); else if (f === 'acesso') criarAcesso(ar); else criarEspaco(ar);
}
function criarAcesso(ar) {
  const L = Lc();
  let [x0, y0] = ar.p0, [x1, y1] = ar.p1;
  if (!ar.ativo || Math.hypot(x1 - x0, y1 - y0) < 12) { x1 = x0; y1 = y0 + 40; }
  const dx = x1 - x0, dy = y1 - y0, seta = [x0, y0, x1, y1];
  L.marcas.push(Math.abs(dx) > Math.abs(dy) ? { t: 'ACESSO', x: x0 - Math.sign(dx) * 8, y: y0, ancora: dx > 0 ? 'end' : 'start', seta } : { t: 'ACESSO', x: x0, y: y0 - Math.sign(dy) * 12, seta });
  const i = L.marcas.length - 1;
  selecionarAlvo({ tipo: 'marca', i });
  registrar(ar.antes);
  usarFerramenta('sel', false);
  render();
  editarTextoInline({ tipo: 'marca', i }, true);
}
function novoTexto(x, y) {
  const L = Lc(), antes = JSON.stringify(dados), [tx, ty] = encaixarPonto(x, y, null, false);
  guias = [];
  L.textos.push({ t: 'Texto', x: tx, y: ty });
  const i = L.textos.length - 1;
  selecionarAlvo({ tipo: 'texto', i });
  registrar(antes);
  usarFerramenta('sel', false);
  render();
  editarTextoInline({ tipo: 'texto', i }, true);
}
function colocarPorta(x, y) {
  const d = portaNoPonto(x, y);
  if (!d) { dica('Clique em cima de uma parede para pôr a porta.', 3); return; }
  const L = Lc(), antes = JSON.stringify(dados);
  L.portas.push(d);
  selecionarAlvo({ tipo: 'porta', i: L.portas.length - 1 });
  registrar(antes);
  previa = null;
  render();
  dica('Porta colocada · dois cliques nela giram a abertura · Esc volta para a seleção', 4);
}
// Clique com a cadeia de paredes ativa: fecha a parede até o ponto. Retorna false quando a cadeia terminou (contorno fechado).
function encadear(q) {
  const p = cadeia.p;
  if (Math.hypot(q[0] - p[0], q[1] - p[1]) >= 5) {
    const antes = JSON.stringify(dados);
    Lc().paredes.push([p[0], p[1], q[0], q[1], estado.paredeExt]);
    registrar(antes);
    cadeia.n++;
  }
  cadeia.p = q;
  if (cadeia.n >= 2 && Math.hypot(q[0] - cadeia.ini[0], q[1] - cadeia.ini[1]) < 1) { terminarCadeia(); return false; }
  painelEditor();
  return true;
}
function fimParede(ar) {
  if (!cadeia) cadeia = { ini: ar.p0, p: ar.p0, n: 0 };
  const [x0, y0] = ar.p0, [x1, y1] = ar.p1;
  if (ar.ativo && Math.hypot(x1 - x0, y1 - y0) >= 5) {
    Lc().paredes.push([x0, y0, x1, y1, estado.paredeExt]);
    registrar(ar.antes);
    cadeia.p = ar.p1;
    cadeia.n++;
    if (cadeia.n >= 2 && Math.hypot(x1 - cadeia.ini[0], y1 - cadeia.ini[1]) < 1) { terminarCadeia(); return; }
  }
  cadeia.cursor = null;
  render();
}
function terminarCadeia(redesenhar = true) {
  cadeia = null; previa = null; guias = []; ultimaPrevia = '';
  dicaFerramenta();
  if (redesenhar) render();
}

/* ---------- Ferramenta ativa, dicas e painel ---------- */
function usarFerramenta(f, redesenhar = true) {
  if (!FERRAMENTAS[f]) return;
  if (cadeia) terminarCadeia(false);
  estado.ferramenta = f;
  previa = null; guias = []; ultimaPrevia = '';
  ferramentasUI();
  if (redesenhar) desenhar();
}
function ferramentasUI() {
  const f = estado.ferramenta, cl = document.body.classList;
  $$('#ferr [data-ferr]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ferr === f));
  $('#ferr-op').hidden = !(f === 'sala' || f === 'parede');
  $('#op-sala').hidden = f !== 'sala';
  $('#op-parede').hidden = f !== 'parede';
  $('#op-paredes').checked = estado.comParedes;
  $$('#op-parede [data-ext]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.ext === estado.paredeExt));
  cl.toggle('ferr-sel', f === 'sel');
  cl.toggle('ferr-mao', f === 'mao');
  cl.toggle('ferr-desenho', DESENHAM.has(f) && f !== 'texto');
  cl.toggle('ferr-texto', f === 'texto');
  dicaFerramenta();
}
function dicaFerramenta() {
  if (dicaTimer || arrasto) return;
  $('#ed-dica').textContent = cadeia ? 'Clique no próximo canto · clique no ponto inicial para fechar · Esc, Enter ou dois cliques terminam' : FERRAMENTAS[estado.ferramenta]?.[2] || '';
}
function etiqueta(texto, e) {
  const el = $('#ed-etiqueta');
  if (!texto) { el.hidden = true; return; }
  const r = vista.getBoundingClientRect();
  el.textContent = texto;
  el.hidden = false;
  el.style.left = `${Math.min(e.clientX - r.left + 16, r.width - el.offsetWidth - 6)}px`;
  el.style.top = `${Math.min(e.clientY - r.top + 18, r.height - 30)}px`;
}
function alternarCheio(v = !document.body.classList.contains('editor-cheio')) {
  document.body.classList.toggle('editor-cheio', v);
  const b = $('#b-cheio');
  b.setAttribute('aria-pressed', v);
  b.title = v ? 'Sair da tela cheia do editor (Esc)' : 'Tela cheia do editor';
  $('use', b).setAttribute('href', v ? '#i-recolher' : '#i-expandir');
  medirBarra();
  agendarDesenho();
  if (!v && editandoPlanta()) requestAnimationFrame(() => vista.scrollIntoView({ block: 'nearest' })); // volta para a planta, não para o topo
}
const medirBarra = () => document.body.style.setProperty('--bs-alt', `${$('.barra-salvar').offsetHeight}px`);
function alternarAtalhos(v) {
  const p = $('#atalhos'), b = $('[data-tela="atalhos"]');
  p.hidden = v === undefined ? !p.hidden : !v;
  b.setAttribute('aria-expanded', !p.hidden);
}

/* ---------- Edição de texto direto na planta ---------- */
// Caixa sobre o elemento: Enter confirma, Esc desiste, sair do campo confirma. teclado: true quando fechou por Enter/Esc.
function caixaTexto(el, valor, rotulo, confirmar, desistir) {
  $('.renomear', vista)?.remove();
  const inp = document.createElement('input');
  inp.className = 'renomear';
  inp.value = valor;
  inp.maxLength = 60;
  inp.setAttribute('aria-label', rotulo);
  inp.alvo = el;
  vista.append(inp);
  posicionarCaixa();
  inp.focus();
  inp.select();
  let feito = false;
  const fim = (ok, teclado) => { if (feito) return; feito = true; const v = inp.value.trim(); inp.remove(); if (ok) confirmar(v, teclado); else desistir(teclado); };
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); fim(true, true); } if (e.key === 'Escape') { e.preventDefault(); fim(false, true); } });
  inp.addEventListener('blur', () => fim(!inp.descartar, false));
}
// O mousedown em outro lugar fecha a caixa de texto. Se o redesenho mudar a altura dos painéis antes do mouseup, o alvo do
// clique sai do lugar e o clique se perde: com um botão apertado, essa parte espera o clique terminar.
let apertado = false;
document.addEventListener('pointerdown', () => { apertado = true; }, true);
for (const t of ['pointerup', 'pointercancel']) document.addEventListener(t, () => { apertado = false; }, true);
const depoisDoClique = f => apertado ? addEventListener('pointerup', () => setTimeout(f), { once: true }) : f();
// Depois de editar um texto na planta: redesenha só a planta e a barra e acerta os campos que mostram o nome.
// Um render() completo recriaria o botão em que a pessoa acabou de clicar, e o clique se perderia.
function atualizarNomes() {
  desenhar();
  painelEditor();
  const a = ambSel(), L = Lc(), al = estado.alvo, fora = el => el && document.activeElement !== el;
  if (a) {
    const n = $('#f-nome'), r = $('#f-rot');
    if (fora(n)) n.value = a.nome;
    if (fora(r) && !r.disabled) { r.value = Array.isArray(a.rot) ? a.rot.join('\n') : ''; r.placeholder = quebrar(a.nome, a.giro ? a.h : a.w, a.tam || 15).join('\n'); }
  }
  for (const b of L.ambientes) { const l = $(`#esp-${CSS.escape(b.id)}`); if (fora(l)) { l.value = b.nome; l.setAttribute('aria-label', `Nome do espaço ${b.nome}`); } }
  const t = $('#f-t-t'), m = $('#f-m-t');
  if (al?.tipo === 'texto' && fora(t)) t.value = L.textos[al.i]?.t ?? '';
  if (al?.tipo === 'marca' && fora(m)) m.value = L.marcas[al.i]?.t ?? '';
}
const focarNaPlanta = sel => base.querySelector(sel)?.focus({ preventScroll: true });
function posicionarCaixa() {
  const inp = $('.renomear', vista), el = inp?.alvo;
  if (!el?.isConnected) return;
  const c = el.getBoundingClientRect(), v = vista.getBoundingClientRect();
  inp.style.left = `${c.left + c.width / 2 - v.left + vista.scrollLeft}px`;
  inp.style.top = `${c.top + c.height / 2 - v.top + vista.scrollTop}px`;
}
// Renomear direto na planta (dois cliques ou F2): o texto da planta passa a seguir o nome (renomear() em base.js).
function renomearInline(id) {
  const a = Lc().ambientes.find(x => x.id === id);
  if (!a) return;
  const el = base.querySelector(`.r[data-r="${CSS.escape(id)}"] text`) || base.querySelector(`.amb[data-id="${CSS.escape(id)}"]`);
  if (!el) return;
  const antes = JSON.stringify(dados), seletor = `.amb[data-id="${CSS.escape(id)}"]`;
  caixaTexto(el, a.nome, `Novo nome para ${a.nome}`, (novo, teclado) => {
    const mudou = novo && novo !== a.nome;
    if (mudou) { renomear(a, novo); registrar(antes); }
    atualizarNomes();
    if (mudou) dica(`Renomeado para “${novo}”.`, 3);
    if (teclado) focarNaPlanta(seletor);
  }, teclado => { atualizarNomes(); if (teclado) focarNaPlanta(seletor); });
}
function editarTextoInline(al, novo = false) {
  const L = Lc(), lista = al.tipo === 'texto' ? L.textos : L.marcas, item = lista[al.i];
  const el = al.tipo === 'texto' ? base.querySelector(`[data-t="${al.i}"]`) : base.querySelector(`[data-m="${al.i}"] text`);
  if (!item || !el) return;
  const antes = JSON.stringify(dados);
  // Texto recém-criado que fica vazio ou é cancelado some sem deixar rastro no desfazer.
  const desistir = teclado => {
    if (novo && lista[al.i] === item) {
      lista.splice(al.i, 1); desfazer.pop(); salvarRascunho(); selecionarAlvo(null);
      // Fechou clicando em outro lugar: redesenho parcial, senão o botão clicado seria recriado e o clique se perderia.
      if (teclado) render(); else { desenhar(); depoisDoClique(() => { painelEditor(); inspetor(true); }); }
    } else atualizarNomes();
  };
  caixaTexto(el, item.t, al.tipo === 'texto' ? 'Texto na planta' : 'Texto da indicação de acesso', (v, teclado) => {
    if (!v) return desistir(teclado);
    if (v !== item.t) { item.t = v; if (novo) salvarRascunho(); else registrar(antes); }
    atualizarNomes();
  }, desistir);
}
function editarSelecionado() {
  const al = estado.alvo;
  if (al?.tipo === 'amb') renomearInline(al.id);
  else if (al?.tipo === 'texto' || al?.tipo === 'marca') editarTextoInline(al);
  else if (al?.tipo === 'porta') girarPorta(al.i);
}
// Zoom, rolagem e menu fecham a caixa de texto (confirmando) e o menu de contexto.
function fecharEdicoes() { $('.renomear', vista)?.blur(); fecharMenuCtx(); }

/* ---------- Menu de contexto ---------- */
function abrirMenuCtx(x, y) {
  const m = $('#menu-ctx'), sel = estado.selecao, um = estado.alvo, L = Lc();
  const item = (acao, rot, tecla = '', cls = '') => `<button type="button" role="menuitem" data-menu="${acao}"${cls ? ` class="${cls}"` : ''}><span>${rot}</span>${tecla ? `<kbd>${tecla}</kbd>` : ''}</button>`;
  let h = '';
  if (sel.length) {
    if (um?.tipo === 'amb') h += item('editar', 'Renomear', 'F2');
    if (um?.tipo === 'texto' || um?.tipo === 'marca') h += item('editar', 'Editar texto', 'F2');
    if (um?.tipo === 'porta') h += item('editar', 'Girar a porta', 'F2');
    if (um?.tipo === 'parede') h += item('tipo-parede', L.paredes[um.i]?.[4] ? 'Tornar parede interna (fina)' : 'Tornar parede externa (grossa)');
    h += item('duplicar', 'Duplicar', `${MODK}+D`) + item('copiar', 'Copiar', `${MODK}+C`) + (copiados ? item('colar', 'Colar aqui', `${MODK}+V`) : '');
    if (sel.some(s => s.tipo === 'amb')) h += '<hr>' + item('frente', 'Trazer para a frente') + item('tras', 'Enviar para trás') + item('contorno', 'Criar paredes no contorno');
    h += '<hr>' + item('excluir', sel.length > 1 ? `Excluir ${sel.length} itens` : 'Excluir', 'Delete', 'perigo');
  } else h += (copiados ? item('colar', 'Colar aqui', `${MODK}+V`) : '') + item('tudo', 'Selecionar tudo', `${MODK}+A`) + item('enquadrar', 'Ajustar à tela', 'Shift+1');
  focoAntesMenu = document.activeElement;
  m.innerHTML = h;
  m.hidden = false;
  // Cabe na parte da planta que está na janela; se não couber abaixo do clique, abre para cima.
  const r = vista.getBoundingClientRect(), W = m.offsetWidth, H = m.offsetHeight;
  const minX = Math.max(6, 6 - r.left), maxX = Math.min(vista.clientWidth, innerWidth - r.left) - W - 6;
  const minY = Math.max(6, 6 - r.top), maxY = Math.min(vista.clientHeight, innerHeight - r.top) - H - 6;
  m.style.left = `${Math.max(minX, Math.min(x, maxX))}px`;
  m.style.top = `${Math.max(minY, Math.min(y > maxY ? y - H : y, maxY))}px`;
  $('button', m)?.focus({ preventScroll: true });
}
let focoAntesMenu = null;
// Devolve o foco do teclado à planta: ao espaço selecionado ou, se não houver, a quem tinha o foco antes do menu.
function focarSelecao() {
  const um = estado.alvo, el = um?.tipo === 'amb' ? base.querySelector(`.amb[data-id="${CSS.escape(um.id)}"]`) : null;
  (el || (focoAntesMenu?.isConnected && focoAntesMenu !== document.body ? focoAntesMenu : null))?.focus({ preventScroll: true });
}
// Fechar o menu devolve o foco à planta só quando ele foi aberto pelo teclado (a partir de um espaço focado): com o mouse,
// focar o espaço levaria a câmera até ele.
function fecharMenuCtx() {
  const m = $('#menu-ctx');
  if (!m || m.hidden) return;
  const tinhaFoco = m.contains(document.activeElement);
  m.hidden = true;
  m.innerHTML = '';
  if (tinhaFoco && base.contains(focoAntesMenu)) focarSelecao();
}
function acaoMenu(a) {
  const daPlanta = base.contains(focoAntesMenu); // o menu foi aberto a partir de um espaço focado (teclado)
  fecharMenuCtx();
  const L = Lc(), um = estado.alvo;
  switch (a) {
    case 'editar': editarSelecionado(); return;
    case 'tipo-parede': { const p = L.paredes[um?.i]; if (!p) break; const antes = JSON.stringify(dados); p[4] = p[4] ? 0 : 1; registrar(antes); render(); break; }
    case 'duplicar': duplicarSelecao(); break;
    case 'copiar': copiarSelecao(); break;
    case 'colar': colar(pontoMenu); break;
    case 'frente': ordemZ(true); break;
    case 'tras': ordemZ(false); break;
    case 'contorno': contornoSelecao(); break;
    case 'excluir': excluirSelecao(daPlanta); return;
    case 'tudo': selecionarTudo(); break;
    case 'enquadrar': enquadrar(); break;
  }
  if (daPlanta && !base.contains(document.activeElement)) focarSelecao();
}

/* ---------- Sobreposição do editor (alças, prévias, guias): desenhada dentro de #conteudo ---------- */
function sobreposicao(L) {
  const u = upx, sel = estado.selecao, um = estado.alvo, pac = sel.length ? pacote() : null, out = [];
  const mostraAlcas = estado.ferramenta === 'sel' || estado.ferramenta === 'mao';
  L.paredes.forEach((p, i) => {
    const c = estaSel('parede', i) ? ' on' : pac && (pac.paredes.has(i) || pac.compart.has(i)) ? ' junto' : '';
    out.push(`<line class="hit-parede${horiz(p) ? ' ph' : vert(p) ? ' pv' : ''}${c}" data-p="${i}" x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}" style="stroke-width:${u(12)}px"/>`);
  });
  L.portas.forEach((d, i) => { const [x, y, w, h] = portaBB(d), m = u(4); out.push(`<rect class="hit-porta${estaSel('porta', i) ? ' on' : ''}" data-d="${i}" x="${x - m}" y="${y - m}" width="${w + 2 * m}" height="${h + 2 * m}"/>`); });
  const a = ambSel();
  if (a && mostraAlcas) {
    const s = u(9), X = [a.x, a.x + a.w / 2, a.x + a.w], Y = [a.y, a.y + a.h / 2, a.y + a.h], laterais = a.w * cam.k > 36, verticais = a.h * cam.k > 36;
    for (const [n, i, j] of [['nw', 0, 0], ['n', 1, 0], ['ne', 2, 0], ['e', 2, 1], ['se', 2, 2], ['s', 1, 2], ['sw', 0, 2], ['w', 0, 1]]) {
      if ((n === 'n' || n === 's') && !laterais || (n === 'e' || n === 'w') && !verticais) continue;
      out.push(`<rect class="alca" data-alca="${n}" x="${X[i] - s / 2}" y="${Y[j] - s / 2}" width="${s}" height="${s}" rx="${u(2)}"/>`);
    }
    const [cx, cy] = centro(a);
    out.push(`<circle class="alca" data-alca="rot" cx="${cx}" cy="${cy}" r="${u(7)}"><title>Arraste o anel para mover o texto dentro do espaço</title></circle>`);
  }
  if (um?.tipo === 'parede' && mostraAlcas && L.paredes[um.i]) {
    const p = L.paredes[um.i];
    for (const k of [0, 1]) out.push(`<circle class="alca" data-alca="ponta" data-ponta="${k}" cx="${p[2 * k]}" cy="${p[2 * k + 1]}" r="${u(5)}"><title>Arraste para mudar o comprimento</title></circle>`);
  }
  if (sel.length > 1) { const bb = caixaDe(pac), m = u(6); if (bb) out.push(`<rect class="caixa-sel" x="${bb[0] - m}" y="${bb[1] - m}" width="${bb[2] - bb[0] + 2 * m}" height="${bb[3] - bb[1] + 2 * m}"/>`); }
  const ar = arrasto, ret = (p, q, cls) => `<rect class="${cls}" x="${Math.min(p[0], q[0])}" y="${Math.min(p[1], q[1])}" width="${Math.abs(q[0] - p[0])}" height="${Math.abs(q[1] - p[1])}"/>`;
  const reta = (p, q, cls) => `<line class="${cls}" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`;
  if (ar?.ativo && ar.tipo === 'laco') out.push(ret(ar.p0, ar.p1, 'laco'));
  if (ar?.ativo && ar.tipo === 'novo') out.push(`<g class="cat-${NOVO[ar.ferr]?.[1] || 'ensino'}">${ret(ar.p0, ar.p1, 'prev-amb')}</g>`);
  if (ar?.ativo && ar.tipo === 'nova-parede') out.push(reta(ar.p0, ar.p1, 'prev-parede'));
  if (ar?.ativo && ar.tipo === 'nova-marca') out.push(`<path class="prev-seta" d="M${ar.p0[0]} ${ar.p0[1]}L${ar.p1[0]} ${ar.p1[1]}" marker-end="url(#seta)"/>`);
  if (cadeia) {
    if (!ar && cadeia.cursor) out.push(reta(cadeia.p, cadeia.cursor, 'prev-parede'));
    out.push(`<circle class="ponto-ima" cx="${cadeia.ini[0]}" cy="${cadeia.ini[1]}" r="${u(5)}"/>`);
  }
  if (previa?.tipo === 'porta' && previa.d) out.push(`<g class="fantasma">${portaSVG(previa.d)}</g>`);
  if (previa?.tipo === 'ponto' && !ar) out.push(`<circle class="ponto-ima" cx="${previa.p[0]}" cy="${previa.p[1]}" r="${u(3.5)}"/>`);
  for (const g of guias) out.push(`<line class="guia" x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}"/>`);
  return out.join('');
}

/* ---------- Mouse ---------- */
function alvoDe(t) {
  const d = t.closest('[data-d]'), p = t.closest('[data-p]'), m = t.closest('[data-m]'), x = t.closest('[data-t]'), a = t.closest('.amb');
  return d ? { tipo: 'porta', i: +d.dataset.d } : p ? { tipo: 'parede', i: +p.dataset.p } : m ? { tipo: 'marca', i: +m.dataset.m }
    : x ? { tipo: 'texto', i: +x.dataset.t } : a ? { tipo: 'amb', id: a.dataset.id } : null;
}
// Dois cliques: o render() recria o desenho entre os cliques e o dblclick nativo falha, então conta tempo e distância.
function cliqueDuplo(e) {
  const u = ultimoClique, sim = !!u && e.timeStamp - u.t < 450 && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 6;
  ultimoClique = sim ? null : { t: e.timeStamp, x: e.clientX, y: e.clientY };
  return sim;
}
const atualizarPaineis = () => { inspetor(true); espacos(); };
function cliqueSelecao(e, ini, duplo) {
  const t = e.target, al = t.closest('[data-alca]'), alvo = al ? null : alvoDe(t);
  // Dois cliques renomeiam (na porta, giram), inclusive quando o segundo clique cai na alça do texto do espaço selecionado.
  const duploEm = duplo && !e.shiftKey && (al ? al.dataset.alca === 'rot' && estado.alvo : alvo?.tipo !== 'parede' && alvo);
  if (duploEm) {
    if (!estaSel(duploEm.tipo, duploEm.tipo === 'amb' ? duploEm.id : duploEm.i)) selecionar([duploEm]);
    editarSelecionado();
    return false;
  }
  if (al && estado.alvo) { arrasto = { ...ini, tipo: 'alca', alca: al.dataset.alca, ponta: +al.dataset.ponta || 0, alvo: estado.alvo }; return true; }
  if (!alvo) {
    if (!e.shiftKey) selecionar([]);
    arrasto = { ...ini, tipo: 'laco', p0: [ini.x0, ini.y0], p1: [ini.x0, ini.y0], base: [...estado.selecao] };
    atualizarPaineis();
    return true;
  }
  const ja = estaSel(alvo.tipo, alvo.tipo === 'amb' ? alvo.id : alvo.i);
  if (!ja) selecionar(e.shiftKey ? [...estado.selecao, alvo] : [alvo]);
  // Shift num item já selecionado: sem arrastar, tira da seleção (no soltar); arrastando, move com o eixo travado.
  arrasto = { ...ini, tipo: 'mover', alvo, tirar: e.shiftKey && ja, reduzir: ja && !e.shiftKey && estado.selecao.length > 1, duplicar: e.altKey };
  atualizarPaineis();
  return true;
}
function selecionarLaco(ar) {
  const L = Lc(), x0 = Math.min(ar.p0[0], ar.p1[0]), x1 = Math.max(ar.p0[0], ar.p1[0]), y0 = Math.min(ar.p0[1], ar.p1[1]), y1 = Math.max(ar.p0[1], ar.p1[1]);
  const den = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, novos = [];
  L.ambientes.forEach(a => { if (den(a.x, a.y) && den(a.x + a.w, a.y + a.h)) novos.push({ tipo: 'amb', id: a.id }); });
  // Parede do contorno de uma sala não entra sozinha: ela já acompanha a sala (e a dividida com a vizinha fica com a vizinha).
  const salas = L.ambientes.filter(temContorno), pegas = new Set();
  L.paredes.forEach((p, i) => { if (den(p[0], p[1]) && den(p[2], p[3]) && !salas.some(a => naBorda(p, a))) { pegas.add(i); novos.push({ tipo: 'parede', i }); } });
  // Porta só entra se estiver solta ou numa parede que o laço pegou (as das salas vão junto com as salas).
  L.portas.forEach((d, i) => {
    const [x, y, w, h] = portaBB(d);
    if (!den(x, y) || !den(x + w, y + h)) return;
    const j = L.paredes.findIndex(q => portasNaParede(q).includes(i));
    if (j < 0 || pegas.has(j)) novos.push({ tipo: 'porta', i });
  });
  L.marcas.forEach((m, i) => { if (den(m.x, m.y) && den(m.seta[0], m.seta[1]) && den(m.seta[2], m.seta[3])) novos.push({ tipo: 'marca', i }); });
  L.textos.forEach((t, i) => { if (den(t.x, t.y)) novos.push({ tipo: 'texto', i }); });
  selecionar([...ar.base, ...novos.filter(n => !ar.base.some(b => mesmoAlvo(b, n)))]);
}
// Primeiro movimento de verdade (passou de 3 px): prepara o que vai junto e tira a cópia de referência.
function comecarArrasto(ar) {
  const L = Lc();
  if (ar.tipo === 'mover') {
    let um = estado.alvo;
    // Alt: arrasta uma cópia (a cópia nasce em cima do original e é ela que anda).
    if (ar.duplicar) { const r = inserir(extrair(pacote()), 0, 0); selecionar(r.sel); ar.pac = r.pac; ar.modo = 'transladar'; um = estado.alvo; }
    if (um?.tipo === 'porta') { ar.modo = 'porta'; ar.j = um.i; ar.parede = L.paredes.findIndex(q => portasNaParede(q).includes(um.i)); }
    else if (!ar.duplicar && um?.tipo === 'parede' && (ar.info = ligacoesParede(L, um.i)).ligado) { ar.modo = 'empurrar'; ar.movidas = new Set([um.i]); }
    else if (!ar.duplicar) { ar.modo = 'transladar'; ar.pac = pacote(); separarCompartilhadas(L, ar.pac); }
    if (ar.modo === 'transladar') { ar.caixa = caixaDe(ar.pac, true); ar.movidas = ar.pac.paredes; }
  }
  if (ar.tipo === 'alca' && ar.alvo.tipo === 'amb' && ar.alca !== 'rot') {
    ar.k = L.ambientes.findIndex(a => a.id === ar.alvo.id);
    ar.pac = pacote([ar.alvo]);
    separarCompartilhadas(L, ar.pac);
    ar.movidas = ar.pac.paredes;
  }
  ar.o = copia(L);
}
function arrastar(ar, x, y, e) {
  const L = Lc(), o = ar.o, livre = semIma(e);
  let dx = x - ar.x0, dy = y - ar.y0;
  switch (ar.tipo) {
    case 'novo': {
      let p = encaixarPonto(x, y, null, livre);
      if (e.shiftKey) { const s = Math.max(Math.abs(p[0] - ar.p0[0]), Math.abs(p[1] - ar.p0[1])); p = [ar.p0[0] + (p[0] < ar.p0[0] ? -s : s), ar.p0[1] + (p[1] < ar.p0[1] ? -s : s)]; }
      ar.p1 = p;
      etiqueta(`${Math.abs(p[0] - ar.p0[0])} × ${Math.abs(p[1] - ar.p0[1])}`, e);
      break;
    }
    case 'nova-parede': ar.p1 = pontoParede(x, y, ar.p0, livre); etiqueta(`${Math.round(Math.hypot(ar.p1[0] - ar.p0[0], ar.p1[1] - ar.p0[1]))}`, e); break;
    case 'nova-marca': ar.p1 = encaixarPonto(x, y, null, livre); break;
    case 'laco': ar.p1 = [x, y]; selecionarLaco(ar); break;
    case 'alca': {
      if (ar.alvo.tipo === 'parede') { const n = moverPonta(L, o, ar, x, y, livre); if (n) etiqueta(`${n}`, e); break; }
      const a = L.ambientes.find(b => b.id === ar.alvo.id), oa = o.ambientes.find(b => b.id === ar.alvo.id);
      if (!a) break;
      if (ar.alca === 'rot') { a.lx = Math.round((oa.lx ?? oa.w / 2) + dx); a.ly = Math.round((oa.ly ?? oa.h / 2) + dy); break; }
      const h = ar.alca, ex = /[we]/.test(h), ey = /[ns]/.test(h);
      const [nx, ny] = encaixarPonto((h.includes('w') ? oa.x : oa.x + oa.w) + dx, (h.includes('n') ? oa.y : oa.y + oa.h) + dy, ar.pac, livre, ex, ey);
      let x0 = oa.x, y0 = oa.y, x1 = oa.x + oa.w, y1 = oa.y + oa.h;
      if (h.includes('w')) x0 = Math.min(nx, x1 - 10);
      if (h.includes('e')) x1 = Math.max(nx, x0 + 10);
      if (h.includes('n')) y0 = Math.min(ny, y1 - 10);
      if (h.includes('s')) y1 = Math.max(ny, y0 + 10);
      redimensionarSala(L, o, ar.k, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, ar.pac);
      etiqueta(`${x1 - x0} × ${y1 - y0}`, e);
      break;
    }
    case 'mover': {
      const fixoX = e.shiftKey && Math.abs(dy) > Math.abs(dx), fixoY = e.shiftKey && !fixoX;
      if (fixoX) dx = 0;
      if (fixoY) dy = 0;
      if (ar.modo === 'porta') deslizarPorta(L, o, ar, dx, dy);
      else if (ar.modo === 'empurrar') { const d = empurrarParede(L, o, ar, dx, dy, livre); etiqueta(`${d > 0 ? '+' : ''}${d}`, e); }
      else { const [fx, fy] = ar.caixa ? encaixarCaixa(ar.caixa, dx, dy, ar.pac, livre, fixoX, fixoY) : [Math.round(dx), Math.round(dy)]; transladar(L, o, ar.pac, fx, fy); }
      break;
    }
  }
}
function soltar(e) {
  if (panorama) { panorama = null; vista.classList.remove('arrastando'); return; }
  const ar = arrasto;
  if (!ar) return;
  arrasto = null; guias = []; etiqueta(null);
  if (ar.tipo === 'toque') { // dedo tirado sem pinça: agora vale (cancelado pelo navegador, não)
    if (e?.type !== 'pointerup') return desenhar();
    if (ar.ferr === 'porta') return colocarPorta(ar.x0, ar.y0);
    if (ar.ferr === 'texto') return novoTexto(ar.x0, ar.y0);
    if (cadeia && encadear(ar.q)) render();
    return;
  }
  if (ar.tipo === 'novo') return criarEspaco(ar);
  if (ar.tipo === 'nova-parede') return fimParede(ar);
  if (ar.tipo === 'nova-marca') return criarAcesso(ar);
  if (ar.tipo === 'mover' && !ar.ativo) {
    if (ar.tirar) selecionar(estado.selecao.filter(s => !mesmoAlvo(s, ar.alvo)));
    else if (ar.reduzir) selecionar([ar.alvo]);
  }
  if (ar.movidas?.size) limparParedes(Lc(), ar.movidas);
  if (JSON.stringify(dados) !== ar.antes) registrar(ar.antes);
  dicaFerramenta();
  render();
}
function cancelarArrasto() {
  if (!arrasto) return;
  dados = JSON.parse(arrasto.antes);
  arrasto = null; guias = []; etiqueta(null);
  validarAlvo(true);
  render();
}
// Passar o mouse: prévia da porta, do próximo trecho de parede e do ponto onde o desenho vai começar.
function pairar(x, y, e) {
  const f = estado.ferramenta, livre = semIma(e);
  guias = [];
  let p = null;
  if (f === 'porta') p = { tipo: 'porta', d: portaNoPonto(x, y) };
  else if (f === 'parede' && cadeia) {
    cadeia.cursor = pontoParede(x, y, cadeia.p, livre);
    etiqueta(`${Math.round(Math.hypot(cadeia.cursor[0] - cadeia.p[0], cadeia.cursor[1] - cadeia.p[1]))}`, e);
  } else if (DESENHAM.has(f) && f !== 'texto') p = { tipo: 'ponto', p: encaixarPonto(x, y, null, livre) };
  const chave = JSON.stringify([p, cadeia?.cursor, guias]);
  if (chave === ultimaPrevia) return;
  ultimaPrevia = chave;
  previa = p;
  agendarDesenho();
}
function iniciarPanorama(e) {
  e.preventDefault();
  panorama = { x: e.clientX, y: e.clientY };
  vista.classList.add('arrastando');
  try { base.setPointerCapture(e.pointerId); } catch {}
}

// Toque com dois dedos: pinça dá zoom e o arrasto move a vista; o que o primeiro dedo começou é cancelado.
const toques = new Map();
let pinca = null;
const medidaToques = () => { const [a, b] = [...toques.values()]; return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; };
function fimToque(e) { if (e.pointerType !== 'touch') return; toques.delete(e.pointerId); if (toques.size < 2) pinca = null; }

base.addEventListener('pointerdown', e => {
  if (!editandoPlanta()) return;
  if (e.pointerType === 'touch') {
    toques.set(e.pointerId, [e.clientX, e.clientY]);
    if (toques.size >= 2) { if (arrasto) cancelarArrasto(); panorama = null; pinca = medidaToques(); return; }
  }
  if (panorama || arrasto || pinca) return;
  fecharMenuCtx();
  const ativo = document.activeElement;
  if (ativo && ativo !== document.body && !base.contains(ativo)) ativo.blur(); // confirma o campo (ou a renomeação) antes de mexer
  if (e.button === 1 || (e.button === 0 && (teclaEspaco || estado.ferramenta === 'mao'))) { iniciarPanorama(e); return; }
  // Botão direito e Ctrl+clique (Mac) abrem o menu de contexto, sem dar foco ao espaço (o foco levaria a câmera até ele).
  if (e.button !== 0 || (MAC && e.ctrlKey)) { if (e.button === 2 || e.button === 0) e.preventDefault(); return; }
  e.preventDefault();
  const [x, y] = pontoSVG(e), livre = semIma(e), duplo = cliqueDuplo(e), f = estado.ferramenta;
  const ini = { x0: x, y0: y, sx: e.clientX, sy: e.clientY, antes: JSON.stringify(dados), ativo: false, ferr: f };
  // No toque, porta, texto e o próximo canto da parede só valem ao tirar o dedo: se um 2º dedo chegar antes (pinça), nada é criado.
  const toque = e.pointerType === 'touch';
  guias = [];
  if (f === 'sala' || f === 'zona' || f === 'piso' || f === 'acesso') { const p = encaixarPonto(x, y, null, livre); arrasto = { ...ini, tipo: f === 'acesso' ? 'nova-marca' : 'novo', p0: p, p1: p }; }
  else if (f === 'parede') {
    if (duplo) { if (cadeia) terminarCadeia(); return; } // o 2º clique de um duplo clique nunca começa outra cadeia
    const q = pontoParede(x, y, cadeia?.p, livre);
    if (cadeia && toque) arrasto = { ...ini, tipo: 'toque', q };
    else {
      if (cadeia) { if (!encadear(q)) return; ini.antes = JSON.stringify(dados); }
      arrasto = { ...ini, tipo: 'nova-parede', p0: q, p1: q };
    }
  }
  else if (f === 'porta') {
    const al = alvoDe(e.target); // em cima de uma porta: seleciona (dois cliques giram) em vez de pôr outra
    if (al?.tipo === 'porta') { if (duplo) girarPorta(al.i); else { selecionar([al]); atualizarPaineis(); desenhar(); } return; }
    if (!toque) { colocarPorta(x, y); return; }
    arrasto = { ...ini, tipo: 'toque' };
  }
  else if (f === 'texto') { if (!toque) { novoTexto(x, y); return; } arrasto = { ...ini, tipo: 'toque' }; }
  else if (!cliqueSelecao(e, ini, duplo)) return;
  try { base.setPointerCapture(e.pointerId); } catch {}
  desenhar();
});
base.addEventListener('pointermove', e => {
  if (!editandoPlanta()) return;
  if (e.pointerType === 'touch' && toques.has(e.pointerId)) {
    toques.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinca) { const n = medidaToques(), r = vista.getBoundingClientRect(); rolarCamera(n.x - pinca.x, n.y - pinca.y); zoomEm(n.x - r.left, n.y - r.top, n.d / pinca.d); pinca = n; return; }
    if (toques.size > 1) return;
  }
  if (panorama) { rolarCamera(e.clientX - panorama.x, e.clientY - panorama.y); panorama.x = e.clientX; panorama.y = e.clientY; return; }
  const [x, y] = pontoSVG(e);
  ultimoPonto = [x, y];
  if (!arrasto) { pairar(x, y, e); return; }
  const ar = arrasto;
  if (!ar.ativo) {
    if (Math.hypot(e.clientX - ar.sx, e.clientY - ar.sy) < 3) return;
    ar.ativo = true;
    comecarArrasto(ar);
  }
  guias = [];
  arrastar(ar, x, y, e);
  agendarDesenho();
});
base.addEventListener('pointerup', soltar);
base.addEventListener('pointercancel', soltar);
// Um dedo pode sair fora da planta: o registro dos toques é limpo no documento inteiro.
document.addEventListener('pointerup', fimToque, true);
document.addEventListener('pointercancel', fimToque, true);
base.addEventListener('lostpointercapture', soltar); // rede de segurança: sem a captura, o arrasto não fica preso
base.addEventListener('pointerleave', () => {
  ultimoPonto = null;
  if (arrasto || panorama) return;
  etiqueta(null);
  if (previa || cadeia?.cursor) { previa = null; if (cadeia) cadeia.cursor = null; ultimaPrevia = ''; agendarDesenho(); }
});
base.addEventListener('contextmenu', e => {
  if (!editandoPlanta()) return;
  e.preventDefault();
  if (arrasto) return;
  if (cadeia) { terminarCadeia(); return; }
  const alvo = alvoDe(e.target);
  if (alvo && !estaSel(alvo.tipo, alvo.tipo === 'amb' ? alvo.id : alvo.i)) selecionar([alvo]);
  if (!alvo) selecionar([]);
  render();
  pontoMenu = pontoSVG(e);
  const r = vista.getBoundingClientRect();
  abrirMenuCtx(e.clientX - r.left, e.clientY - r.top);
});
vista.addEventListener('wheel', e => {
  if (!editandoPlanta() || e.target.closest('#atalhos')) return; // o painel de atalhos rola sozinho
  const r = vista.getBoundingClientRect(), mod = e.ctrlKey || e.metaKey;
  // Enquanto a planta não está inteira na janela, a roda rola a página (para chegar até a planta ou sair dela).
  const topo = document.body.classList.contains('editor-cheio') ? 0 : Math.max(0, $('.barra-salvar').getBoundingClientRect().bottom);
  if (!mod && Math.min(r.bottom, innerHeight) - Math.max(r.top, topo) < Math.min(r.height, innerHeight - topo) - 2) return;
  e.preventDefault();
  const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
  if (e.ctrlKey || e.metaKey) { const d = Math.max(-100, Math.min(100, e.deltaY * mult)); zoomEm(e.clientX - r.left, e.clientY - r.top, Math.pow(2, -d / 300)); return; }
  let dx = e.deltaX * mult, dy = e.deltaY * mult;
  if (e.shiftKey && !dx) { dx = dy; dy = 0; }
  rolarCamera(-dx, -dy);
}, { passive: false });
// Pinça no trackpad do Safari (os outros navegadores mandam Ctrl + roda).
vista.addEventListener('gesturestart', e => { if (!editandoPlanta()) return; e.preventDefault(); gesto = cam.k; });
vista.addEventListener('gesturechange', e => { if (!editandoPlanta() || gesto === null) return; e.preventDefault(); const r = vista.getBoundingClientRect(); zoomEm(e.clientX - r.left, e.clientY - r.top, gesto * e.scale / cam.k); });
vista.addEventListener('gestureend', () => { gesto = null; });
vista.addEventListener('mousedown', e => {
  if (e.button === 1 && editandoPlanta()) e.preventDefault(); // sem a rolagem automática do botão do meio
  // Clicar na barra flutuante não tira o foco de onde estava: Espaço, Esc e as letras das ferramentas continuam valendo.
  if (e.target.closest('.tela-ui button, .tela-ui input, .tela-ui label')) e.preventDefault();
});
vista.addEventListener('click', e => {
  const m = e.target.closest('[data-menu]');
  if (m) { acaoMenu(m.dataset.menu); return; }
  switch (e.target.closest('[data-tela]')?.dataset.tela) {
    case 'menos': zoomNoCentro(1 / 1.25); break;
    case 'mais': zoomNoCentro(1.25); break;
    case 'cem': zoomPara(1); break;
    case 'enquadrar': enquadrar(); break;
    case 'atalhos': alternarAtalhos(); break;
    case 'cheio': alternarCheio(); break;
  }
});
document.addEventListener('pointerdown', e => { if (!e.target.closest('#menu-ctx')) fecharMenuCtx(); }, true);
document.addEventListener('change', e => { if (e.target.id === 'op-paredes') estado.comParedes = e.target.checked; });
new ResizeObserver(() => { if (editandoPlanta()) agendarDesenho(); }).observe(vista);
// Na tela cheia, a planta começa logo abaixo da barra de salvar, que muda de altura (mensagens, rascunho, telas estreitas).
new ResizeObserver(() => { if (document.body.classList.contains('editor-cheio')) medirBarra(); }).observe($('.barra-salvar'));

/* ---------- Teclado (chamado pelo keydown de eventos.js quando ninguém está digitando) ---------- */
function teclaPlanta(e) {
  const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k, mod = e.ctrlKey || e.metaKey, menu = $('#menu-ctx');
  // Durante um arrasto nenhum atalho mexe nos dados (os índices do arrasto ficariam errados); Esc cancela o arrasto.
  if (arrasto) { e.preventDefault(); if (k === 'Escape') cancelarArrasto(); return; }
  if (!menu.hidden) {
    if (k === 'Escape') { fecharMenuCtx(); return; }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      const bs = $$('button', menu), i = bs.indexOf(document.activeElement);
      bs[(i + (k === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]?.focus();
    }
    return;
  }
  const controle = e.target.closest?.('button,a,summary,input');
  if (k === 'Enter' && cadeia) { e.preventDefault(); terminarCadeia(); return; }
  // Na barra de ferramentas, ←/→ andam entre os botões (padrão de toolbar); Enter, setas e Delete ficam com o botão focado.
  if (controle?.closest('#ferr') && (k === 'ArrowLeft' || k === 'ArrowRight')) {
    e.preventDefault();
    const bs = $$('#ferr button'), i = bs.indexOf(controle);
    bs[(i + (k === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length].focus();
    return;
  }
  if (controle && /^(Enter|Delete|Backspace|Arrow)/.test(k)) return;
  if (k === ' ' && !e.defaultPrevented && !controle) { e.preventDefault(); if (!teclaEspaco) { teclaEspaco = true; vista.classList.add('mao'); } return; }
  if (mod) {
    const recortar = () => { copiarSelecao(true); excluirSelecao(); dica(`Recortado · ${MODK}+V cola onde estiver o mouse`, 4); };
    const acao = { a: selecionarTudo, d: duplicarSelecao, c: () => copiarSelecao(), x: recortar, v: () => colar() }[kl];
    if (acao && (kl === 'a' || kl === 'v' ? kl === 'a' || copiados : estado.selecao.length)) { e.preventDefault(); acao(); }
    return;
  }
  if (e.altKey) return;
  if (k === 'Escape') return escapar();
  if (k === 'Enter' && CRIA.has(estado.ferramenta)) { e.preventDefault(); criarNoCentro(estado.ferramenta); return; }
  if ((k === 'F2' || k === 'Enter') && estado.alvo && !e.defaultPrevented) { e.preventDefault(); editarSelecionado(); return; }
  if (k === 'Delete' || k === 'Backspace') { if (estado.selecao.length) { e.preventDefault(); excluirSelecao(); } return; }
  const seta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
  if (seta) { if (estado.selecao.length) { e.preventDefault(); empurrarSelecao(seta, e.shiftKey ? 1 : 5); } return; }
  if (e.shiftKey && e.code === 'Digit1') { enquadrar(); return; }
  if (e.shiftKey && e.code === 'Digit0') { zoomPara(1); return; }
  if (k === '+' || k === '=') { zoomNoCentro(1.25); return; }
  if (k === '-') { zoomNoCentro(1 / 1.25); return; }
  if (k === '?') { alternarAtalhos(); return; }
  const f = !e.shiftKey && Object.keys(FERRAMENTAS).find(n => FERRAMENTAS[n][1].toLowerCase() === kl);
  if (f) usarFerramenta(f);
}
function escapar() {
  if (arrasto) return cancelarArrasto();
  if (cadeia) return terminarCadeia();
  if (!$('#atalhos').hidden) return alternarAtalhos(false);
  if (estado.ferramenta !== 'sel') return usarFerramenta('sel');
  if (estado.selecao.length) { selecionar([]); render(); return; }
  if (document.body.classList.contains('editor-cheio')) alternarCheio(false);
}
document.addEventListener('keyup', e => { if (e.key === ' ' && teclaEspaco) { teclaEspaco = false; vista.classList.remove('mao'); } });
window.addEventListener('blur', () => { teclaEspaco = false; vista.classList.remove('mao'); });
