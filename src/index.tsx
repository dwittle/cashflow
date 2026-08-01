import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { mockElectronAPI } from './mockElectronAPI';

// Use mock API if window.electron is not available (browser mode)
if (!window.electron) {
  window.electron = mockElectronAPI;
  console.log('Running in browser mode with mock Electron API');
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
