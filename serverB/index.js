//This is the API serverB file. It handles all threading and execution of instructions sent from serverA

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const child_process = require("child_process");
const moment = require("moment-timezone");
const childExec = require("child_process").exec;
const util = require("util");
const exec = util.promisify(childExec);
const app = express();
const AWS = require("aws-sdk");
const config = require("./config/config.js");
const isDev = process.env.NODE_ENV !== "production";

const ProxyServer = require("./dynamodb/proxyServer");
const grabClientIP = require("./functions/grabClientIP");
const rebootClient = require("./functions/rebootClient");
const resetClientIPAddress = require("./functions/resetClientIPAddress");
const BatchAddProxies = require("./functions/batchAddProxies");
const printResetURLs = require("./functions/printResetURLs");

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
app.use(express.static(path.join(__dirname, "/../client/build")));

const server = app.listen(10080, () =>
  console.log("ServerB Listening on port 10080!")
);

AWS.config.update(config.aws_remote_config);

const proxyServer = new ProxyServer(
  {
    accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
    secretAccessKey: "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",
    region: "us-east-1"
  },
  function(re) {}
);

app.get("/", function(req, res) {
  res.status(200).send("Nothing to see here.");
});

//get all proxies from dynamodb
app.get("/api/proxy/list", function(req, res) {
  // AWS.config.update(config.aws_remote_config);

  proxyServer
    .getAll()
    .then(pr => {
      console.log("Get all proxies from dynamodb in serverB => ", pr);
      res.status(200).send(pr);
    })
    .catch(err => {
      if (err) {
        console.log("err => ", err);
      }
    });
});

// Get a single proxy by proxyServerID
app.get("/api/proxy", (req, res, next) => {
  console.log("UUID in serverB => ", req.query);
  let proxyServerID = req.query.proxyServerID;

  proxyServer
    .get(proxyServerID)
    .then(pr => {
      console.log("Get a single proxy from dynamodb => ", pr);
      res.status(200).send(pr);
    })
    .catch(err => {
      if (err) {
        console.log("err => ", err);
      }
    });
});

//add new proxy to the dynamo db
app.post("/api/proxy/add", (req, res, next) => {
  // AWS.config.update(config.aws_remote_config);

  const {
    lanIP,
    vpnIP,
    proxyIP,
    oldBrowserIP,
    browserIP,
    port,
    carrier,
    apn,
    status,
    resetURL
  } = req.body;

  console.log(
    "api/proxy/add API  Endpoint getting hit in serverA! Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss"),
    " req.body => ",
    req.body
  );

  proxyServer
    .create({
      lanIP: lanIP,
      vpnIP: vpnIP,
      proxyIP: proxyIP,
      oldBrowserIP: oldBrowserIP,
      browserIP: browserIP,
      port: port,
      carrier: carrier,
      apn: apn,
      status: status,
      resetURL: resetURL
    })
    .then(rez => {
      console.log(
        "res in the api/proxy POST endpoint after making proxy in dynamodb => ",
        rez.attrs
      );
      res
        .status(200)
        .send(`New record created in dynamodb => ${JSON.stringify(rez.attrs)}`);
    })
    .catch(err => {
      if (err) {
        console.log("err => ", err);
      }
    });
});

//print all reset urls
app.get("/api/proxy/printResetURLs", (req, res, next) => {
  printResetURLs()
    .then(rez => {
      console.log(
        "Rez in the /api/proxy/printResetURLs endpoint in serverB => ",
        rez
      );
      res.attachment("proxyData.csv");
      res.status(200).send(rez);
    })
    .catch(error => {
      if (error) {
        console.log(
          "error in the /api/proxy/printResetURLs endpoint => ",
          error
        );
      }
    });
});

//batch add proxies
app.post("/api/proxy/batch_add", (req, res, next) => {
  const {
    lanDBlockMin,
    lanDBlockMax,
    vpnIPMin,
    vpnIPMax,
    port,
    carrier,
    apn,
    proxyIP
  } = req.body;

  BatchAddProxies(
    lanDBlockMin,
    lanDBlockMax,
    vpnIPMin,
    vpnIPMax,
    port,
    carrier,
    apn,
    proxyIP
  )
    .then(rez => {
      console.log(
        "Rez in the /api/batch_add/proxies endpoint in serverB => ",
        rez
      );
      res.status(200).send(`Completed batch addition of proxies => ${rez}`);
    })
    .catch(error => {
      if (error) {
        console.log("error in the /api/batch_add/proxies endpoint => ", error);
      }
    });
});

// Update a proxy by proxyServerID
app.put("/api/proxy/update", (req, res, next) => {
  // AWS.config.update(config.aws_remote_config);

  const {
    proxyServerID,
    lanIP,
    vpnIP,
    proxyIP,
    oldBrowserIP,
    browserIP,
    port,
    carrier,
    apn,
    status,
    resetURL
  } = req.body;

  proxyServer
    .update(proxyServerID, {
      lanIP: lanIP,
      vpnIP: vpnIP,
      proxyIP: proxyIP,
      oldBrowserIP: oldBrowserIP,
      browserIP: browserIP,
      port: port,
      carrier: carrier,
      apn: apn,
      status: status,
      resetURL: resetURL
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
            rez.attrs.proxyServerID
          }. New attrs are => ${JSON.stringify(rez.attrs)}`
        );
    })
    .catch(err => {
      if (err) {
        console.log("err => ", err);
      }
    });
});

//get browserIP from client and update dynamodb
app.get("/api/proxy/browserIPFromDb", function(req, res) {
  // AWS.config.update(config.aws_remote_config);
  let proxyServerID = req.query.proxyServerID;

  proxyServer
    .get(proxyServerID)
    .then(pr => {
      res.status(200).send(pr);
    })
    .catch(err => {
      res.status(200).send(pr);
    });
});

//get browserIP from client and update dynamodb
app.get("/api/proxy/browserIP", function(req, res) {
  // AWS.config.update(config.aws_remote_config);
  let proxyServerID = req.query.proxyServerID;
  let status = req.query.status;
  let proxyData = {};
  let browserIPBeforeUpdating;

  proxyServer
    .get(proxyServerID)
    .then(async pr => {
      let host = pr.lanIP;
      proxyData = pr;
      browserIPBeforeUpdating = pr.browserIP;
      // console.log(
      //   "Get current browserIP from dynamodb in serverB => ",
      //   pr.browserIP
      // );
      return await grabClientIP(host);
    })
    .then(currentIP => {
      //check if status is REBOOTING and turn to complete if IP is different than it was.catch((error) => {
      if (
        (browserIPBeforeUpdating !== currentIP &&
          proxyData.status === "REBOOTING") ||
        (browserIPBeforeUpdating !== currentIP &&
          proxyData.status === "RESETTING")
      ) {
        status = "COMPLETE";
      }

      proxyData = JSON.parse(JSON.stringify(proxyData));

      let updateData = {
        lanIP: proxyData.lanIP,
        vpnIP: proxyData.vpnIP,
        proxyIP: proxyData.proxyIP,
        oldBrowserIP: proxyData.oldBrowserIP,
        browserIP: currentIP,
        port: proxyData.port,
        carrier: proxyData.carrier,
        apn: proxyData.apn,
        status: status !== undefined ? status : proxyData.status,
        resetURL: proxyData.resetURL
      };
      proxyServer
        .update(proxyServerID, updateData)
        .then(IPUpdateRez => {
          console.log("IPUpdateRez => ", IPUpdateRez.attrs);
          res.status(200).send(IPUpdateRez.attrs);
        })
        .catch(err => {
          if (err) {
            console.log("err => ", err);
          }
        });
    })
    .catch(err => {
      console.log("err in /api/proxy/browserIP => ", err);
      res.status(200).send(proxyData);
    });
});

//Main endpoint for resetting the browser ip on the proxy server
app.get("/api/proxy/reset", function(req, res) {
  // AWS.config.update(config.aws_remote_config);
  let proxyServerID = req.query.proxyServerID;
  let oldIP;
  // let newData;

  console.log(
    "Reset API Endpoint getting hit!",
    "proxyServerID => ",
    proxyServerID,
    " Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  //go through the reset procedures in order AND update the instructions and the status/ ip in the db on the way
  //-------------------------------------------------------

  proxyServer.get(proxyServerID).then(proxyData => {
    proxyData = JSON.parse(JSON.stringify(proxyData));
    let {
      lanIP,
      vpnIP,
      proxyIP,
      oldBrowserIP,
      browserIP,
      port,
      carrier,
      apn,
      status,
      resetURL
    } = proxyData;
    proxyData.status = "PENDING";

    proxyServer
      .update(proxyServerID, proxyData)
      .then(data => {
        console.log(
          "Response from db after updating status to pending in the reset method newData: ",
          data.attrs
        );

        let newData = JSON.parse(JSON.stringify(data.attrs));

        let {
          lanIP,
          vpnIP,
          proxyIP,
          oldBrowserIP,
          browserIP,
          port,
          carrier,
          apn,
          status,
          resetURL
        } = newData;

        //grab the current client IP
        grabClientIP(lanIP)
          .then(ip => {
            console.log(
              "IP in the grabClientIP method in the resetClient endpoint BEFORE running reset => ",
              ip
            );
            if (!ip) {
              ip = browserIP;
            }
            oldIP = ip;
            newData.oldBrowserIP = ip;
            newData.browserIP = ip;
            newData.status = "RESETTING";
            console.log("newData before RESETTING? => ", newData);
            //store the current IP in the db IF its different AND set the status of the proxy to running

            proxyServer
              .update(proxyServerID, newData)
              .then(results => {
                console.log(
                  "results after updating the old browser ip before running reset => ",
                  results.attrs
                );
                let newData2 = JSON.parse(JSON.stringify(results.attrs));

                let {
                  lanIP,
                  vpnIP,
                  proxyIP,
                  oldBrowserIP,
                  browserIP,
                  port,
                  carrier,
                  apn,
                  status,
                  resetURL
                } = newData2;

                //run all reset methods
                resetClientIPAddress(lanIP, carrier, oldIP)
                  .then(resetClientNewIP => {
                    console.log(
                      "Success!! newIP in the endpoint!! => ",
                      resetClientNewIP,
                      " For ",
                      lanIP
                    );

                    //update the db with COMPLETE status and new IP
                    newData2.browserIP = resetClientNewIP;
                    newData2.status = "COMPLETE";

                    console.log(
                      "newData2 after successful reset of IP => ",
                      newData2
                    );
                    proxyServer
                      .update(proxyServerID, newData2)
                      .then(successfulResetUpdateRez => {
                        console.log(
                          "successfulResetUpdateRez => ",
                          successfulResetUpdateRez.attrs
                        );
                        // res.status(200).send(resetClientNewIP);
                      })
                      .catch(err => {
                        if (err) {
                          console.log(
                            "err calling proxyServer update after running resetClientIPAddress => ",
                            err
                          );
                        }
                      });
                  })
                  .catch(error => {
                    console.log(
                      "error calling the resetClientIPAddress method => ",
                      error
                    );

                    //Update the db that there was an error and that we are rebooting the proxy server hardware
                    newData2.status = "REBOOTING";
                    console.log("newData2 before REBOOTING => ", newData2);
                    proxyServer
                      .update(proxyServerID, newData2)
                      .then(data => {
                        console.log(
                          "Response from db after updating status before rebooting in the reset method catch => ",
                          data.attrs
                        );
                        rebootClient(lanIP)
                          .then(rebootRes => {
                            console.log(
                              "results from running reboot method => ",
                              rebootRes
                            );
                          })
                          .catch(err => {
                            console.log(
                              "rebooting error in the reset method => ",
                              err
                            );
                          });
                      })
                      .catch(err => {
                        if (err) {
                          console.log("err => ", err);
                        }
                      });
                  });
              })
              .catch(error => {
                console.log(
                  "error calling proxyServer.update after grabbing clientIP => ",
                  error
                );
              });
          })
          .catch(err => {
            console.log(
              "error calling grabClientIP method. We are rebooting now => ",
              err
            );
            //Need to reboot here
            newData.status = "REBOOTING";
            console.log("newData before REBOOTING => ", newData);
            proxyServer
              .update(proxyServerID, newData)
              .then(data => {
                console.log(
                  "Response from db after updating status before rebooting in the reset method catch => ",
                  data.attrs
                );
                rebootClient(lanIP)
                  .then(rebootRes => {
                    console.log(
                      "results from running reboot method => ",
                      rebootRes
                    );
                  })
                  .catch(err => {
                    console.log("rebooting error in the reset method => ", err);
                  });
              })
              .catch(err => {
                if (err) {
                  console.log("err => ", err);
                }
              });
          });
      })
      .catch(error => {
        console.log("error calling proxyserver.get(proxyServerID) => ", error);
        //Need to send error to front end asking for correct proxyServerID or url
      });
    res.status(200).send("Running reset procedures");
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

//catchall to send all other traffic than endpoints above to the react app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/../client/build/index.html"));
});
