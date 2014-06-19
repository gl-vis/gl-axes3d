"use strict"

module.exports = axesProperties

var glm         = require("gl-matrix")
var getPlanes   = require("extract-frustum-planes")
var splitPoly   = require("split-polygon")
var cubeParams  = require("./lib/cube.js")
var mat4        = glm.mat4
var vec4        = glm.vec4

var identity    = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ])

var mvp         = new Float32Array(16)

function AxesRange3D(lo, hi, pixelsPerDataUnit) {
  this.lo = lo
  this.hi = hi
  this.pixelsPerDataUnit = pixelsPerDataUnit
}

function gradient(M, v, width, height) {
  var result = [0, 0, 0]
  for(var i=0; i<3; ++i) {
    var q = [v[0], v[1], v[2], 1]
    q[i] += 1
    vec4.transformMat4(q, q, M)
    if(q[3] < 0) {
      result[i] = Infinity
    }

    var p = [v[0], v[1], v[2], 1]
    p[i] -= 1
    vec4.transformMat4(p, p, M)
    if(p[3] < 0) {
      result[i] = Infinity
    }
    
    var dx = (p[0]/p[3] - q[0]/q[3]) * width
    var dy = (p[1]/p[3] - q[1]/q[3]) * height

    result[i] = 0.25 * Math.sqrt(dx*dx + dy*dy)
  }
  return result
}

function axesProperties(axes, camera, width, height) {
  var model       = camera.model || identity
  var view        = camera.view || identity
  var projection  = camera.projection || identity
  var bounds      = axes.bounds
  var params      = cubeParams(model, view, projection, bounds)
  var axis        = params.axis
  var edges       = params.edges

  mat4.mul(mvp, view, model)
  mat4.mul(mvp, projection, mvp)
  
  //Calculate the following properties for each axis:
  //
  // * lo - start of visible range for each axis in tick coordinates
  // * hi - end of visible range for each axis in tick coordinates
  // * ticksPerPixel - pixel density of tick marks for the axis
  //
  var ranges = new Array(3)
  for(var i=0; i<3; ++i) {
    ranges[i] = new AxesRange3D(Infinity, -Infinity, Infinity)
  }
  
  //Compute frustum planes, intersect with box
  var frustum = getPlanes(mat4.transpose(mvp, mvp))
  mat4.transpose(mvp, mvp)

  //Loop over vertices of viewable box
  for(var d=0; d<3; ++d) {
    var u = (d+1)%3
    var v = (d+2)%3
    var x = [0,0,0]
i_loop:
    for(var i=0; i<2; ++i) {
      var poly = []

      if((axis[d] < 0) === !!i) {
        continue
      }

      x[d] = bounds[i][d]
      for(var j=0; j<2; ++j) {
        x[u] = bounds[j^i][u]
        for(var k=0; k<2; ++k) {
          x[v] = bounds[k^j^i][v]
          poly.push(x.slice())
        }
      }
      for(var j=0; j<frustum.length; ++j) {
        if(poly.length === 0) {
          continue i_loop
        }
        poly = splitPoly.positive(poly, frustum[j])
      }

      //Loop over vertices of polygon to find extremal points
      for(var j=0; j<poly.length; ++j) {
        var v = poly[j]
        var grad = gradient(mvp, v, width, height)
        for(var k=0; k<3; ++k) {
          ranges[k].lo = Math.min(ranges[k].lo, v[k])
          ranges[k].hi = Math.max(ranges[k].hi, v[k])
          if(k !== d) {
            ranges[k].pixelsPerDataUnit = Math.min(ranges[k].pixelsPerDataUnit, Math.abs(grad[k]))
          }
        }
      }
    }
  }

  return ranges
}