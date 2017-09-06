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
          borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }),
          globe = {type: "Sphere"};

    const launchPoint = [125.7625, 39.0392]; // Pyongyang

    const spinPoints = [
      [125.7625, 39.0392], // Pyongyang
      [153.021072, -27.470125] // Brisbane
    ];


    // do your drawing stuff here
    // Draw the initial Globe
    const initialPoint = spinPoints[0];
    projection.rotate([ -initialPoint[0], -initialPoint[1] ]); //Starting point

    function drawWorld() {
      var circle = d3.geoCircle().center(spinPoints[0]).radius(kmsToRadius(6700));

      // Clear the canvas ready for redraw
      context.clearRect(0, 0, width, height);

      // Draw landmass
      context.beginPath();
      context.fillStyle = 'grey';
      path(land);
      context.fill();


      // Draw outline of countries
      context.beginPath();
      context.strokeStyle = "#ccc";
      context.lineWidth = 1;
      path(borders);
      context.stroke();

      // Draw circle radius
      context.beginPath();
      context.strokeStyle = "red";
      context.lineWidth = 1.5;
      path(circle());
      context.stroke();

      // Draw a circle outline around the world
      context.beginPath()
      context.strokeStyle = "#111"
      context.lineWidth = 2
      path(globe)
      context.stroke();

      // Fill in the circle
      context.beginPath();
      context.fillStyle = 'rgba(255, 0, 0, 0.07';
      path(circle());
      context.fill();
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
          console.log(spinPoints);
            var p = spinPoints[event.detail.activated.idx];
            if (p) {
              var r = d3.interpolate(projection.rotate(), [ -p[0], -p[1] ]);
              return function (t) {
                projection.rotate(r(t));
                drawWorld();
              }
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

// Some functions
function kmsToRadius (kms) {
  return kms / 111.319444
}


module.exports = Canvas;