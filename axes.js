"use strict"

module.exports = createAxes

var createTextSprites = require("./lib/textSprites.js")
var createBox = require("./lib/box.js")
var createLines = require("./lib/lines.js")
var bits = require("bit-twiddle")
var createStateStack = require("gl-state")
var glm = require("gl-matrix")
var mat4 = glm.mat4
var vec4 = glm.vec4

var identity = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1])

var scratch = [new Float32Array(16), new Float32Array(16)]

function Axes(gl) {
  this.gl = gl
  this.extents = [[-10, -10, -10], [10,10,10]]
  this.labels = ["x", "y", "z"]
  this.tickSpacing = [0.5, 0.5, 0.5]
  this.tickWidth = 0.01
  this.showTicks = [true, true, true]
  this.font = "sans-serif"
  this.fontSize = 32
  this._textSprites = null
  this._box = null
  this._lines = null
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
  if(this._lines) {
    this._lines.dispose()
  }
  this._lines = createLines(this.gl, this.extents, this.tickSpacing)
}

proto.draw = function(params) {
  params = params || {}

  var model = params.model || identity
  var view = params.view || identity
  var projection = params.projection || identity
  var mvp = scratch[0]
  var inv_mvp = scratch[1]
  var bounds = this.extents

  //Concatenate matrices
  mat4.multiply(mvp, view, model)
  mat4.multiply(mvp, projection, mvp)
  mat4.invert(inv_mvp, mvp)

  //Determine which axes to draw (this is tricky)
  var cubeVerts = []
  var x = [0,0,0,1]
  var y = [0,0,0,0]
  var bottom = 0
  for(var i=0; i<2; ++i) {
    x[2] = bounds[i][2]
    for(var j=0; j<2; ++j) {
      x[1] = bounds[j][1]
      for(var k=0; k<2; ++k) {
        x[0] = bounds[k][0]
        vec4.transformMat4(y, x, mvp)
        var cv = [y[0]/y[3], y[1]/y[3], y[2]/Math.abs(y[3])]
        cubeVerts.push(cv)
        if(cv[1] < cubeVerts[bottom][1]) {
          bottom = cubeVerts.length-1
        }
      }
    }
  }
  var closest = bottom^1
  for(var i=0; i<8; ++i) {
    if(i === bottom) {
      continue
    }
    if(cubeVerts[i][2] < cubeVerts[closest][2]) {
      closest = i
    }
  }
  var left = bottom ^ 1
  var right = bottom ^ 2
  if(left === closest) {
    left = bottom ^ 4
  }
  if(right === closest) {
    right = bottom ^ 4
  }
  for(var i=0; i<3; ++i) {
    var idx = bottom ^ (1<<i)
    if(idx === closest) {
      continue
    }
    var v = cubeVerts[idx]
    if(v[0] < cubeVerts[left][0]) {
      left = idx
      right = bottom ^ (1<<((i+1)%3))
      if(right === closest) {
        right = bottom ^ (1<<((i+2)%3))
      }
    }
  }
  for(var i=0; i<3; ++i) {
    var idx = bottom ^ (1<<i)
    if(idx === left || idx === closest) {
      continue
    }
    var v = cubeVerts[idx]
    if(v[0] > cubeVerts[right][0]) {
      right = idx
    }
  }
  
  //Determine edge axis coordinates
  var cubeEdges = [0,0,0]
  cubeEdges[bits.log2(left^bottom)] = bottom&left
  cubeEdges[bits.log2(bottom^right)] = bottom&right
  var top = right ^ 7
  if(top === closest) {
    top = left ^ 7
    cubeEdges[bits.log2(right^top)] = top&right
  } else {
    cubeEdges[bits.log2(left^top)] = top&left
  }
  
  //Determine visible vaces
  var axis = [1,1,1]
  var cutCorner = left ^ top ^ bottom
  for(var i=0; i<8; ++i) {
    if(i === left || i == bottom || i === top || i == right) {
      continue
    }
    var v = cubeVerts[i]
    if(v[2] < cubeVerts[cutCorner][2]) {
      cutCorner = i
    }
  }
  for(var d=0; d<3; ++d) {
    if(cutCorner & (1<<d)) {
      axis[d] = -1
    } else {
      axis[d] = 1
    }
  }

  //Save context state
  this._state.push()

  //Set up state parameters
  var gl = this.gl
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  gl.enable(gl.DEPTH_TEST)
  gl.depthMask(true)
  gl.disable(gl.BLEND)

  //Draw axes lines
  gl.lineWidth(1)
  this._lines.bind(
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
    this._lines.draw(i, c, minor)
  }

  //Turn on blending
  gl.enable(gl.BLEND)
  gl.blendEquation(gl.FUNC_ADD)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  
  //Draw outer box
  this._box.draw(
    model,
    view,
    projection,
    axis,
    this)

  //Draw text sprites
  gl.depthMask(false)
  this._textSprites.bind(
    model,
    view,
    projection,
    this)

  //Draw labels
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
    this._textSprites.drawAxis(i, c)
    this._textSprites.drawLabel(i, q)
  }

  //Restore context state
  this._state.pop()
}

proto.dispose = function() {
  this._textSprites.dispose()
  this._box.dispose()
  this._lines.dispose()
}

function createAxes(gl, options) {
  var axes = new Axes(gl)
  axes.update(options)
  return axes
}
