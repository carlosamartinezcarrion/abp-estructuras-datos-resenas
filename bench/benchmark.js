'use strict';
// Mediciones de tiempo y memoria.  Ejecutar:  npm run bench
const { performance } = require('perf_hooks');
const os = require('os'), fs = require('fs'), path = require('path');
const { ColaCircular } = require('../src/colaCircular');
const { ListaDoble } = require('../src/listaDoble');
const { Pila } = require('../src/pila');
const { buscarPorTitulo, busquedaSecuencial } = require('../src/busqueda');
const { guardarJSONL, cargarJSONL, indexarPosiciones, leerPorPosicion } = require('../src/archivos');

if (!global.gc) { console.error('Ejecuta con --expose-gc:  npm run bench'); process.exit(1); }
const TAMANOS = [1000, 10000, 100000];
const REPS = 30, REPS_LENTAS = 5, N_COLA = 20;
const heapMB = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed / 1048576; };
function mediana(fn, reps = REPS) {
  fn(); // calentamiento: no se mide
  const t = [];
  for (let i = 0; i < reps; i++) { const a = performance.now(); fn(); t.push(performance.now() - a); }
  t.sort((x, y) => x - y);
  return t[Math.floor(t.length / 2)];
}
const f = (x, d = 3) => x.toFixed(d).replace('.', ',');
const R = {};
const poner = (clave, valor) => { (R[clave] = R[clave] || []).push(valor); };

for (const n of TAMANOS) {
  const pelis = Array.from({ length: n }, (_, i) => ({ id: String(i), titulo: `pelicula numero ${i}` }));

  // 0) Insertar al inicio y pila LIFO frente al arreglo (unshift / shift)
  poner('Insertar n al inicio: lista doble (ms)', f(mediana(() => { const l = new ListaDoble(); for (let i = 0; i < n; i++) l.insertarInicio({ id: i }); }, REPS_LENTAS)));
  poner('Insertar n al inicio: arreglo con unshift (ms)', f(mediana(() => { const a = []; for (let i = 0; i < n; i++) a.unshift({ id: i }); }, REPS_LENTAS)));
  poner('Pila: n push + n pop (ms)', f(mediana(() => { const p = new Pila(); for (let i = 0; i < n; i++) p.push({ id: i }); for (let i = 0; i < n; i++) p.pop(); }, REPS_LENTAS)));
  poner('Arreglo: n unshift + n shift (ms)', f(mediana(() => { const a = []; for (let i = 0; i < n; i++) a.unshift({ id: i }); for (let i = 0; i < n; i++) a.shift(); }, REPS_LENTAS)));

  // 1) Búsqueda secuencial: mejor caso (primer elemento) y peor caso (último o inexistente)
  poner('Buscar por id, mejor caso: primero (ms)', f(mediana(() => busquedaSecuencial(pelis, (p) => p.id === '0'))));
  poner('Buscar por id, peor caso: último (ms)', f(mediana(() => busquedaSecuencial(pelis, (p) => p.id === String(n - 1)))));
  poner('Buscar por título sin coincidencias (ms)', f(mediana(() => buscarPorTitulo(pelis, 'zzzzz'), REPS_LENTAS)));

  // 2) Cola circular: cinco rondas de reseñas, heapUsed después del recolector
  const colas = pelis.map(() => new ColaCircular(N_COLA)), rondas = [];
  for (let r = 1; r <= 5; r++) {
    for (const c of colas) for (let j = 0; j < 50; j++) c.encolar({ usuario: j, calificacion: 4, comentario: 'x', fecha: r });
    rondas.push(f(heapMB(), 1));
  }
  poner('Cola circular, heapUsed en las rondas 1 a 5 (MB)', rondas.join(' / '));

  // 3) Archivos: guardar, cargar y leer un registro (secuencial frente a aleatorio)
  const ruta = path.join(os.tmpdir(), `bench-${process.pid}-${n}.jsonl`);
  const reg = Array.from({ length: n }, (_, i) => ({ peliculaId: String(i % 500), usuario: 'u' + (i % 97), calificacion: 1 + (i % 9) / 2, comentario: 'Reseña ' + i, fecha: '2026-11-01' }));
  const g = guardarJSONL(ruta, reg);
  poner('Archivo de reseñas: tamaño (MB)', f(g.bytes / 1048576));
  poner('Archivo: guardar todo (ms)', f(g.ms, 1));
  poner('Archivo: cargar todo, acceso secuencial (ms)', f(mediana(() => cargarJSONL(ruta), REPS_LENTAS), 1));
  const pos = indexarPosiciones(ruta);
  poner('Archivo: leer 1 registro, acceso secuencial (ms)', f(mediana(() => { cargarJSONL(ruta).registros[n - 1]; }, REPS_LENTAS)));
  poner('Archivo: leer 1 registro, acceso aleatorio (ms)', f(mediana(() => leerPorPosicion(ruta, pos, n - 1))));
  fs.unlinkSync(ruta);
}

console.log(`Equipo: ${os.cpus()[0].model}, ${(os.totalmem() / 1073741824).toFixed(1)} GB RAM, Node ${process.version}`);
console.log(`Mediana de ${REPS} repeticiones (${REPS_LENTAS} en las pruebas lentas)\n`);
console.log('| Medición | ' + TAMANOS.map((n) => String(n).replace(/\B(?=(\d{3})+$)/g, ' ')).join(' | ') + ' |');
console.log('|---|---|---|---|');
for (const [k, v] of Object.entries(R)) console.log(`| ${k} | ${v.join(' | ')} |`);
