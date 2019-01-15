const ProxyServer = require("../dynamodb/proxyServer");
const AWS = require("aws-sdk");
const config = require("../config/config.js");

const BatchAddProxies = async (
  lanDBlockMin,
  lanDBlockMax,
  vpnIPMin,
  vpnIPMax,
  port,
  carrier,
  apn,
  proxyIP
) => {
  AWS.config.update(config.aws_remote_config);

  let proxyServer = await new ProxyServer(
    {
      accessKeyId: "AKIAJJD5Q2EKMTD5LKHQ",
      secretAccessKey: "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",
      region: "us-east-1"
    },
    function(re) {}
  );

  await proxyServer;

  var looper = function() {
    //loop through the lan ip range and add the proxies to the table
    for (let i = lanDBlockMin; i <= lanDBlockMax; i++) {
      //set vars
      let lan_ip = `192.168.50.${i}`;
      let vpn_ip = `172.30.230.${i}`;
      let old_browser_ip = "1.1.1.1";
      let browser_ip = "1.1.1.1";
      // let port = port;
      let proxy_ip = lan_ip;
      let status = "CREATED";

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
          status: status
        })
        .then(rez => {
          console.log(
            "res in the api/proxy POST endpoint after making proxy in dynamodb => ",
            rez.attrs
          );
        })
        .catch(err => {
          if (err) {
            console.log("err => ", err);
          }
        });
    }
  };

  return await looper();
};

module.exports = BatchAddProxies;
