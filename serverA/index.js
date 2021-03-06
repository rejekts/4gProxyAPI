//This is the API serverA file. It serves as the initiator of procedures and it communicates with the browser and send instructions to serverB to be executed

const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const childExec = require('child_process').exec;
const util = require('util');
const exec = util.promisify(childExec);
const path = require('path');
const rp = require('request-promise');
const passport = require('passport');

const app = express();

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('dist'));
app.enable('trust proxy');
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.static(path.join(__dirname, '/../client/build')));

const PORT = process.env.PORT || 10080;
app.listen(PORT, () => console.log('ServerA Listening on port 10080!'));
// app.timeout = 360000;

app.get('/', function(req, res) {
  res.status(200).send('Nothing to see here.');
});

app.get('/proxy/list', function(req, res) {
  console.log(
    '/proxy/list API  Endpoint getting hit in serverA! Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss')
  );

  let options = {
    host: 'localhost',
    port: '10090',
    path: '/api/proxy/all',
    url: 'http://localhost:10090/api/proxy/all',
    method: 'GET',
    headers: {
      // headers such as "Cookie" can be extracted from req object and sent to /test
    }
  };
  rp(options)
    .then(proxies => {
      console.log('All Proxies in serverA => ', proxies);
      res.status(200).send(proxies);
    })
    .catch(error => {
      if (error) {
        console.log('error in /proxy/list => ', error);
      }
    });
});

//add new proxy to the db
app.post('/proxy/add', function(req, res) {
  const { lanIP, vpnIP, proxyIP, oldBrowserIP, browserIP, port, carrier, apn, status } = req.body;

  console.log(
    '/proxy/add API  Endpoint getting hit in serverA! Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss'),
    ' req.body => ',
    req.body
  );

  let options = {
    host: 'localhost',
    port: '10090',
    path: '/api/proxy/add',
    url: 'http://localhost:10090/api/proxy/add',
    method: 'POST',
    json: true,
    headers: {
      // headers such as "Cookie" can be extracted from req object and sent to /test
    },
    body: {
      lanIP: lanIP,
      vpnIP: vpnIP,
      proxyIP: proxyIP,
      oldBrowserIP: oldBrowserIP,
      browserIP: browserIP,
      port: port,
      carrier: carrier,
      apn: apn,
      status: status
    }
  };
  rp(options)
    .then(proxies => {
      console.log('Response to /proxy/add in serverA => ', proxies);
      res.status(200).send(proxies);
    })
    .catch(error => {
      if (error) {
        console.log('error in /proxy/list => ', error);
      }
    });
});
//grab IP from the db
app.get('/proxy/getIPFromDb', function(req, res) {
  const proxyServerID = req.query.proxyServerID;

  // console.log(
  //   "/proxy/get_ip API serverA Endpoint getting hit! Time => ",
  //   moment().format("YYYY-MM-DDTHH:mm:ss"),
  //   "params => ",
  //   req.params
  // );

  let options1 = {
    host: 'localhost',
    port: '10090',
    path: '/api/proxy/browserIP',
    url: 'http://localhost:10090/api/proxy/browserIPFromDb',
    method: 'GET',
    qs: {
      proxyServerID: proxyServerID
    }
  };
  rp(options1)
    .then(prx => {
      // console.log("Proxy Data in serverA => ", prx);
      res.status(200).send(prx);
    })
    .catch(error => {
      if (error) {
        console.log('error in /proxy/get_ip => ', error);
      }
    });
});
//grab IP straight from the client machine and set in db
app.get('/proxy/getIp', function(req, res) {
  const proxyServerID = req.query.proxyServerID;

  // console.log(
  //   "/proxy/get_ip API serverA Endpoint getting hit! Time => ",
  //   moment().format("YYYY-MM-DDTHH:mm:ss"),
  //   "params => ",
  //   req.params
  // );

  let options1 = {
    host: 'localhost',
    port: '10090',
    path: '/api/proxy/browserIP',
    url: 'http://localhost:10090/api/proxy/browserIP',
    method: 'GET',
    qs: {
      proxyServerID: proxyServerID
    }
  };
  rp(options1)
    .then(prx => {
      // console.log("Proxy Data in serverA => ", prx);
      res.status(200).send(prx);
    })
    .catch(error => {
      if (error) {
        console.log('error in /proxy/get_ip => ', error);
      }
    });
});

app.get('/proxy/reset', function(req, res) {
  const proxyServerID = req.query.proxyServerID;
  let oldIP;
  let newIP;

  console.log(
    'Reset API serverA Endpoint getting hit! Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss'),
    'params => ',
    req.query
  );

  let options1 = {
    host: 'localhost',
    port: '10090',
    path: '/api/proxy',
    url: 'http://localhost:10090/api/proxy',
    method: 'GET',
    qs: {
      proxyServerID: proxyServerID,
      status: 'Pending'
    }
  };
  //send request to serverB to start reset procedures and update the status and grap current browserIP
  rp(options1)
    .then(prx => {
      console.log('Proxy Data in serverA => ', prx);
      let options2 = {
        host: 'localhost',
        port: '10090',
        path: '/api/proxy/reset',
        url: 'http://localhost:10090/api/proxy/reset',
        method: 'GET',
        qs: {
          proxyServerID: proxyServerID,
          host: prx.lanIP,
          carrier: prx.carrier
        }
      };

      //send reset instructions to serverB
      rp(options2)
        .then(prz => {
          console.log('Ran the reset endpoint in the serverA endpoint => ', prz);
        })
        .catch(error => {
          if (error) {
            console.log('error in /proxy/reset 2nd call => ', error);
          }
        });
      res.status(200).send(prx);

      //finally send back the proxy data from the first call to get/update the browserIP
    })
    .catch(error => {
      if (error) {
        console.log('error in /proxy/reset 1st call => ', error);
      }
    });
});

app.get('/proxy/reset/hard', function(req, res) {
  const host = req.query['host'];
  const network = req.query['network'];
  const apn = req.query['apn'];

  console.log(
    'Hard Reset API Endpoint getting hit!',
    'host => ',
    host,
    'Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss')
  );

  exec(`ssh pi@${host} "sudo reboot"`)
    .then(data => {
      res.send(
        `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish`
      );
      console.log(`Connection to ${host}: ${data.stdout}`);
    })
    .catch(err => {
      console.log('err in the catch => ', err);
      res.send(
        `Proxy Server Rebooting. Please allow 60-90 seconds for the network to re-establish. You can close this browser tab now.`
      );
    });
});

app.get('/proxy/reset/clear-cache', function(req, res) {
  const host = req.query['host'];
  console.log(
    'Clear Cache API Endpoint getting hit!',
    'host => ',
    host,
    'Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss')
  );

  exec(`ssh pi@${host} "sudo /usr/local/bin/clearAndHardReset.sh"`)
    .then(data => {
      res.send(
        `Proxy Server Clearing Cache, Rebuilding and Rebooting. Please allow 60-90 seconds for the network to re-establish`
      );
      console.log(`Connection to ${host}: ${data.stdout}`);
    })
    .catch(err => {
      console.log('err in the catch => ', err);
    });
});

app.post('/api/cookies', function(req, res) {
  console.log('req.body => ', req.body);
  console.log('req.params => ', req.params);

  for (let i = 0; i < req.body.cookies.length; i++) {
    let cookie = req.body.cookies[i];
    console.log(cookie.domain, ' - ', cookie.name, ' - ', cookie.value);
    console.log(
      req.body.changed.cookie.domain,
      ' - ',
      req.body.changed.cookie.name,
      ' - ',
      req.body.changed.cookie.value
    );
  }
  try {
    res.send('got em!!');
  } catch (err) {
    if (err) {
      console.error(err);
      res.send('Error in the /api/cookies post method');
    }
  }

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

//Facebot Endpoints below
app.get('/bot/reset', function(req, res) {
  const host = req.query['host'];
  const network = req.query['network'];
  let oldIP;
  let newIP;

  console.log(
    'Reset API Endpoint getting hit!',
    'host ip => ',
    host,
    ' network => ',
    network,
    ' Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss')
  );

  grabClientIP(host)
    .then(ip => {
      console.log('Return of oldIP in the /bot/reset endpoint => ', ip);
      if (!ip) {
        grabClientIP(host).then(ip2 => {
          if (!ip2) {
            rebootClient(host).then(rebootRes => {
              res
                .status(200)
                .send(
                  `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                );
            });
          } else {
            oldIP = ip;
            return oldIP;
          }
        });
      } else {
        oldIP = ip;
        return oldIP;
      }
    })
    .then(oldIP => {
      resetClientIPAddress(host, network, oldIP, (err, ip) => {
        if (err) {
          console.log(
            'We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ',
            err
          );
          if (err.stderr.indexOf('closed by remote host') >= 0) {
            res
              .status(255)
              .send(
                `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
              );
          } else {
            rebootClient(host)
              .then(rebootRes => {
                res
                  .status(200)
                  .send(
                    `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${rebootRes}`
                  );
              })
              .catch(err => {
                console.log('Error trying to reset the ip in the main endpoint. Error: ', err);
                res
                  .status(255)
                  .send(
                    `We were not able to successfully reset your IP Address. The machine is now rebooting. Please wait 60-90 seconds for the machine to boot and the connection to establish before checking for a new IP Address. Err: ${err}`
                  );
              });
          }
        } else {
          console.log('Success!! newIP in the endpoint!! => ', ip);
          res
            .status(200)
            .send(
              `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${ip}`
            );
        }
      });
    });
});

//catchall to send all other traffic than endpoints above to the react app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/../client/build/index.html'));
});
