const {h, Component} = require('preact');
const topojson = require('topojson');
const canvasDpiScaler = require('canvas-dpi-scaler');
const d3 = require('d3'); // Requiring all due to events not working with modules
// import d3 from '../d3-custom'; // Modularise D3
const versor = require('../lib/versor'); // Canvas rotation library


const styles = require('./Globe.scss');

const abcBackgroundColor = "#f9f9f9";

let mark, // Widen scope so we can unmount event listeners?
    resizeCanvas; // Is there a better way to do this? Probably

let screenWidth = window.innerWidth,
    screenHeight = window.innerHeight,
    initialGlobeScale,
    globeScale = 100, // as percentage %
    margins,
    launchCountryColor = "#21849B",
    pointFill = "#FF6100",
    pointStroke = "white",
    landStrokeColor = "#1D3C43",
    pointRadius = 6,
    pointLineWidth = 2,
    transitionDuration = 1300,
    isLandscape = true;
    
if (window.innerHeight > window.innerWidth) {
  isLandscape = !isLandscape;
}



setMargins();

let focusPoint = [],
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
  let currentLocationId = "northkorea",
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

  // Build a path generator
  const path = d3.geoPath()
    .projection(projection)
    .context(context);


  // Draw the initial Globe

  const initialPoint = getItem('northkorea').longlat;
  projection.rotate([ -initialPoint[0], -initialPoint[1] ]);

  const geoCircle = d3.geoCircle().center(focusPoint);


  const rangeCircle = d3.geoCircle()
                        .center(focusPoint)
                        .radius(kmsToRadius(currentRangeInKms));

  // Try to preload ABC Sans
  context.beginPath();
  context.fillStyle = 'rgba(0,0,0,1.0)';
  context.font = `700 18px ABCSans`;
  context.fillText('Osaka Seoul ' + String.fromCharCode(8202), 100, 100);


  drawWorld();

  // Clear and render a frame of each part of the globe
  function drawWorld(label) {

    // Clear the canvas ready for redraw
    context.clearRect(0, 0, screenWidth, screenHeight);

    // Draw the water
    context.beginPath();
    context.fillStyle = '#E4EDF0';
    path(globe);
    context.fill();

    // Draw landmass
    context.beginPath();
    context.strokeStyle = landStrokeColor;
    context.fillStyle = 'white';
    context.lineWidth = screenWidth < 700 ? 0.5 : 1.1;
    path(land);
    context.fill();
    context.stroke();

    // Draw outline of countries
    context.beginPath();
    context.strokeStyle = landStrokeColor;
    context.lineWidth = screenWidth < 700 ? 0.5 : 1.1;
    path(borders);
    context.stroke();

    // Draw launch country
    context.beginPath();
    context.fillStyle = launchCountryColor;
    path(countries.find(item => item.id === launchCountryCode));
    context.fill();


    // Draw circle launch radius
    context.beginPath();
    context.strokeStyle = "#FF6100";
    context.globalAlpha = 0.1;
    context.fillStyle = '#FF4D00'
    context.lineWidth = screenWidth < 700 ? 2 : 3;
    path(rangeCircle());
    context.fill();
    context.globalAlpha = 1;
    context.stroke();

    // Draw a circle outline around the world
    // First clear any radius 
    context.beginPath()
    context.strokeStyle = abcBackgroundColor;
    context.lineWidth = 12;
    path(globe);
    context.stroke();

    context.beginPath()
    context.strokeStyle = "#B6CED6";
    context.lineWidth = screenWidth < 700 ? 2 : 2;
    projection.scale(projection.scale() - 5)
    path(globe);
    context.stroke();
    projection.scale(projection.scale() + 5)

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
          
          context.arc(
            projection(getItem(element).longlat)[0],
            projection(getItem(element).longlat)[1],
            pointRadius,
            0, // Starting point on arc
            2 * Math.PI); // Go around the whole circle
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
          context.textBaseline = "bottom";
          

          if (isLandscape) {
            // Alternate labels left and right align
            if (i % 2 === 0) {

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
                markerLatitude + fontSize * 0.6 // Firefox doesn't do baseline properly so nudging the centre
              );


            } else {
              // Right aligned text pointers
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
                markerLongitude - labelOffset - labelMargins,
                markerLatitude + fontSize * 0.6
              );
            }  // end label alternation
          }

          else { // If on portrait

            labelOffset = labelOffset * 0.7; // Tweak the pointer height a bit

            // Top and bottom labels
            if (i % 2 === 0) {
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
              context.textAlign = 'left';
              context.fillText(
                labelName,
                markerLongitude - (labelWidth) / 2,
                markerLatitude - fontSize * 0.4 - labelOffset
              );

            } else {

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

              context.textAlign = 'left';
              context.fillStyle = 'white';
              context.fillText(
                labelName,
                markerLongitude - (labelWidth) / 2,
                markerLatitude + fontSize * 1.6 + labelOffset
              );

            }  // end label alternation
          }

        }
      }, this);
    } // end drawLabels function


    // Experimenting with displaying range on canvas
    // if (currentRangeInKms) {
    //   context.fillStyle = 'black';
    //   context.textAlign = "left";
    //   context.textBaseline = "middle";
    //   context.fillText(Math.ceil(tweenRange) + 'kms', 100, 100);
    // }


  } // end drawWorld function


  mark = function (event) {
    currentLocationId = event.detail.activated.config.id;

    // If more than one LABEL assign directly as array
    if (event.detail.activated.config.label instanceof Array) {
      currentLabels = event.detail.activated.config.label;
    } else {
      currentLabels = [event.detail.activated.config.label];
    }


    currentRangeInKms = event.detail.activated.config.range;
    previousRangeInKms = event.detail.deactivated ? event.detail.deactivated.config.range : 0;

    globeScale = event.detail.activated.config.scale || 100;

    let shouldZoomOut = false;
    try {
      if (event.detail.activated.config.zoom && event.detail.deactivated.config.zoom) {
        shouldZoomOut = true;
      } 
    } catch (error) {
      console.log(error);
    }
    

    let newGlobeScale = initialGlobeScale * (globeScale / 100);

    let currentRotation = projection.rotate();

    // Instead of transitioning directly on elements
    // we transition using tween functions on dummy elements
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
          let rangeDisplay = d3.interpolateNumber(previousRangeInKms, currentRangeInKms);

          return function (time) {

            projection.rotate(rotationInterpolate(time));
            rangeCircle.radius(radiusInterpolate(time));
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


  // Experimental feature to allow click and drag
  // Need to make work on mobile with two finger drag maybe
  // Still very rough
  // let allowRotate = false;

  let 
    v0, // Mouse position in Cartesian coordinates at start of drag gesture.
    r0, // Projection rotation as Euler angles at start.
    q0; // Projection rotation as versor at start.

  // Click and drag disable for now because can't scroll on touch devices
  // Detect media and disable
  // let drag = d3.drag();


canvas.on('mousedown', function() {
    dragStarted(this);

    canvas.on('mousemove', function () {
      dragged(this);
    }, false);

    canvas.on('mouseup', function() {
      dragged(this);
      canvas.on('mousemove', null);
    }, false);

  }, false);




  canvas.on('touchstart', function() {
    let that = this;
    // If there's exactly one finger inside this element
    if (event.targetTouches.length == 2) {
      // Complete 2 finger touch logic here from https://www.html5rocks.com/en/mobile/touch/
      // dragstarted(canvas);
      // allowRotate = true;
      touchDragStarted(this);
      event.preventDefault();

      canvas.on('touchmove', function () {
        touchDragged(this);
      }, false);

      canvas.on('touchend', function() {
        // if (allowRotate) {
          // touchDragged(this); // Not needed and it creates jumpiness anyway
          canvas.on('touchmove', null);
        // }
          // allowRotate = false;
      });

    }
  });

  

  // Original method. Need to modify to allow scroll in mobile.
  // d3.select('canvas').call(drag
  //   .on("start", dragstarted)
  //   .on("drag", dragged));


      function dragStarted(el) {
          v0 = versor.cartesian(projection.invert(d3.mouse(el)));
          r0 = projection.rotate();
          q0 = versor(r0);
        
      }

      function dragged(el) {
        var v1 = versor.cartesian(projection.rotate(r0).invert(d3.mouse(el))),
            q1 = versor.multiply(q0, versor.delta(v0, v1)),
            r1 = versor.rotation(q1);
        projection.rotate(r1);
        drawWorld();
      }

      // Handle touches differently to avoid jitter on two fingers
      function touchDragStarted(el) {
        v0 = versor.cartesian(projection.invert(d3.touches(el)[0]));
        r0 = projection.rotate();
        q0 = versor(r0);
      
    }

    function touchDragged(el) {
      var v1 = versor.cartesian(projection.rotate(r0).invert(d3.touches(el)[0])),
          q1 = versor.multiply(q0, versor.delta(v0, v1)),
          r1 = versor.rotation(q1);
      projection.rotate(r1);
      drawWorld();
    }

  if (!isMobileDevice()) {
    } // end if (!isMobileDevice())

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
