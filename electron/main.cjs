const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

app.setName('Saltatrix TV')

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#08090d',
    autoHideMenuBar: true,
    title: 'Saltatrix TV',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // IPTV sağlayıcıları çoğunlukla tarayıcı CORS başlığı sunmaz.
      // Uygulama yalnızca paketlenmiş yerel arayüzü yüklediği için masaüstünde
      // medya ve liste isteklerine izin verirken Node erişimini kapalı tutuyoruz.
      webSecurity: false,
    },
  })

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
