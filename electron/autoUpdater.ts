import { autoUpdater } from "electron-updater";
import { app } from "electron";

// 服务器静态文件地址，文章后面附上ng配置及需要上传的文件
const updateUrl = "http://139.180.197.31:3001/update";

// 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
export const updateHandle = (win:any)=> {
  let message = {
    error: "检查更新出错",
    checking: "正在检查更新……",
    updateAva: "检测到新版本，是否进行更新……",
    updateNotAva: "现在使用的就是最新版本，不用更新",
  };
  // 设置是否自动下载，默认是true,当点击检测到新版本时，会自动下载安装包，所以设置为false
  autoUpdater.autoDownload = false;
  // autoUpdater.forceDevUpdateConfig = true
  // 设置服务器更新地址
  autoUpdater.setFeedURL({
    provider: "generic",
    url: updateUrl,
  });
//   if (isDevelopment) {
//     autoUpdater.updateConfigPath = path.join(__dirname, '../dev-app-update.yml')
// }
  autoUpdater.on("error", function (err: any) {
    sendUpdateMessage(win, "error", err || message.error);
  });
  autoUpdater.on("checking-for-update", function () {
    console.log('checking-for-update: ', message.checking);
    sendUpdateMessage(win, "checking-for-update", message.checking);
  });
  // 版本检测结束，准备更新
  autoUpdater.on("update-available", function () {
    console.log('update-available');
    sendUpdateMessage(win, "update-available", message.updateAva);
  });
  autoUpdater.on("update-not-available", function () {
    sendUpdateMessage(win, "update-not-available", message.updateNotAva);
  });
  // 更新下载进度事件
  autoUpdater.on("download-progress", function (progressObj: any) {
    sendUpdateMessage(win, "download-progress", progressObj.percent);
  });
  // 下载完成
  autoUpdater.on(
    "update-downloaded",
    function () {
      sendUpdateMessage(win, "update-downloaded", "下载完成");
      // 加载更新程序
      autoUpdater.quitAndInstall();
      // 关闭当前electron
      app.quit();
    }
  );

  // 通过main进程发送事件给renderer进程，提示更新信息
  function sendUpdateMessage(win:any, name: any, text: any) {
    // 窗口对象自行修改
    win.webContents.send("updateMessage", { name, text });

    
  }
}

// //  下载完成，退出且重新安装
// ipcMain.on("updateSuccess", () => {
//   // 加载更新程序
//   autoUpdater.quitAndInstall();
//   // 关闭当前electron
//   app.quit();
// });

// 触发更新检测
export const checkForUpdates = ()=>{
  autoUpdater.checkForUpdates();
}
//  开始下载，通过渲染进程发起
export const downloadUpdate = ()=>{
  autoUpdater.downloadUpdate();
}
export default updateHandle;
