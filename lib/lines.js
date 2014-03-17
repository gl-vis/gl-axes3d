"use strict"

module.exports = createLines

var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var glslify = require("glslify")

var createShader = glslify({
  vertex: "./shaders/lineVert.glsl",
  fragment: "./shaders/lineFrag.glsl"
})

function Lines(gl, vertBuffer, vao, shader, lineCount, lineOffset) {
  this.gl = gl
  this.vertBuffer = vertBuffer
  this.vao = vao
  this.shader = shader
  this.lineCount = lineCount
  this.lineOffset = lineOffset
}

var proto = Lines.prototype

proto.bind = function(model, view, projection) {
  this.shader.bind()
  this.shader.uniforms.model = model
  this.shader.uniforms.view = view
  this.shader.uniforms.projection = projection
  this.vao.bind()
}

proto.draw = function(d, offset, minorAxis) {
  this.shader.uniforms.offset = offset
  var majorAxis = [0,0,0]
  majorAxis[d] = 1
  this.shader.uniforms.majorAxis = majorAxis
  this.shader.uniforms.minorAxis = minorAxis
  this.vao.draw(this.gl.LINES, this.lineCount[d], this.lineOffset[d])
}

proto.dispose = function() {
  this.vao.dispose()
  this.faceBuffer.dispose()
  this.vertBuffer.dispose()
  this.shader.dispose()
}

function createLines(gl, bounds, tickSpacing) {
  var lineVertices = []
  var lineOffset = [0,0,0]
  var lineCount = [0,0,0]
  for(var i=0; i<3; ++i) {
    var start = ((lineVertices.length / 2)|0)
    lineVertices.push(bounds[0][i], 0, bounds[1][i], 0)
    lineVertices.push(0, -1, 0, 1)
    for(var j=1; j*tickSpacing[i] <= bounds[1][i]; ++j) {
      var t = tickSpacing[i] * j
      lineVertices.push(t, -1, t, 1)
    }
    for(var j=-1; j*tickSpacing[i] >= bounds[0][i]; --j) {
      var t = tickSpacing[i] * j
      lineVertices.push(t, -1, t, 1)
    }
    var end = ((lineVertices.length / 2)|0)
    lineOffset[i] = start
    lineCount[i] = end - start
  }

  //Create cube VAO
  var vertBuf = createBuffer(gl, new Float32Array(lineVertices))
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
  return new Lines(gl, vertBuf, vao, shader, lineCount, lineOffset)
}