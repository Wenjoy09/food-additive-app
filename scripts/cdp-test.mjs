// 通过 CDP 驱动真实 Chrome，运行 OCR 测试页并捕获完整 console 输出
import { spawn } from 'node:child_process';

const PAGE = process.argv[2] ?? 'http://localhost:5191/scripts/ocrtest/index.html';
const WAIT_FOR = process.argv[3] ?? '[ocr-result]|[ocr-error]';
const TIMEOUT_MS = 120000;

const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function main() {
  await sleep(1500);
  const version = await getJson('http://localhost:9333/json/version');
  const browserWs = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (browserWs.onopen = r));

  let msgId = 0;
  const send = (ws, method, params = {}) =>
    new Promise((resolve) => {
      const id = ++msgId;
      const handler = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const { targetId } = await send(browserWs, 'Target.createTarget', { url: PAGE });

  // 等待 target 出现并拿到 ws 地址
  let pageWsUrl = null;
  for (let i = 0; i < 30 && !pageWsUrl; i++) {
    await sleep(300);
    const list = await getJson('http://localhost:9333/json/list');
    const t = list.find((x) => x.id === targetId);
    pageWsUrl = t?.webSocketDebuggerUrl;
  }
  if (!pageWsUrl) throw new Error('target not found');

  const pageWs = new WebSocket(pageWsUrl);
  await new Promise((r) => (pageWs.onopen = r));
  await send(pageWs, 'Runtime.enable');

  const lines = [];
  let done = false;
  pageWs.addEventListener('message', (ev) => {
    const data = JSON.parse(ev.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args
        .map((a) => a.value ?? a.description ?? '')
        .join(' ');
      lines.push(text);
      console.log('[page]', text.slice(0, 300));
      if (WAIT_FOR.split('|').some((m) => text.includes(m))) done = true;
    }
    if (data.method === 'Runtime.exceptionThrown') {
      const e = data.params.exceptionDetails;
      console.log('[page-exception]', e?.exception?.description ?? JSON.stringify(e));
      done = true;
    }
  });

  const start = Date.now();
  while (!done && Date.now() - start < TIMEOUT_MS) await sleep(300);

  console.log(done ? '=== TEST FINISHED ===' : '=== TEST TIMEOUT ===');
  chrome.kill('SIGKILL');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  chrome.kill('SIGKILL');
  process.exit(1);
});
