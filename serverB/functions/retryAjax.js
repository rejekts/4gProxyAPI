const fetch = require('node-fetch');
const promiseRetry = require('promise-retry');
const { URL } = require('url');

// const retryAjax = (retries, interval, options) =>
//   new Promise((resolve, reject) => {
//     console.log('retryAjax attempt # ', retries);
//     const url = new URL(options.url);
//     const params = options.qs ? options.qs : options.params;
//     Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
//     fetch(url, options)
//       .then(resolve)
//       .catch(err => {
//         setTimeout(() => {
//           if (retries === 1) {
//             reject(err);
//             return;
//           }
//           retryAjax(retries - 1, interval, options).then(resolve, reject);
//         }, interval);
//       });
//   });

const retryAjax = options1 => {
  const options = JSON.parse(JSON.stringify(options1));
  const params = options.qs ? options.qs : options.params;
  const url = `${options.url}?proxyServerID=${params.proxyServerID}&status=${params.status}`;
  const { method, headers } = options;
  console.log('url: ', url.toString(), ' params: ', params, ' options: ', options);

  const promiseRetryOptions = {
    retries: options.retries,
    maxTimeout: options.maxTimeout,
    minTimeout: options.minTimeout
  };

  return new Promise((resolve, reject) => {
    promiseRetry((retry, number) => {
      console.log('attempt number', number);

      return fetch(url, { method, headers }).catch(err => {
        console.log('err in the catch for the promiseRetry => ', err);
        if (err) {
          retry(err);
        } else {
          throw err;
        }
      });
    }, promiseRetryOptions).then(
      value => {
        resolve(value);
      },
      err => {
        reject(err);
      }
    );
  });
};
module.exports = retryAjax;
