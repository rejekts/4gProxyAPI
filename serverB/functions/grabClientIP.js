const childExec = require("child_process").exec;
const util = require("util");
const exec = util.promisify(childExec);

//dig +short myip.opendns.com @resolver1.opendns.com || sleep 5; dig +short myip.opendns.com @resolver1.opendns.com
//function for grabbing proxy server external IP
const grabClientIP = async function(host) {
  return new Promise((resolve, reject) => {
    return exec(`ssh pi@${host} "curl api.ipify.org -s -S;"`)
      .then(returnedIP => {
        resolve(returnedIP.stdout.trim());
      })
      .catch(err => {
        if (err) {
          console.log(
            `Error in the grabClientIP method. Error details: cmd => `,
            err.cmd,
            "; err => ",
            err.stderr
          );
          reject(err);
        }
      });
  });
};

module.exports = grabClientIP;
