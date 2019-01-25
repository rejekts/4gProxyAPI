const childExec = require('child_process').exec;
const util = require('util');

const exec = util.promisify(childExec);

// function to reset ip on client machine by cycling the interface down then up
const interfaceDownUp = async function(host, network) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(
      `ssh pi@${host} "sudo nmcli connection down ${network} && sleep 1; sudo nmcli connection up ${network} || sudo nmcli connection down ${network}; sleep 3 && sudo nmcli connection up ${network}"`
    )
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the interfaceDownUp method. Calling recursively now for the ${timesCalled}th time. Error details: cmd => `,
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

module.exports = interfaceDownUp;
