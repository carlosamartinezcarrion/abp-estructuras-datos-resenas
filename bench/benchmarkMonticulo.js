// Benchmark del módulo de priorización con Montículo (Unidad 2, Issue #39).
// Compara el rendimiento de obtener el Top-K y actualizar el ranking frente a MergeSort y QuickSort.
// Ejecutar con: node --expose-gc bench/benchmarkMonticulo.js 
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const { Monticulo } = require('../src/Monticulo');
const { ordenarMergeSort } = require('../src/MergeSort');
const { ordenarQuickSort } = require('../src/QuickSort');
const { porCalificacion } = require('../src/Comparadores');

const RUTA_PELICULAS = path.join(__dirname, '..', 'data', 'peliculas.json');
const TOP_K = 10;

// --- PRNG sembrado: reproduce exactamente los mismos datos sintéticos que ordenamiento.js ---
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

function conPuntajeSintetico(peliculas, prng) {
  return peliculas.map((p) => ({
    ...p,
    promedio: 1 + prng() * 4,
    cantidad: Math.floor(prng() * 10000),
  }));
}

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

function imprimirTop(encabezado, peliculas) {
  console.log(`\n${encabezado}`);
  console.log('-'.repeat(78));
  for (let i = 0; i < peliculas.length; i++) {
    const p = peliculas[i];
    const prom = typeof p.promedio === 'number' ? p.promedio.toFixed(2) : '  - ';
    const cant = typeof p.cantidad === 'number' ? String(p.cantidad) : '-';
    console.log(
      `${String(i + 1).padStart(3)}. ${p.titulo.padEnd(40)} | ${String(p.anio).padStart(4)} | prom: ${prom} | votos: ${cant.padStart(5)}`
    );
  }
}

// --- Demo: ranking Top-5 con Montículo vs MergeSort sobre las 12 películas reales ---
function demo() {
  console.log('='.repeat(78));
  console.log('DEMO: RANKING TOP-5 CON MONTÍCULO VS ORDENAMIENTO COMPLETO');
  console.log('(las 12 películas reales del proyecto + calificación sintética)');
  console.log('='.repeat(78));

  const prng = crearPRNG(2026);
  const reales = conPuntajeSintetico(cargarPeliculasReales(), prng);

  const monticulo = Monticulo.desdeArreglo(reales, porCalificacion);
  const topHeap = monticulo.obtenerTopK(5);
  const topMerge = ordenarMergeSort(reales.slice(), porCalificacion).slice(0, 5);

  imprimirTop('TOP-5 EXTRAÍDO CON MONTÍCULO (Heapify O(n) + 5 extracciones O(log n)):', topHeap);

  const coinciden = topHeap.every((p, i) => p.id === topMerge[i].id);
  console.log(`\nVerificación: Top-5 del Montículo coincide con MergeSort: ${coinciden ? 'SÍ' : 'NO'}`);

  // Simulación de llegada de una nueva reseña/película en tiempo real
  const estreno = {
    id: 999,
    titulo: 'Estreno Destacado 2026',
    anio: 2026,
    generos: ['Ciencia ficción'],
    promedio: 5.0,
    cantidad: 9999,
  };
  monticulo.insertar(estreno);
  console.log(`Tras insertar "${estreno.titulo}", nueva cima O(1): ${monticulo.verCima().titulo} (${monticulo.verCima().promedio.toFixed(2)})`);
}

// --- Medición de tiempo y memoria ---
function medirOperacion(fnPreparar, fnEjecutar, repeticiones) {
  const tiempos = [];
  for (let r = 0; r < repeticiones; r++) {
    const contexto = fnPreparar();
    const t0 = performance.now();
    fnEjecutar(contexto);
    const t1 = performance.now();
    tiempos.push(t1 - t0);
  }

  if (global.gc) global.gc();
  const contextoMem = fnPreparar();
  if (global.gc) global.gc();
  const heapAntes = process.memoryUsage().heapUsed;
  const resultado = fnEjecutar(contextoMem);
  if (global.gc) global.gc();
  const heapDespues = process.memoryUsage().heapUsed;
  if (resultado === null) console.log('');

  return {
    tiempoMediano: mediana(tiempos),
    tiempoMin: Math.min(...tiempos),
    tiempoMax: Math.max(...tiempos),
    memoriaMB: Math.max(0, (heapDespues - heapAntes) / (1024 * 1024)),
  };
}

function benchmark() {
  console.log('\n' + '='.repeat(78));
  console.log(`BENCHMARK: OBTENCIÓN DE TOP-${TOP_K} Y ACTUALIZACIÓN DINÁMICA`);
  console.log('='.repeat(78));

  const plantillas = cargarPeliculasReales();
  const tamanios = [
    { n: 1000,   reps: 15 },
    { n: 10000,  reps: 10 },
    { n: 100000, reps: 5  },
  ];

  const resultadosTopK = [];
  const resultadosInsercion = [];

  for (const { n, reps } of tamanios) {
    console.log(`\nGenerando ${n.toLocaleString()} registros sintéticos...`);
    const datos = generarDataset(n, plantillas);

    const nuevaPelicula = {
      id: n + 1,
      titulo: 'Película Nueva #999999',
      anio: 2026,
      generos: ['Drama'],
      promedio: 4.99,
      cantidad: 9500,
    };

    // --- Escenario 1: Obtener el Top-10 desde el catálogo completo ---
    const mHeapTop = medirOperacion(
      () => datos.slice(),
      (copia) => Monticulo.desdeArreglo(copia, porCalificacion).obtenerTopK(TOP_K),
      reps
    );

    const mMergeTop = medirOperacion(
      () => datos.slice(),
      (copia) => ordenarMergeSort(copia, porCalificacion).slice(0, TOP_K),
      reps
    );

    const mQuickTop = medirOperacion(
      () => datos.slice(),
      (copia) => ordenarQuickSort(copia, porCalificacion).slice(0, TOP_K),
      reps
    );

    resultadosTopK.push({ n, enfoque: `Montículo Top-${TOP_K}`, ...mHeapTop });
    resultadosTopK.push({ n, enfoque: `MergeSort Top-${TOP_K}`, ...mMergeTop });
    resultadosTopK.push({ n, enfoque: `QuickSort Top-${TOP_K}`, ...mQuickTop });

    // --- Escenario 2: Actualizar el ranking cuando entra 1 película nueva ---
    const heapBase = Monticulo.desdeArreglo(datos, porCalificacion);
    const mHeapIns = medirOperacion(
      () => {
        const clon = new Monticulo(porCalificacion);
        clon.datos = heapBase.datos.slice();
        return clon;
      },
      (clon) => {
        clon.insertar(nuevaPelicula);
        return clon.verCima();
      },
      reps * 5
    );

    const mMergeIns = medirOperacion(
      () => datos.concat(nuevaPelicula),
      (ampliado) => ordenarMergeSort(ampliado, porCalificacion).slice(0, TOP_K),
      reps
    );

    resultadosInsercion.push({ n, enfoque: 'Montículo (insertar + cima)', ...mHeapIns });
    resultadosInsercion.push({ n, enfoque: 'MergeSort (reordenar todo)', ...mMergeIns });
  }

  console.log('\n' + '='.repeat(78));
  console.log(`TABLA 1: CONSTRUCCIÓN Y EXTRACCIÓN DEL TOP-${TOP_K}`);
  console.log('='.repeat(78));
  console.log('| Enfoque          | Registros | Tiempo mediano (ms) | Min (ms) | Max (ms) | Heap retenido (MB) |');
  console.log('|------------------|-----------|---------------------|----------|----------|--------------------|');
  for (const r of resultadosTopK) {
    console.log(
      `| ${r.enfoque.padEnd(16)} | ${String(r.n).padStart(9)} | ${r.tiempoMediano.toFixed(3).padStart(19)} | ${r.tiempoMin.toFixed(3).padStart(8)} | ${r.tiempoMax.toFixed(3).padStart(8)} | ${r.memoriaMB.toFixed(2).padStart(18)} |`
    );
  }

  console.log('\n' + '='.repeat(78));
  console.log('TABLA 2: ACTUALIZACIÓN DEL RANKING AL INSERTAR 1 PELÍCULA NUEVA');
  console.log('='.repeat(78));
  console.log('| Enfoque                     | Registros | Tiempo mediano (ms) | Min (ms) | Max (ms) |');
  console.log('|-----------------------------|-----------|---------------------|----------|----------|');
  for (const r of resultadosInsercion) {
    console.log(
      `| ${r.enfoque.padEnd(27)} | ${String(r.n).padStart(9)} | ${r.tiempoMediano.toFixed(4).padStart(19)} | ${r.tiempoMin.toFixed(4).padStart(8)} | ${r.tiempoMax.toFixed(4).padStart(8)} |`
    );
  }

  console.log('\n' + '='.repeat(78));
  console.log('ENTORNO Y CONCLUSIONES');
  console.log('='.repeat(78));
  console.log(`  Node.js:    ${process.version}`);
  console.log(`  Plataforma: ${process.platform}`);
  console.log(`  Comparador: porCalificacion (promedio desc, cantidad desc, anio desc, titulo asc)`);
  console.log(`  Nota: Para obtener el Top-${TOP_K}, el Montículo construye en O(n) sin ordenar todo el`);
  console.log('        catálogo; al insertar nuevos registros mantiene el líder en O(log n) frente a O(n log n).');
  console.log('='.repeat(78));
}

function main() {
  if (!global.gc) {
    console.warn('AVISO: ejecutar sin --expose-gc. Las mediciones de memoria pueden ser inestables.');
    console.warn('  Recomendado: node --expose-gc bench/benchmarkMonticulo.js\n');
  }
  demo();
  benchmark();
}

main();