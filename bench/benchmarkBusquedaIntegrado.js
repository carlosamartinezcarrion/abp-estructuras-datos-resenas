'use strict';
// Benchmark Avance 2 - Grupo 01. Complementa, NO reemplaza el benchmark de Selena.
// Integra busquedaBinaria de Emily con busquedaBinariaArchivo de Carlos.
// Ejecutar desde la raíz: node bench/benchmarkBusquedaIntegrado.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { busquedaBinaria } = require('../src/busqueda');
const { busquedaBinariaArchivo } = require('../src/busquedaBinariaArchivo');
const { indexarPosiciones } = require('../src/archivos');

const TAMANOS = [1000, 50000, 500000];
const REPETICIONES = 3;
const NUM_CONSULTAS = 10;
const ORIGINALES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'peliculas.json'), 'utf8'));
const compararPorId = (a, b) => a.id - b.id;

function generarRegistros(n) {
  return Array.from({ length: n }, (_, i) => {
    const base = ORIGINALES[i % ORIGINALES.length];
    return { id: i + 1, titulo: base.titulo, anio: base.anio, generos: base.generos };
  });
}

function secuencialRAM(arreglo, id) {
  let comparaciones = 0;
  for (let i = 0; i < arreglo.length; i++) {
    comparaciones++;
    if (arreglo[i].id === id) return { indice: i, comparaciones };
  }
  return { indice: -1, comparaciones };
}

// Lee el archivo desde su inicio para buscar una sola película.
// Incluye lectura y decodificación de JSONL en el tiempo medido.
function secuencialArchivo(ruta, id) {
  const lineas = fs.readFileSync(ruta, 'utf8').split('\n');
  let comparaciones = 0;
  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i]) continue;
    const registro = JSON.parse(lineas[i]);
    comparaciones++;
    if (registro.id === id) return { indice: i, comparaciones };
  }
  return { indice: -1, comparaciones };
}

function guardarPorBloques(ruta, registros) {
  const fd = fs.openSync(ruta, 'w');
  try {
    for (let i = 0; i < registros.length; i += 5000) {
      const bloque = registros.slice(i, i + 5000).map(JSON.stringify).join('\n') + '\n';
      fs.writeSync(fd, bloque);
    }
  } finally { fs.closeSync(fd); }
}

function medir(almacenamiento, algoritmo, n, consultas, buscar) {
  // Calentamiento fuera de la medida, para reducir ruido del arranque.
  const previo = buscar(consultas[0]);
  if (previo.indice === -1) throw new Error(`Falló el calentamiento (${algoritmo})`);
  let acumuladoMs = 0, totalComparaciones = 0;
  const cpuInicio = process.cpuUsage();
  for (let r = 0; r < REPETICIONES; r++) {
    const t0 = performance.now();
    for (const id of consultas) {
      const resultado = buscar(id);
      if (resultado.indice === -1) throw new Error(`No se encontró el id ${id} (${algoritmo})`);
      totalComparaciones += resultado.comparaciones;
    }
    acumuladoMs += performance.now() - t0;
  }
  const cpu = process.cpuUsage(cpuInicio);
  const cantidad = REPETICIONES * consultas.length;
  return {
    Almacenamiento: almacenamiento,
    Algoritmo: algoritmo,
    Registros: n,
    TiempoPromedio_ms: acumuladoMs / cantidad,
    ComparacionesPromedio: totalComparaciones / cantidad,
    CPU_ms_por_busqueda: (cpu.user + cpu.system) / 1000 / cantidad,
  };
}

function ejecutar() {
  const filas = [];
  console.log(`Node ${process.version} | ${process.platform} | ${process.arch}`);
  for (const n of TAMANOS) {
    console.log(`Preparando ${n.toLocaleString('es-EC')} registros...`);
    const registros = generarRegistros(n); // ya ordenados por id ascendente
    const consultas = Array.from({ length: NUM_CONSULTAS }, (_, i) => Math.floor((i + 1) * n / (NUM_CONSULTAS + 1)) + 1);
    const ruta = path.join(os.tmpdir(), `abp-busquedas-integradas-${process.pid}.jsonl`);
    try {
      guardarPorBloques(ruta, registros);
      // Construir índice ANTES de cronometrar: solo se mide cada consulta.
      const posiciones = indexarPosiciones(ruta);
      filas.push(medir('RAM', 'Secuencial', n, consultas, id => secuencialRAM(registros, id)));
      filas.push(medir('RAM', 'Binaria', n, consultas, id => busquedaBinaria(registros, { id }, compararPorId)));
      filas.push(medir('Archivo JSONL', 'Secuencial', n, consultas, id => secuencialArchivo(ruta, id)));
      filas.push(medir('Archivo indexado', 'Binaria', n, consultas, id => {
        const r = busquedaBinariaArchivo(ruta, posiciones, id);
        if (r.error) throw new Error(r.error);
        return { indice: r.posicion, comparaciones: r.comparaciones };
      }));
    } finally { if (fs.existsSync(ruta)) fs.unlinkSync(ruta); }
  }
  console.table(filas.map(r => ({ ...r,
    TiempoPromedio_ms: r.TiempoPromedio_ms.toFixed(6),
    ComparacionesPromedio: r.ComparacionesPromedio.toFixed(2),
    CPU_ms_por_busqueda: r.CPU_ms_por_busqueda.toFixed(6)
  })));
  const campos = ['Almacenamiento', 'Algoritmo', 'Registros', 'TiempoPromedio_ms', 'ComparacionesPromedio', 'CPU_ms_por_busqueda'];
  const csv = [campos.join(','), ...filas.map(f => campos.map(k => f[k]).join(','))].join('\n') + '\n';
  const salida = path.join(__dirname, 'resultadosBusquedaIntegrado.csv');
  fs.writeFileSync(salida, csv, 'utf8');
  console.log(`Resultados guardados en: ${salida}`);
}

ejecutar();
