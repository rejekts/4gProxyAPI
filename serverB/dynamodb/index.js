const ProxyServer = require('./proxyServer.js');

class DynamoDb {
  constructor(data) {
    this.proxyServer = new ProxyServer(
      {
        accessKeyId: 'AKIAJGHL7PLJSIJO6DBQ',
        secretAccessKey: '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',
        region: 'us-east-1'
      },
      () => {}
    );
    return this.proxyServer;
  }
}

module.exports = DynamoDb;
