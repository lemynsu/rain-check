// scripts/fetch-data.mjs
// Downloads daily weather for LA and Taipei from the Open-Meteo Historical Weather API,
// keeps the raw response in memory only, and writes small chart-ready CSVs to data/.
// Run from the project root:  npm run data   (or: node scripts/fetch-data.mjs)

import { mkdir, writeFile } from 'node:fs/promises';
import * as d3 from 'd3';

// ---- Settings ----
const CITIES = [
  { city: 'LA',     lat: 34.05, lon: -118.24 },
  { city: 'Taipei', lat: 25.03, lon: 121.56 },
];
const START = '2023-01-01';
const END   = '2024-12-31';
const VARS = [
  'temperature_2m_mean', 'temperature_2m_max', 'temperature_2m_min',
  'precipitation_sum', 'relative_humidity_2m_mean',
  'wind_speed_10m_max', 'sunshine_duration',
];
const RAINY_MM = 1;                                // a "rainy day" has at least 1 mm
const OUT_DIR  = new URL('../data/', import.meta.url);

const round = (v, digits = 1) => (v == null ? null : +v.toFixed(digits));

// ---- Step 1: download one city (raw JSON is never written to disk) ----
async function fetchCity({ city, lat, lon }) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    start_date: START,
    end_date: END,
    daily: VARS.join(','),
    timezone: 'auto',                              // days follow each city's local time
  });

  const res  = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(`${city}: ${json.reason ?? res.status}`);

  // ---- Step 2: reshape column arrays into one object per day ----
  const d = json.daily;
  return d.time.map((date, i) => ({
    date,
    city,
    year:      +date.slice(0, 4),
    month:     +date.slice(5, 7),
    temp_mean: d.temperature_2m_mean[i],          // °C
    temp_max:  d.temperature_2m_max[i],           // °C
    temp_min:  d.temperature_2m_min[i],           // °C
    precip:    d.precipitation_sum[i],            // mm
    humidity:  d.relative_humidity_2m_mean[i],    // %
    wind:      d.wind_speed_10m_max[i],           // km/h
    sunshine:  d.sunshine_duration[i] == null ? null : d.sunshine_duration[i] / 3600, // s -> h
  }));
}

const days = (await Promise.all(CITIES.map(fetchCity))).flat();

// ---- Step 3: daily file for the scatterplot (only the columns it uses) ----
const daily = days.map(d => ({
  date: d.date,
  city: d.city,
  month: d.month,                 // lets the scatterplot join in linked highlights
  temp_mean: round(d.temp_mean),
  humidity: round(d.humidity),
  precip: round(d.precip),        // kept for tooltips
}));

// ---- Step 4: per-month aggregate (city × year × month) for the heatmap ----
const monthly = d3.flatRollup(
  days,
  v => ({
    precip:     round(d3.sum(v, d => d.precip)),             // total mm in the month
    rainy_days: v.filter(d => d.precip >= RAINY_MM).length,
    temp_mean:  round(d3.mean(v, d => d.temp_mean)),
    temp_max:   round(d3.mean(v, d => d.temp_max)),
    temp_min:   round(d3.mean(v, d => d.temp_min)),
    humidity:   round(d3.mean(v, d => d.humidity)),
    wind:       round(d3.mean(v, d => d.wind)),
    sunshine:   round(d3.mean(v, d => d.sunshine)),          // hours per day
  }),
  d => d.city, d => d.year, d => d.month
).map(([city, year, month, stats]) => ({ city, year, month, ...stats }));

// ---- Step 5: typical month (average of 2023 and 2024) for the bar and bubble charts ----
const monthlyAvg = d3.flatRollup(
  monthly,
  v => ({
    precip:     round(d3.mean(v, d => d.precip)),
    rainy_days: round(d3.mean(v, d => d.rainy_days)),
    temp_mean:  round(d3.mean(v, d => d.temp_mean)),
    temp_max:   round(d3.mean(v, d => d.temp_max)),
    temp_min:   round(d3.mean(v, d => d.temp_min)),
    humidity:   round(d3.mean(v, d => d.humidity)),
    wind:       round(d3.mean(v, d => d.wind)),
    sunshine:   round(d3.mean(v, d => d.sunshine)),
  }),
  d => d.city, d => d.month
).map(([city, month, stats]) => ({ city, month, ...stats }));

// ---- Step 6: write the small CSVs ----
await mkdir(OUT_DIR, { recursive: true });
const files = {
  'daily.csv':       daily,
  'monthly.csv':     monthly,
  'monthly-avg.csv': monthlyAvg,
};
for (const [name, rows] of Object.entries(files)) {
  const csv = d3.csvFormat(rows);
  await writeFile(new URL(name, OUT_DIR), csv);
  console.log(`data/${name}: ${rows.length} rows, ${(csv.length / 1024).toFixed(1)} KB`);
}
