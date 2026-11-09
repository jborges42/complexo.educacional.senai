// Confere a leitura da planilha (js/planilha.js) sem navegador: node testes/planilha.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx = vm.createContext({ localStorage: { getItem: () => null, setItem() {} } });
vm.runInContext(readFileSync(new URL('../js/planilha.js', import.meta.url), 'utf8'), ctx);
const { lerPlanilha, lerCSV, diasDe, ligar } = ctx;
const js = v => JSON.parse(JSON.stringify(v)); // objetos do vm → objetos daqui (para o deepEqual)

const espacos = [
  { local: 'andar1', ambiente: 'labinfo', nome: 'Laboratório de Informática' },
  { local: 'andar1', ambiente: 'mu01', nome: 'Multiuso 01' },
  { local: 'carretas', ambiente: 'mec', nome: 'Carreta Mecânica' },
];
const manha = `"Ambiente","Dia da semana","Módulo","Docente","Turma"
"Lab. Info. complexo","2ª","Robótica","Antônio","6º 01 "
"","3ª","Jogos","Paulo","7º 02"
"","4ª","Robótica","Antônio","6º 01"
"Auditório 1","2ª","Princ. Mecânica","Ana Flávia","7º 01"
"","3ª","","",""
"Multiuso 01","Sexta","Aula ""extra"", com vírgula","Alex",""
"UM Manutenção","9ª","Op. Mecânica","Alex",""
"","2ª e 4ª","Op. Elétrica","Bia",""
"","10/11","Visita","",""`;
const noite = `Ambiente,Dia da semana,Módulo,Docente,Turma
UM Manutenção,5ª,DP,Carlos,`;

const { aulas, fora, avisos, cobertos, listadas } = lerPlanilha([
  { aba: { nome: 'manhã', turno: 'm', gid: 1 }, txt: manha },
  { aba: { nome: 'noite', turno: 'n', gid: 2 }, txt: noite },
], espacos);
const ach = (amb, turma) => aulas.find(e => e.ambiente === amb && e.turma === turma);

assert.deepEqual(js(ach('labinfo', '6º 01').dias), ['seg', 'qua'], 'mesma turma/ambiente/turno em dias diferentes vira uma enturmação');
assert.equal(ach('labinfo', '7º 02').local, 'andar1', 'apelido liga "Lab. Info. complexo" à planta');
assert.equal(ach('auditorio-1', '7º 01').local, 'fora', 'ambiente que não está na planta fica "fora"');
assert.deepEqual(js(fora), [{ id: 'auditorio-1', nome: 'Auditório 1' }]);
assert.equal(aulas.find(e => e.ambiente === 'mu01').modulo, 'Aula "extra", com vírgula', 'CSV com aspas e vírgula; nome igual ao da planta liga sozinho');
assert.deepEqual(js(aulas.find(e => e.ambiente === 'mu01').dias), ['sex'], '"Sexta" vira sex');
assert.equal(aulas.find(e => e.modulo === 'DP').local, 'carretas', 'apelido UM Manutenção → carreta mecânica (CSV sem aspas)');
assert.equal(aulas.find(e => e.modulo === 'DP').turno, 'n', 'turno vem da aba');
assert.deepEqual(js(aulas.find(e => e.modulo === 'Op. Elétrica').dias), ['seg', 'qua'], '"2ª e 4ª" vira dois dias');
assert.equal(aulas.length, 6, 'linha vazia (só o dia) não vira aula');
assert.deepEqual(js(avisos), ['manhã, linha 8: dia "9ª" não reconhecido', 'manhã, linha 10: dia "10/11" não reconhecido'], 'dia estranho vira aviso, não cai num dia errado');
assert.ok(cobertos.includes('fora/auditorio-1|m|ter'), 'linha vazia conta como horário da planilha (o site pode dizer "Livre")');
assert.ok(!cobertos.some(c => c.startsWith('andar1/mu01|m|seg')), 'espaço que não aparece na planilha naquele dia não é "Livre"');
assert.throws(() => lerPlanilha([{ aba: { nome: 'x', turno: 'm', gid: 9 }, txt: '"Turma","Dia da semana"\n"7º 01","2ª"' }], espacos), /não tem as colunas/,
  'aba errada não é lida como se fosse de ambientes');
// religar: a planta mudou (um espaço passou a se chamar "Auditório 1") → as aulas e os horários vão para ele, sem reler a planilha
const novaPlanta = [...espacos, { local: 'andar1', ambiente: 'mu02', nome: 'Auditório 1' }];
const r = ligar(aulas, listadas, novaPlanta);
assert.equal(ach('mu02', '7º 01')?.local, 'andar1', 'renomear o espaço na planta liga as aulas a ele');
assert.deepEqual(js(r.fora), [], 'e ele sai de "Outros ambientes"');
assert.ok(r.cobertos.includes('andar1/mu02|m|ter'));
assert.deepEqual(js(diasDe('Segunda-feira')), ['seg']);
assert.deepEqual(js(diasDe('seg/qua')), ['seg', 'qua']);
assert.equal(diasDe('2ª a 6ª'), null, 'intervalo não é adivinhado');
assert.equal(diasDe(''), null);
assert.deepEqual(js(lerCSV('a,"b\nc"\r\nd,')), [['a', 'b\nc'], ['d', '']], 'quebra de linha dentro de célula e CRLF');
console.log('planilha: ok');
