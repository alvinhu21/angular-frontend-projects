#!/usr/bin/env node
// tools/buy-scan/buy-scan.mjs — the 3:00 PM ET buy scan behind the daily Claude routine.
//
// Scans every US-listed stock, ADR and ETF for a Formula of 1 or less on its live price, as the
// yahoo-finance dashboard computes it (stock-utils.ts computeFormula, technical-indicators.service.ts):
//   Formula = RSI(14, Wilder) - 30 + 30 * (price - lower Bollinger band) / 20-day mean,
//   bands over 20 days at 2 standard deviations (population), missing closes filled as
//   market.models.ts fillMissingPrice does.
// Then grades each hit:
//   DO NOT BUY  penny (under $5) or thin (under $5M a day), falling knife (down 30%+ in a month
//               and within 2% of its 52-week low), or weak fundamentals (losing money and
//               shrinking revenue; funds exempt). Bad company news is judged from the headlines
//               this script collects, by the routine.
//   BUY         above its 200-day average, or a strong company (profitable, revenue growing, worth
//               $10B or more, like TMUS) whatever its trend; pending the routine's news check
//               (no story scored -7 or lower today, net news -2 or better).
//   WAIT        everything else: below its 200-day average, or too little history to tell.
//
// Node 18+, no dependencies. Writes <out>/buy-scan.json and <out>/review.md.
// Usage: node buy-scan.mjs [--out DIR] [--max-formula 1] [--symbols A,B,C] [--force]
//   --force skips the gate that only lets the scan run from 3:00 to 3:45 PM ET on NYSE trading
//   days (exit code 3 otherwise).
// The symbols come from Nasdaq Trader's directory, or from universe-snapshot.txt beside this
// script when the directory can't be fetched (it sits behind a bot check). Refresh the snapshot
// from a downloaded nasdaqtraded.txt with: node buy-scan.mjs --snapshot-from nasdaqtraded.txt

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ------------------------------------------------------------------ settings

const args = parseArgs(process.argv.slice(2));
const OUT_DIR = args.out ?? 'buy-scan-out';
const MAX_FORMULA = Number(args['max-formula'] ?? 1);
const FORCE = args.force === true;
const SIGMA = 2;
const NEWS_DAYS = 7; // calendar days: about five trading days
const MAX_HEADLINES = 6;

const PENNY_PRICE = 5;
const THIN_DOLLAR_VOLUME = 5_000_000;
const KNIFE_MONTH_DROP = -0.3;
const KNIFE_NEAR_LOW = 1.02;
const STRONG_MARKET_CAP = 10e9;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const SYMBOL_DIRECTORY = 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt';
const SNAPSHOT = join(dirname(fileURLToPath(import.meta.url)), 'universe-snapshot.txt');
/** Fewer symbols than this means the directory or snapshot didn't load properly. */
const MIN_UNIVERSE = 5000;

/** Words in a headline that may mean news bad enough never to buy on; the routine confirms. */
const SELL_LEVEL_WORDS =
  /\b(bankrupt\w*|chapter (7|11)|going concern|delist\w*|fraud\w*|sec charges|charged by the sec|indict\w*|restat\w+|insolven\w*|receivership|default(s|ed)? on|halts? trading|trading halt\w*|suspends? (operations|trading)|criminal (probe|investigation)|ponzi|accounting irregularit\w*)\b/i;

// ------------------------------------------------------------------ clock and calendar

const NY_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** New York wall clock: { date: 'YYYY-MM-DD', minutes } for an instant. */
function nyClock(instant) {
  const p = Object.fromEntries(NY_PARTS.formatToParts(instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** NYSE trading day (mirrors src/app/services/nyse-calendar.ts). `date` is 'YYYY-MM-DD'. */
export function isNyseTradingDay(date) {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  const weekday = day.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return false;
  }
  return !nyseHolidays(y).includes(date);
}

function nyseHolidays(year) {
  const iso = (d) => d.toISOString().slice(0, 10);
  const utc = (m, d) => new Date(Date.UTC(year, m, d));
  const add = (d, n) => new Date(d.getTime() + n * 864e5);
  const observed = (d) => (d.getUTCDay() === 6 ? add(d, -1) : d.getUTCDay() === 0 ? add(d, 1) : d);
  const nth = (m, weekday, n) => add(utc(m, 1), ((weekday - utc(m, 1).getUTCDay() + 7) % 7) + (n - 1) * 7);
  const lastMonday = (m) => {
    const last = utc(m + 1, 0);
    return add(last, -((last.getUTCDay() - 1 + 7) % 7));
  };
  const newYear = utc(0, 1);
  return [
    newYear.getUTCDay() === 6 ? null : observed(newYear),
    nth(0, 1, 3),
    nth(1, 1, 3),
    add(easterSunday(year), -2),
    lastMonday(4),
    year >= 2022 ? observed(utc(5, 19)) : null,
    observed(utc(6, 4)),
    nth(8, 1, 1),
    nth(10, 4, 4),
    observed(utc(11, 25)),
  ]
    .filter(Boolean)
    .map(iso);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, date));
}

// ------------------------------------------------------------------ the app's maths

function fillMissingPrice(price, index, prices) {
  if (price != null) {
    return price;
  }
  const prev = prices[index - 1] ?? null;
  const next = prices[index + 1] ?? null;
  if (prev != null && next != null) {
    return (prev + next) / 2;
  }
  return prev ?? next ?? 0;
}

function wilderRsi(prices, period = 14) {
  if (prices.length <= period) {
    return null;
  }
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const delta = prices[i] - prices[i - 1];
    if (delta > 0) {
      gains += delta;
    } else {
      losses -= delta;
    }
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
}

/** The dashboard's Formula on the last of `rawCloses`; null with under 20 sessions. */
export function formulaOf(rawCloses) {
  const closes = rawCloses.map(fillMissingPrice);
  if (closes.length < 20) {
    return null;
  }
  const window = closes.slice(-20);
  const middle = window.reduce((s, v) => s + v, 0) / 20;
  const sd = Math.sqrt(window.reduce((s, v) => s + (v - middle) ** 2, 0) / 20);
  const lower = middle - SIGMA * sd;
  const price = closes.at(-1);
  const rsi = wilderRsi(closes) ?? 0;
  if (!(price > 0) || !(middle > 0)) {
    return null;
  }
  return { formula: rsi - 30 + ((price - lower) / middle) * 30, rsi, lower, middle, upper: middle + SIGMA * sd, price };
}

// ------------------------------------------------------------------ fetching

async function getJson(url, { headers = {}, attempt = 0 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: controller.signal });
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(1500 * 2 ** attempt);
      return getJson(url, { headers, attempt: attempt + 1 });
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError' && attempt < 2) {
      return getJson(url, { headers, attempt: attempt + 1 });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function forEachLimited(items, limit, task) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await task(item);
      } catch (err) {
        warn(`skipped ${typeof item === 'string' ? item : JSON.stringify(item).slice(0, 40)}: ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const warn = (message) => console.error(`warn: ${message}`);

// ------------------------------------------------------------------ universe

/**
 * Traded stocks, ADRs, partnership units and ETFs from a nasdaqtraded.txt directory; no
 * warrants, rights, SPAC units, preferreds or notes. Empty when `text` isn't the directory.
 */
export function parseDirectory(text) {
  if (!text.startsWith('Nasdaq Traded|Symbol|')) {
    return [];
  }
  const universe = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    const p = line.split('|');
    if (p.length < 8 || p[0] !== 'Y' || p[7] !== 'N') {
      continue;
    }
    const symbol = p[1].trim().replace(/\./g, '-');
    const name = p[2].trim();
    const etf = p[5] === 'Y';
    if (/^[A-Z][A-Z0-9-]{0,7}$/.test(symbol) && (etf || !isNotAStock(symbol, name))) {
      universe.push({ symbol, name, etf });
    }
  }
  return universe;
}

/** { listings, source }: the live directory, else the snapshot beside this script. */
async function loadUniverse() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(SYMBOL_DIRECTORY, { headers: { 'User-Agent': UA } });
      const listings = res.ok ? parseDirectory(await res.text()) : [];
      if (listings.length >= MIN_UNIVERSE) {
        return { listings, source: 'Nasdaq Trader symbol directory (live)' };
      }
      warn(`symbol directory: HTTP ${res.status}, ${listings.length} symbols (blocked or incomplete)`);
    } catch (err) {
      warn(`symbol directory: ${err.message}`);
    }
    await sleep(3000);
  }
  const lines = (await readFile(SNAPSHOT, 'utf8')).split(/\r?\n/);
  const saved = lines[0].startsWith('# ') ? lines[0].slice(2).split(':')[0] : 'unknown date';
  const listings = lines
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [symbol, kind] = line.split('\t');
      return { symbol, name: symbol, etf: kind === 'E' };
    });
  if (listings.length < MIN_UNIVERSE) {
    throw new Error(`symbol directory unavailable and the snapshot holds only ${listings.length} symbols`);
  }
  return { listings, source: `saved symbol list (${saved}); the live directory was unavailable` };
}

/** Writes universe-snapshot.txt from a downloaded nasdaqtraded.txt. */
async function writeSnapshot(directoryPath) {
  const text = await readFile(directoryPath, 'utf8');
  const listings = parseDirectory(text);
  if (listings.length < MIN_UNIVERSE) {
    throw new Error(`${directoryPath} isn't a symbol directory (${listings.length} symbols)`);
  }
  const created = text.match(/File Creation Time: (\d{2})(\d{2})(\d{4})/);
  const date = created ? `${created[3]}-${created[1]}-${created[2]}` : new Date().toISOString().slice(0, 10);
  const body = listings.map((l) => `${l.symbol}\t${l.etf ? 'E' : 'S'}`).join('\n');
  await writeFile(SNAPSHOT, `# Nasdaq Trader directory of ${date}: symbol, E for ETF or S for stock\n${body}\n`);
  console.log(`Wrote ${SNAPSHOT}: ${listings.length} symbols from ${date}.`);
}

function isNotAStock(symbol, name) {
  if (/\bdepositary shares?\b/i.test(name)) {
    return /\bpreferred\b/i.test(name);
  }
  return (
    /\b(warrants?|rights?|preferred|notes?|debentures?|subordinated)\b/i.test(name) ||
    (/\bunits?\b/i.test(name) && /-?U$/.test(symbol))
  );
}

// ------------------------------------------------------------------ stage 1: every symbol

/** Formula for every symbol from Yahoo's batched spark endpoint (20 symbols a call). */
async function screen(symbols) {
  const batches = [];
  for (let i = 0; i < symbols.length; i += 20) {
    batches.push(symbols.slice(i, i + 20));
  }
  const hits = new Map();
  let priced = 0;
  await forEachLimited(batches, 4, async (batch) => {
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(batch.join(','))}&range=1y&interval=1d`;
    const body = await getJson(url);
    for (const result of body?.spark?.result ?? []) {
      const closes = result?.response?.[0]?.indicators?.quote?.[0]?.close;
      if (!Array.isArray(closes)) {
        continue;
      }
      priced++;
      const f = formulaOf(closes);
      if (f && f.formula <= MAX_FORMULA) {
        hits.set(result.symbol, f.formula);
      }
    }
  });
  return { hits, priced };
}

// ------------------------------------------------------------------ stage 2: each hit

async function study(symbol, listing, today) {
  const body = await getJson(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`);
  const chart = body?.chart?.result?.[0];
  const quote = chart?.indicators?.quote?.[0];
  if (!chart || !quote?.close) {
    return null;
  }
  const f = formulaOf(quote.close);
  if (!f || f.formula > MAX_FORMULA) {
    return null;
  }
  const closes = quote.close.map(fillMissingPrice);
  const days = (chart.timestamp ?? []).map((t) => nyClock(new Date(t * 1000)).date);
  const tradedToday = days.at(-1) === today && quote.close.at(-1) != null;
  // Completed sessions only: today's volume is still building at 3 PM.
  const done = days.at(-1) === today ? closes.length - 1 : closes.length;
  const recent = Array.from({ length: Math.min(20, done) }, (_, i) => done - 1 - i);
  const dollarVolume = recent.length
    ? recent.reduce((s, i) => s + (quote.close[i] ?? 0) * (quote.volume?.[i] ?? 0), 0) / recent.length
    : 0;
  const monthAgo = closes.length > 21 ? closes.at(-22) : null;
  const yearLow = Math.min(...closes.slice(-253, -1).filter((v) => v > 0));
  const ma200 = closes.length >= 200 ? closes.slice(-200).reduce((s, v) => s + v, 0) / 200 : null;
  const previous = closes.length > 1 ? closes.at(-2) : null;
  const meta = chart.meta ?? {};

  return {
    symbol,
    name: meta.longName || meta.shortName || listing?.name || symbol,
    type: meta.instrumentType === 'ETF' || listing?.etf ? 'ETF' : 'Stock',
    exchange: meta.fullExchangeName ?? '',
    price: round(f.price, 4),
    asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
    tradedToday,
    changePct: previous ? round((f.price / previous - 1) * 100, 2) : null,
    formula: round(f.formula, 2),
    rsi: round(f.rsi, 1),
    lowerBand: round(f.lower, 4),
    ma20: round(f.middle, 4),
    ma200: ma200 == null ? null : round(ma200, 4),
    monthChangePct: monthAgo ? round((f.price / monthAgo - 1) * 100, 1) : null,
    yearLow: Number.isFinite(yearLow) ? round(yearLow, 4) : null,
    avgDollarVolume: Math.round(dollarVolume),
    sessions: closes.length,
  };
}

function round(value, places) {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

// ------------------------------------------------------------------ stage 3: company data

async function yahooSession() {
  try {
    const seed = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const cookie = (seed.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
    const res = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } });
    const crumb = (await res.text()).trim();
    return res.ok && crumb && crumb.length < 40 && !crumb.includes('<') ? { cookie, crumb } : null;
  } catch (err) {
    warn(`no Yahoo session for company data: ${err.message}`);
    return null;
  }
}

/** { eps, revenueGrowth, profitMargin, marketCap }, or null when Yahoo has none. */
async function fundamentals(symbol, session) {
  const url =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=financialData,defaultKeyStatistics,price&crumb=${encodeURIComponent(session.crumb)}`;
  const body = await getJson(url, { headers: { Cookie: session.cookie } });
  const r = body?.quoteSummary?.result?.[0];
  if (!r) {
    return null;
  }
  const raw = (v) => (typeof v?.raw === 'number' ? v.raw : null);
  return {
    eps: raw(r.defaultKeyStatistics?.trailingEps),
    revenueGrowth: raw(r.financialData?.revenueGrowth),
    profitMargin: raw(r.financialData?.profitMargins),
    marketCap: raw(r.price?.marketCap),
  };
}

// ------------------------------------------------------------------ stage 4: headlines

async function headlines(symbol, now) {
  const body = await getJson(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=12&quotesCount=0`,
  );
  return (body?.news ?? [])
    .filter((n) => n?.title && n.providerPublishTime && now - n.providerPublishTime * 1000 <= NEWS_DAYS * 864e5)
    .sort((a, b) => b.providerPublishTime - a.providerPublishTime)
    .slice(0, MAX_HEADLINES)
    .map((n) => ({
      title: String(n.title).replace(/\s+/g, ' ').trim(),
      publisher: n.publisher ?? '',
      at: new Date(n.providerPublishTime * 1000).toISOString(),
      link: n.link ?? '',
      aboutIt: Array.isArray(n.relatedTickers) ? n.relatedTickers.includes(symbol) : null,
      sellLevelWords: SELL_LEVEL_WORDS.test(String(n.title)),
    }));
}

// ------------------------------------------------------------------ grading

/** Profitable, with revenue growing, worth STRONG_MARKET_CAP or more: TMUS is one. Funds never are. */
function isStrong(stock) {
  const f = stock.fundamentals;
  if (stock.type !== 'Stock' || !f) {
    return false;
  }
  const profitable = f.eps != null ? f.eps > 0 : f.profitMargin != null && f.profitMargin > 0;
  return profitable && f.revenueGrowth != null && f.revenueGrowth > 0 && f.marketCap != null && f.marketCap >= STRONG_MARKET_CAP;
}

function grade(stock) {
  const doNotBuy = [];
  if (stock.price < PENNY_PRICE) {
    doNotBuy.push(`Penny stock: under $${PENNY_PRICE}`);
  }
  if (stock.avgDollarVolume < THIN_DOLLAR_VOLUME) {
    doNotBuy.push(`Thinly traded: $${(stock.avgDollarVolume / 1e6).toFixed(1)}M a day, under $5M`);
  }
  if (stock.monthChangePct != null && stock.monthChangePct / 100 <= KNIFE_MONTH_DROP && stock.yearLow != null && stock.price <= stock.yearLow * KNIFE_NEAR_LOW) {
    doNotBuy.push(`Falling knife: ${stock.monthChangePct}% in a month, at its 52-week low`);
  }
  const f = stock.fundamentals;
  if (stock.type === 'Stock' && f) {
    const losing = f.eps != null ? f.eps < 0 : f.profitMargin != null && f.profitMargin < 0;
    if (losing && f.revenueGrowth != null && f.revenueGrowth < 0) {
      doNotBuy.push(`Weak fundamentals: losing money (EPS ${f.eps ?? 'n/a'}) and revenue ${(f.revenueGrowth * 100).toFixed(1)}% year on year`);
    }
  }
  if (doNotBuy.length) {
    return { status: 'DO NOT BUY', reasons: doNotBuy };
  }
  if (stock.ma200 != null && stock.price > stock.ma200) {
    return { status: 'BUY', reasons: [`Above its 200-day average (${stock.ma200})`, 'Pending the news check'] };
  }
  if (isStrong(stock)) {
    return {
      status: 'BUY',
      reasons: [
        `Strong company, exempt from the uptrend rule: profitable (EPS ${f.eps ?? 'n/a'}), revenue +${(f.revenueGrowth * 100).toFixed(1)}%, $${(f.marketCap / 1e9).toFixed(0)}B`,
        stock.ma200 == null ? 'Under 200 sessions of history' : `Below its 200-day average (${stock.ma200})`,
        'Pending the news check',
      ],
    };
  }
  return {
    status: 'WAIT',
    reasons: [stock.ma200 == null ? 'Under 200 sessions of history: no long-term trend to confirm' : `Below its 200-day average (${stock.ma200}): a downtrend`],
  };
}

// ------------------------------------------------------------------ report for the routine

function reviewMarkdown(run, stocks) {
  const money = (n) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${(n / 1e6).toFixed(1)}M`);
  const row = (s) =>
    `| ${s.symbol} | ${s.name.replace(/\|/g, '/')} | ${s.type} | ${s.price} | ${s.changePct ?? ''}% | ${s.formula} | ${s.rsi} | ${s.ma200 ?? 'n/a'} | ${money(s.avgDollarVolume)}/day |`;
  const news = (s) =>
    s.headlines?.length
      ? s.headlines
          .map((h) => `  - ${h.sellLevelWords ? '⚠ ' : ''}${h.at.slice(0, 16).replace('T', ' ')}Z · ${h.publisher} · ${h.aboutIt === false ? '(not tagged to it) ' : ''}${h.title}`)
          .join('\n')
      : '  - (no headlines in the last 7 days)';
  const by = (status) => stocks.filter((s) => s.status === status).sort((a, b) => b.avgDollarVolume - a.avgDollarVolume);
  const buy = by('BUY');
  const wait = by('WAIT');
  const dnb = by('DO NOT BUY');
  const header = '| Symbol | Name | Type | Price | Day | Formula | RSI | 200-day avg | Traded |\n|---|---|---|---|---|---|---|---|---|';
  const reasonCounts = {};
  for (const s of dnb) {
    for (const r of s.reasons) {
      const key = r.split(':')[0];
      reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
    }
  }
  return [
    `# Buy scan ${run.date}, prices as of ${run.asOfNy} ET`,
    '',
    `Scanned ${run.scanned} symbols (${run.priced} priced) from the ${run.symbolSource}; ${stocks.length} at Formula <= ${MAX_FORMULA}: ${buy.length} BUY pending news, ${wait.length} WAIT, ${dnb.length} DO NOT BUY.`,
    `DO NOT BUY reasons: ${Object.entries(reasonCounts).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}.`,
    run.fundamentals ? '' : '**Company data was unavailable: the weak-fundamentals rule was not applied.**',
    '',
    `## BUY pending the news check (${buy.length}): above the 200-day average, or a strong company; most traded first`,
    '',
    ...buy.flatMap((s) => [header, row(s), '', news(s), '']),
    `## WAIT (${wait.length}): below the 200-day average; headlines shown where a ⚠ word appeared`,
    '',
    header,
    ...wait.map(row),
    '',
    ...wait.filter((s) => s.headlines?.some((h) => h.sellLevelWords)).flatMap((s) => [`**${s.symbol}**`, news(s), '']),
    `## DO NOT BUY (${dnb.length})`,
    '',
    ...dnb.slice(0, 80).map((s) => `- ${s.symbol} (${s.name}): ${s.reasons.join('; ')}`),
    dnb.length > 80 ? `- ...and ${dnb.length - 80} more in buy-scan.json` : '',
  ].join('\n');
}

// ------------------------------------------------------------------ main

async function main() {
  if (args['snapshot-from']) {
    await writeSnapshot(String(args['snapshot-from']));
    return;
  }
  const now = new Date();
  const clock = nyClock(now);
  if (!FORCE && (!isNyseTradingDay(clock.date) || clock.minutes < 15 * 60 || clock.minutes >= 15 * 60 + 45)) {
    console.log(`Not 3:00-3:45 PM ET on an NYSE trading day (it is ${clock.date} ${Math.floor(clock.minutes / 60)}:${String(clock.minutes % 60).padStart(2, '0')} ET). Nothing to do.`);
    process.exit(3);
  }

  const { listings, source } = args.symbols
    ? { listings: String(args.symbols).split(',').filter(Boolean).map((symbol) => ({ symbol, name: symbol, etf: false })), source: 'symbols given' }
    : await loadUniverse();
  const bySymbol = new Map(listings.map((l) => [l.symbol, l]));
  console.error(`universe: ${listings.length} symbols from ${source}`);

  const { hits, priced } = await screen(listings.map((l) => l.symbol));
  console.error(`priced ${priced}; Formula <= ${MAX_FORMULA}: ${hits.size}`);
  if (priced < listings.length / 2) {
    throw new Error(`Yahoo priced only ${priced} of ${listings.length} symbols: the price feed is failing`);
  }

  const stocks = [];
  await forEachLimited([...hits.keys()], 8, async (symbol) => {
    const s = await study(symbol, bySymbol.get(symbol), clock.date);
    if (s) {
      stocks.push(s);
    }
  });

  // Company data only matters for stocks that nothing else rules out.
  const session = await yahooSession();
  if (session) {
    const needed = stocks.filter((s) => s.type === 'Stock' && grade(s).status !== 'DO NOT BUY');
    await forEachLimited(needed, 6, async (s) => {
      s.fundamentals = await fundamentals(s.symbol, session);
    });
  }

  for (const s of stocks) {
    Object.assign(s, grade(s));
  }
  await forEachLimited(
    stocks.filter((s) => s.status !== 'DO NOT BUY'),
    6,
    async (s) => {
      s.headlines = await headlines(s.symbol, now.getTime());
    },
  );

  stocks.sort((a, b) => a.formula - b.formula);
  const run = {
    date: clock.date,
    asOfNy: `${Math.floor(clock.minutes / 60)}:${String(clock.minutes % 60).padStart(2, '0')}`,
    generatedAt: now.toISOString(),
    symbolSource: source,
    scanned: listings.length,
    priced,
    maxFormula: MAX_FORMULA,
    fundamentals: !!session,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, 'buy-scan.json'), JSON.stringify({ run, stocks }, null, 1));
  await writeFile(join(OUT_DIR, 'review.md'), reviewMarkdown(run, stocks));
  const count = (status) => stocks.filter((s) => s.status === status).length;
  console.log(
    `Buy scan ${run.date} ${run.asOfNy} ET: ${stocks.length} at Formula <= ${MAX_FORMULA} — BUY pending news ${count('BUY')}, WAIT ${count('WAIT')}, DO NOT BUY ${count('DO NOT BUY')}. Wrote ${join(OUT_DIR, 'review.md')} and buy-scan.json.`,
  );
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    const next = argv[i + 1];
    if (next != null && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  main().catch((err) => {
    console.error(`buy scan failed: ${err.stack ?? err}`);
    process.exit(1);
  });
}
