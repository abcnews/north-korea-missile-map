const React = require("react");
const styles = require("./styles.scss");

const Scrollyteller = require("@abcnews/scrollyteller");
const Globe = require("@abcnews/react-globe");

const LOCATIONS = require("./story-data.json").locations;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.findLocation = this.findLocation.bind(this);
    this.onMarker = this.onMarker.bind(this);

    this.state = {
      config: {}
    };
  }

  findLocation(id) {
    return LOCATIONS.filter(l => l.id === id)[0];
  }

  onMarker(marker) {
    let config = {
      scale: 100,
      highlightedCountries: ["Korea, North"]
    };

    let { id, range, scale, label } = marker;

    if (id) {
      config.center = this.findLocation(id).longlat;
    }

    if (typeof range !== "undefined") {
      config.ranges = [
        {
          center: this.findLocation("northkorea").longlat,
          radius: range
        }
      ];
    }

    if (typeof scale !== "undefined") {
      config.scale = scale;
    }

    if (typeof label === "string") label = [label];
    if (label instanceof Array) {
      config.labels = label.map(l => {
        const location = this.findLocation(l);

        return {
          label: location.name,
          center: location.longlat,
          hasDot: true
        };
      });
    }

    this.setState({ config });
  }

  render() {
    const { scrollyteller } = this.props;

    return (
      <div className={styles.base}>
        <Scrollyteller
          panels={scrollyteller.panels}
          className={`Block is-richtext is-piecemeal ${styles.scrollyteller}`}
          panelClassName={`Block-content u-layout u-richtext`}
          onMarker={this.onMarker}
        >
          <Globe background="#f9f9f9" config={this.state.config} />
        </Scrollyteller>
      </div>
    );
  }
}

module.exports = App;
