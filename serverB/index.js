//This is the API serverB file. It handles all threading and execution of instructions sent from serverA

const express = require("express");
const bodyParser = require("body-parser");
const child_process = require("child_process");
const moment = require("moment-timezone");
const childExec = require("child_process").exec;
const util = require("util");
const exec = util.promisify(childExec);
const mysql = require("promise-mysql");
const rp = require("request-promise");
const app = express();
const AWS = require("aws-sdk");
const config = require("./config/config.js");
const isDev = process.env.NODE_ENV !== "production";

const ProxyServer = require("./dynamodb/proxyServer");
const grabClientIP = require("./functions/grabClientIP");
const rebootClient = require("./functions/rebootClient");
const resetClientIPAddress = require("./functions/resetClientIPAddress");

const DynamoDb = require("./dynamodb");
let dynamoDb = new DynamoDb();
const dynamodbstreams = new AWS.DynamoDBStreams({ apiVersion: "2012-08-10" });

app.timeout = 360000;
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static("dist"));
app.enable("trust proxy");
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const server = app.listen(8090, () =>
  console.log("ServerB Listening on port 8090!")
);

//get all proxies from dynamodb
app.get("/api/proxies", function(req, res) {
  AWS.config.update(config.aws_remote_config);

  let proxyServer = new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  proxyServer.getAll().then(pr => {
    console.log("Get all proxies from dynamodb in serverB => ", pr);
    res.status(200).send(pr);
  });
});

//get browser_ip from client and update dynamodb
app.get("/api/browser_ip", function(req, res) {
  AWS.config.update(config.aws_remote_config);
  let uuid = req.query.uuid;
  let status = req.query.status;
  let proxyData = {};

  let proxyServer = new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  proxyServer
    .get(uuid)
    .then(async pr => {
      let host = pr.lan_ip;
      proxyData = pr;
      console.log(
        "Get current browser_ip from dynamodb in serverB => ",
        pr.browser_ip
      );
      return await grabClientIP(host);
    })
    .then(currentIP => {
      let updateData = {
        lan_ip: proxyData.lan_ip,
        vpn_ip: proxyData.vpn_ip,
        proxy_ip: proxyData.proxy_ip,
        old_browser_ip: currentIP,
        browser_ip: currentIP,
        port: proxyData.port,
        carrier: proxyData.carrier,
        apn: proxyData.apn,
        status: status !== undefined ? status : proxyData.status,
        instructions: proxyData.instructions
      };
      proxyServer.update(uuid, updateData).then(IPUpdateRez => {
        console.log("IPUpdateRez => ", IPUpdateRez.attrs);
        res.status(200).send(IPUpdateRez.attrs);
      });
    })
    .catch(err => {
      res.status(200).send(proxyData);
    });
});

// Get a single proxy by uuid
app.get("/api/proxy", (req, res, next) => {
  console.log("UUID in serverB => ", req.query);
  let uuid = req.query.uuid;

  let proxyServer = new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  proxyServer.get(uuid).then(pr => {
    console.log("Get a single proxy from dynamodb => ", pr);
    res.status(200).send(pr);
  });
});

//add new proxy to the dynamo db
app.post("/api/add/proxy", (req, res, next) => {
  AWS.config.update(config.aws_remote_config);

  const {
    lan_ip,
    vpn_ip,
    proxy_ip,
    old_browser_ip,
    browser_ip,
    port,
    carrier,
    apn,
    status,
    instructions
  } = req.body;
  let proxyServer = new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  proxyServer
    .create({
      lan_ip: lan_ip,
      vpn_ip: vpn_ip,
      proxy_ip: proxy_ip,
      old_browser_ip: old_browser_ip,
      browser_ip: browser_ip,
      port: port,
      carrier: carrier,
      apn: apn,
      status: status,
      instructions: instructions
    })
    .then(rez => {
      console.log(
        "res in the api/proxy POST endpoint after making proxy in dynamodb => ",
        rez.attrs
      );
      res
        .status(200)
        .send(`New record created in dynamodb => ${JSON.stringify(rez.attrs)}`);
    });
});

// Update a proxy by uuid
app.put("/api/update/proxy", (req, res, next) => {
  AWS.config.update(config.aws_remote_config);

  const {
    uuid,
    lan_ip,
    vpn_ip,
    proxy_ip,
    old_browser_ip,
    browser_ip,
    port,
    carrier,
    apn,
    status,
    instructions
  } = req.body;

  let proxyServer = new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  proxyServer
    .update(uuid, {
      lan_ip: lan_ip,
      vpn_ip: vpn_ip,
      proxy_ip: proxy_ip,
      old_browser_ip: old_browser_ip,
      browser_ip: browser_ip,
      port: port,
      carrier: carrier,
      apn: apn,
      status: status,
      instructions: instructions
    })
    .then(rez => {
      console.log(
        "res in the api/proxy PUT endpoint after updating proxy in dynamodb => ",
        rez.attrs
      );
      res
        .status(200)
        .send(
          `Record was updated in the dynamodb for => ${
            rez.attrs.uuid
          }. New attrs are => ${JSON.stringify(rez.attrs)}`
        );
    });
});
//Main endpoint for resetting the browser ip on the proxy server
app.get("/api/proxy/reset", function(req, res) {
  AWS.config.update(config.aws_remote_config);
  let uuid = req.query.uuid;
  let carrier = req.query.carrier;
  let oldIP;
  let newIP;
  let proxyData = {};

  let proxyServer = new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  console.log(
    "Reset API Endpoint getting hit!",
    "uuid => ",
    uuid,
    " carrier => ",
    carrier,
    " Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  //go through the reset procedures in order AND update the instructions and the status/ ip in the db on the way
  //-------------------------------------------------------
  proxyServer.get(uuid).then(proxyData => {
    let {
      uuid,
      lan_ip,
      vpn_ip,
      proxy_ip,
      old_browser_ip,
      browser_ip,
      port,
      carrier,
      apn,
      status,
      instructions
    } = proxyData;

    //grab current IP from the proxy server
    grabClientIP(lan_ip)
      .then(ip => {
        console.log(
          "Return of oldIP in the /proxy/reset endpoint => ",
          ip,
          " For ",
          lan_ip
        );
        //if no ip is returned then try the grabClientIP method one more time
        if (!ip) {
          grabClientIP(lan_ip)
            .then(ip2 => {
              if (!ip2) {
                //Update the db that there was an error and that we are rebooting the proxy server hardware
                proxyData.status = "REBOOTING";
                proxyServer.update(uuid, proxyData).then(() => {});
                rebootClient(lan_ip)
                  .then(rebootRes => {
                    res
                      .status(200)
                      .send(
                        `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                      );
                  })
                  .catch(err => {
                    console.log("rebooting error in the reset method => ", err);
                  });
              } else {
                oldIP = ip;
                proxyData.old_browser_ip = ip;
                proxyData.status = "RESETTING";
                //store the current IP in the db IF its different AND set the status of the proxy to running
                proxyServer.update(uuid, proxyData).then(r => {
                  //run the reset method after updating the status and instructions in the db
                  resetClientIPAddress(lan_ip, carrier, oldIP)
                    .then(i => {
                      console.log(
                        "Success!! newIP in the endpoint!! => ",
                        ip,
                        " For ",
                        lan_ip
                      );
                      proxyData.browser_ip = ip;
                      proxyData.status = "COMPLETE";
                      proxyServer
                        .update(uuid, proxyData)
                        .then(successfulResetUpdateRez => {
                          console.log(
                            "successfulResetUpdateRez => ",
                            successfulResetUpdateRez
                          );
                        });
                    })
                    .catch(err => {
                      console.log(
                        "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
                        err,
                        " For ",
                        lan_ip
                      );
                      //Update the db that there was an error and that we are rebooting the proxy server hardware
                      proxyData.status = "REBOOTING";
                      proxyServer.update(uuid, proxyData).then(() => {
                        //Reboot machine
                        rebootClient(lan_ip)
                          .then(rebootRes => {})
                          .catch(err => {
                            console.log(
                              "Error trying to reset the ip in the main endpoint. Error: ",
                              err,
                              " For ",
                              lan_ip
                            );
                          });
                      });
                    });
                });

                // res
                //   .status(200)
                //   .send(
                //     `Your IP address is being reset. Your oldIP is ${oldIP}. Please allow up to 3 - 5 minutes for the machine to reset and check the new IP address at https://ipfingerprints.com`
                //   );
              }
            })
            .catch(err => {
              console.log(
                "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
                err,
                " For ",
                lan_ip
              );
              //Update the db that there was an error and that we are rebooting the proxy server hardware
              proxyData.status = "REBOOTING";
              proxyServer.update(uuid, proxyData).then(() => {
                //Reboot machine
                rebootClient(lan_ip)
                  .then(rebootRes => {})
                  .catch(err => {
                    console.log(
                      "Error trying to reset the ip in the main endpoint. Error: ",
                      err,
                      " For ",
                      lan_ip
                    );
                  });
              });
            });
        } else {
          oldIP = ip;
          proxyData.old_browser_ip = ip;
          proxyData.status = "RESETTING";
          //store the current IP in the db IF its different AND set the status of the proxy to running
          proxyServer.update(uuid, proxyData).then(x => {
            //run the reset method after updating the status and instructions in the db
            resetClientIPAddress(lan_ip, carrier, oldIP)
              .then(i => {
                console.log(
                  "Success!! newIP in the endpoint!! => ",
                  ip,
                  " For ",
                  lan_ip
                );
                proxyData.browser_ip = ip;
                proxyData.status = "COMPLETE";
                proxyServer
                  .update(uuid, proxyData)
                  .then(successfulResetUpdateRez => {
                    console.log(
                      "successfulResetUpdateRez => ",
                      successfulResetUpdateRez
                    );
                  });
              })
              .catch(err => {
                console.log(
                  "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
                  err,
                  " For ",
                  lan_ip
                );
                //Update the db that there was an error and that we are rebooting the proxy server hardware
                proxyData.status = "REBOOTING";
                proxyServer.update(uuid, proxyData).then(() => {
                  //Reboot machine
                  rebootClient(lan_ip)
                    .then(rebootRes => {})
                    .catch(err => {
                      console.log(
                        "Error trying to reset the ip in the main endpoint. Error: ",
                        err,
                        " For ",
                        lan_ip
                      );
                    });
                });
              });
          });

          // res
          //   .status(200)
          //   .send(
          //     `Your IP address is being reset. Your oldIP is ${oldIP}. Please allow up to 3 - 5 minutes for the machine to reset and check the new IP address at https://ipfingerprints.com`
          //   );
        }
      })
      .catch(err => {
        console.log(
          "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
          err,
          " For ",
          lan_ip
        );
        //Update the db that there was an error and that we are rebooting the proxy server hardware
        proxyData.status = "REBOOTING";
        proxyServer.update(uuid, proxyData).then(() => {
          //Reboot machine
          rebootClient(lan_ip)
            .then(rebootRes => {})
            .catch(err => {
              console.log(
                "Error trying to reset the ip in the main endpoint. Error: ",
                err,
                " For ",
                lan_ip
              );
            });
        });
      });
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
