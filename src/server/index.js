//Need API endpoint that we can hit for the IP of the 4g modem to be reset. AKA Disconnect the device and reconnect it.

const express = require("express");
const os = require("os");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const node_ssh = require("node-ssh");
const SSH = require("simple-ssh");
const shell = require("shelljs");
const requestIp = require("request-ip");
const child_process = require("child_process");
const moment = require("moment-timezone");
const childExec = require("child_process").exec;
let util = require("util");
let exec = util.promisify(childExec);

const app = express();
app.use(bodyParser.json());
app.use(express.static("dist"));
// app.use(requestIp.mw());
app.enable("trust proxy");

const server = app.listen(8080, () => console.log("Listening on port 8080!"));

app.get("/proxy/reset", async function(req, res) {
  const host = req.query["host"];
  const network = req.query["network"];

  console.log(
    "Reset API Endpoint getting hit!",
    "host ip => ",
    host,
    " network => ",
    network,
    "Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );
  try {
    exec(`ssh pi@${host} "sudo nmcli connection up ${network}"`)
      .then(data => {
        res.send(
          `Proxy connection resetting. Please allow 30-60 seconds for the network to re-establish`
        );
        console.log(`Connection to ${host}: ${data.stdout}`);
      })
      .catch(err => {
        console.log("err in the catch => ", err);
      });
  } catch (e) {
    console.log(`Error in the RESET GET request for ${host} => `, e);
  }
});
//`ssh pi@${host} "/usr/bin/squid -k shutdown && echo "" > /var/spool/squid/swap.state && sudo reboot"`
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

  exec(
    `ssh pi@${host} "sudo rm /etc/NetworkManager/system-connections/${network} && echo "Removing and Re-Adding the connection profile for ${network} on ${host}" && sudo nmcli con add con-name ${network} ifname cdc-wdm0 type gsm connection.id ${network} connection.autoconnect-priority 999 gsm.apn ${apn} gsm.number *99# && sleep 5 && sudo reboot"`
  )
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
