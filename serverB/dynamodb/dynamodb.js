/**
 * Created by 4ant0m on 6/27/18.
 */
let dynamo = require('dynamodb');

class DynamoDb {
    constructor(data) {
        dynamo.AWS.config.update({
            accessKeyId: data.accessKeyId,
            secretAccessKey: data.secretAccessKey,
            region: data.region
        });
        return dynamo;
    };
}

module.exports = DynamoDb;