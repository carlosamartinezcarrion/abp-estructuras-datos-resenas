'use strict';
// Memoria: un arreglo sin límite retiene todo (fuga); la cola circular de N registros llega a un techo.
// Necesita --expose-gc (ya incluido en "npm test"); sin esa bandera, se omite.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ColaCircular } = require('../src/colaCircular');

const LIMITE = 50, PAQUETES = 400;
const heapMB = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed / 1048576; };
const paquete = () => ({ timestamp: Date.now(), lat: Math.random() * 90, lng: Math.random() * 180, payload: new Array(20000).fill('datos') });

test('La cola circular nunca guarda más de 50 registros', () => {
  const c = new ColaCircular(LIMITE);
  for (let i = 1; i <= 1000; i++) c.encolar({ id: i });
  assert.equal(c.cantidad, LIMITE);
  assert.equal(c.aArreglo()[0].id, 951);          // se descartó lo más antiguo
  assert.equal(c.aArreglo()[LIMITE - 1].id, 1000);
});

test('Fuga de memoria (arreglo sin límite) frente a cola circular: el GC solo libera lo inalcanzable', { skip: !global.gc && 'ejecutar con --expose-gc' }, () => {
  const base = heapMB();
  const fuga = [];                                  // referencia viva: el GC no puede liberar nada
  for (let i = 0; i < PAQUETES; i++) fuga.push(paquete());
  const conFuga = heapMB() - base;
  fuga.length = 0;

  const base2 = heapMB();
  const acotada = new ColaCircular(LIMITE);
  for (let i = 0; i < PAQUETES; i++) acotada.encolar(paquete());
  const conLimite = heapMB() - base2;

  assert.ok(conFuga > 20, `la fuga debía crecer (creció ${conFuga.toFixed(1)} MB)`);
  assert.ok(conLimite < conFuga / 4, `con límite debía ocupar mucho menos (${conLimite.toFixed(1)} MB frente a ${conFuga.toFixed(1)} MB)`);
});

test('Con la cola circular la memoria llega a un techo: S(n) = O(1)', { skip: !global.gc && 'ejecutar con --expose-gc' }, () => {
  const c = new ColaCircular(LIMITE), medidas = [];
  for (let ronda = 1; ronda <= 4; ronda++) {
    for (let i = 0; i < 200; i++) c.encolar(paquete());
    medidas.push(heapMB());
  }
  // De la ronda 2 en adelante ya no crece (margen de 5 MB por ruido del recolector).
  assert.ok(medidas[3] - medidas[1] < 5, `heapUsed por ronda: ${medidas.map((m) => m.toFixed(1)).join(' / ')} MB`);
});
