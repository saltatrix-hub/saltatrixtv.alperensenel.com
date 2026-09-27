const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('saltatrixDesktop', {
  window: {
    setFullscreen: (enabled) => ipcRenderer.invoke('window:set-fullscreen', enabled),
  },
  updater: {
    getState: () => ipcRenderer.invoke('updater:get-state'),
    check: () => ipcRenderer.invoke('updater:check'),
    restartAndInstall: () => ipcRenderer.invoke('updater:restart-and-install'),
    onStatus: (callback) => {
      const handler = (_event, state) => callback(state)
      ipcRenderer.on('updater:status', handler)
      return () => ipcRenderer.removeListener('updater:status', handler)
    },
  },
})
