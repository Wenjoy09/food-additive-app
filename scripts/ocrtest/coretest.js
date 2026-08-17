// 直接测量 worker 内 importScripts 加载 wasm core 的耗时与错误
const code = `
self.onmessage = (e) => {
  const file = e.data;
  const t0 = Date.now();
  try {
    importScripts(file);
    const t1 = Date.now();
    self.postMessage('LOADED in ' + (t1 - t0) + 'ms; TesseractCore=' + typeof self.TesseractCore);
  } catch (err) {
    self.postMessage('IMPORT ERROR after ' + (Date.now() - t0) + 'ms: ' + err);
  }
};
`;
const blob = new Blob([code], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
worker.onmessage = (e) => {
  console.log('[coretest]', e.data);
  document.body.innerText += e.data + '\n';
};
worker.onerror = (e) => {
  console.log('[coretest] WORKER ERROR', e.message);
  document.body.innerText += 'WORKER ERROR ' + e.message + '\n';
};
console.log('[coretest] start');
worker.postMessage(location.origin + '/tesseract/worker.min.js');
