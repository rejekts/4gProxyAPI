let facebotService = require("./../../../index");
let DynamoDb = require("./../../../lib/dynamodb");
const util = require("util");
const fs = require("fs");

let dynamoDb = new DynamoDb();

module.exports = function(Account) {
  Account.createFBAccs = (ctx, count, cb) => {
    facebotService(count);
    cb(null, `Script for creating ${count} facebook accounts was ran`);
  };

  Account.getFBAccs = (ctx, cb) => {
    dynamoDb.getAll().then(res => {
      cb(null, res);
    });
  };

  Account.getStatus = (ctx, cb) => {
    console.log(`${__dirname}/../logs.log`);
    fs.readFile(`${__dirname}/../../../logs.log`, (err, res) => {
      cb(null, res.toString().split("\n"));
    });
  };

  Account.remoteMethod(`createFBAccs`, {
    isStatic: true,
    http: { path: `/`, verb: `GET` },
    accepts: [
      { arg: `ctx`, type: `object`, http: { source: `context` } },
      { arg: `count`, type: `number` }
    ],
    returns: { type: `object`, root: true }
  });

  Account.remoteMethod(`getStatus`, {
    isStatic: true,
    http: { path: `/status`, verb: `GET` },
    accepts: [{ arg: `ctx`, type: `object`, http: { source: `context` } }],
    returns: { type: `array`, root: true }
  });

  Account.remoteMethod(`getFBAccs`, {
    isStatic: true,
    http: { path: `/facebookAccounts`, verb: `GET` },
    accepts: [{ arg: `ctx`, type: `object`, http: { source: `context` } }],
    returns: { type: `array`, root: true }
  });
};
