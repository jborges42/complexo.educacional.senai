'use strict';
/* Base: constantes, datas, migração dos dados, geometria e desenho da planta. */
const RECARGA_MS = 300000, VEL_LETREIRO = 110;
const INICIO_CROQUI = '2026-11-09'; // segunda-feira seguinte ao croqui: início das enturmações vindas dos post-its
const sb = window.supabase && SUPABASE_URL && SUPABASE_CHAVE ? window.supabase.createClient(SUPABASE_URL, SUPABASE_CHAVE) : null;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CAT = { ensino: 'Auditórios e salas', lab: 'Laboratórios', admin: 'Administrativo', conv: 'Convivência', serv: 'Serviços', circ: 'Circulação' };
const CORES = { ensino: '#164193', lab: '#008AD1', admin: '#F08A00', conv: '#52AE32', serv: '#009E96', circ: '#7A869E' };
const POSTIT = { rosa: '#FF5C93', amarelo: '#FFE433', limao: '#CDEB3B', laranja: '#FFA928' };
const POSTIT_NOME = { rosa: 'Rosa', amarelo: 'Amarelo', limao: 'Verde-limão', laranja: 'Laranja' };
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const ORDEM_DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const DIA_NOME = { seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira', qui: 'Quinta-feira', sex: 'Sexta-feira', sab: 'Sábado', dom: 'Domingo' };
const DIA_CURTO = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
const TURNOS = { m: 'Manhã', t: 'Tarde', n: 'Noite', i: 'Dia todo' };
const TURNO_CURTO = { m: 'M', t: 'T', n: 'N', i: 'Dia' };
const ORD_TURNO = { m: 0, t: 1, n: 2, i: 3 };
const TIPOS = { sala: 'Sala (paredes à parte)', zona: 'Zona aberta (tracejada)', piso: 'Circulação (piso)', veiculo: 'Carreta / veículo' };
const SECOES = { planta: ['Planta e espaços', 'i-predio'], calendario: ['Calendário', 'i-cal'], recados: ['Recados', 'i-recado'], telao: ['Telão', 'i-tela'] };
const ZOOMS = [1, 1.25, 1.5, 2, 2.5];

/* ---------- Datas: sempre 'AAAA-MM-DD' no fuso local (new Date('AAAA-MM-DD') seria UTC) ---------- */
const pad = n => String(n).padStart(2, '0');
const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// setFullYear evita que anos 0–99 virem 1900–1999 (new Date(26, …) seria 1926).
const dataDe = iso => { const [a, m, d] = String(iso).split('-').map(Number), x = new Date(2000, m - 1, d); x.setFullYear(a); return x; };
const dataValida = iso => /^20\d\d-\d\d-\d\d$/.test(String(iso || ''));
const somaDias = (iso, n) => { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); };
const hojeIso = () => isoDe(new Date());
const diaSemana = iso => SEMANA[dataDe(iso).getDay()];
const segundaDa = iso => somaDias(iso, -((dataDe(iso).getDay() + 6) % 7));
const ddmm = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
const ddmmaaaa = iso => iso ? `${ddmm(iso)}/${iso.slice(0, 4)}` : '';
const diaCurto = iso => `${DIA_CURTO[diaSemana(iso)].toLowerCase()}, ${ddmm(iso)}`;
// As aulas vêm da planilha oficial (js/planilha.js) e se repetem toda semana nos dias marcados.
const ocorre = (e, iso) => (e.dias || []).includes(diaSemana(iso));
const sobrepoe = (a, b) => a === b || a === 'i' || b === 'i';
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const dataBr = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; };
const primeira = (e, desde) => { for (let n = 0; n < 7; n++) { const iso = somaDias(desde, n); if (ocorre(e, iso)) return iso; } return desde; };

/* ---------- Migração: formatos antigos → versão 3 (calendário de enturmação) ---------- */
// O quadro semanal antigo (aulas por dia da semana dentro de cada espaço) vira enturmações datadas.
// Os ids são determinísticos para que dois navegadores migrando o mesmo documento cheguem ao mesmo resultado.
function migrar(d) {
  if (!d || typeof d !== 'object' || !d.locais) return d;
  d.config = d.config && typeof d.config === 'object' ? d.config : {};
  d.config.telao = { giro: 15, ...(d.config.telao || {}) };
  // Vista de cada área (Editor › Telão). O formato antigo, config.espelho com 'h', 'v' ou 'hv' por área, vira espelho + rotação.
  const ANTIGO = { h: { espelho: true }, v: { espelho: true, rotacao: 180 }, hv: { rotacao: 180 } }, esp = d.config.espelho || {};
  const vi = d.config.vista || { onde: esp.onde, locais: Object.fromEntries(Object.entries(esp.locais || {}).map(([k, x]) => [k, ANTIGO[x] || {}])) };
  d.config.vista = { onde: vi.onde === 'todas' ? 'todas' : 'telao', locais: { ...(vi.locais || {}) } };
  delete d.config.espelho;
  if (!Array.isArray(d.recados)) d.recados = [];
  if (!Array.isArray(d.enturmacoes)) d.enturmacoes = [];
  if ((+d.versao || 0) < 3) {
    const grupos = new Map();
    for (const [lid, L] of Object.entries(d.locais)) for (const a of L.ambientes || []) {
      if (!a.aulas) continue;
      a.aloc = true;
      for (const [dia, o] of Object.entries(a.aulas)) for (const [k, lista] of Object.entries(o || {})) for (const turma of lista || []) {
        const turno = k === 'd' ? 'i' : k;
        if (!TURNOS[turno] || !DIA_NOME[dia]) continue;
        const chave = `${lid}|${a.id}|${turno}|${turma}`;
        if (!grupos.has(chave)) grupos.set(chave, { lid, id: a.id, turma, turno, dias: new Set() });
        grupos.get(chave).dias.add(dia);
      }
      delete a.aulas;
    }
    for (const g of grupos.values()) d.enturmacoes.push({
      id: `m-${g.lid}-${g.id}-${g.turno}-${slug(g.turma)}`, local: g.lid, ambiente: g.id, turma: g.turma, prof: '',
      obs: g.turno === 'i' ? 'Do post-it do croqui (turno não informado).' : 'Do post-it do croqui.',
      inicio: INICIO_CROQUI, periodo: 30, dias: ORDEM_DIAS.filter(x => g.dias.has(x)), turno: g.turno,
    });
    d.versao = 3;
  }
  return d;
}

/* ---------- Estado ---------- */
let dados = migrar(window.DADOS);
let publicado = JSON.stringify(dados);
const fotosNovas = {};
const desfazer = [], refazer = [];
let arrasto = null, antesCampo = null, ocioso = null, giro = null;
let versaoBase = null, fonte = 'local', sessao = null, ehEditor = false, mescla = null, recEditando = null, rolarCal = false;

function agora() {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  return { data: isoDe(d), turno: h < 12.5 ? 'm' : h < 18 ? 't' : 'n' };
}
const estado = {
  modo: 'ver', secao: 'planta', local: 'andar1', sel: null, alvo: null, selecao: [], data: hojeIso(), turno: 'todos', turma: null,
  zoom: 0, d3: false, ferramenta: 'sel', paredeExt: 0, comParedes: true, auto: true, girar: true,
  vistaLocal: {}, // Espelhar e Girar no link público, por área: valem só para quem está vendo
  cal: { inicio: segundaDa(hojeIso()), dias: 7, fds: false, local: 'todos', busca: '', modo: 'grade', todos: false },
};

const base = $('#base'), camadas = $('#camadas'), palco = $('#palco'), vista = $('#vista');
const Lc = () => dados.locais[estado.local];
const juntar = l => l.join(' · ');
const ents = () => planilha.aulas; // só a planilha oficial; dados.enturmacoes (do editor antigo) não aparece mais
const doDia = iso => ents().filter(e => ocorre(e, iso));
const ambDe = (lid, id) => lid === FORA ? planilha.fora.find(a => a.id === id) : dados.locais[lid]?.ambientes.find(a => a.id === id);
const nomeAmb = (lid, id) => ambDe(lid, id)?.nome || 'Espaço removido';
const nomeLocal = lid => lid === FORA ? 'Outros ambientes' : dados.locais[lid]?.nome || '';
// Áreas da planta e, no fim, os ambientes da planilha que não estão desenhados (só nas listas, sem planta).
const areas = () => [...Object.entries(dados.locais), ...(planilha.fora.length
  ? [[FORA, { nome: nomeLocal(FORA), ambientes: planilha.fora.map(a => ({ ...a, tipo: 'sala', cat: 'ensino', aloc: true })) }]] : [])];
function porTurno(l) { const o = { m: [], t: [], n: [], i: [] }; for (const e of l) (o[e.turno] || o.i).push(e); return o; }
const aulasDe = (a, lid = estado.local, iso = estado.data) => porTurno(doDia(iso).filter(e => e.local === lid && e.ambiente === a.id));
const temAlguma = (a, lid = estado.local) => ents().some(e => e.local === lid && e.ambiente === a.id);
const usaTurma = (a, c) => doDia(estado.data).some(e => e.local === estado.local && e.ambiente === a.id && e.turma === c);
const todos = () => Object.entries(dados.locais).flatMap(([lid, L]) => L.ambientes.map(a => ({ lid, L, a })));
const sn = v => Math.round(v / 5) * 5;
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const maiusc = s => s.charAt(0).toUpperCase() + s.slice(1);
const novoId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const arred = (x, y, w, h, r = 14) => { r = Math.min(r, w / 2, h / 2); return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`; };
const giroMs = () => Math.min(300, Math.max(5, +dados.config?.telao?.giro || 15)) * 1000;
// De quanto em quanto tempo o telão busca a versão salva (Editor › Telão). Sem nada cadastrado, 15 s.
const recargaMs = () => Math.min(3600, Math.max(5, +dados.config?.telao?.recarga || 15)) * 1000;
const recadosAtivos = iso => (dados.recados || []).filter(r => r.texto && (!r.inicio || r.inicio <= iso) && (!r.fim || iso <= r.fim))
  .sort((x, y) => (y.destaque ? 1 : 0) - (x.destaque ? 1 : 0));

/* ---------- Geometria ---------- */
// Portas cortam as paredes onde estão; aberturas sem porta são vãos na própria parede.
function cortar(paredes, portas) {
  const out = [];
  for (const [x1, y1, x2, y2, e] of paredes) {
    const h = Math.abs(y1 - y2) < .5, v = Math.abs(x1 - x2) < .5;
    if (!h && !v) { out.push([x1, y1, x2, y2, e]); continue; }
    const c = h ? y1 : x1;
    let partes = [[Math.min(h ? x1 : y1, h ? x2 : y2), Math.max(h ? x1 : y1, h ? x2 : y2)]];
    for (const p of portas) {
      if ((p.o === 'h') !== h || Math.abs((h ? p.y : p.x) - c) > 4) continue;
      const pa = h ? p.x : p.y, pb = pa + p.w;
      partes = partes.flatMap(([s, t]) => pb <= s || pa >= t ? [[s, t]] : [[s, pa], [pb, t]].filter(([u, w]) => w - u > .5));
    }
    for (const [s, t] of partes) out.push(h ? [s, c, t, c, e] : [c, s, c, t, e]);
  }
  return out;
}
function portaSVG(p) {
  const h = p.o === 'h', w = p.w, inv = p.inv ? 1 : 0;
  const hx = h ? p.x + inv * w : p.x, hy = h ? p.y : p.y + inv * w;
  const dx = h ? (inv ? -1 : 1) : 0, dy = h ? 0 : (inv ? -1 : 1), nx = h ? 0 : p.lado, ny = h ? p.lado : 0;
  const ax = hx + nx * w, ay = hy + ny * w, bx = hx + dx * w, by = hy + dy * w;
  return `<path class="folha" d="M${hx} ${hy}L${ax} ${ay}"/><path class="arco" d="M${ax} ${ay}A${w} ${w} 0 0 ${nx * dy - ny * dx > 0 ? 1 : 0} ${bx} ${by}"/>`;
}
const portaBB = p => p.o === 'h' ? [p.x, Math.min(p.y, p.y + p.lado * p.w), p.w, p.w] : [Math.min(p.x, p.x + p.lado * p.w), p.y, p.w, p.w];
// q: planta girada 90° ou 270°. Os textos continuam deitados na tela, ou seja, ao longo do y da planta.
function limites(L, q = false) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const inc = (a, b, c, d) => { x0 = Math.min(x0, a, c); y0 = Math.min(y0, b, d); x1 = Math.max(x1, a, c); y1 = Math.max(y1, b, d); };
  L.ambientes.forEach(a => inc(a.x, a.y, a.x + a.w, a.y + a.h));
  L.paredes.forEach(([a, b, c, d]) => inc(a, b, c, d));
  L.marcas.forEach(m => {
    const w = m.t.length * (m.aqui ? 10.5 : 9.5) + 8; // girada, a âncora é recalculada: reserva o texto dos dois lados
    if (q) inc(m.x - 12, m.y - w, m.x + 12, m.y + w);
    else inc(m.ancora === 'end' ? m.x - w : m.x - w / 2, m.y - 10, m.ancora === 'end' ? m.x : m.x + w / 2, m.y + 10);
    inc(...m.seta);
  });
  L.textos.forEach(t => { const w = t.t.length * (t.nota ? 6.6 : 8.4); if (q) inc(t.x - 12, t.y - w / 2, t.x + 12, t.y + w / 2); else inc(t.x - w / 2, t.y - 12, t.x + w / 2, t.y + 6); });
  if (L.patio) inc(L.patio[0], L.patio[1], L.patio[0] + L.patio[2], L.patio[1] + L.patio[3]);
  if (!Number.isFinite(x0)) return [0, 0, 1000, 600];
  const p = 26;
  return [x0 - p, y0 - p, x1 - x0 + 2 * p, y1 - y0 + 2 * p];
}

/* ---------- Vista: espelho, giro e zoom de cada área ---------- */
// A vista salva (Editor › Telão) é a que o telão mostra: espelho (esquerda ↔ direita, como a câmera frontal), rotação em graus
// no sentido horário, zoom (1 = a área inteira) e centro do enquadramento, em coordenadas da planta. O link público usa o espelho
// e o giro salvos quando "onde" é 'todas', e quem visita pode espelhar e girar só para si (o zoom do link público é de quem vê).
// O editor da planta mostra sempre a orientação original: lá o mouse trabalha direto nas coordenadas da planta.
const vistaSalva = lid => dados.config.vista.locais[lid] || {};
function vistaDe(lid) {
  const cfg = dados.config.vista, salva = vistaSalva(lid), m = estado.modo;
  if (m === 'telao' || (m === 'editar' && estado.secao === 'telao')) return salva;
  if (m !== 'ver') return {};
  const { espelho, rotacao } = cfg.onde === 'todas' ? salva : {};
  return { espelho, rotacao, ...estado.vistaLocal[lid] };
}
// [a, b, c, d] da matriz SVG, sem a translação: espelha primeiro, depois gira (só múltiplos de 90°).
function linearVista(v) {
  const q = ((Math.round((+v.rotacao || 0) / 90) % 4) + 4) % 4, s = v.espelho ? -1 : 1;
  return [[s, 0, 0, 1], [0, s, -1, 0], [-s, 0, 0, -1], [0, -s, 1, 0]][q];
}
// Enquadramento de uma área: viewBox, transform do desenho e a contra-transform de cada texto, aplicada no ponto do próprio
// texto, que o deixa de pé e legível no lugar novo. O giro é em torno do centro da área; o quadro do zoom não sai dela.
function quadroVista(Lo, v) {
  const [a, b, c, d] = linearVista(v), q = a === 0, bb = limites(Lo, q), cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2;
  const w = q ? bb[3] : bb[2], h = q ? bb[2] : bb[3], z = Math.min(ZOOMS[ZOOMS.length - 1], Math.max(1, +v.zoom || 1));
  const tela = ([x, y]) => [a * (x - cx) + c * (y - cy) + cx, b * (x - cx) + d * (y - cy) + cy];
  const planta = ([x, y]) => [a * (x - cx) + b * (y - cy) + cx, c * (x - cx) + d * (y - cy) + cy];
  const dentro = (p, o, t) => Math.min(o + t / 2 - t / 2 / z, Math.max(o - t / 2 + t / 2 / z, p));
  const ok = z > 1 && Array.isArray(v.centro) && v.centro.length === 2 && v.centro.every(Number.isFinite);
  const [px, py] = ok ? tela(v.centro) : [cx, cy], id = a === 1 && d === 1;
  return {
    vb: [dentro(px, cx, w) - w / 2 / z, dentro(py, cy, h) - h / 2 / z, w / z, h / z], z, lin: [a, b, c, d], planta,
    tf: id ? '' : `matrix(${a} ${b} ${c} ${d} ${cx - a * cx - c * cy} ${cy - b * cx - d * cy})`,
    contra: (x, y) => id ? '' : `matrix(${a} ${c} ${b} ${d} ${x - a * x - b * y} ${y - c * x - d * y})`,
  };
}
// Botões. Espelhar inverte o que se vê (esquerda ↔ direita) mesmo com a planta girada; Girar vira 90° no sentido horário.
const espelhar = v => ({ ...v, espelho: !v.espelho, rotacao: (360 - (+v.rotacao || 0)) % 360 });
const girar = v => ({ ...v, rotacao: ((+v.rotacao || 0) + 90) % 360 });
function zoomVista(v, passo) {
  const z = +v.zoom || 1, n = passo > 0 ? ZOOMS.find(x => x > z) : ZOOMS.filter(x => x < z).pop();
  return n ? { ...v, zoom: n } : v;
}
// Move o enquadramento (dx, dy em unidades da tela) e guarda o centro já limitado à área, em coordenadas da planta.
function deslocar(v, dx, dy) {
  const L = Lc(), { vb, planta } = quadroVista(L, v), w = { ...v, centro: planta([vb[0] + vb[2] / 2 + dx, vb[1] + vb[3] / 2 + dy]) };
  const q = quadroVista(L, w);
  return { ...w, centro: q.planta([q.vb[0] + q.vb[2] / 2, q.vb[1] + q.vb[3] / 2]).map(Math.round) };
}
const attrT = t => t ? ` transform="${t}"` : '';

/* ---------- Rótulos ---------- */
// Quebra o nome em linhas que caibam na largura do espaço (máx. 3 linhas).
function quebrar(texto, largura, tam) {
  const max = Math.max(4, Math.floor((largura - 10) / (tam * 0.58)));
  const linhas = [];
  let atual = '';
  for (const p of String(texto).split(/\s+/).filter(Boolean)) {
    if (!atual) atual = p;
    else if ((atual + ' ' + p).length <= max) atual += ' ' + p;
    else { linhas.push(atual); atual = p; }
  }
  if (atual) linhas.push(atual);
  return linhas.length > 3 ? [...linhas.slice(0, 2), linhas.slice(2).join(' ')] : linhas;
}
// q: planta girada 90° ou 270° (na tela a sala fica com a.h de largura e a.w de altura); pe: texto em pé na tela.
// O texto quebra no comprimento que a sala tem na direção dele.
const linhasRotulo = (a, q = false, pe = emPe(a, q)) => {
  const piso = a.tipo === 'piso', tam = piso ? 10.5 : (a.tam || 15);
  const ls = Array.isArray(a.rot) ? a.rot : piso ? [a.nome] : quebrar(a.nome, pe === q ? a.w : a.h, tam);
  return piso ? ls.map(l => l.toUpperCase()) : ls;
};
// Com a planta girada 90°/270°: quanto o texto deitado ocuparia na tela (mesma conta do quebrar(); o piso é maiúsculo e espaçado).
const larguraDeitado = a => { const piso = a.tipo === 'piso', tam = piso ? 10.5 : (a.tam || 15); return Math.max(0, ...linhasRotulo(a, true, false).map(l => l.length * tam * (piso ? .78 : .58))); };
// Texto em pé na tela? Sem giro de 90°, só o que foi desenhado assim (a.giro). Com 90° ou 270° a sala troca largura e altura:
// o texto em pé deita; o deitado diminui até 30% para caber e só fica em pé se nem assim couber numa sala que ficou
// mais alta que larga (um corredor, por exemplo).
function emPe(a, q) {
  if (!q || a.giro) return !q && !!a.giro;
  return a.w > a.h && larguraDeitado(a) * .7 > a.h - 10;
}
function centro(a) { return [a.x + (a.lx ?? a.w / 2), a.y + (a.ly ?? a.h / 2)]; }
function renomear(a, nome) {
  a.nome = nome;
  if (!(Array.isArray(a.rot) && a.rot.length === 0)) delete a.rot; // o texto da planta passa a seguir o nome (a menos que esteja oculto)
  delete a.rotOculto; // texto personalizado guardado enquanto oculto: com o nome novo, ao reaparecer segue o nome
}

/* ---------- Desenho ---------- */
function ambSVG(a, k) {
  const t = a.tipo || 'sala', d = 6, rx = a.rx ?? (t === 'veiculo' ? 14 : 0);
  const f = a.forma === 'elipse'
    ? `<ellipse class="forma" cx="${a.x + a.w / 2}" cy="${a.y + a.h / 2}" rx="${a.w / 2}" ry="${a.h / 2}"/><ellipse class="realce" cx="${a.x + a.w / 2}" cy="${a.y + a.h / 2}" rx="${Math.max(a.w / 2 - d, 1)}" ry="${Math.max(a.h / 2 - d, 1)}"/>`
    : `<rect class="forma" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="${rx}"/><rect class="realce" x="${a.x + d}" y="${a.y + d}" width="${Math.max(a.w - 2 * d, 1)}" height="${Math.max(a.h - 2 * d, 1)}" rx="${Math.max(rx - d, 2)}"/>`;
  // No telão e na prévia do Editor › Telão a planta não tem ação: as salas não são botões.
  const botao = estado.modo === 'telao' || (estado.modo === 'editar' && estado.secao === 'telao') ? '' : ' tabindex="0" role="button" aria-pressed="false"';
  return `<g class="amb cat-${a.cat} t-${t}" data-id="${esc(a.id)}" style="--k:${k}"${botao} aria-label="${esc(a.nome)}, ${CAT[a.cat]}">${f}</g>`;
}
function rotulo(a, k, contra, lin = [1, 0, 0, 1]) {
  const t = a.tipo || 'sala', piso = t === 'piso', q = lin[0] === 0, pe = emPe(a, q), larg = q && !pe ? larguraDeitado(a) : 0;
  const enc = larg > a.h - 10 ? Math.max(.7, (a.h - 10) / larg) : 1; // girada 90°/270°: letra menor para o texto deitado caber
  const ls = linhasRotulo(a, q, pe), [cx, cy] = centro(a), tam = (piso ? 10.5 : (a.tam || 15)) * enc, lh = tam * 1.2;
  const n = ls.length + (a.sub ? 1 : 0), y0 = cy - (n - 1) * lh / 2;
  let tx = ls.map((l, i) => `<tspan x="${cx}" y="${y0 + i * lh}">${esc(l)}</tspan>`).join('');
  if (a.sub) tx += `<tspan class="rot-sub" x="${cx}" y="${y0 + ls.length * lh}">${esc(a.sub)}</tspan>`;
  const gp = pe ? a.giro || -90 : 0, tf = [contra(cx, cy), gp ? `rotate(${gp} ${cx} ${cy})` : ''].filter(Boolean).join(' ');
  // O selo fica "abaixo" do texto. Numa sala estreita ele sai da sala; com a planta virada, ele vai "acima" quando é esse o
  // lado que agora aponta para onde ele ficava no desenho original (senão cairia na sala vizinha).
  const g = (a.giro || 0) * Math.PI / 180, u = [-Math.sin(g), Math.cos(g)], r = gp * Math.PI / 180; // u: lado original do selo
  const lado = [lin[0] * u[0] + lin[2] * u[1], lin[1] * u[0] + lin[3] * u[1]], abaixo = [-Math.sin(r), Math.cos(r)]; // na tela
  const acima = !!(a.giro || pe) && lado[0] * abaixo[0] + lado[1] * abaixo[1] < 0;
  const sh = estado.modo === 'telao' ? 28 : 22, sy = n ? (acima ? y0 - lh * .5 - 6 - sh : y0 + (n - 1) * lh + lh * .5 + 6) : cy - sh / 2;
  const selo = !piso && (a.aloc || temAlguma(a)) ? `<g class="selo" data-cx="${cx}"><rect x="${cx - 30}" y="${sy}" width="60" height="${sh}" rx="${sh / 2}"/><text x="${cx}" y="${sy + sh / 2}"></text></g>` : '';
  return `<g class="r cat-${a.cat} t-${t}" data-r="${esc(a.id)}" style="--k:${k}"${attrT(tf)}>${n ? `<text class="rot" style="font-size:${tam}px">${tx}</text>` : ''}${selo}</g>`;
}
const DEFS = '<defs><marker id="seta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#E8490F"/></marker></defs>';

function desenhar() {
  const L = Lc(), ed = estado.modo === 'editar' && estado.secao === 'planta';
  // No editor da planta o viewBox vem da câmera (zoom e pan do usuário, js/desenho.js) e #conteudo fica sem transform;
  // nas outras telas a planta se ajusta ao espaço com a vista da área (espelho, giro e zoom).
  const cv = ed ? camVB() : null, qv = cv ? null : quadroVista(L, vistaDe(estado.local)), vb = cv || qv.vb;
  palco.style.aspectRatio = estado.modo === 'telao' || cv ? '' : `${vb[2]} / ${vb[3]}`;
  palco.style.setProperty('--ar', vb[2] / vb[3]);
  const tf = qv?.tf || '', contra = qv?.contra || (() => '');
  // A animação de entrada só roda quando a área muda: o desenho é refeito a cada movimento do mouse no editor.
  base.classList.toggle('surgir', base.dataset.local !== estado.local);
  base.dataset.local = estado.local;
  const cortadas = cortar(L.paredes, L.portas);
  const pp = e => cortadas.filter(p => !!p[4] === e).map(([a, b, c, d]) => `M${a} ${b}L${c} ${d}`).join('');
  const veic = L.ambientes.filter(a => a.tipo === 'veiculo').map(a => arred(a.x, a.y, a.w, a.h, a.rx ?? 14)).join('');
  const paredes = `<path class="par-ext" d="${pp(true)}"/><path class="par-int" d="${pp(false)}${veic}"/>`;
  const fundo = L.patio ? `<rect class="patio" x="${L.patio[0]}" y="${L.patio[1]}" width="${L.patio[2]}" height="${L.patio[3]}" rx="18"/>` : '';
  const textos = L.textos.map((t, i) => `<text class="${t.nota ? 'txt-nota' : 'txt-piso'}" data-t="${i}" x="${t.x}" y="${t.y}"${attrT(contra(t.x, t.y))}>${esc(t.t)}</text>`).join('');
  const desenhos = L.ambientes.filter(a => a.desenho).map(a => `<g transform="translate(${a.x - a.ref[0]} ${a.y - a.ref[1]})">${a.desenho}</g>`).join('');
  const marcas = L.marcas.map((m, i) => {
    let anc = m.ancora || 'middle';
    if (tf) { // planta virada: o texto continua do lado oposto ao da ponta da seta mais perto dele, como foi desenhado
      const [x1, y1, x2, y2] = m.seta, [sx, sy] = Math.hypot(x1 - m.x, y1 - m.y) <= Math.hypot(x2 - m.x, y2 - m.y) ? [x1 - m.x, y1 - m.y] : [x2 - m.x, y2 - m.y];
      const [a, b, c, d] = qv.lin, dx = a * sx + c * sy, dy = b * sx + d * sy;
      anc = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'end' : 'start') : 'middle';
    }
    // "Você está aqui" (aqui: true): texto maior e um ponto pulsando logo depois da ponta da seta
    const [ax, ay, bx, by] = m.seta, n = Math.hypot(bx - ax, by - ay) || 1, px = Math.round((bx + 10 * (bx - ax) / n) * 10) / 10, py = Math.round((by + 10 * (by - ay) / n) * 10) / 10;
    const ponto = m.aqui ? `<circle class="aqui-onda" cx="${px}" cy="${py}" r="8"/><circle class="aqui-ponto" cx="${px}" cy="${py}" r="6"/>` : '';
    return `<g class="acesso${m.aqui ? ' aqui' : ''}" data-m="${i}">${ponto}<path d="M${m.seta[0]} ${m.seta[1]}L${m.seta[2]} ${m.seta[3]}" marker-end="url(#seta)"/><text x="${m.x}" y="${m.y}" text-anchor="${anc}" dominant-baseline="central"${attrT(contra(m.x, m.y))}>${esc(m.t)}</text></g>`;
  }).join('');
  base.setAttribute('viewBox', vb.join(' '));
  base.setAttribute('aria-label', `Planta: ${L.nome}`);
  // O desenho é refeito do zero: o espaço que tinha o foco do teclado recebe o foco de novo (sem mexer na câmera).
  const focoId = base.contains(document.activeElement) ? document.activeElement.closest('.amb')?.dataset.id : null;
  // Os textos soltos ficam por cima dos espaços (um texto criado dentro de uma sala continua visível).
  // Com zoom, o desenho é recortado no quadro salvo: a prévia do Editor › Telão e qualquer telão mostram o mesmo trecho
  // (sem o recorte, o svg com overflow visível mostraria mais ou menos planta conforme o formato de cada tela).
  const [ab, fe] = qv?.z > 1 ? [`<defs><clipPath id="quadro"><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}"/></clipPath></defs><g clip-path="url(#quadro)">`, '</g>'] : ['', ''];
  base.innerHTML = DEFS + ab + `<g id="conteudo"${attrT(tf)}>` + fundo + `<g>${L.ambientes.map(ambSVG).join('')}</g><g class="desenhos">${desenhos}</g><g>${paredes}</g><g>${L.portas.map(portaSVG).join('')}</g><g>${L.ambientes.map((a, k) => rotulo(a, k, contra, qv?.lin)).join('')}</g>${textos}${marcas}` + (ed ? sobreposicao(L) : '') + '</g>' + fe;
  if (tf) $$('.desenhos text', base).forEach(t => t.setAttribute('transform', contra(+t.getAttribute('x'), +t.getAttribute('y'))));
  camadas.innerHTML = estado.d3 ? Array.from({ length: 14 }, (_, i) => `<svg viewBox="${vb.join(' ')}" style="--i:${i + 1}" aria-hidden="true">${fe ? '<g clip-path="url(#quadro)">' : ''}<g${attrT(tf)}>${paredes}</g>${fe}</svg>`).join('') : '';
  hudCamera(cv);
  estadosPlanta();
  if (focoId) { refocando = true; base.querySelector(`.amb[data-id="${CSS.escape(focoId)}"]`)?.focus({ preventScroll: true }); refocando = false; }
}

function seloTxt(a) {
  const o = aulasDe(a), tem = ['m', 't', 'n', 'i'].some(k => o[k].length);
  if (!planilha.lido) return null; // sem ler a planilha não dá para dizer que está livre
  const t = estado.turno, tur = l => juntar(l.map(e => partesAula(e)[0]));
  // "Livre" só quando a planilha lista o espaço nesse dia e turno, com o horário vazio; fora dela, sem selo
  const livre = coberto(estado.local, a.id, t, diaSemana(estado.data)) ? { txt: 'Livre', livre: true } : null;
  if (!tem) return livre;
  if (t !== 'todos') {
    const l = [...o[t], ...o.i];
    return l.length ? { txt: tur(l) } : livre;
  }
  const p = [];
  if (o.m.length && o.t.length && tur(o.m) === tur(o.t)) p.push(`M/T ${tur(o.m)}`);
  else { if (o.m.length) p.push(`M ${tur(o.m)}`); if (o.t.length) p.push(`T ${tur(o.t)}`); }
  if (o.n.length) p.push(`N ${tur(o.n)}`);
  if (o.i.length) p.push(tur(o.i));
  return { txt: p.join('  |  ') };
}

function estadosPlanta() {
  const L = Lc(), tel = estado.modo === 'telao';
  for (const a of L.ambientes) {
    const g = base.querySelector(`.amb[data-id="${CSS.escape(a.id)}"]`), r = base.querySelector(`.r[data-r="${CSS.escape(a.id)}"]`);
    const hl = !!estado.turma && usaTurma(a, estado.turma);
    const dim = estado.modo === 'ver' && (estado.turma ? !hl : estado.turno !== 'todos' && !naPlanilha(estado.local, a.id) && !temAlguma(a) && a.tipo !== 'piso');
    const sel = estado.modo === 'editar' ? estaSel('amb', a.id) : estado.sel === a.id;
    for (const el of [g, r]) if (el) { el.classList.toggle('sel', sel); el.classList.toggle('hl', hl); el.classList.toggle('dim', dim); }
    if (g?.hasAttribute('aria-pressed')) g.setAttribute('aria-pressed', sel);
    const s = r && $('.selo', r);
    if (s) {
      const o = seloTxt(a);
      s.style.display = o ? '' : 'none';
      if (!o) continue;
      s.classList.toggle('livre', !!o.livre);
      r.classList.toggle('agora', tel && !o.livre);
      $('text', s).textContent = o.txt;
      medir(s);
    }
  }
  if (estado.modo === 'editar') {
    $$('[data-m]', base).forEach(el => el.classList.toggle('on', estaSel('marca', +el.dataset.m)));
    $$('[data-t]', base).forEach(el => el.classList.toggle('on', estaSel('texto', +el.dataset.t)));
  }
}
function medir(selo) {
  const t = $('text', selo), r = $('rect', selo);
  if (!t.textContent || !t.getComputedTextLength) return;
  const w = t.getComputedTextLength() + (estado.modo === 'telao' ? 26 : 20);
  r.setAttribute('x', +selo.dataset.cx - w / 2);
  r.setAttribute('width', w);
}
/* Seleção do editor: lista de alvos {tipo:'amb', id} ou {tipo:'parede'|'porta'|'marca'|'texto', i}.
   estado.alvo é o alvo quando há um só (é ele que o inspetor edita); estado.sel é o id do espaço nesse caso. */
function selecionar(lista) {
  estado.selecao = lista;
  estado.alvo = lista.length === 1 ? lista[0] : null;
  estado.sel = estado.alvo?.tipo === 'amb' ? estado.alvo.id : null;
}
function selecionarAlvo(alvo) { selecionar(alvo ? [alvo] : []); }
const mesmoAlvo = (a, b) => a.tipo === b.tipo && (a.tipo === 'amb' ? a.id === b.id : a.i === b.i);
const estaSel = (tipo, ref) => estado.selecao.some(s => s.tipo === tipo && (tipo === 'amb' ? s.id === ref : s.i === ref));
const ambSel = () => estado.alvo?.tipo === 'amb' ? Lc().ambientes.find(a => a.id === estado.alvo.id) : null;
