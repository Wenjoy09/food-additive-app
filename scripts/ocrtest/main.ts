import { recognizeText } from '@/lib/offlineOcr';
import { preprocessForOcr } from '@/lib/imagePreprocess';

// 模拟用户照片特征：粉色渐变背景 + 红棕色小字（布丁标签）
function drawLabel(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 700;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 900, 700);
  grad.addColorStop(0, '#f6d7d7');
  grad.addColorStop(0.5, '#fbecec');
  grad.addColorStop(1, '#f2c9cc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 700);
  ctx.fillStyle = '#a03a2e';
  ctx.font = '30px sans-serif';
  ctx.fillText('红颜草莓布丁', 60, 90);
  ctx.font = '26px sans-serif';
  ctx.fillText('产品类型:含乳果冻 配料:生牛乳(添加量≥80%)、', 60, 170);
  ctx.fillText('水、稀奶油、红颜草莓果酱(添加量≥5%)、白砂糖、', 60, 220);
  ctx.fillText('明胶、琼脂、单，双甘油脂肪酸酯、β-胡萝卜素。', 60, 270);
  ctx.fillText('营养成分表', 60, 350);
  ctx.fillText('能量 385千焦', 60, 410);
  ctx.fillText('蛋白质 3.2克', 60, 460);
  ctx.fillText('脂肪 4.5克', 60, 510);
  ctx.fillText('碳水化合物 12.0克', 60, 560);
  ctx.fillText('钠 55毫克', 60, 610);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function run() {
  const dataUrl = drawLabel();
  const base64 = dataUrl.split(',')[1];
  try {
    const canvas = await preprocessForOcr(base64, 'image/jpeg');
    const text = await recognizeText(canvas, (s, p) => console.log('[progress]', s, p));
    console.log('[ocr-result]', JSON.stringify(text));
    document.body.innerText = 'OK|' + text.replace(/\n/g, '~');
  } catch (e) {
    const msg = e instanceof Error ? `${e.message} | ${e.stack}` : String(e);
    console.log('[ocr-error]', msg);
    document.body.innerText = 'ERR|' + msg;
  }
}

run();
