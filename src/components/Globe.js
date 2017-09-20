const {h, Component} = require('preact');
const topojson = require('topojson');
const canvasDpiScaler = require('canvas-dpi-scaler');
// const d3 = require('d3');
import d3 from '../d3-custom'; // Modularise D3
const versor = require('../lib/versor'); // Canvas rotation library


const styles = require('./Globe.scss');

let mark, // Widen scope so we can unmount?
    resizeCanvas;

let screenWidth = window.innerWidth,
    screenHeight = window.innerHeight,
    initialGlobeScale,
    globeScale = 100, // Percent
    margins,
    launchCountryColor = "#21849B",
    pointFill = "#FF6100",
    pointStroke = "white",
    pointRadius = 6,
    pointLineWidth = 2,
    transitionDuration = 1300,
    isLandscape = true;
    
    if(window.innerHeight > window.innerWidth){
      isLandscape = !isLandscape;
    }



setMargins();

let focusPoint = [125.7625, 39.0392], // Pyongyang, North Korea
    launchCountryCode = 408,
    launchDotRadius = 60,
    tweenRange = 0;


const placeholder = document.querySelector('[data-north-korea-missile-range-root]');
const geojsonUrl = placeholder.dataset.geojson;
const storyDataUrl = placeholder.dataset.storydata;




// We are loading JSON data through d3-queue
function dataLoaded(error, data) {
  if (error) throw error;

  const worldMap = data[0],
        storyData = data[1];

  const land = topojson.feature(worldMap, worldMap.objects.land),
  countries = topojson.feature(worldMap, worldMap.objects.countries).features,
  borders = topojson.mesh(worldMap, worldMap.objects.countries,  function(a, b) { return a !== b; } ),
  globe = {type: "Sphere"};

  // Set launch/focus point to the centre of North Korea
  focusPoint = d3.geoCentroid(countries.find(item => item.id === launchCountryCode));

  // Indexing an array of objects
  function getItem(id) {
    return storyData.locations.find(item => item.id === id);
  }

  // Set original first marker values manually for now
  let currentLocationId = "pyongyang",
      currentRangeInKms = 0,
      previousRangeInKms = 0,
      currentLabels = null;

  // Set up a D3 projection here 
  const projection = d3.geoOrthographic()
    .translate([screenWidth / 2, screenHeight / 2])
    .clipAngle(90)
    .precision(0.1)
    .fitExtent([[margins,margins], [screenWidth -margins, screenHeight -margins]], globe);

  initialGlobeScale = projection.scale();

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



  // var obj = document.getElementById('id');
  // canvasEl.addEventListener('touchmove', function(event) {
  //   // If there's exactly one finger inside this element
  //   if (event.targetTouches.length == 2) {
  //     // Complete 2 finger touch logic here from https://www.html5rocks.com/en/mobile/touch/
  //   }
  // }, false);

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

  // Build a path generator
  const path = d3.geoPath()
    .projection(projection)
    .context(context);


  // Draw the initial Globe

  const initialPoint = getItem('pyongyang').longlat;
  projection.rotate([ -initialPoint[0], -initialPoint[1] ]);

  const geoCircle = d3.geoCircle().center(focusPoint);

  // Red dot to mark launch site
  // const launchPointCircle = d3.geoCircle()
  //                             .center(focusPoint)
  //                             .radius(kmsToRadius(70));

  const rangeCircle = d3.geoCircle()
                        .center(focusPoint)
                        .radius(kmsToRadius(currentRangeInKms));

  // Preload ABC Sans - maybe only works on desktop
  context.beginPath();
  context.fillStyle = 'rgba(0,0,0,1.0)';
  context.font = `700 18px ABCSans`;
  context.fillText('Osaka Seoul ' + String.fromCharCode(8202), 100, 100);


  drawWorld();

  // Clear and render a frame of each part of the globe
  function drawWorld(label) {

    // Clear the canvas ready for redraw
    // context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    // context.fillRect(0, 0, screenWidth, screenHeight); // Trippy clear trails just testing
    context.clearRect(0, 0, screenWidth, screenHeight);

    // Draw the water
    context.beginPath();
    context.fillStyle = '#E3F4F9';
    path(globe);
    context.fill();

    // Draw landmass
    context.beginPath();
    context.strokeStyle = '#1D3C43';
    context.fillStyle = 'white';
    context.lineWidth = screenWidth < 700 ? 1.1 : 1.6;
    path(land);
    context.fill();
    context.stroke();

    // Draw outline of countries
    context.beginPath();
    context.strokeStyle = "#1D3C43";
    context.lineWidth = screenWidth < 700 ? 1.1 : 1.6;
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


    // An experiment using clip and blur shadow

    // context.save();

    // context.beginPath();
    // context.strokeStyle = "#FF6100";
    // context.lineWidth = 3;
    // path(geoCircle.center(focusPoint)
    //   .radius(kmsToRadius(currentRangeInKms))());
    
    // context.clip();

    // context.beginPath();
    // context.strokeStyle = "#FF6100";
    // context.lineWidth = 1;
    // path(geoCircle.center(focusPoint)
    //   .radius(kmsToRadius(currentRangeInKms + 10))());
    // context.shadowColor   = 'black';
    // context.shadowBlur    = 15;
    // context.shadowOffsetX = 0;
    // context.shadowOffsetY = 0;
    
    // context.stroke();

    context.beginPath();
    context.globalAlpha = 0.15;
    context.fillStyle = launchCountryColor;
    // context.lineWidth = 1.6;
    path(geoCircle());
    context.fill();
    context.globalAlpha = 1;
    

    // Draw circle launch radius
    context.beginPath();
    context.strokeStyle = "#FF6100";
    // context.fillStyle = '#555'
    context.lineWidth = screenWidth < 700 ? 1.6 : 2.6;
    path(rangeCircle());
    context.stroke();
    // context.globalAlpha = 0.15;
    // context.globalCompositeOperation = 'destination-out';
    // context.fill();
    // context.globalAlpha = 1;
    // context.globalCompositeOperation = 'source-over';


    // context.beginPath();
    // // context.globalAlpha = 0.9;
    // context.strokeStyle = "#FF6100";
    // context.lineWidth = 1.6;
    // path(geoCircle.center(focusPoint)
    //   .radius(kmsToRadius(currentRangeInKms)));
    // context.stroke();

    // context.beginPath();
    // context.strokeStyle = "#FF6100";
    // context.lineWidth = 3;
    // path(geoCircle.center(focusPoint)
    //   .radius(kmsToRadius(currentRangeInKms - 100))());
    // context.globalCompositeOperation = 'destination-out';
    // context.fill();
    // context.globalCompositeOperation = 'source-over';

    // context.restore();

    // Draw a circle outline around the world
    context.beginPath()
    context.strokeStyle = "#1D3C43"
    context.lineWidth = screenWidth < 700 ? 2 : 3;
    path(globe);
    context.stroke();


    // Fill in the circle radius
    // context.beginPath();
    // context.globalAlpha = 0.3; // Maybe better Edge support
    // context.fillStyle = 'aquamarine';
    // // context.fillStyle = d3.lab(l,a,b, 0.3);

    // path(rangeCircle());
    // context.fill();



    // Reset global alpha
    context.globalAlpha = 1;


      // Please hide labels when on other side of the planet
    if (currentLabels && currentLabels[0]) {
      drawLabels();
    } // end if (currentLabel)

    function drawLabels() {
      currentLabels.forEach(function(element, i) {
        
        let geoAngle = d3.geoDistance(
          getItem(element).longlat,
          [
            -projection.rotate()[0],
            -projection.rotate()[1]
          ]
      );
      if (geoAngle > 1.57079632679490)
      {
        // Do nothing
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
            projection(getItem(element).longlat)[0],
            projection(getItem(element).longlat)[1],
            pointRadius,
            0, // Starting point on arc
            2*Math.PI); // Go around the whole circle
          context.fill();
          context.stroke();



          // Draw comparison label text

          let labelName = getItem(element).name; //.split("").join(String.fromCharCode(8202));
          let labelWidth = context.measureText(labelName).width;
          let fontSize = screenWidth < 700 ? 16 : 18;
          let labelMargins = 18;
          let markerLongitude = projection(getItem(element).longlat)[0];
          let markerLatitude = projection(getItem(element).longlat)[1];

          let labelOffset = 30;
          let pointerOffset = 12;
          let mobilePointerShrink = 0.6;

          context.font = `700 ${fontSize}px ABCSans`;
          context.textBaseline = "middle";
          

          if (isLandscape) {
            // Alternate labels left and right align
            if (i % 2 === 0) {

              // context.beginPath();
              // context.rect( 
              //   markerLongitude + labelOffset,
              //   markerLatitude - fontSize,
              //   labelWidth + labelMargins * 2,
              //   fontSize * 2,
              // );
              // context.fillStyle = 'black';
              // context.fill();

              // Draw the background and pointer
              context.beginPath();
              context.moveTo(markerLongitude + labelOffset, markerLatitude - fontSize);
              context.lineTo(markerLongitude + labelOffset + labelWidth + labelMargins * 2,
                markerLatitude - fontSize);
              context.lineTo(markerLongitude + labelOffset + labelWidth + labelMargins * 2,
                markerLatitude + fontSize);
              context.lineTo(markerLongitude + labelOffset, markerLatitude + fontSize);
              context.lineTo(markerLongitude + pointerOffset, markerLatitude);
              context.closePath();
              context.fillStyle = 'black';
              context.fill();

              // Draw the text
              context.fillStyle = 'white';
              context.textAlign = "left";
              context.fillText(
                labelName,
                markerLongitude + labelOffset + labelMargins,
                markerLatitude
              );


            } else {
              // Right aligned text pointers

              // context.beginPath();
              // context.rect( 
              //   projection(getItem(element).longlat)[0] - labelWidth - labelOffset - labelMargins * 2, 
              //   projection(getItem(element).longlat)[1] - fontSize,
              //   labelWidth + labelMargins * 2,
              //   fontSize * 2,
              // );
              // context.fillStyle = 'black';
              // context.fill();

              // Draw the background and pointer
              context.beginPath();
              context.moveTo(markerLongitude - labelOffset - labelWidth - labelMargins * 2,
                markerLatitude - fontSize);
              context.lineTo(markerLongitude - labelOffset,
                markerLatitude - fontSize);
              context.lineTo(markerLongitude - pointerOffset, markerLatitude);
              context.lineTo(markerLongitude - labelOffset, markerLatitude + fontSize);
              context.lineTo(markerLongitude - labelOffset - labelWidth - labelMargins * 2, 
                markerLatitude + fontSize);
              context.closePath();
              context.fillStyle = 'black';
              context.fill();

              context.textAlign = "right";
              context.fillStyle = 'white';
              context.fillText(
                labelName,
                projection(getItem(element).longlat)[0] - labelOffset - labelMargins,
                projection(getItem(element).longlat)[1]
              );


            }  // end label alternation
          }

          else { // If on portrait

            labelOffset = labelOffset * 0.7; // Tweak the pointer height a bit

            // Top and bottom labels
            if (i % 2 === 0) {

              // context.beginPath();
              // context.rect( 
              //   projection(getItem(element).longlat)[0] - (labelWidth + labelMargins * 2) / 2,
              //   projection(getItem(element).longlat)[1] - fontSize * 2 - labelOffset,
              //   labelWidth + labelMargins * 2,
              //   fontSize * 2,
              // );
              // context.fillStyle = 'black';
              // context.fill();

              // Top label with pointer
              context.beginPath();
              context.moveTo(markerLongitude - (labelWidth + labelMargins * 2) / 2,
                markerLatitude - labelOffset - fontSize * 2);
              context.lineTo(markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude - labelOffset - fontSize * 2);
              context.lineTo(markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude - labelOffset);
              context.lineTo(markerLongitude + fontSize * mobilePointerShrink,
                markerLatitude - labelOffset);
              context.lineTo(markerLongitude,
                markerLatitude - pointerOffset);
              context.lineTo(markerLongitude - fontSize * mobilePointerShrink,
                markerLatitude - labelOffset);
              context.lineTo(markerLongitude - (labelWidth + labelMargins * 2) / 2,
              markerLatitude - labelOffset);
              context.closePath();
              context.fillStyle = 'black';
              context.fill();

              context.fillStyle = 'white';
              context.textAlign = "left";
              context.fillText(
                labelName,
                projection(getItem(element).longlat)[0] - (labelWidth) / 2,
                projection(getItem(element).longlat)[1] - fontSize - labelOffset
              );

            } else {

              // context.beginPath();
              // context.rect( 
              //   projection(getItem(element).longlat)[0] - (labelWidth + labelMargins * 2) / 2, 
              //   projection(getItem(element).longlat)[1] + labelOffset,
              //   labelWidth + labelMargins * 2,
              //   fontSize * 2,
              // );
              // context.fillStyle = 'black';
              // context.fill();

              context.beginPath();
              context.moveTo(markerLongitude - (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset); // Top left corner
              context.lineTo(markerLongitude - fontSize * mobilePointerShrink,
                markerLatitude + labelOffset);
              context.lineTo(markerLongitude, // Point
                markerLatitude + pointerOffset);
              context.lineTo(markerLongitude + fontSize * mobilePointerShrink,
                markerLatitude + labelOffset);
              context.lineTo(markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset); // Right top corner
              context.lineTo(markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset + fontSize * 2); // Right bottom corner
              context.lineTo(markerLongitude - (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset + fontSize * 2); // Left bottom corner
              context.closePath();
              context.fillStyle = 'black';
              context.fill();

              context.textAlign = "left";
              context.fillStyle = 'white';
              context.fillText(
                labelName,
                projection(getItem(element).longlat)[0] - (labelWidth) / 2,
                projection(getItem(element).longlat)[1] + fontSize + labelOffset
              );

            }  // end label alternation
          }

        }
      }, this);
    } // end drawLabels function


    // Experimenting with displaying range on canvas
    if (currentRangeInKms) {
      context.fillStyle = 'black';
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(Math.ceil(tweenRange) + 'kms', 100, 100);
    }


  } // end drawWorld function



  mark = function (event) {
    currentLocationId = event.detail.activated.config.id;

    // If more than one LABEL assign directly as array
    if (event.detail.activated.config.label instanceof Array) {
      currentLabels = event.detail.activated.config.label;
    } else {
      currentLabels = [event.detail.activated.config.label];
    }

    // currentLabels = [event.detail.activated.config.label];


    currentRangeInKms = event.detail.activated.config.range;
    previousRangeInKms = event.detail.deactivated ? event.detail.deactivated.config.range : 0;

    globeScale = event.detail.activated.config.scale || 100;

    let shouldZoomOut = false;
    try {
      if (event.detail.activated.config.zoom && event.detail.deactivated.config.zoom) {
        shouldZoomOut = true;
      } 
    } catch (e) {}
    

    let newGlobeScale = initialGlobeScale * (globeScale / 100);

    let currentRotation = projection.rotate();

    const dummyRotate = {},
          dummyZoom = {};

    d3.select(dummyRotate).transition()
      .delay(0)
      .duration(transitionDuration)
      .tween("rotate", function() {
        if (!currentLocationId) return;
        var p = getItem(currentLocationId).longlat; // Make conditional in case of not found
        if (p) {

          let rotationInterpolate = d3.interpolate(currentRotation, [ -p[0], -p[1] ]);
          let radiusInterpolate = d3.interpolate(
            kmsToRadius(previousRangeInKms), 
            kmsToRadius(currentRangeInKms)
          );
          let radiusBlip = d3.interpolate(
            kmsToRadius(0), 
            kmsToRadius(currentRangeInKms)
          );
          let rangeDisplay = d3.interpolateNumber(previousRangeInKms, currentRangeInKms);

          return function (time) {

            projection.rotate(rotationInterpolate(time));
            rangeCircle.radius(radiusInterpolate(time));
            geoCircle.radius(radiusBlip(time));
            tweenRange = rangeDisplay(time);

            drawWorld();
          }
        }
      });


    // let distanceBetweenRotation = d3.geoDistance(
    //     getItem(currentLocationId).longlat,
    //     [
    //       -projection.rotate()[0],
    //       -projection.rotate()[1]
    //     ]
    //   );
    //   console.log(distanceBetweenRotation);

    shouldZoomOut ? zoomOutFirst() : zoomDirect();

    function zoomDirect() {
      d3.select(dummyZoom).transition()
      .duration(transitionDuration)
      .tween("zoom", function() {
        if (!currentLocationId) return;
        var p = getItem(currentLocationId).longlat;
        if (p) {
          
          let scaleInterpolate = d3.interpolate(projection.scale(),
                                   newGlobeScale);

          return function (time) {
          
            projection.scale(scaleInterpolate(time));
            
            drawWorld();
          }
        }
      })
    }

    function zoomOutFirst() {
      d3.select(dummyZoom).transition()
        .duration(transitionDuration / 2 + 300)
        .tween("zoom", function() {
          if (!currentLocationId) return;
          var p = getItem(currentLocationId).longlat;
          if (p) {
            
            let scaleInterpolate = d3.interpolate(projection.scale(),
              initialGlobeScale);

            return function (time) {
            
              projection.scale(scaleInterpolate(time));
              
              drawWorld();
            }
          }
        })
        .transition()
        .tween("zoom", function() {
          if (!currentLocationId) return;
          var p = getItem(currentLocationId).longlat;
          if (p) {
            
            let scaleInterpolate = d3.interpolate(projection.scale(),
                                                  newGlobeScale);

            return function (time) {
            
              projection.scale(scaleInterpolate(time));
              drawWorld();
            }
          }
        });
    }

        
      
  }; // mark function

  // Handle screen resizes
  resizeCanvas = function () {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;

    if(screenHeight > screenWidth){
      isLandscape = false;
    } else {
      isLandscape = true;
    }


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


function isInt(value) {
  if (isNaN(value)) {
    return false;
  }
  var x = parseFloat(value);
  return (x | 0) === x;
}


module.exports = Globe;