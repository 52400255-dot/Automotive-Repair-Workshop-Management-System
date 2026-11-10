import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('D:/CNPM_landingpage/Automotive-Repair-Workshop-Management-System/frontend/node_modules/playwright-core');

const ROOT = 'D:/CNPM_landingpage/Automotive-Repair-Workshop-Management-System';
const SRC = path.join(ROOT, 'docs/diagrams/src');
const OUT = path.join(ROOT, 'docs/diagrams');
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
const EXE = path.join(os.homedir(), 'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe');

const jobs = [
  ['use-case.mmd', 'use-case.png'],
  ['class-diagram.mmd', 'class-diagram.png'],
  ['sequence-repair-workflow.mmd', 'sequence-repair-workflow.png'],
  ['activity.mmd', 'activity.png'],
  ['state-machine.mmd', 'state-machine.png'],
];

const only = process.argv[2] ? jobs.filter((j) => j[0].startsWith(process.argv[2])) : jobs;

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--allow-file-access-from-files', '--font-render-hinting=none'],
});
const ctx = await browser.newContext({ viewport: { width: 1900, height: 1400 }, deviceScaleFactor: Number(process.env.DSF || 2) });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<script src="${MERMAID}"></script>
<style>
  html,body{margin:0;padding:0;background:#fff;font-family:"Segoe UI",Arial,sans-serif;}
  #wrap{display:inline-block;padding:18px;box-sizing:border-box;}
  #wrap svg{max-width:none;}
</style></head><body><div id="wrap"><div id="g"></div></div><script>
  mermaid.initialize({
    startOnLoad:false, securityLevel:'loose', theme:'base',
    themeVariables:{ fontFamily:'"Segoe UI", Arial, sans-serif', fontSize:'15px',
      primaryColor:'#e9f5fd', primaryBorderColor:'#3d9bd1', primaryTextColor:'#0c3a55',
      lineColor:'#5b6b78', clusterBkg:'#fbfbfb', clusterBorder:'#c9c9c9',
      actorBkg:'#ffffff', actorBorder:'#2f3b45', actorTextColor:'#111111',
      signalColor:'#33414d', labelBoxBkgColor:'#fff7e0', noteBkgColor:'#fffbe6', noteBorderColor:'#e0a800' },
    flowchart:{ htmlLabels:true, curve:'basis', nodeSpacing:42, rankSpacing:58, padding:8 },
    sequence:{ showSequenceNumbers:false, actorMargin:60, messageMargin:38, boxMargin:8, mirrorActors:false, wrap: false },
    class:{ hideEmptyMembersBox:true },
    classDiagram:{ direction:'LR' }
  });
  window.render = async (text) => {
    const { svg } = await mermaid.render('d1', text);
    document.getElementById('g').innerHTML = svg;
    const box = document.querySelector('#g svg');
    const vb = box.viewBox && box.viewBox.baseVal && box.viewBox.baseVal.width
      ? box.viewBox.baseVal
      : { width: box.getBoundingClientRect().width, height: box.getBoundingClientRect().height };
    box.removeAttribute('style');
    box.style.display = 'block';
    box.style.width = Math.ceil(vb.width) + 'px';
    box.style.height = Math.ceil(vb.height) + 'px';
    box.setAttribute('width', Math.ceil(vb.width));
    box.setAttribute('height', Math.ceil(vb.height));
    box.setAttribute('max-width', Math.ceil(vb.width) + 'px');
    await document.fonts.ready;
    const r = document.getElementById('wrap').getBoundingClientRect();
    return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
  };
</script></body></html>`;

await page.setContent(html, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.mermaid === 'object' && typeof window.render === 'function');

for (const [mmd, png] of only) {
  const text = fs.readFileSync(path.join(SRC, mmd), 'utf8');
  consoleErrors.length = 0;
  let size;
  try {
    size = await page.evaluate((t) => window.render(t), text);
  } catch (e) {
    console.log('LOI ' + mmd + ': ' + String(e).split('\n').slice(0, 6).join(' | '));
    if (consoleErrors.length) console.log('   console: ' + consoleErrors.slice(0, 3).join(' || '));
    continue;
  }
  if (!size || size.w < 60 || size.h < 60) {
    console.log('TRIET ' + mmd + ' -> ' + JSON.stringify(size));
    const err = await page.evaluate(() => (document.getElementById('g').textContent || '').replace(/\s+/g, ' ').slice(0, 500));
    console.log('   text: ' + err);
    if (consoleErrors.length) console.log('   console: ' + consoleErrors.slice(0, 2).join(' || ').slice(0, 500));
    continue;
  }
  const errText = await page.evaluate(() => (document.getElementById('g').textContent || '').includes('Syntax error in text'));
  if (errText) { console.log('SYNTAX ' + mmd + ' :: ' + consoleErrors.slice(0, 4).join(' || ')); continue; }
  await page.locator('#wrap').screenshot({ path: path.join(OUT, png) });
  console.log('OK   ' + mmd + ' -> ' + png + '  ' + size.w + 'x' + size.h);
}

await browser.close();
