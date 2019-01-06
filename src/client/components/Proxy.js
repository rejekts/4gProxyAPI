class Proxy extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let pathName = this.props.location.pathname;

    return (
      <div className="container proxy-page">
        <div className="side-nav">
          <ul>
            <li>
              <Link to="/proxy">Summary</Link>
            </li>
            <li>
              <Link to="/proxy/settings">Settings</Link>
            </li>
            <li>
              <Link to="/proxy/account">My Account</Link>
            </li>
            <li>
              <Link to="/proxy/preferences">Preferences</Link>
            </li>
          </ul>
        </div>
        <div className="main-content">{this.props.children}</div>
      </div>
    );
  }
}

export default Proxy;
