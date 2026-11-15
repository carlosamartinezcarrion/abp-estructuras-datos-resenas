// Benchmark del módulo de ordenamiento (Unidad 2, Avance 1, Issue #4).
// Mide tiempo y memoria de MergeSort y QuickSort sobre el dataset del proyecto.
// Ejecutar con: node --expose-gc bench/ordenamiento.js  (o: npm run bench:orden)
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const { ordenarMergeSort } = require('../src/MergeSort');
const { ordenarQuickSort } = require('../src/QuickSort');
const { porCalificacion, porAnio } = require('../src/Comparadores');

const RUTA_PELICULAS = path.join(__dirname, '..', 'data', 'peliculas.json');

// --- PRNG sembrado: los datos sintéticos son los mismos en cada ejecución ---
function crearPRNG(semilla) {
  let estado = semilla >>> 0;
  return function () {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

function mediana(numeros) {
  if (numeros.length === 0) return 0;
  const ordenados = numeros.slice().sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[mitad - 1] + ordenados[mitad]) / 2
    : ordenados[mitad];
}

function cargarPeliculasReales() {
  return JSON.parse(fs.readFileSync(RUTA_PELICULAS, 'utf8'));
}

// Añade promedio/cantidad sintéticos a las 12 películas reales (el JSON no trae reseñas).
function conPuntajeSintetico(peliculas, prng) {
  return peliculas.map((p) => ({
    ...p,
    promedio: 1 + prng() * 4,                      // float 1.0 - 5.0
    cantidad: Math.floor(prng() * 10000),
  }));
}

// Genera un dataset de tamaño n clonando los títulos reales con id y puntaje únicos.
function generarDataset(n, plantillas) {
  const prng = crearPRNG(2026 + n);
  const generos = ['Drama', 'Acción', 'Crimen', 'Ciencia ficción', 'Suspenso', 'Romance', 'Fantasía'];
  const datos = new Array(n);
  for (let i = 0; i < n; i++) {
    const base = plantillas[i % plantillas.length];
    datos[i] = {
      id: i + 1,
      titulo: `${base.titulo} #${String(i + 1).padStart(6, '0')}`,
      anio: base.anio,
      generos: [generos[Math.floor(prng() * generos.length)]],
      promedio: 1 + prng() * 4,
      cantidad: Math.floor(prng() * 10000),
    };
  }
  return datos;
}

function imprimirLista(encabezado, peliculas, max = 10) {
  if (encabezado) {
    console.log(`\n${encabezado}`);
    console.log('-'.repeat(78));
  }
  const hasta = Math.min(max, peliculas.length);
  for (let i = 0; i < hasta; i++) {
    const p = peliculas[i];
    const prom = typeof p.promedio === 'number' ? p.promedio.toFixed(2) : '  - ';
    const cant = typeof p.cantidad === 'number' ? String(p.cantidad) : '-';
    console.log(
      `${String(i + 1).padStart(3)}. ${p.titulo.padEnd(40)} | ${String(p.anio).padStart(4)} | prom: ${prom} | votos: ${cant.padStart(5)}`
    );
  }
  if (peliculas.length > max) {
    console.log(`     ... (${peliculas.length - max} más)`);
  }
}

// --- Demo: antes y después sobre las 12 películas reales ---
function demo() {
  console.log('='.repeat(78));
  console.log('DEMO: ANTES Y DESPUÉS DEL ORDENAMIENTO');
  console.log('(las 12 películas reales del proyecto + calificación sintética)');
  console.log('='.repeat(78));

  const prng = crearPRNG(2026);
  const reales = conPuntajeSintetico(cargarPeliculasReales(), prng);

  imprimirLista('ANTES (orden de carga):', reales, 12);

  const mergeRes = ordenarMergeSort(reales.slice(), porCalificacion);
  imprimirLista('DESPUÉS - MergeSort por calificación:', mergeRes, 12);

  const quickRes = ordenarQuickSort(reales.slice(), porCalificacion);
  imprimirLista('DESPUÉS - QuickSort por calificación:', quickRes, 12);

  const mismoOrden = mergeRes.every((p, i) => p.id === quickRes[i].id);
  console.log(`\nVerificación: MergeSort y QuickSort producen el mismo orden: ${mismoOrden ? 'SÍ' : 'NO'}`);

  const anioRes = ordenarMergeSort(reales.slice(), porAnio);
  imprimirLista('EXTRA - MergeSort por año (más recientes primero):', anioRes, 5);
}

// --- Medición de tiempo y memoria por algoritmo ---
function medir(algoritmo, datos, comparador, repeticiones) {
  const tiempos = [];
  // Tiempos: la copia del input queda FUERA del cronómetro
  for (let r = 0; r < repeticiones; r++) {
    const copia = datos.slice();
    const t0 = performance.now();
    algoritmo(copia, comparador);
    const t1 = performance.now();
    tiempos.push(t1 - t0);
  }

  // Memoria: gc antes para fijar la línea base, gc después para medir solo lo retenido
  if (global.gc) global.gc();
  const copiaMem = datos.slice();
  if (global.gc) global.gc();
  const heapAntes = process.memoryUsage().heapUsed;
  const resultado = algoritmo(copiaMem, comparador);
  if (global.gc) global.gc();
  const heapDespues = process.memoryUsage().heapUsed;
  // Referencia al resultado para evitar que el motor lo elimine por DCE
  if (resultado === null) console.log('');

  return {
    tiempoMediano: mediana(tiempos),
    tiempoMin: Math.min(...tiempos),
    tiempoMax: Math.max(...tiempos),
    memoriaMB: (heapDespues - heapAntes) / (1024 * 1024),
  };
}

function benchmark() {
  console.log('\n' + '='.repeat(78));
  console.log('BENCHMARK: TIEMPOS Y MEMORIA DEL ORDENAMIENTO');
  console.log('='.repeat(78));

  const plantillas = cargarPeliculasReales();
  const tamanios = [
    { n: 1000,   reps: 15 },
    { n: 10000,  reps: 10 },
    { n: 100000, reps: 5  },
  ];

  const resultados = [];

  for (const { n, reps } of tamanios) {
    console.log(`\nGenerando ${n.toLocaleString()} registros sintéticos...`);
    const datos = generarDataset(n, plantillas);

    if (n === 1000) {
      const om = ordenarMergeSort(datos.slice(), porCalificacion);
      const oq = ordenarQuickSort(datos.slice(), porCalificacion);
      const iguales = om.every((p, i) => p.id === oq[i].id);
      console.log(`Verificación previa (${n}): MergeSort y QuickSort coinciden: ${iguales ? 'SÍ' : 'NO'}`);
    }

    console.log(`Midiendo MergeSort (${reps} repeticiones)...`);
    const mMerge = medir(ordenarMergeSort, datos, porCalificacion, reps);

    console.log(`Midiendo QuickSort (${reps} repeticiones)...`);
    const mQuick = medir(ordenarQuickSort, datos, porCalificacion, reps);

    resultados.push({ n, algoritmo: 'MergeSort', ...mMerge });
    resultados.push({ n, algoritmo: 'QuickSort', ...mQuick });
  }

  console.log('\n' + '='.repeat(78));
  console.log('TABLA DE RESULTADOS');
  console.log('='.repeat(78));
  console.log('| Algoritmo | Registros | Tiempo mediano (ms) | Min (ms) | Max (ms) | Heap retenido (MB) |');
  console.log('|-----------|-----------|---------------------|----------|----------|--------------------|');
  for (const r of resultados) {
    console.log(
      `| ${r.algoritmo.padEnd(9)} | ${String(r.n).padStart(9)} | ${r.tiempoMediano.toFixed(3).padStart(19)} | ${r.tiempoMin.toFixed(3).padStart(8)} | ${r.tiempoMax.toFixed(3).padStart(8)} | ${r.memoriaMB.toFixed(2).padStart(18)} |`
    );
  }

  console.log('\n' + '='.repeat(78));
  console.log('ENTORNO');
  console.log('='.repeat(78));
  console.log(`  Node.js:    ${process.version}`);
  console.log(`  Plataforma: ${process.platform}`);
  console.log(`  Comparador: porCalificacion (promedio desc, cantidad desc, anio desc, titulo asc)`);
  console.log('  Nota: el heap retenido de QuickSort es ~0 porque ordena in-place;');
  console.log('        el de MergeSort refleja el arreglo nuevo que devuelve.');
  console.log('='.repeat(78));
}

function main() {
  if (!global.gc) {
    console.warn('AVISO: ejecutar sin --expose-gc. Las mediciones de memoria pueden ser inestables.');
    console.warn('  Recomendado: node --expose-gc bench/ordenamiento.js\n');
  }
  demo();
  benchmark();
}

main();