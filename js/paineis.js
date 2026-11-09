'use strict';
/* Painéis de leitura: cabeçalho, detalhes, aulas do dia, legenda, recados, calendário e telão. */

function visibilidade() {
  const m = estado.modo, s = estado.secao;
  $$('[data-modo]').forEach(el => {
    const okModo = el.dataset.modo.split(' ').includes(m);
    const okSecao = m !== 'editar' || !el.dataset.secao || el.dataset.secao.split(' ').includes(s);
    el.hidden = !(okModo && okSecao);
  });
}

// Como a planta aparece: "espelhada e girada 90°, zoom de 150%" (vazio na vista original). No editor, a vista do telão.
function sobreVista() {
  const ver = estado.modo === 'ver', v = ver ? vistaDe(estado.local) : vistaSalva(estado.local);
  return [[v.espelho && 'espelhada', +v.rotacao && `girada ${+v.rotacao}°`].filter(Boolean).join(' e '), !ver && v.zoom > 1 && `zoom de ${Math.round(v.zoom * 100)}%`].filter(Boolean).join(', ');
}
function cabecalho() {
  const L = Lc(), ed = estado.modo === 'editar';
  $('#olho').innerHTML = ed
    ? `<span class="tag-ed">Modo edição</span><a href="#${esc(estado.local)}">Ver como visitante</a>`
    : 'Novo ambiente · croqui digitalizado';
  $('#sub-geral').textContent = ed
    ? 'Edite a planta, os recados e o telão; depois salve para atualizar o link público. As aulas vêm da planilha oficial.'
    : 'Distribuição das salas, calendário de enturmação e recados · toque em um espaço para ver os detalhes';
  $('#abas').innerHTML = Object.entries(dados.locais).map(([id, l]) =>
    `<button type="button" class="aba" role="tab" id="aba-${id}" data-local="${id}" aria-controls="painel-planta" aria-selected="${id === estado.local}" tabindex="${id === estado.local ? 0 : -1}"${ed ? ' title="Dois cliques para renomear esta área"' : ''}><svg class="ic"><use href="#${l.icone || 'i-predio'}"/></svg><span><strong>${esc(l.nome)}</strong><small>${esc(l.aba)}</small></span></button>`).join('');
  $('#titulo-local').textContent = L.titulo;
  // Vista da área (base.js). No link público vale a de quem vê, e o zoom é o da página; no editor, em qualquer seção,
  // os botões e o subtítulo mostram a vista salva para o telão.
  const ver = estado.modo === 'ver', v = ver ? vistaDe(estado.local) : vistaSalva(estado.local), z = ver ? ZOOMS[estado.zoom] : +v.zoom || 1, sv = sobreVista();
  $('#sub-local').textContent = L.sub + (!sv ? '' : ver ? ` · planta ${sv}${estado.vistaLocal[estado.local] ? ' (só nesta tela)' : ''}` : ` · no telão: ${sv}`);
  const di = $('#data-plano');
  if (document.activeElement !== di) di.value = estado.data;
  $('#d-hoje').disabled = estado.data === hojeIso();
  $('#turnos').innerHTML = [['todos', 'Todos'], ['m', 'Manhã'], ['t', 'Tarde'], ['n', 'Noite']].map(([k, v]) => `<button type="button" data-turno="${k}" aria-pressed="${k === estado.turno}">${v}</button>`).join('');
  $('#b3d').setAttribute('aria-pressed', estado.d3);
  $('#bespelho').setAttribute('aria-pressed', !!v.espelho);
  $('#zmenos').disabled = z <= ZOOMS[0];
  $('#zmais').disabled = z >= ZOOMS[ZOOMS.length - 1];
  $('#zajustar').disabled = ver ? estado.zoom === 0 && !estado.vistaLocal[estado.local] : !Object.keys(v).length;
  $('#zajustar').title = ver ? 'Voltar à vista com que a página abre' : 'Voltar à vista original: sem zoom, sem giro e sem espelho';
  palco.style.setProperty('--zoom', ver ? ZOOMS[estado.zoom] : 1);
  // Com zoom no Editor › Telão a planta se arrasta e, com o foco nela, as setas movem o enquadramento.
  const enq = enquadrando();
  vista.classList.toggle('enquadrar', enq);
  if (enq) { vista.tabIndex = 0; vista.setAttribute('role', 'group'); vista.setAttribute('aria-label', 'Enquadramento do telão: arraste a planta ou use as setas para mover'); }
  else for (const at of ['tabindex', 'role', 'aria-label']) vista.removeAttribute(at);
  mostrarSituacao();
}

// Situação da leitura da planilha, no rodapé e no calendário. Chamada também quando uma releitura não mudou nada.
function mostrarSituacao() {
  const av = planilha.avisos.length;
  $('#rodape-txt').textContent = `${situacaoPlanilha()}${av ? ` (${av} ${av === 1 ? 'linha não entendida' : 'linhas não entendidas'})` : ''} · planta atualizada em ${dataBr(dados.atualizado)}, sem escala, digitalizada a partir do croqui de 06/11/2026`;
  $('#rodape-txt').title = planilha.avisos.join('\n');
  $('#cal-fonte').textContent = situacaoPlanilha();
}

function detalhe() {
  const el = $('#detalhe'), L = Lc(), a = L.ambientes.find(x => x.id === estado.sel);
  $('#det-titulo').textContent = 'Ambiente';
  if (!a) {
    const n = L.ambientes.filter(x => x.tipo !== 'piso').length, ne = ents().filter(e => e.local === estado.local).length;
    el.innerHTML = `<p class="vazio"><svg class="ic"><use href="#i-toque"/></svg><span>Selecione um espaço na planta ou na legenda para ver nome, mobiliário, acessos e aulas.</span></p>
      <p class="resumo-local"><strong>${esc(L.nome)}</strong> · ${n} ${n === 1 ? 'espaço' : 'espaços'} · ${planilha.lido ? `${ne} ${ne === 1 ? 'enturmação' : 'enturmações'}` : esc(situacaoPlanilha())}</p>`;
    return;
  }
  const o = aulasDe(a);
  const itens = ['m', 't', 'n', 'i'].flatMap(k => o[k].map(e => `<li><b>${TURNOS[k]}</b> ${esc(partesAula(e).join(' · '))}${e.obs ? `<small>${esc(e.obs)}</small>` : ''}</li>`));
  const aulas = itens.length ? `<ul class="det-aulas">${itens.join('')}</ul>` : !planilha.lido ? esc(situacaoPlanilha())
    : coberto(estado.local, a.id, 'todos', diaSemana(estado.data)) ? '<b style="color:var(--verde-txt)">Livre</b>' : 'Sem aulas na planilha neste dia';
  el.innerHTML = `<h4 class="det-nome">${esc(a.nome)}</h4>
    <div class="chips"><span class="chip" style="--c:${CORES[a.cat]}"><i></i>${CAT[a.cat]}</span><span class="chip">${esc(L.nome)}</span></div>
    <dl>
      <dt>Aulas · ${diaCurto(estado.data)}</dt><dd>${aulas}</dd>
      ${a.croqui ? `<dt>No croqui</dt><dd>“${esc(a.croqui)}”</dd>` : ''}
      ${a.moveis ? `<dt>Mobiliário</dt><dd>${esc(a.moveis)}</dd>` : ''}
      ${a.acesso ? `<dt>Acesso</dt><dd>${esc(a.acesso)}</dd>` : ''}
      ${a.postit ? `<dt>Post-it</dt><dd><span class="postit" style="--p:${POSTIT[a.postit.cor] || '#ccc'}"><i></i>${esc(a.postit.texto)}</span></dd>` : ''}
    </dl>
    ${a.obs ? `<p class="obs">${esc(a.obs)}</p>` : ''}`;
}

const marcar = v => v === estado.turma ? `<mark>${esc(v)}</mark>` : esc(v);
const ordenarCodigos = l => [...new Set(l)].sort((x, y) => (parseInt(x.replace(/\D/g, '')) || 1e4) - (parseInt(y.replace(/\D/g, '')) || 1e4) || x.localeCompare(y, 'pt'));
function ocupacao() {
  const iso = estado.data, l = doDia(iso), codigos = ordenarCodigos(l.map(e => e.turma).filter(Boolean));
  if (estado.turma && !codigos.includes(estado.turma)) { estado.turma = null; estadosPlanta(); }
  $('#ocup-titulo').textContent = `Aulas · ${diaCurto(iso)}`;
  $('#turmas').innerHTML = codigos.map(c => `<button type="button" class="turma" data-turma="${esc(c)}" aria-pressed="${c === estado.turma}">${esc(c)}</button>`).join('');
  const nota = $('#nota-dia');
  nota.hidden = l.length > 0;
  nota.textContent = planilha.lido ? `Nenhuma aula na planilha para ${DIA_NOME[diaSemana(iso)].toLowerCase()}, ${ddmm(iso)}.` : situacaoPlanilha();
  const cols = l.some(e => e.turno === 'n') ? ['m', 't', 'n'] : ['m', 't'];
  const aula = e => { const [p, ...r] = partesAula(e); return `<span class="tb-ent">${marcar(p)}${r.length ? `<small>${esc(r.join(' · '))}</small>` : ''}</span>`; };
  $('#tab-ocup thead').innerHTML = `<tr><th scope="col">Ambiente</th>${cols.map(k => `<th scope="col">${TURNOS[k]}</th>`).join('')}</tr>`;
  $('#tab-ocup tbody').innerHTML = areas().flatMap(([lid, L]) => L.ambientes.map(a => ({ lid, L, a })))
    .filter(({ lid, a }) => a.tipo !== 'piso' && (naPlanilha(lid, a.id) || l.some(e => e.local === lid && e.ambiente === a.id))).map(({ lid, L, a }) => {
      const o = porTurno(l.filter(e => e.local === lid && e.ambiente === a.id));
      const cel = k => o[k].length ? `<td>${o[k].map(aula).join('')}</td>` : !o.i.length && coberto(lid, a.id, k, diaSemana(iso)) ? '<td class="livre">Livre</td>' : '<td></td>';
      const diaTodo = o.i.length ? `<span class="sem-turno">Dia todo: ${o.i.map(e => esc(partesAula(e).join(' · '))).join(', ')}</span>` : '';
      const nome = `<strong>${esc(a.nome)}</strong><small>${esc(L.nome)}</small>`;
      return `<tr class="${lid === estado.local && a.id === estado.sel ? 'sel' : ''}"><th scope="row">${lid === FORA ? `<span class="sem-planta">${nome}</span>` : `<button type="button" data-ir="${esc(`${lid}-${a.id}`)}">${nome}</button>`}${diaTodo}</th>${cols.map(cel).join('')}</tr>`;
    }).join('');
  $('#onde').innerHTML = !estado.turma ? '' : l.filter(e => e.turma === estado.turma).sort((x, y) => ORD_TURNO[x.turno] - ORD_TURNO[y.turno])
    .map(e => `<li>${TURNOS[e.turno]}: ${e.local === FORA ? `<strong>${esc(nomeAmb(e.local, e.ambiente))}</strong>` : `<button type="button" data-ir="${esc(`${e.local}-${e.ambiente}`)}">${esc(nomeAmb(e.local, e.ambiente))}</button>`} · ${esc([nomeLocal(e.local), e.modulo, e.prof].filter(Boolean).join(' · '))}</li>`).join('');
}

function legenda() {
  const L = Lc(), itens = c => L.ambientes.filter(a => a.cat === c && a.tipo !== 'piso');
  $('#legenda').innerHTML = Object.keys(CAT).map(c => {
    const l = itens(c);
    if (!l.length) return '';
    return `<li class="cat-${c}"><div class="leg-cab"><i></i>${CAT[c]}<small>${l.length}</small></div>
      <div class="leg-itens">${l.map(a => `<button type="button" data-sel="${esc(a.id)}" aria-pressed="${a.id === estado.sel}">${esc(a.nome)}</button>`).join('')}</div></li>`;
  }).join('');
  $('#tr-leg').innerHTML = Object.keys(CAT).filter(c => itens(c).length).map(c => `<span class="cat-${c}"><i></i>${CAT[c]}</span>`).join('');
}

function recadosVer() {
  const l = recadosAtivos(hojeIso());
  $('#card-recados').hidden = !l.length;
  $('#rec-ver').innerHTML = l.map(r => `<li class="${r.destaque ? 'destaque' : ''}">${r.destaque ? '<b>Importante</b>' : ''}${esc(r.texto)}</li>`).join('');
}

/* Faixa de recados: só recomeça a animação quando o conteúdo muda (o telão redesenha a cada troca de área). */
function letreiro(el, itens, previa = false) {
  if (!itens.length && !previa) { el.hidden = true; el.dataset.chave = ''; return; }
  el.hidden = false;
  const chave = JSON.stringify(itens.map(r => [r.texto, !!r.destaque]));
  if (el.dataset.chave === chave) return;
  el.dataset.chave = chave;
  const txt = $('.letreiro-texto', el), trilho = $('.letreiro-trilho', el);
  $('.letreiro-sr', el).textContent = itens.map(r => r.texto).join('. ');
  txt.style.animation = 'none';
  txt.innerHTML = itens.length
    ? itens.map(r => `<span class="rec${r.destaque ? ' destaque' : ''}">${r.destaque ? '<b>Importante</b>' : ''}${esc(r.texto)}</span>`).join('<i aria-hidden="true">•</i>')
    : '<span class="rec vazio">Os recados ativos aparecem aqui, passando na parte de baixo do telão.</span>';
  el.dataset.temItens = itens.length ? '1' : '';
  txt.dataset.medida = '';
  if (!el.dataset.observado) { obsLetreiro.observe(trilho); obsLetreiro.observe(txt); el.dataset.observado = '1'; }
  requestAnimationFrame(() => animarLetreiro(el));
}
// O percurso depende da largura da faixa e do texto: recalcula quando qualquer um muda
// (redimensionar, tela cheia, fonte carregada), sem reiniciar à toa quando nada mudou.
const obsLetreiro = new ResizeObserver(lista => { for (const en of lista) { const el = en.target.closest('.letreiro'); if (el) animarLetreiro(el); } });
function animarLetreiro(el) {
  const txt = $('.letreiro-texto', el), trilho = $('.letreiro-trilho', el);
  if (!el.dataset.temItens) { txt.style.animation = 'none'; return; }
  const W = trilho.clientWidth, w = txt.scrollWidth;
  if (!W || !w || txt.dataset.medida === `${W}|${w}`) return;
  txt.dataset.medida = `${W}|${w}`;
  txt.style.setProperty('--de', `${W}px`);
  txt.style.setProperty('--ate', `${-w}px`);
  txt.style.animation = 'none';
  void txt.offsetWidth; // reinicia a animação com o percurso novo
  txt.style.animation = `letreiro ${Math.max(8, (W + w) / VEL_LETREIRO)}s linear infinite`;
}

/* ---------- Calendário de enturmação ---------- */
function intervaloCal() {
  const c = estado.cal, fim = somaDias(c.inicio, c.dias - 1);
  const datas = Array.from({ length: c.dias }, (_, i) => somaDias(c.inicio, i)).filter(iso => c.fds || !['sab', 'dom'].includes(diaSemana(iso)));
  return { fim, datas };
}
const classeDia = (iso, hoje) => [iso === hoje && 'hoje', ['sab', 'dom'].includes(diaSemana(iso)) && 'fds', iso === estado.data && 'sel'].filter(Boolean).join(' ');
const diasTxt = e => (e.dias || []).map(d => DIA_CURTO[d]).join(', ');
const tituloEnt = e => [TURNOS[e.turno], ...partesAula(e), nomeAmb(e.local, e.ambiente), diasTxt(e), e.obs].filter(Boolean).join(' · ');

function calendario() {
  const c = estado.cal, { fim, datas } = intervaloCal(), b = norm(c.busca), hoje = hojeIso();
  $('#cal-planilha').href = `https://docs.google.com/spreadsheets/d/${PLANILHA_ID}/edit`;
  const casa = e => !b || [e.turma, e.modulo, e.prof, e.obs, nomeAmb(e.local, e.ambiente)].some(v => norm(v).includes(b));
  const vis = ents().filter(e => (c.local === 'todos' || e.local === c.local) && casa(e));
  $('#cal-periodo').textContent = `${ddmm(c.inicio)} a ${ddmmaaaa(fim)} · ${vis.length} ${vis.length === 1 ? 'enturmação' : 'enturmações'}`;
  mostrarSituacao();
  $$('#cal-dias [data-cal-dias]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.calDias === c.dias));
  $$('#cal-modo [data-cal-modo]').forEach(x => x.setAttribute('aria-pressed', x.dataset.calModo === c.modo));
  if (c.local !== 'todos' && !areas().some(([lid]) => lid === c.local)) c.local = 'todos';
  $('#cal-local').innerHTML = '<option value="todos">Todas as áreas</option>' + areas().map(([lid, L]) => `<option value="${esc(lid)}"${lid === c.local ? ' selected' : ''}>${esc(L.nome)}</option>`).join('');
  if (document.activeElement !== $('#cal-busca')) $('#cal-busca').value = c.busca;
  $('#cal-fds').checked = c.fds;
  $('#cal-todos').checked = c.todos;
  $('#cal-todos-l').hidden = c.modo === 'lista';
  const tab = $('#cal-tab');
  tab.className = c.modo === 'lista' ? 'cal-lista' : 'cal-tab';
  tab.style.setProperty('--col', c.dias === 7 ? '128px' : c.dias === 15 ? '92px' : '74px');
  const vazio = n => `<tr><td colspan="${n}"><p class="vazio-cal">${b ? 'Nenhuma enturmação encontrada para essa busca.' : planilha.lido ? 'Nenhuma enturmação na planilha.' : esc(situacaoPlanilha())}</p></td></tr>`;
  if (c.modo === 'lista') {
    const l = vis.slice().sort((x, y) => nomeAmb(x.local, x.ambiente).localeCompare(nomeAmb(y.local, y.ambiente), 'pt', { numeric: true }) || ORD_TURNO[x.turno] - ORD_TURNO[y.turno] || ORDEM_DIAS.indexOf(x.dias[0]) - ORDEM_DIAS.indexOf(y.dias[0]));
    const obs = l.some(e => e.obs), col = obs ? 7 : 6;
    $('thead', tab).innerHTML = `<tr><th scope="col">Turma</th><th scope="col">Módulo</th><th scope="col">Professor(a)</th><th scope="col">Ambiente</th><th scope="col">Turno</th><th scope="col">Dias</th>${obs ? '<th scope="col">Observações</th>' : ''}</tr>`;
    $('tbody', tab).innerHTML = l.length ? l.map(e => `<tr><th scope="row"><button type="button" class="ent tn-${e.turno}" data-ent="${esc(e.id)}" data-iso="${primeira(e, c.inicio)}" title="${esc(tituloEnt(e))}"><b>${TURNO_CURTO[e.turno]}</b> ${esc(e.turma || '—')}</button></th><td>${esc(e.modulo || '—')}</td><td>${esc(e.prof || '—')}</td><td>${esc(nomeAmb(e.local, e.ambiente))}<small>${esc(nomeLocal(e.local))}</small></td><td>${TURNOS[e.turno]}</td><td>${diasTxt(e)}</td>${obs ? `<td>${esc(e.obs)}</td>` : ''}</tr>`).join('') : vazio(col);
    return;
  }
  const linhas = [];
  for (const [lid, L] of areas()) {
    if (c.local !== 'todos' && c.local !== lid) continue;
    const ambs = L.ambientes.filter(a => a.tipo !== 'piso' && (vis.some(e => e.local === lid && e.ambiente === a.id) || (!b && (c.todos || naPlanilha(lid, a.id)))));
    if (!ambs.length) continue;
    linhas.push(`<tr class="cal-grupo"><th scope="rowgroup" colspan="${datas.length + 1}"><span>${esc(L.nome)}</span></th></tr>`);
    for (const a of ambs) {
      const meus = vis.filter(e => e.local === lid && e.ambiente === a.id);
      const todosAqui = ents().filter(e => e.local === lid && e.ambiente === a.id);
      const cels = datas.map(iso => {
        const l = meus.filter(e => ocorre(e, iso)).sort((x, y) => ORD_TURNO[x.turno] - ORD_TURNO[y.turno]);
        // o choque considera todas as enturmações do espaço no dia, mesmo as escondidas pela busca
        const doDiaAqui = todosAqui.filter(e => ocorre(e, iso));
        const conf = new Set(l.filter(x => doDiaAqui.some(y => y.id !== x.id && sobrepoe(x.turno, y.turno))).map(x => x.id));
        const chips = l.map(e => {
          const [p, ...r] = partesAula(e);
          return `<button type="button" class="ent tn-${e.turno}${conf.has(e.id) ? ' conflito' : ''}" data-ent="${esc(e.id)}" data-iso="${iso}" title="${esc(tituloEnt(e) + (conf.has(e.id) ? ' · choque de horário neste espaço' : ''))}"><b>${TURNO_CURTO[e.turno]}</b> ${esc(p)}${c.dias === 7 && r.length ? `<small>${esc(r.join(' · '))}</small>` : ''}</button>`;
        }).join('');
        return `<td class="${classeDia(iso, hoje)}">${chips}</td>`;
      }).join('');
      linhas.push(`<tr><th scope="row" class="cal-amb cat-${a.cat}"><i aria-hidden="true"></i>${esc(a.nome)}</th>${cels}</tr>`);
    }
  }
  $('thead', tab).innerHTML = `<tr><th scope="col" class="cal-canto">Ambiente</th>${datas.map(iso => `<th scope="col" class="${classeDia(iso, hoje)}"><button type="button" data-ver-dia="${iso}" title="Mostrar ${DIA_NOME[diaSemana(iso)].toLowerCase()}, ${ddmm(iso)} na planta">${DIA_CURTO[diaSemana(iso)]}<b>${ddmm(iso)}</b></button></th>`).join('')}</tr>`;
  $('tbody', tab).innerHTML = linhas.join('') || vazio(datas.length + 1);
}

/* ---------- Telão ---------- */
function relogio() {
  const d = new Date();
  $('#tt-hora').textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $('#tt-data').textContent = maiusc(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  $('#tt-agora').textContent = estado.auto ? `Agora · ${TURNOS[estado.turno]}` : `Exibindo · ${diaCurto(estado.data)} · ${TURNOS[estado.turno].toLowerCase()}`;
}
function telao() {
  const L = Lc(), t = estado.turno;
  $('#tt-local').textContent = L.nome;
  $('#tc-sair').href = `#${estado.local}`;
  relogio();
  const doTurno = doDia(estado.data).filter(e => e.turno === t || e.turno === 'i');
  const grupos = areas().map(([lid, lo]) => ({
    lid, lo, itens: lo.ambientes.map(a => ({ a, l: doTurno.filter(e => e.local === lid && e.ambiente === a.id).sort((x, y) => ORD_TURNO[x.turno] - ORD_TURNO[y.turno]) })).filter(x => x.l.length),
  })).filter(g => g.itens.length);
  const aula = e => { const [p, ...r] = partesAula(e); return `<span><b>${esc(p)}</b>${r.length ? `<small>${esc(r.join(' · '))}</small>` : ''}</span>`; };
  $('#telao-lado').innerHTML = `<h2>Aulas · <b>${TURNOS[t]}</b></h2>` + (grupos.length
    ? grupos.map(g => `<section class="tl-grupo${g.lid === estado.local ? ' atual' : ''}"><h3>${esc(g.lo.nome)}</h3><ul>${g.itens.map(i => `<li><span>${esc(i.a.nome)}</span><span class="tl-turmas">${i.l.map(aula).join('')}</span></li>`).join('')}</ul></section>`).join('')
    : `<p class="tl-vazio">${planilha.lido ? `Nenhuma aula na planilha para ${DIA_NOME[diaSemana(estado.data)].toLowerCase()}, ${ddmm(estado.data)}, no turno da ${TURNOS[t].toLowerCase()}.` : esc(situacaoPlanilha())}</p>`);
  // Só recria as áreas (e a barra de progresso) quando a área ou os nomes mudam: assim a barra acompanha o temporizador.
  const tl = $('#tr-locais'), chaveLocais = JSON.stringify([Object.entries(dados.locais).map(([id, l]) => [id, l.nome]), estado.local]);
  if (tl.dataset.chave !== chaveLocais) {
    tl.dataset.chave = chaveLocais;
    tl.innerHTML = Object.entries(dados.locais).map(([id, l]) => `<button type="button" data-local="${id}" aria-current="${id === estado.local}">${esc(l.nome)}</button>`).join('');
  }
  document.body.style.setProperty('--giro', `${giroMs() / 1000}s`);
  document.body.classList.toggle('parado', !estado.girar);
  $('#tc-girar').setAttribute('aria-pressed', estado.girar);
  $('#tc-3d').setAttribute('aria-pressed', estado.d3);
  $('#tc-turno').innerHTML = `<option value="auto"${estado.auto ? ' selected' : ''}>Horário atual</option>` + ['m', 't', 'n'].map(k => `<option value="${k}"${!estado.auto && t === k ? ' selected' : ''}>${TURNOS[k]}</option>`).join('');
  $('#tc-data').value = estado.data;
  $('#tc-data').disabled = estado.auto;
  $('#tc-cheia').lastChild.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
  letreiro($('#letreiro'), recadosAtivos(hojeIso()));
  apertarTelao();
}
// Em telas mais baixas (1280×720 etc.), compacta a lista de aulas quando ela não cabe.
function apertarTelao() {
  const lado = $('#telao-lado'), transborda = () => lado.scrollHeight > lado.clientHeight + 1;
  lado.classList.remove('apertado', 'apertado2');
  if (transborda()) lado.classList.add('apertado');
  if (transborda()) lado.classList.add('apertado2'); // ainda não cabe: esconde módulo e docente, mas mostra todos os ambientes
}
window.addEventListener('resize', () => { if (estado.modo === 'telao') apertarTelao(); });
// A barra fixa do editor muda de altura (mensagens, rascunho, celular): o foco não pode ficar escondido sob ela.
new ResizeObserver(() => {
  const b = $('.barra-salvar');
  document.documentElement.style.scrollPaddingTop = b.hidden ? '' : `${b.offsetHeight + 12}px`;
}).observe($('.barra-salvar'));
function proximoLocal(passo = 1) {
  const ids = Object.keys(dados.locais), i = ids.indexOf(estado.local);
  estado.local = ids[(i + passo + ids.length) % ids.length];
  render();
}
function reiniciarGiro() {
  clearInterval(giro);
  if (estado.modo === 'telao' && estado.girar) giro = setInterval(() => proximoLocal(1), giroMs());
}
function acordar() {
  document.body.classList.remove('ocioso');
  clearTimeout(ocioso);
  if (estado.modo === 'telao') ocioso = setTimeout(() => document.body.classList.add('ocioso'), 3500);
}
