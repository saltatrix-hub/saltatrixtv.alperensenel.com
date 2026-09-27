const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('node:path')

app.setName('Saltatrix TV')

let mainWindow
let updateState = { status: 'idle' }
let updaterInitialized = false

function publishUpdateState(next) {
  updateState = { ...updateState, ...next }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('updater:status', updateState)
}

function initializeUpdater() {
  if (updaterInitialized || !app.isPackaged) {
    if (!app.isPackaged) publishUpdateState({ status: 'development' })
    return
  }
  updaterInitialized = true
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => publishUpdateState({ status: 'checking' }))
  autoUpdater.on('update-available', (info) => publishUpdateState({ status: 'available', version: info.version, percent: 0 }))
  autoUpdater.on('update-not-available', (info) => publishUpdateState({ status: 'current', version: info.version, percent: 100 }))
  autoUpdater.on('download-progress', (progress) => publishUpdateState({ status: 'downloading', percent: progress.percent }))
  autoUpdater.on('update-downloaded', (info) => publishUpdateState({ status: 'ready', version: info.version, percent: 100 }))
  autoUpdater.on('error', (error) => publishUpdateState({ status: 'error', message: error?.message || 'Güncelleme denetlenemedi.' }))

  setTimeout(() => autoUpdater.checkForUpdates().catch(() => undefined), 3500)
  const interval = setInterval(() => autoUpdater.checkForUpdates().catch(() => undefined), 4 * 60 * 60 * 1000)
  interval.unref()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#08090d',
    autoHideMenuBar: true,
    title: 'Saltatrix TV',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // IPTV sağlayıcıları çoğunlukla tarayıcı CORS başlığı sunmaz.
      // Uygulama yalnızca paketlenmiş yerel arayüzü yüklediği için masaüstünde
      // medya ve liste isteklerine izin verirken Node erişimini kapalı tutuyoruz.
      webSecurity: false,
    },
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault()
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.once('did-finish-load', initializeUpdater)
}

ipcMain.handle('updater:get-state', () => updateState)
ipcMain.handle('updater:check', async () => {
  if (!app.isPackaged) return { status: 'development' }
  await autoUpdater.checkForUpdates()
  return updateState
})
ipcMain.handle('updater:restart-and-install', () => {
  if (updateState.status === 'ready') autoUpdater.quitAndInstall(false, true)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
