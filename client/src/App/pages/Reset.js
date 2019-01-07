import React, { Component } from "react";
import Axios from "axios";

class Reset extends Component {
  // Initialize the state
  constructor(props) {
    super(props);
    this.state = {
      proxies: []
    };
  }

  // Fetch the list on first mount
  componentDidMount() {
    this.getProxies();
  }

  // Retrieves the list of items from the Express app
  getProxies = () => {
    Axios.get("/proxy/list")
      .then(rez => {
        console.log("res => ", rez);
        return [...rez.data.Items];
      })
      .then(proxies => this.setState({ proxies }));
  };

  render() {
    const { proxies } = this.state;

    return (
      <div className="App">
        <h1>All Proxies</h1>
        {/* Check to see if any items are found*/}
        {proxies.length ? (
          <div>
            {/* Render the proxy of items */}
            {proxies.map((item, i) => {
              return <div key={i}>{item.lan_ip}</div>;
            })}
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
