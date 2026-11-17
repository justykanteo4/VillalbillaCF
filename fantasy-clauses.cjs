'use strict';

// All amounts are in integer cents of a Fantasy million (1 M = 100 cents).
const INITIAL_CLAUSE_MULTIPLIER = 1.6;
const NEW_SIGNING_PROTECTION_ROUNDS = 2;
const BOOST_DURATION_ROUNDS = 2;
const BOOST_MULTIPLIER = 2;
const CLAUSE_LOCK_MS = 24 * 60 * 60 * 1000;
const MAX_SQUAD = 16;
const MIN_SQUAD = 12;

function toCents(value) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Importe no válido');
  return Math.round(value * 100);
}

function initialClauseCents(purchasePrice) {
  return Math.ceil(toCents(purchasePrice) * 8 / 5);
}

function boostExpiresAtRound(startRound) {
  if (!Number.isSafeInteger(startRound) || startRound < 0) throw new RangeError('Jornada no válida');
  return startRound + BOOST_DURATION_ROUNDS;
}

function isBoostActive(startRound, currentRound) {
  return Number.isSafeInteger(currentRound) && currentRound >= startRound && currentRound < boostExpiresAtRound(startRound);
}

function boostedClauseCents(purchasePrice, paymentCents) {
  if (!Number.isSafeInteger(paymentCents) || paymentCents < 0) throw new RangeError('Pago no válido');
  return initialClauseCents(purchasePrice) + paymentCents * BOOST_MULTIPLIER;
}

function clauseCents(purchasePrice, extraCents = 0, startRound = null, currentRound = null) {
  if (startRound !== null && !isBoostActive(startRound, currentRound)) extraCents = 0;
  if (!Number.isSafeInteger(extraCents) || extraCents < 0) throw new RangeError('Ampliación no válida');
  return initialClauseCents(purchasePrice) + extraCents;
}

function protectedUntil(acquiredRound) {
  if (!Number.isSafeInteger(acquiredRound) || acquiredRound < 0) throw new RangeError('Jornada de fichaje no válida');
  return acquiredRound + NEW_SIGNING_PROTECTION_ROUNDS;
}

function isProtected(acquiredRound, currentRound) {
  if (!Number.isSafeInteger(acquiredRound) || !Number.isSafeInteger(currentRound)) return true;
  return currentRound < protectedUntil(acquiredRound);
}

function isClauseWindowClosed(now, closesAt) {
  return Number.isFinite(closesAt) && now >= closesAt - CLAUSE_LOCK_MS && now < closesAt;
}

function canPayClause({enabled, acquiredRound, currentRound, now, buyerCount, sellerCount,
  balanceCents, reservedCents = 0, priceCents, closesAt = null, lockStartsAt = null, lockEndsAt = null}) {
  if (!enabled) return 'Las cláusulas están desactivadas en esta liga.';
  if (isProtected(acquiredRound, currentRound)) return 'El jugador está protegido durante dos jornadas desde su fichaje.';
  if (isClauseWindowClosed(now, closesAt)) return 'No se permiten clausulazos durante las 24 horas anteriores al cierre de la jornada.';
  if (Number.isFinite(lockStartsAt) && Number.isFinite(lockEndsAt) &&
    now >= lockStartsAt && now < lockEndsAt) return 'Las cláusulas están bloqueadas por la jornada.';
  if (buyerCount >= MAX_SQUAD) return 'La plantilla compradora no puede superar los 16 jugadores.';
  if (sellerCount <= MIN_SQUAD) return 'La plantilla vendedora debe conservar al menos 12 jugadores.';
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) return 'Cláusula no válida.';
  if (balanceCents - reservedCents < priceCents) return 'Saldo disponible insuficiente para pagar la cláusula.';
  return '';
}

module.exports = {INITIAL_CLAUSE_MULTIPLIER, NEW_SIGNING_PROTECTION_ROUNDS, BOOST_DURATION_ROUNDS, BOOST_MULTIPLIER, CLAUSE_LOCK_MS, MAX_SQUAD, MIN_SQUAD,
  boostedClauseCents, isClauseWindowClosed,
  boostExpiresAtRound, isBoostActive,
  initialClauseCents, clauseCents, protectedUntil, isProtected, canPayClause};
