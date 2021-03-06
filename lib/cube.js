"use strict"

module.exports = getCubeEdges

var bits      = require('bit-twiddle')
var multiply  = require('gl-mat4/multiply')
var splitPoly = require('split-polygon')
var orient    = require('robust-orientation')

var mvp        = new Array(16)
var pCubeVerts = new Array(8)
var cubeVerts  = new Array(8)
var x          = new Array(3)
var zero3      = [0,0,0]

;(function() {
  for(var i=0; i<8; ++i) {
    pCubeVerts[i] =[1,1,1,1]
    cubeVerts[i] = [1,1,1]
  }
})()


function transformHg(result, x, mat) {
  for(var i=0; i<4; ++i) {
    result[i] = mat[12+i]
    for(var j=0; j<3; ++j) {
      result[i] += x[j]*mat[4*j+i]
    }
  }
}

var FRUSTUM_PLANES = [
  [ 0, 0, 1, 0, 0],
  [ 0, 0,-1, 1, 0],
  [ 0,-1, 0, 1, 0],
  [ 0, 1, 0, 1, 0],
  [-1, 0, 0, 1, 0],
  [ 1, 0, 0, 1, 0]
]

function polygonArea(p) {
  for(var i=0; i<FRUSTUM_PLANES.length; ++i) {
    p = splitPoly.positive(p, FRUSTUM_PLANES[i])
    if(p.length < 3) {
      return 0
    }
  }

  var base = p[0]
  var ax = base[0] / base[3]
  var ay = base[1] / base[3]
  var area = 0.0
  for(var i=1; i+1<p.length; ++i) {
    var b = p[i]
    var c = p[i+1]

    var bx = b[0]/b[3]
    var by = b[1]/b[3]
    var cx = c[0]/c[3]
    var cy = c[1]/c[3]

    var ux = bx - ax
    var uy = by - ay

    var vx = cx - ax
    var vy = cy - ay

    area += Math.abs(ux * vy - uy * vx)
  }

  return area
}

var CUBE_EDGES = [1,1,1]
var CUBE_AXIS  = [0,0,0]
var CUBE_RESULT = {
  cubeEdges: CUBE_EDGES,
  axis: CUBE_AXIS
}

function getCubeEdges(model, view, projection, bounds, ortho) {

  //Concatenate matrices
  multiply(mvp, view, model)
  multiply(mvp, projection, mvp)

  //First project cube vertices
  var ptr = 0
  for(var i=0; i<2; ++i) {
    x[2] = bounds[i][2]
    for(var j=0; j<2; ++j) {
      x[1] = bounds[j][1]
      for(var k=0; k<2; ++k) {
        x[0] = bounds[k][0]
        transformHg(pCubeVerts[ptr], x, mvp)
        ptr += 1
      }
    }
  }

  //Classify camera against cube faces
  var closest = -1

  for(var i=0; i<8; ++i) {
    var w = pCubeVerts[i][3]
    for(var l=0; l<3; ++l) {
      cubeVerts[i][l] = pCubeVerts[i][l] / w
    }

    if(ortho) cubeVerts[i][2] *= -1;

    if(w < 0) {
      if(closest < 0) {
        closest = i
      } else if(cubeVerts[i][2] < cubeVerts[closest][2]) {
        closest = i
      }
    }
  }

  if(closest < 0) {
    closest = 0
    for(var d=0; d<3; ++d) {
      var u = (d+2) % 3
      var v = (d+1) % 3
      var o0 = -1
      var o1 = -1
      for(var s=0; s<2; ++s) {
        var f0 = (s<<d)
        var f1 = f0 + (s << u) + ((1-s) << v)
        var f2 = f0 + ((1-s) << u) + (s << v)
        if(orient(cubeVerts[f0], cubeVerts[f1], cubeVerts[f2], zero3) < 0) {
          continue
        }
        if(s) {
          o0 = 1
        } else {
          o1 = 1
        }
      }
      if(o0 < 0 || o1 < 0) {
        if(o1 > o0) {
          closest |= 1<<d
        }
        continue
      }
      for(var s=0; s<2; ++s) {
        var f0 = (s<<d)
        var f1 = f0 + (s << u) + ((1-s) << v)
        var f2 = f0 + ((1-s) << u) + (s << v)
        var o = polygonArea([
            pCubeVerts[f0],
            pCubeVerts[f1],
            pCubeVerts[f2],
            pCubeVerts[f0+(1<<u)+(1<<v)]])
        if(s) {
          o0 = o
        } else {
          o1 = o
        }
      }
      if(o1 > o0) {
        closest |= 1<<d
        continue
      }
    }
  }

  var farthest = 7^closest

  //Find lowest vertex which is not closest closest
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
  var cubeEdges = CUBE_EDGES
  cubeEdges[0] = cubeEdges[1] = cubeEdges[2] = 0
  cubeEdges[bits.log2(left^bottom)] = bottom&left
  cubeEdges[bits.log2(bottom^right)] = bottom&right
  var top = right ^ 7
  if(top === closest || top === farthest) {
    top = left ^ 7
    cubeEdges[bits.log2(right^top)] = top&right
  } else {
    cubeEdges[bits.log2(left^top)] = top&left
  }

  //Determine visible faces
  var axis = CUBE_AXIS
  var cutCorner = closest
  for(var d=0; d<3; ++d) {
    if(cutCorner & (1<<d)) {
      axis[d] = -1
    } else {
      axis[d] = 1
    }
  }

  //Return result
  return CUBE_RESULT
}