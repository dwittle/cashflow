import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { httpApi } from './httpApi';

if (!window.electron) {
  window.electron = httpApi;
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
