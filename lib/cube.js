"use strict"

module.exports = getCubeEdges

var bits = require("bit-twiddle")
var glm = require("gl-matrix")
var mat4 = glm.mat4
var vec4 = glm.vec4

var scratch = new Float32Array(16)

function getCubeEdges(model, view, projection, bounds) {
  var mvp = scratch

  //Concatenate matrices
  mat4.multiply(mvp, view, model)
  mat4.multiply(mvp, projection, mvp)
  
  //First project cube vertices
  var cubeVerts = []
  var x = [0,0,0,1]
  var y = [0,0,0,0]
  for(var i=0; i<2; ++i) {
    x[2] = bounds[i][2]
    for(var j=0; j<2; ++j) {
      x[1] = bounds[j][1]
      for(var k=0; k<2; ++k) {
        x[0] = bounds[k][0]
        vec4.transformMat4(y, x, mvp)
        var cv = [y[0]/y[3], y[1]/y[3], y[2]]
        cubeVerts.push(cv)
      }
    }
  }

  //Find closest vertex
  var closest = 0
  for(var i=0; i<8; ++i) {
    if(cubeVerts[i][2] < cubeVerts[closest][2]) {
      closest = i
    }
  }
  var farthest = 7 ^ closest

  //Find lowest vertex != closest
  var bottom = -1
  for(var i=0; i<8; ++i) {
    if(i === closest || i === farthest) {
      continue
    }
    if(bottom < 0) {
      bottom = i
    } else if(cubeVerts[bottom][1] > cubeVerts[i][1]) {
      bottom = i
    }
  }
  //Find left/right neighbors of bottom vertex
  var left = -1
  for(var i=0; i<3; ++i) {
    var idx = bottom ^ (1<<i)
    if(idx === closest || idx === farthest) {
      continue
    }
    if(left < 0) {
      left = idx
    }
    var v = cubeVerts[idx]
    if(v[0] < cubeVerts[left][0]) {
      left = idx
    }
  }
  var right = -1
  for(var i=0; i<3; ++i) {
    var idx = bottom ^ (1<<i)
    if(idx === closest || idx === farthest || idx === left) {
      continue
    }
    if(right < 0) {
      right = idx
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
  if(top === closest || top === farthest) {
    top = left ^ 7
    cubeEdges[bits.log2(right^top)] = top&right
  } else {
    cubeEdges[bits.log2(left^top)] = top&left
  }

  //Determine visible vaces
  var axis = [1,1,1]
  var cutCorner = closest
  for(var d=0; d<3; ++d) {
    if(cutCorner & (1<<d)) {
      axis[d] = -1
    } else {
      axis[d] = 1
    }
  }

  //Compute axis ranges
  return {
    edges: cubeEdges,
    axis: axis
  }
}