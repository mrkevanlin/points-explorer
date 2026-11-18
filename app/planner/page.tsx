'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { byId, displayName, getTransfer } from '@/lib/catalog';
import {
  BONUSES_FETCHED_AT,
  BONUS_SOURCE_URL,
  DESTINATIONS,
  TYPICAL_FLIGHT_PER_PERSON,
  TYPICAL_HOTEL_PER_NIGHT,
  addMonths,
  buildStrategy,
  currencyOf,
  currentMonth,
  destinationById,
  estimateNeeds,
  formatMonth,
  formatPoints,
  isValidMonth,
  monthIndex,
  offerFor,
  programOptions,
  recommendFlightProgram,
  recommendPaths,
  recommendProgram,
  type PlannedCard,
  type TripRequirement,
} from '@/lib/planner';

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <strong>{value}</strong>
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </label>
  );
}

export default function PlannerPage() {
  const [destId, setDestId] = useState('tokyo');
  const [tripMonth, setTripMonth] = useState(() => addMonths(currentMonth(), 8));
  const [travelers, setTravelers] = useState(2);
  const [nights, setNights] = useState(5);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customFlightProgram, setCustomFlightProgram] = useState('any');
  const [customFlightPer, setCustomFlightPer] = useState<number | ''>('');
  const [customHotelProgram, setCustomHotelProgram] = useState('any');
  const [customHotelPer, setCustomHotelPer] = useState<number | ''>('');

  const isCustom = destId === 'custom';
  const dest = isCustom ? null : destinationById(destId);
  const tripName = isCustom ? (customCity.trim() || 'your trip') : (dest?.city ?? 'your trip');
  const openMonth = currentMonth();
  const flightPerEffective = customFlightPer === '' ? TYPICAL_FLIGHT_PER_PERSON : customFlightPer;
  const hotelPerEffective = customHotelPer === '' ? TYPICAL_HOTEL_PER_NIGHT : customHotelPer;
  const flightTotal = flightPerEffective * Math.max(1, travelers);
  const hotelTotal = hotelPerEffective * Math.max(1, nights);
  const hotelForFlightRec: TripRequirement = useMemo(() => ({
    key: 'req-hotel',
    programId: customHotelProgram === 'any' ? 'hyatt' : customHotelProgram,
    pointsNeeded: hotelTotal,
    label: `${Math.max(1, nights)} nights hotel`,
  }), [customHotelProgram, hotelTotal, nights]);
  const flightForHotelRec: TripRequirement = useMemo(() => ({
    key: 'req-flight',
    programId: customFlightProgram === 'any' ? 'united' : customFlightProgram,
    pointsNeeded: flightTotal,
    label: `${Math.max(1, travelers)} × RT flight`,
  }), [customFlightProgram, flightTotal, travelers]);
  const recommendedFlight = useMemo(() => {
    if (!isCustom || customFlightProgram !== 'any') return null;
    return recommendFlightProgram(flightTotal, hotelForFlightRec, openMonth);
  }, [isCustom, customFlightProgram, flightTotal, hotelForFlightRec, openMonth]);
  const recommendedHotel = useMemo(() => {
    if (!isCustom || customHotelProgram !== 'any') return null;
    return recommendProgram('hotel', hotelTotal, flightForHotelRec, openMonth);
  }, [isCustom, customHotelProgram, hotelTotal, flightForHotelRec, openMonth]);
  const flightProgramId = isCustom
    ? (customFlightProgram === 'any' ? (recommendedFlight?.programId ?? 'united') : customFlightProgram)
    : '';
  const hotelProgramId = isCustom
    ? (customHotelProgram === 'any' ? (recommendedHotel?.programId ?? 'hyatt') : customHotelProgram)
    : '';
  const requirements = useMemo<TripRequirement[]>(() => {
    if (isCustom) {
      return [
        { key: 'req-flight', programId: flightProgramId, pointsNeeded: flightTotal, label: `${Math.max(1, travelers)} × RT flight` },
        { key: 'req-hotel', programId: hotelProgramId, pointsNeeded: hotelTotal, label: `${Math.max(1, nights)} nights hotel` },
      ];
    }
    return estimateNeeds(destId, travelers, nights);
  }, [isCustom, destId, travelers, nights, flightProgramId, hotelProgramId, flightTotal, hotelTotal]);
  const paths = useMemo(() => recommendPaths(requirements, currentMonth(), 3), [requirements]);
  const best = paths[0];
  const tripValid = isValidMonth(tripMonth);

  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Pointline home">
          <span className="brand-icon">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M10 24V8h8a6 6 0 0 1 0 12h-8" />
              <circle cx="10" cy="24" r="3" />
            </svg>
          </span>
          pointline<span className="brand-period">.</span>
        </Link>
        <span className="product-label">TRIP PLANNER</span>
        <div className="header-right">
          <nav className="planner-nav" aria-label="Primary">
            <Link href="/">Explorer</Link>
            <Link href="/planner" aria-current="page" className="active">Planner</Link>
          </nav>
        </div>
      </header>
      <main>
        <div className="workspace-heading">
          <div>
            <div className="eyebrow">CITY · DATE · PEOPLE — WE DO THE REST</div>
            <h1>Where do you want to go?</h1>
          </div>
        </div>

        <section className="planner-card trip-input" aria-label="Trip inputs">
          <div className="trip-fields">
            <label className="field">
              <span>City</span>
              <select value={destId} onChange={(e) => setDestId(e.target.value)}>
                {DESTINATIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.city}, {d.country}</option>
                ))}
                <option value="custom">Other / custom…</option>
              </select>
            </label>
            <label className="field">
              <span>Time of year</span>
              <input type="month" value={tripMonth} onChange={(e) => setTripMonth(e.target.value)} />
            </label>
            <Stepper label="People" value={travelers} min={1} max={8} onChange={setTravelers} />
            <Stepper label="Nights" value={nights} min={1} max={21} onChange={setNights} />
          </div>
          {!tripValid ? <p className="field-error">Enter a valid trip month.</p> : null}
          {isCustom ? (
            <div className="custom-grid">
              <label className="field">
                <span>City name</span>
                <input value={customCity} onChange={(e) => setCustomCity(e.target.value)} placeholder="e.g. Lisbon" maxLength={60} />
              </label>
              <label className="field">
                <span>Flight program</span>
                <select value={customFlightProgram} onChange={(e) => setCustomFlightProgram(e.target.value)}>
                  <option value="any">Not sure — recommend one</option>
                  {programOptions().filter((p) => p.type !== 'hotel' && p.type !== 'rail').map((p) => (
                    <option key={p.id} value={p.id}>{displayName(p)} · {p.issuer}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Miles per person RT · <em>blank = estimate</em></span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder={`Typical ${TYPICAL_FLIGHT_PER_PERSON.toLocaleString()}`}
                  value={customFlightPer}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCustomFlightPer(raw === '' ? '' : Math.max(0, Math.round(Number(raw) || 0)));
                  }}
                />
              </label>
              <label className="field">
                <span>Hotel program</span>
                <select value={customHotelProgram} onChange={(e) => setCustomHotelProgram(e.target.value)}>
                  <option value="any">Not sure — recommend one</option>
                  {programOptions().filter((p) => p.type === 'hotel').map((p) => (
                    <option key={p.id} value={p.id}>{displayName(p)} · {p.issuer}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Points per night · <em>blank = estimate</em></span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder={`Typical ${TYPICAL_HOTEL_PER_NIGHT.toLocaleString()}`}
                  value={customHotelPer}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setCustomHotelPer(raw === '' ? '' : Math.max(0, Math.round(Number(raw) || 0)));
                  }}
                />
              </label>
            </div>
          ) : null}
          <p className="estimate-line">
            For <strong>{travelers} {travelers === 1 ? 'person' : 'people'}</strong>, <strong>{nights} nights</strong> in <strong>{tripName}</strong>
            {' '}you'll need about <strong>{requirements.map((r) => `${formatPoints(r.pointsNeeded)} ${displayName(byId(r.programId)!)}`).join(' + ')}</strong>.
            {isCustom ? (
              <span className="muted">
                {' '}{customFlightProgram === 'any' && recommendedFlight ? `Flights: we recommend ${displayName(byId(recommendedFlight.programId)!)}.` : ''}
                {customHotelProgram === 'any' && recommendedHotel ? ` Hotel: we recommend ${displayName(byId(recommendedHotel.programId)!)}.` : ''}
                {customFlightPer === '' || customHotelPer === '' ? ' Amounts are typical estimates — fill them in if you know your fares.' : ' Based on your custom estimates.'}
              </span>
            ) : dest ? <span className="muted"> {dest.blurb}. Estimates are editable below.</span> : null}
          </p>
        </section>

        <h2 className="paths-heading">Recommended paths</h2>
        <div className="paths-grid">
          {paths.map((path, i) => {
            const inTime = path.coveredMonth !== null && tripValid && monthIndex(path.coveredMonth) <= monthIndex(tripMonth);
            return (
              <article key={path.id} className={`planner-card path-card${i === 0 ? ' best' : ''}`}>
                {i === 0 ? <span className="best-tag">Best path</span> : <span className="path-tag">Option {i + 1}</span>}
                <h3>{path.title}</h3>
                <p className="path-summary">
                  Open {path.cardIds.length === 1 ? 'this card' : 'these cards'} now →{' '}
                  {path.coveredMonth ? (
                    <strong>points ready by {formatMonth(path.coveredMonth)}</strong>
                  ) : (
                    <strong>partially covers the trip</strong>
                  )}{' '}
                  · ${path.totalFees.toLocaleString()} fees
                </p>
                <div className="path-status">
                  {path.fullyCovered ? (
                    inTime ? <span className="status ok">✓ Covers the trip in time</span> : <span className="status late">Covers it, but after your trip month</span>
                  ) : (
                    <span className="status short">Covers {formatPoints(path.strategy.plans.reduce((s, p) => s + p.covered, 0))} of {formatPoints(requirements.reduce((s, r) => s + r.pointsNeeded, 0))} pts</span>
                  )}
                </div>
                <div className="strategy-list">
                  {path.strategy.plans.map((p) => {
                    const program = byId(p.requirement.programId);
                    return (
                      <div key={p.requirement.key} className="strategy-step">
                        <span>
                          {program ? displayName(program) : p.requirement.key}: {formatPoints(p.covered)} / {formatPoints(p.requirement.pointsNeeded)} pts
                          {p.coveredMonth ? ` · ready ${formatMonth(p.coveredMonth)}` : ''}
                        </span>
                        {p.assigned.map((a) => {
                          const card = byId(a.cardId);
                          const link = getTransfer(a.cardId, p.requirement.programId);
                          return (
                            <small key={a.plannedKey}>
                              {card ? displayName(card) : a.cardId} → {formatPoints(a.receivePoints)} pts{link ? ` (${link.ratio})` : ''}
                            </small>
                          );
                        })}
                        {p.shortfall > 0 ? <small className="shortfall">{formatPoints(p.shortfall)} pts still short</small> : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        {best ? (
          <section className="planner-card what-next" aria-label="What to do next">
            <h2>What to do next</h2>
            <ol>
              {best.planned.map((p: PlannedCard, i: number) => {
                const card = byId(p.cardId);
                const offer = offerFor(p.cardId);
                return (
                  <li key={p.key}>
                    <strong>{i === 0 ? 'Now' : `Next month`} — open {card ? displayName(card) : p.cardId}</strong>
                    {offer.url ? (
                      <span> <a href={offer.url} target="_blank" rel="noopener noreferrer">Check current offer ↗</a></span>
                    ) : null}
                    <span className="muted"> {formatPoints(requirements.length ? best.strategy.totalBonus : 0)} total bonus across this path · bonus posts ~{formatMonth(p.openMonth)} + spend window ({currencyOf(p.cardId)}).</span>
                  </li>
                );
              })}
              <li><strong>Meet the spend, wait for the bonus, then transfer</strong><span className="muted"> — transfers are instant once points post. Don't transfer until your flights/hotel are bookable.</span></li>
            </ol>
          </section>
        ) : null}

        <section className="planner-card advanced" aria-label="Advanced settings">
          <button type="button" className="advanced-toggle" onClick={() => setAdvancedOpen((o) => !o)} aria-expanded={advancedOpen}>
            {advancedOpen ? 'Hide' : 'Show'} advanced: edit point goals
          </button>
          {advancedOpen ? (
            <div>
              <p className="muted">We estimated these from typical economy awards. Adjust if you know your exact fares.</p>
              <AdvancedGoals requirements={requirements} />
            </div>
          ) : null}
        </section>

        <footer className="page-footer">
          <span>Estimates, not guarantees.</span>
          <span className="muted">Bonuses via <a href={BONUS_SOURCE_URL} target="_blank" rel="noopener noreferrer">open bonus data</a> · updated {BONUSES_FETCHED_AT} — verify before opening cards.</span>
        </footer>
      </main>
    </>
  );
}

function AdvancedGoals({ requirements }: { requirements: TripRequirement[] }) {  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const effective = requirements.map((r) => ({ ...r, pointsNeeded: overrides[r.key] ?? r.pointsNeeded }));
  const strategy = buildStrategy(effective, recommendPaths(effective, currentMonth(), 1)[0]?.planned ?? []);
  return (
    <div>
      {effective.map((r) => {
        const program = byId(r.programId);
        return (
          <label key={r.key} className="field">
            <span>{program ? displayName(program) : r.key} — {r.label} (points)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={r.pointsNeeded}
              onChange={(e) => setOverrides((prev) => ({ ...prev, [r.key]: Math.max(0, Math.round(Number(e.target.value) || 0)) }))}
            />
          </label>
        );
      })}
      <p className="muted">Top path covers {formatPoints(strategy.plans.reduce((s, p) => s + p.covered, 0))} of {formatPoints(effective.reduce((s, r) => s + r.pointsNeeded, 0))} adjusted points.</p>
    </div>
  );
}
