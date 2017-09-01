const {h, Component} = require('preact');
const topojson = require("topojson");
const d3 = require('d3');

const styles = require('./Canvas.scss');

var width = 750,
    height = 700;

var velocity = .02;




class Canvas extends Component {
  componentDidMount() {
    const world = require("./world-data/world-simple.topo.json");

    // Set up a D3 procection here 
    var projection = d3.geoOrthographic()
      .scale(170)
      .translate([width / 2, height / 2])
      .precision(.1);

    var base = d3.select('#canvas #map');
    var chart = base.append('canvas')
      .attr('width', width)
      .attr('height', height);

    console.log(canvas);

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

    d3.timer(function(elapsed) {
      context.clearRect(0, 0, width, height);
  
      projection.rotate([velocity * elapsed, 0]);
      context.beginPath();
      path(topojson.mesh(world));
      context.strokeStyle = "green";
      context.stroke();

    });

    // // Create an in memory only element of type 'custom'
    // var detachedContainer = document.createElement("custom");

    // // Create a d3 selection for the detached container. We won't
    // // actually be attaching it to the DOM.
    // var dataContainer = d3.select(detachedContainer);

    // function drawCustom(data) {
    //   var scale = d3.scaleLinear()
    //     .range([10, 390])
    //     .domain(d3.extent(data));

    //   var dataBinding = dataContainer.selectAll("custom.rect")
    //     .data(data, function(d) { return d; });

    //     dataBinding
    //       .attr("size", 8)
    //       .transition()
    //       .duration(1000)
    //       .attr("size", 15)
    //       .attr("fillStyle", "green");

    //     // for new elements, create a 'custom' dom node, of class rect
    //     // with the appropriate rect attributes
    //     dataBinding.enter()
    //       .append("custom")
    //       .classed("rect", true)
    //       .attr("x", scale)
    //       .attr("y", 100)
    //       .attr("size", 8)
    //       .attr("fillStyle", "red");

    //     dataBinding.exit()
    //       .attr("size", 8)
    //       .transition()
    //       .duration(1000)
    //       .attr("size", 5)
    //       .attr("fillStyle", "lightgrey");

    //   // drawCanvas();
    // }

    // function drawCanvas() {
      
    //     // clear canvas
    //     context.fillStyle = "#111";
    //     context.rect(0,0,chart.attr("width"),chart.attr("height"));
    //     context.fill();
      
    //     var elements = dataContainer.selectAll("custom.rect");
    //     elements.each(function(d) {
    //       var node = d3.select(this);
      
    //       context.beginPath();
    //       context.fillStyle = node.attr("fillStyle");
    //       context.rect(node.attr("x"), node.attr("y"), node.attr("size"), node.attr("size"));
    //       context.fill();
    //       context.closePath();
      
    //     });
    //   }

      // d3.timer(drawCanvas);
      // drawCustom([1,2,3,4,5,7]);

      // drawCustom([1,2,4,5,6]);
      
      // uncomment this, to see the transition~
      // drawCustom([1,2,12,16,20]);

      // drawCustom([1,3,12,19,20, 23, 24]);
    
    // var context = canvas.node().getContext('2d');

    // var context = chart.node().getContext("2d");
    // var data = [1, 2, 6, 13, 20, 23, 26, 27, 32];
    
    // var scale = d3.scaleLinear()
    //   .domain([1,100])
    //   .range([0, width]);
      
    
    // data.forEach(function(d, i) {
    //   context.beginPath();
    //   context.rect(scale(d), scale(d), 10, 10);
    //   context.fillStyle="red";
    //   context.fill();
    //   context.closePath();
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