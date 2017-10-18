const { h, Component } = require("preact");
const topojson = require("topojson");
const canvasDpiScaler = require("canvas-dpi-scaler");
const select = require("d3-selection"); // For events to work

import d3 from "../d3-custom"; // Modularise D3
const versor = require("../lib/versor"); // Canvas rotation library

const styles = require("./Globe.scss");

const abcBackgroundColor = "#f9f9f9";

let mark, // Widen scope so we can unmount event listeners?
  resizeCanvas; // Is there a better way to do this? Probably

let screenWidth = window.innerWidth,
  screenHeight = window.innerHeight,
  initialGlobeScale,
  globeScale = 100, // as percentage
  margins,
  launchCountryColor = "#21849B",
  pointFill = "#FF6100",
  pointStroke = "white",
  landStrokeColor = "rgba(29, 60, 67, 0.5)",
  landStrokeWidth = 1.1, // Stroke > 1 to avoid Chrome line stitching
  pointRadius = 6,
  pointLineWidth = 2,
  radiusStrokeWidth = 3,
  disableTrnasitions = false,
  transitionDuration = 1300,
  isLandscape = true;

let tweening = 0; // Hack to track rotate tween end and tween zoom

// Detect if portrait or landscape for label positioning
if (screenHeight > screenWidth) {
  isLandscape = !isLandscape;
}

// Override the viewheight vh margins to prevent jumping on mobile scroll changing directions
let blockArray = document.getElementsByClassName("Block-content");

for (var i = 0; i < blockArray.length; i++) {
  blockArray[i].style.marginTop = screenHeight / 2 + 64 + "px";
  blockArray[i].style.marginBottom = screenHeight / 2 + 64 + "px";
}

// Top and bottom have full length margins
blockArray[0].style.marginTop = screenHeight + "px";
blockArray[blockArray.length - 1].style.marginBottom = screenHeight + "px";

// On mobile we want smaller margins
setMargins();

// Where we are launching the missiles from
let focusPoint = [],
  launchCountryCode = 408; // North Korea

// Setup where to inject our interactive code
const placeholder = document.querySelector(
    "[data-north-korea-missile-range-root]"
  ),
  // Grab the data url from the HTML fragment
  geojsonUrl = placeholder.dataset.geojson,
  storyDataUrl = placeholder.dataset.storydata;

// We are loading JSON data through d3-queue then this function fires
function dataLoaded(error, data) {
  if (error) throw error;

  const worldMap = data[0], // TopoJSON representation of world geographies
    storyData = data[1]; // JSON doc of longitudes and latitudes and place names

  // Divide our data up into different GeoJSON objects
  const land = topojson.feature(worldMap, worldMap.objects.land),
    countries = topojson.feature(worldMap, worldMap.objects.countries).features,
    borders = topojson.mesh(worldMap, worldMap.objects.countries, function(
      a,
      b
    ) {
      return a !== b; // This makes sure not to return ocean borders
    }),
    // A special object representing the whole D3-Geo area
    // In this case (orthographic projection) it is a faux-sphere
    globe = { type: "Sphere" };

  // Set launch/focus point to the centre of North Korea
  focusPoint = d3.geoCentroid(
    countries.find(item => item.id === launchCountryCode)
  );

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
  const projection = d3
    .geoOrthographic() // Globe projection
    .translate([screenWidth / 2, screenHeight / 2])
    .clipAngle(90) // Only display front side of the world
    .precision(0.6)
    .fitExtent( // Auto zoom
      [[margins, margins], [screenWidth - margins, screenHeight - margins]],
      globe
    );

  // Set initial global scale to handle zoom ins and outs
  initialGlobeScale = projection.scale();

  // Set up the canvas stage background
  const base = select.select("#globe #map");

  const canvas = base
    .append("canvas")
    .classed(styles.scalingGlobe, true)
    .attr("id", "globe-canvas")
    .attr("width", screenWidth)
    .attr("height", screenHeight);

  // Set up our canvas drawing context
  const context = canvas.node().getContext("2d");

  // A non-d3 element selection for Retina dn High DPI scaling
  const canvasEl = document.getElementById("globe-canvas");

  // Auto-convert canvas to Retina display and High DPI monitor scaling
  canvasDpiScaler(canvasEl, context);

  // Build a path generator for our orthographic projection
  const path = d3
    .geoPath()
    .projection(projection)
    .context(context);

  // Render setup
  // Let's look at North Korea
  const initialPoint = getItem("northkorea").longlat;
  projection.rotate([-initialPoint[0], -initialPoint[1]]);

  const rangeCircle = d3
    .geoCircle()
    .center(focusPoint)
    .radius(kmsToRadius(currentRangeInKms));

  // Try to preload ABC Sans to avoid font flicker
  context.beginPath();
  context.fillStyle = "rgba(0, 0, 0, 0.0)";
  context.font = "700 18px ABCSans";
  context.fillText("Preloading ABC Sans...", 100, 100);

  // Draw the inital state of the world
  drawWorld();

  // Function for clearing and render a frame of each part of the globe
  function drawWorld() {
    // Clear the canvas ready for redraw
    context.clearRect(0, 0, screenWidth, screenHeight);

    // Draw the oceans and the seas
    context.beginPath();
    context.fillStyle = "#E4EDF0";
    path(globe);
    context.fill();

    // Draw all landmasses
    context.beginPath();
    context.strokeStyle = landStrokeColor;
    context.fillStyle = "white";
    context.lineWidth = landStrokeWidth;
    path(land);
    context.fill();
    context.stroke();

    // Draw outline of countries
    context.beginPath();
    context.strokeStyle = landStrokeColor;
    context.lineWidth = landStrokeWidth;
    path(borders);
    context.stroke();

    // Draw our launch country
    context.beginPath();
    context.fillStyle = launchCountryColor;
    path(countries.find(item => item.id === launchCountryCode));
    context.fill();

    // Draw circle launch radius
    context.beginPath();
    context.strokeStyle = "#FF6100";
    context.globalAlpha = 0.1;
    context.fillStyle = "#FF4D00";
    context.lineWidth = radiusStrokeWidth;
    path(rangeCircle());
    context.fill();
    context.globalAlpha = 1;
    context.stroke();

    // Draw a circle outline around the world
    // First clear any radius around the outside
    context.beginPath();
    context.strokeStyle = abcBackgroundColor;
    context.lineWidth = 12;
    path(globe);
    context.stroke();

    // Draw a petite circle a bit smaller radius
    // We mess with the scale then put it back
    context.beginPath();
    context.strokeStyle = "#B6CED6";
    context.lineWidth = 2;
    projection.scale(projection.scale() - 5);
    path(globe);
    context.stroke();
    projection.scale(projection.scale() + 5);

    // Label the places we want to point out
    if (currentLabels && currentLabels[0]) {
      drawLabels();
    }

    // Please hide labels when on other side of the planet
    function drawLabels() {
      currentLabels.forEach(function(element, i) {
        let geoAngle = d3.geoDistance(getItem(element).longlat, [
          -projection.rotate()[0],
          -projection.rotate()[1]
        ]);
        if (geoAngle > 1.5707963267949) {
          // Do nothing because out of sight
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
            2 * Math.PI
          ); // Go around the whole circle
          context.fill();
          context.stroke();

          // Draw comparison label text
          let fontSize = screenWidth < 700 ? 16 : 18;
          let labelMargins = 18;
          let markerLongitude = projection(getItem(element).longlat)[0];
          let markerLatitude = projection(getItem(element).longlat)[1];

          let labelOffset = 30;
          let pointerOffset = 12;
          let mobilePointerShrink = 0.6;

          context.font = `700 ${fontSize}px ABCSans`;
          context.textBaseline = "bottom";

          let labelName = getItem(element).name;
          let labelWidth = context.measureText(labelName).width;

          if (isLandscape) {
            // Alternate labels left and right align
            if (i % 2 === 0) {
              // Draw the background and pointer
              context.beginPath();
              context.moveTo(
                markerLongitude + labelOffset,
                markerLatitude - fontSize
              );
              context.lineTo(
                markerLongitude + labelOffset + labelWidth + labelMargins * 2,
                markerLatitude - fontSize
              );
              context.lineTo(
                markerLongitude + labelOffset + labelWidth + labelMargins * 2,
                markerLatitude + fontSize
              );
              context.lineTo(
                markerLongitude + labelOffset,
                markerLatitude + fontSize
              );
              context.lineTo(markerLongitude + pointerOffset, markerLatitude);
              context.closePath();
              context.fillStyle = "black";
              context.fill();

              // Draw the text
              context.fillStyle = "white";
              context.textAlign = "left";
              context.fillText(
                labelName,
                markerLongitude + labelOffset + labelMargins,
                // Firefox doesn't do baseline properly so nudging the centre
                markerLatitude + fontSize * 0.6
              );
            } else {
              // Right aligned text pointers
              // Draw the background and pointer
              context.beginPath();
              context.moveTo(
                markerLongitude - labelOffset - labelWidth - labelMargins * 2,
                markerLatitude - fontSize
              );
              context.lineTo(
                markerLongitude - labelOffset,
                markerLatitude - fontSize
              );
              context.lineTo(markerLongitude - pointerOffset, markerLatitude);
              context.lineTo(
                markerLongitude - labelOffset,
                markerLatitude + fontSize
              );
              context.lineTo(
                markerLongitude - labelOffset - labelWidth - labelMargins * 2,
                markerLatitude + fontSize
              );
              context.closePath();
              context.fillStyle = "black";
              context.fill();

              context.textAlign = "right";
              context.fillStyle = "white";
              context.fillText(
                labelName,
                markerLongitude - labelOffset - labelMargins,
                markerLatitude + fontSize * 0.6
              );
            } // end label alternation
          } else {
            // If on portrait

            labelOffset = labelOffset * 0.7; // Tweak the pointer height a bit

            // Top and bottom labels
            if (i % 2 === 0) {
              // Top label with pointer
              context.beginPath();
              context.moveTo(
                markerLongitude - (labelWidth + labelMargins * 2) / 2,
                markerLatitude - labelOffset - fontSize * 2
              );
              context.lineTo(
                markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude - labelOffset - fontSize * 2
              );
              context.lineTo(
                markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude - labelOffset
              );
              context.lineTo(
                markerLongitude + fontSize * mobilePointerShrink,
                markerLatitude - labelOffset
              );
              context.lineTo(markerLongitude, markerLatitude - pointerOffset);
              context.lineTo(
                markerLongitude - fontSize * mobilePointerShrink,
                markerLatitude - labelOffset
              );
              context.lineTo(
                markerLongitude - (labelWidth + labelMargins * 2) / 2,
                markerLatitude - labelOffset
              );
              context.closePath();
              context.fillStyle = "black";
              context.fill();

              context.fillStyle = "white";
              context.textAlign = "left";
              context.fillText(
                labelName,
                markerLongitude - labelWidth / 2,
                markerLatitude - fontSize * 0.4 - labelOffset
              );
            } else {
              context.beginPath();
              context.moveTo(
                markerLongitude - (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset
              ); // Top left corner
              context.lineTo(
                markerLongitude - fontSize * mobilePointerShrink,
                markerLatitude + labelOffset
              );
              context.lineTo(
                markerLongitude, // Point
                markerLatitude + pointerOffset
              );
              context.lineTo(
                markerLongitude + fontSize * mobilePointerShrink,
                markerLatitude + labelOffset
              );
              context.lineTo(
                markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset
              ); // Right top corner
              context.lineTo(
                markerLongitude + (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset + fontSize * 2
              ); // Right bottom corner
              context.lineTo(
                markerLongitude - (labelWidth + labelMargins * 2) / 2,
                markerLatitude + labelOffset + fontSize * 2
              ); // Left bottom corner
              context.closePath();
              context.fillStyle = "black";
              context.fill();

              context.textAlign = "left";
              context.fillStyle = "white";
              context.fillText(
                labelName,
                markerLongitude - labelWidth / 2,
                markerLatitude + fontSize * 1.6 + labelOffset
              );
            } // end label alternation
          }
        }
      }, this);
    } // end drawLabels function
  } // end drawWorld function

  // This function will fire on ever hash mark
  mark = event => {
    currentLocationId = event.detail.activated.config.id;

    // If more than one LABEL assign directly as array
    if (event.detail.activated.config.label instanceof Array) {
      currentLabels = event.detail.activated.config.label;
    } else {
      // Otherwise create an array with only one value
      currentLabels = [event.detail.activated.config.label];
    }

    currentRangeInKms = event.detail.activated.config.range;
    previousRangeInKms = event.detail.deactivated
      ? event.detail.deactivated.config.range
      : 0;

    globeScale = event.detail.activated.config.scale || 100;

    // Controlled by 'ZOOM true' hash markers in CMS
    // If two consecutive points have ZOOM true then zoom out first
    let shouldZoomOut = false;
    try {
      if (
        event.detail.activated.config.zoom &&
        event.detail.deactivated.config.zoom
      ) {
        shouldZoomOut = true;
      }
    } catch (error) {
      console.log(error);
    }

    // Zoom in so that percentage set in marker relative to initial 100%
    let newGlobeScale = initialGlobeScale * (globeScale / 100);

    let currentRotation = projection.rotate();

    // Instead of transitioning directly on elements
    // we transition using tween functions on dummy elements
    const dummyRotate = {},
      dummyZoom = {};

    // Not currently implemented, but possible in future to
    // disable transitions when framerate performance slow
    if (disableTrnasitions) {
      var p = getItem(currentLocationId).longlat;
      // Instantly draw the next frame
      projection.rotate([-p[0], -p[1], 0]);
      rangeCircle.radius(kmsToRadius(currentRangeInKms));
      projection.scale(newGlobeScale);
      drawWorld();
    } else {
      rotateAndScaleRange();
      // If #hash ZOOM true in CMS between two points then zoom out first
      shouldZoomOut ? zoomOutFirst() : zoomDirect();
    }

    function rotateAndScaleRange() {
      select
        .select(dummyRotate)
        .transition("rotateTransition")
        .delay(0)
        .duration(transitionDuration)
        .tween("rotate", function() {
          if (!currentLocationId) return;
          var p = getItem(currentLocationId).longlat; // Make conditional in case of not found
          if (p) {
            let rotationInterpolate = d3.interpolate(currentRotation, [
              -p[0],
              -p[1],
              0
            ]);
            let radiusInterpolate = d3.interpolate(
              kmsToRadius(previousRangeInKms),
              kmsToRadius(currentRangeInKms)
            );

            // Return the tween function
            return function(time) {
              tweening = time; // To detect if redrawing later
              projection.rotate(rotationInterpolate(time));
              rangeCircle.radius(radiusInterpolate(time));
              drawWorld();
            };
          }
        });
    } // end rotateAndScaleRange()

    function zoomDirect() {
      select
        .select(dummyZoom)
        .transition()
        .duration(transitionDuration)
        .tween("zoom", function() {
          if (!currentLocationId) return;
          var p = getItem(currentLocationId).longlat;
          if (p) {
            let previousGlobeScale = projection.scale();
            let scaleInterpolate = d3.interpolate(
              previousGlobeScale,
              newGlobeScale
            );

            return function(time) {
              projection.scale(scaleInterpolate(time));
            };
          }
        });
    }

    function zoomOutFirst() {
      select
        .select(dummyZoom)
        .transition()
        .duration(transitionDuration / 2 + 300)
        .tween("zoom", function() {
          if (!currentLocationId) return;
          var p = getItem(currentLocationId).longlat;
          if (p) {
            let previousGlobeScale = projection.scale();
            let scaleInterpolate = d3.interpolate(
              previousGlobeScale,
              initialGlobeScale
            );

            return function(time) {
              projection.scale(scaleInterpolate(time));
            };
          }
        })
        .transition()
        .tween("zoom", function() {
          if (!currentLocationId) return;
          var p = getItem(currentLocationId).longlat;
          if (p) {
            let scaleInterpolate = d3.interpolate(
              projection.scale(),
              newGlobeScale
            );

            return function(time) {
              projection.scale(scaleInterpolate(time));
              if (tweening === 1) drawWorld();
            };
          }
        });
    } // end zoomOutFirst()
  }; // mark function

  // Handle screen resizes
  resizeCanvas = () => {
    // Dont resize if height resize is negligable
    // To counteract mobile phone resize events when scroll direction changes
    if (
      window.innerHeight < screenHeight &&
      window.innerHeight > screenHeight - 80
    ) {
      return;
    }

    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;

    if (screenHeight > screenWidth) {
      isLandscape = false;
    } else {
      isLandscape = true;
    }

    canvas.attr("width", screenWidth).attr("height", screenHeight);

    setMargins();

    projection
      .translate([screenWidth / 2, screenHeight / 2])
      .fitExtent(
        [[margins, margins], [screenWidth - margins, screenHeight - margins]],
        globe
      );

    // Reset the initial global scale for resized full globe
    initialGlobeScale = projection.scale();

    // Then zoom in to globe scale if necessary
    projection.scale(projection.scale() * globeScale / 100);

    // Retina display and High DPI monitor scaling
    canvasDpiScaler(canvasEl, context);

    drawWorld();
  };

  // Experimental feature to allow click and drag
  let v0, // Mouse position in Cartesian coordinates at start of drag gesture.
    r0, // Projection rotation as Euler angles at start.
    q0; // Projection rotation as versor at start.

  // Disable on IE and Edge because they can't detect touch events by default
  if (!detectIE()) {
    canvas.on(
      "mousedown",
      function() {
        if (select.event.which === 1) {
          dragStarted(this);

          var mouseMoving = false; // Hack to fix freezing up on touch devices
          canvas.on(
            "mousemove",
            function() {
              if (!mouseMoving) {
                blockArray = document.getElementsByClassName("Block-content");
                for (var i = 0; i < blockArray.length; i++) {
                  blockArray[i].className += " " + styles.noPointer;
                }
                mouseMoving = true;
              }
              dragged(this);
            },
            false
          );

          canvas.on(
            "mouseup",
            function() {
              for (var i = 0; i < blockArray.length; i++) {
                blockArray[i].classList.remove(styles.noPointer);
              }
              canvas.on("mousemove", null);
              mouseMoving = false;
            },
            false
          );

          canvas.on(
            "mouseout",
            function() {
              for (var i = 0; i < blockArray.length; i++) {
                blockArray[i].classList.remove(styles.noPointer);
              }
              canvas.on("mousemove", null);
            },
            false
          );
        }
      },
      false
    ); // end canvas.on mousedown

    canvas.on("touchstart", function() {
      if (select.event.targetTouches.length === 2) {
        // Complete 2 finger touch logic here from https://www.html5rocks.com/en/mobile/touch/
        touchDragStarted(this);
        select.event.preventDefault();

        canvas.on(
          "touchmove",
          function() {
            touchDragged(this);
          },
          false
        );

        canvas.on("touchend", function() {
          canvas.on("touchmove", null);
        });
      }
    });
  } // end if detectIE() if block

  function dragStarted(el) {
    v0 = versor.cartesian(projection.invert(select.mouse(el)));
    r0 = projection.rotate();
    q0 = versor(r0);
  }

  function dragged(el) {
    var v1 = versor.cartesian(projection.rotate(r0).invert(select.mouse(el))),
      q1 = versor.multiply(q0, versor.delta(v0, v1)),
      r1 = versor.rotation(q1);
    projection.rotate(r1);
    drawWorld();
  }

  // Handle touches differently to avoid jitter on two fingers
  function touchDragStarted(el) {
    v0 = versor.cartesian(projection.invert(select.touches(el)[0]));
    r0 = projection.rotate();
    q0 = versor(r0);
  }

  function touchDragged(el) {
    var v1 = versor.cartesian(
        projection.rotate(r0).invert(select.touches(el)[0])
      ),
      q1 = versor.multiply(q0, versor.delta(v0, v1)),
      r1 = versor.rotation(q1);
    projection.rotate(r1);
    drawWorld();
  }

  // Add event listener for our marks
  document.addEventListener("mark", mark);
  window.addEventListener("resize", resizeCanvas);

  // Add a window.onload to try counteracting scroll before load size bug
  window.onload = function() {
    resizeCanvas();
  };
}

class Globe extends Component {
  componentDidMount() {
    d3
      .queue(2) // load a certain number of files concurrently
      .defer(d3.json, geojsonUrl)
      .defer(d3.json, storyDataUrl)
      .awaitAll(dataLoaded);
  }
  componentWillUnmount() {
    console.log("Component unmounting. Removing event listeners etc...");
    document.removeEventListener("mark", mark);
    window.removeEventListener("resize", resizeCanvas);
  }
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <div
        id="globe"
        className={"u-full " + styles.wrapper}
        aria-label="A globe that spins and shows missile ranges."
      >
        <div id="map">{/* Canvas gets appended here */}</div>
      </div>
    );
  }
}

// Some functions
function kmsToRadius(kms) {
  return kms / 111.319444; // This many kilometres per degree
}

function setMargins() {
  margins = Math.floor(Math.min(screenWidth, screenHeight) * 0.05);

  // Conditional margins
  if (screenWidth > 700) {
    margins = Math.floor(Math.min(screenWidth, screenHeight) * 0.15);
  }
}

/**
 * detect IE
 * returns version of IE or false, if browser is not Internet Explorer
 */
function detectIE() {
  var ua = window.navigator.userAgent;

  // Test values; Uncomment to check result …

  // IE 10
  // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';

  // IE 11
  // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';

  // Edge 12 (Spartan)
  // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';

  // Edge 13
  // ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';

  var msie = ua.indexOf("MSIE ");
  if (msie > 0) {
    // IE 10 or older => return version number
    return parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)), 10);
  }

  var trident = ua.indexOf("Trident/");
  if (trident > 0) {
    // IE 11 => return version number
    var rv = ua.indexOf("rv:");
    return parseInt(ua.substring(rv + 3, ua.indexOf(".", rv)), 10);
  }

  var edge = ua.indexOf("Edge/");
  if (edge > 0) {
    // Edge (IE 12+) => return version number
    return parseInt(ua.substring(edge + 5, ua.indexOf(".", edge)), 10);
  }

  // other browser
  return false;
}

// array.find pollyfill https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, "find", {
    value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError("this is null or not defined");
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== "function") {
        throw new TypeError("predicate must be a function");
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    }
  });
}

module.exports = Globe;
