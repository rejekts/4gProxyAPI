import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import Reset from "./pages/Reset";

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <Reset />
        </header>
      </div>
    );
  }
}

export default App;

/*
import React, { Component } from "react";
import "./app.css";
import ReactImage from "./react.png";
import Axios from "axios";

export default class App extends Component {
  state = { currentIP: null };

  componentDidMount() {
    // const {
    //   match: { params }
    // } = this.props;
    //`/proxy/reset/${params.uuid}`
    Axios.get(`/proxy/list`)
      .then(res => res.json())
      .then(proxy => this.setState({ currentIP: proxy.browser_ip }));
  }

  // getUUID = function() {};

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

*/
