const childExec = require("child_process").exec;
const util = require("util");
const exec = util.promisify(childExec);

//dig +short myip.opendns.com @resolver1.opendns.com || sleep 5; dig +short myip.opendns.com @resolver1.opendns.com
//function for grabbing proxy server external IP
const grabClientIP = async function(host) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(`ssh pi@${host} "curl api.ipify.org -s -S;"`)
      .then(returnedIP => {
        timesCalled++;
        return returnedIP.stdout.trim();
      })
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the grabClientIP method. Calling recursively now for the ${timesCalled}th time. Error details: cmd => `,
            err.cmd,
            "; err => ",
            err.stderr
          );
          if (timesCalled >= 1) {
            throw err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

module.exports = grabClientIP;
