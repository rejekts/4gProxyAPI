//Need API endpoint that we can hit for the IP of the 4g modem to be reset. AKA Disconnect the device and reconnect it.

const express = require("express");
const os = require("os");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const node_ssh = require("node-ssh");

const app = express();

app.use(express.static("dist"));

app.get("/api/getUsername", (req, res) =>
  res.send({ username: os.userInfo().username })
);
const server = app.listen(3000, () => console.log("Listening on port 3000!"));

app.get("/proxy1/reset", function(req, res) {
  let ssh = new node_ssh();
  ssh
    .connect({
      host: "pi@172.30.230.10",
      username: "pi",
      port: 22,
      passphrase: "HopefullyNot1!",
      privateKey: "/home/justin/.ssh/jsid_rsa"
    })
    .then(() => {
      ssh.exec(
        "sudo nmcli device disconnect cdc-wdm0 && sudo nmcli device connect cdc-wdm0"
      );
    })
    .catch(err => {
      if (err) {
        console.error("err in the ssh => ", err);
      }
    });
});
