const d3 = require('d3');

var width = 750, height = 400;

const styles = require('./Canvass.scss')

var canvas = d3.select('#world #map')
  .append('canvas')
  .attr('width', width)
  .attr('height', height);

var context = canvas.node().getContext('2d');

class Canvas extends Component {
  componentDidMount() {

  }
  render() {
    return (
      <div id="canvas" className={"u-full " + styles.wrapper} aria-label="A map">
        <div className={styles.responsiveContainer}>
          <div id="map" className={styles.scalingSvgContainer}
            style={"padding-bottom: " + height / width * 100 + "%"}></div>
        </div>
      </div>
    );
  }
}