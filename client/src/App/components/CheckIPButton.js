import React, { Component } from "react";
import { Button } from "semantic-ui-react";

class CheckIPButton extends Component {
  render() {
    return (
      <div className="check-ip-button">
        <Button
          onClick={this.props.onClick}
          color="blue"
          style={{ paddingBottom: 20, paddingTop: 20 }}
        >
          Check Browser IP
        </Button>
      </div>
    );
  }
}

export default CheckIPButton;
