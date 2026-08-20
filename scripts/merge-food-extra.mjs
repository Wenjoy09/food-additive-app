// 合并脚本：把 food-extra-1/2.json 的补全营养素 + 功效/建议/误区 写入 foods.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const target = `${here}../src/data/foods.json`;
const EXTRA_1 = JSON.parse(readFileSync(`${here}food-extra-1.json`, 'utf8'));
const EXTRA_2 = JSON.parse(readFileSync(`${here}food-extra-2.json`, 'utf8'));
const ALL = { ...EXTRA_1, ...EXTRA_2 };

const foods = JSON.parse(readFileSync(target, 'utf8'));
let missing = [];
for (const f of foods) {
  const e = ALL[f.id];
  if (!e) { missing.push(f.id); continue; }
  f.nutrients = e.n.map(([name, amount, unit]) => ({ name, amount, unit }));
  f.benefits = e.b.map(([name, desc]) => ({ name, desc }));
  f.advice = { cooking: e.a.c ?? [], pairing: e.a.p ?? [], caution: e.a.w ?? [] };
  f.myths = e.m.map(([q, a]) => ({ q, a }));
}
if (missing.length) console.warn('missing extra data for:', missing);
writeFileSync(target, JSON.stringify(foods, null, 2) + '\n');
console.log('foods enriched:', foods.filter((f) => f.benefits).length, '/', foods.length);
