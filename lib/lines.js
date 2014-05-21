"use strict"

module.exports = createLines

var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var glslify = require("glslify")

var createShader = glslify({
  vertex: "./shaders/lineVert.glsl",
  fragment: "./shaders/lineFrag.glsl"
})

function Lines(gl, vertBuffer, vao, shader, lineCount, lineOffset, boxCount, boxOffset) {
  this.gl = gl
  this.vertBuffer = vertBuffer
  this.vao = vao
  this.shader = shader
  this.lineCount = lineCount
  this.lineOffset = lineOffset
  this.boxCount = boxCount
  this.boxOffset = boxOffset
}

var proto = Lines.prototype

proto.bind = function(model, view, projection) {
  this.shader.bind()
  this.shader.uniforms.model = model
  this.shader.uniforms.view = view
  this.shader.uniforms.projection = projection
  this.vao.bind()
}

proto.drawAxis = function(d, offset, minorAxis, color) {
  this.shader.uniforms.offset = offset
  var majorAxis = [0,0,0]
  majorAxis[d] = 1
  this.shader.uniforms.majorAxis = majorAxis
  this.shader.uniforms.minorAxis = minorAxis
  this.shader.uniforms.centerWeight = 0.0
  this.shader.uniforms.color = color
  this.vao.draw(this.gl.LINES, this.lineCount[d], this.lineOffset[d])
}

proto.drawBox = function(d, offset, color) {
  this.shader.uniforms.offset = offset
  this.shader.uniforms.majorAxis = [0,0,0]
  this.shader.uniforms.minorAxis = [0,0,0]
  this.shader.uniforms.centerWeight = 1.0
  this.shader.uniforms.color = color
  this.vao.draw(this.gl.LINES, this.boxCount[d], this.boxOffset[d])
}

proto.dispose = function() {
  this.vao.dispose()
  this.vertBuffer.dispose()
  this.shader.dispose()
}

function createLines(gl, bounds, ticks) {
  var lineVertices = []
  var lineOffset = [0,0,0]
  var lineCount = [0,0,0]
  var boxOffset = [0,0,0]
  var boxCount = [0,0,0]
  for(var i=0; i<3; ++i) {
    //Create line
    var start = ((lineVertices.length / 3)|0)
    lineVertices.push(bounds[0][i], 0, 0, bounds[1][i], 0, 0)
    for(var j=0; j<ticks[i].length; ++j) {
      lineVertices.push(ticks[i][j].x,-1,0, ticks[i][j].x,1,0)
    }
    var end = ((lineVertices.length / 3)|0)
    lineOffset[i] = start
    lineCount[i] = end - start

    //Create box grid
    var start = ((lineVertices.length / 3)|0)
    for(var h = 0; h<=1; ++h) {
      var u = (i+1+h)%3
      var v = (i+1+(h^1))%3
      var lo_u = bounds[0][u]
      var hi_u = bounds[1][u]
      var lo_v = bounds[0][v]
      var hi_v = bounds[1][v]
      var x = [0,0,0]
      for(var j=0; j<ticks[u].length; ++j) {
        x[u] = ticks[u][j].x
        x[v] = lo_v
        lineVertices.push.apply(lineVertices, x)
        x[v] = hi_v
        lineVertices.push.apply(lineVertices, x)
      }
      x[u] = lo_u
      x[v] = lo_v
      lineVertices.push.apply(lineVertices, x)
      x[v] = hi_v
      lineVertices.push.apply(lineVertices, x)
      x[u] = hi_u
      x[v] = lo_v
      lineVertices.push.apply(lineVertices, x)
      x[v] = hi_v
      lineVertices.push.apply(lineVertices, x)
    }
    var end = ((lineVertices.length / 3)|0)
    boxOffset[i] = start
    boxCount[i] = end - start
  }

  //Create cube VAO
  var vertBuf = createBuffer(gl, new Float32Array(lineVertices))
  var vao = createVAO(gl, [
    { "buffer": vertBuf,
      "type": gl.FLOAT,
      "size": 3,
      "stride": 0,
      "offset": 0
    }
  ])
  var shader = createShader(gl)
  shader.attributes.position.location = 0
  return new Lines(gl, vertBuf, vao, shader, lineCount, lineOffset, boxCount, boxOffset)
}