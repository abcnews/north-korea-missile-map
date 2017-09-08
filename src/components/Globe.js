const {h, Component} = require('preact');
const topojson = require('topojson');
// const d3 = require('d3');
import d3 from './d3-custom';

const styles = require('./Globe.scss');

let mark; // Make marker function "global" so we can unmount?

var width = 600,
    height = 600;

const spinPoints = [
  [125.7625, 39.0392], // Pyongyang, North Korea
  [153.021072, -27.470125], // Brisbane, Australia
  [201.736328, 55.545804], // It's so cold in Alaska
  [125.7625, 39.0392], // Pyongyang, North Korea
  [125.7625, 39.0392], // Pyongyang, North Korea
];

const rangeDistances = [500, 6700, 6700, 8000, 400]; // Will use hashes instead



// New es6 way if undexing an array of objects
// console.log(storyData.find(item => item.id === "pyongyang"));

const placeholder = document.querySelector('[data-north-korea-missile-range-root]');
const geojsonUrl = placeholder.dataset.geojson;




function dataLoaded(error, data) {
  if (error) throw error;
  // console.log(data);
  const land = topojson.feature(data[0], data[0].objects.land),
  countries = topojson.feature(data[0], data[0].objects.countries).features,
  borders = topojson.mesh(data[0], data[0].objects.countries, function(a, b) { return a !== b; }),
  globe = {type: "Sphere"};

  const storyData = data[1];
  
  // {"locations": [
  //   {
  //     "id": "pyongyang",
  //     "longlat": [125.7625, 39.0392]
  //   },
  //   {
  //     "id": "brisbane",
  //     "longlat": [153.021072, -27.470125]
  //   },
  //   {
  //     "id": "alaska",
  //     "longlat": [201.736328, 55.545804]
  //   }
  // ]};

  function getItem(id) {
    return storyData.locations.find(item => item.id === id);
  }

  let currentLocationId = "pyongyang",
      currentRangeInKms = 0,
      previousRangeInKms = 0;

  // Set up a D3 projection here 
  var projection = d3.geoOrthographic()
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .precision(0.1)
    .fitSize([width, height], globe)
    .scale(299);

  var base = d3.select('#globe #map');
  var canvas = base.append('canvas')
    .classed(styles.scalingGlobe, true)
    .attr('width', width)
    .attr('height', height);

  var context = canvas.node().getContext("2d");

  var path = d3.geoPath()
    .projection(projection)
    .context(context);


  // do your drawing stuff here
  // Draw the initial Globe

  // console.log(getItem('pyongyang').longlat);

  const initialPoint = getItem('pyongyang').longlat;
  projection.rotate([ -initialPoint[0], -initialPoint[1] ]);

  // Red dot to mark launch site
  const pyongyang = d3.geoCircle()
                      .center(spinPoints[0])
                      .radius(kmsToRadius(70));

  const rangeCircle = d3.geoCircle()
                        .center(spinPoints[0])
                        .radius(kmsToRadius(currentRangeInKms));

  drawWorld();

  // Clear and render a frame of each part of the globe
  function drawWorld() {

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

    // Point out Pyongyang
    context.beginPath();
    context.fillStyle = "red";
    path(pyongyang());
    context.fill();

    // Draw circle radius
    context.beginPath();
    context.strokeStyle = "red";
    context.lineWidth = 1.5;
    path(rangeCircle());
    context.stroke();

    // Draw a circle outline around the world
    context.beginPath()
    context.strokeStyle = "#111"
    context.lineWidth = 2
    path(globe)
    context.stroke();

    // Fill in the circle radius
    context.beginPath();
    context.fillStyle = 'rgba(255, 0, 0, 0.07';
    path(rangeCircle());
    context.fill();
  } // drawWorld function



  mark = function (event) {
    console.log("activated: ", event.detail.activated.config)
    console.log("deactivated: ", event.detail.deactivated.config)

    currentLocationId = event.detail.activated.config.id;

    currentRangeInKms = event.detail.activated.config.range;
    previousRangeInKms = event.detail.deactivated.config.range;

    d3.transition()
      .delay(10)
      .duration(1200)
      .tween("rotate", function() {
        var p = getItem(currentLocationId).longlat; // spinPoints[event.detail.activated.idx];
        if (p) {
          let rotation = d3.interpolate(projection.rotate(), [ -p[0], -p[1] ]);
          let radius = d3.interpolate(
            kmsToRadius(previousRangeInKms), 
            kmsToRadius(currentRangeInKms)
          );
          return function (t) {
            projection.rotate(rotation(t));
            rangeCircle.radius(radius(t));
            drawWorld();
          }
        }
      });
  }; // mark function

  // Add event listener for our marks
  document.addEventListener('mark', mark);
}


class Globe extends Component {
  componentDidMount() {
    d3.queue(3)
      .defer(d3.json, geojsonUrl)
      .defer(d3.json, "http://nucwed.aus.aunty.abc.net.au/cm/code/8886258/story-data.json.js")
      .awaitAll(dataLoaded);
    // const world = require("./world-data/world-simple.topo.json");
  }
  componentWillUnmount() {
    console.log("Component unmounting remove event listeners etc...");
    document.removeEventListener('mark', mark);
  }
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <div id="globe" className={"u-full " + styles.wrapper} aria-label="A map">
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
  return kms / 111.319444 // This many kilometres per degree
}




module.exports = Globe;