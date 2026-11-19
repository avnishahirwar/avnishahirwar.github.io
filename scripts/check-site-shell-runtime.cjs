#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');

const ORIGIN = process.env.FC_SITE_ORIGIN || 'https://friendlycalculator.in';
const DEBUG_URL = 'http://127.0.0.1:9222';
const PAGES = [
  ['homepage', '/'],
  ['tax-category', '/calculator/tax.html'],
  ['finance-category', '/calculator/finance-calculators.html'],
  ['mortgage', '/calculators/mortgage-calculator.html'],
  ['worldwide-mortgage', '/international/global-mortgage-calculator.html']
];

const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
  '--remote-debugging-port=9222', '--remote-allow-origins=*',
  '--user-data-dir=/tmp/fc-shell-runtime-' + process.pid, 'about:blank'
], { stdio: 'ignore' });

let socket;
let nextId = 0;
const pending = new Map();

const fetchJson = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('HTTP ' + response.status + ' from ' + url);
  return response.json();
};

const waitFor = async (fn, description, timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error('Timed out waiting for ' + description + (lastError ? ': ' + lastError.message : ''));
};

const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timer = setTimeout(() => {
    pending.delete(id);
    reject(new Error('CDP command timed out: ' + method));
  }, 15000);
  pending.set(id, {
    resolve: value => { clearTimeout(timer); resolve(value); },
    reject: error => { clearTimeout(timer); reject(error); }
  });
  socket.send(JSON.stringify({ id, method, params }));
});

const evaluate = async expression => {
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed');
  return response.result && response.result.value;
};

const expression = [
  '(() => {',
  ' const header = document.querySelector("header.fc-global-header");',
  ' const footer = document.querySelector("footer.fc-global-footer");',
  ' const dock = document.getElementById("fc-floating-tools");',
  ' const settings = document.getElementById("fc-display-settings");',
  ' const panel = document.getElementById("fc-display-panel");',
  ' const quick = panel && panel.querySelector("#fc-settings-quick-actions");',
  ' const install = quick && quick.querySelector("#fc-pwa-install");',
  ' const assistant = quick && quick.querySelector("#fc-ai-lazy-launch");',
  ' const allCalculators = header && header.querySelector(".fc-all-calculators-link");',
  ' const dockStyle = dock ? getComputedStyle(dock) : null;',
  ' const shellCssLink = Array.from(document.querySelectorAll("link[rel=stylesheet]")).find(link => new URL(link.href, location.href).pathname === "/assets/site-shell.css");',
  ' const shellCssLoaded = !!(shellCssLink && shellCssLink.sheet);',
  ' const stylesheetHrefs = Array.from(document.styleSheets).map(sheet => sheet.href).filter(Boolean);',
  ' return {',
  '  readyState: document.readyState, path: location.pathname,',
  '  headerCount: document.querySelectorAll("header.fc-global-header").length,',
  '  footerCount: document.querySelectorAll("footer.fc-global-footer").length,',
  '  sitemapInFooter: !!footer && Array.from(footer.querySelectorAll("a")).some(a => { try { return new URL(a.href, location.href).pathname === "/sitemap.html"; } catch (_) { return false; } }),',
  '  settingsInDock: !!dock && !!settings && settings.parentElement === dock,',
  '  settingsInFooter: !!settings && !!settings.closest("footer.fc-global-footer"),',
  '  installInQuickActions: !!quick && !!install && quick.contains(install),',
  '  assistantInQuickActions: !!quick && !!assistant && quick.contains(assistant),',
  '  hasH1: !!document.querySelector("h1"),',
  '  allCalculatorsIsPlainLink: !!allCalculators && !allCalculators.hasAttribute("aria-haspopup") && !header.querySelector(".fc-all-dropdown-menu"),',
  '  dockPosition: dockStyle && dockStyle.position, dockLeft: dockStyle && dockStyle.left, dockRight: dockStyle && dockStyle.right, shellCssLoaded, stylesheetHrefs',
  ' };',
  '})()'
].join('\n');

const inspectPage = async (name, path) => {
  await cdp('Page.navigate', { url: new URL(path, ORIGIN).href });
  let result;
  try {
    result = await waitFor(async () => {
      const value = await evaluate(expression);
      if (value && value.readyState === 'complete' && value.headerCount === 1 && value.footerCount === 1 &&
          value.settingsInDock && value.installInQuickActions && value.assistantInQuickActions &&
          value.shellCssLoaded && value.dockPosition === 'fixed' && value.dockLeft !== 'auto' && value.dockRight === 'auto') return value;
      return null;
    }, 'shared shell on ' + path, 20000);
  } catch (error) {
    const diagnostic = await evaluate(expression).catch(() => null);
    process.stderr.write('DIAGNOSTIC ' + name + ' ' + JSON.stringify(diagnostic) + '\n');
    throw error;
  }

  process.stdout.write('CHECK ' + name + ' ' + JSON.stringify(result) + '\n');
  assert.equal(result.path, path, name + ': final path');
  assert.equal(result.headerCount, 1, name + ': exactly one shared Header');
  assert.equal(result.footerCount, 1, name + ': exactly one shared Footer');
  assert.equal(result.sitemapInFooter, true, name + ': Footer contains Sitemap');
  assert.equal(result.settingsInDock, true, name + ': Settings trigger is in the floating dock');
  assert.equal(result.settingsInFooter, false, name + ': Settings trigger is outside Footer');
  assert.equal(result.installInQuickActions, true, name + ': Install action is inside Settings');
  assert.equal(result.assistantInQuickActions, true, name + ': Assistant action is inside Settings');
  assert.equal(result.hasH1, true, name + ': page H1 remains visible');
  assert.equal(result.allCalculatorsIsPlainLink, true, name + ': All Calculators is a plain link');
  assert.equal(result.dockPosition, 'fixed', name + ': dock is fixed-position');
  assert.notEqual(result.dockLeft, 'auto', name + ': dock is anchored from the left');
  assert.equal(result.dockRight, 'auto', name + ': dock is not anchored from the right');
  process.stdout.write('PASS ' + name + ' ' + JSON.stringify(result) + '\n');
};

(async () => {
  try {
    await waitFor(async () => {
      try { await fetchJson(DEBUG_URL + '/json/version'); return true; }
      catch (_) { return false; }
    }, 'Chrome DevTools endpoint');

    const targets = await fetchJson(DEBUG_URL + '/json/list');
    const target = targets.find(item => item.type === 'page');
    if (!target || !target.webSocketDebuggerUrl) throw new Error('Chrome page target not found');

    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.addEventListener('message', event => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch (_) { return; }
      if (!message.id || !pending.has(message.id)) return;
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message || 'CDP error'));
      else handlers.resolve(message.result || {});
    });

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    for (const [name, path] of PAGES) await inspectPage(name, path);
    process.stdout.write('PASS all representative pages share the same Header, Footer and Settings dock.\n');
  } catch (error) {
    process.stderr.write((error && error.stack) || String(error));
    process.exitCode = 1;
  } finally {
    if (socket && socket.readyState === 1) socket.close();
    chrome.kill('SIGTERM');
  }
})();
