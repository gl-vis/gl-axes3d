"use strict"

var shell = require("gl-now")({ clearColor: [0,0,0,0] })
var createMesh = require("gl-simplicial-complex")
var polygonize = require("isosurface").surfaceNets
var camera = require("game-shell-orbit-camera")(shell)
var mat4 = require("gl-matrix").mat4
var createAxes = require("../axes.js")

//Bounds on function to plot
var extents = [[-5,-5,-5], [5,5,5]]

camera.lookAt([-15,20,-15], [0,0,0], [0, 1, 0])

//Plot level set of f = 0
function f(x,y,z) {
  return x*x + y*y + z*z - 2.0
}

//State variables
var mesh, axes

shell.on("gl-init", function() {
  var gl = shell.gl
  mesh = createMesh(gl, polygonize([64, 64, 64], f, extents))
  axes = createAxes(gl, {
    extents: extents
  })
})

shell.on("gl-render", function() {
  var gl = shell.gl
  gl.enable(gl.DEPTH_TEST)

  //Compute camera parameters
  var cameraParameters = {
    view: camera.view(),
    projection: mat4.perspective(
        mat4.create(),
        Math.PI/4.0,
        shell.width/shell.height,
        0.1,
        1000.0)
  }
  
  //Draw objects
  axes.draw(cameraParameters)
  mesh.draw(cameraParameters)
})