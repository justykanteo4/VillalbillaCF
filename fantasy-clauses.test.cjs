const test = require('node:test');
const assert = require('node:assert/strict');
const {initialClauseCents, clauseCents, isProtected, protectedUntil, canPayClause, BOOST_DURATION_ROUNDS, BOOST_MULTIPLIER, boostedClauseCents, boostExpiresAtRound, isBoostActive, CLAUSE_LOCK_MS, isClauseWindowClosed} = require('./fantasy-clauses.cjs');

test('cláusula inicial del 150% calculada con céntimos, redondeando hacia arriba', () => {
  assert.equal(initialClauseCents(5), 750);
  assert.equal(initialClauseCents(10), 1500);
  assert.equal(initialClauseCents(20), 3000);
  assert.equal(initialClauseCents(19.99), 2999);
  assert.equal(clauseCents(20, 125), 3125);
  assert.throws(() => clauseCents(20, -1));
});

test('siete días de protección exactos desde la compra', () => {
  const boughtAt = Date.UTC(2026, 10, 16);
  assert.equal(isProtected(boughtAt, boughtAt), true);
  assert.equal(isProtected(boughtAt, protectedUntil(boughtAt) - 1), true);
  assert.equal(isProtected(boughtAt, protectedUntil(boughtAt)), false);
});

test('cláusulas inactivas y compras restringidas por jornada, plantillas, fichajes y saldo', () => {
  const now = Date.UTC(2026, 10, 16);
  const valid = {enabled: true, acquiredAt: now - 8 * 86400000, now, buyerCount: 14,
    sellerCount: 14, transfersRemaining: 1, balanceCents: 3000, reservedCents: 1000, priceCents: 1800};
  assert.equal(canPayClause(valid), '');
  assert.match(canPayClause({...valid, enabled: false}), /desactivadas/);
  assert.match(canPayClause({...valid, acquiredAt: now - 86400000}), /7 días/);
  assert.match(canPayClause({...valid, lockStartsAt: now - 1, lockEndsAt: now + 1}), /jornada/);
  assert.match(canPayClause({...valid, buyerCount: 16}), /16/);
  assert.match(canPayClause({...valid, sellerCount: 12}), /12/);
  assert.match(canPayClause({...valid, transfersRemaining: 0}), /semana/);
  assert.match(canPayClause({...valid, reservedCents: 1500}), /Saldo/);
});

test('una ampliación dura exactamente dos jornadas; después vuelve al 150 %', () => {
  assert.equal(BOOST_DURATION_ROUNDS, 2);
  assert.equal(boostExpiresAtRound(12), 14);
  assert.equal(isBoostActive(12, 12), true);
  assert.equal(isBoostActive(12, 13), true);
  assert.equal(isBoostActive(12, 14), false);
  assert.equal(clauseCents(20, 500, 12, 13), 3500);
  assert.equal(clauseCents(20, 500, 12, 14), 3000);
});

test('cada millón pagado sube dos millones la cláusula', () => {
  assert.equal(BOOST_MULTIPLIER, 2);
  assert.equal(initialClauseCents(20), 3000);
  assert.equal(boostedClauseCents(20, 100), 3200);
  assert.equal(boostedClauseCents(20, 500), 4000);
  assert.equal(boostedClauseCents(10, 200), 1900);
  assert.throws(() => boostedClauseCents(20, -1));
});

test('prohibidos los clausulazos en las 24 horas anteriores al cierre de jornada', () => {
  const close = Date.parse('2026-11-20T22:59:00Z');
  const valid = {enabled:true, acquiredAt:close-10*86400000, now:close-CLAUSE_LOCK_MS-1,
    buyerCount:14, sellerCount:14, transfersRemaining:1, balanceCents:3000, priceCents:1500, closesAt:close};
  assert.equal(CLAUSE_LOCK_MS, 86400000);
  assert.equal(isClauseWindowClosed(valid.now, close), false);
  assert.equal(canPayClause(valid), '');
  assert.equal(isClauseWindowClosed(close-CLAUSE_LOCK_MS, close), true);
  assert.match(canPayClause({...valid,now:close-CLAUSE_LOCK_MS}), /24 horas/);
  assert.match(canPayClause({...valid,now:close-1}), /24 horas/);
  assert.equal(isClauseWindowClosed(close, close), false);
});
