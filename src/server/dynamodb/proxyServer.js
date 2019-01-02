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

    this.proxy = this.dynamo.define("ProxyServer", {
      hashKey: "uuid",
      // add the timestamp attributes (updatedAt, createdAt)
      timestamps: true,
      schema: {
        uuid: this.dynamo.types.uuid(),
        lan_ip: Joi.string(),
        vpn_ip: Joi.string(),
        proxy_ip: Joi.string(),
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
        logger.info("Tables has been created");
      }
    });
    return this;
  }

  create(data) {
    let uuid = uuidv1();
    return new Promise((resolve, reject) => {
      this.proxy.create(
        {
          uuid: this.dynamo.types.uuid(),
          lan_ip: Joi.string(),
          vpn_ip: Joi.string(),
          proxy_ip: Joi.string(),
          port: Joi.string(),
          carrier: Joi.string(),
          apn: Joi.string(),
          status: Joi.string()
        },
        (err, res) => {
          if (err) {
            logger.error(err);
            reject(err);
          }
          logger.info(
            `Account data was written in dynamoDB: ${JSON.stringify(
              res,
              4,
              ""
            )}`
          );
          resolve(res);
        }
      );
    });
  }

  update(uuid, data) {
    return new Promise((resolve, reject) => {
      this.proxy.update(
        {
          uuid: this.dynamo.types.uuid(),
          lan_ip: Joi.string(),
          vpn_ip: Joi.string(),
          proxy_ip: Joi.string(),
          port: Joi.string(),
          carrier: Joi.string(),
          apn: Joi.string(),
          status: Joi.string()
        },
        (err, res) => {
          if (err) {
            logger.error(err);
            reject(err);
          }
          logger.info("Account's field was updated:", res);
          resolve(res);
        }
      );
    });
  }

  get(uuid) {
    return new Promise((resolve, reject) => {
      this.proxy.get(
        uuid,
        {
          ConsistentRead: true,
          AttributesToGet: [
            "uuid",
            "lan_ip",
            "vpn_ip",
            "proxy_ip",
            "port",
            "carrier",
            "apn",
            "status"
          ]
        },
        (err, res) => {
          if (err) reject(err);
          resolve(res.toJSON());
        }
      );
    });
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.proxy
        .scan()
        .loadAll()
        .exec((err, res) => {
          if (err) reject(err);
          resolve(res);
        });
    });
  }
}

module.exports = Proxy;
