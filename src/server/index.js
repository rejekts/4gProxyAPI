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
//return new Promise((resolve, reject) => {})

//reboot client machine
const rebootClient = function(host) {
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
        console.log("Error in the rebootClient method => ", err);
        return false;
      }
    });
};

//function for grabbing proxy server external IP
const grabClientIP = async function(host) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(`ssh pi@${host} "curl https://api.ipify.org -s -S"`)
      .then(returnedIP => {
        console.log(
          "Successfully grabbed the client IP => ",
          returnedIP.stdout
        );
        return returnedIP.stdout;
      })
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the grabClientIP method. Calling recursively now for the ${timesCalled}th time. => `,
            err
          );
          if (timesCalled >= 4) {
            return err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

const connectionUp = async function(host, network) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(`ssh pi@${host} "sudo nmcli connection up ${network}"`)
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the connectionUp method. Calling recursively now for the ${timesCalled}th time. => `,
            err
          );
          if (timesCalled >= 4) {
            return err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

const interfaceDownUp = async function(host, network) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(
      `ssh pi@${host} "sudo nmcli connection down ${network}; sleep 5; sudo nmcli connection up ${network};"`
    )
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the connectionUp method. Calling recursively now for the ${timesCalled}th time. => `,
            err
          );
          if (timesCalled >= 4) {
            return err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

const deviceDisconnectAndReconnect = async function(host) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(
      `ssh pi@${host} "sudo nmcli device disconnect cdc-wdm0; sleep 5; sudo nmcli device connect cdc-wdm0;"`
    )
      .then(connectionData => connectionData)
      .catch(err => {
        if (err) {
          timesCalled++;
          console.log(
            `Error in the deviceDisconnectAndReconnect method. Calling recursively now for the ${timesCalled}th time. => `,
            err
          );
          if (timesCalled >= 4) {
            return err;
          } else {
            return wrapper();
          }
        }
      });
  };
  return await wrapper();
};

const resetClientIPAddress = async function(host, network, oldIP) {
  let timesWrapperCalled = 0;
  let timesConnectionUpCalled = 0;
  let timesInterfaceDownUpCalled = 0;
  let timesdeviceDisconnectAndReconnectCalled = 0;

  let newIP;

  const wrapper = function() {
    return connectionUp(host, network)
      .then(connectionUpResponse => {
        console.log("connectionUpResponse => ", connectionUpResponse);
        let successfulConnectionActivationTry1 =
          connectionUpResponse.stdout.indexOf(
            "Connection successfully activated"
          ) >= 0
            ? true
            : false;

        if (successfulConnectionActivationTry1) {
          grabClientIP(host)
            .then(ip => {
              newIP = ip.trim();
              console.log("newIP => ", newIP);
              if (newIP !== undefined && newIP !== oldIP) {
                return newIP;
              } else {
                console.log(
                  "Issue with matching IP's or an undefined response after calling connectionUp method ip => ",
                  ip
                );
              }
            })
            .catch(err => {
              if (err) {
                console.log(
                  "Error trying to grab the client ip after trying connectionUp method => ",
                  err
                );
                return err;
              }
            });
        } else {
          console.log(
            "connection not successfully activated. Trying the interfaceDownUp now"
          );
          interfaceDownUp(host, network).then(interfaceDownUpResponse => {
            let successfulConnectionActivationTry2 =
              interfaceDownUpResponse.stdout.indexOf(
                "Connection successfully activated"
              ) >= 0
                ? true
                : false;
            if (successfulConnectionActivationTry2) {
              grabClientIP(host)
                .then(ip => {
                  newIP = ip.trim();
                  console.log("newIP => ", newIP);
                  if (newIP !== undefined && newIP !== oldIP) {
                    return newIP;
                  } else {
                    console.log(
                      "Issue with matching IP's or an undefined response after calling interfaceDownUp method ip => ",
                      ip
                    );
                  }
                })
                .catch(err => {
                  if (err) {
                    console.log(
                      "Error trying to grab the client ip after trying interfaceDownUp method => ",
                      err
                    );
                    return err;
                  }
                });
            } else {
              deviceDisconnectAndReconnect(host).then(
                deviceDisconnectAndReconnectResponse => {
                  let successfulConnectionActivationTry3 =
                    deviceDisconnectAndReconnectResponse.stdout.indexOf(
                      "successfully activated"
                    ) >= 0
                      ? true
                      : false;
                  if (successfulConnectionActivationTry3) {
                    grabClientIP(host)
                      .then(ip => {
                        newIP = ip.trim();
                        console.log("newIP => ", newIP);
                        if (newIP !== undefined && newIP !== oldIP) {
                          return newIP;
                        } else {
                          console.log(
                            "Issue with matching IP's or an undefined response after calling deviceDisconnectAndReconnect method ip => ",
                            ip
                          );
                        }
                      })
                      .catch(err => {
                        if (err) {
                          console.log(
                            "Error trying to grab the client ip after trying interfaceDownUp method => ",
                            err
                          );
                          return err;
                        }
                      });
                  }
                }
              );
            }
          });
          // return resetClientIPAddress(host, network, oldIP);
        }
      })
      .catch(err => {
        if (err) {
          console.log(
            `Error running the reset command on the first try. Current IP is ${oldIP}, Err => ${err}`
          );
          return err;
        }
      });
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
    "Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  grabClientIP(host)
    .then(ip => {
      console.log("Return of grabClientIP in the main endpoint => ", ip);
      oldIP = ip.trim();
      return oldIP;
    })
    .then(oldIP => {
      resetClientIPAddress(host, network, oldIP).then(resetClientResponse => {
        console.log("resetClientResponse => ", resetClientResponse);
      });
    })
    .catch(err => {
      if (err) {
        console.log("We have an error in the main endpoint => ", err);
      }
    });
});

/*
if (ip && ip !== undefined) {
        oldIP = ip.trim();
      } else {
        grabClientIP(host)
          .then(ip2 => {
            if (ip2 && ip2 !== undefined) {
              oldIP = ip2.trim();
            } else {
              grabClientIP(host)
                .then(ip3 => {
                  if (ip3 && ip3 !== undefined) {
                    oldIP = ip3.trim();
                  } else {
                    res.send(
                      `We are having an issue retrieving the machines current ip. Please allow 20 seconds to pass then refresh the page to try again.`
                    );
                  }
                })
                .catch(err => {
                  if (err) {
                    console.log(
                      "We have an error in the main ednpoint while trying to grab the client ip => ",
                      err
                    );
                  }
                });
            }
          })
          .catch(err => {
            if (err) {
              console.log(
                "We have an error in the main ednpoint while trying to grab the client ip => ",
                err
              );
              return false;
            }
          });
      }
      resetClientIPAddress(host, network, oldIP)
        .then(newIP => {
          console.log("newIP => ", newIP);
          if (newIP) {
            if (oldIP !== newIP) {
              res.send(
                `Connection successfully reset. Your Old IP was => ${oldIP} and your New IP is ${newIP}`
              );
            } else if (!newIP) {
              //if the ips still match after reset try one more time
              resetClientIPAddress(host, network, oldIP).then(newIP2 => {
                console.log("newIP2 => ", newIP2);
                if (newIP2) {
                  if (oldIP !== newIP2) {
                    res.send(
                      `Connection successfully reset. Your Old IP was => ${oldIP} and your New IP is ${newIP2}`
                    );
                  }
                } else if (!newIP2) {
                  rebootClient(host).then(rebootRes => {
                    if (rebootRes) {
                      res.send(
                        `Connection did not successfully reset after 2 tries. We are rebooting the machine now.  ${rebootRes}`
                      );
                    } else {
                      res.send(
                        `Connection did not successfully reset after 2 tries. We are rebooting the machine now.`
                      );
                    }
                  });
                }
              });
            }
          } else {
            console.log(
              "trying reset command one more time in the main endpoint"
            );
            resetClientIPAddress(host, network, oldIP).then(newIP3 => {
              console.log("newIP3 => ", newIP3);
              if (newIP3) {
                if (oldIP !== newIP3) {
                  res.send(
                    `Connection successfully reset. Your Old IP was => ${oldIP} and your New IP is ${newIP3}`
                  );
                }
              } else if (!newIP3) {
                rebootClient(host).then(rebootRes => {
                  if (rebootRes) {
                    res.send(
                      `Connection did not successfully reset after 2 tries. We are rebooting the machine now. please allow 60 - 90 seconds for the connection to re-establish ${rebootRes}`
                    );
                  } else {
                    res.send(
                      `We are having an issue resetting the machines ip. please allow 20 seconds to pass then refresh the page to try again. Current IP = ${oldIP}`
                    );
                  }
                });
              }
            });
          }
        })
        .catch(err => {
          if (err) {
            console.log(
              "We have an error tryign to run the resetClientIpAddress method in the main endpoint => ",
              err
            );
          }
        });
*/
//`ssh pi@${host} "/usr/bin/squid -k shutdown && echo "" > /var/spool/squid/swap.state && sudo reboot"`
//ssh pi@${host} "sudo rm /etc/NetworkManager/system-connections/${network} && echo "Removing and Re-Adding the connection profile for ${network} on ${host}" && sudo nmcli con add con-name ${network} ifname cdc-wdm0 type gsm connection.id ${network} connection.autoconnect-priority 999 gsm.apn ${apn} gsm.number *99# && sleep 5 &&
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
