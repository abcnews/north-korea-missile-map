const {h, Component} = require('preact');
const topojson = require('topojson');
const canvasDpiScaler = require('canvas-dpi-scaler');
// const d3 = require('d3');
import d3 from './d3-custom'; // Modularise D3
const versor = require('../lib/versor'); // Canvas rotation library


const styles = require('./Globe.scss');

let mark, // Widen scope so we can unmount?
    resizeCanvas;

let screenWidth = window.innerWidth,
    screenHeight = window.innerHeight,
    initialGlobeScale,
    globeScale = 100, // Percent
    margins,
    launchCountryColor = "orangered",
    pointFill = "orangered",
    pointStroke = "white",
    pointRadius = 6,
    pointLineWidth = 0.5;


setMargins();

let focusPoint = [125.7625, 39.0392], // Pyongyang, North Korea
    launchCountryCode = 408,
    launchDotRadius = 60;


const placeholder = document.querySelector('[data-north-korea-missile-range-root]');
const geojsonUrl = placeholder.dataset.geojson;
const storyDataUrl = placeholder.dataset.storydata;


function dataLoaded(error, data) {
  const worldMap = data[0],
        storyData = data[1];



  if (error) throw error;
  const land = topojson.feature(worldMap, worldMap.objects.land),
  countries = topojson.feature(worldMap, worldMap.objects.countries).features,
  borders = topojson.mesh(worldMap, worldMap.objects.countries, function(a, b) { return a !== b; }),
  globe = {type: "Sphere"};

  focusPoint = d3.geoCentroid(countries.find(item => item.id === launchCountryCode));

  // Indexing an array of objects
  function getItem(id) {
    return storyData.locations.find(item => item.id === id);
  }

  // Set original first marker values manually for now
  let currentLocationId = "pyongyang",
      currentRangeInKms = 0,
      previousRangeInKms = 0,
      currentLabel = null;

  // Set up a D3 projection here 
  const projection = d3.geoOrthographic()
    .translate([screenWidth / 2, screenHeight / 2])
    .clipAngle(90)
    .precision(0.1)
    .fitExtent([[margins,margins], [screenWidth -margins, screenHeight -margins]], globe);
    // .fitSize([width, height], globe)
    // .scale(299);

  initialGlobeScale = projection.scale();

  const base = d3.select('#globe #map');

  const canvas = base.append('canvas')
    .classed(styles.scalingGlobe, true)
    .attr('id', 'globe-canvas')
    .attr('width', screenWidth)
    .attr('height', screenHeight);

  if (!isMobileDevice()) {
    // Click and drag disable for now because can't scroll on touch devices
    // Detect media and disable
    canvas.call(d3.drag()
      // .filter(true) // Find out how to filter touch events
      .on("start", dragstarted)
      .on("drag", dragged));

      let 
        v0, // Mouse position in Cartesian coordinates at start of drag gesture.
        r0, // Projection rotation as Euler angles at start.
        q0; // Projection rotation as versor at start.

      function dragstarted() {
        v0 = versor.cartesian(projection.invert(d3.mouse(this)));
        r0 = projection.rotate();
        q0 = versor(r0);
      }

      function dragged() {
        var v1 = versor.cartesian(projection.rotate(r0).invert(d3.mouse(this))),
            q1 = versor.multiply(q0, versor.delta(v0, v1)),
            r1 = versor.rotation(q1);
        projection.rotate(r1);
        drawWorld();
      }
    } // end if (!isMobileDevice())

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

  const geoCircle = d3.geoCircle();

  // Red dot to mark launch site
  // const launchPointCircle = d3.geoCircle()
  //                             .center(focusPoint)
  //                             .radius(kmsToRadius(70));

  const rangeCircle = d3.geoCircle()
                        .center(focusPoint)
                        .radius(kmsToRadius(currentRangeInKms));



  // const labelCircle = d3.geoCircle()
  //                       .radius(kmsToRadius(70));



  drawWorld();

  // Clear and render a frame of each part of the globe
  function drawWorld(label) {

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

    // Draw launch country
    context.beginPath();
    context.fillStyle = launchCountryColor;
    path(countries.find(item => item.id === launchCountryCode));
    context.fill();

    // Point out launch point
    // context.beginPath();
    // context.fillStyle = pointFill;
    // context.strokeStyle = pointStroke;
    // context.lineWidth = 1;
    // path(
    //   geoCircle
    //   .center(d3.geoCentroid(countries.find(item => item.id === launchCountryCode))) //focusPoint)
    //   .radius(kmsToRadius(launchDotRadius))()
    // )
    // context.fill();
    // context.stroke();

    // Draw circle radius
    context.beginPath();
    context.strokeStyle = "red";
    context.lineWidth = 1.5;
    path(rangeCircle());
    context.stroke();

    // Draw a circle outline around the world
    context.beginPath()
    context.strokeStyle = "#111"
    context.lineWidth = 2;
    path(globe);
    context.stroke();

    // Fill in the circle radius
    context.beginPath();
    context.globalAlpha = 0.07; // Maybe better Edge support
    // context.fillStyle = 'rgba(255, 0, 0, 0.07';
    context.fillStyle = 'red';
    path(rangeCircle());
    context.fill();

    // Reset global alpha
    context.globalAlpha = 1;


      // Please hide labels when on other side of the planet
    if (currentLabel) {
      let geoAngle = d3.geoDistance(
          getItem(currentLabel).longlat,
          [
            -projection.rotate()[0],
            -projection.rotate()[1]
          ]
      );
      if (geoAngle > 1.57079632679490)
      {
        return "0";
      } else {
          // Draw a comparison label dot
          context.beginPath();
          context.fillStyle = pointFill;
          context.strokeStyle = pointStroke;
          context.lineWidth = pointLineWidth;
          // path(
          //     geoCircle
          //     .center(getItem(currentLabel).longlat)
          //     .radius(kmsToRadius(pointRadius))()
          //   );
          context.arc(
            projection(getItem(currentLabel).longlat)[0],
            projection(getItem(currentLabel).longlat)[1],
            pointRadius, 
            0, // Starting point on arc
            2*Math.PI); // Go around the whole circle
          context.fill();
          context.stroke();

          // Draw comparison label text
          context.fillStyle = 'black';
          context.font = "italic 16px Roboto";
          context.textBaseline="middle"; 
          context.fillText(
            getItem(currentLabel).name,
            projection(getItem(currentLabel).longlat)[0] + 10,
            projection(getItem(currentLabel).longlat)[1]
          );
        return "1.0";
      }
    } // end if (currentLabel)

  } // end drawWorld function



  mark = function (event) {
    // console.log("activated: ", event.detail.activated.config)
    // console.log("deactivated: ", event.detail.deactivated ? event.detail.deactivated.config : "not defined")

    currentLocationId = event.detail.activated.config.id;
    currentLabel = event.detail.activated.config.label || null;


    currentRangeInKms = event.detail.activated.config.range;
    previousRangeInKms = event.detail.deactivated ? event.detail.deactivated.config.range : 0;

    globeScale = event.detail.activated.config.scale || 100;

    let newGlobeScale = initialGlobeScale * (globeScale / 100);

    d3.transition()
      .delay(0)
      .duration(1200)
      .tween("rotate", function() {
        var p = getItem(currentLocationId).longlat; // Make conditional in case of not found
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
      // console.log("Current projection scale: " + projection.scale());
  }; // mark function

  // Handle screen resizes
  resizeCanvas = function () {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;

    // globeScale = 100;

    setMargins();

    canvas.attr('width', screenWidth)
          .attr('height', screenHeight);

    projection.translate([screenWidth / 2, screenHeight / 2])
              .fitExtent([
                [margins, margins], 
                [screenWidth -margins, screenHeight -margins]], 
                 globe);

    initialGlobeScale = projection.scale();

    projection.scale(projection.scale() * globeScale / 100);

    // Pixel display and High DPI monitor scaling
    canvasDpiScaler(canvasEl, context);

    drawWorld();
  }

  // Add event listener for our marks
  document.addEventListener('mark', mark);
  window.addEventListener('resize', resizeCanvas);
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
    window.removeEventListener('resize', resizeCanvas);
  }
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <div id="globe" className={"u-full " + styles.wrapper} aria-label="A globe that spins and shows missile ranges.">
        <div id="map">{/* Canvas gets appended here */}</div>
      </div>
    );
  }
}

// Some functions
function kmsToRadius (kms) {
  return kms / 111.319444 // This many kilometres per degree
}

function setMargins() {
  margins = Math.floor(Math.min(screenWidth, screenHeight) * 0.05);

  // Conditional margins
  if (screenWidth > 700) {
    margins = Math.floor(Math.min(screenWidth, screenHeight) * 0.15);
  }
}


function isMobileDevice() {
  return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};


module.exports = Globe;