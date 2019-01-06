import React, { Component } from "react";
import "./app.css";
import ReactImage from "./react.png";
import Axios from "axios";

export default class App extends Component {
  state = { currentIP: null };

  componentDidMount() {
    const {
      match: { params }
    } = this.props;
    Axios.get(`/proxy/reset/${params.uuid}`)
      .then(res => res.json())
      .then(proxy => this.setState({ currentIP: proxy.browser_ip }));
  }

  getUUID = function() {};

  render() {
    const { currentIP } = this.state;
    return (
      <div>
        {currentIP ? (
          <h1>{`Hello. Your current IP is: ${currentIP}. Please allow 3 - 5 minutes for the connection to reset with a new IP.`}</h1>
        ) : (
          <h1>Loading.. please wait!</h1>
        )}
        <div>
          <button>Click here to refresh IP and see if its changed yet</button>
        </div>
      </div>
    );
  }
}
