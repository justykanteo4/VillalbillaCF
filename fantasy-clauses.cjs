'use strict';

// All amounts are in integer cents of a Fantasy million (1 M = 100 cents).
const INITIAL_CLAUSE_MULTIPLIER = 1.5;
const PROTECTION_MS = 7 * 24 * 60 * 60 * 1000;
const BOOST_DURATION_ROUNDS = 2;
const MAX_SQUAD = 16;
const MIN_SQUAD = 12;

function toCents(value) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Importe no válido');
  return Math.round(value * 100);
}

function initialClauseCents(marketValue) {
  return Math.ceil(toCents(marketValue) * 3 / 2);
}

function boostExpiresAtRound(startRound) {
  if (!Number.isSafeInteger(startRound) || startRound < 0) throw new RangeError('Jornada no válida');
  return startRound + BOOST_DURATION_ROUNDS;
}

function isBoostActive(startRound, currentRound) {
  return Number.isSafeInteger(currentRound) && currentRound >= startRound && currentRound < boostExpiresAtRound(startRound);
}

function clauseCents(marketValue, extraCents = 0, startRound = null, currentRound = null) {
  if (startRound !== null && !isBoostActive(startRound, currentRound)) extraCents = 0;
  if (!Number.isSafeInteger(extraCents) || extraCents < 0) throw new RangeError('Ampliación no válida');
  return initialClauseCents(marketValue) + extraCents;
}

function protectedUntil(acquiredAt) {
  if (!Number.isSafeInteger(acquiredAt) || acquiredAt < 0) throw new RangeError('Fecha de fichaje no válida');
  return acquiredAt + PROTECTION_MS;
}

function isProtected(acquiredAt, now) {
  return now < protectedUntil(acquiredAt);
}

function canPayClause({enabled, acquiredAt, now, buyerCount, sellerCount, transfersRemaining,
  balanceCents, reservedCents = 0, priceCents, lockStartsAt = null, lockEndsAt = null}) {
  if (!enabled) return 'Las cláusulas están desactivadas en esta liga.';
  if (isProtected(acquiredAt, now)) return 'El jugador está protegido durante 7 días desde su fichaje.';
  if (Number.isFinite(lockStartsAt) && Number.isFinite(lockEndsAt) &&
    now >= lockStartsAt && now < lockEndsAt) return 'Las cláusulas están bloqueadas por la jornada.';
  if (buyerCount >= MAX_SQUAD) return 'La plantilla compradora no puede superar los 16 jugadores.';
  if (sellerCount <= MIN_SQUAD) return 'La plantilla vendedora debe conservar al menos 12 jugadores.';
  if (transfersRemaining <= 0) return 'Has agotado los fichajes de esta semana.';
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) return 'Cláusula no válida.';
  if (balanceCents - reservedCents < priceCents) return 'Saldo disponible insuficiente para pagar la cláusula.';
  return '';
}

module.exports = {INITIAL_CLAUSE_MULTIPLIER, PROTECTION_MS, BOOST_DURATION_ROUNDS, MAX_SQUAD, MIN_SQUAD,
  boostExpiresAtRound, isBoostActive,
  initialClauseCents, clauseCents, protectedUntil, isProtected, canPayClause};
