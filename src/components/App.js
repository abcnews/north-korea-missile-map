const { h, Component } = require("preact");
const styles = require("./App.scss");

const Globe = require("./Globe");

class App extends Component {
  render() {
    return (
      <div className={styles.root}>
        <Globe />
      </div>
    );
  }
}

module.exports = App;
