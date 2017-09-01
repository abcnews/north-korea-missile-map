const {h, Component} = require('preact');
const topojson = require("topojson");
const select = require("d3-selection");
const geo = require('d3-geo');
const request = require('d3-request');
const shape = require('d3-shape');
const scale = require('d3-scale');
const geoProj = require('d3-geo-projection');
const timer = require('d3-timer');

const styles = require("./World.scss");

const   width = 500,
        height = 400,
        fillOpacity = 0.7;

let rotation = 0;


// Set up a D3 procection here 
var projection = geo.geoOrthographic()
  .scale(170)
  .translate([width / 2, height / 2])
  .precision(.1);

// Set up our color scale
const colorScale = scale.scaleLinear()
  .domain([2017,2117])
  .range(['MEDIUMSEAGREEN', 'SLATEBLUE']);

class World extends Component {
  componentWillMount() {

  }
  componentDidMount() {
    const svg = select.select("#world #map")
      .append("svg")
      .classed(styles.scalingSvg, true)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr('viewBox', `0, 0, ${+width}, ${+height}`);


    // Load our data
    const world = require("./world-data/world-simple.topo.json");
    const eclipses = [
      // require("./world-data/2019-eclipse.geo.json"),
      // require("./world-data/2020-eclipse.geo.json"),
      // // require("./world-data/2021-eclipse.geo.json"), // Antarctica not inhabited (mostly)
      // require("./world-data/2024-eclipse.geo.json"),
      // require("./world-data/2026-eclipse.geo.json"),
      // require("./world-data/2027-eclipse.geo.json"),
    ];

    var countries = topojson.feature(world, world.objects.countries).features,
        neighbors = topojson.neighbors(world.objects.countries.geometries);

    projection
      .fitSize([width, height], topojson.feature(world, world.objects.countries))
      .scale(198); // Stops clipping top and bottom strokes
      
    const path = geo.geoPath()
      .projection(projection);

    // Define an outline for the globe
    svg.append("defs").append("path")
        .datum({type: "Sphere"})
        .attr("id", "sphere")
        .attr("d", path);

    svg.append("use")
        .attr("class", styles.stroke)
        .attr("xlink:href", "#sphere");

    svg.append("use")
        .attr("class", styles.fill)
        .attr("xlink:href", "#sphere");


    // Draw the World
    var theWorld = svg.append("path")
      .datum(topojson.feature(world, world.objects.land))
      .attr("d", path)
      .attr('fill', 'white')
      .attr('stroke', '#5C6C70')
      .attr('stroke-width', 1);


    // const widePathGroup = svg.append('g')
    //   .classed('eclipses', true)
    //   .selectAll('path')
    //   .data(eclipses)
    //   .enter().append('path')
    //   .attr('d', function (d) { return path(d.features[1].geometry)})
    //   .style('stroke', 'rgba(226, 122, 59, 0.5)')
    //   .style('stroke-width', 4)
    //   .attr('id', function (d, i) {return 'world-path-' + i})
    //   // .style('stroke-opacity', 0.5)
    //   .style('fill', 'none');

    // const midPoint = svg.append("g")
    //   .attr("class","points")
    //   .selectAll("path")
    //   .data(eclipses)
    //   .enter().append("path")
    //   .attr("class", "point")
    //   .attr('fill', 'rgba(226, 122, 59, 1)')
    //   .attr("d", function (d) { return path(d.features[3].geometry)});

    // const labelText = svg.append("g")
    //   .selectAll("text")
    //   .data(eclipses)
    //   .enter()
    //   .append("text")
    //   .attr("class", styles.label)
    //   .classed('label', true)
    //   .text(function(d) { return d.label })
    //   .style('font-weight', 'bold')
    //   .style('font-family', '"ABCSans","Interval Sans Pro",Arial,Helvetica,sans-serif')
    //   .style('fill', '#C44B00')
    //   .attr('text-anchor', function (d) { return d.textAnchor });

    // position_labels();

    // This positions labels and also hides them conditionally
    function position_labels() {
      svg.selectAll('.label')
        .attr("transform", function(d) { 
          return "translate(" + projection(d.features[3].geometry.coordinates) + ")"; 
        })
        .attr('dx', function(d) { 
          return d.labelOffset[0]; 
        })
        .attr('dy', function(d) { 
          return d.labelOffset[1]; 
        })
        .attr("opacity", function(d) {
          var geoangle = geo.geoDistance(
            d.features[3].geometry.coordinates,
              [
                -projection.rotate()[0],
                projection.rotate()[1]
              ]);
          if (geoangle > 1.57079632679490)
          {
            return "0";
          } else {
            return "1.0";
          }
      });
    }


    // Rotate ALL the paths
    // timer.timer(function() {
    //   var t = Date.now() - t0;
    //   projection.rotate([0.015 * t, 0]);
    //   widePathGroup.attr("d", function (d) { return path(d.features[1].geometry)});
    //   midPoint.attr("d", function (d) { return path(d.features[3].geometry)});
    //   position_labels(); // Hide labels on dark side of Earth
    //   theWorld.attr("d", path);
    // });

    document.addEventListener('mark', mark);

    function mark (event) {
      console.log(event.detail.activated);
      projection.rotate([
        rotation,
        0,
        0
        // randomIntFromInterval(0, 1000), 
        // randomIntFromInterval(0, 1000),
        // randomIntFromInterval(0, 1000)
      ]);
      rotation += 10;
      theWorld.attr("d", path);
    }
    
  }
  
  shouldComponentUpdate() {
    return false;
  }


  render() {
    return (
      <div id="world" className={"u-full " + styles.wrapper} aria-label="Globe of the World">
        <div className={styles.responsiveContainer}>
          <div id="map" className={styles.scalingSvgContainer}
            style={"padding-bottom: " + height / width * 100 + "%"}></div>
        </div>
      </div>
    );
  }
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

module.exports = World;
