// Captura los "Issues" de Chrome DevTools (dominio Audits vía CDP) de la producción.
// Requiere playwright-core accesible (ver docs/evidencias/README.md).
import { chromium } from 'playwright-core';

const TARGET = process.argv[2] ?? 'https://epix-xi.vercel.app/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

await cdp.send('Audits.enable');
const issues = [];
cdp.on('Audits.issueAdded', ({ issue }) => {
  issues.push({ code: issue.code, details: issue.details?.cspViolation ?? issue.details ?? issue });
});

await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

console.log('Issues capturados:', issues.length);
for (const issue of issues.slice(0, 8)) {
  console.log('-', issue.code);
  console.log(' ', JSON.stringify(issue.details).slice(0, 420));
}
await browser.close();
