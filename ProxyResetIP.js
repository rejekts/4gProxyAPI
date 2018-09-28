//Need API endpoint that we can hit for the IP of the 4g modem to be reset. AKA Disconnect the device and reconnect it.

var path, node_ssh, ssh, fs;
const express = require("express");
const os = require("os");
fs = require("fs");
path = require("path");
node_ssh = require("node-ssh");

const app = express();

app.use(express.static("dist"));
app.get("/api/getUsername", (req, res) =>
  res.send({ username: os.userInfo().username })
);
app.listen(80, () => console.log("Listening on port 8080!"));

ssh = new node_ssh();

ssh.connect({
  host: "localhost",
  username: "steel",
  privateKey: "/home/steel/.ssh/id_rsa"
});
