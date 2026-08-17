# 食品健康查 🍏

一款运行在**手机浏览器**里的食品健康查询工具（H5 应用）：查添加剂、拍配料表、算热量。

## 功能

| 功能 | 说明 |
|---|---|
| 📖 添加剂库 | 内置 **121 种**中国常见食品添加剂数据库（离线可用）：支持按名称 / 别名 / INS 号搜索，按分类筛选，查看每种添加剂的**作用**与**潜在危害** |
| 🔍 配料扫描 | 上传食品包装照片，Claude 视觉识别**配料表 + 营养成分表**：自动关联本地添加剂库，并依据 **GB 28050-2011** 阈值给出健康标签（低钠 / 低脂 / 低糖 / 高蛋白 / 高脂 / 高糖 / 高钠） |
| 🔥 热量计算 | 拍照识别每 100g 热量（自动完成 kJ → 千卡换算），输入总克数即可算出**总热量**，并换算成≈几碗米饭 |

> 未配置 API Key 时，扫描与热量页提供**示例数据演示**，可以先体验完整流程。

## 技术栈

- **Vite + React 19 + TypeScript**，纯前端 H5，无后端服务器
- **@anthropic-ai/sdk**（官方 TypeScript SDK）调用 Claude 视觉识别
  - 结构化输出（`output_config` JSON Schema）+ 自适应思考（adaptive thinking）
  - 默认模型 `claude-opus-4-8`，可在设置页切换 `claude-sonnet-5` / `claude-haiku-4-5`
- 营养标签评估基于 **GB 28050-2011《预包装食品营养标签通则》**（客户端计算，不依赖网络）

## 快速开始

```bash
npm install
npm run dev        # 开发模式，默认 http://localhost:5173
```

生产构建：

```bash
npm run build      # 输出到 dist/
npm run preview    # 本地预览构建产物
```

手机体验：开发模式下用 `npm run dev -- --host` 启动，手机浏览器访问局域网地址即可；或将 `dist/` 部署到任意静态托管（如 GitHub Pages / Vercel / Netlify），手机打开后「添加到主屏幕」即可像 App 一样使用。

## 安装到手机主屏幕（PWA）

本应用已内置 PWA 支持（manifest + 图标 + 离线缓存 Service Worker），安装后拥有独立图标、全屏运行，**无需 API Key 也能离线使用添加剂库和千焦换算**。

- **iPhone（Safari）**：打开应用地址 → 点底部分享按钮 → 「添加到主屏幕」
- **Android（Chrome）**：打开应用地址 → 右上角菜单 → 「添加到主屏幕」/「安装应用」

安装后从主屏幕图标启动，即为全屏 App 形态；首次打开过的页面资源会被缓存，之后离线也能打开。

## 配置识别服务（拍照识别需要，三选一）

应用内置三种真实拍照识别方案，在「设置」页切换：

| 服务商 | 说明 | 获取 Key |
|---|---|---|
| **通义千问**（默认） | 阿里云百炼，国内可用，通常有免费额度 | [bailian.console.aliyun.com](https://bailian.console.aliyun.com/) |
| **智谱 GLM** | `glm-4v-flash` 视觉模型免费 | [open.bigmodel.cn](https://open.bigmodel.cn/) |
| **Claude** | 识别最准，需海外支付方式 | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| 自定义 | 任意 OpenAI 兼容视觉接口 | — |

**完全免费、无需任何账号**：扫描/热量页还有「离线 OCR 识别」按钮，用浏览器本地的 tesseract.js（中英文引擎已内置）识别营养表数字与配料文字，准确率低于大模型但零成本、可离线。

- API Key 仅保存在你的浏览器 localStorage，不会上传到任何服务器
- 图片识别请求由浏览器**直接**发送给所选服务商
- 添加剂数据库与营养评估完全在本地运行

## 免责声明

本工具提供的添加剂危害说明与健康标签仅供日常参考，**不构成医学或营养建议**；添加剂在国标限量内合规使用通常是安全的，如有过敏史或特殊健康状况请咨询医生或营养师。

## 项目结构

```
src/
├── data/additives.json        # 121 条添加剂数据库
├── data/sampleResults.ts      # 无 Key 时的示例数据
├── lib/
│   ├── additives.ts           # 搜索 + 模糊匹配本地库
│   ├── claudeApi.ts           # Claude 视觉识别封装
│   ├── nutritionEvaluator.ts  # GB 28050 标签计算 + 热量换算
│   └── types.ts
├── pages/                     # 四个 Tab：添加剂库/扫描/热量/设置
├── components/                # 详情、标签、上传、结果展示等
└── App.tsx                    # Tab 导航外壳
```
