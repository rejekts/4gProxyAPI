import React, { Component } from "react";
import Axios from "axios";
import CheckIPButton from "../components/CheckIPButton";
import logo from "../logo.svg";

import { Button, Icon } from "semantic-ui-react";

class Reset extends Component {
  // Initialize the state
  constructor(props) {
    super(props);
    this.state = {
      proxy: {},
      oldIP: "",
      resetStatus: "Pending",
      resetStatusMessage: "Your browser IP is being reset.",
      resetStatusInstructions:
        "Every 30 seconds you can check the status of this process by clicking the button below.",
      currentIP: "",
      uuid: "",
      isLoading: true
    };
  }

  // Fetch the list on first mount
  componentDidMount() {
    const uuid = this.props.match.params.uuid;
    console.log("uuid in Reset => ", uuid);
    this.setState(() => ({ uuid }));
    this.resetProxy(uuid);
  }

  componentDidUpdate() {
    if (this.state.proxy.status !== this.state.resetStatus) {
      this.setState({ resetStatus: this.state.proxy.status });
    }
  }

  // Retrieves the list of items from the Express app
  resetProxy = uuid => {
    Axios.get(`/proxy/reset`, { params: { uuid } })
      .then(proxy => {
        console.log("res => ", proxy);
        return proxy;
      })
      .then(proxy => {
        console.log("Proxy in reset => ", proxy.data);
        this.setState({
          proxy: proxy.data,
          isLoading: false,
          currentIP: proxy.data.browser_ip
        });
      });
  };

  checkProxyServerExternalIP = uuid => {
    Axios.get(`/proxy/get_ip`, { params: { uuid } }).then(IP => {
      console.log(
        "IP in the checkProxyServerExternalIP method => ",
        IP.data.browser_ip
      );

      this.setState({ currentIP: IP.data.browser_ip, status: IP.data.status });
      // return IP;
    });
  };

  render() {
    const { proxy, resetStatus, isLoading } = this.state;
    if (isLoading) {
      return <div>Loading...</div>;
    }

    return (
      <div className="reset">
        {proxy.browser_ip ? (
          <div>
            <div>
              <h1>{this.state.resetStatusMessage}</h1>
              <h4>{this.state.resetStatusInstructions}</h4>
            </div>
            <img src={logo} className="App-logo" alt="logo" />
            <div>
              <CheckIPButton
                onClick={() => this.checkProxyServerExternalIP(this.state.uuid)}
              />
            </div>
            <div style={{ paddingBottom: 20, paddingTop: 20 }}>
              Current Browser IP: {this.state.currentIP}
            </div>
            <div style={{ paddingBottom: 20, paddingTop: 20 }}>
              Old Browser IP: {proxy.browser_ip}
            </div>
            <div style={{ paddingBottom: 20, paddingTop: 20 }}>
              Proxy Reset Status: {proxy.status}
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
