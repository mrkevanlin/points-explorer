/**
 * Refresh signup-bonus data from the free andenacitelli/credit-card-bonuses-api dataset.
 *
 * Usage: npm run refresh-bonuses
 * Writes: lib/bonus-data.json (checked in; planner prefers it over hardcoded OFFERS)
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_URL = 'https://raw.githubusercontent.com/andenacitelli/credit-card-bonuses-api/main/exports/data.json';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'bonus-data.json');

/** Our card ID -> matcher against dataset entries. */
const MATCHERS = [
  { cardId: 'reserve', issuer: 'CHASE', name: 'Sapphire Reserve', exclude: 'Business' },
  { cardId: 'preferred', issuer: 'CHASE', name: 'Sapphire Preferred' },
  { cardId: 'gold', issuer: 'AMERICAN_EXPRESS', name: 'Gold', exact: true },
  { cardId: 'platinum', issuer: 'AMERICAN_EXPRESS', name: 'Platinum', exact: true },
  { cardId: 'venture', issuer: 'CAPITAL_ONE', name: 'Venture X', exclude: 'Business' },
  { cardId: 'strata', issuer: 'CITI', name: 'Strata Premier' },
  { cardId: 'bilt', issuer: 'WELLS_FARGO', name: 'Bilt', exactPrefix: true },
  { cardId: 'journey', issuer: 'WELLS_FARGO', name: 'Autograph Journey' },
  { cardId: 'ink', issuer: 'CHASE', name: 'Ink Business Preferred' },
  { cardId: 'strataBasic', issuer: 'CITI', name: 'Strata', exact: true },
];

function matchCard(cards, rule) {
  const pool = cards.filter((c) => c.issuer === rule.issuer);
  return pool.find((c) => {
    const n = c.name || '';
    if (rule.exact) return n === rule.name;
    if (rule.exactPrefix) return n === rule.name || n.startsWith(rule.name + ' ');
    if (!n.includes(rule.name)) return false;
    if (rule.exclude && n.includes(rule.exclude)) return false;
    return true;
  });
}

const res = await fetch(DATA_URL);
if (!res.ok) throw new Error(`Bonus dataset fetch failed: ${res.status}`);
const cards = await res.json();

const offers = {};
const missing = [];
for (const rule of MATCHERS) {
  const found = matchCard(cards, rule);
  if (!found) {
    missing.push(rule.cardId);
    continue;
  }
  const offer = (found.offers && found.offers[0]) || {};
  const amount = offer.amount && offer.amount[0] ? offer.amount[0].amount : null;
  offers[rule.cardId] = {
    bonus: typeof amount === 'number' ? amount : 0,
    spend: typeof offer.spend === 'number' ? offer.spend : 0,
    spendDays: typeof offer.days === 'number' ? offer.days : 0,
    annualFee: typeof found.annualFee === 'number' ? found.annualFee : 0,
    name: found.name,
    url: found.url || null,
  };
}

const out = {
  fetchedAt: new Date().toISOString().slice(0, 10),
  source: 'https://github.com/andenacitelli/credit-card-bonuses-api',
  offers,
  missing,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${OUT}: ${Object.keys(offers).length} offers, missing: ${missing.join(', ') || 'none'}`);
