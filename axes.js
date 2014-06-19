"use strict"

module.exports = createAxes

var createText = require("./lib/text.js")
var createLines = require("./lib/lines.js")
var getCubeProperties = require("./lib/cube.js")
var createStateStack = require("gl-state")

var identity = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1])

function Axes(gl) {
  this.gl = gl
  this.bounds = [[-10, -10, -10], [10,10,10]]
  this.labels = ["x", "y", "z"]
  this.tickSpacing = [0.5, 0.5, 0.5]
  this.tickWidth = 1
  this.showTicks = [true, true, true]
  this.textScale = 0.0
  this.font = "sans-serif"
  this._text = null
  this._lines = null
  this._customTicks = null
  this._state = createStateStack(gl, [
      gl.BLEND,
      gl.BLEND_DST_ALPHA,
      gl.BLEND_DST_RGB,
      gl.BLEND_SRC_ALPHA,
      gl.BLEND_SRC_RGB,
      gl.BLEND_EQUATION_ALPHA,
      gl.BLEND_EQUATION_RGB,
      gl.CULL_FACE,
      gl.CULL_FACE_MODE,
      gl.DEPTH_WRITEMASK,
      gl.DEPTH_TEST,
      gl.LINE_WIDTH
    ])
  this.axesColors = [[0,0,0], [0,0,0], [0,0,0]]
  this.gridColor = [0,0,0]
}

var proto = Axes.prototype

function prettyPrint(spacing, i) {
  var stepStr = spacing + ""
  var u = stepStr.indexOf(".")
  var sigFigs = 0
  if(u >= 0) {
    sigFigs = stepStr.length - u - 1
  }
  var shift = Math.pow(10, sigFigs)
  var x = Math.round(spacing * i * shift)
  var xstr = x + ""
  if(xstr.indexOf("e") >= 0) {
    return xstr
  }
  var xi = x / shift, xf = x % shift
  if(x < 0) {
    xi = -Math.ceil(xi)|0
    xf = (-xf)|0
  } else {
    xi = Math.floor(xi)|0
    xf = xf|0
  }
  var xis = "" + xi 
  if(x < 0) {
    xis = "-" + xis
  }
  if(sigFigs) {
    var xs = "" + xf
    while(xs.length < sigFigs) {
      xs = "0" + xs
    }
    return xis + "." + xs
  } else {
    return xis
  }
}

function defaultTicks(bounds, tickSpacing) {
  var array = []
  for(var d=0; d<3; ++d) {
    var ticks = []
    var m = 0.5*(bounds[0][d]+bounds[1][d])
    for(var t=0; t*tickSpacing[d]<=bounds[1][d]; ++t) {
      ticks.push({x: t*tickSpacing[d], text: prettyPrint(tickSpacing[d], t)})
    }
    for(var t=-1; t*tickSpacing[d]>=bounds[0][d]; --t) {
      ticks.push({x: t*tickSpacing[d], text: prettyPrint(tickSpacing[d], t)})
    }
    array.push(ticks)
  }
  return array
}

proto.update = function(options) {
  options = options || {}
  var lineUpdate = false
  var textUpdate = false
  var customTicks = this._customTicks
  var ticksChanged = false
  if("ticks" in options) {
    ticksChanged = true
    customTicks = options.ticks
    lineUpdate = true
  }
  if("bounds" in options) {
    this.bounds = options.bounds
    lineUpdate = true
    textUpdate = true
    ticksChanged = true
  }
  if("labels" in options) {
    this.labels = options.labels
    textUpdate = true
  }
  if("tickSpacing" in options) {
    if(typeof options.tickSpacing === "number") {
      this.tickSpacing = [options.tickSpacing, options.tickSpacing, options.tickSpacing]
    }
    this.tickSpacing = options.tickSpacing
    ticksChanged = true
  }
  if("showAxes" in options) {
    if(typeof options.showAxes === "boolean") {
      this.showAxes = [options.showAxes, options.showAxes, options.showAxes]
    } else {
      this.showAxes = options.showAxes
    }
  }
  if("axesColors" in options) {
    var colors = options.axesColors
    if(Array.isArray(colors[0])) {
      this.axesColors = colors
    } else {
      this.axesColors = [colors.slice(), colors.slice(), colors.slice()]
    }
  }
  if("gridColor" in options) {
    this.gridColor = options.gridColor
  }
  if("tickWidth" in options) {
    this.tickWidth = options.tickWidth
  }
  if("font" in options) {
    this.font = options.font
    textUpdate = true
  }
  if("textScale" in options) {
    this.textScale = options.textScale
    textUpdate = true
  }
  var ticks = customTicks
  if(ticksChanged) {
    textUpdate = true
    lineUpdate = true
    if(options.ticks) {
      ticks = options.ticks
    } else {
      ticks = defaultTicks(this.bounds, this.tickSpacing)
    }
    for(var i=0; i<3; ++i) {
      ticks[i].sort(function(a,b) {
        return a.x-b.x
      })
    }
    this._customTicks = ticks
  }
  if(textUpdate && this._text) {
    this._text.dispose()
    this._text = null
  }
  if(!this._text) {
    this._text = createText(
      this.gl, 
      this.bounds,
      ticks,
      this.font,
      this.labels,
      this.textScale)
  }
  if(lineUpdate && this._lines) {
    this._lines.dispose()
    this._lines = null
  }
  if(!this._lines) {
    this._lines = createLines(this.gl, this.bounds, ticks)
  }
}

proto.draw = function(params) {
  params = params || {}

  var model = params.model || identity
  var view = params.view || identity
  var projection = params.projection || identity
  var bounds = this.bounds

  var cubeParams = getCubeProperties(model, view, projection, bounds)
  var cubeEdges = cubeParams.edges
  var axis = cubeParams.axis

  //Save context state
  this._state.push()

  //Set up state parameters
  var gl = this.gl
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  gl.enable(gl.DEPTH_TEST)
  gl.depthMask(true)
  gl.disable(gl.BLEND)
  gl.lineWidth(this.tickWidth)

  //Draw axes lines
  gl.lineWidth(1)
  this._lines.bind(
    model,
    view,
    projection,
    this)
  for(var i=0; i<3; ++i) {
    var x = [0,0,0]
    if(axis[i] > 0) {
      x[i] = bounds[1][i]
    } else {
      x[i] = bounds[0][i]
    }
    this._lines.drawBox(i, x, this.gridColor)

    if(!this.showTicks[i]) {
      continue
    }
    var e = cubeEdges[i]
    var c = [0,0,0]
    var minor = [0,0,0]
    for(var j=0; j<3; ++j) {
      if(e & (1<<j)) {
        c[j] = bounds[1][j] + 0.5 * this.tickSpacing[j]
        minor[j] = -0.125 * this.tickSpacing[j]
      } else {
        c[j] = bounds[0][j] - 0.5 * this.tickSpacing[j]
        minor[j] = 0.125 * this.tickSpacing[j]
      }
    }
    c[i] = 0
    minor[i] = 0
    this._lines.drawAxis(i, c, minor, this.axesColors[i])
  }

  //Draw text sprites
  this._text.bind(
    model,
    view,
    projection,
    this)
  for(var i=0; i<3; ++i) {
    if(!this.showTicks[i]) {
      continue
    }
    var e = cubeEdges[i]
    var c = [0,0,0]
    var q = [0,0,0]
    for(var j=0; j<3; ++j) {
      if(e & (1<<j)) {
        c[j] = bounds[1][j] + 1.0 * this.tickSpacing[j]
        q[j] = bounds[1][j] + 1.5 * this.tickSpacing[j]
      } else {
        c[j] = bounds[0][j] - 1.0 * this.tickSpacing[j]
        q[j] = bounds[0][j] - 1.5 * this.tickSpacing[j]
      }
    }
    c[i] = 0
    q[i] = 0.5 * (bounds[0][i] + bounds[1][i])

    //Draw axis
    this._text.drawAxis(i, c, this.axesColors[i])

    //Draw label
    this._text.drawLabel(i, q, this.axesColors[i])
  }

  //Restore context state
  this._state.pop()
}

proto.dispose = function() {
  this._text.dispose()
  this._lines.dispose()
}

function createAxes(gl, options) {
  var axes = new Axes(gl)
  axes.update(options)
  return axes
}
