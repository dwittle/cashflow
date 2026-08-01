// Run as Administrator: node service/uninstall.js
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'CashFlow Tracker',
  script: path.join(__dirname, '..', 'dist', 'server', 'server', 'server.js')
});

svc.on('uninstall', () => {
  console.log('CashFlow Tracker service removed.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

svc.uninstall();
