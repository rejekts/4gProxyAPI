const ProxyServer = require('../dynamodb/proxyServer');
const AWS = require('aws-sdk');
const config = require('../config/config.js');

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
      accessKeyId: 'AKIARCH7TKA67XLVVCXY',
      secretAccessKey: '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',
      region: 'us-east-1',
    },
    function(re) {}
  );

  await proxyServer;

  var looper = function() {
    //loop through the lan ip range and add the proxies to the table
    for (let i = lanDBlockMin; i <= lanDBlockMax; i++) {
      //set vars
      let lanIP = `192.168.50.${i}`;
      let vpnIP = `172.30.230.${i}`;
      let oldBrowserIP = '1.1.1.1';
      let browserIP = '1.1.1.1';
      // let port = port;
      let proxyIP = lanIP;
      let status = 'CREATED';

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
        })
        .then(rez => {
          console.log(
            'res in the api/proxy POST endpoint after making proxy in dynamodb => ',
            rez.attrs
          );
          return rez;
        })
        .catch(err => {
          if (err) {
            console.log('err => ', err);
          }
        });
    }
  };

  return await looper();
};

module.exports = BatchAddProxies;
