import React, { Component } from "react";
import Axios from "axios";
import CheckIPButton from "../components/CheckIPButton";
import ProxyDetailsTable from "../components/ProxyDetailsTable";
import { Divider, Header, Icon } from "semantic-ui-react";

import logo from "../logo.svg";
import _ from "lodash";

class Reset extends Component {
  // Initialize the state
  constructor(props) {
    super(props);
    this.state = {
      proxy: {},
      oldIP: "",
      resetStatusMessage: "Your browser IP is being reset.",
      resetStatusInstructions:
        "The status updates every 30 seconds but you can manually check by clicking the button below.",
      uuid: "",
      browser_ip: "",
      old_browser_ip: "",
      lan_ip: "",
      status: "PENDING",
      isLoading: true,
      clearUpdater: false
    };
  }

  // Fetch the proxy and set the uuid in state on first mount
  componentDidMount() {
    const uuid = this.props.match.params.uuid;
    this.setState(() => ({ uuid }));
    this.resetProxy(uuid);
    this.intervalID = setInterval(() => {
      this.checkProxyServerExternalIP(uuid);
    }, 10000);
  }

  componentDidUpdate() {}

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  // Retrieves the proxy details from the Express app and runs the reset isntructions
  resetProxy = uuid => {
    Axios.get(`/proxy/reset`, { params: { uuid } })
      .then(proxy => {
        return proxy;
      })
      .then(proxy => {
        // console.log("Proxy in reset => ", proxy.data);
        this.setState({
          proxy: proxy.data,
          isLoading: false,
          browser_ip: proxy.data.browser_ip,
          old_browser_ip: proxy.data.old_browser_ip,
          lan_ip: proxy.data.lan_ip,
          status: proxy.data.status
        });
      })
      .catch(err => {
        if (err) {
          console.log("err => ", err);
        }
      });
  };

  checkProxyServerExternalIP = uuid => {
    Axios.get(`/proxy/get_ip`, { params: { uuid } })
      .then(IP => {
        // console.log(
        //   "IP in the checkProxyServerExternalIP method => ",
        //   IP.data.browser_ip,
        //   "OLD IP in the checkProxyServerExternalIP method => ",
        //   IP.data.old_browser_ip,
        //   "status: ",
        //   IP.data.status,
        //   "IP.data.browser_ip !== IP.data.old_browser_ip => ",
        //   IP.data.browser_ip !== IP.data.old_browser_ip,
        //   "IP.data.status === 'COMPLETE' => ",
        //   IP.data.status === "COMPLETE"
        // );

        if (
          IP.data.browser_ip !== IP.data.old_browser_ip &&
          IP.data.status === "COMPLETE"
        ) {
          clearInterval(this.intervalID);
          // console.log(
          //   "clearInterval(this.intervalID) is running! => ",
          //   this.intervalID
          // );
          this.setState({
            proxy: IP.data,
            isLoading: false,
            browser_ip: IP.data.browser_ip,
            status: IP.data.status
          });
          return;
        } else {
          this.setState({
            proxy: IP.data,
            isLoading: false,
            browser_ip: IP.data.browser_ip,
            status: IP.data.status
          });
        }
      })
      .catch(err => {
        if (err) {
          console.log("err => ", err);
        }
      });
  };

  render() {
    const {
      resetStatusMessage,
      resetStatusInstructions,
      status,
      old_browser_ip,
      browser_ip,
      lan_ip,
      isLoading
    } = this.state;
    if (isLoading) {
      return <div>Loading...</div>;
    }

    return (
      <div className="reset">
        {this.state.browser_ip ? (
          <div>
            <div>
              <img src={logo} className="App-logo" alt="logo" />
            </div>
            <React.Fragment>
              <Divider horizontal>
                <Header as="h4">
                  <Icon name="wifi" />
                  Reset Info
                </Header>
              </Divider>

              <p>{resetStatusMessage}</p>
              <h6>{resetStatusInstructions}</h6>
            </React.Fragment>

            <div />

            <ProxyDetailsTable
              resetStatusInstructions={resetStatusInstructions}
              resetStatusMessage={resetStatusMessage}
              status={status}
              browserIP={browser_ip}
              lanIP={lan_ip}
              oldBrowserIP={old_browser_ip}
            />
            <div>
              <CheckIPButton
                onClick={() => this.checkProxyServerExternalIP(this.state.uuid)}
              />
            </div>
          </div>
        ) : (
          <div>
            <h2>No Proxy Items Found</h2>
          </div>
        )}
      </div>
    );
  }
}

export default Reset;
