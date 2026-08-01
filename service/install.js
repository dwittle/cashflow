// Run as Administrator: node service/install.js
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'CashFlow Tracker',
  description: 'CashFlow Tracker - Personal Finance Web Server (http://localhost:3001)',
  script: path.join(__dirname, '..', 'dist', 'server', 'server', 'server.js'),
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT', value: '3001' }
  ]
});

svc.on('install', () => {
  svc.start();
  console.log('');
  console.log('CashFlow Tracker service installed and started.');
  console.log('Access the app at: http://localhost:3001');
  console.log('');
  console.log('To uninstall: node service/uninstall.js (as Administrator)');
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed. Uninstall first with: node service/uninstall.js');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

svc.install();
