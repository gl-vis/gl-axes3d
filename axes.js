"use strict"

module.exports = createAxes

var createTextSprites = require("./lib/textSprites.js")
var createBox = require("./lib/box.js")
var createStateStack = require("gl-state")

var identity = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1])

function Axes(gl) {
  this.gl = gl
  this.extents = [[-10, -10, -10], [10,10,10]]
  this.labels = ["x", "y", "z"]
  this.tickSpacing = [0.5, 0.5, 0.5]
  this.tickWidth = 0.01
  this.showTicks = [true, true, true]
  this.font = "sans-serif"
  this.fontSize = 16
  this._textSprites = null
  this._box = null
  this._state = createStateStack(gl, [
      gl.BLEND,
      gl.BLEND_DST_ALPHA,
      gl.BLEND_DST_RGB,
      gl.BLEND_SRC_ALPHA,
      gl.BLEND_SRC_RGB,
      gl.BLEND_EQUATION_ALPHA,
      gl.BLEND_EQUATION_RGB,
      gl.CULL_FACE,
      gl.CULL_FACE_MODE
    ])
}

var proto = Axes.prototype

proto.update = function(options) {
  options = options || {}
  if("extents" in options) {
    this.extents = options.extents
  }
  if("labels" in options) {
    this.labels = options.labels
  }
  if("tickSpacing" in options) {
    if(typeof options.tickSpacing === "number") {
      this.tickSpacing = [options.tickSpacing, options.tickSpacing, options.tickSpacing]
    }
    this.tickSpacing = options.tickSpacing
  }
  if("showTicks" in options) {
    if(typeof options.showTicks === "boolean") {
      this.showTicks = [options.showTicks, options.showTicks, options.showTicks]
    }
    this.showTicks = options.showTicks
  }
  if("tickWidth" in options) {
    this.tickWidth = options.tickWidth
  }
  if("font" in options) {
    this.font = options.font
  }
  if("fontSize" in options) {
    this.fontSize = options.fontSize
  }
  if(this._textSprites) {
    this._textSprites.dispose()
  }
  this._textSprites = createTextSprites(
    this.gl, 
    this.extents,
    this.tickSpacing,
    this.font,
    this.fontSize,
    4,
    this.labels)
  if(!this._box) {
    this._box = createBox(this.gl)
  }
}

proto.draw = function(params) {
  params = params || {}

  //Save context state
  this._state.push()

  //Set up state parameters
  var gl = this.gl
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)

  //Draw outer box
  this._box.draw(
    params.model||identity,
    params.view||identity,
    params.projection||identity,
    this)
  
  //Draw text sprites
  this._textSprites.bind(
    params.mode||identity,
    params.view||identity,
    params.projection||identity,
    this)


  for(var i=0; i<3; ++i) {

  }

  //Restore context state
  this._state.pop()
}

proto.dispose = function() {
  this._textSprites.dispose()
  this._box.dispose()
}

function createAxes(gl, options) {
  var axes = new Axes(gl)
  axes.update(options)
  return axes
}
