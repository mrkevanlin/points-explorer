import { ITEMS, byId, displayName, getTransfer } from '@/lib/catalog';
import bonusData from '@/lib/bonus-data.json';

export type TripRequirement = {
  key: string;
  programId: string;
  pointsNeeded: number;
  label: string;
};

export type PlannedCard = {
  key: string;
  cardId: string;
  openMonth: string; // YYYY-MM
  customBonus?: number;
};

export type CardOffer = {
  cardId: string;
  bonus: number;
  spend: number;
  spendMonths: number;
  unlockOffset: number; // months after openMonth when bonus posts
  annualFee: number;
  note?: string;
};

/** Curated fallback offers used only when live bonus data is missing a card. */
export const OFFERS_AS_OF = 'September 28, 2026';

export const BONUSES_FETCHED_AT: string = (bonusData as { fetchedAt?: string }).fetchedAt ?? OFFERS_AS_OF;
export const BONUS_SOURCE_URL: string = (bonusData as { source?: string }).source ?? '';

type LiveOffer = { bonus: number; spend: number; spendDays: number; annualFee: number; name: string; url: string | null };
const LIVE_OFFERS: Record<string, LiveOffer> = (bonusData as { offers?: Record<string, LiveOffer> }).offers ?? {};

export type EffectiveOffer = {
  cardId: string;
  bonus: number;
  spend: number;
  spendMonths: number;
  unlockOffset: number;
  annualFee: number;
  live: boolean;
  url: string | null;
  note?: string;
};

/** Live GitHub bonus data preferred; hardcoded OFFERS as fallback. */
export function effectiveOffer(cardId: string): EffectiveOffer {
  const live = LIVE_OFFERS[cardId];
  if (live && (live.bonus > 0 || cardId === 'bilt')) {
    const spendMonths = live.spendDays > 0 ? Math.max(1, Math.round(live.spendDays / 30)) : 0;
    return {
      cardId,
      bonus: live.bonus,
      spend: live.spend,
      spendMonths,
      unlockOffset: spendMonths + 1,
      annualFee: live.annualFee,
      live: true,
      url: live.url,
      note: live.bonus === 0 ? OFFERS[cardId]?.note : undefined,
    };
  }
  const fallback = OFFERS[cardId];
  if (!fallback) return { cardId, bonus: 0, spend: 0, spendMonths: 0, unlockOffset: 0, annualFee: 0, live: false, url: null };
  return { ...fallback, live: false, url: null };
}

export const OFFERS: Record<string, CardOffer> = {
  reserve: { cardId: 'reserve', bonus: 60000, spend: 4000, spendMonths: 3, unlockOffset: 4, annualFee: 795 },
  preferred: { cardId: 'preferred', bonus: 75000, spend: 4000, spendMonths: 3, unlockOffset: 4, annualFee: 95 },
  gold: { cardId: 'gold', bonus: 60000, spend: 6000, spendMonths: 6, unlockOffset: 7, annualFee: 325 },
  platinum: { cardId: 'platinum', bonus: 175000, spend: 8000, spendMonths: 6, unlockOffset: 7, annualFee: 895 },
  venture: { cardId: 'venture', bonus: 75000, spend: 4000, spendMonths: 3, unlockOffset: 4, annualFee: 395 },
  strata: { cardId: 'strata', bonus: 70000, spend: 4000, spendMonths: 3, unlockOffset: 4, annualFee: 95 },
  bilt: { cardId: 'bilt', bonus: 0, spend: 0, spendMonths: 0, unlockOffset: 0, annualFee: 0, note: 'No traditional welcome bonus; points accrue from rent and spend.' },
  journey: { cardId: 'journey', bonus: 60000, spend: 4000, spendMonths: 4, unlockOffset: 5, annualFee: 95 },
  ink: { cardId: 'ink', bonus: 120000, spend: 8000, spendMonths: 3, unlockOffset: 4, annualFee: 95 },
  strataBasic: { cardId: 'strataBasic', bonus: 30000, spend: 1000, spendMonths: 3, unlockOffset: 4, annualFee: 0 },
};

export function offerFor(cardId: string): EffectiveOffer {
  return effectiveOffer(cardId);
}

export function bonusFor(plan: PlannedCard): number {
  if (plan.customBonus !== undefined) return plan.customBonus;
  return effectiveOffer(plan.cardId).bonus;
}

export function currencyOf(cardId: string): string {
  return byId(cardId)?.currency ?? 'points';
}

export function programOptions() {
  return ITEMS.filter((item) => item.type !== 'card');
}

export function cardOptions() {
  return ITEMS.filter((item) => item.type === 'card');
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthIndex(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function monthFromIndex(index: number): string {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function addMonths(month: string, offset: number): string {
  return monthFromIndex(monthIndex(month) + offset);
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(month: string): string {
  if (!isValidMonth(month)) return month;
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function monthRange(start: string, end: string): string[] {
  if (!isValidMonth(start) || !isValidMonth(end)) return [];
  const from = monthIndex(start);
  const to = monthIndex(end);
  if (to < from) return [];
  const capped = Math.min(to, from + 24);
  const out: string[] = [];
  for (let i = from; i <= capped; i += 1) out.push(monthFromIndex(i));
  return out;
}

export function unlockMonth(plan: PlannedCard): string | null {
  const offer = effectiveOffer(plan.cardId);
  if (!isValidMonth(plan.openMonth)) return null;
  if (bonusFor(plan) <= 0) return null;
  if (offer.unlockOffset <= 0) return plan.openMonth;
  return addMonths(plan.openMonth, offer.unlockOffset);
}

export type Assignment = {
  plannedKey: string;
  cardId: string;
  sendPoints: number;
  receivePoints: number;
  yield: number;
  unlockMonth: string;
};

export type RequirementPlan = {
  requirement: TripRequirement;
  candidates: number;
  assigned: Assignment[];
  covered: number;
  shortfall: number;
  coveredMonth: string | null;
  atTrip: number;
};

export type Strategy = {
  plans: RequirementPlan[];
  unassigned: Array<{ plannedKey: string; cardId: string; remaining: number; unlockMonth: string | null }>;
  totalBonus: number;
  totalFees: number;
};

function transferYield(cardId: string, programId: string): number | null {
  const link = getTransfer(cardId, programId);
  return link ? link.yield : null;
}

/**
 * Greedy strategy: fund requirements with the fewest transfer options first,
 * preferring the highest transfer yield then the earliest unlock month.
 * Balances are deducted so shared currencies are not double-counted.
 */
export function buildStrategy(requirements: TripRequirement[], planned: PlannedCard[]): Strategy {
  const balances = new Map<string, { cardId: string; remaining: number; unlockMonth: string | null; openMonth: string }>();
  let totalBonus = 0;
  let totalFees = 0;
  for (const plan of planned) {
    const card = byId(plan.cardId);
    if (!card) continue;
    const bonus = bonusFor(plan);
    totalBonus += bonus;
    totalFees += effectiveOffer(plan.cardId).annualFee;
    balances.set(plan.key, {
      cardId: plan.cardId,
      remaining: bonus,
      unlockMonth: unlockMonth(plan),
      openMonth: plan.openMonth,
    });
  }

  const ordered = [...requirements].sort((a, b) => {
    const ca = planned.filter((p) => transferYield(p.cardId, a.programId) !== null).length;
    const cb = planned.filter((p) => transferYield(p.cardId, b.programId) !== null).length;
    if (ca !== cb) return ca - cb;
    return b.pointsNeeded - a.pointsNeeded;
  });

  const plans: RequirementPlan[] = ordered.map((requirement) => {
    const candidates = planned.filter((p) => transferYield(p.cardId, requirement.programId) !== null).length;
    let need = requirement.pointsNeeded;
    const assigned: Assignment[] = [];
    const funders = [...balances.entries()]
      .map(([plannedKey, balance]) => {
        const yieldValue = transferYield(balance.cardId, requirement.programId);
        return { plannedKey, balance, yieldValue };
      })
      .filter((entry): entry is typeof entry & { yieldValue: number } => entry.yieldValue !== null && entry.balance.remaining > 0)
      .sort((a, b) => b.yieldValue - a.yieldValue || a.balance.openMonth.localeCompare(b.balance.openMonth));

    for (const funder of funders) {
      if (need <= 0) break;
      const receivePerSend = funder.yieldValue;
      const maxReceive = Math.floor(funder.balance.remaining * receivePerSend);
      if (maxReceive <= 0) continue;
      const takeReceive = Math.min(need, maxReceive);
      const takeSend = Math.ceil(takeReceive / receivePerSend);
      const actualSend = Math.min(takeSend, funder.balance.remaining);
      const actualReceive = Math.floor(actualSend * receivePerSend);
      if (actualReceive <= 0) continue;
      funder.balance.remaining -= actualSend;
      need -= actualReceive;
      assigned.push({
        plannedKey: funder.plannedKey,
        cardId: funder.balance.cardId,
        sendPoints: actualSend,
        receivePoints: actualReceive,
        yield: receivePerSend,
        unlockMonth: funder.balance.unlockMonth ?? funder.balance.openMonth,
      });
    }

    const covered = requirement.pointsNeeded - Math.max(need, 0);
    const shortfall = Math.max(need, 0);
    const coveredMonth =
      shortfall === 0 && assigned.length
        ? assigned.map((a) => a.unlockMonth).sort().slice(-1)[0]
        : null;
    return { requirement, candidates, assigned, covered, shortfall, coveredMonth, atTrip: covered };
  });

  // Restore original requirement order for display.
  const order = new Map(requirements.map((r, i) => [r.key, i]));
  plans.sort((a, b) => (order.get(a.requirement.key) ?? 0) - (order.get(b.requirement.key) ?? 0));

  const unassigned = [...balances.entries()]
    .filter(([, b]) => b.remaining > 0)
    .map(([plannedKey, b]) => ({ plannedKey, cardId: b.cardId, remaining: b.remaining, unlockMonth: b.unlockMonth }));

  return { plans, unassigned, totalBonus, totalFees };
}

/** Cumulative receivable points per requirement across a month axis. */
export function coverageTimeline(plan: RequirementPlan, months: string[]): number[] {
  let running = 0;
  const byMonth = new Map<string, number>();
  for (const a of plan.assigned) {
    byMonth.set(a.unlockMonth, (byMonth.get(a.unlockMonth) ?? 0) + a.receivePoints);
  }
  return months.map((month) => {
    running += byMonth.get(month) ?? 0;
    return running;
  });
}

export function timelineStart(planned: PlannedCard[], fallback: string): string {
  const months = planned.map((p) => p.openMonth).filter(isValidMonth).sort();
  if (!months.length) return fallback;
  return months[0] < fallback ? months[0] : fallback;
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatPoints(value: number): string {
  return value.toLocaleString('en-US');
}

export type DestinationEstimate = {
  id: string;
  city: string;
  country: string;
  flightProgramId: string;
  flightPerPerson: number;
  hotelProgramId: string;
  hotelPerNight: number;
  blurb: string;
};

/** Illustrative round-trip economy award estimates for 2 people, 5 nights. Tune in advanced settings. */
export const DESTINATIONS: DestinationEstimate[] = [
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', flightProgramId: 'united', flightPerPerson: 70000, hotelProgramId: 'hyatt', hotelPerNight: 25000, blurb: 'Long-haul sweet spot via United + Hyatt' },
  { id: 'paris', city: 'Paris', country: 'France', flightProgramId: 'flyingblue', flightPerPerson: 60000, hotelProgramId: 'hyatt', hotelPerNight: 25000, blurb: 'Flying Blue promos + central Hyatts' },
  { id: 'london', city: 'London', country: 'UK', flightProgramId: 'british', flightPerPerson: 57000, hotelProgramId: 'hyatt', hotelPerNight: 25000, blurb: 'Avios off-peak + Hyatt Place' },
  { id: 'hawaii', city: 'Honolulu', country: 'Hawaii', flightProgramId: 'southwest', flightPerPerson: 30000, hotelProgramId: 'hyatt', hotelPerNight: 20000, blurb: 'Short hop + resort nights' },
  { id: 'nyc', city: 'New York', country: 'USA', flightProgramId: 'jetblue', flightPerPerson: 25000, hotelProgramId: 'hyatt', hotelPerNight: 20000, blurb: 'Domestic weekend, easy coverage' },
  { id: 'cancun', city: 'Cancún', country: 'Mexico', flightProgramId: 'aa', flightPerPerson: 35000, hotelProgramId: 'hyatt', hotelPerNight: 20000, blurb: 'AA partner awards + all-inclusives' },
];

export function destinationById(id: string): DestinationEstimate | null {
  return DESTINATIONS.find((d) => d.id === id) ?? null;
}

export function estimateNeeds(destId: string, travelers: number, nights: number): TripRequirement[] {
  const dest = destinationById(destId);
  if (!dest) return [];
  const flightProgram = byId(dest.flightProgramId);
  const hotelProgram = byId(dest.hotelProgramId);
  return [
    {
      key: `req-flight`,
      programId: dest.flightProgramId,
      pointsNeeded: dest.flightPerPerson * Math.max(1, travelers),
      label: `${Math.max(1, travelers)} × RT flight to ${dest.city}`,
    },
    {
      key: `req-hotel`,
      programId: dest.hotelProgramId,
      pointsNeeded: dest.hotelPerNight * Math.max(1, nights),
      label: `${Math.max(1, nights)} nights in ${dest.city}${flightProgram && hotelProgram && dest.flightProgramId === dest.hotelProgramId ? ' (same program)' : ''}`,
    },
  ];
}

export type RecommendedPath = {
  id: string;
  cardIds: string[];
  planned: PlannedCard[];
  strategy: Strategy;
  fullyCovered: boolean;
  coveredMonth: string | null;
  totalFees: number;
  title: string;
};

function combos<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  if (size === 1) return items.map((item) => [item]);
  const [first, ...rest] = items;
  return [
    ...combos(rest, size),
    ...combos(rest, size - 1).map((tail) => [first, ...tail]),
  ];
}

/**
 * Recommend card paths: brute-force 1–3 card combos (bonuses assumed opened
 * this month), ranked: fully covered first, then fewest cards, then lowest fees.
 */
export function recommendPaths(requirements: TripRequirement[], openMonth: string, limit = 3): RecommendedPath[] {
  const eligible = cardOptions().filter((c) => effectiveOffer(c.id).bonus > 0);
  const all: RecommendedPath[] = [];
  for (const size of [1, 2, 3]) {
    for (const group of combos(eligible, size)) {
      const planned: PlannedCard[] = group.map((c, i) => ({
        key: `${c.id}-${i}`,
        cardId: c.id,
        openMonth: addMonths(openMonth, i === 0 ? 0 : 1),
      }));
      const strategy = buildStrategy(requirements, planned);
      const fullyCovered = strategy.plans.every((p) => p.shortfall === 0);
      const coveredMonths = strategy.plans.map((p) => p.coveredMonth).filter((m): m is string => Boolean(m)).sort();
      all.push({
        id: group.map((c) => c.id).join('+'),
        cardIds: group.map((c) => c.id),
        planned,
        strategy,
        fullyCovered,
        coveredMonth: coveredMonths.length ? coveredMonths.slice(-1)[0] : null,
        totalFees: strategy.totalFees,
        title: group.map((c) => displayName(c)).join(' + '),
      });
    }
  }
  all.sort((a, b) => {
    if (a.fullyCovered !== b.fullyCovered) return a.fullyCovered ? -1 : 1;
    const aShort = a.strategy.plans.reduce((sum, p) => sum + p.shortfall, 0);
    const bShort = b.strategy.plans.reduce((sum, p) => sum + p.shortfall, 0);
    if (aShort !== bShort) return aShort - bShort;
    if (a.cardIds.length !== b.cardIds.length) return a.cardIds.length - b.cardIds.length;
    return a.totalFees - b.totalFees;
  });
  // Keep diversity: best path per card-count, then fill.
  const seen = new Set<number>();
  const diverse: RecommendedPath[] = [];
  for (const path of all) {
    if (!seen.has(path.cardIds.length)) {
      seen.add(path.cardIds.length);
      diverse.push(path);
    }
    if (diverse.length >= limit) break;
  }
  for (const path of all) {
    if (diverse.length >= limit) break;
    if (!diverse.includes(path)) diverse.push(path);
  }
  return diverse.slice(0, limit);
}

/**
 * Pick the program of a given kind your card bonuses cover best.
 * Two stages: rank by total receivable points (fast), then run the full
 * strategy — including competition with the other goal — on the top few.
 */
export function recommendProgram(
  kind: 'airline' | 'hotel',
  needed: number,
  other: TripRequirement,
  openMonth: string,
): { programId: string; shortfall: number; fullyCovered: boolean } | null {
  const eligible = cardOptions().filter((c) => effectiveOffer(c.id).bonus > 0);
  const candidates = ITEMS.filter(
    (p) => p.type === kind && eligible.some((c) => getTransfer(c.id, p.id) !== null),
  );
  if (!candidates.length || needed <= 0) return null;

  const receivable = (programId: string) =>
    eligible.reduce((sum, card) => {
      const link = getTransfer(card.id, programId);
      if (!link) return sum;
      return sum + Math.floor(effectiveOffer(card.id).bonus * link.yield);
    }, 0);
  const shortlist = [...candidates]
    .sort((a, b) => receivable(b.id) - receivable(a.id))
    .slice(0, 6);

  let winner: { programId: string; shortfall: number; fullyCovered: boolean } | null = null;
  for (const program of shortlist) {
    const reqs: TripRequirement[] = [
      { key: 'req-main', programId: program.id, pointsNeeded: needed, label: kind === 'airline' ? 'Flights' : 'Hotel' },
      other,
    ];
    const top = recommendPaths(reqs, openMonth, 1)[0];
    if (!top) continue;
    const shortfall = top.strategy.plans.reduce((sum, p) => sum + p.shortfall, 0);
    const fullyCovered = top.strategy.plans.every((p) => p.shortfall === 0);
    const score = { programId: program.id, shortfall, fullyCovered };
    if (
      !winner ||
      (score.fullyCovered && !winner.fullyCovered) ||
      (score.fullyCovered === winner.fullyCovered && score.shortfall < winner.shortfall)
    ) {
      winner = score;
    }
  }
  return winner;
}

/**
 * Pick the airline program your card bonuses cover best.
 * Two stages: rank by total receivable points (fast), then run the full
 * strategy — including competition with the hotel goal — on the top few.
 */
export function recommendFlightProgram(
  flightTotalNeeded: number,
  hotel: TripRequirement,
  openMonth: string,
): { programId: string; shortfall: number; fullyCovered: boolean } | null {
  return recommendProgram('airline', flightTotalNeeded, hotel, openMonth);
}

export const TYPICAL_FLIGHT_PER_PERSON = 50000;
export const TYPICAL_HOTEL_PER_NIGHT = 25000;
