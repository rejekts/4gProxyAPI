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

const app = express();

app.use(express.static("dist"));
// app.use(requestIp.mw());
app.enable("trust proxy");

const server = app.listen(8080, () => console.log("Listening on port 8080!"));

app.get("/proxy/reset", function(req, res) {
  const host = req.param("host");
  const network = req.param("network");
  console.log(
    "Reset API Endpoint getting hit!",
    "host ip => ",
    host,
    " network => ",
    network
  );

  child_process.exec(
    `ssh pi@${host} "sudo nmcli connection up ${network}"`,
    (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      } else {
        console.log(`Connection: ${stdout}`);
      }
    }
  );
  res.sendFile(path.join(__dirname + "/resetIndex.html"));
});

app.get("/proxy/reset/hard", function(req, res) {
  const host = req.param("host");
  console.log("Hard Reset API Endpoint getting hit!", "host => ", host);

  child_process.exec(
    `ssh pi@${host} "squid -k shutdown && echo "" > /var/spool/squid/swap.state && sudo reboot"`,
    (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        res.send(
          `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
        );
        return;
      } else {
        console.log(`Connection: ${stdout}`);
      }
    }
  );
});
