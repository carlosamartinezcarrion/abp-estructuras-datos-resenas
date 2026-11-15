'use strict';
// Persistencia en archivos. Formato JSON Lines: un registro por línea.
// Acceso secuencial: leer todo el archivo de principio a fin. Acceso aleatorio: ir directo a una posición.
const fs = require('fs');
const { performance } = require('perf_hooks');

// Lee un JSON sin lanzar excepciones: si falla, devuelve un mensaje que identifica el archivo.
function leerJSON(ruta) {
  let texto;
  try { texto = fs.readFileSync(ruta, 'utf8'); }
  catch (e) { return { error: `No se pudo leer el archivo "${ruta}" (${e.code || e.message}).` }; }
  try { return { datos: JSON.parse(texto) }; }
  catch (e) { return { error: `El archivo "${ruta}" no es un JSON válido: ${e.message}` }; }
}

function guardarJSONL(ruta, registros) {
  const t0 = performance.now();
  let texto = '';
  for (let i = 0; i < registros.length; i++) texto += JSON.stringify(registros[i]) + '\n';
  try { fs.writeFileSync(ruta, texto); }
  catch (e) { return { error: `No se pudo escribir el archivo "${ruta}" (${e.code || e.message}).` }; }
  return { registros: registros.length, bytes: Buffer.byteLength(texto), ms: performance.now() - t0 };
}

function agregarJSONL(ruta, registro) {
  try { fs.appendFileSync(ruta, JSON.stringify(registro) + '\n'); return true; } catch (e) { return false; }
}

// Acceso secuencial. Las líneas con JSON inválido se cuentan y se omiten.
function cargarJSONL(ruta) {
  const t0 = performance.now();
  let texto;
  try { texto = fs.readFileSync(ruta, 'utf8'); }
  catch (e) { return { registros: [], errores: 0, error: `No se pudo leer el archivo "${ruta}" (${e.code || e.message}).` }; }
  const registros = []; let errores = 0, inicio = 0;
  while (inicio < texto.length) {
    let fin = texto.indexOf('\n', inicio); if (fin === -1) fin = texto.length;
    const linea = texto.slice(inicio, fin).trim();
    if (linea !== '') { try { registros.push(JSON.parse(linea)); } catch (e) { errores++; } }
    inicio = fin + 1;
  }
  return { registros, errores, bytes: Buffer.byteLength(texto), ms: performance.now() - t0 };
}

// Índice de posiciones (arreglo de { inicio, largo }) para poder leer cualquier línea sin recorrer el resto.
function indexarPosiciones(ruta) {
  const datos = fs.readFileSync(ruta), posiciones = [];
  let inicio = 0;
  for (let i = 0; i < datos.length; i++) if (datos[i] === 10) { if (i > inicio) posiciones.push({ inicio, largo: i - inicio }); inicio = i + 1; }
  if (inicio < datos.length) posiciones.push({ inicio, largo: datos.length - inicio });
  return posiciones;
}

// Acceso aleatorio: lee solo el registro n.
function leerPorPosicion(ruta, posiciones, n) {
  const p = posiciones[n];
  if (!p) return undefined;
  const fd = fs.openSync(ruta, 'r');
  try { const buf = Buffer.alloc(p.largo); fs.readSync(fd, buf, 0, p.largo, p.inicio); return JSON.parse(buf.toString('utf8')); }
  finally { fs.closeSync(fd); }
}
module.exports = { leerJSON, guardarJSONL, agregarJSONL, cargarJSONL, indexarPosiciones, leerPorPosicion };
