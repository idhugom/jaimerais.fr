import { chromium } from 'playwright-core';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = '/tmp/claude-0/-home-user-jaimerais-fr/54f5f9be-86a6-509c-8bd8-e14609f8ddc3/scratchpad';
const BASE = 'https://jaimerais-preprod.pages.dev';
const shots = [
  { url: '/', name: 'live-home', w: 1440, h: 900, y: 0 },
  { url: '/conseils', name: 'live-conseils', w: 1440, h: 900, y: 0 },
];
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  await page.goto(BASE + s.url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: false });
  console.log('shot', s.name);
  await page.close();
}
await browser.close();
console.log('done');
