const ProxyServer = require('./proxyServer.js');

class DynamoDb {
  constructor(data) {
    this.proxyServer = new ProxyServer(
      {
        accessKeyId: 'REDACTED',
        secretAccessKey: 'REDACTED',
        region: 'us-east-1',
      },
      () => {}
    );
    return this.proxyServer;
  }
}

module.exports = DynamoDb;
