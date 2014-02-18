"use strict"

var createTextSprites = require("../lib/text-sprites.js")
var createBox = require("../lib/box.js")

function Axes(gl) {
}

var proto = Axes.prototype

proto.update = function(options) {
  options = options || {}
  var extents = options.extents || [[-1,-1,-1], [1,1,1]]
  var labels = options.labels || ["x", "y", "z"]
  var tickSpacing = options.tickSpacing || [0.1, 0.1, 0.1]
  var showTickMarks = options.showTicks || [true, true, true]
}

proto.draw = function(params) {
}

proto.dispose = function() {
}

function createAxes(gl, options) {
  var axes = new Axes(gl)
  axes.update(options)
  return axes
}