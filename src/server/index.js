//Need API endpoint that we can hit for the IP of the 4g modem to be reset. AKA Disconnect the device and reconnect it.

const express = require("express");
const bodyParser = require("body-parser");
const child_process = require("child_process");
const moment = require("moment-timezone");
const childExec = require("child_process").exec;
let util = require("util");
let exec = util.promisify(childExec);
const mysql = require("promise-mysql");
let dbConnection = require("./services/dbconnector");
const app = express();
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static("dist"));
// app.use(requestIp.mw());
app.enable("trust proxy");

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const server = app.listen(8080, () => console.log("Listening on port 8080!"));
app.timeout = 360000;

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

//function to reset ip on client machine using the connection up method
const connectionUp = async function(host, network) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(
      `ssh pi@${host} "sudo nmcli connection up ${network} || sleep 5 && sudo nmcli connection up ${network}"`
    )
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the connectionUp method. Calling recursively now for the ${timesCalled}th time. Error details: cmd => `,
            err.cmd,
            "; err => ",
            err.stderr
          );
          if (timesCalled >= 1) {
            return err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

//function to reset ip on client machine by cycling the interface down then up
const interfaceDownUp = async function(host, network) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(
      `ssh pi@${host} "sudo nmcli connection down ${network} && sleep 5; sudo nmcli connection up ${network} || sudo nmcli connection down ${network}; sleep 10 && sudo nmcli connection up ${network}"`
    )
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the interfaceDownUp method. Calling recursively now for the ${timesCalled}th time. Error details: cmd => `,
            err.cmd,
            "; err => ",
            err.stderr
          );
          if (timesCalled >= 1) {
            return err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

//function to reset ip on client machine by disconnecting the modem and reconnecting it
const deviceDisconnectAndReconnect = async function(host) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(
      `ssh pi@${host} "sudo nmcli device disconnect cdc-wdm0 && sleep 10 && sudo nmcli device connect cdc-wdm0 || sleep 5; sudo nmcli device disconnect cdc-wdm0; sleep 10; sudo nmcli device connect cdc-wdm0"`
    )
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the deviceDisconnectAndReconnect method. Calling recursively now for the ${timesCalled}th time. Error details: cmd => `,
            err.cmd,
            "; err => ",
            err.stderr
          );
          if (timesCalled >= 1) {
            return err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

//function to run all the methods until ip is reset on client machine
const resetClientIPAddress = async function(host, network, oldIP, cb) {
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
              "successfulConnectionActivationTry1 => ",
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
                    cb(null, newIPTry1);
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
                    cb(err);
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
            return err;
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
              "successfulConnectionActivationTry2 => ",
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
                    cb(null, newIPTry2);
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
                    cb(err);
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
            return err;
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
              "successfulConnectionActivationTry3 => ",
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
                    cb(null, newIPTry3);
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
                    cb(err);
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
            cb(err);
          }
        });
    }

    if (timesRebootClientCalled === 0 && timesWrapperCalled === 4) {
      await rebootClient(host).then(res => {
        cb(res);
      });
    }
  };
  return await wrapper();
};

app.get("/proxy/reset", function(req, res) {
  const host = req.query["host"];
  const network = req.query["network"];
  let oldIP;
  let newIP;

  console.log(
    "Reset API Endpoint getting hit!",
    "host ip => ",
    host,
    " network => ",
    network,
    " Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  grabClientIP(host).then(ip => {
    console.log("Return of oldIP in the /proxy/reset endpoint => ", ip);
    if (!ip) {
      grabClientIP(host).then(ip2 => {
        if (!ip2) {
          rebootClient(host).then(rebootRes => {
            res
              .status(200)
              .send(
                `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
              );
          });
        } else {
          oldIP = ip;
          resetClientIPAddress(host, network, oldIP, (err, ip) => {
            if (err) {
              console.log(
                "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
                err
              );
              if (err.stderr.indexOf("closed by remote host") >= 0) {
                res
                  .status(255)
                  .send(
                    `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
                  );
              } else {
                rebootClient(host)
                  .then(rebootRes => {
                    res
                      .status(200)
                      .send(
                        `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                      );
                  })
                  .catch(err => {
                    console.log(
                      "Error trying to reset the ip in the main endpoint. Error: ",
                      err
                    );
                    res
                      .status(255)
                      .send(
                        `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
                      );
                  });
              }
            } else {
              console.log("Success!! newIP in the endpoint!! => ", ip);
              res
                .status(200)
                .send(
                  `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
                );
            }
          });
          res
            .status(200)
            .send(
              `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
            );
          // return oldIP;
          res
            .status(200)
            .send(`Your IP address is being reset. Your oldIP is ${oldIP}.`);
        }
      });
    } else {
      oldIP = ip;
      resetClientIPAddress(host, network, oldIP, (err, ip) => {
        if (err) {
          console.log(
            "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
            err
          );
          if (err.stderr.indexOf("closed by remote host") >= 0) {
            res
              .status(255)
              .send(
                `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
              );
          } else {
            rebootClient(host)
              .then(rebootRes => {
                res
                  .status(200)
                  .send(
                    `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                  );
              })
              .catch(err => {
                console.log(
                  "Error trying to reset the ip in the main endpoint. Error: ",
                  err
                );
                res
                  .status(255)
                  .send(
                    `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
                  );
              });
          }
        } else {
          console.log("Success!! newIP in the endpoint!! => ", ip);
          res
            .status(200)
            .send(
              `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
            );
        }
      });
      // return oldIP;
      res
        .status(200)
        .send(`Your IP address is being reset. Your oldIP is ${oldIP}.`);
    }
  });
  // .then(oldIP => {
  //   resetClientIPAddress(host, network, oldIP, (err, ip) => {
  //     if (err) {
  //       console.log(
  //         "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
  //         err
  //       );
  //       if (err.stderr.indexOf("closed by remote host") >= 0) {
  //         res
  //           .status(255)
  //           .send(
  //             `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
  //           );
  //       } else {
  //         rebootClient(host)
  //           .then(rebootRes => {
  //             res
  //               .status(200)
  //               .send(
  //                 `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
  //               );
  //           })
  //           .catch(err => {
  //             console.log(
  //               "Error trying to reset the ip in the main endpoint. Error: ",
  //               err
  //             );
  //             res
  //               .status(255)
  //               .send(
  //                 `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
  //               );
  //           });
  //       }
  //     } else {
  //       console.log("Success!! newIP in the endpoint!! => ", ip);
  //       res
  //         .status(200)
  //         .send(
  //           `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
  //         );
  //     }
  //   });
  // });
});

app.get("/proxy/reset/hard", function(req, res) {
  const host = req.query["host"];
  const network = req.query["network"];
  const apn = req.query["apn"];

  console.log(
    "Hard Reset API Endpoint getting hit!",
    "host => ",
    host,
    "Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  exec(`ssh pi@${host} "sudo reboot"`)
    .then(data => {
      res.send(
        `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
      );
      console.log(`Connection to ${host}: ${data.stdout}`);
    })
    .catch(err => {
      console.log("err in the catch => ", err);
      res.send(
        `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish. You can close this browser tab now.`
      );
    });
});

app.get("/proxy/reset/clear-cache", function(req, res) {
  const host = req.query["host"];
  console.log(
    "Clear Cache API Endpoint getting hit!",
    "host => ",
    host,
    "Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  exec(`ssh pi@${host} "sudo /usr/local/bin/clearAndHardReset.sh"`)
    .then(data => {
      res.send(
        `Proxy Server Clearing Cache, Rebuilding and Rebooting. Please allow 60-90 seconds for the network to re-establish`
      );
      console.log(`Connection to ${host}: ${data.stdout}`);
    })
    .catch(err => {
      console.log("err in the catch => ", err);
    });
});

app.post("/api/cookies", function(req, res) {
  console.log("req.body => ", req.body);
  console.log("req.params => ", req.params);

  for (let i = 0; i < req.body.cookies.length; i++) {
    let cookie = req.body.cookies[i];
    console.log(cookie.domain, " - ", cookie.name, " - ", cookie.value);
    console.log(
      req.body.changed.cookie.domain,
      " - ",
      req.body.changed.cookie.name,
      " - ",
      req.body.changed.cookie.value
    );
  }
  try {
    res.send("got em!!");
  } catch (err) {
    if (err) {
      console.error(err);
      res.send("Error in the /api/cookies post method");
    }
  }

  // let queryStr = `SELECT a.account_key as account_key, s.url as url, a.pixel as pixel
  // FROM sys.accounts a
  // join sys.safe_urls s
  // on s.safe_url_key = a.safe_url_key
  // where a.pixel = ${pid};`;

  // let dbase = await dbConnection.init();
  // try {
  //   if (!dbase) {
  //     return res.status(500).send("Failed to initialize the db.");
  //   } else {
  //     await dbase.query(queryStr).then(results => {
  //       let safeUrl = new URL(results[0].url);
  //       let hostname = safeUrl.hostname;
  //       let pixel = results[0].pixel;
  //       let pathname = safeUrl.pathname;
  //       let filename = path.basename(pathname);

  //       if (results[0].url.indexOf("shopify") > -1) {
  //         let shopifyRedirectUrl = `https://${hostname}${pathname.replace(
  //           filename,
  //           ""
  //         )}addtocart/one.php?pid=${pixel}&link=${hostname}`;

  //         console.log(
  //           moment(),
  //           " test url to redirect to => ",
  //           shopifyRedirectUrl
  //         );
  //         res.redirect(shopifyRedirectUrl);
  //       } else {
  //         let otherRedirectUrl = `https://${hostname}/addtocart/one.php?pid=${pixel}&link=${hostname}`;

  //         console.log(
  //           moment(),
  //           " test url to redirect to => ",
  //           otherRedirectUrl
  //         );
  //         res.redirect(otherRedirectUrl);
  //       }
  //       dbase.end();
  //     });
  //   }
  // } catch (error) {
  //   console.log("Error in the safeurl endpoint => ", error);
  // }
});

//Facebot Endpoints below
app.get("/bot/reset", function(req, res) {
  const host = req.query["host"];
  const network = req.query["network"];
  let oldIP;
  let newIP;

  console.log(
    "Reset API Endpoint getting hit!",
    "host ip => ",
    host,
    " network => ",
    network,
    " Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  grabClientIP(host)
    .then(ip => {
      console.log("Return of oldIP in the /bot/reset endpoint => ", ip);
      if (!ip) {
        grabClientIP(host).then(ip2 => {
          if (!ip2) {
            rebootClient(host).then(rebootRes => {
              res
                .status(200)
                .send(
                  `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                );
            });
          } else {
            oldIP = ip;
            return oldIP;
          }
        });
      } else {
        oldIP = ip;
        return oldIP;
      }
    })
    .then(oldIP => {
      resetClientIPAddress(host, network, oldIP, (err, ip) => {
        if (err) {
          console.log(
            "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
            err
          );
          if (err.stderr.indexOf("closed by remote host") >= 0) {
            res
              .status(255)
              .send(
                `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
              );
          } else {
            rebootClient(host)
              .then(rebootRes => {
                res
                  .status(200)
                  .send(
                    `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                  );
              })
              .catch(err => {
                console.log(
                  "Error trying to reset the ip in the main endpoint. Error: ",
                  err
                );
                res
                  .status(255)
                  .send(
                    `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
                  );
              });
          }
        } else {
          console.log("Success!! newIP in the endpoint!! => ", ip);
          res
            .status(200)
            .send(
              `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
            );
        }
      });
    });
});
