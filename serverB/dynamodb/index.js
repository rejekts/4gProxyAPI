const ProxyServer = require('./proxyServer.js');

class DynamoDb {
  constructor(data) {
    this.proxyServer = new ProxyServer(
      {
        accessKeyId: 'AKIARCH7TKA67XLVVCXY',
        secretAccessKey: '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',
        region: 'us-east-1',
      },
      () => {}
    );
    return this.proxyServer;
  }
}

module.exports = DynamoDb;
