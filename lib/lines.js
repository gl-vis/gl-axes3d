'use strict'

module.exports    = createLines

var createBuffer  = require('gl-buffer')
var createVAO     = require('gl-vao')
var glslify       = require('glslify')

var createShader = glslify({
  vertex:   './shaders/lineVert.glsl',
  fragment: './shaders/lineFrag.glsl'
})

function Lines(gl, vertBuffer, vao, shader, tickCount, tickOffset, gridCount, gridOffset) {
  this.gl         = gl
  this.vertBuffer = vertBuffer
  this.vao        = vao
  this.shader     = shader
  this.tickCount  = tickCount
  this.tickOffset = tickOffset
  this.gridCount  = gridCount
  this.gridOffset = gridOffset
}

var proto = Lines.prototype

proto.bind = function(model, view, projection) {
  this.shader.bind()
  this.shader.uniforms.model = model
  this.shader.uniforms.view = view
  this.shader.uniforms.projection = projection
  this.vao.bind()
}

proto.drawAxisLine = function(j, bounds, offset, color) {
  this.shader.uniforms.majorAxis = [0,0,0]

  var minorAxis = [0,0,0]
  minorAxis[j] = bounds[1][j] - bounds[0][j]
  this.shader.uniforms.minorAxis = minorAxis

  var noffset = offset.slice()
  noffset[j] += bounds[0][j]
  this.shader.uniforms.offset = noffset

  this.shader.uniforms.color = color
  this.vao.draw(this.gl.LINES, 2)
}

proto.drawAxisTicks = function(j, offset, minorAxis, color) {
  var majorAxis = [0,0,0]
  majorAxis[j]  = 1
  this.shader.uniforms.majorAxis = majorAxis
  this.shader.uniforms.offset    = offset
  this.shader.uniforms.minorAxis = minorAxis
  this.shader.uniforms.color     = color
  this.vao.draw(this.gl.LINES, this.tickCount[j], this.tickOffset[j])
}

proto.drawGrid = function(i, j, bounds, offset, color) {
  var minorAxis = [0,0,0]
  minorAxis[j]  = bounds[1][j] - bounds[0][j]
  this.shader.uniforms.minorAxis = minorAxis

  var noffset = offset.slice()
  noffset[j] += bounds[0][j]
  this.shader.uniforms.offset = noffset

  var majorAxis = [0,0,0]
  majorAxis[i]  = 1
  this.shader.uniforms.majorAxis = majorAxis

  this.shader.uniforms.color = color
  this.vao.draw(this.gl.LINES, this.gridCount[i], this.gridOffset[i])
}

proto.drawZero = function(j, bounds, offset, color) {
  this.shader.uniforms.majorAxis = [0,0,0]

  var minorAxis = [0,0,0]
  minorAxis[j] = bounds[1][j] - bounds[0][j]
  this.shader.uniforms.minorAxis = minorAxis

  var noffset = offset.slice()
  noffset[j] += bounds[0][j]
  this.shader.uniforms.offset = noffset

  this.shader.uniforms.color = color
  this.vao.draw(this.gl.LINES, 2)
}

proto.dispose = function() {
  this.vao.dispose()
  this.vertBuffer.dispose()
  this.shader.dispose()
}

function createLines(gl, bounds, ticks) {
  var vertices    = []
  var tickOffset  = [0,0,0]
  var tickCount   = [0,0,0]

  //Create grid lines for each axis/direction
  var gridOffset = [0,0,0]
  var gridCount  = [0,0,0]

  //Add zero line
  vertices.push(0,0,  0,1)

  for(var i=0; i<3; ++i) {
    //Axis tick marks
    var start = ((vertices.length / 2)|0)
    for(var j=0; j<ticks[i].length; ++j) {
      vertices.push(+ticks[i][j].x,0,   +ticks[i][j].x,1)
    }
    var end = ((vertices.length / 2)|0)
    tickOffset[i] = start
    tickCount[i]  = end - start

    //Grid lines
    var start = ((vertices.length / 2)|0)
    for(var k=0; k<ticks[i].length; ++k) {
      var tx = +ticks[i][k].x
      vertices.push(tx,0,  tx,1)
    }
    var end = ((vertices.length / 2)|0)
    gridOffset[i] = start
    gridCount[i]  = end - start
  }

  //Create cube VAO
  var vertBuf = createBuffer(gl, new Float32Array(vertices))
  var vao = createVAO(gl, [
    { "buffer": vertBuf,
      "type": gl.FLOAT,
      "size": 2,
      "stride": 0,
      "offset": 0
    }
  ])
  var shader = createShader(gl)
  shader.attributes.position.location = 0
  return new Lines(gl, vertBuf, vao, shader, tickCount, tickOffset, gridCount, gridOffset)
}