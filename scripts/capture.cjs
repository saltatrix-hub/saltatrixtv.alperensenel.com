const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    backgroundColor: '#08090d',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  await window.loadFile(path.join(root, 'dist', 'index.html'))
  await new Promise((resolve) => setTimeout(resolve, 3500))
  const image = await window.webContents.capturePage()
  const outputDir = path.join(root, 'artifacts')
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'saltatrix-tv-preview.png'), image.toPNG())
  fs.writeFileSync(path.join(root, 'public', 'og.png'), image.resize({ width: 1200, height: 630 }).toPNG())
  app.quit()
})
