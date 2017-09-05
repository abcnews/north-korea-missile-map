const {h, Component} = require('preact');
const topojson = require("topojson");
const d3 = require('d3');

const styles = require('./Canvas.scss');

var width = 700,
    height = 700;

var velocity = .1;


class Canvas extends Component {
  componentDidMount() {
    const world = require("./world-data/world-simple.topo.json");

    // Set up a D3 projection here 
    var projection = d3.geoOrthographic()
      .scale(170)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .precision(.1)
      .fitSize([width, height], topojson.mesh(world));

    var base = d3.select('#canvas #map');
    var chart = base.append('canvas')
      .classed(styles.scalingCanvas, true)
      .attr('width', width)
      .attr('height', height);

    // console.log(canvas);

    var context = chart.node().getContext("2d");

    var path = d3.geoPath()
      .projection(projection)
      .context(context);

    context.beginPath();

    var mesh = path(topojson.mesh(world));    

    // context.fillStyle = 'green';
    // context.fill();
    context.strokeStyle = "green";
    context.stroke();

    const countries = topojson.feature(world, world.objects.countries).features;

    

    // d3.timer(function(elapsed) {
      
    // let rotation = 0.0;

    document.addEventListener('mark', mark);

    function mark (event) {
        d3.transition()
          .delay(0)
          .duration(900)
          .tween("rotate", function() {
              var p = d3.geoCentroid(countries[event.detail.activated.idx]);
              // console.log(d3.geoCentroid(countries[event.detail.activated.idx]););
              var r = d3.interpolate(projection.rotate(), [ -p[0], -p[1] ]);
              return function (t) {
                projection.rotate(r(t));

                context.clearRect(0, 0, width, height);

                context.beginPath();
                path(topojson.mesh(world));
                context.stroke();
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

      

    // });


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