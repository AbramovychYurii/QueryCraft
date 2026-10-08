import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { syncPopupHeight } from './popupHeight';
// Bundled fonts: MV3's content security policy blocks font CDNs.
import '@fontsource-variable/inter';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import '@/styles/global.css';

// Chrome sizes the popup from the document box and can ignore CSS width in
// some cases, so the width is pinned at runtime as well. The height follows
// the content (see syncPopupHeight below).
const POPUP_WIDTH = '380px';
document.documentElement.style.width = POPUP_WIDTH;
document.body.style.width = POPUP_WIDTH;

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in popup.html');
}

// #root holds only the app container, so its box is the container's natural
// height — including the min-height an open panel asks for.
syncPopupHeight(rootEl);

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
