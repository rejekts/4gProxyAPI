//Need API endpoint that we can hit for the IP of the 4g modem to be reset. AKA Disconnect the device and reconnect it.

const express = require("express");
const os = require("os");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const node_ssh = require("node-ssh");
const SSH = require("simple-ssh");
const shell = require("shelljs");

const app = express();

app.use(express.static("dist"));

app.get("/api/getUsername", (req, res) =>
  res.send({ username: os.userInfo().username })
);
const server = app.listen(3000, () => console.log("Listening on port 3000!"));

//Using simple-ssh wrapper below
//Original UUID - e101f2c1-0dcd-4ce8-8744-c198faa828d7

app.get("/proxy1/reset", function(req, res) {
  console.log("Reset API Endpoint getting hit!");

  shell.exec(
    "/home/justin/Dropbox/+++Coding+++/code/Confucius/Proxies/4gProxyAPI/src/server/pi1Reset.sh"
  );

  res.send("Service is being reset.");
});
//sudo nmcli device disconnect cdc-wdm0 && sudo nmcli device connect cdc-wdm0
//Using node-ssh wrapper below

app.get("/proxy1/reset/hard", function(req, res) {
  console.log("Hard Reset API Endpoint getting hit!");

  shell.exec(
    "/home/justin/Dropbox/+++Coding+++/code/Confucius/Proxies/4gProxyAPI/src/server/pi1HardReset.sh"
  );

  res.send("Service is being reset.");
});
