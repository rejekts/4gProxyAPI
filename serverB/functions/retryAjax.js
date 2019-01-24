const fetch = require('node-fetch');

const retryAjax = (retries, interval, options) => {
  console.log('retryAjax attempt # ', retries);
  return new Promise((resolve, reject) => {
    const url = options.url;
    const params = options.qs
      ? new URLSearchParams(options.qs)
      : new URLSearchParams(options.params);
    fetch(url + params, options)
      .then(resolve)
      .catch(err => {
        setTimeout(() => {
          if (retries === 1) {
            reject(err);
            return;
          }
          retryAjax(retries - 1, interval, options).then(resolve, reject);
        }, interval);
      });
  });
};

module.exports = retryAjax;
