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

//function for grabbing proxy server external IP
const grabClientIP = function(host) {
  return exec(`ssh pi@${host} "curl https://api.ipify.org -s -S"`)
    .then(returnedIP => {
      console.log("Successfully grabbed the client IP => ", returnedIP.stdout);
      return returnedIP.stdout;
    })
    .catch(err => {
      if (err) {
        console.log("Error in the grabClientIP method err => ", err);
        return false;
      }
    });
};

const resetClientIPAddress = function(host, network, oldIP) {
  return exec(`ssh pi@${host} "sudo nmcli connection up ${network}"`)
    .then(resetData => {
      console.log("resetData => ", resetData);
      let successfulConnectionActivation =
        resetData.stdout.indexOf("Connection successfully activated") >= 0
          ? true
          : false;
      console.log(
        "successfulConnectionActivation try 1 => ",
        successfulConnectionActivation
      );
      if (successfulConnectionActivation) {
        return true;
        // grabClientIP(host)
        //   .then(ip => ip)
        //   .catch(err =>
        //     console.log(
        //       "error in the resetClientIPAddress method AFTER successful activation => ",
        //       err
        //     )
        //   );
      } else {
        console.log(
          "Trying the nmcli connection up command a second time in five seconds"
        );
        setTimeout(function() {
          exec(`ssh pi@${host} "sudo nmcli connection up ${network}"`).then(
            connData => {
              let successfulConnectionActivation2 =
                connData.stdout.indexOf("Connection successfully activated") >=
                0
                  ? true
                  : false;
              console.log(
                "successfulConnectionActivation try 2 => ",
                successfulConnectionActivation2
              );

              if (successfulConnectionActivation2) {
                return true;
                // grabClientIP(host)
                //   .then(ip => ip)
                //   .catch(err =>
                //     console.log(
                //       "error in the 2nd try in the resetClientIPAddress method after Failed activation => ",
                //       err
                //     )
                //   );
              } else {
                return false;
              }
            },
            5000
          );
        });
      }
    })
    .catch(err => {
      if (err) {
        console.log(
          `Error running the reset command on the first try. Current IP is ${oldIP}, Err => ${err}`
        );
        return false;
      }
    });
};

//function for grabbing proxy server external IP
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
    })
    .catch(err => {
      if (err) {
        console.log(
          "We have an error in the main ednpoint while trying to grab the client ip => ",
          err
        );
      }
    });
});
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
