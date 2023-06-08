import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs-extra";
import { machineIdSync } from "node-machine-id";
import { fork } from "child_process";
import { kill } from 'cross-port-killer';
const DB = require('../db/index.js')
// import SSH from '../ssh/index'

kill(3005).then(pids => {
  console.log(pids)
})
// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │

const DIST = path.join(__dirname, "../dist");
const PUBLIC = app.isPackaged ? DIST : path.join(DIST, "../public");
// process.env.DIST = path.join(__dirname, "../dist");
// process.env.PUBLIC = app.isPackaged
//   ? process.env.DIST
//   : path.join(process.env.DIST, "../public");

let serverProcess: any = null;
function createServerProcess() {
  // 开发环境
  serverProcess = fork(path.join(__dirname, "../server/app.js"));
  serverProcess.on("close", (code: any) => {
    console.log("koa子线程已经退出", code);
  });
}

process.on("exit", function () {
  if (serverProcess) {
    try {
      process.kill(serverProcess.pid);
    } catch (error) {
      console.log("kill error on process exit: ", error);
      kill(3005).then(pids => {
        console.log(pids)
      })
    }
  }
})
let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  createServerProcess();
  win = new BrowserWindow({
    icon: path.join(PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    width:1000,
    height:800
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  win = null;
  if (serverProcess) {
    try {
      process.kill(serverProcess.pid);
    } catch (error) {
      console.log("kill error: ", error);
      kill(3005).then(pids => {
        console.log(pids)
      })
    }
  }
});

app.whenReady().then(() => {
  // console.log(app.getVersion());
   // 设备码
  ipcMain.handle("getMachineId", () => {
    return machineIdSync(true)
  });

   // 获取软件信息
   ipcMain.handle("getDeviceInfo", () => {
    const packages = require('../package.json')
    const {platform} = require('process')
    let interfaces = require('os').networkInterfaces();
    let ip = ''
    for (let devName in interfaces) {
      let iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
          let alias = iface[i];
          if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
            ip=alias.address
          }
      }
  }
  
    return {
      version: packages.version,
      name: packages.name,
      platform,
      tempPath: app.getPath('temp'),
      downloadsPath: app.getPath('downloads'),
      desktopPath: app.getPath('desktop'),
      ip
    }
  });

  ipcMain.handle('checkDir', async (_event, path) => {
    let result = false
    try {
      await fs.ensureDirSync(path)
      result = true
    } catch (err) {
      console.error(err)
      result = false
    }
    return result
  })

  ipcMain.handle('db:findOne', async (_event, query) => {
    let result = await DB.findOne(query)
    return result
  })

  ipcMain.handle('db:findAll', async (_event, query) => {
    let result = await DB.findAll(query)
    return result
  })

  ipcMain.handle("db:insert", async (_event, data) => {
    let result = false
    try {
      result = await DB.insert(data);
    } catch (error) {
      console.log('error: ', error);
    }
    return result
  });

  ipcMain.handle("db:updateOne", async (_event, query, data) => {
    let result=''
    try {
      result = await DB.updateOne(query, data)
    } catch (error) {
      console.log('error: ', error);
    }
    return result;
  });

  ipcMain.handle('checkSsh', async (_event, data) => {
    let result = {}
    let SSH = require('../ssh/index.js')
    try {
      await SSH.test(data)
      result = {
        status:true,
        message:''
      }
    } catch (err) {
      result = {
        status:false,
        message:err
      }
    }
    return result
  })

  createWindow();
});
