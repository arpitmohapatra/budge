import { addDaysYMD, parseYMD, toYMD } from './dates';
import type { AppState, Category, YMD } from './types';

export interface QuickParse {
  amount?: number;
  date: YMD;
  categoryId?: string;
  isIncome: boolean;
  note: string;
}

const KEYWORDS: Record<string, string[]> = {
  groceries: ['grocer', 'costco', 'walmart', 'trader', 'whole foods', 'kroger', 'aldi', 'safeway', 'supermarket', 'produce', 'milk', 'target'],
  dining: ['dinner', 'lunch', 'breakfast', 'coffee', 'starbucks', 'restaurant', 'cafe', 'pizza', 'takeout', 'doordash', 'ubereats', 'uber eats', 'chipotle', 'mcdonald', 'brunch', 'bar', 'drinks', 'boba', 'dining'],
  transport: ['gas', 'fuel', 'uber', 'lyft', 'parking', 'toll', 'metro', 'train', 'bus', 'shell', 'chevron'],
  subscriptions: ['netflix', 'spotify', 'hulu', 'disney', 'youtube', 'icloud', 'subscription', 'prime'],
  shopping: ['amazon', 'clothes', 'shoes', 'shopping', 'ikea', 'mall', 'zara'],
  health: ['doctor', 'pharmacy', 'cvs', 'dentist', 'medicine', 'gym', 'clinic', 'walgreens'],
  fun: ['movie', 'concert', 'tickets', 'game', 'bowling', 'museum', 'fun'],
  cash: ['atm', 'cash', 'withdraw', 'withdrawal', 'withdrew'],
  utilities: ['electric', 'water', 'internet', 'wifi', 'phone', 'utility', 'utilities'],
  housing: ['rent', 'mortgage', 'hoa', 'repair', 'furniture'],
  travel: ['flight', 'hotel', 'airbnb', 'trip', 'airline'],
  family: ['kids', 'daycare', 'school', 'toys', 'baby', 'diapers'],
  gifts: ['gift', 'donation', 'charity'],
};

const INCOME_WORDS = ['paycheck', 'salary', 'bonus', 'refund', 'income', 'dividend', 'interest', 'got paid', 'payday'];

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Parses things like "coffee 4.50 yesterday", "ATM 100", "costco 87.3 @mon", "+2400 bonus". */
export function parseQuick(input: string, state: Pick<AppState, 'categories'>, today: YMD): QuickParse {
  let text = ` ${input.trim()} `;
  let date = today;

  // date tokens
  const dm = text.match(/\s@?(today|yesterday|ydy|(?:last\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*)(?=\s)/i);
  if (dm) {
    const w = dm[1].toLowerCase();
    if (w === 'yesterday' || w === 'ydy') date = addDaysYMD(today, -1);
    else if (w !== 'today') {
      const target = WEEKDAYS.indexOf(dm[2].toLowerCase());
      const cur = parseYMD(today).getDay();
      let back = (cur - target + 7) % 7;
      if (back === 0) back = 7;
      date = addDaysYMD(today, -back);
    }
    text = text.replace(dm[0], ' ');
  }
  const iso = text.match(/\s@?(\d{4}-\d{2}-\d{2})(?=\s)/);
  if (iso) { date = iso[1]; text = text.replace(iso[0], ' '); }
  const md = text.match(/\s@(\d{1,2})\/(\d{1,2})(?=\s)/);
  if (md) { const y = parseYMD(today).getFullYear(); const d = new Date(y, Number(md[1]) - 1, Number(md[2])); date = toYMD(d > parseYMD(today) ? new Date(y - 1, d.getMonth(), d.getDate()) : d); text = text.replace(md[0], ' '); }

  // amount
  let amount: number | undefined;
  let plus = false;
  const am = text.match(/(^|\s)([+-]?)\$?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?(?=\s|$)/);
  if (am) {
    amount = Number(am[3].replace(/,/g, '') + (am[4] ?? ''));
    plus = am[2] === '+';
    text = text.replace(am[0], ' ');
  }

  const note = text.replace(/\s+/g, ' ').trim();
  const lower = note.toLowerCase();
  const isIncome = plus || INCOME_WORDS.some((w) => lower.includes(w));

  let categoryId: string | undefined;
  const cats: Category[] = state.categories.filter((c) => c.kind === (isIncome ? 'income' : 'expense'));
  for (const c of cats) if (lower && (lower === c.name.toLowerCase() || lower.includes(c.name.toLowerCase()))) { categoryId = c.id; break; }
  if (!categoryId && !isIncome) {
    outer: for (const [id, words] of Object.entries(KEYWORDS)) for (const w of words) {
      if (new RegExp(`\\b${w}`, 'i').test(lower)) { categoryId = id; break outer; }
    }
  }
  if (!categoryId && isIncome) categoryId = lower.includes('bonus') ? 'bonus' : lower.includes('interest') || lower.includes('dividend') ? 'interest' : 'paycheck';
  return { amount, date, categoryId, isIncome, note: note ? note[0].toUpperCase() + note.slice(1) : '' };
}
