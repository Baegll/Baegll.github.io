import { createServer } from 'node:http';
import { createServer as createPortServer } from 'node:net';
import { spawn } from 'node:child_process';
import { access, readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, relative, dirname, extname, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf('--' + name); return index < 0 ? fallback : args[index + 1]; }
const runs = Number(option('runs', '3'));
const profile = option('profile', 'mobile');
if (!Number.isInteger(runs) || runs < 1 || runs > 20) throw Error('--runs must be between 1 and 20');
if (!['mobile', 'desktop'].includes(profile)) throw Error('--profile must be mobile or desktop');
const routes = option('routes', '/,/blog/,/blog/context-management,/projects/locknight/').split(',');
const output = option('out', '.tmp/performance/latest.json');
const baselinePath = option('baseline', null);
const settings = profile === 'mobile'
  ? { width: 390, height: 844, cpuSlowdown: 4, latencyMs: 100, downloadKbps: 1600, uploadKbps: 750 }
  : { width: 1440, height: 1000, cpuSlowdown: 1, latencyMs: 0, downloadKbps: -1, uploadKbps: -1 };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, description) { const deadline = Date.now() + 45000; while (Date.now() < deadline) { const value = await fn(); if (value) return value; await wait(100); } throw Error(`Timed out: ${description}`); }
async function freePort() { const server = createPortServer().listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }

// Serve the production build with gzip, ordinary static routing, and no dev toolbar/HMR.
const root = resolve(option('dir', 'dist'));
let server;
let origin = option('origin', null);
if (!origin) {
  await access(join(root, 'index.html'));
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
  server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const candidates = path.endsWith('/') ? [path + 'index.html'] : [path, path + '.html', path + '/index.html'];
      for (const candidate of candidates) {
        const file = resolve(root, '.' + candidate);
        if (relative(root, file).split(sep).includes('..')) continue;
        let data;
        try { data = await readFile(file); } catch { continue; }
        const type = mime[extname(file)] ?? 'application/octet-stream';
        const gzip = /text\/|json|svg/.test(type) && (req.headers['accept-encoding'] ?? '').includes('gzip');
        if (gzip) data = gzipSync(data);
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'Cache-Control': 'no-store', ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) });
        res.end(data); return;
      }
      res.writeHead(404); res.end('Not found');
    } catch { res.writeHead(500); res.end('Static server error'); }
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
}

const browserPath = process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = await freePort();
const userData = await mkdtemp(join(tmpdir(), 'portfolio-performance-'));
const browser = spawn(browserPath, ['--headless', '--disable-extensions', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${userData}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
let launchError;
browser.on('error', error => { launchError = error; });
let socket;
try {
  const target = await until(async () => { if (launchError) throw launchError; try { return (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(page => page.type === 'page'); } catch { return false; } }, 'browser startup');
  socket = new WebSocket(target.webSocketDebuggerUrl); await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  let bytes = 0, requests = 0, failures = [], exceptions = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result); }
    else if (message.method === 'Network.loadingFinished') bytes += message.params.encodedDataLength;
    else if (message.method === 'Network.requestWillBeSent') requests++;
    else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failures.push({ url: message.params.response.url, status: message.params.response.status });
    else if (message.method === 'Network.loadingFailed' && !message.params.canceled) failures.push({ error: message.params.errorText });
    else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  const evaluate = async expression => { const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails)); return response.result.value; };
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  const version = await call('Browser.getVersion');
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Emulation.setDeviceMetricsOverride', { width: settings.width, height: settings.height, deviceScaleFactor: 1, mobile: profile === 'mobile' });
  await call('Emulation.setCPUThrottlingRate', { rate: settings.cpuSlowdown });
  await call('Network.emulateNetworkConditions', { offline: false, latency: settings.latencyMs, downloadThroughput: settings.downloadKbps < 0 ? -1 : settings.downloadKbps * 1000 / 8, uploadThroughput: settings.uploadKbps < 0 ? -1 : settings.uploadKbps * 1000 / 8 });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__lab = { lcpMs: null, cls: 0, tasks: [], supported: PerformanceObserver.supportedEntryTypes };
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) new PerformanceObserver(list => { for (const e of list.getEntries()) window.__lab.lcpMs = e.startTime; }).observe({type:'largest-contentful-paint', buffered:true});
    let sessionStart = 0, previous = 0, sessionScore = 0;
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) new PerformanceObserver(list => { for (const e of list.getEntries()) { if (e.hadRecentInput) continue; if (e.startTime - previous > 1000 || e.startTime - sessionStart > 5000) { sessionStart = e.startTime; sessionScore = 0; } previous = e.startTime; sessionScore += e.value; window.__lab.cls = Math.max(window.__lab.cls, sessionScore); } }).observe({type:'layout-shift', buffered:true});
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) new PerformanceObserver(list => { for (const e of list.getEntries()) window.__lab.tasks.push({start:e.startTime, duration:e.duration}); }).observe({type:'longtask', buffered:true});
  ` });
  const samples = [];
  // Interleave routes so one route does not get all the earliest/coldest measurements.
  for (let run = 1; run <= runs; run++) for (const route of routes) {
    await call('Page.navigate', { url: 'about:blank' });
    await call('Network.clearBrowserCache');
    bytes = 0; requests = 0; failures = []; exceptions = [];
    await call('Page.navigate', { url: new URL(route, origin).href });
    await until(() => evaluate(`document.readyState === 'complete' && !!window.__lab`), `${route} load`);
    await wait(2000);
    const data = await evaluate(`(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
      return { ttfbMs:nav.responseStart - nav.startTime, fcpMs:fcp, lcpMs:window.__lab.lcpMs, cls:window.__lab.cls, blockingMs:window.__lab.tasks.filter(t=>fcp!==null&&t.start>=fcp).reduce((sum,t)=>sum+Math.max(0,t.duration-50),0), observationMs:performance.now(), domReadyMs:nav.domContentLoadedEventEnd, loadMs:nav.loadEventEnd, overflow:document.documentElement.scrollWidth>innerWidth+1, fontStatus:document.fonts.status, supported:window.__lab.supported };
    })()`);
    const transferBytes = bytes, requestCount = requests;
    const button = await evaluate(`(() => { const b=document.querySelector('.theme-toggle'); if(!b)return null; const r=b.getBoundingClientRect(); window.__themeFeedback=null; b.addEventListener('click',e=>{const start=e.timeStamp;requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__themeFeedback=performance.now()-start}));},{once:true}); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    let themeFeedbackMs = null;
    if (button) {
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...button, button: 'left', clickCount: 1 });
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...button, button: 'left', clickCount: 1 });
      themeFeedbackMs = await until(() => evaluate('window.__themeFeedback'), 'theme feedback');
    }
    const sample = { route, run, ...data, transferBytes, requestCount, themeFeedbackMs, failures: [...failures], exceptions: [...exceptions] };
    samples.push(sample);
    console.log(`${profile} ${run}/${runs} ${route}: LCP ${Math.round(data.lcpMs ?? 0)} ms, CLS ${data.cls.toFixed(3)}, ${Math.round(transferBytes / 1024)} KiB`);
  }
  const median = values => { const sorted = values.filter(value => value !== null).sort((a,b) => a-b); return sorted.length ? sorted.length % 2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1] + sorted[sorted.length/2])/2 : null; };
  const metrics = ['ttfbMs','fcpMs','lcpMs','cls','blockingMs','transferBytes','requestCount','themeFeedbackMs'];
  const summaries = routes.map(route => { const selected = samples.filter(sample => sample.route === route); return { route, medians: Object.fromEntries(metrics.map(metric => [metric, median(selected.map(sample => sample[metric]))])), invalidSamples: selected.filter(sample => sample.failures.length || sample.exceptions.length || sample.overflow || sample.lcpMs === null).length }; });
  let comparison = null;
  if (baselinePath) {
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
    if (JSON.stringify(baseline.settings) !== JSON.stringify(settings) || baseline.method !== 'production-lab-v1') throw Error('Baseline settings/method do not match this run.');
    if (baseline.target !== (option('origin', null) ?? 'local production build (gzip)')) throw Error('Baseline target does not match: keep local and hosted baselines separate.');
    comparison = summaries.map(summary => { const previous = baseline.summaries.find(item => item.route === summary.route); return { route: summary.route, delta: previous ? Object.fromEntries(metrics.map(metric => [metric, summary.medians[metric] === null || previous.medians[metric] === null ? null : summary.medians[metric] - previous.medians[metric]])) : null }; });
  }
  const report = { method: 'production-lab-v1', measuredAt: new Date().toISOString(), target: option('origin', null) ?? 'local production build (gzip)', browser: version.product, platform: process.platform, profile, settings, runs, notes: ['Browser cache disabled and cleared per navigation; DNS/TLS/OS caches are not reset.', 'Observation ends 2 seconds after load. CLS and LCP are load-window lab measurements.', 'blockingMs sums long-task excess over 50 ms after FCP within this window; not Lighthouse TBT.', 'themeFeedbackMs is click timestamp to the second animation frame; a scripted feedback probe, not INP.', 'Transfer bytes come from CDP and include external fonts. Local TTFB does not measure hosting/CDN.', 'Medians of small lab samples are not field p75. Compare on the same machine, browser, and profile.'], summaries, comparison, samples };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.table(summaries.map(item => ({ route: item.route, LCP_ms: Math.round(item.medians.lcpMs ?? 0), FCP_ms: Math.round(item.medians.fcpMs ?? 0), CLS: item.medians.cls.toFixed(3), blocking_ms: Math.round(item.medians.blockingMs), KiB: Math.round(item.medians.transferBytes/1024), theme_ms: item.medians.themeFeedbackMs === null ? null : Math.round(item.medians.themeFeedbackMs), invalid: item.invalidSamples })));
  console.log(`Saved ${output}`);
  if (comparison) console.table(comparison.map(item => ({ route: item.route, LCP_delta_ms: item.delta?.lcpMs, FCP_delta_ms: item.delta?.fcpMs, CLS_delta: item.delta?.cls, transfer_delta_bytes: item.delta?.transferBytes })));
  if (summaries.some(item => item.invalidSamples)) process.exitCode = 1;
} finally {
  socket?.close(); browser.kill();
  if (server) await new Promise(resolve => server.close(resolve));
}
