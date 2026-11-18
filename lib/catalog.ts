export type Rate = readonly [number, number];
export type ItemType = 'card' | 'airline' | 'hotel' | 'rail';
export type Emphasis = 'best' | 'above' | 'par' | 'below';

export type Item = {
  id: string;
  type: ItemType;
  name: string;
  short?: string;
  issuer: string;
  currency?: string;
  family?: string;
  source?: string;
  mark: string;
  color: string;
  theme?: string;
  unit?: string;
};

export type Transfer = {
  from: string;
  to: string;
  rate: Rate;
  ratio: string;
  yield: number;
  note?: string;
  source: string;
};

export type Point = { x: number; y: number };

export const DATA_AS_OF = 'September 28, 2026';

export const SOURCES: Record<string, { name: string; url: string }> = {
  chase: {
    name: 'Chase transfer partners',
    url: 'https://www.chase.com/personal/credit-cards/education/basics/how-to-transfer-chase-ultimate-rewards-points',
  },
  preferred: {
    name: 'Sapphire Preferred transfer rates',
    url: 'https://www.chase.com/sapphire-cards/personal/preferred',
  },
  ink: {
    name: 'Ink Business Preferred',
    url: 'https://creditcards.chase.com/business-credit-cards/ink/business-preferred',
  },
  amex: {
    name: 'American Express transfer partners',
    url: 'https://global.americanexpress.com/rewards/transfer/',
  },
  capital: {
    name: 'Capital One transfer partners',
    url: 'https://www.capitalone.com/learn-grow/money-management/venture-miles-transfer-partnerships/',
  },
  citi: {
    name: 'Citi Strata Premier',
    url: 'https://www.citi.com/credit-cards/credit-cards/citi-strata-premier-credit-card',
  },
  citiBasic: {
    name: 'Citi Strata',
    url: 'https://www.citi.com/credit-cards/credit-cards/citi-strata-credit-card',
  },
  bilt: {
    name: 'Bilt transfer partners',
    url: 'https://support.biltrewards.com/hc/en-us/articles/19086448638989-Bilt-s-Transfer-Partners',
  },
  wells: {
    name: 'Wells Fargo Autograph Journey',
    url: 'https://www.wellsfargo.com/credit-cards/autograph-journey/',
  },
};

export const ITEMS: Item[] = [
  { id: 'reserve', type: 'card', name: 'Sapphire Reserve', issuer: 'Chase', currency: 'Ultimate Rewards', family: 'chase', mark: 'C', color: '#264a76', theme: 'reserve' },
  { id: 'gold', type: 'card', name: 'American Express Gold', short: 'Amex Gold', issuer: 'American Express', currency: 'Membership Rewards', family: 'amex', mark: 'A', color: '#92652c', theme: 'gold' },
  { id: 'venture', type: 'card', name: 'Venture X', issuer: 'Capital One', currency: 'Capital One miles', family: 'capital', mark: 'C1', color: '#237778', theme: 'venture' },
  { id: 'strata', type: 'card', name: 'Citi Strata Premier', short: 'Strata Premier', issuer: 'Citi', currency: 'ThankYou Points', family: 'citi', source: 'citi', mark: 'C', color: '#0b3d73', theme: 'strata' },
  { id: 'bilt', type: 'card', name: 'Bilt Blue', issuer: 'Bilt', currency: 'Bilt Points', family: 'bilt', mark: 'B', color: '#1a1a1a', theme: 'bilt' },
  { id: 'journey', type: 'card', name: 'Autograph Journey', issuer: 'Wells Fargo', currency: 'Wells Fargo points', family: 'wells', mark: 'WF', color: '#8e2340', theme: 'journey' },
  { id: 'preferred', type: 'card', name: 'Sapphire Preferred', issuer: 'Chase', currency: 'Ultimate Rewards', family: 'chase', source: 'preferred', mark: 'C', color: '#3667aa', theme: 'preferred' },
  { id: 'platinum', type: 'card', name: 'American Express Platinum', short: 'Amex Platinum', issuer: 'American Express', currency: 'Membership Rewards', family: 'amex', mark: 'A', color: '#696b76', theme: 'platinum' },
  { id: 'ink', type: 'card', name: 'Ink Business Preferred', short: 'Ink Preferred', issuer: 'Chase', currency: 'Ultimate Rewards', family: 'chase', source: 'ink', mark: 'IN', color: '#1c3d34', theme: 'ink' },
  { id: 'strataBasic', type: 'card', name: 'Citi Strata', issuer: 'Citi', currency: 'ThankYou Points', family: 'citiBasic', source: 'citiBasic', mark: 'C', color: '#5d87b0', theme: 'strata-basic' },

  { id: 'aeroplan', type: 'airline', name: 'Aeroplan', issuer: 'Air Canada', mark: 'AC', color: '#b5353c', unit: 'points' },
  { id: 'flyingblue', type: 'airline', name: 'Flying Blue', issuer: 'Air France · KLM', mark: 'FB', color: '#295daa', unit: 'miles' },
  { id: 'united', type: 'airline', name: 'MileagePlus', issuer: 'United Airlines', mark: 'UA', color: '#2467b5', unit: 'miles' },
  { id: 'british', type: 'airline', name: 'British Airways Club', short: 'British Airways', issuer: 'British Airways', mark: 'BA', color: '#263e68', unit: 'Avios' },
  { id: 'jetblue', type: 'airline', name: 'TrueBlue', issuer: 'JetBlue', mark: 'B6', color: '#235aaa', unit: 'points' },
  { id: 'singapore', type: 'airline', name: 'KrisFlyer', issuer: 'Singapore Airlines', mark: 'SQ', color: '#8c6228', unit: 'miles' },
  { id: 'virgin', type: 'airline', name: 'Flying Club', issuer: 'Virgin Atlantic', mark: 'VS', color: '#c01b3a', unit: 'points' },
  { id: 'southwest', type: 'airline', name: 'Rapid Rewards', issuer: 'Southwest Airlines', mark: 'WN', color: '#a67c00', unit: 'points' },
  { id: 'delta', type: 'airline', name: 'SkyMiles', issuer: 'Delta Air Lines', mark: 'DL', color: '#9b1b2e', unit: 'miles' },
  { id: 'emirates', type: 'airline', name: 'Skywards', issuer: 'Emirates', mark: 'EK', color: '#c8102e', unit: 'miles' },
  { id: 'avianca', type: 'airline', name: 'LifeMiles', issuer: 'Avianca', mark: 'AV', color: '#d31219', unit: 'miles' },
  { id: 'qatar', type: 'airline', name: 'Privilege Club', issuer: 'Qatar Airways', mark: 'QR', color: '#6b0f3a', unit: 'Avios' },
  { id: 'cathay', type: 'airline', name: 'Asia Miles', issuer: 'Cathay Pacific', mark: 'CX', color: '#006564', unit: 'miles' },
  { id: 'aerlingus', type: 'airline', name: 'AerClub', issuer: 'Aer Lingus', mark: 'EI', color: '#006272', unit: 'Avios' },
  { id: 'iberia', type: 'airline', name: 'Iberia Club', issuer: 'Iberia', mark: 'IB', color: '#d71920', unit: 'Avios' },
  { id: 'ana', type: 'airline', name: 'Mileage Club', issuer: 'All Nippon Airways', mark: 'NH', color: '#0b3d5c', unit: 'miles' },
  { id: 'jal', type: 'airline', name: 'Mileage Bank', issuer: 'Japan Airlines', mark: 'JL', color: '#cc0000', unit: 'miles' },
  { id: 'turkish', type: 'airline', name: 'Miles&Smiles', issuer: 'Turkish Airlines', mark: 'TK', color: '#c70a0c', unit: 'miles' },
  { id: 'qantas', type: 'airline', name: 'Frequent Flyer', issuer: 'Qantas', mark: 'QF', color: '#e0001a', unit: 'points' },
  { id: 'eva', type: 'airline', name: 'Infinity MileageLands', short: 'MileageLands', issuer: 'EVA Air', mark: 'BR', color: '#1d6b4f', unit: 'miles' },
  { id: 'atmos', type: 'airline', name: 'Atmos Rewards', issuer: 'Alaska · Hawaiian', mark: 'AS', color: '#01426a', unit: 'points' },
  { id: 'etihad', type: 'airline', name: 'Etihad Guest', issuer: 'Etihad Airways', mark: 'EY', color: '#bd8b13', unit: 'miles' },
  { id: 'tap', type: 'airline', name: 'Miles&Go', issuer: 'TAP Air Portugal', mark: 'TP', color: '#5f8a16', unit: 'miles' },
  { id: 'aa', type: 'airline', name: 'AAdvantage', issuer: 'American Airlines', mark: 'AA', color: '#0078d2', unit: 'miles' },
  { id: 'finnair', type: 'airline', name: 'Finnair Plus', issuer: 'Finnair', mark: 'AY', color: '#0b1f4b', unit: 'Avios' },
  { id: 'aeromexico', type: 'airline', name: 'Aeromexico Rewards', short: 'Aeromexico', issuer: 'Aeromexico', mark: 'AM', color: '#0d2240', unit: 'points' },
  { id: 'virginred', type: 'airline', name: 'Virgin Red', issuer: 'Virgin', mark: 'VR', color: '#e10a17', unit: 'points' },
  { id: 'hyatt', type: 'hotel', name: 'World of Hyatt', issuer: 'Hyatt', mark: 'H', color: '#5c55aa', unit: 'points' },
  { id: 'hilton', type: 'hotel', name: 'Hilton Honors', issuer: 'Hilton', mark: 'HH', color: '#294c8b', unit: 'points' },
  { id: 'marriott', type: 'hotel', name: 'Marriott Bonvoy', issuer: 'Marriott', mark: 'MB', color: '#92543e', unit: 'points' },
  { id: 'wyndham', type: 'hotel', name: 'Wyndham Rewards', issuer: 'Wyndham', mark: 'W', color: '#236a88', unit: 'points' },
  { id: 'ihg', type: 'hotel', name: 'IHG One Rewards', issuer: 'IHG', mark: 'IH', color: '#1f4e3d', unit: 'points' },
  { id: 'choice', type: 'hotel', name: 'Choice Privileges', issuer: 'Choice Hotels', mark: 'CH', color: '#c45c12', unit: 'points' },
  { id: 'accor', type: 'hotel', name: 'ALL Accor', issuer: 'Accor', mark: 'AL', color: '#1a1a1a', unit: 'points' },
  { id: 'iprefer', type: 'hotel', name: 'I Prefer Rewards', short: 'I Prefer', issuer: 'Preferred Hotels', mark: 'IP', color: '#6b4c7a', unit: 'points' },
  { id: 'leaders', type: 'hotel', name: 'Leaders Club', issuer: 'Leading Hotels of the World', mark: 'LH', color: '#8a734a', unit: 'points' },
  { id: 'amtrak', type: 'rail', name: 'Guest Rewards', issuer: 'Amtrak', mark: 'AM', color: '#1f4e8c', unit: 'points' },
];

const ONE: Rate = [1, 1];
const FOUR_THREE: Rate = [4, 3];
const FIVE_FOUR: Rate = [5, 4];
const FIVE_THREE: Rate = [5, 3];
const ONE_TWO: Rate = [1, 2];
const TWO_ONE: Rate = [2, 1];
const TWO_ONE_FIVE: Rate = [2, 1.5];
const THREE_TWO: Rate = [3, 2];
const FOUR_ONE: Rate = [4, 1];
const FIVE_ONE: Rate = [5, 1];
const ONE_ONE_SIX: Rate = [1, 1.6];
const ONE_ONE_FIVE: Rate = [1, 1.5];
const ONE_OH_SEVEN: Rate = [1, 0.7];
const ONE_OH_FIVE_SIX: Rate = [1, 0.56];
const ONE_OH_THREE_FIVE: Rate = [1, 0.35];
const ONE_ONE_OH_FIVE: Rate = [1, 1.05];
const ONE_ONE_FOUR: Rate = [1, 1.4];
const ONE_OH_ONE_FOUR: Rate = [1, 0.14];

function at(rate: Rate, ids: string[]): Record<string, Rate> {
  return Object.fromEntries(ids.map((id) => [id, rate]));
}

const rates: Record<string, Record<string, Rate>> = {
  chase: at(ONE, [
    'aeroplan', 'flyingblue', 'hyatt', 'marriott', 'united', 'british', 'jetblue', 'wyndham',
    'singapore', 'aerlingus', 'iberia', 'southwest', 'virgin', 'ihg',
  ]),
  amex: {
    ...at(ONE, ['aeroplan', 'flyingblue', 'marriott', 'british', 'singapore', 'aerlingus', 'ana', 'avianca', 'delta', 'iberia', 'qantas', 'qatar', 'virgin', 'choice']),
    hilton: ONE_TWO,
    jetblue: FIVE_FOUR,
    aeromexico: ONE_ONE_SIX,
    cathay: FIVE_FOUR,
    emirates: FIVE_FOUR,
    leaders: FOUR_ONE,
  },
  capital: {
    ...at(ONE, ['aeromexico', 'aeroplan', 'avianca', 'british', 'cathay', 'etihad', 'finnair', 'flyingblue', 'qantas', 'qatar', 'singapore', 'tap', 'turkish', 'virginred', 'choice', 'wyndham']),
    emirates: TWO_ONE_FIVE,
    eva: TWO_ONE_FIVE,
    jal: TWO_ONE_FIVE,
    jetblue: FIVE_THREE,
    iprefer: ONE_TWO,
    accor: TWO_ONE,
  },
  citi: {
    ...at(ONE, ['flyingblue', 'aa', 'avianca', 'cathay', 'etihad', 'eva', 'jetblue', 'qantas', 'qatar', 'singapore', 'turkish', 'virgin', 'wyndham']),
    emirates: FIVE_FOUR,
    accor: TWO_ONE,
    choice: ONE_ONE_FIVE,
    iprefer: ONE_TWO,
    leaders: FIVE_ONE,
  },
  citiBasic: {
    ...at(ONE_OH_SEVEN, ['flyingblue', 'aa', 'avianca', 'cathay', 'etihad', 'eva', 'jetblue', 'qantas', 'qatar', 'singapore', 'turkish', 'virgin', 'wyndham']),
    emirates: ONE_OH_FIVE_SIX,
    accor: ONE_OH_THREE_FIVE,
    choice: ONE_ONE_OH_FIVE,
    iprefer: ONE_ONE_FOUR,
    leaders: ONE_OH_ONE_FOUR,
  },
  bilt: {
    ...at(ONE, ['atmos', 'avianca', 'united', 'flyingblue', 'virginred', 'virgin', 'emirates', 'british', 'cathay', 'turkish', 'aerlingus', 'iberia', 'aeroplan', 'tap', 'southwest', 'jal', 'qatar', 'etihad', 'hilton', 'marriott', 'hyatt', 'ihg', 'wyndham']),
    accor: THREE_TWO,
    iprefer: ONE_TWO,
    amtrak: TWO_ONE,
  },
  wells: {
    ...at(ONE, ['aerlingus', 'flyingblue', 'avianca', 'british', 'cathay', 'iberia', 'jetblue', 'virgin', 'virginred']),
    choice: ONE_TWO,
    wyndham: ONE_TWO,
  },
};

const cardRates: Record<string, Record<string, Rate>> = {
  preferred: { hyatt: FOUR_THREE },
  ink: { hyatt: FOUR_THREE },
};

const NOTES: Record<string, string> = {
  'preferred:hyatt': '4:3 applies to accounts opened on or after June 15, 2026. Accounts opened before then retain 1:1 through September 30, 2026; 4:3 applies from October 1, 2026.',
  'ink:hyatt': '4:3 applies from October 1, 2026 for new and existing Ink Business Preferred cardholders. Through September 30, 2026 this card still transfers at 1:1.',
};

const itemById = new Map(ITEMS.map((item) => [item.id, item]));

export function byId(id: string) {
  return itemById.get(id);
}

export function displayName(item: Item) {
  return item.short || item.name;
}

export function formatRatio(rate: Rate) {
  const fmt = (value: number) => {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  };
  return `${fmt(rate[0])} : ${fmt(rate[1])}`;
}

export function transferYield(rate: Rate) {
  return rate[1] / rate[0];
}

export function receivedFromThousand(rate: Rate) {
  return Math.round((1000 * rate[1]) / rate[0]);
}

export function programKind(type: ItemType) {
  if (type === 'hotel') return 'Hotel program';
  if (type === 'rail') return 'Rail program';
  return 'Airline program';
}

export function getTransfer(cardId: string, programId: string): Transfer | null {
  const card = byId(cardId);
  const program = byId(programId);
  if (!card || card.type !== 'card' || !program || program.type === 'card' || !card.family) return null;
  const rate = cardRates[cardId]?.[programId] ?? rates[card.family]?.[programId];
  if (!rate) return null;
  const noteKey = `${cardId}:${programId}`;
  return {
    from: cardId,
    to: programId,
    rate,
    ratio: formatRatio(rate),
    yield: transferYield(rate),
    note: NOTES[noteKey],
    source: card.source ?? card.family,
  };
}

export function connections(ids: string[]) {
  const selected = new Set(ids);
  return ITEMS.filter((item) => item.type === 'card' && selected.has(item.id)).flatMap((card) =>
    ITEMS.filter((program) => program.type !== 'card' && selected.has(program.id))
      .map((program) => getTransfer(card.id, program.id))
      .filter((link): link is Transfer => Boolean(link)),
  );
}

export function emphasisFor(link: Transfer, links: Transfer[]): Emphasis {
  const peers = links.filter((other) => other.to === link.to);
  const max = Math.max(...peers.map((other) => other.yield));
  const min = Math.min(...peers.map((other) => other.yield));
  const contested = peers.length > 1 && max - min > 0.001;
  if (contested && Math.abs(link.yield - max) < 0.001) return 'best';
  if (link.yield > 1.001) return 'above';
  if (link.yield < 0.999) return 'below';
  return 'par';
}

export function analyze(ids: string[]) {
  const links = connections(ids);
  const selected = new Set(ids);
  const cards = ITEMS.filter((item) => item.type === 'card' && selected.has(item.id));
  const destinations = [...new Set(links.map((link) => link.to))];
  const shared = destinations.filter((id) => new Set(links.filter((link) => link.to === id).map((link) => byId(link.from)?.family)).size > 1);
  const suggestions = ITEMS.filter((item) => item.type !== 'card' && !selected.has(item.id))
    .map((program) => ({
      id: program.id,
      currencies: new Set(cards.filter((card) => getTransfer(card.id, program.id)).map((card) => card.family)).size,
      best: cards
        .map((card) => getTransfer(card.id, program.id))
        .filter((link): link is Transfer => Boolean(link))
        .sort((a, b) => b.yield - a.yield)[0],
    }))
    .filter((entry) => entry.currencies > 0)
    .sort((a, b) => (b.best?.yield ?? 0) - (a.best?.yield ?? 0) || b.currencies - a.currencies);
  return { links, destinations, shared, suggestions };
}

export const EXAMPLE = ['reserve', 'preferred', 'gold', 'hyatt', 'hilton'];

export const CARD_X = 0;
export const PROGRAM_X = 420;
export const PROGRAM_GAP = 320;
const CARD_PITCH = 188;
const PROGRAM_PITCH = 164;

export function programColumns(count: number) {
  if (count > 16) return 3;
  if (count > 6) return 2;
  return 1;
}

export function layoutPositions(ids: string[]) {
  const cards = ids.filter((id) => byId(id)?.type === 'card');
  const programs = ids.filter((id) => byId(id)?.type !== 'card');
  const cols = programColumns(programs.length);
  const positions: Record<string, Point> = {};
  const cardSpan = Math.max(cards.length * CARD_PITCH, 320);
  cards.forEach((id, index) => {
    positions[id] = {
      x: CARD_X,
      y: (cardSpan - cards.length * CARD_PITCH) / 2 + index * CARD_PITCH + 28,
    };
  });
  const perCol = Math.ceil(programs.length / cols) || 1;
  programs.forEach((id, index) => {
    const col = Math.floor(index / perCol);
    const row = index % perCol;
    const rowsInCol = Math.min(perCol, programs.length - col * perCol);
    const colSpan = rowsInCol * PROGRAM_PITCH;
    positions[id] = {
      x: PROGRAM_X + col * PROGRAM_GAP,
      y: (Math.max(colSpan, cardSpan) - colSpan) / 2 + row * PROGRAM_PITCH + 40,
    };
  });
  return positions;
}

export function positionNew(id: string, ids: string[], positions: Record<string, Point>): Point {
  const item = byId(id);
  if (!item) return { x: CARD_X, y: 40 };
  if (item.type === 'card') {
    let y = 40;
    let guard = 0;
    while (ids.some((other) => positions[other] && Math.abs(positions[other].x - CARD_X) < 240 && Math.abs(positions[other].y - y) < 170)) {
      y += CARD_PITCH;
      if (++guard > 40) break;
    }
    return { x: CARD_X, y };
  }
  const futureCount = ids.filter((other) => byId(other)?.type !== 'card').length + 1;
  const cols = programColumns(futureCount);
  let chosen = { x: PROGRAM_X, y: 40, count: Number.POSITIVE_INFINITY };
  for (let col = 0; col < cols; col += 1) {
    const x = PROGRAM_X + col * PROGRAM_GAP;
    let y = 40;
    let guard = 0;
    while (ids.some((other) => positions[other] && Math.abs(positions[other].x - x) < 260 && Math.abs(positions[other].y - y) < 150)) {
      y += PROGRAM_PITCH;
      if (++guard > 40) break;
    }
    const count = ids.filter((other) => positions[other] && Math.abs(positions[other].x - x) < 260).length;
    if (count < chosen.count) chosen = { x, y, count };
  }
  return { x: chosen.x, y: chosen.y };
}

export function nodeSize(id: string) {
  return { w: 220, h: byId(id)?.type === 'card' ? 140 : 100 };
}
