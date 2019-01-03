//Need API endpoint that we can hit for the IP of the 4g modem to be reset. AKA Disconnect the device and reconnect it.

const express = require("express");
const bodyParser = require("body-parser");
const child_process = require("child_process");
const moment = require("moment-timezone");
const childExec = require("child_process").exec;
const util = require("util");
const exec = util.promisify(childExec);
const mysql = require("promise-mysql");
const DynamoDb = require("./dynamodb");
const app = express();
const AWS = require("aws-sdk");
const config = require("./config/config.js");
const isDev = process.env.NODE_ENV !== "production";

const ProxyServer = require("./dynamodb/proxyServer");
const grabClientIP = require("./functions/grabClientIP");
const rebootClient = require("./functions/rebootClient");
const resetClientIPAddress = require("./functions/resetClientIPAddress");

let dynamoDb = new DynamoDb();

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

//get all proxies from dynamodb
app.get("/api/proxies", function(req, res) {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }

  let proxyServer = new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  proxyServer.getAll().then(pr => {
    console.log("Get all proxies from dynamodb => ", pr);
    res.status(200).send(pr);
  });
});

// Update a proxy by uuid
app.put("/api/proxy", (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }

  const {
    uuid,
    lan_ip,
    vpn_ip,
    proxy_ip,
    port,
    carrier,
    apn,
    status
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
      port: port,
      carrier: carrier,
      apn: apn,
      status: status
    })
    .then(rez => {
      console.log(
        "res in the api/proxy POST endpoint after making proxy in dynamodb => ",
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

// Get a single proxy by uuid
app.get("/api/proxy", (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }

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
app.post("/api/proxy", (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }

  const { lan_ip, vpn_ip, proxy_ip, port, carrier, apn, status } = req.body;
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
      port: port,
      carrier: carrier,
      apn: apn,
      status: status
    })
    .then(rez => {
      console.log(
        "res in the api/proxy POST endpoint after making proxy in dynamodb => ",
        rez.attrs
      );
      res
        .status(200)
        .send(`New record created in dynamodb => ${rez.attrs.uuid}`);
    });
});

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
    console.log(
      "Return of oldIP in the /proxy/reset endpoint => ",
      ip,
      " For ",
      host
    );
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
                err,
                " For ",
                host
              );
              rebootClient(host)
                .then(rebootRes => {
                  // res
                  //   .status(200)
                  //   .send(
                  //     `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                  //   );
                })
                .catch(err => {
                  console.log(
                    "Error trying to reset the ip in the main endpoint. Error: ",
                    err,
                    " For ",
                    host
                  );
                  // res
                  //   .status(255)
                  //   .send(
                  //     `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
                  //   );
                });
              // if (err.stderr.indexOf("closed by remote host") >= 0) {
              //   res
              //     .status(255)
              //     .send(
              //       `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
              //     );
              // } else {
              //   rebootClient(host)
              //     .then(rebootRes => {
              //       res
              //         .status(200)
              //         .send(
              //           `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
              //         );
              //     })
              //     .catch(err => {
              //       console.log(
              //         "Error trying to reset the ip in the main endpoint. Error: ",
              //         err
              //       );
              //       res
              //         .status(255)
              //         .send(
              //           `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
              //         );
              //     });
              // }
            } else {
              console.log(
                "Success!! newIP in the endpoint!! => ",
                ip,
                " For ",
                host
              );
              // res
              //   .status(200)
              //   .send(
              //     `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
              //   );
            }
          });
          // res
          //   .status(200)
          //   .send(
          //     `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
          //   );
          // return oldIP;
          res
            .status(200)
            .send(
              `Your IP address is being reset. Your oldIP is ${oldIP}. Please allow up to 3 - 5 minutes for the machine to reset and check the new IP address at https://ipfingerprints.com`
            );
        }
      });
    } else {
      oldIP = ip;
      resetClientIPAddress(host, network, oldIP, (err, ip) => {
        if (err) {
          console.log(
            "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
            err,
            " For ",
            host
          );
          rebootClient(host)
            .then(rebootRes => {
              // res
              //   .status(200)
              //   .send(
              //     `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
              //   );
            })
            .catch(err => {
              console.log(
                "Error trying to reset the ip in the main endpoint. Error: ",
                err,
                " For ",
                host
              );
              // res
              //   .status(255)
              //   .send(
              //     `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
              //   );
            });
          // if (err.stderr.indexOf("closed by remote host") >= 0) {
          //   res
          //     .status(255)
          //     .send(
          //       `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
          //     );
          // } else {
          //   rebootClient(host)
          //     .then(rebootRes => {
          //       // res
          //       //   .status(200)
          //       //   .send(
          //       //     `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
          //       //   );
          //     })
          //     .catch(err => {
          //       console.log(
          //         "Error trying to reset the ip in the main endpoint. Error: ",
          //         err
          //       );
          //       // res
          //       //   .status(255)
          //       //   .send(
          //       //     `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
          //       //   );
          //     });
          // }
        } else {
          console.log(
            "Success!! newIP in the endpoint!! => ",
            ip,
            " For ",
            host
          );
          // res
          //   .status(200)
          //   .send(
          //     `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
          //   );
        }
      });
      // return oldIP;
      res
        .status(200)
        .send(
          `Your IP address is being reset. Your oldIP is ${oldIP}. Please allow up to 3 - 5 minutes for the machine to reset and check the new IP address at https://ipfingerprints.com`
        );
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
