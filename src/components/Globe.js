const {h, Component} = require('preact');
const topojson = require('topojson');
const canvasDpiScaler = require('canvas-dpi-scaler');
// const d3 = require('d3');
import d3 from './d3-custom';

const styles = require('./Globe.scss');

let mark, // Make marker functions file scoped so we can unmount?
    canvasSize; 

let screenWidth = window.innerWidth,
    screenHeight = window.innerHeight,
    initialGlobeScale,
    globeScale = 100; // Percent


let focusPoint = [125.7625, 39.0392]; // Pyongyang, North Korea


const placeholder = document.querySelector('[data-north-korea-missile-range-root]');
const geojsonUrl = placeholder.dataset.geojson;
const storyDataUrl = placeholder.dataset.storydata;


function dataLoaded(error, data) {
  if (error) throw error;
  // console.log(data);
  const land = topojson.feature(data[0], data[0].objects.land),
  countries = topojson.feature(data[0], data[0].objects.countries).features,
  borders = topojson.mesh(data[0], data[0].objects.countries, function(a, b) { return a !== b; }),
  globe = {type: "Sphere"};

  const storyData = data[1];

  // Indexing an array of objects
  // console.log(storyData.find(item => item.id === "pyongyang"));
  function getItem(id) {
    return storyData.locations.find(item => item.id === id);
  }

  let currentLocationId = "pyongyang",
      currentRangeInKms = 400,
      previousRangeInKms = 400;

  // Set up a D3 projection here 
  const projection = d3.geoOrthographic()
    .translate([screenWidth / 2, screenHeight / 2])
    .clipAngle(90)
    .precision(0.1)
    .fitExtent([[100,100], [screenWidth -100, screenHeight -100]], globe);
    // .fitSize([width, height], globe)
    // .scale(299);

  initialGlobeScale = projection.scale();
  console.log('Initial globe scale: ' + initialGlobeScale);

  const base = d3.select('#globe #map');

  const canvas = base.append('canvas')
    .classed(styles.scalingGlobe, true)
    .attr('id', 'globe-canvas')
    .attr('width', screenWidth)
    .attr('height', screenHeight);

  const context = canvas.node().getContext('2d');
  const canvasEl = document.getElementById('globe-canvas');
  // Pixel display and High DPI monitor scaling
  canvasDpiScaler(canvasEl, context);


  const path = d3.geoPath()
    .projection(projection)
    .context(context);


  // Draw the initial Globe

  const initialPoint = getItem('pyongyang').longlat;
  projection.rotate([ -initialPoint[0], -initialPoint[1] ]);

  // Red dot to mark launch site
  const pyongyang = d3.geoCircle()
                      .center(focusPoint)
                      .radius(kmsToRadius(70));

  const rangeCircle = d3.geoCircle()
                        .center(focusPoint)
                        .radius(kmsToRadius(currentRangeInKms));


  drawWorld();

  // Handle screen resizes
  canvasSize = function () {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;

    canvas.attr('width', screenWidth)
          .attr('height', screenHeight);

    projection.translate([screenWidth / 2, screenHeight / 2])
              .fitExtent([[100,100], [screenWidth -100, screenHeight -100]], globe);

    projection.scale(projection.scale() * globeScale / 100);
    
    

    // Pixel display and High DPI monitor scaling
    canvasDpiScaler(canvasEl, context);

    drawWorld();
  }

  // Clear and render a frame of each part of the globe
  function drawWorld() {

    // Clear the canvas ready for redraw
    context.clearRect(0, 0, screenWidth, screenHeight);

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
    console.log("deactivated: ", event.detail.deactivated ? event.detail.deactivated.config : "not defined")

    currentLocationId = event.detail.activated.config.id;

    currentRangeInKms = event.detail.activated.config.range;
    previousRangeInKms = event.detail.deactivated ? event.detail.deactivated.config.range : 0;

    globeScale = event.detail.activated.config.scale || 100;

    let newGlobeScale = initialGlobeScale * (globeScale / 100);

    d3.transition()
      .delay(10)
      .duration(1200)
      .tween("rotate", function() {
        var p = getItem(currentLocationId).longlat;
        if (p) {
          let rotationInterpolate = d3.interpolate(projection.rotate(), [ -p[0], -p[1] ]);
          let radiusInterpolate = d3.interpolate(
            kmsToRadius(previousRangeInKms), 
            kmsToRadius(currentRangeInKms)
          );
          let scaleInterpolate = d3.interpolate(projection.scale(),
                                                newGlobeScale);
          return function (time) {
            projection.rotate(rotationInterpolate(time));
            rangeCircle.radius(radiusInterpolate(time));
            projection.scale(scaleInterpolate(time));
            drawWorld();
          }
        }
      });
      console.log("Current projection scale: " + projection.scale());
  }; // mark function

  // Add event listener for our marks
  document.addEventListener('mark', mark);
  window.addEventListener('resize', canvasSize, false);
}


class Globe extends Component {
  componentDidMount() {
    d3.queue(2) // load a certain number of files concurrently
      .defer(d3.json, geojsonUrl)
      .defer(d3.json, storyDataUrl)
      .awaitAll(dataLoaded);
    // const world = require("./world-data/world-simple.topo.json");
  }
  componentWillUnmount() {
    console.log("Component unmounting remove event listeners etc...");
    document.removeEventListener('mark', mark);
    window.removeEventListener('resize', canvasSize, false);
  }
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <div id="globe" className={"u-full " + styles.wrapper} aria-label="A globe that spins and shows missile ranges.">
        {/* <div className={styles.responsiveContainer}>
          <div id="map" className={styles.scalingContainer}
            style={"padding-bottom: " + height / width * 100 + "%"}></div>
        </div> */}
        <div id="map">
            {/* Canvas gets appended here */}
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