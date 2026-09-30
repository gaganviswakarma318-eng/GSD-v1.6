const { app, BrowserWindow } = require("electron");

let server;

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadURL("http://localhost:3000");
}

app.whenReady().then(() => {
  server = require("../backend/server");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (server?.close) server.close();
  if (process.platform !== "darwin") app.quit();
});