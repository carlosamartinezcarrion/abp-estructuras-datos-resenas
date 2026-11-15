const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { crearComparador, porCalificacion, porAnio, porTitulo, COMPARADORES } = require('../src/Comparadores');
const { ordenarMergeSort } = require('../src/MergeSort');
const { ordenarQuickSort } = require('../src/QuickSort');
const { Plataforma } = require('../src/plataforma');

// Atajos para armar películas de prueba y leer sus títulos
const peli = (id, titulo, anio, promedio, cantidad) => ({ id: String(id), titulo, anio, promedio, cantidad });
const titulos = (arreglo) => arreglo.map((p) => p.titulo);

test('porCalificacion: mayor promedio primero y, si empatan, más calificaciones primero', () => {
  const a = peli(1, 'A', 2000, 4.5, 10), b = peli(2, 'B', 2000, 4.0, 99), c = peli(3, 'C', 2000, 4.5, 20);
  assert.deepEqual(titulos(ordenarMergeSort([a, b, c], porCalificacion)), ['C', 'A', 'B']);
});

test('los criterios se aplican en cadena: promedio, cantidad, año y título', () => {
  const a = peli(1, 'Zeta', 2010, 4, 5), b = peli(2, 'Alfa', 2010, 4, 5), c = peli(3, 'Beta', 2015, 4, 5);
  // Empatan en promedio y cantidad: gana el año más reciente; luego el título de la A a la Z
  assert.deepEqual(titulos(ordenarMergeSort([a, b, c], porCalificacion)), ['Beta', 'Alfa', 'Zeta']);
});

test('un empate en todos los criterios devuelve 0', () => {
  const a = peli(1, 'Igual', 2000, 3, 4), b = peli(2, 'Igual', 2000, 3, 4);
  assert.equal(porCalificacion(a, b), 0);
  assert.equal(porAnio(a, b), 0);
  assert.equal(porTitulo(a, b), 0);
});

test('porAnio: más recientes primero y las películas sin año van al final', () => {
  const a = peli(1, 'Vieja', 1972, 4, 1), b = peli(2, 'Nueva', 2019, 4, 1), c = peli(3, 'SinAnio', null, 5, 1);
  assert.deepEqual(titulos(ordenarMergeSort([c, a, b], porAnio)), ['Nueva', 'Vieja', 'SinAnio']);
});

test('lo que no tiene dato va al final en orden ascendente y descendente', () => {
  const con = peli(1, 'Con', 2000, 4, 1), sin = peli(2, 'Sin', undefined, 4, 1);
  const asc = crearComparador([{ campo: 'anio', orden: 'asc' }]);
  const desc = crearComparador([{ campo: 'anio', orden: 'desc' }]);
  assert.deepEqual(titulos(ordenarMergeSort([sin, con], asc)), ['Con', 'Sin']);
  assert.deepEqual(titulos(ordenarMergeSort([sin, con], desc)), ['Con', 'Sin']);
  assert.equal(asc(sin, peli(3, 'Otra', NaN, 4, 1)), 0); // ambas sin dato: empate
});

test('porTitulo: orden alfabético sin distinguir mayúsculas ni tildes', () => {
  const pelis = [peli(1, 'zorro', 2000, 1, 1), peli(2, 'Ámbar', 2000, 1, 1), peli(3, 'amelie', 2001, 1, 1), peli(4, 'Beta', 2000, 1, 1)];
  assert.deepEqual(titulos(ordenarMergeSort(pelis, porTitulo)), ['Ámbar', 'amelie', 'Beta', 'zorro']);
});

test('crearComparador: el orden desc invierte el criterio', () => {
  const a = peli(1, 'A', 2000, 2, 1), b = peli(2, 'B', 2000, 5, 1);
  assert.deepEqual(titulos(ordenarMergeSort([a, b], crearComparador([{ campo: 'promedio', orden: 'asc' }]))), ['A', 'B']);
  assert.deepEqual(titulos(ordenarMergeSort([a, b], crearComparador([{ campo: 'promedio', orden: 'desc' }]))), ['B', 'A']);
});

test('crearComparador rechaza criterios inválidos', () => {
  assert.throws(() => crearComparador([]), RangeError);
  assert.throws(() => crearComparador(undefined), RangeError);
  assert.throws(() => crearComparador([{ campo: 'director' }]), RangeError);
  assert.throws(() => crearComparador([{ campo: 'anio', orden: 'arriba' }]), RangeError);
  assert.throws(() => crearComparador([null]), RangeError);
});

test('los elementos nulos o indefinidos van al final y no lanzan error', () => {
  const a = peli(1, 'A', 2000, 4, 1);
  assert.equal(porCalificacion(a, null), -1);
  assert.equal(porCalificacion(undefined, a), 1);
  assert.equal(porCalificacion(null, undefined), 0);
});

test('un registro sin título, con campos de otro tipo o que ni es objeto no rompe la comparación', () => {
  const raro = { id: '9', titulo: 42, anio: '1999', promedio: 'alto', cantidad: null };
  const normal = peli(1, 'Normal', 2000, 3, 2);
  assert.doesNotThrow(() => porCalificacion(raro, normal));
  assert.equal(porCalificacion(normal, raro), -1); // el que tiene datos va antes
  assert.doesNotThrow(() => porTitulo(5, 'texto'));
  assert.equal(porTitulo(5, 'texto'), 0);
});

test('los comparadores no modifican las películas', () => {
  const a = peli(1, 'Ámbar', 2000, 4, 1), b = peli(2, 'Beta', 2000, 4, 1);
  const antes = JSON.stringify([a, b]);
  porTitulo(a, b); porCalificacion(a, b); porAnio(a, b);
  assert.equal(JSON.stringify([a, b]), antes);
});

test('MergeSort conserva el orden original cuando los criterios empatan (estable)', () => {
  const porPromedio = crearComparador([{ campo: 'promedio', orden: 'desc' }]);
  const pelis = [peli(1, 'Uno', 2000, 4, 1), peli(2, 'Dos', 2001, 4, 1), peli(3, 'Tres', 2002, 5, 1), peli(4, 'Cuatro', 2003, 4, 1)];
  assert.deepEqual(titulos(ordenarMergeSort(pelis, porPromedio)), ['Tres', 'Uno', 'Dos', 'Cuatro']);
});

test('COMPARADORES expone los tres comparadores listos', () => {
  assert.deepEqual(Object.keys(COMPARADORES), ['calificacion', 'anio', 'titulo']);
  assert.equal(COMPARADORES.calificacion, porCalificacion);
});

test('con el catálogo real: MergeSort y QuickSort dan el mismo orden y es consistente', () => {
  const plat = new Plataforma();
  assert.equal(plat.cargarPeliculas(path.join(__dirname, '..', 'data', 'peliculas.json')).cargadas, 12);
  // Calificaciones simuladas: 1 = promedio 5 (dos votos), 3 = promedio 5 (un voto), 6 = promedio 4,5
  const dar = (id, nota) => assert.ok(plat.registrarResena({ peliculaId: id, usuario: 'u', calificacion: nota, fecha: '2026-11-01' }));
  dar(1, 5); dar(1, 5); dar(3, 5); dar(6, 4.5);
  for (const comparador of [porCalificacion, porAnio, porTitulo]) {
    const conMerge = ordenarMergeSort(plat.peliculas, comparador);
    const conQuick = ordenarQuickSort(plat.peliculas.slice(), comparador);
    assert.deepEqual(conMerge.map((p) => p.id), conQuick.map((p) => p.id));
    // Cada par vecino respeta el comparador
    for (let i = 1; i < conMerge.length; i++) assert.ok(comparador(conMerge[i - 1], conMerge[i]) <= 0);
  }
  assert.deepEqual(ordenarMergeSort(plat.peliculas, porCalificacion).slice(0, 3).map((p) => p.id), ['1', '3', '6']);
  // Antisimetría: comparar (a, b) y (b, a) da signos opuestos en todos los pares
  for (const a of plat.peliculas) for (const b of plat.peliculas) {
    assert.equal(Math.sign(porCalificacion(a, b)) + Math.sign(porCalificacion(b, a)), 0);
  }
});
