import React, { Component } from "react";
import { Table } from "semantic-ui-react";

class ProxyDetailsTable extends Component {
  render() {
    return (
      <React.Fragment>
        <Table definition>
          <Table.Body>
            <Table.Row>
              <Table.Cell width={10}>Proxy</Table.Cell>
              <Table.Cell>{this.props.lanIP}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Current Browser IP</Table.Cell>
              <Table.Cell>{this.props.browserIP}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Old Browser IP</Table.Cell>
              <Table.Cell>{this.props.oldBrowserIP}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Proxy Reset Status</Table.Cell>
              <Table.Cell>{this.props.status}</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </React.Fragment>
    );
  }
}

export default ProxyDetailsTable;
