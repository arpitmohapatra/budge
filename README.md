# Budge — family money

A local-first budgeting PWA for two people plus a family view. Accounts, credit cards, paydays, bills, budgets, investments and a cash forecast that answers "can we afford it?". Visual language borrowed from Checkpoint (Outfit type, soft blue-grey, dark hero panel, ⌘K).

React 18 + TypeScript + Vite · IndexedDB (`idb`) · Lucide icons · hand-rolled SVG charts · `vite-plugin-pwa`. No backend; nothing leaves the device.

## What it does

| Area | Details |
|---|---|
| **People** | Two profiles + a **Family** view that adds everything together. Switch at the top (sidebar / top bar). |
| **Accounts** | Checking, savings, cash and **credit cards** with starting balances ("as of today"). Cards track what you owe and credit-limit use. "Update balance" reconciles to your bank with an adjustment entry. |
| **Card dues** | Add a due *amount + date* and the bank account it comes out of. On the date it's deducted from the bank and applied to the card automatically. One-off bills (e.g. property tax) work the same way. |
| **Income** | Pay amount + pay days. Default is **twice a month on the 7th & 22nd**; if a pay date falls on a weekend or US federal holiday it is paid on the **last business day before** (Sat 7th → Fri 6th, Sun 22nd → Fri 20th, Monday holiday → the Friday before). Also supports every 2 weeks, weekly, monthly. Paychecks post themselves. |
| **Recurring bills** | Rent, subscriptions, insurance… weekly → yearly, optional weekend/holiday roll-back, pause/end dates. |
| **Expenses** | Fast add sheet, **quick log** ("coffee 4.50 yesterday", "+250 bonus", "ATM 100"), ⌘K palette, cash-withdrawal shortcut, transfers (e.g. paying a card early). |
| **Budgets** | Monthly limit per category, per person (family view sums them). Pace marker, "running hot" / **over budget** states, month history, suggestions from your last 3 months of everyday spending. |
| **Forecast** | 30d – 6mo projection from current cash + scheduled pay + bills + card dues − your average everyday spending. Lowest point, per-account overdraft warnings, scrub-able chart. |
| **Can I afford it?** | Enter a future expense + date → Yes / Tight / Not yet, the lowest balance afterwards, the earliest comfortable date, and the most you could spend that day. Save purchases to a plan; they're re-checked as things change. |
| **Investments** | Per person: holdings with cost basis and current value, "add money" (optionally deducted from an account), "update value", growth chart, allocation donut, gain/loss. |
| **Home** | "Safe to spend until payday", 60-day sparkline, insights (cash squeeze, budgets, big bills coming, card utilisation…), net worth, upcoming, recent activity. |

## How the money math works

- **Balances** = starting balance + everything dated on/after the account's "as of" date. Cards are negative (owed). **Card payments are transfers, not expenses**, so spending isn't double counted.
- **Forecast** starts from checking + cash (savings optional in Settings), adds each scheduled paycheck, subtracts recurring bills and open dues from the account they come out of, and subtracts typical everyday spending (average of the last 30/60/90 days of non-scheduled expenses; overridable per person). A cushion (default $500) turns "yes" into "tight".
- **Safe to spend** = checking + cash − bills/dues landing before the next payday, spread over the days until then.
- Scheduled items are posted when the app opens (or the day changes). Paydays/bills missed while it was closed are caught up, once.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173/budge/
npm test             # engine tests: recurrence, pay-day rule, balances, forecast, affordability, budgets
npm run build        # type-check + production build
```

Deploy: pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml` (base path `/budge/`). Install from the browser (iOS: Share → Add to Home Screen).

## Using it on two phones

Data lives in each device's browser storage. To share: export a **Full backup** once and import it on the second device (so the profiles match). After that each person exports **their own data** (Settings → Backup & sharing) and the other imports it — that replaces only that person's numbers. Live sync would need a backend, which isn't included.

## Notes

- The pay-day rule uses US federal holidays.
- Investment values are entered by you (no market feed), so everything works offline.
- Data lives in IndexedDB database `budge-v2`; the older v1 database (`budge-db`) is left untouched.
- **Settings → Load sample data** fills in a realistic household to explore; **Erase all data** clears it.
