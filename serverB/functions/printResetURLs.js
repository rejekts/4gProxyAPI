const AWS = require('aws-sdk');
const Json2csvParser = require('json2csv').Parser;
const ProxyServer = require('../dynamodb/proxyServer');
const config = require('../config/config.js');

const printResetURLs = async () => {
  AWS.config.update(config.aws_remote_config);

  const proxyServer = await new ProxyServer(
    {
      accessKeyId: 'AKIARCH7TKA67XLVVCXY',
      secretAccessKey: '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',
      region: 'us-east-1',
    },
    re => {}
  );

  await proxyServer;

  let allDetails = await proxyServer.getAll();

  await allDetails;

  allDetails = JSON.parse(JSON.stringify(allDetails.Items));

  console.log('allDetails => ', allDetails);

  const fields = [
    'port',
    'oldBrowserIP',
    'browserIP',
    'proxyServerID',
    'vpnIP',
    'status',
    'createdAt',
    'carrier',
    'lanIp',
    'proxyIP',
    'apn',
    'resetURL',
  ];
  const opts = {
    fields,
  };
  const parser = new Json2csvParser(opts);
  const csv = await parser.parse(allDetails);

  console.log('allDetails csv => ', csv);

  return await csv;
};

module.exports = printResetURLs;
