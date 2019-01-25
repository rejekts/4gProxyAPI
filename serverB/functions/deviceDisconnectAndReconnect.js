const childExec = require('child_process').exec;
const util = require('util');

const exec = util.promisify(childExec);

// function to reset ip on client machine by disconnecting the modem and reconnecting it
const deviceDisconnectAndReconnect = async function(host) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(
      `ssh pi@${host} "sudo nmcli device disconnect cdc-wdm0 && sleep 3 && sudo nmcli device connect cdc-wdm0 || sleep 1; sudo nmcli device disconnect cdc-wdm0; sleep 5; sudo nmcli device connect cdc-wdm0"`
    )
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the deviceDisconnectAndReconnect method. Calling recursively now for the ${timesCalled}th time. Error details: cmd => `,
            err.cmd,
            '; err => ',
            err.stderr
          );
          if (timesCalled >= 1) {
            return err;
          }
          return wrapper();
        }
      });
  };
  return await wrapper();
};

module.exports = deviceDisconnectAndReconnect;
