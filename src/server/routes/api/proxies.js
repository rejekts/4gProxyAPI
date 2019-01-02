const AWS = require('aws-sdk');
const config = require('../../../config/config.js');
const isDev = process.env.NODE_ENV !== 'production';

module.exports = (app) => {
  // Gets all fruits
  app.get('/api/proxies', (req, res, next) => {
    if (isDev) {
      AWS.config.update(config.aws_local_config);
    } else {
      AWS.config.update(config.aws_remote_config);
    }
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: config.aws_table_name
    };
    docClient.scan(params, function(err, data) {
      if (err) {
        res.send({
          success: false,
          message: 'Error: Server error'
        });
      } else {
        const { Items } = data;
        res.send({
          success: true,
          message: 'Loaded fruits',
          fruits: Items
        });
      }
    });
  }); // end of app.get(/api/fruits)
  // Get a single fruit by id
  app.get('/api/proxy', (req, res, next) => {
    if (isDev) {
      AWS.config.update(config.aws_local_config);
    } else {
      AWS.config.update(config.aws_remote_config);
    }
    const fruitId = req.query.id;
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: config.aws_table_name,
      KeyConditionExpression: 'fruitId = :i',
      ExpressionAttributeValues: {
        ':i': fruitId
      }
    };
    docClient.query(params, function(err, data) {
      if (err) {
        res.send({
          success: false,
          message: 'Error: Server error'
        });
      } else {
        console.log('data', data);
        const { Items } = data;
        res.send({
          success: true,
          message: 'Loaded fruits',
          fruits: Items
        });
      }
    });
  });
  // Add a fruit
  app.post('/api/proxy', (req, res, next) => {
    if (isDev) {
      AWS.config.update(config.aws_local_config);
    } else {
      AWS.config.update(config.aws_remote_config);
    }
    const { type, color } = req.body;
    // Not actually unique and can create problems.
    const fruitId = (Math.random() * 1000).toString();
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: config.aws_table_name,
      Item: {
        fruitId: fruitId,
        fruitType: type,
        color: color
      }
    };
    docClient.put(params, function(err, data) {
      if (err) {
        res.send({
          success: false,
          message: 'Error: Server error'
        });
      } else {
        console.log('data', data);
        const { Items } = data;
        res.send({
          success: true,
          message: 'Added fruit',
          fruitId: fruitId
        });
      }
    });
  });
};


alias gci='git add -A; git commit -m '
alias gbr='git br'
alias galiases='git aliases'
alias gco='git co'
alias ggo='git go'
alias glist='git list'
alias gph='git ph'
alias gpl='git pl'
alias gst='git st'
alias gi='git i'
alias grmc='git rmc'
alias grmb='git rmb'
alias ginmaster='git inmaster'
alias gfth='git fth'
alias gclear='git clear'
alias gsth='git sth'
alias gdf='git df'
alias grs='git rs'
alias gl='git l'