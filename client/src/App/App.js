import React, { Component } from "react";
import "./App.css";
import Reset from "./pages/Reset";
import { BrowserRouter, Route } from "react-router-dom";

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <BrowserRouter>
            <Route exact path="/reset/:uuid" component={Reset} />
          </BrowserRouter>
        </header>
      </div>
    );
  }
}

export default App;
