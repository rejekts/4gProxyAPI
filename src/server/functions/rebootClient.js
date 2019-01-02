const childExec = require("child_process").exec;
const util = require("util");
const exec = util.promisify(childExec);

//function to reboot client machine
const rebootClient = async function(host) {
  const wrapper = function() {
    return exec(`ssh pi@${host} "sudo reboot"`)
      .then(rebootRes => {
        console.log(
          `Successfully rebooting the machine @ ${host} => `,
          rebootRes.stdout
        );
        return rebootRes.stdout;
      })
      .catch(err => {
        if (err) {
          console.log(
            "Error in the rebootClient method. Error details: cmd => ",
            err.cmd,
            "; err => ",
            err.stderr
          );
          throw err;
        }
      });
  };
  return await wrapper();
};

module.exports = rebootClient;
