//Need API endpoint that we can hit for the IP of the 4g modem to be reset. AKA Disconnect the device and reconnect it.

const express = require("express");
const bodyParser = require("body-parser");
const child_process = require("child_process");
const cors = require("cors");
const { URL } = require("url");
let path = require("path");

// let config = require("./services/config/config.json");
// const https = require("https");
// const http = require("http");
// const fs = require("fs");
// const redirectToHTTPS = require("express-http-to-https").redirectToHTTPS;
const moment = require("moment-timezone");

let dbConnection = require("./services/dbconnector");
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("dist"));
// app.use(requestIp.mw());
app.enable("trust proxy");

const server = app.listen(8080, () => console.log("Listening on port 8080!"));

// app.get("/proxy/reset", function(req, res) {
//   const host = req.param("host");
//   const network = req.param("network");
//   console.log(
//     "Reset API Endpoint getting hit!",
//     "host ip => ",
//     host,
//     " network => ",
//     network
//   );

//   child_process.exec(
//     `ssh pi@${host} "sudo nmcli connection up ${network}"`,
//     (error, stdout) => {
//       if (error) {
//         console.error(`exec error: ${error}`);
//         return;
//       } else {
//         res.send(
//           `Proxy connection resetting. Please allow 30-60 seconds for the network to re-establish`
//         );
//         console.log(`Connection: ${stdout}`);
//       }
//     }
//   );
//   res.sendFile(path.join(__dirname + "/resetIndex.html"));
// });
// //`ssh pi@${host} "/usr/bin/squid -k shutdown && echo "" > /var/spool/squid/swap.state && sudo reboot"`
// app.get("/proxy/reset/hard", function(req, res) {
//   const host = req.param("host");
//   console.log("Hard Reset API Endpoint getting hit!", "host => ", host);

//   child_process.exec(`ssh pi@${host} "sudo reboot"`, (error, stdout) => {
//     if (error) {
//       console.error(`exec error: ${error}`);
//       res.send(
//         `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
//       );
//       return;
//     } else {
//       console.log(`Connection: ${stdout}`);
//       res.send(
//         `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
//       );
//     }
//   });
// });

// app.get("/proxy/reset/clear-cache", function(req, res) {
//   const host = req.param("host");
//   console.log("Clear Cache API Endpoint getting hit!", "host => ", host);

//   child_process.exec(
//     `ssh pi@${host} "sudo /usr/local/bin/clearAndHardReset.sh"`,
//     (error, stdout) => {
//       if (error) {
//         console.error(`exec error: ${error}`);
//         res.send(
//           `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
//         );
//         return;
//       } else {
//         console.log(`Connection: ${stdout}`);
//         res.send(
//           `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
//         );
//       }
//     }
//   );
// });

//API Endpoint for Thank You Pixel Cloaking
// app.get("/api/safeurl", async function(req, res) {
//   let pid = req.param("pid");
//   console.log("pid => ", pid);

//   let queryStr = `SELECT a.account_key as account_key, s.url as url, a.pixel as pixel
//   FROM sys.accounts a
//   join sys.safe_urls s
//   on s.safe_url_key = a.safe_url_key
//   where a.pixel = ${pid};`;

//   let dbase = await dbConnection.init();

//   try {
//     if (!dbase) {
//       return res.status(500).send("Failed to initialize the db.");
//     } else {
//       await dbase.query(queryStr).then(results => {
//         let safeUrl = new URL(results[0].url);
//         let hostname = safeUrl.hostname;
//         let pixel = results[0].pixel;
//         let pathname = safeUrl.pathname;
//         let filename = path.basename(pathname);

//         if (results[0].url.indexOf("shopify") > -1) {
//           let shopifyRedirectUrl = `https://${hostname}${pathname.replace(
//             filename,
//             ""
//           )}thank-you/one.php?pid=${pixel}&link=${hostname}`;

//           console.log(
//             moment(),
//             " test url to redirect to => ",
//             shopifyRedirectUrl
//           );
//           res.redirect(shopifyRedirectUrl);
//         } else {
//           let otherRedirectUrl = `https://${hostname}/thank-you/one.php?pid=${pixel}&link=${hostname}`;

//           console.log(
//             moment(),
//             " test url to redirect to => ",
//             otherRedirectUrl
//           );
//           res.redirect(otherRedirectUrl);
//         }
//         dbase.end();
//       });
//     }
//   } catch (error) {
//     if (error) {
//       console.log("Error in the safeurl endpoint => ", error);
//     }
//   }
// });

// //API Endpoint to fire pageview from safeurl to fb
// app.get("/api/pageview", async function(req, res) {
//   let pid = req.param("pid");
//   console.log("pid => ", pid);

//   let queryStr = `SELECT a.account_key as account_key, s.url as url, a.pixel as pixel
//   FROM sys.accounts a
//   join sys.safe_urls s
//   on s.safe_url_key = a.safe_url_key
//   where a.pixel = ${pid};`;

//   let dbase = await dbConnection.init();

//   try {
//     if (!dbase) {
//       return res.status(500).send("Failed to initialize the db.");
//     } else {
//       await dbase.query(queryStr).then(results => {
//         let safeUrl = new URL(results[0].url);
//         let hostname = safeUrl.hostname;
//         let pixel = results[0].pixel;
//         let pathname = safeUrl.pathname;
//         let filename = path.basename(pathname);

//         console.log(
//           " safeurl => ",
//           safeUrl,
//           " hostname => ",
//           hostname,
//           " pixel => ",
//           pixel,
//           " pathname => ",
//           pathname,
//           " filename => ",
//           filename
//         );
//         if (results[0].url.indexOf("shopify") > -1) {
//           let shopifyRedirectUrl = `https://${hostname}${pathname.replace(
//             filename,
//             ""
//           )}pageview/one.php?pid=${pixel}&link=${hostname}`;

//           console.log(
//             moment(),
//             " test url to redirect to => ",
//             shopifyRedirectUrl
//           );
//           res.redirect(shopifyRedirectUrl);
//         } else {
//           let otherRedirectUrl = `https://${hostname}/pageview/one.php?pid=${pixel}&link=${hostname}`;

//           console.log(
//             moment(),
//             " test url to redirect to => ",
//             otherRedirectUrl
//           );
//           res.redirect(otherRedirectUrl);
//         }
//         dbase.end();
//       });
//     }
//   } catch (error) {
//     console.log("Error in the pageview endpoint => ", error);
//   }
// });

// //API Endpoint to fire addtocart from safeurl to fb
// app.get("/api/addtocart", async function(req, res) {
//   let pid = req.param("pid");
//   console.log("pid => ", pid);

//   let queryStr = `SELECT a.account_key as account_key, s.url as url, a.pixel as pixel
//   FROM sys.accounts a
//   join sys.safe_urls s
//   on s.safe_url_key = a.safe_url_key
//   where a.pixel = ${pid};`;

//   let dbase = await dbConnection.init();
//   try {
//     if (!dbase) {
//       return res.status(500).send("Failed to initialize the db.");
//     } else {
//       await dbase.query(queryStr).then(results => {
//         let safeUrl = new URL(results[0].url);
//         let hostname = safeUrl.hostname;
//         let pixel = results[0].pixel;
//         let pathname = safeUrl.pathname;
//         let filename = path.basename(pathname);

//         if (results[0].url.indexOf("shopify") > -1) {
//           let shopifyRedirectUrl = `https://${hostname}${pathname.replace(
//             filename,
//             ""
//           )}addtocart/one.php?pid=${pixel}&link=${hostname}`;

//           console.log(
//             moment(),
//             " test url to redirect to => ",
//             shopifyRedirectUrl
//           );
//           res.redirect(shopifyRedirectUrl);
//         } else {
//           let otherRedirectUrl = `https://${hostname}/addtocart/one.php?pid=${pixel}&link=${hostname}`;

//           console.log(
//             moment(),
//             " test url to redirect to => ",
//             otherRedirectUrl
//           );
//           res.redirect(otherRedirectUrl);
//         }
//         dbase.end();
//       });
//     }
//   } catch (error) {
//     console.log("Error in the safeurl endpoint => ", error);
//   }
// });

//API Endpoint to receive the cookies from the personals extension
app.post("/api/cookies", async function(req, res) {
  console.log("req.body => ", req.body);

  // let queryStr = `SELECT a.account_key as account_key, s.url as url, a.pixel as pixel
  // FROM sys.accounts a
  // join sys.safe_urls s
  // on s.safe_url_key = a.safe_url_key
  // where a.pixel = ${pid};`;

  // let dbase = await dbConnection.init();
  // try {
  //   if (!dbase) {
  //     return res.status(500).send("Failed to initialize the db.");
  //   } else {
  //     await dbase.query(queryStr).then(results => {
  //       let safeUrl = new URL(results[0].url);
  //       let hostname = safeUrl.hostname;
  //       let pixel = results[0].pixel;
  //       let pathname = safeUrl.pathname;
  //       let filename = path.basename(pathname);

  //       if (results[0].url.indexOf("shopify") > -1) {
  //         let shopifyRedirectUrl = `https://${hostname}${pathname.replace(
  //           filename,
  //           ""
  //         )}addtocart/one.php?pid=${pixel}&link=${hostname}`;

  //         console.log(
  //           moment(),
  //           " test url to redirect to => ",
  //           shopifyRedirectUrl
  //         );
  //         res.redirect(shopifyRedirectUrl);
  //       } else {
  //         let otherRedirectUrl = `https://${hostname}/addtocart/one.php?pid=${pixel}&link=${hostname}`;

  //         console.log(
  //           moment(),
  //           " test url to redirect to => ",
  //           otherRedirectUrl
  //         );
  //         res.redirect(otherRedirectUrl);
  //       }
  //       dbase.end();
  //     });
  //   }
  // } catch (error) {
  //   console.log("Error in the safeurl endpoint => ", error);
  // }
});
