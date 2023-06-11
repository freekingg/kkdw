const Config = require("../config");
const puppeteer = require("puppeteer-extra");
const path = require('path')
const fs = require('fs-extra')
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const UserPreferencesPlugin = require("puppeteer-extra-plugin-user-preferences");
const chokidar = require('chokidar');
const SSH = require('../../ssh')
const DB =  require('../../db/index.js')
puppeteer.use(StealthPlugin());
const launch = (ctx) => {
  
  const body = ctx.request.body;
  console.log("body: ", body);
  let checkBrowserTimer = null
  const { uname, chromePath, downloadPath, url,sshInfo } = body;
  const websiteUrl = url || Config.pnb;
  const _downloadPath = path.normalize(downloadPath)
  console.log('_downloadPath: ', _downloadPath);
  return new Promise(async (resolve, reject) => {
    try {
      puppeteer.use(
        UserPreferencesPlugin({
          userPrefs: {
            download: {
              prompt_for_download: false,
              open_pdf_in_system_reader: true,
              default_directory: _downloadPath,
            },
            plugins: {
              always_open_pdf_externally: true,
            },
          },
        })
      );
      let chromeExtPath = path.join(process.cwd(),'../../chrome-ext/kkExt')
      let chromeExtPathRightClick = ''
      if(process.env.NODE_ENV === 'development'){
        chromeExtPath = path.join(__dirname,'../../chrome-ext/kkExt')
        chromeExtPathRightClick = path.join(__dirname,'../../chrome-ext/rightClick')
      } else {
        chromeExtPath = path.join(process.cwd(),'/resources/chrome-ext/kkExt')
        chromeExtPathRightClick = path.join(process.cwd(),'/resources/chrome-ext/rightClick')
      }
      console.log('chromeExtPath: ', chromeExtPath);
      const customArgs = [
        `--start-maximized`,
        `--disable-infobars`,
        "--no-default-browser-check",
        `--load-extension=${chromeExtPath},${chromeExtPathRightClick}`,
      ];


      let sftp = null
      let sftpConnected = false
      try {
        sftp = await SSH.connect(sshInfo)
        sftpConnected = true
      } catch (error) {
        console.log('远程连接失败 ', error);
        return resolve({ code: -1, message: '远程连接失败,请检查连接信息' });
      }
      // 远程目录
      let remoteDir = path.normalize(`D:\\download\\${uname}\\file\\`)
      console.log('remoteDir: ', remoteDir);
      try {
        // 检查远程目录是否存在
        let remoteDirRes = await sftp.exists(remoteDir)
        if(!remoteDirRes){
          try {
            await sftp.mkdir(path.normalize(`D:\\download\\${uname}`), true);
            await sftp.mkdir(remoteDir, true);
            DB.insert({name:'logInfo',value:{uname, message:`${remoteDir}不存在，在远程创建此目录`}});
          } catch (error) {
            DB.insert({name:'logInfo',value:{uname, message:`${remoteDir}目录创建失败, ${error.message}`}});
          }
          let remoteDirRes2 = await sftp.exists(remoteDir)
          if(!remoteDirRes2){
            return resolve({ code: -1, message: `${remoteDir}目录在远程服务器不存在，请先在服务器创建此目录` });
          }
        }
      } catch (error) {
        return resolve({ code: -1, message: error.message });
      }

      let disconnected = false
      const browser = await puppeteer.launch({
        headless: false,
        executablePath:
          chromePath ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        ignoreDefaultArgs: [
          "--disable-extensions",
          "--enable-automation",
        ],
        args: customArgs,
      });
      // 存储节点以便能重新连接到 Chromium  
      const browserWSEndpoint = browser.wsEndpoint();  

      browser.on('disconnected',(e)=>{
        console.log('browser close');
        disconnected = true
      })
      const page = await browser.newPage();
      await page.goto(websiteUrl,{
        waitUntil:'networkidle2',
        timeout:60000
      });

      const watcher = chokidar.watch(downloadPath, {
        ignored: /(\.(tmp|png|jpe?g|crdownload)$)|(^[\~\.\.com])/i, // ignore dotfiles
        ignoreInitial:true,
        persistent: true
      });
      DB.insert({name:'logInfo',value:{uname, message:`本地${downloadPath}文件与远程同步已开启`}});
      const handleSftp = (sftp1)=>{
        sftp1.on('close',()=>{
          console.log('sftp close');
          // sftp1.end()
          sftpConnected = false
        })
      }
      handleSftp(sftp)
      
      watcher
        .on('add', p => {
          const reg = /\.(txt|pdf|xlsx|xls)$/;
          if(!reg.test(p)) return false
          let pathObj = path.parse(p)
          let localData = fs.createReadStream(p);
          let remoteData = remoteDir + pathObj.base
          if(sftpConnected){
            SSH.putFile(sftp,localData,remoteData).then((result) => {
              console.log(`${pathObj.base} 上传成功`);
              DB.insert({name:'logInfo',value:{uname,message:`${pathObj.base} 上传成功`}});
            }).catch(async (err) => {
              console.log('err: ', err);
              DB.insert({name:'logInfo',value:{uname,message:`${pathObj.base} 上传失败, ${err.message}`}});
            });
          }else{
            console.log('ssh 已断开连接，重连后上传');
            sftp.end()
            SSH.connect(sshInfo).then((sftp2) => {
              sftpConnected = true
              sftp = sftp2
              SSH.putFile(sftp,localData,remoteData).then((result) => {
                console.log(`${pathObj.base} ssh重连后上传成功`);
              }).catch(async (err) => {
                console.log('ssh重连后上传失败  ', err);
                DB.insert({name:'logInfo',value:{uname,message:`${pathObj.base} ssh重连后上传失败, ${err.message}`}});
              });
              handleSftp(sftp)
            }).catch((err) => {
              browser.close()
            });
          }
        })

      // 检查浏览器是否关闭
      checkBrowserTimer = setInterval(async ()=>{
        let newBrowser = browser
        if(disconnected){
          console.log(`${uname}的任务浏览器已断开链接，重新连接`);
          newBrowser = await puppeteer.connect({browserWSEndpoint});
          disconnected = false
        }
        newBrowser.pages().then((result) => {
          console.log(`检查${uname}的任务浏览器是否关闭，${result.length}`);
          if(!result.length){
            console.log('浏览器关闭了');
            DB.insert({name:'logInfo',value:{uname,message:`${uname} 的浏览器已关闭`}});
            clearInterval(checkBrowserTimer)
            sftp.end()
            watcher.close().then(() => console.log('watcher closed'));
          }
        }).catch((err) => {
          console.log('err: ', err);
        });
      },3000)
      resolve({ code: 0, message: "ok" });
    } catch (error) {
      console.log("error: ", error.message);
      resolve({ code: -1, message: error.message });
    }
  });
};

module.exports = { launch };
