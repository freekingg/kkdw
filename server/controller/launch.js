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
  return new Promise(async (resolve, reject) => {
    try {
      puppeteer.use(
        UserPreferencesPlugin({
          userPrefs: {
            download: {
              prompt_for_download: false,
              open_pdf_in_system_reader: true,
              default_directory: downloadPath,
            },
            plugins: {
              always_open_pdf_externally: true,
            },
          },
        })
      );
      let chromeExtPath = path.join(process.cwd(),'../../chrome-ext')
      if(process.env.NODE_ENV === 'development'){
        chromeExtPath = path.join(__dirname,'../../chrome-ext')
      } else {
        chromeExtPath = path.join(process.cwd(),'/resources/chrome-ext')
      }
      console.log('chromeExtPath: ', chromeExtPath);
      const customArgs = [
        `--start-maximized`,
        `--disable-infobars`,
        "--no-sandbox",
        "--no-default-browser-check",
        `--load-extension=${chromeExtPath}`,
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
      let remoteDir = `D:\\download\\${uname}\\file\\`
      // let remoteDir = `D:\\test2\\test3`
      try {
        // 检查远程目录是否存在
        let remoteDirRes = await sftp.exists(remoteDir)
        if(!remoteDirRes){
          try {
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

      const browser = await puppeteer.launch({
        headless: false,
        executablePath:
          chromePath ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        ignoreDefaultArgs: [
          "--disable-extensions",
          "--enable-automation",
          "--enable-blink-features=IdleDetection",
        ],
        args: customArgs,
      });
      browser.on('disconnected',(e)=>{
        console.log('close');
      })
      const page = await browser.newPage();
      await page.goto(websiteUrl);

      const watcher = chokidar.watch(downloadPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        ignoreInitial:true,
        persistent: true
      });
     
      const handleSftp = (sftp1)=>{
        sftp1.on('close',()=>{
          sftp1.end()
          console.log('sftp close');
          sftpConnected = false
        })
      }
      handleSftp(sftp)
      
      watcher
        .on('add', p => {
          let pathObj = path.parse(p)
          let localData = fs.createReadStream(p);
          let remoteData = remoteDir + pathObj.base
          if(sftpConnected){
            SSH.putFile(sftp,localData,remoteData).then((result) => {
              console.log(`${pathObj.base} 上传成功`);
              DB.insert({name:'logInfo',value:{uname,message:`${pathObj.base} 上传成功`}});
            }).catch(async (err) => {
              console.log('err: ', err);
              DB.insert({name:'logInfo',value:{uname,message:`${pathObj.base} 上传失败`}});
            });
          }else{
            SSH.connect(sshInfo).then((sftp2) => {
              sftp = sftp2
              SSH.putFile(sftp,localData,remoteData).then((result) => {
                console.log(`${pathObj.base} 上传成功`);
              }).catch(async (err) => {
                console.log('err: ', err);
              });
              handleSftp(sftp)
            }).catch((err) => {
              browser.close()
            });
          }
        })

      // 检查浏览器是否关闭
      checkBrowserTimer = setInterval(()=>{
        browser.pages().then((result) => {
          // console.log(`检查${uname}的任务浏览器是否关闭，${result.length}`);
          if(!result.length){
            console.log('浏览器关闭了');
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
