"use strict";

var mysql = require("promise-mysql");

var config = require("./config/config.json");
var username = config.username;
var password = config.password;
var database = config.database;
var guid = config.guid || "";
var env = config.env;
var server = env !== "dev" ? config.host : "127.0.0.1";

var connection;

exports.init = async function connector(multiple) {
  //console.log('Connecting to DB Environment: ', env, ' | server: ', server);
  multiple = typeof multiple !== "undefined" ? multiple : false;

  if (multiple) {
    connection = await mysql
      .createConnection({
        host: server,
        user: username,
        password: password,
        database: database,
        charset: "utf8mb4",
        multipleStatements: true
      })
      .then(conn => {
        // console.log("Connection Made!", conn);
        return conn;
      })
      .catch(err => {
        console.log("DB ERROR: ", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
          connector(multiple);
        } else {
          throw err;
        }
      });
  } else {
    connection = await mysql
      .createConnection({
        host: server,
        user: username,
        password: password,
        database: database,
        charset: "utf8mb4"
      })
      .then(conn => {
        // console.log("Connection Made!", conn);
        return conn;
      })
      .catch(err => {
        console.log("DB ERROR: ", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
          connector(multiple);
        } else {
          throw err;
        }
      });
  }

  // connection.on("error", function(err) {
  //   console.log("DB ERROR: ", err);
  //   if (err.code === "PROTOCOL_CONNECTION_LOST") {
  //     connector(multiple);
  //   } else {
  //     throw err;
  //   }
  // });
  //console.log('Connection made');
  return connection;
};

// exports.closeConnection = function(connection) {
//   //console.log('Connection closed.');
//   connection.end();
// };

exports.getDbConnection = function() {
  return connection;
};
