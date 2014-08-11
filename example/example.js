"use strict"

var shell = require("gl-now")({ clearColor: [0,0,0,0], tickRate: 5 })
var camera = require("game-shell-orbit-camera")(shell)
var mat4 = require("gl-matrix").mat4
var createAxes = require("../axes.js")

camera.lookAt([-15,20,-15], [0,0,0], [0, 1, 0])

//State variables
var axes

shell.on("gl-init", function() {
  var gl = shell.gl
  axes = createAxes(gl, {
    gridColor: [0.5,0.5,0.5],
    lineMirror: true,
    lineTickEnable: true,
    lineTickMirror: true,
    lineTickLength: 0.8,
    backgroundEnable: true,
    backgroundColor: [ [1,0,0], [0,1,0], [0,0,1] ]
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
        1000.0),
    model: [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1]
  }

  //Draw objects
  axes.draw(cameraParameters)
})