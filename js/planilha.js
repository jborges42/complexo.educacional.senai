'use strict';
/* Planilha oficial (Google Planilhas): é a única fonte das aulas de cada ambiente. O site só lê.
   Baixa as abas "Ambientes manhã/tarde/noite" em CSV pelo endereço de exportação do Google, que funciona direto do
   navegador (o Google libera o acesso de outros sites), sem chave e sem "Publicar na Web": basta a planilha estar
   aberta para "qualquer pessoa com o link". Os valores vêm como aparecem na planilha. As abas por turma
   (Matutino/Vespertino) não são lidas. */
const PLANILHA_ID = '1beylnyKjSrpFCWxZTmiQyUDLVt_xlE7F6WBmZr_MQB0';
// Cada aba é achada pelo gid, o número no fim do endereço com a aba aberta (…/edit#gid=54130094), e o turno vem daqui:
// renomear a aba não muda nada; apagar e recriar muda o gid, e a leitura avisa no rodapé.
const PLANILHA_ABAS = [
  { gid: 54130094, turno: 'm', nome: 'Ambientes manhã' },
  { gid: 1754137361, turno: 't', nome: 'Ambientes tarde' },
  { gid: 1807273414, turno: 'n', nome: 'Ambientes noite' },
];
// Nome do ambiente na planilha (sem acento, maiúsculas nem pontuação) → espaço da planta (área/id).
// Nomes iguais aos da planta se ligam sozinhos. Os que não se ligam a nenhum espaço aparecem em "Outros ambientes".
const PLANILHA_APELIDOS = {
  'auditorio 1': 'andar1/mu01', 'auditorio 2': 'andar1/mu02',
  'lab info complexo': 'andar1/labinfo', 'lab inf complexo': 'andar1/labinfo',
  'cozinha complexo': 'andar1/cozinha', 'sala oculos': 'andar1/sala3d', 'maker': 'andar2/maker',
  'um civil': 'carretas/civil', 'um eletrica': 'carretas/eletrica', 'um automacao': 'carretas/automacao', 'um manutencao': 'carretas/mec',
};
const FORA = 'fora'; // área virtual com os ambientes da planilha que não estão desenhados na planta
const DIAS_PLANILHA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const chaveNome = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function lerCSV(txt) {
  const linhas = [];
  let lin = [], cel = '', aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) {
      if (c !== '"') cel += c;
      else if (txt[i + 1] === '"') { cel += '"'; i++; } else aspas = false;
    } else if (c === '"') aspas = true;
    else if (c === ',') { lin.push(cel); cel = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && txt[i + 1] === '\n') i++;
      lin.push(cel); linhas.push(lin); lin = []; cel = '';
    } else cel += c;
  }
  if (cel || lin.length) { lin.push(cel); linhas.push(lin); }
  return linhas;
}

// "2ª", "2a", "Segunda", "segunda-feira", "Sábado" e listas como "2ª e 4ª", "2ª, 3ª" ou "seg/qua" → ['seg', …].
// Qualquer outra coisa (data, intervalo "2ª a 6ª", texto) → null, e a linha vira aviso em vez de cair num dia errado.
function diasDe(s) {
  const partes = String(s ?? '').toLowerCase().split(/\s*(?:[,;/+&]|\be\b)\s*/).map(chaveNome).filter(Boolean);
  const dias = partes.map(p => {
    const n = /^([2-7])(a|o)?( feira)?$/.exec(p);
    if (n) return DIAS_PLANILHA[n[1] - 2];
    return /^(seg|ter|qua|qui|sex|sab|dom)[a-z]*( feira)?$/.exec(p)?.[1] ?? null;
  });
  return dias.length && !dias.includes(null) ? [...new Set(dias)] : null;
}

/* Liga cada aula (pelo nome do ambiente na planilha, e.amb) a um espaço da planta. Muda local/ambiente das aulas e
   devolve os ambientes fora da planta e os "cobertos": espaço|turno|dia de toda linha da planilha, com aula ou vazia
   (só nesses o site pode dizer "Livre"). espacos: [{ local, ambiente, nome }] da planta. */
function ligar(aulas, listadas, espacos) {
  const porNome = new Map(espacos.map(e => [chaveNome(e.nome), e]));
  const porId = new Map(espacos.map(e => [`${e.local}/${e.ambiente}`, e]));
  const fora = new Map();
  const espacoDe = nome => {
    const k = chaveNome(nome), e = porId.get(PLANILHA_APELIDOS[k]) || porNome.get(k);
    if (e) return { local: e.local, ambiente: e.ambiente };
    const id = k.replace(/ /g, '-') || 'x';
    if (!fora.has(id)) fora.set(id, { id, nome });
    return { local: FORA, ambiente: id };
  };
  for (const e of aulas) Object.assign(e, espacoDe(e.amb));
  const cobertos = listadas.map(([amb, turno, dia]) => { const s = espacoDe(amb); return `${s.local}/${s.ambiente}|${turno}|${dia}`; });
  return { fora: [...fora.values()].sort((x, y) => x.nome.localeCompare(y.nome, 'pt', { numeric: true })), cobertos };
}

/* textos: [{ aba, txt }] na ordem de PLANILHA_ABAS. A coluna Ambiente só vem preenchida na primeira linha de cada grupo:
   as linhas de baixo herdam o valor. A mesma turma no mesmo ambiente e turno em dias diferentes vira uma enturmação com
   vários dias. */
function lerPlanilha(textos, espacos) {
  const avisos = [], grupos = new Map(), listadas = new Map();
  for (const { aba, txt } of textos) {
    const [cab = [], ...linhas] = lerCSV(txt);
    const col = p => cab.findIndex(h => chaveNome(h).startsWith(p));
    const c = { amb: col('ambiente'), dia: col('dia'), turma: col('turma'), prof: col('docente'), modulo: col('modulo'), obs: col('obs') };
    if (c.amb < 0 || c.dia < 0) throw new Error(`a aba "${aba.nome}" não tem as colunas Ambiente e Dia da semana (o gid ${aba.gid} mudou?)`);
    const v = (l, i) => i < 0 ? '' : String(l[i] ?? '').replace(/\s+/g, ' ').trim();
    let amb = '';
    linhas.forEach((l, i) => {
      amb = v(l, c.amb) || amb;
      const a = { turma: v(l, c.turma), prof: v(l, c.prof), modulo: v(l, c.modulo), obs: v(l, c.obs) };
      const vazia = !a.turma && !a.prof && !a.modulo && !a.obs, dias = diasDe(v(l, c.dia));
      if (amb && dias) dias.forEach(d => listadas.set(JSON.stringify([amb, aba.turno, d]), [amb, aba.turno, d]));
      if (vazia) return;
      if (!amb || !dias) { avisos.push(`${aba.nome}, linha ${i + 2}: ${amb ? `dia "${v(l, c.dia)}" não reconhecido` : 'sem ambiente'}`); return; }
      const e = { amb, turno: aba.turno, ...a }, k = JSON.stringify(Object.values(e));
      if (!grupos.has(k)) grupos.set(k, { id: `p${grupos.size}`, ...e, dias: [] });
      const g = grupos.get(k);
      dias.forEach(d => { if (!g.dias.includes(d)) g.dias.push(d); });
    });
  }
  const aulas = [...grupos.values()].map(e => ({ ...e, dias: DIAS_PLANILHA.filter(d => e.dias.includes(d)) }));
  const lista = [...listadas.values()];
  return { aulas, listadas: lista, avisos, ...ligar(aulas, lista, espacos) };
}

/* ---------- Leitura no navegador ---------- */
// A última leitura boa fica guardada no aparelho: o telão abre com ela e continua com ela se a rede cair.
let planilha = (() => {
  try { const c = JSON.parse(localStorage.getItem('planta-planilha')); if (c?.v === 2 && Array.isArray(c.aulas) && Array.isArray(c.cobertos)) return c; } catch { /* sem cópia */ }
  return { v: 2, aulas: [], listadas: [], fora: [], cobertos: [], avisos: [], lido: null };
})();
let erroPlanilha = '', lendoPlanilha = null, chaveLigacao = '', cobertosSet = new Set(planilha.cobertos);
const espacosDaPlanta = () => todos().filter(({ a }) => a.tipo !== 'piso').map(({ lid, a }) => ({ local: lid, ambiente: a.id, nome: a.nome }));

// A ligação aula → espaço depende da planta, que muda (renomear, excluir, versão nova do banco): refaz quando ela muda.
// Roda no começo de cada render; sem mudança na planta, não faz nada.
function religarPlanilha() {
  const esp = espacosDaPlanta(), k = JSON.stringify(esp);
  if (k === chaveLigacao) return;
  chaveLigacao = k;
  Object.assign(planilha, ligar(planilha.aulas, planilha.listadas, esp));
  cobertosSet = new Set(planilha.cobertos);
}
// O espaço aparece na planilha nesse turno e dia (com aula ou vazio)? Turno 'todos': em qualquer turno.
const coberto = (lid, id, turno, dia) => (turno === 'todos' ? ['m', 't', 'n'] : [turno]).some(t => cobertosSet.has(`${lid}/${id}|${t}|${dia}`));
const naPlanilha = (lid, id) => planilha.cobertos.some(c => c.startsWith(`${lid}/${id}|`));

// Devolve true quando as aulas mudaram (para redesenhar).
function carregarPlanilha() {
  return lendoPlanilha ||= (async () => {
    try {
      const textos = await Promise.all(PLANILHA_ABAS.map(async aba => {
        const r = await fetch(`https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/export?format=csv&gid=${aba.gid}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`a aba "${aba.nome}" respondeu ${r.status} (o gid ${aba.gid} mudou ou a planilha deixou de ser pública?)`);
        return { aba, txt: await r.text() };
      }));
      const esp = espacosDaPlanta();
      const novo = { v: 2, ...lerPlanilha(textos, esp), lido: new Date().toISOString() };
      const mudou = JSON.stringify([novo.aulas, novo.cobertos, novo.avisos]) !== JSON.stringify([planilha.aulas, planilha.cobertos, planilha.avisos]) || !!erroPlanilha || !planilha.lido;
      if (novo.avisos.length) console.warn('Linhas da planilha não entendidas:', novo.avisos);
      planilha = novo;
      chaveLigacao = JSON.stringify(esp);
      cobertosSet = new Set(planilha.cobertos);
      erroPlanilha = '';
      try { localStorage.setItem('planta-planilha', JSON.stringify(planilha)); } catch { /* sem espaço: segue sem cópia */ }
      return mudou;
    } catch (e) {
      const antes = erroPlanilha;
      erroPlanilha = e?.message || String(e);
      console.warn('Não foi possível ler a planilha:', erroPlanilha);
      return antes !== erroPlanilha;
    } finally { lendoPlanilha = null; }
  })();
}

function situacaoPlanilha() {
  const quando = planilha.lido ? dataBr(planilha.lido) : '';
  if (erroPlanilha) return planilha.lido ? `Não foi possível ler a planilha agora; mostrando a leitura de ${quando}` : 'Não foi possível ler a planilha de aulas';
  return planilha.lido ? `Aulas da planilha oficial, lida em ${quando}` : 'Lendo a planilha de aulas…';
}

// O que mostrar de cada aula, na ordem: turma, módulo, docente (as linhas sem turma começam pelo módulo).
const partesAula = e => [e.turma, e.modulo, e.prof].filter(Boolean);
