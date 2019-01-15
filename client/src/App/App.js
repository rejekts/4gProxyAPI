import React, { Component } from "react";
import "./App.css";
import Reset from "./pages/Reset";
import AddProxy from "./pages/AddProxy";
import { BrowserRouter, Route } from "react-router-dom";

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <BrowserRouter>
            <div>
              <Route exact path="/add" component={AddProxy} />
              <Route exact path="/reset/:uuid" component={Reset} />
            </div>
          </BrowserRouter>
        </header>
      </div>
    );
  }
}

export default App;
