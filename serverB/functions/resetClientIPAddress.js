const express = require("express");
const bodyParser = require("body-parser");
const connectionUp = require("./connectionUp");
const grabClientIP = require("./grabClientIP");
const rebootClient = require("./rebootClient");
const interfaceDownUp = require("./interfaceDownUp");
const deviceDisconnectAndReconnect = require("./deviceDisconnectAndReconnect");

//function to run all the methods until ip is reset on client machine
const resetClientIPAddress = async function(host, network, oldIP) {
  return new Promise(async (resolve, reject) => {
    let timesWrapperCalled = 0;
    let timesConnectionUpCalled = 0;
    let timesInterfaceDownUpCalled = 0;
    let timesDeviceDisconnectAndReconnectCalled = 0;
    let timesRebootClientCalled = 0;
    let newIPTry1;
    let newIPTry2;
    let newIPTry3;

    const wrapper = async function() {
      timesWrapperCalled++;
      console.log("timesWrapperCalled => ", timesWrapperCalled);

      if (timesConnectionUpCalled === 0 && timesWrapperCalled === 1) {
        console.log("Running the connectionUp method");
        await connectionUp(host, network)
          .then(connectionUpResponse => {
            timesConnectionUpCalled++;
            console.log("connectionUpResponse => ", connectionUpResponse);
            let successfulConnectionActivationTry1 =
              connectionUpResponse.stdout.indexOf(
                "Connection successfully activated"
              ) >= 0
                ? true
                : false;

            if (successfulConnectionActivationTry1) {
              console.log(
                "successfulConnectionActivationTry1 - connectionUp => ",
                successfulConnectionActivationTry1
              );
              setTimeout(function() {
                grabClientIP(host)
                  .then(ip => {
                    newIPTry1 = ip;
                    console.log(
                      "newIP in the connectionUp method => ",
                      newIPTry1
                    );
                    if (
                      newIPTry1 !== undefined &&
                      !newIPTry1.stderr &&
                      newIPTry1 !== oldIP
                    ) {
                      resolve(newIPTry1);
                    } else {
                      console.log(
                        "Issue with matching IP's or an undefined response after calling connectionUp method ip => ",
                        ip
                      );
                      return wrapper();
                    }
                  })
                  .catch(err => {
                    if (err) {
                      console.log(
                        "Error trying to grab the client ip after trying connectionUp method => ",
                        err
                      );
                      resolve(err);
                    }
                  });
              }, 3000);
            } else {
              return wrapper();
            }
          })
          .catch(err => {
            if (err) {
              console.log(
                `Error in the connectionUp method. Current IP is ${oldIP}, and the Err is => ${err}`
              );
              reject(err);
            }
          });
      }

      if (timesInterfaceDownUpCalled === 0 && timesWrapperCalled === 2) {
        console.log(
          "The connectionUp method didnt work. Trying the interfaceDownUp now"
        );

        await interfaceDownUp(host, network)
          .then(interfaceDownUpResponse => {
            timesInterfaceDownUpCalled++;
            let successfulConnectionActivationTry2 =
              interfaceDownUpResponse.stdout.indexOf(
                "Connection successfully activated"
              ) >= 0
                ? true
                : false;
            if (successfulConnectionActivationTry2) {
              console.log(
                "successfulConnectionActivationTry2 - interfaceDownUp => ",
                successfulConnectionActivationTry2
              );
              setTimeout(function() {
                grabClientIP(host)
                  .then(ip => {
                    newIPTry2 = ip;
                    console.log(
                      "newIP in the interfaceDownUp method => ",
                      newIPTry2
                    );
                    if (
                      newIPTry2 !== undefined &&
                      !newIPTry2.stderr &&
                      newIPTry2 !== oldIP
                    ) {
                      resolve(newIPTry2);
                    } else {
                      console.log(
                        "Issue with matching IP's or an undefined response after calling interfaceDownUp method ip => ",
                        ip
                      );
                      return wrapper();
                    }
                  })
                  .catch(err => {
                    if (err) {
                      console.log(
                        "Error trying to grab the client ip after trying interfaceDownUp method => ",
                        err
                      );
                      reject(err);
                    }
                  });
              }, 3000);
            } else {
              return wrapper();
            }
          })
          .catch(err => {
            if (err) {
              console.log(
                `Error in the interfaceDownUp method. Current IP is ${oldIP}, and the Err is => ${err}`
              );
              reject(err);
            }
          });
      }

      if (
        timesDeviceDisconnectAndReconnectCalled === 0 &&
        timesWrapperCalled === 3
      ) {
        console.log(
          "The interfaceDownUp method didnt work. Trying the deviceDisconnectAndReconnect method now"
        );

        await deviceDisconnectAndReconnect(host)
          .then(deviceDisconnectAndReconnectResponse => {
            timesDeviceDisconnectAndReconnectCalled++;
            let successfulConnectionActivationTry3 =
              deviceDisconnectAndReconnectResponse.stdout.indexOf(
                "successfully activated"
              ) >= 0
                ? true
                : false;
            if (successfulConnectionActivationTry3) {
              console.log(
                "successfulConnectionActivationTry3 - deviceDisconnectAndReconnect => ",
                successfulConnectionActivationTry3
              );
              setTimeout(function() {
                grabClientIP(host)
                  .then(ip => {
                    newIPTry3 = ip;
                    console.log(
                      "newIP in the deviceDisconnectAndReconnect method => ",
                      newIPTry3
                    );
                    if (
                      newIPTry3 !== undefined &&
                      !newIPTry3.stderr &&
                      newIPTry3 !== oldIP
                    ) {
                      resolve(newIPTry3);
                    } else {
                      console.log(
                        "Issue with matching IP's or an undefined response after calling deviceDisconnectAndReconnect method ip => ",
                        ip
                      );
                      return wrapper();
                    }
                  })
                  .catch(err => {
                    if (err) {
                      console.log(
                        "Error trying to grab the client ip after trying interfaceDownUp method => ",
                        err
                      );
                      reject(err);
                    }
                  });
              }, 3000);
            } else {
              return wrapper();
            }
          })
          .catch(err => {
            if (err) {
              console.log(
                `Error in the deviceDisconnectAndReconnect method. Current IP is ${oldIP}, and the Err is => ${err}`
              );
              reject(err);
            }
          });
      }

      if (timesRebootClientCalled === 0 && timesWrapperCalled === 4) {
        await rebootClient(host).then(res => {
          resolve(res);
        });
      }
    };

    return await wrapper();
  });
};

module.exports = resetClientIPAddress;
