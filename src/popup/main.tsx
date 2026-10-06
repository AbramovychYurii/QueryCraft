import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Bundled fonts: MV3's content security policy blocks font CDNs.
import '@fontsource-variable/inter';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import '@/styles/global.css';

// Chrome sizes the popup from the document box and can ignore CSS height in
// some cases, so the dimensions are pinned at runtime as well.
const POPUP_WIDTH = '380px';
const POPUP_HEIGHT = '600px';
document.documentElement.style.width = POPUP_WIDTH;
document.documentElement.style.height = POPUP_HEIGHT;
document.body.style.width = POPUP_WIDTH;
document.body.style.height = POPUP_HEIGHT;
document.body.style.minHeight = POPUP_HEIGHT;

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in popup.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
