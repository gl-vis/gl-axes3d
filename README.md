gl-axes
=======
Draws axes for 3D scenes:

<img src=https://raw.github.com/mikolalysenko/gl-axes/master/example/axes.png>

# Example

Here is a simple example showing how to use gl-axes to visualize the extents of an isosurface:

```javascript
//Load shell
var shell = require("gl-now")({ clearColor: [0,0,0,0] })
var camera = require("game-shell-orbit-camera")(shell)

//Mesh creation tools
var createMesh = require("gl-simplicial-complex")
var polygonize = require("isosurface").surfaceNets
var createAxes = require("gl-axes")

//Matrix math
var mat4 = require("gl-matrix").mat4

//Bounds on function to plot
var extents = [[-5,-5,-5], [5,5,5]]

//Plot level set of f = 0
function f(x,y,z) {
  return x*x + y*y + z*z - 2.0
}

//State variables
var mesh, axes

shell.on("gl-init", function() {
  var gl = shell.gl

  //Set up camera
  camera.lookAt(extents[1], [0,0,0], [0, 1, 0])

  //Create mesh
  mesh = createMesh(gl, polygonize([64, 64, 64], f, extents))

  //Create axes object
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
  
  //Draw mesh
  mesh.draw(cameraParameters)

  //Draw axes
  axes.draw(cameraParameters)
})
```

[You can play with this demo yourself on requirebin.](http://requirebin.com/?gist=mikolalysenko/9610686)

# Install

```
npm install gl-axes
```

# API

## Constructor

### `var axes = require("gl-axes")(gl[, params])`
Creates an axes object.

* `gl` is a WebGL context
* `params` is an object with the same behavior as [`axes.update`](#axesupdateparams)

**Returns** A new `glAxes` object for drawing the 

## Methods

### `axes.draw(camera)`
Draws the axes object with the given camera parameters.  The `camera` object can have the following properties:

* `model` - Is the model matrix for the axes object (default identity)
* `view` - Is the view matrix for the axes (default identity)
* `projection` - Is the projection matrix for the axes (default identity)

All camera matrices are in 4x4 homogeneous coordinates and encoded as length 16 arrays as done by [`gl-matrix`](https://github.com/toji/gl-matrix).

### `axes.update(params)`
Updates the parameters of the axes object using the properties in `params`. These can be as follows:

* `extents` the bounding box for the axes object, represented as a pair of 3D arrays encoding the lower and upper bounds for each component.  Default is `[[-10,-10,-10],[10,10,10]]`
* `labels` a 3D array encoding the labels for each of the 3 axes.  Default is `['x', 'y', 'z']`
* `tickSpacing` either a number or 3d array representing the spacing between the tick lines for each axis. Default is `0.5`
* `showTicks` a vector of boolean values determining which of the 3 axes tick lines to show.  Default is `[true,true,true]`
* `tickWidth` the width of a tick line in the underlying box
* `font` the font family to use for rendering text.  Default `'sans-serif'`
* `fontSize` the resolution to render the text at.  Default `32`

### `axes.dispose()`
Releases all resources associated with this axes object.

# Credits
(c) 2014 Mikola Lysenko. MIT License