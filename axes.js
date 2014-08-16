'use strict'

module.exports = createAxes

var createStateStack = require('gl-state')

var createText        = require('./lib/text.js')
var createLines       = require('./lib/lines.js')
var createBackground  = require('./lib/background.js')
var getCubeProperties = require('./lib/cube.js')
var Ticks             = require('./lib/ticks.js')

var identity = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1])

function Axes(gl) {
  this.gl             = gl

  this.bounds         = [ [-10, -10, -10], 
                          [ 10,  10,  10] ]
  this.ticks          = [ [], [], [] ]
  this.autoTicks      = true
  this.tickSpacing    = [ 1, 1, 1 ]

  this.tickEnable     = [ true, true, true ]
  this.tickFont       = [ 'sans-serif', 'sans-serif', 'sans-serif' ]
  this.tickSize       = [ 0, 0, 0 ]
  this.tickAngle      = [ 0, 0, 0 ]
  this.tickColor      = [ [0,0,0,1], [0,0,0,1], [0,0,0,1] ]
  this.tickPad        = [ 1, 1, 1 ]

  this.labels         = [ 'x', 'y', 'z' ]
  this.labelEnable    = [ true, true, true ]
  this.labelFont      = 'sans-serif'
  this.labelSize      = [ 0, 0, 0 ]
  this.labelAngle     = [ 0, 0, 0 ]
  this.labelColor     = [ [0,0,0,1], [0,0,0,1], [0,0,0,1] ]
  this.labelPad       = [ 1.5, 1.5, 1.5 ]

  this.lineEnable     = [ true, true, true ]
  this.lineMirror     = [ false, false, false ]
  this.lineWidth      = [ 1, 1, 1 ]
  this.lineColor      = [ [0,0,0,1], [0,0,0,1], [0,0,0,1] ]

  this.lineTickEnable = [ true, true, true ]
  this.lineTickMirror = [ false, false, false ]
  this.lineTickLength = [ 0, 0, 0 ]
  this.lineTickWidth  = [ 1, 1, 1 ]
  this.lineTickColor  = [ [0,0,0,1], [0,0,0,1], [0,0,0,1] ]

  this.gridEnable     = [ true, true, true ]
  this.gridWidth      = [ 1, 1, 1 ]
  this.gridColor      = [ [0,0,0,1], [0,0,0,1], [0,0,0,1] ]

  this.zeroEnable     = [ true, true, true ]
  this.zeroLineColor  = [ [0,0,0,1], [0,0,0,1], [0,0,0,1] ]
  this.zeroLineWidth  = [ 2, 2, 2 ]

  this.backgroundEnable = [ false, false, false ]
  this.backgroundColor  = [ [0.8, 0.8, 0.8, 0.5], 
                            [0.8, 0.8, 0.8, 0.5], 
                            [0.8, 0.8, 0.8, 0.5] ]

  this._firstInit = true
  this._text  = null
  this._lines = null
  this._background = createBackground(gl)
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
      gl.DEPTH_FUNC,
      gl.LINE_WIDTH
    ])

}

var proto = Axes.prototype

proto.update = function(options) {
  options = options || {}

  //Option parsing helper functions
  function parseOption(nest, cons, name) {
    if(name in options) {
      var opt = options[name]
      var prev = this[name]
      var next
      if(nest ? (Array.isArray(opt) && Array.isArray(opt[0])) :
                 Array.isArray(opt) ) {
        this[name] = next = [ cons(opt[0]), cons(opt[1]), cons(opt[2]) ]
      } else {
        this[name] = next = [ cons(opt), cons(opt), cons(opt) ]
      }
      for(var i=0; i<3; ++i) {
        if(next[i] !== prev[i]) {
          return true
        }
      }
    }
    return false
  }

  var NUMBER  = parseOption.bind(this, false, Number)
  var BOOLEAN = parseOption.bind(this, false, Boolean)
  var STRING  = parseOption.bind(this, false, String)
  var COLOR   = parseOption.bind(this, true, function(v) {
    if(Array.isArray(v)) {
      if(v.length === 3) {
        return [ +v[0], +v[1], +v[2], 1.0 ]
      } else if(v.length === 4) {
        return [ +v[0], +v[1], +v[2], +v[3] ]
      }
    }
    return [ 0, 0, 0, 1 ]
  })

  //Tick marks and bounds
  var nextTicks
  var ticksUpdate   = false
  var boundsChanged = false
  if('bounds' in options) {
    var bounds = options.bounds
i_loop:
    for(var i=0; i<2; ++i) {
      for(var j=0; j<3; ++j) {
        if(bounds[i][j] !== this.bounds[i][j]) {
          this.bounds   = options.bounds
          boundsChanged = true
          break i_loop
        }
      }
    }
  }
  if('ticks' in options) {
    nextTicks      = options.ticks
    ticksUpdate    = true
    this.autoTicks = false
    for(var i=0; i<3; ++i) {
      this.tickSpacing[i] = 0.0
    }
  }
  if(NUMBER('tickSpacing')) {
    this.autoTicks  = true
    boundsChanged   = true
  }

  if(this._firstInit) {
    if(!('ticks' in options || 'tickSpacing' in options)) {
      this.autoTicks = true
    }

    //Force tick recomputation on first update
    boundsChanged   = true
    ticksUpdate     = true
    this._firstInit = false
  }

  if(boundsChanged && this.autoTicks) {
    nextTicks = Ticks.create(this.bounds, this.tickSpacing)
  }

  //Compare next ticks to previous ticks, only update if needed
  if(ticksUpdate) {
    for(var i=0; i<3; ++i) {
      nextTicks[i].sort(function(a,b) {
        return a.x-b.x
      })
    }
    if(Ticks.equal(nextTicks, this.ticks)) {
      ticksUpdate = false
    } else {
      this.ticks = nextTicks
    }
  }

  //Calculate default text size
  var defaultSize = Infinity
  for(var i=0; i<3; ++i) {
    for(var j=1; j<this.ticks[i].length; ++j) {
      var a = this.ticks[i][j-1].x
      var b = this.ticks[i][j].x
      var d = 0.5 * (b - a)
      defaultSize = Math.min(defaultSize, d)
    }
  }

  //Parse tick properties
  BOOLEAN('tickEnable')
  if(STRING('tickFont')) {
    ticksUpdate = true  //If font changes, must rebuild vbo
  }
  NUMBER('tickSize')
  for(var i=0; i<3; ++i) {
    if(this.tickSize[i] <= 0 || isNaN(this.tickSize[i])) {
      this.tickSize[i] = defaultSize
    }
  }
  NUMBER('tickAngle')
  NUMBER('tickPad')
  COLOR('tickColor')

  //Axis labels
  var labelUpdate = STRING('labels')
  if(STRING('labelFont')) {
    labelUpdate = true
  }
  BOOLEAN('labelEnable')
  NUMBER('labelSize')
  for(var i=0; i<3; ++i) {
    if(this.labelSize[i] <= 0 || isNaN(this.labelSize[i])) {
      this.labelSize[i] = defaultSize
    }
  }
  NUMBER('labelPad')
  COLOR('labelColor')

  //Axis lines
  BOOLEAN('lineEnable')
  BOOLEAN('lineMirror')
  NUMBER('lineWidth')
  COLOR('lineColor')

  //Axis line ticks
  BOOLEAN('lineTickEnable')
  BOOLEAN('lineTickMirror')
  NUMBER('lineTickLength')
  NUMBER('lineTickWidth')
  COLOR('lineTickColor')

  //Grid lines
  BOOLEAN('gridEnable')
  NUMBER('gridWidth')
  COLOR('gridColor')

  //Zero line
  BOOLEAN('zeroEnable')
  COLOR('zeroLineColor')
  NUMBER('zeroLineWidth')

  //Background
  BOOLEAN('backgroundEnable')
  COLOR('backgroundColor')

  //Update text if necessary
  if(this._text && (labelUpdate || ticksUpdate)) {
    this._text.dispose()
    this._text = null
  }
  if(!this._text) {
    this._text = createText(
      this.gl, 
      this.bounds,
      this.labels,
      this.labelFont,
      this.ticks,
      this.tickFont)
  }
  
  //Update lines if necessary
  if(this._lines && this.ticksUpdate) {
    this._lines.dispose()
    this._lines = null
  }
  if(!this._lines) {
    this._lines = createLines(this.gl, this.bounds, this.ticks)
  }
}

function computeLineOffset(i, bounds, cubeEdges, cubeAxis) {
  var primalOffset = [0,0,0]
  var primalMinor  = [0,0,0]
  var dualOffset   = [0,0,0]
  var dualMinor    = [0,0,0]
  var e = cubeEdges[i]

  //Calculate offsets
  for(var j=0; j<3; ++j) {
    if(i === j) {
      continue
    }
    var a = primalOffset, 
        b = dualOffset,
        c = primalMinor,
        d = dualMinor
    if(e & (1<<j)) {
      a = dualOffset
      b = primalOffset
      c = dualMinor
      d = primalMinor
    }
    a[j] = bounds[0][j]
    b[j] = bounds[1][j]
    if(cubeAxis[j] > 0) {
      c[j] = -1
    } else {
      d[j] = +1
    }
  }

  return {
    primalOffset: primalOffset,
    primalMinor:  primalMinor,
    mirrorOffset: dualOffset,
    mirrorMinor:  dualMinor
  }
}

proto.draw = function(params) {
  params = params || {}

  //Geometry for camera and axes
  var model       = params.model || identity
  var view        = params.view || identity
  var projection  = params.projection || identity
  var bounds      = this.bounds

  //Unpack axis info
  var cubeParams  = getCubeProperties(model, view, projection, bounds)
  var cubeEdges   = cubeParams.edges
  var cubeAxis    = cubeParams.axis

  //Compute axis info
  var lineOffset  = new Array(3)
  for(var i=0; i<3; ++i) {
    lineOffset[i] = computeLineOffset(i, 
        this.bounds, 
        cubeEdges, 
        cubeAxis)
  }

  //Save context state
  this._state.push()

  //Set up state parameters
  var gl = this.gl
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  gl.enable(gl.DEPTH_TEST)

  //Draw background
  gl.depthMask(false)
  gl.enable(gl.BLEND)
  gl.blendEquation(gl.FUNC_ADD)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  var cubeEnable = [ 0, 0, 0 ]
  for(var i=0; i<3; ++i) {
    if(this.backgroundEnable[i]) {
      cubeEnable[i] = cubeAxis[i]
    }
  }
  this._background.draw(
    model, 
    view, 
    projection, 
    this.bounds, 
    cubeEnable,
    this.backgroundColor)

  //Draw lines
  gl.depthMask(true)
  gl.depthFunc(gl.LEQUAL)
  gl.disable(gl.BLEND)
  this._lines.bind(
    model,
    view,
    projection,
    this)

  //First draw grid lines and zero lines
  for(var i=0; i<3; ++i) {
    var x = [0,0,0]
    if(cubeAxis[i] > 0) {
      x[i] = bounds[1][i]
    } else {
      x[i] = bounds[0][i]
    }

    for(var j=0; j<2; ++j) {
      var u = (i + 1 + j) % 3
      var v = (i + 1 + (j^1)) % 3
      //Draw grid lines
      if(this.gridEnable[u]) {
        gl.lineWidth(this.gridWidth[u])
        this._lines.drawGrid(u, v, this.bounds, x, this.gridColor[u])
      }
      //Draw zero lines
      if(this.zeroEnable[v]) {
        //Check if zero line in bounds
        if(bounds[0][v] <= 0 && bounds[1][v] >= 0) {
          gl.lineWidth(this.zeroLineWidth[v])
          this._lines.drawZero(u, this.bounds, x, this.zeroLineColor[v])
        }
      }
    }
  }

  //Then draw axis lines and tick marks
  for(var i=0; i<3; ++i) {

    //Draw axis lines
    gl.lineWidth(this.lineWidth[i])
    if(this.lineEnable[i]) {
      this._lines.drawAxisLine(i, this.bounds, lineOffset[i].primalOffset, this.lineColor[i])
    }
    if(this.lineMirror[i]) {
      this._lines.drawAxisLine(i, this.bounds, lineOffset[i].mirrorOffset, this.lineColor[i])
    }

    //Compute minor axes
    var primalMinor = lineOffset[i].primalMinor.slice()
    var mirrorMinor = lineOffset[i].mirrorMinor.slice()
    var tickLength  = this.lineTickLength[i]
    for(var j=0; j<3; ++j) {
      primalMinor[j] *= tickLength
      mirrorMinor[j] *= tickLength
    }

    //Draw axis line ticks
    gl.lineWidth(this.lineTickWidth[i])
    if(this.lineTickEnable[i]) {
      this._lines.drawAxisTicks(i, lineOffset[i].primalOffset, primalMinor, this.lineTickColor[i])
    }
    if(this.lineTickMirror[i]) {
      this._lines.drawAxisTicks(i, lineOffset[i].mirrorOffset, mirrorMinor, this.lineTickColor[i])
    }
  }

  //Draw text sprites
  this._text.bind(
    model,
    view,
    projection)

  for(var i=0; i<3; ++i) {

    var tickLength = Math.max(this.lineTickLength[i], 0)
    var minor      = lineOffset[i].primalMinor
    var offset     = lineOffset[i].primalOffset.slice()
    for(var j=0; j<3; ++j) {
      offset[j] += minor[j] * tickLength
    }

    //Draw tick text
    if(this.tickEnable[i]) {
      
      //Add tick padding
      for(var j=0; j<3; ++j) {
        offset[j] += minor[j] * this.tickPad[i]
      }

      //Draw axis
      this._text.drawTicks(
        i, 
        this.tickSize[i], 
        this.tickAngle[i],
        offset,
        this.tickColor[i])
    }

    //Draw labels
    if(this.labelEnable[i]) {

      //Add label padding
      for(var j=0; j<3; ++j) {
        offset[j] += minor[j] * this.labelPad[i]
      }
      offset[i] += 0.5 * (bounds[0][i] + bounds[1][i])

      //Draw axis
      this._text.drawLabel(
        i, 
        this.labelSize[i], 
        this.labelAngle[i],
        offset,
        this.labelColor[i])
    }
  }

  //Restore context state
  this._state.pop()
}

proto.dispose = function() {
  this._text.dispose()
  this._lines.dispose()
  this._background.dispose()
}

function createAxes(gl, options) {
  var axes = new Axes(gl)
  axes.update(options)
  return axes
}
