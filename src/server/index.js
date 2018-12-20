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
        console.log(
          "Error in the rebootClient method. Error details: cmd => ",
          err.cmd,
          "; err => ",
          err.stderr
        );
        return err;
      }
    });
};

//function for grabbing proxy server external IP
const grabClientIP = async function(host) {
  let timesCalled = 0;

  const wrapper = function() {
    return exec(`ssh pi@${host} "curl https://api.ipify.org -s -S"`)
      .then(returnedIP => {
        // console.log(
        //   "Successfully grabbed the client IP => ",
        //   returnedIP.stdout
        // );
        return returnedIP.stdout;
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
          if (timesCalled >= 5) {
            return err;
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
    return exec(`ssh pi@${host} "sudo nmcli connection up ${network}"`)
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
      `ssh pi@${host} "sudo nmcli connection down ${network}; sleep 5; sudo nmcli connection up ${network};"`
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
      `ssh pi@${host} "sudo nmcli device disconnect cdc-wdm0; sleep 5; sudo nmcli device connect cdc-wdm0;"`
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
  let newIP;

  const wrapper = async function() {
    timesWrapperCalled++;
    console.log("timesWrapperCalled => ", timesWrapperCalled);

    if (timesWrapperCalled === 1) {
      console.log("Running the connectionUp method");
      await connectionUp(host, network)
        .then(connectionUpResponse => {
          console.log("connectionUpResponse => ", connectionUpResponse);
          let successfulConnectionActivationTry1 =
            connectionUpResponse.stdout.indexOf(
              "Connection successfully activated"
            ) >= 0
              ? true
              : false;

          if (successfulConnectionActivationTry1) {
            setTimeout(function() {
              grabClientIP(host)
                .then(ip => {
                  newIP = ip;
                  console.log("newIP in the connectionUp method => ", newIP);
                  if (newIP !== undefined && !newIP.stderr && newIP !== oldIP) {
                    console.log(
                      "Made it into the condition of - newIP !== undefined && newIP !== oldIP - in the connectionUp. newIP => ",
                      newIP
                    );
                    cb(newIP);
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
                    return err;
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

    if (timesWrapperCalled === 2) {
      console.log(
        "The connectionUp method didnt work. Trying the interfaceDownUp now"
      );

      await interfaceDownUp(host, network)
        .then(interfaceDownUpResponse => {
          let successfulConnectionActivationTry2 =
            interfaceDownUpResponse.stdout.indexOf(
              "Connection successfully activated"
            ) >= 0
              ? true
              : false;
          if (successfulConnectionActivationTry2) {
            setTimeout(function() {
              grabClientIP(host)
                .then(ip => {
                  newIP = ip;
                  console.log("newIP in the interfaceDownUp method => ", newIP);
                  if (newIP !== undefined && !newIP.stderr && newIP !== oldIP) {
                    console.log(
                      "Made it into the condition of - newIP !== undefined && newIP !== oldIP - in the interfaceDownUp method . newIP => ",
                      newIP
                    );
                    cb(newIP);
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
                    return err;
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

    if (timesWrapperCalled === 3) {
      console.log(
        "The interfaceDownUp method didnt work. Trying the deviceDisconnectAndReconnect method now"
      );

      await deviceDisconnectAndReconnect(host)
        .then(deviceDisconnectAndReconnectResponse => {
          let successfulConnectionActivationTry3 =
            deviceDisconnectAndReconnectResponse.stdout.indexOf(
              "successfully activated"
            ) >= 0
              ? true
              : false;
          if (successfulConnectionActivationTry3) {
            setTimeout(function() {
              grabClientIP(host)
                .then(ip => {
                  newIP = ip;
                  console.log(
                    "newIP in the deviceDisconnectAndReconnect method => ",
                    newIP
                  );
                  if (newIP !== undefined && !newIP.stderr && newIP !== oldIP) {
                    console.log(
                      "Made it into the condition of - newIP !== undefined && newIP !== oldIP - in the deviceDisconnectAndReconnect method. newIP => ",
                      newIP
                    );
                    cb(newIP);
                  } else {
                    console.log(
                      "Issue with matching IP's or an undefined response after calling deviceDisconnectAndReconnect method ip => ",
                      ip
                    );
                    // return wrapper();
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
            return err;
          }
        });
    }

    if (timesWrapperCalled === 4) {
      await rebootClient(host)
        .then(rebootResponse => rebootResponse)
        .catch(err => {
          if (err) {
            console.log(
              `Error in the rebootClient method. Current IP is ${oldIP}, and the Err is => ${err}`
            );
            return err;
          }
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

  grabClientIP(host)
    .then(ip => {
      console.log("Return of oldIP in the /proxy/reset endpoint => ", ip);
      if (!ip) {
        grabClientIP(host).then(ip2 => {
          if (!ip2) {
            rebootClient(host)
              .then(rebootRes => rebootRes)
              .catch(err => {});
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
      resetClientIPAddress(host, network, oldIP, ip => {
        console.log("newIP in the endpoint!! => ", ip);
        if (ip !== undefined) {
          res
            .status(200)
            .send(
              `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
            );
        }
      }).catch(err => {
        if (err) {
          console.log(
            "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
            err
          );
          res.send(
            "There was an issue when trying to reset the proxy IP address. please wait 30 - 60 seconds and try again. if the problem persists please contact your system administrator and provide them with the following error code. => ",
            err
          );
        }
      });
    })
    .catch(err => {
      if (err) {
        console.log(
          "We have an error in the main /proxy/reset endpoint => ",
          err
        );
      }
    });
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
