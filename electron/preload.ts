import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../src/types';

const electronAPI: ElectronAPI = {
  income: {
    getAll: () => ipcRenderer.invoke('income:getAll'),
    create: (income) => ipcRenderer.invoke('income:create', income),
    update: (id, income) => ipcRenderer.invoke('income:update', id, income),
    delete: (id) => ipcRenderer.invoke('income:delete', id)
  },
  bills: {
    getAll: () => ipcRenderer.invoke('bills:getAll'),
    create: (bill) => ipcRenderer.invoke('bills:create', bill),
    update: (id, bill) => ipcRenderer.invoke('bills:update', id, bill),
    delete: (id) => ipcRenderer.invoke('bills:delete', id)
  },
  adjustments: {
    getAll: () => ipcRenderer.invoke('adjustments:getAll'),
    create: (adjustment) => ipcRenderer.invoke('adjustments:create', adjustment),
    delete: (id) => ipcRenderer.invoke('adjustments:delete', id)
  }
};

contextBridge.exposeInMainWorld('electron', electronAPI);
