const ProxyServer = require("../dynamodb/proxyServer");
const AWS = require("aws-sdk");
const config = require("../config/config.js");

const Json2csvParser = require("json2csv").Parser;

const printResetURLs = async () => {
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

  let allDetails = await proxyServer.getAll();

  await allDetails;

  allDetails = JSON.parse(JSON.stringify(allDetails.Items));

  console.log("allDetails => ", allDetails);

  const fields = [
    "port",
    "oldBrowserIP",
    "browserIP",
    "proxyServerID",
    "vpnIP",
    "status",
    "createdAt",
    "carrier",
    "lanIp",
    "proxyIP",
    "apn",
    "resetURL"
  ];
  const opts = { fields };
  const parser = new Json2csvParser(opts);
  const csv = await parser.parse(allDetails);

  console.log("allDetails csv => ", csv);

  return await csv;
};

module.exports = printResetURLs;
