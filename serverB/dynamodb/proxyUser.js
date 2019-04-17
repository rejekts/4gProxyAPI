const uuidv1 = require('uuid/v4');

const Joi = require('joi');
const Dynamo = require('./dynamodb.js');
const Logger = require('../log');

const logger = new Logger({
  context: 'DYNAMO DB',
});

class ProxyUser {
  constructor(data, cb) {
    this.dynamo = new Dynamo({
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey,
      region: data.region,
    });

    this.pr = this.dynamo.define('ProxyUser', {
      hashKey: 'proxyUserID',
      // add the timestamp attributes (updatedAt, createdAt)
      timestamps: true,
      schema: {
        proxyUserID: this.dynamo.types.uuid(),
        firstName: Joi.string(),
        lastName: Joi.string(),
        email: Joi.string().email({
          minDomainAtoms: 2,
        }),
        password: Joi.string(),
        plans: Joi.object({
          plan1NameNEEDEDHERE: Joi.object({
            isActive: Joi.boolean(),
            price: Joi.string(),
            planID: Joi.string(),
            expirationDate: Joi.string(),
            paymentMethod: Joi.string(),
          }),
          plan2NameNEEDEDHERE: Joi.object({
            isActive: Joi.boolean(),
            price: Joi.string(),
            planID: Joi.string(),
            expirationDate: Joi.string(),
            paymentMethod: Joi.string(),
          }),
          plan3NameNEEDEDHERE: Joi.object({
            isActive: Joi.boolean(),
            price: Joi.string(),
            planID: Joi.string(),
            expirationDate: Joi.string(),
            paymentMethod: Joi.string(),
          }),
        }),
      },
      indexes: [
        {
          hashKey: 'email',
          name: 'email-index',
          type: 'global',
        },
        {
          hashKey: 'lastName',
          name: 'lastName-index',
          type: 'global',
        },
      ],
    });

    this.dynamo.createTables(function(err) {
      if (err) {
        logger.error('Error creating tables: ', JSON.stringify(err, null, 2));
      } else {
        cb(this);
        logger.info('Tables have been created');
      }
    });
    return this;
  }

  create(data) {
    const proxyUserID = uuidv1();
    return new Promise((resolve, reject) => {
      this.pr.create(
        {
          proxyUserID,
          lanIP: data.lanIP,
          vpnIP: data.vpnIP,
          proxyIP: data.proxyIP,
          oldBrowserIP: data.oldBrowserIP,
          browserIP: data.browserIP,
          port: data.port,
          carrier: data.carrier,
          apn: data.apn,
          status: data.status,
          resetURL: `http://api.proxypi.me/reset/${proxyUserID}`,
        },
        (err, res) => {
          if (err) {
            logger.error(err);
            reject(err);
          }
          logger.info(
            `Proxy data was written in dynamoDB: ${JSON.stringify(res, 4, '')}`
          );
          // console.log("Creating proxies in DynamoDb => ", res);
          resolve(res);
        }
      );
    });
  }

  // possibly change the ability to update anything but the browserIPs and the status
  update(proxyUserID, data) {
    // console.log("data in the update of the proxyUser class => ", data);
    return new Promise((resolve, reject) => {
      this.pr.update(
        {
          proxyUserID,
          lanIP: data.lanIP,
          vpnIP: data.vpnIP,
          proxyIP: data.proxyIP,
          oldBrowserIP: data.oldBrowserIP,
          browserIP: data.browserIP,
          port: data.port,
          carrier: data.carrier,
          apn: data.apn,
          status: data.status,
          resetURL: data.resetURL,
        },
        (err, res) => {
          if (err) {
            logger.error(err);
            reject(err);
          }
          logger.info('Proxies field was updated:', res);
          resolve(res);
        }
      );
    });
  }

  get(proxyUserID) {
    return new Promise((resolve, reject) => {
      this.pr.get(
        proxyUserID,
        {
          ConsistentRead: true,
          AttributesToGet: [
            'proxyUserID',
            'lanIP',
            'vpnIP',
            'proxyIP',
            'oldBrowserIP',
            'browserIP',
            'port',
            'carrier',
            'apn',
            'status',
            'resetURL',
            'createdAt',
            'updatedAt',
          ],
        },
        (err, res) => {
          if (err) {
            reject(err);
          } else if (res !== null) {
            resolve(res.toJSON());
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

module.exports = ProxyUser;
