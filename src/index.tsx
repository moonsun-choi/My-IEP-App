import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';


const updateSW = registerSW({
  onNeedRefresh() {
    console.log("새로운 콘텐츠가 있습니다. 새로고침하면 적용됩니다.");
  },
  onOfflineReady() {
    console.log("앱을 오프라인에서 사용할 준비가 되었습니다.");
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);