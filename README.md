# Pointline

A canvas for credit-card rewards and the loyalty programs they transfer to. Add cards and programs, see which transfers exist, and spot the stronger ratios. A separate planner estimates whether signup bonuses can cover a trip.

Ratios are point quantities, not cash value. A 1 : 2 line means 1,000 points become 2,000 in the destination program. Nothing here connects an account or moves points.

## Map

The home page is the partnership canvas.

- Add cards and programs from the catalog, or load the example mix.
- Drag items to arrange them. Drag the background to pan.
- Scroll or pinch over the canvas to zoom toward the pointer. The + and − buttons zoom toward the center, and keep a selected item centered.
- Green lines are the strongest transfer into a program, and any transfer above 1 : 1. Fainter lines return fewer points.
- Select a card or program to see its ratios, notes, and how many points 1,000 of the source currency become.

The canvas is local to the browser session and resets on reload.

## Planner

`/planner` estimates a trip from a destination, traveler count, and number of nights, then suggests cards whose welcome bonuses can cover the flights and hotel after transfer ratios. Point goals and programs can be edited. Figures are estimates. Check the current offer with the issuer before applying.

## Data

Transfer ratios are a curated snapshot of direct card-to-program transfers, reviewed **September 28, 2026**. Base rates only — temporary bonuses are left out. Issuer pages are linked from the catalog in `lib/catalog.ts`.

Welcome-bonus amounts, spend requirements, and annual fees come from the public [credit-card-bonuses-api](https://github.com/andenacitelli/credit-card-bonuses-api) dataset, checked in as `lib/bonus-data.json` (fetched 2026-10-16). Hardcoded offers in `lib/planner.ts` are used only when that file is missing a card.

The catalog currently includes 10 U.S. cards and 37 loyalty programs (airlines, hotels, and Amtrak).

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run refresh-bonuses` | Re-download welcome bonuses into `lib/bonus-data.json` |

Stack: Next.js App Router, React, TypeScript. No database and no API keys.
