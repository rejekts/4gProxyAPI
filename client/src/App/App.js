import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import Reset from "./pages/Reset";
import { BrowserRouter, Route } from "react-router-dom";

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <BrowserRouter>
            <Route exact path="/:uuid" component={Reset} />
          </BrowserRouter>
        </header>
      </div>
    );
  }
}

export default App;
