// This is the API serverB file. It handles all threading and execution of instructions sent from serverA

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment-timezone');
const child_process = require('child_process');
const childExec = require('child_process').exec;
const util = require('util');

const exec = util.promisify(childExec);
const app = express();
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const config = require('./config/config.js');

const isDev = process.env.NODE_ENV !== 'production';

const ProxyServer = require('./dynamodb/proxyServer');
const grabClientIP = require('./functions/grabClientIP');
const rebootClient = require('./functions/rebootClient');
const resetClientIPAddress = require('./functions/resetClientIPAddress');
const BatchAddProxies = require('./functions/batchAddProxies');
const printResetURLs = require('./functions/printResetURLs');
const RetryAjax = require('./functions/retryAjax');
const clearAndHardReset = require('./functions/clearAndHardReset');

app.timeout = 720000;
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('dist'));
app.enable('trust proxy');
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.static(path.join(__dirname, '/../client/build')));

const server = app.listen(10080, () => console.log('ServerB Listening on port 10080!'));

AWS.config.update(config.aws_remote_config);

const proxyServer = new ProxyServer(
  {
    accessKeyId: 'AKIAJJD5Q2EKMTD5LKHQ',
    secretAccessKey: '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',
    region: 'us-east-1'
  },
  re => {}
);

app.get('/', (req, res) => {
  res.status(200).send('Nothing to see here.');
});

// get all proxies from dynamodb
app.get('/api/proxy/list', (req, res) => {
  // AWS.config.update(config.aws_remote_config);

  proxyServer
    .getAll()
    .then(pr => {
      console.log('Get all proxies from dynamodb in serverB => ', pr);
      res.status(200).send(pr);
    })
    .catch(err => {
      if (err) {
        console.log('err => ', err);
      }
    });
});

// Get a single proxy by proxyServerID
app.get('/api/proxy', (req, res, next) => {
  console.log('UUID in serverB => ', req.query);
  const proxyServerID = req.query.proxyServerID;

  proxyServer
    .get(proxyServerID)
    .then(pr => {
      console.log('Get a single proxy from dynamodb => ', pr);
      res.status(200).send(pr);
    })
    .catch(err => {
      if (err) {
        console.log('err => ', err);
      }
    });
});

// add new proxy to the dynamo db
app.post('/api/proxy/add', (req, res, next) => {
  // AWS.config.update(config.aws_remote_config);

  const {
    lanIP,
    vpnIP,
    proxyIP,
    oldBrowserIP,
    browserIP,
    port,
    carrier,
    apn,
    status,
    resetURL
  } = req.body;

  console.log(
    'api/proxy/add API  Endpoint getting hit in serverA! Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss'),
    ' req.body => ',
    req.body
  );

  proxyServer
    .create({
      lanIP,
      vpnIP,
      proxyIP,
      oldBrowserIP,
      browserIP,
      port,
      carrier,
      apn,
      status,
      resetURL
    })
    .then(rez => {
      console.log(
        'res in the api/proxy POST endpoint after making proxy in dynamodb => ',
        rez.attrs
      );
      res.status(200).send(`New record created in dynamodb => ${JSON.stringify(rez.attrs)}`);
    })
    .catch(err => {
      if (err) {
        console.log('err => ', err);
      }
    });
});

// print all reset urls
app.get('/api/proxy/printResetURLs', (req, res, next) => {
  printResetURLs()
    .then(rez => {
      console.log('Rez in the /api/proxy/printResetURLs endpoint in serverB => ', rez);
      res.attachment('proxyData.csv');
      res.status(200).send(rez);
    })
    .catch(error => {
      if (error) {
        console.log('error in the /api/proxy/printResetURLs endpoint => ', error);
      }
    });
});

// batch add proxies
app.post('/api/proxy/batch_add', (req, res, next) => {
  const { lanDBlockMin, lanDBlockMax, vpnIPMin, vpnIPMax, port, carrier, apn, proxyIP } = req.body;

  BatchAddProxies(lanDBlockMin, lanDBlockMax, vpnIPMin, vpnIPMax, port, carrier, apn, proxyIP)
    .then(rez => {
      console.log('Rez in the /api/batch_add/proxies endpoint in serverB => ', rez);
      res.status(200).send(`Completed batch addition of proxies => ${rez}`);
    })
    .catch(error => {
      if (error) {
        console.log('error in the /api/batch_add/proxies endpoint => ', error);
      }
    });
});

// Update a proxy by proxyServerID
app.put('/api/proxy/update', (req, res, next) => {
  // AWS.config.update(config.aws_remote_config);

  const {
    proxyServerID,
    lanIP,
    vpnIP,
    proxyIP,
    oldBrowserIP,
    browserIP,
    port,
    carrier,
    apn,
    status,
    resetURL
  } = req.body;

  proxyServer
    .update(proxyServerID, {
      lanIP,
      vpnIP,
      proxyIP,
      oldBrowserIP,
      browserIP,
      port,
      carrier,
      apn,
      status,
      resetURL
    })
    .then(rez => {
      console.log(
        'res in the api/proxy PUT endpoint after updating proxy in dynamodb => ',
        rez.attrs
      );
      res
        .status(200)
        .send(
          `Record was updated in the dynamodb for => ${
            rez.attrs.proxyServerID
          }. New attrs are => ${JSON.stringify(rez.attrs)}`
        );
    })
    .catch(err => {
      if (err) {
        console.log('err => ', err);
      }
    });
});

// get browserIP from client and update dynamodb
app.get('/api/proxy/browserIPFromDb', (req, res) => {
  // AWS.config.update(config.aws_remote_config);
  const proxyServerID = req.query.proxyServerID;

  proxyServer
    .get(proxyServerID)
    .then(pr => {
      res.status(200).send(pr);
    })
    .catch(err => {
      res.status(200).send(err);
    });
});

// get browserIP from client and update dynamodb
app.get('/api/proxy/browserIP', (req, res) => {
  // AWS.config.update(config.aws_remote_config);
  const proxyServerID = req.query.proxyServerID;
  let status = req.query.status;
  let proxyData = {};
  let browserIPBeforeUpdating;

  proxyServer
    .get(proxyServerID)
    .then(async pr => {
      const host = pr.lanIP;
      proxyData = pr;
      browserIPBeforeUpdating = pr.browserIP;
      // console.log(
      //   "Get current browserIP from dynamodb in serverB => ",
      //   pr.browserIP
      // );
      return await grabClientIP(host);
    })
    .then(currentIP => {
      // check if status is REBOOTING and turn to complete if IP is different than it was.catch((error) => {
      if (
        (browserIPBeforeUpdating !== currentIP && proxyData.status === 'REBOOTING') ||
        (browserIPBeforeUpdating !== currentIP && proxyData.status === 'RESETTING')
      ) {
        status = 'COMPLETE';
      }

      proxyData = JSON.parse(JSON.stringify(proxyData));

      const updateData = {
        lanIP: proxyData.lanIP,
        vpnIP: proxyData.vpnIP,
        proxyIP: proxyData.proxyIP,
        oldBrowserIP: proxyData.oldBrowserIP,
        browserIP: currentIP,
        port: proxyData.port,
        carrier: proxyData.carrier,
        apn: proxyData.apn,
        status: status !== undefined ? status : proxyData.status,
        resetURL: proxyData.resetURL
      };
      proxyServer
        .update(proxyServerID, updateData)
        .then(IPUpdateRez => {
          console.log('IPUpdateRez => ', IPUpdateRez.attrs);
          res.status(200).send(IPUpdateRez.attrs);
        })
        .catch(err => {
          if (err) {
            console.log('err updating the db in the /api/proxy/browserIP method => ', err);
            res.status(500).send(err);
          }
        });
    })
    .catch(err => {
      if (err) {
        console.log('Could not resolve host error in /api/proxy/browserIP => ', err.stderr);
        res.status(500).send(err);
      }
    });
});

// Main endpoint for resetting the browser ip on the proxy server
app.get('/api/proxy/reset', (req, res) => {
  // AWS.config.update(config.aws_remote_config);
  const proxyServerID = req.query.proxyServerID;
  let oldIP;
  // let newData;

  console.log(
    'Reset API Endpoint getting hit!',
    'proxyServerID => ',
    proxyServerID,
    ' Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss')
  );

  // go through the reset procedures in order AND update the instructions and the status/ ip in the db on the way
  //-------------------------------------------------------

  proxyServer.get(proxyServerID).then(proxyData => {
    proxyData = JSON.parse(JSON.stringify(proxyData));

    proxyData.status = 'PENDING';

    proxyServer
      .update(proxyServerID, proxyData)
      .then(data => {
        console.log(
          'Response from db after updating status to pending in the reset method newData: ',
          data.attrs
        );

        const newData = JSON.parse(JSON.stringify(data.attrs));

        const { lanIP, browserIP } = newData;

        // grab the current client IP
        grabClientIP(lanIP)
          .then(ip => {
            console.log(
              'IP in the grabClientIP method in the resetClient endpoint BEFORE running reset => ',
              ip
            );
            if (!ip) {
              ip = browserIP;
            }
            oldIP = ip;
            newData.oldBrowserIP = ip;
            newData.browserIP = ip;
            newData.status = 'RESETTING';
            console.log('newData before RESETTING? => ', newData);
            // store the current IP in the db IF its different AND set the status of the proxy to running

            proxyServer
              .update(proxyServerID, newData)
              .then(results => {
                console.log(
                  'results after updating the old browser ip before running reset => ',
                  results.attrs
                );
                const newData2 = JSON.parse(JSON.stringify(results.attrs));

                const { lanIP, carrier } = newData2;

                // run all reset methods
                resetClientIPAddress(lanIP, carrier, oldIP)
                  .then(resetClientNewIP => {
                    console.log(
                      'Success!! newIP in the endpoint!! => ',
                      resetClientNewIP,
                      ' For ',
                      lanIP
                    );

                    // update the db with COMPLETE status and new IP
                    newData2.browserIP = resetClientNewIP;
                    newData2.status = 'COMPLETE';

                    console.log('newData2 after successful reset of IP => ', newData2);
                    proxyServer
                      .update(proxyServerID, newData2)
                      .then(successfulResetUpdateRez => {
                        console.log('successfulResetUpdateRez => ', successfulResetUpdateRez.attrs);
                        // res.status(200).send(resetClientNewIP);
                      })
                      .catch(err => {
                        if (err) {
                          console.log(
                            'err calling proxyServer update after running resetClientIPAddress => ',
                            err
                          );
                        }
                      });
                  })
                  .catch(error => {
                    console.log('error calling the resetClientIPAddress method => ', error);

                    // Update the db that there was an error and that we are rebooting the proxy server hardware
                    newData2.status = 'REBOOTING';
                    console.log('newData2 before REBOOTING => ', newData2);
                    proxyServer
                      .update(proxyServerID, newData2)
                      .then(data => {
                        console.log(
                          'Response from db after updating status before rebooting in the reset method catch => ',
                          data.attrs
                        );
                        rebootClient(lanIP)
                          .then(rebootRes => {
                            console.log('results from running reboot method => ', rebootRes);
                          })
                          .catch(err => {
                            console.log('rebooting error in the reset method => ', err);
                          });
                      })
                      .catch(err => {
                        if (err) {
                          console.log('err => ', err);
                        }
                      });
                  });
              })
              .catch(error => {
                console.log('error calling proxyServer.update after grabbing clientIP => ', error);
              });
          })
          .catch(err => {
            console.log('error calling grabClientIP method. We are rebooting now => ', err);
            // Need to reboot here
            newData.status = 'REBOOTING';
            console.log('newData before REBOOTING => ', newData);
            proxyServer
              .update(proxyServerID, newData)
              .then(data => {
                console.log(
                  'Response from db after updating status before rebooting in the reset method catch => ',
                  data.attrs
                );
                rebootClient(lanIP)
                  .then(rebootRes => {
                    console.log('results from running reboot method => ', rebootRes);
                  })
                  .catch(err => {
                    console.log('rebooting error in the reset method => ', err);
                  });
              })
              .catch(err => {
                if (err) {
                  console.log('err => ', err);
                }
              });
          });
      })
      .catch(error => {
        console.log('error calling proxyserver.get(proxyServerID) => ', error);
        // Need to send error to front end asking for correct proxyServerID or url
      });
    res.status(200).send('Running reset procedures');
  });
});

app.get('/api/proxy/reset/clear-cache', (req, res) => {
  const host = req.query.host;
  console.log(
    'Clear Cache API Endpoint getting hit!',
    'host => ',
    host,
    'Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss')
  );

  clearAndHardReset(host)
    .then(da => {
      res.send(
        `Proxy Server Clearing Cache, Rebuilding and Rebooting. Please allow 60-90 seconds for the network to re-establish ${da}`
      );
    })
    .catch(error => {
      console.log('error calling /api/proxy/reset/clearcache => ', error);
      // Need to send error to front end asking for correct proxyServerID or url
    });
});

// Bot Endpoints Below

// BOT - Get a single proxy by idx
app.get('/api/bot/proxy/status', (req, res, next) => {
  console.log('idx in serverB => ', req.query);
  const idx = req.query.port ? req.query.port : req.query.lanIP;
  const idxName = req.query.port ? 'port' : 'lanIP';

  proxyServer
    .query(idxName, idx)
    .then(pr => {
      console.log('Get a single proxy from dynamodb by port => ', pr[0].attrs);
      res.status(200).send(pr[0].attrs.status);
    })
    .catch(err => {
      if (err) {
        console.log('err => ', err);
        res.status(500).send(err);
      }
    });
});

// Bot reset endpoint
app.get('/api/bot/proxy/reset', (req, res) => {
  const idx = req.query.port ? req.query.port : req.query.lanIP;
  const idxName = req.query.port ? 'port' : 'lanIP';
  let oldIP;
  const resetYet = false;

  console.log(
    '/api/bot/proxy/Reset API Endpoint getting hit!',
    'idxName',
    idxName,
    'idx => ',
    idx,
    ' Time => ',
    moment().format('YYYY-MM-DDTHH:mm:ss')
  );

  // go through the reset procedures in order AND update the instructions and the status/ ip in the db on the way
  //-------------------------------------------------------

  proxyServer
    .query(idxName, idx)
    .then(proxyData => {
      proxyData = JSON.parse(JSON.stringify(proxyData[0]));
      const { proxyServerID } = proxyData;
      proxyData.status = 'PENDING';

      proxyServer
        .update(proxyServerID, proxyData)
        .then(data => {
          console.log(
            'Response from db after updating status to pending in the reset method newData: ',
            data.attrs
          );

          const newData = JSON.parse(JSON.stringify(data.attrs));

          const { lanIP, browserIP } = newData;

          // grab the current client IP
          grabClientIP(lanIP)
            .then(ip => {
              console.log(
                'IP in the grabClientIP method in the resetClient endpoint BEFORE running reset => ',
                ip
              );
              if (!ip) {
                ip = browserIP;
              }
              oldIP = ip;
              newData.oldBrowserIP = ip;
              newData.browserIP = ip;
              newData.status = 'RESETTING';
              console.log('newData before RESETTING? => ', newData);
              // store the current IP in the db IF its different AND set the status of the proxy to running

              proxyServer
                .update(proxyServerID, newData)
                .then(results => {
                  console.log(
                    'results after updating the old browser ip before running reset => ',
                    results.attrs
                  );
                  const newData2 = JSON.parse(JSON.stringify(results.attrs));

                  const { lanIP, carrier } = newData2;

                  // run all reset methods
                  resetClientIPAddress(lanIP, carrier, oldIP)
                    .then(resetClientNewIP => {
                      console.log(
                        'Success!! newIP in the endpoint!! => ',
                        resetClientNewIP,
                        ' For ',
                        lanIP
                      );

                      // update the db with COMPLETE status and new IP
                      newData2.browserIP = resetClientNewIP;
                      newData2.status = 'COMPLETE';

                      console.log('newData2 after successful reset of IP => ', newData2);
                      proxyServer
                        .update(proxyServerID, newData2)
                        .then(successfulResetUpdateRez => {
                          console.log(
                            'successfulResetUpdateRez => ',
                            successfulResetUpdateRez.attrs
                          );
                          // res.status(200).send(resetClientNewIP);
                        })
                        .catch(err => {
                          if (err) {
                            console.log(
                              'err calling proxyServer update after running resetClientIPAddress => ',
                              err
                            );
                          }
                        });
                    })
                    .catch(error => {
                      console.log('error calling the resetClientIPAddress method => ', error);

                      // Update the db status  that we are rebooting the proxy server hardware
                      newData2.status = 'REBOOTING';
                      console.log('newData2 before REBOOTING => ', newData2);

                      // setup options and params to run retry method to poll client and update db when successful
                      const retryBrowserIPqs = {
                        proxyServerID,
                        status: 'REBOOTING'
                      };
                      const retryBrowserIPOptions = {
                        url: 'http://localhost:10080/api/proxy/browserIP',
                        method: 'GET',
                        qs: JSON.stringify(retryBrowserIPqs),
                        headers: { 'Content-Type': 'application/json' }
                      };
                      rebootClient(lanIP).then(
                        successRes => {
                          console.log('successRes from running reboot method => ', successRes);
                          RetryAjax(10, 10000, retryBrowserIPOptions)
                            .then(retryAjaxRes => {
                              console.log(`retryAjaxRes => ${retryAjaxRes}`);
                            })
                            .catch(err => {
                              console.log(
                                `We went through all the tries in the retryAjax method and none worked. err: ${err}`
                              );
                            });
                        },
                        failureRes => {
                          console.log('failureRes from running reboot method => ', failureRes);
                          RetryAjax(10, 10000, retryBrowserIPOptions)
                            .then(retryAjaxRes => {
                              console.log(`retryAjaxRes => ${retryAjaxRes}`);
                            })
                            .catch(err => {
                              console.log(
                                `We went through all the tries in the retryAjax method and none worked. err: ${err}`
                              );
                            });
                        }
                      );
                    });
                })
                .catch(error => {
                  console.log(
                    'error calling proxyServer.update after grabbing clientIP => ',
                    error
                  );
                });
            })
            .catch(err => {
              console.log('error calling grabClientIP method. We are rebooting now => ', err);
              // Need to reboot here
              newData.status = 'REBOOTING';
              console.log('newData before REBOOTING => ', newData);
              // setup options and params to run retry method to poll client and update db when successful
              const retryBrowserIPqs = {
                proxyServerID,
                status: 'REBOOTING'
              };
              const retryBrowserIPOptions = {
                url: 'http://localhost:10080/api/proxy/browserIP',
                method: 'GET',
                qs: JSON.stringify(retryBrowserIPqs),
                headers: { 'Content-Type': 'application/json' }
              };
              rebootClient(lanIP).then(
                successRes => {
                  console.log('successRes from running reboot method => ', successRes);
                  RetryAjax(10, 10000, retryBrowserIPOptions)
                    .then(retryAjaxRes => {
                      console.log(`retryAjaxRes => ${retryAjaxRes}`);
                    })
                    .catch(err => {
                      console.log(
                        `We went through all the tries in the retryAjax method and none worked. err: ${err}`
                      );
                    });
                },
                failureRes => {
                  console.log('failureRes from running reboot method => ', failureRes);
                  RetryAjax(10, 10000, retryBrowserIPOptions)
                    .then(retryAjaxRes => {
                      console.log(`retryAjaxRes => ${retryAjaxRes}`);
                    })
                    .catch(err => {
                      console.log(
                        `We went through all the tries in the retryAjax method and none worked. err: ${err}`
                      );
                    });
                }
              );
            });
        })
        .catch(error => {
          console.log('error calling proxyserver.get(proxyServerID) => ', error);
          // Need to send error to front end asking for correct proxyServerID or url
        });
      res.status(200).send('Running reset procedures');
    })
    .catch(err => {
      if (err) {
        res.status(500).send(err);
      }
    });
});

// catchall to send all other traffic than endpoints above to the react app
app.get('*', (req, res) => {
  res.sendFile(path.join(`${__dirname}/../client/build/index.html`));
});
