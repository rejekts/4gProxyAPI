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

app.get("/api/getUsername", (req, res) =>
  res.send({ username: os.userInfo().username })
);
const server = app.listen(8080, () => console.log("Listening on port 8080!"));

//Using simple-ssh wrapper below
//Original UUID - e101f2c1-0dcd-4ce8-8744-c198faa828d7

app.get("/proxy1", function(req, res) {
  console.log("Redirect to Main IP Page API Endpoint getting hit!", req.ip);
  let iplib = req.clientIp;
  console.log("request-ip lib IP => ", iplib);
  var ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  res.send(`Hello. Your new IP Address is ${ip}`);
});

app.get("/proxy/reset", function(req, res) {
  console.log("Reset API Endpoint getting hit!");
  const host = req.param.host;
  const network = req.param.network;
  console.log("host ip => ", host, " network => ", network);

  // var interfaces = os.networkInterfaces();
  // console.log("Interaces => ", interfaces);
  // var addresses = [];
  // for (var k in interfaces) {
  //   for (var k2 in interfaces[k]) {
  //     var address = interfaces[k][k2];
  //     if (address.family === "IPv4" && !address.internal) {
  //       addresses.push(address.address);
  //     }
  //   }
  // }

  // console.log("Addresses => ", addresses);
  //path.join(__dirname + "/pi1ResetVerizon.sh")

  child_process.execFile(
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

  res.send(`Hello. Your new IP Address is ${ip}`);
});
//sudo nmcli device disconnect cdc-wdm0 && sudo nmcli device connect cdc-wdm0
//Using node-ssh wrapper below

app.get("/proxy1/reset/hard", function(req, res) {
  console.log("Hard Reset API Endpoint getting hit!");

  // shell.exec(
  //   "/home/justin/Dropbox/+++Coding+++/code/Confucius/Proxies/4gProxyAPI/src/server/pi1HardReset.sh"
  // );

  shell.exec(path.join(__dirname + "/pi1HardReset.sh"));

  res.sendFile(path.join(__dirname + "/resetIndex.html"));
});
