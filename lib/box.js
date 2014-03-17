"use strict"

module.exports = createOuterBox

var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var glslify = require("glslify")

var createShader = glslify({
  vertex: "./shaders/boxVert.glsl",
  fragment: "./shaders/boxFrag.glsl"
})

function OuterBox(gl, vertBuffer, vao, shader) {
  this.gl = gl
  this.vertBuffer = vertBuffer
  this.vao = vao
  this.shader = shader
}

var proto = OuterBox.prototype

proto.draw = function(model, view, projection, axis, params) {
  var gl = this.gl
  var shader = this.shader
  var vao = this.vao
  shader.bind()
  shader.uniforms.model = model
  shader.uniforms.view = view
  shader.uniforms.projection = projection
  shader.uniforms.axis = axis
  shader.uniforms.extents = params.extents
  shader.uniforms.tickSpacing = params.tickSpacing
  shader.uniforms.tickWidth = params.tickWidth
  vao.bind()
  vao.draw(gl.TRIANGLES, 36)
  vao.unbind()
}

proto.dispose = function() {
  this.vao.dispose()
  this.faceBuffer.dispose()
  this.vertBuffer.dispose()
  this.shader.dispose()
}

function createOuterBox(gl) {
  //Create buffers for cube
  var cubeVerts = []
  for(var d=0; d<3; ++d) {
    for(var s=-1; s<=1; s+=2) {
      var n = [0,0,0]
      var u = [0,0,0]
      var v = [0,0,0]
      n[d] = s
      u[(d + 1) % 3] = 1
      v[(d + 2) % 3] = s
      cubeVerts.push(
        n[0]-u[0]+v[0],n[1]-u[1]+v[1],n[2]-u[2]+v[2],d,n[0],n[1],n[2],
        n[0]+u[0]+v[0],n[1]+u[1]+v[1],n[2]+u[2]+v[2],d,n[0],n[1],n[2],
        n[0]+u[0]-v[0],n[1]+u[1]-v[1],n[2]+u[2]-v[2],d,n[0],n[1],n[2],
        n[0]-u[0]+v[0],n[1]-u[1]+v[1],n[2]-u[2]+v[2],d,n[0],n[1],n[2],
        n[0]+u[0]-v[0],n[1]+u[1]-v[1],n[2]+u[2]-v[2],d,n[0],n[1],n[2],
        n[0]-u[0]-v[0],n[1]-u[1]-v[1],n[2]-u[2]-v[2],d,n[0],n[1],n[2])
    }
  }

  //Create cube VAO
  var vertBuf = createBuffer(gl, new Float32Array(cubeVerts))
  var vao = createVAO(gl, [
    { "buffer": vertBuf,
      "type": gl.FLOAT,
      "size": 4,
      "stride": 28,
      "offset": 0
    },
    { "buffer": vertBuf,
      "type": gl.FLOAT,
      "size": 3,
      "stride": 28,
      "offset": 16
    }
  ])

  //Create box shader
  var shader = createShader(gl)
  shader.attributes.position.location = 0
  shader.attributes.normal.location = 1

  return new OuterBox(gl, vertBuf, vao, shader)
}