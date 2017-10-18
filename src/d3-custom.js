// Note: this is to modularise d3 but it looks like d3.events wasn't working
// with selection events so we are importing selection in Globe component seperately

// import * as selection from 'd3-selection';
import * as geo from "d3-geo";
import * as transition from "d3-transition";
import * as interpolate from "d3-interpolate";
import * as request from "d3-request";
import * as queue from "d3-queue";
import * as drag from "d3-drag";
import * as scale from "d3-scale";
import * as color from "d3-color";
import * as array from "d3-array";

export default Object.assign(
  {},
  // selection,
  geo,
  transition,
  interpolate,
  request,
  queue,
  drag,
  scale,
  color,
  array
);
