'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { Plataforma } = require('../src/plataforma');

const DATOS = path.join(__dirname, '..', 'data', 'peliculas.json');
const tmp = (n) => path.join(os.tmpdir(), `abp-u1-plat-${process.pid}-${n}`);
const resena = (peliculaId, calificacion, extra = {}) => ({ peliculaId, usuario: 'ana', calificacion, comentario: 'ok', fecha: '2026-11-01', ...extra });
function nueva(opciones) { const p = new Plataforma(opciones); p.cargarPeliculas(DATOS); return p; }

test('cargarPeliculas lee el archivo JSON', () => {
  const p = new Plataforma();
  const r = p.cargarPeliculas(DATOS);
  assert.ok(r.cargadas > 0); assert.equal(r.rechazadas, 0);
  assert.equal(p.peliculas.length, r.cargadas);
});
test('cargarPeliculas informa los errores de archivo sin lanzar excepciones', () => {
  const p = new Plataforma();
  assert.match(p.cargarPeliculas('no-existe.json').error, /no-existe\.json/);
  const ruta = tmp('obj.json'); fs.writeFileSync(ruta, '{"a":1}');
  assert.match(p.cargarPeliculas(ruta).error, /arreglo/);
  fs.unlinkSync(ruta);
});
test('agregarPelicula rechaza título vacío, id repetido y datos nulos', () => {
  const p = new Plataforma();
  assert.equal(p.agregarPelicula({ id: 1, titulo: 'Uno' }), true);
  assert.equal(p.agregarPelicula({ id: 1, titulo: 'Otra' }), false);
  assert.equal(p.agregarPelicula({ id: 2, titulo: '   ' }), false);
  assert.equal(p.agregarPelicula({ id: 3 }), false);
  assert.equal(p.agregarPelicula({ titulo: 'Sin id' }), false);
  assert.equal(p.agregarPelicula(null), false);
  assert.equal(p.peliculas.length, 1);
  assert.equal(p.peliculas[0].anio, null); assert.deepEqual(p.peliculas[0].generos, []);
});

test('registrarResena actualiza el promedio y la cantidad', () => {
  const p = nueva();
  assert.equal(p.registrarResena(resena(1, 4)), true);
  assert.equal(p.registrarResena(resena(1, 5)), true);
  const d = p.consultar(1);
  assert.equal(d.cantidad, 2); assert.equal(d.promedio, 4.5);
});
test('registrarResena rechaza reseñas inválidas', () => {
  const p = nueva();
  assert.equal(p.registrarResena(resena(1, 7)), false);                  // fuera de rango
  assert.equal(p.registrarResena(resena(1, 0.4)), false);
  assert.equal(p.registrarResena(resena(1, 'cinco')), false);
  assert.equal(p.registrarResena(resena(1, NaN)), false);
  assert.equal(p.registrarResena(resena(999, 4)), false);                // película inexistente
  assert.equal(p.registrarResena(resena(1, 4, { usuario: '' })), false);
  assert.equal(p.registrarResena(resena(1, 4, { usuario: null })), false);
  assert.equal(p.registrarResena(resena(1, 4, { fecha: 'ayer' })), false);
  assert.equal(p.registrarResena(resena(1, 4, { fecha: undefined })), false);
  assert.equal(p.registrarResena({ usuario: 'ana', calificacion: 4, fecha: '2026-11-01' }), false); // sin película
  assert.equal(p.registrarResena(null), false);
  assert.equal(p.consultar(1).cantidad, 0);
});
test('Solo se guardan las últimas N reseñas, pero el promedio cuenta todas', () => {
  const p = nueva({ capacidadResenas: 3 });
  for (let i = 1; i <= 5; i++) p.registrarResena(resena(1, i, { comentario: `r${i}` }));
  const d = p.consultar(1);
  assert.deepEqual(d.ultimasResenas.map((r) => r.comentario), ['r3', 'r4', 'r5']);
  assert.equal(d.cantidad, 5); assert.equal(d.promedio, 3);
});

test('buscar: coincidencia parcial por título', () => {
  const p = nueva();
  assert.deepEqual(p.buscar('godfather').map((x) => x.titulo).slice(0, 2), ['The Godfather', 'The Godfather Part II']);
  assert.deepEqual(p.buscar('zzzz'), []);
});

test('Historial con pila: consultar y volver atrás', () => {
  const p = nueva();
  assert.equal(p.consultar(999).existe, false);
  assert.equal(p.volverAtras().existe, false);           // historial vacío
  p.consultar(1); assert.equal(p.volverAtras().existe, false); // una sola: no hay anterior
  p.consultar(3); p.consultar(5);
  assert.equal(p.volverAtras().id, '3');
  assert.equal(p.volverAtras().id, '1');
  assert.equal(p.volverAtras().existe, false);
});

test('navegarResenas devuelve una lista doble recorrible en ambos sentidos', () => {
  const p = nueva({ capacidadResenas: 5 });
  assert.equal(p.navegarResenas(999), null);
  assert.equal(p.navegarResenas(1).obtenerActual(), null);
  for (let i = 1; i <= 3; i++) p.registrarResena(resena(1, i, { comentario: `r${i}` }));
  const l = p.navegarResenas(1);
  assert.equal(l.longitud, 3);
  assert.equal(l.obtenerActual().comentario, 'r1');
  assert.equal(l.avanzar().comentario, 'r2');
  assert.equal(l.irAlFinal().comentario, 'r3');
  assert.equal(l.retroceder().comentario, 'r2');
});

test('Las reseñas se guardan en un archivo y se pueden volver a cargar', () => {
  const ruta = tmp('resenas.jsonl'); try { fs.unlinkSync(ruta); } catch (e) { /* no existía */ }
  const a = nueva({ archivoResenas: ruta });
  [4, 5, 3].forEach((c) => a.registrarResena(resena(1, c)));
  a.registrarResena(resena(1, 9));                       // inválida: no se escribe
  fs.appendFileSync(ruta, 'linea-rota\n');
  fs.appendFileSync(ruta, JSON.stringify({ peliculaId: 999, usuario: 'x', calificacion: 4, fecha: '2026-11-01' }) + '\n');
  const b = nueva();
  const r = b.cargarResenas(ruta);
  assert.equal(r.aceptadas, 3); assert.equal(r.rechazadas, 2); assert.ok(r.bytes > 0);
  assert.equal(b.consultar(1).promedio, 4);
  assert.equal(fs.readFileSync(ruta, 'utf8').trim().split('\n').length, 5); // no reescribió al leer
  assert.match(b.cargarResenas('no-existe.jsonl').error, /no-existe\.jsonl/);
  fs.unlinkSync(ruta);
});
