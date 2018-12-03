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

app.use(express.static("dist"));
// app.use(requestIp.mw());
app.enable("trust proxy");

const server = app.listen(8080, () => console.log("Listening on port 8080!"));

app.get("/proxy/reset", async function(req, res) {
  const host = req.param("host");
  const network = req.param("network");

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
      .then(() => {
        res.send(
          `Proxy connection resetting. Please allow 30-60 seconds for the network to re-establish`
        );
        console.log(`Connection to ${host}: ${stdout}`);
      })
      .catch(err => {
        console.log("err in the catch => ", err);
        console.log(`Connection to ${host}: ${stdout}`);
        res.send(
          `Proxy connection resetting. Please allow 30-60 seconds for the network to re-establish`
        );
      });

    // exec(
    //   `ssh pi@${host} "sudo nmcli connection up ${network}"`,
    //   (error, stdout) => {
    //     if (error) {
    //       console.error(`exec error: ${error}`);
    //       res.send(
    //         `Proxy connection resetting. Please allow 30-60 seconds for the network to re-establish`
    //       );
    //       return;
    //     } else {
    //       res.send(
    //         `Proxy connection resetting. Please allow 30-60 seconds for the network to re-establish`
    //       );
    //       // res.sendFile(path.join(__dirname + "/resetIndex.html"));
    //       console.log(`Connection to ${host}: ${stdout}`);
    //     }
    //   }
    // );
  } catch (e) {
    console.log(`Error in the RESET GET request for ${host} => `, e);
  }
});
//`ssh pi@${host} "/usr/bin/squid -k shutdown && echo "" > /var/spool/squid/swap.state && sudo reboot"`
app.get("/proxy/reset/hard", function(req, res) {
  const host = req.param("host");
  console.log(
    "Hard Reset API Endpoint getting hit!",
    "host => ",
    host,
    "Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  exec(`ssh pi@${host} "sudo reboot"`, (error, stdout) => {
    if (error) {
      console.error(`exec error: ${error}`);
      res.send(
        `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
      );
      return;
    } else {
      console.log(`Connection to ${host}: ${stdout}`);
      res.send(
        `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
      );
    }
  });
});

app.get("/proxy/reset/clear-cache", function(req, res) {
  const host = req.param("host");
  console.log(
    "Clear Cache API Endpoint getting hit!",
    "host => ",
    host,
    "Time => ",
    moment().format("YYYY-MM-DDTHH:mm:ss")
  );

  exec(
    `ssh pi@${host} "sudo /usr/local/bin/clearAndHardReset.sh"`,
    (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        res.send(
          `Proxy Server Clearing Cache, Rebuilding and Rebooting. Please allow 60-90 seconds for the network to re-establish`
        );
        return;
      } else {
        console.log(`Connection to ${host}: ${stdout}`);
        res.send(
          `Proxy Server Clearing Cache, Rebuilding and Rebooting. Please allow 60-90 seconds for the network to re-establish`
        );
      }
    }
  );
});
