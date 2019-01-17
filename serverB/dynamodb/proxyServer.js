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
      hashKey: "uuid",
      // add the timestamp attributes (updatedAt, createdAt)
      timestamps: true,
      schema: {
        uuid: this.dynamo.types.uuid(),
        lanIP: Joi.string(),
        vpnIP: Joi.string(),
        proxyIP: Joi.string(),
        oldBrowserIP: Joi.string(),
        browserIP: Joi.string(),
        port: Joi.string(),
        carrier: Joi.string(),
        apn: Joi.string(),
        status: Joi.string()
      }
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
    let uuid = uuidv1();
    return new Promise((resolve, reject) => {
      this.pr.create(
        {
          uuid: uuid,
          lanIP: data.lanIP,
          vpnIP: data.vpnIP,
          proxyIP: data.proxyIP,
          oldBrowserIP: data.oldBrowserIP,
          browserIP: data.browserIP,
          port: data.port,
          carrier: data.carrier,
          apn: data.apn,
          status: data.status
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
  update(uuid, data) {
    // console.log("data in the update of the proxyServer class => ", data);
    return new Promise((resolve, reject) => {
      this.pr.update(
        {
          uuid: uuid,
          lanIP: data.lanIP,
          vpnIP: data.vpnIP,
          proxyIP: data.proxyIP,
          oldBrowserIP: data.oldBrowserIP,
          browserIP: data.browserIP,
          port: data.port,
          carrier: data.carrier,
          apn: data.apn,
          status: data.status
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

  get(uuid) {
    return new Promise((resolve, reject) => {
      this.pr.get(
        uuid,
        {
          ConsistentRead: true,
          AttributesToGet: [
            "uuid",
            "lanIP",
            "vpnIP",
            "proxyIP",
            "oldBrowserIP",
            "browserIP",
            "port",
            "carrier",
            "apn",
            "status",
            "createdAt",
            "updatedAt"
          ]
        },
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.toJSON());
          }
        }
      );
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
