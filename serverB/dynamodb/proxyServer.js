let uuidv1 = require("uuid/v4"),
  Dynamo = require("./dynamodb.js");
const Joi = require("joi");
const Logger = require("../log");

let logger = new Logger({ context: "DYNAMO DB" });

class ProxyServer {
  constructor(data, cb) {
    this.dynamo = new Dynamo({
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey,
      region: data.region
    });

    this.pr = this.dynamo.define("ProxyServer", {
      hashKey: "proxyServerID",
      // add the timestamp attributes (updatedAt, createdAt)
      timestamps: true,
      schema: {
        proxyServerID: this.dynamo.types.uuid(),
        lanIP: Joi.string(),
        vpnIP: Joi.string(),
        proxyIP: Joi.string(),
        oldBrowserIP: Joi.string(),
        browserIP: Joi.string(),
        port: Joi.string(),
        carrier: Joi.string(),
        apn: Joi.string(),
        status: Joi.string(),
        resetURL: Joi.string()
      },
      indexes: [
        {
          hashKey: "port",
          name: "port-index",
          type: "global"
        },
        {
          hashKey: "lanIP",
          name: "lanIP-index",
          type: "global"
        }
      ]
    });

    this.dynamo.createTables(function(err) {
      if (err) {
        logger.error("Error creating tables: ", JSON.stringify(err, null, 2));
      } else {
        cb(this);
        logger.info("Tables have been created");
      }
    });
    return this;
  }

  create(data) {
    let proxyServerID = uuidv1();
    return new Promise((resolve, reject) => {
      this.pr.create(
        {
          proxyServerID: proxyServerID,
          lanIP: data.lanIP,
          vpnIP: data.vpnIP,
          proxyIP: data.proxyIP,
          oldBrowserIP: data.oldBrowserIP,
          browserIP: data.browserIP,
          port: data.port,
          carrier: data.carrier,
          apn: data.apn,
          status: data.status,
          resetURL: `http://proxy2.confucius.marketing/reset/${proxyServerID}`
        },
        (err, res) => {
          if (err) {
            logger.error(err);
            reject(err);
          }
          logger.info(
            `Proxy data was written in dynamoDB: ${JSON.stringify(res, 4, "")}`
          );
          // console.log("Creating proxies in DynamoDb => ", res);
          resolve(res);
        }
      );
    });
  }
  //possibly change the ability to update anything but the browserIPs and the status
  update(proxyServerID, data) {
    // console.log("data in the update of the proxyServer class => ", data);
    return new Promise((resolve, reject) => {
      this.pr.update(
        {
          proxyServerID: proxyServerID,
          lanIP: data.lanIP,
          vpnIP: data.vpnIP,
          proxyIP: data.proxyIP,
          oldBrowserIP: data.oldBrowserIP,
          browserIP: data.browserIP,
          port: data.port,
          carrier: data.carrier,
          apn: data.apn,
          status: data.status,
          resetURL: data.resetURL
        },
        (err, res) => {
          if (err) {
            logger.error(err);
            reject(err);
          }
          logger.info("Proxies field was updated:", res);
          resolve(res);
        }
      );
    });
  }

  get(proxyServerID) {
    return new Promise((resolve, reject) => {
      this.pr.get(
        proxyServerID,
        {
          ConsistentRead: true,
          AttributesToGet: [
            "proxyServerID",
            "lanIP",
            "vpnIP",
            "proxyIP",
            "oldBrowserIP",
            "browserIP",
            "port",
            "carrier",
            "apn",
            "status",
            "resetURL",
            "createdAt",
            "updatedAt"
          ]
        },
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            if (res !== null) {
              resolve(res.toJSON());
            }
          }
        }
      );
    });
  }

  query(idxName, idx) {
    return new Promise((resolve, reject) => {
      this.pr
        .query(idx)
        .usingIndex(`${idxName}-index`)
        .exec((err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.Items);
          }
        });
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.pr
        .scan()
        .loadAll()
        .exec((err, res) => {
          if (err) reject(err);
          resolve(res);
        });
    });
  }
}

module.exports = ProxyServer;
