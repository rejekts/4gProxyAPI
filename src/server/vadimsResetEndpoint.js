grabClientIP(host)
    .then(ip => {
      console.log("Return of oldIP in the /proxy/reset endpoint => ", ip);
      if (ip.stderr.length) {
        return grabClientIP(host).then(ip => {
          if (ip.stderr.length) {
            rebootClient(host)
              .then(rebootRes => rebootRes)
              .catch(err => {});
          }
        });
      } else {
        oldIP = ip.stdout.trim();
        return oldIP;
      }
    })
    .then(oldIP => {
      resetClientIPAddress(host, network, oldIP)
        .then(resetClientResponseIP => {
          console.log(
            "New IP from resetClientIPAddress method in the /proxy/reset endpoint => ",
            resetClientResponseIP
          );
          if (resetClientResponseIP !== undefined) {
            res
              .status(status)
              .send(
                `Your IP address has been successfully reset. Your oldIP is ${oldIP} and the newIP is ${resetClientResponseIP}`,
                ` && the res.body => ${body}`
              );
          }
        })
        .catch(err => {
          if (err) {
            console.log(
              "We have an error in the main /proxy/reset endpoint when calling the resetClientIpAddress method. err => ",
              err
            );
            res.send(
              "There was an issue when trying to reset the proxy IP address. please wait 30 - 60 seconds and try again. if the problem persists please contact your system administrator and provide them with the following error code. => ",
              err
            );
          }
        });
    })
    .catch(err => {
      if (err) {
        console.log(
          "We have an error in the main /proxy/reset endpoint => ",
          err
        );
      }
    });
});