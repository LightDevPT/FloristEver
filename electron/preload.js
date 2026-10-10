const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floristDesktop', Object.freeze({
  displayMode: Object.freeze({
    getMode: () => ipcRenderer.invoke('display-mode:get'),
    setMode: ({ mode }) => ipcRenderer.invoke('display-mode:set', mode)
  })
}));
