import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, incomeOps, billOps, adjustmentOps, closeDatabase } from './database';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIPC() {
  // Income handlers
  ipcMain.handle('income:getAll', () => incomeOps.getAll());
  ipcMain.handle('income:create', (_, income) => incomeOps.create(income));
  ipcMain.handle('income:update', (_, id, income) => incomeOps.update(id, income));
  ipcMain.handle('income:delete', (_, id) => incomeOps.delete(id));

  // Bill handlers
  ipcMain.handle('bills:getAll', () => billOps.getAll());
  ipcMain.handle('bills:create', (_, bill) => billOps.create(bill));
  ipcMain.handle('bills:update', (_, id, bill) => billOps.update(id, bill));
  ipcMain.handle('bills:delete', (_, id) => billOps.delete(id));

  // Adjustment handlers
  ipcMain.handle('adjustments:getAll', () => adjustmentOps.getAll());
  ipcMain.handle('adjustments:create', (_, adjustment) => adjustmentOps.create(adjustment));
  ipcMain.handle('adjustments:delete', (_, id) => adjustmentOps.delete(id));
}
