import React, { Component } from "react";
import Axios from "axios";

class Reset extends Component {
  // Initialize the state
  constructor(props) {
    super(props);
    this.state = {
      proxy: {},
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

  // Retrieves the list of items from the Express app
  resetProxy = uuid => {
    Axios.get(`/proxy/reset`, { params: { uuid } })
      .then(proxy => {
        console.log("res => ", proxy);
        return proxy;
      })
      .then(proxy => {
        console.log("Proxy in reset => ", proxy.data);
        this.setState({ proxy: proxy.data });
      })
      .then(() => {
        this.setState({ isLoading: false });
      });
  };
  /*
proxy.map((item, i) => {
              return <div key={i}>{item.lan_ip}</div>;
            })
*/
  render() {
    const { proxy, isLoading } = this.state;
    if (isLoading) {
      return <div>Loading...</div>;
    }

    return (
      <div className="App">
        {proxy.browser_ip ? (
          <div>
            <div>
              <h4>Browser IP: {proxy.browser_ip}</h4>
            </div>
            <div>
              <h4>Proxy Status: {proxy.status}</h4>
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
