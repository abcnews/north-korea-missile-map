const {h, Component} = require('preact');
const topojson = require("topojson");
const d3 = require('d3');

const styles = require('./Canvas.scss');

var width = 700,
    height = 700;


class Canvas extends Component {
  componentDidMount() {
    const world = require("./world-data/world-simple.topo.json");

    // Set up a D3 projection here 
    var projection = d3.geoOrthographic()
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .precision(0.1)
      .rotate([-125.762524, -39.039219]) // Starting point
      .fitSize([width, height], topojson.mesh(world));

    var base = d3.select('#canvas #map');
    var chart = base.append('canvas')
      .classed(styles.scalingCanvas, true)
      .attr('width', width)
      .attr('height', height);

    var context = chart.node().getContext("2d");

    var path = d3.geoPath()
      .projection(projection)
      .context(context);

    const land = topojson.feature(world, world.objects.land),
          borders = topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; });

    // Draw the initial Globe

    context.fillStyle = 'grey', context.beginPath(), path(land), context.fill();
    context.strokeStyle = "#ccc",  context.beginPath(), path(borders), context.stroke();
  

    const countries = topojson.feature(world, world.objects.countries).features;

    // Some points on the Earth
    const points = [[125.762524, 39.039219]];

    document.addEventListener('mark', mark);

    function mark (event) {
        d3.transition()
          .delay(10)
          .duration(1200)
          .tween("rotate", function() {
              var p = d3.geoCentroid(countries[event.detail.activated.idx]);
              var r = d3.interpolate(projection.rotate(), [ -p[0], -p[1] ]);
              return function (t) {
                projection.rotate(r(t));

                // Clear the canvas ready for redraw
                context.clearRect(0, 0, width, height);

                // context.beginPath();
                // path(topojson.feature(world, world.objects.land));
                // path(topojson.mesh(world));
                // context.fill();
                // context.stroke();
                context.fillStyle = 'grey', context.beginPath(), path(land), context.fill();
                context.strokeStyle = "#ccc",  context.beginPath(), path(borders), context.stroke();
              }
          });
    }

    // var fps = 5;
    // // d3.interval(mark, 1000 / fps);
    
    // function mark (event) {
    //   context.clearRect(0, 0, width, height);

    //   projection.rotate([rotation, 0]);
    //   rotation += velocity;
    //   context.beginPath();
    //   path(topojson.mesh(world));
    //   context.strokeStyle = "green";
    //   context.stroke();
    // }



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