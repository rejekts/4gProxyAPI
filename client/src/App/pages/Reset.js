import React, { Component } from "react";
import Axios from "axios";
import CheckIPButton from "../components/CheckIPButton";
import ProxyDetailsTable from "../components/ProxyDetailsTable";
import { Divider, Header, Icon } from "semantic-ui-react";

import logo from "../logo.svg";
import { debounce } from "lodash";

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
      browserIP: "",
      oldBrowserIP: "",
      lanIP: "",
      status: "PENDING",
      isLoading: true,
      clearUpdater: false
    };

    this.checkProxyServerExternalIP = debounce(uuid => {
      this.checkProxyServerExternalIP(uuid);
    }, 3000);
  }

  // Fetch the proxy and set the uuid in state on first mount
  componentDidMount() {
    const uuid = this.props.match.params.uuid;
    this.setState(() => ({ uuid }));
    this.resetProxy(uuid);
    this.intervalID = setInterval(() => {
      this.checkProxyServerExternalIP(uuid);
    }, 30000);
  }

  componentDidUpdate() {}

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  // Retrieves the proxy details from the Express app and runs the reset isntructions
  resetProxy = uuid => {
    Axios.get(`/proxy/reset`, { params: { uuid } })
      .then(proxy => {
        // console.log("Proxy in reset => ", proxy.data);
        this.setState({
          proxy: proxy.data,
          isLoading: false,
          browserIP: proxy.data.browserIP,
          oldBrowserIP: proxy.data.oldBrowserIP,
          lanIP: proxy.data.lanIP,
          status: "PENDING"
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
        //check if the ips are diff and the process is complete and clear the interval if so
        if (
          IP.data.browserIP !== IP.data.oldBrowserIP &&
          IP.data.status === "COMPLETE"
        ) {
          clearInterval(this.intervalID);

          this.setState({
            proxy: IP.data,
            isLoading: false,
            browserIP: IP.data.browserIP,
            oldBrowserIP: IP.data.oldBrowserIP,
            resetStatusMessage: "Your IP has been reset.",
            resetStatusInstructions:
              "You can close this page now and continue your task. Have a great day!",
            status: IP.data.status
          });
        } else {
          this.setState({
            proxy: IP.data,
            isLoading: false,
            browserIP: IP.data.browserIP,
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
      oldBrowserIP,
      browserIP,
      lanIP,
      isLoading
    } = this.state;
    if (isLoading) {
      return <div>Loading...</div>;
    }

    return (
      <div className="reset">
        {this.state.browserIP ? (
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
              browserIP={browserIP}
              lanIP={lanIP}
              oldBrowserIP={oldBrowserIP}
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
