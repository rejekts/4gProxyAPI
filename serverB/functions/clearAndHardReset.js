const childExec = require('child_process').exec;
const util = require('util');

const exec = util.promisify(childExec);

// dig +short myip.opendns.com @resolver1.opendns.com || sleep 5; dig +short myip.opendns.com @resolver1.opendns.com
// function for grabbing proxy server external IP
const clearAndHardReset = async function(host) {
  return new Promise((resolve, reject) =>
    exec(`ssh pi@${host} "sudo /usr/local/bin/clearAndHardReset.sh"`)
      .then(data => {
        console.log(
          `Proxy Server Clearing Cache, Rebuilding and Rebooting. Connection to ${host}: ${
            data.stdout
          }`
        );
      })
      .catch(err => {
        console.log('err in the catch for clearAndHardReset.js => ', err);
      })
  );
};

module.exports = clearAndHardReset;
