// 端到端测试：tesseract.js 识别中文营养成分表 → 解析
import sharp from 'sharp';
import { createWorker, OEM } from 'tesseract.js';

const labelSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="520">
  <rect width="640" height="520" fill="#ffffff"/>
  <g font-family="PingFang SC, Heiti SC, sans-serif" fill="#000">
    <text x="30" y="50" font-size="26" font-weight="bold">营养成分表</text>
    <text x="30" y="100" font-size="22">项目          每100g</text>
    <text x="30" y="150" font-size="22">能量          1980千焦</text>
    <text x="30" y="200" font-size="22">蛋白质        8.5克</text>
    <text x="30" y="250" font-size="22">脂肪          22.0克</text>
    <text x="30" y="300" font-size="22">碳水化合物    65.0克</text>
    <text x="30" y="350" font-size="22">钠            320毫克</text>
    <text x="30" y="420" font-size="22">配料表：小麦粉、白砂糖、植物油、食用盐、</text>
    <text x="30" y="460" font-size="22">食品添加剂（碳酸氢钠、柠檬酸、苯甲酸钠）</text>
  </g>
</svg>`;

const png = await sharp(Buffer.from(labelSvg)).png().toBuffer();

const worker = await createWorker(['chi_sim', 'eng'], OEM.LSTM_ONLY, {
  corePath: new URL('../node_modules/tesseract.js-core', import.meta.url).pathname,
  langPath: new URL('../public/tesseract/langdata', import.meta.url).pathname,
  gzip: false,
  logger: (m) => {
    if (m.status && m.progress !== undefined && Math.round(m.progress * 10) * 10 >= 0) {
      // 只打印状态变化
    }
  },
});

console.log('worker loaded, recognizing...');
const { data } = await worker.recognize(png);
await worker.terminate();

console.log('--- OCR TEXT ---');
console.log(data.text);
console.log('----------------');

// 用与 src/lib/labelParser.ts 相同的逐行宽松解析验证
const lines = data.text.split(/\n+/).map((l) => l.replace(/\s+/g, '')).filter(Boolean);
const firstNum = (s) => {
  const m = /([0-9]+(?:\.[0-9]+)?)/.exec(s);
  return m ? parseFloat(m[1]) : null;
};
const out = {};
for (const line of lines) {
  if (/能量/.test(line)) out.energyKj = firstNum(line.replace(/能量/, ''));
  else if (/蛋白质?/.test(line) && out.proteinG == null) out.proteinG = firstNum(line.replace(/蛋白质?/, ''));
  else if (/脂肪/.test(line) && out.fatG == null) out.fatG = firstNum(line.replace(/脂肪/, ''));
  else if (/碳水/.test(line) && out.carbohydrateG == null) out.carbohydrateG = firstNum(line.replace(/碳水(?:化合物)?/, ''));
  else if ((/^钠/.test(line) || /钠[0-9]/.test(line)) && out.sodiumMg == null) out.sodiumMg = firstNum(line.replace(/钠/, ''));
}
console.log('parsed:', out);
console.log('has 苯甲酸钠:', data.text.includes('苯甲酸钠'));
