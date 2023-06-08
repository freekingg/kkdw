const Client = require('ssh2-sftp-client')

const connect = (config) => {
  return new Promise((resolve, reject) => {
    let sftp = new Client();
    sftp
      .connect(config)
      .then((res) => {
        resolve(sftp);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const getSftp = (config) => {
  return new Promise((resolve, reject) => {
    // console.log('sftp: ', sftp);
    // resolve(sftp);
  });
};

const putFile = (sftp,data,remote) => {
  return new Promise((resolve, reject) => {
      sftp.put(data, remote).then((result) => {
        resolve(sftp);
      }).catch(async (err) => {
        console.log('上传失败: ', err);
        // if(err.message.indexOf('No SFTP connection available') > -1){
        //   let newSftp = await connect(sshInfo)
        //   putFile(newSftp,data,remote)
        //   return resolve(newSftp);
        // }
        reject(err)
      });
  });
};

const test = (config) => {
  return new Promise((resolve, reject) => {
    let sftp = new Client();
    sftp
      .connect(config)
      .then((res) => {
        sftp.end()
        resolve(sftp);
      })
      .catch((err) => {
        reject(err.message);
      });
  });
};


module.exports = { connect, getSftp, putFile, test };
