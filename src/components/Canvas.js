const {h, Component} = require('preact');
const topojson = require("topojson");
const d3 = require('d3');

const styles = require('./Canvas.scss');

var width = 600,
    height = 600;


class Canvas extends Component {
  componentDidMount() {
    const world = require("./world-data/world-simple.topo.json");

    // Set up a D3 projection here 
    var projection = d3.geoOrthographic()
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .precision(0.1)
      .fitSize([width, height], topojson.mesh(world))
      .scale(299);

    var base = d3.select('#canvas #map');
    var canvas = base.append('canvas')
      .classed(styles.scalingCanvas, true)
      .attr('width', width)
      .attr('height', height);

    var context = canvas.node().getContext("2d");

    var path = d3.geoPath()
      .projection(projection)
      .context(context);

    const land = topojson.feature(world, world.objects.land),
          countries = topojson.feature(world, world.objects.countries).features,
          borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; });


    const launchPoint = [125.6, 10.1];


    // do your drawing stuff here
    // Draw the initial Globe
    const initialPoint = d3.geoCentroid(countries[8])
    projection.rotate([-125.7625, -39.0392]);//[-initialPoint[0], -initialPoint[1]]) // Starting point

    function drawWorld() {
      // Clear the canvas ready for redraw
      context.clearRect(0, 0, width, height);

      context.fillStyle = 'grey', context.beginPath(), path(land), context.fill();
      context.strokeStyle = "#ccc",  context.beginPath(), path(borders), context.stroke();

      var circle = d3.geoCircle().center([125.7625, 39.0392]).radius(20);

      context.beginPath();
      context.strokeStyle = "red";
      path(circle());
      context.stroke();

      // context.beginPath();
      // context.fillStyle = 'rgba(255, 0, 0, 0.2';
      // path(circle());
      // context.fill();
    }
    
    drawWorld();

    // Start our scrollyteller stuff
    document.addEventListener('mark', mark);

    function mark (event) {
      console.log(event)
      d3.transition()
        .delay(10)
        .duration(1200)
        .tween("rotate", function() {
            var p = d3.geoCentroid(countries[event.detail.activated.idx + 128]);
            var r = d3.interpolate(projection.rotate(), [ -p[0], -p[1] ]);
            return function (t) {
              projection.rotate(r(t));
              drawWorld();
            }
        });
    }

  }
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <div id="canvas" className={"u-full " + styles.wrapper} aria-label="A map">
        <div className={styles.responsiveContainer}>
          <div id="map" className={styles.scalingContainer}
            style={"padding-bottom: " + height / width * 100 + "%"}></div>
        </div>
      </div>
    );
  }
}


module.exports = Canvas;