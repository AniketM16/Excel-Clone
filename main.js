//const { app, BrowserWindow } = require('electron')
const electron= require ('electron');
const app= electron.app;
const BrowserWindow=electron.BrowserWindow;
const ejs=require('ejs-electron');
function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    // to add node functionalities to browser/app
    webPreferences: {
        nodeIntegration:true,
        enableRemoteModule:true,
        contextIsolation:false,
    }
  })

  win.loadFile('index.ejs').then(()=>{
    win.webContents.openDevTools();
    win.maximize();
  })
}

app.whenReady().then(() => {
  createWindow()






//mac
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})