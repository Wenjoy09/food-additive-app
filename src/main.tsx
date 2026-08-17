import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA：注册 Service Worker，支持离线使用与「添加到主屏幕」
// 以当前目录为 scope，兼容部署在子路径（如 GitHub Pages 的 /<repo>/）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // 注册失败不影响应用使用
    });
  });
}
