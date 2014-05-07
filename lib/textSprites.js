"use strict"

module.exports = createTextSprites

var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var vectorizeText = require("vectorize-text")
var glslify = require("glslify")

var createShader = glslify({
  vertex: "./shaders/textVert.glsl",
  fragment: "./shaders/textFrag.glsl"
})

//Vertex buffer format for text is:
//
/// [x,y,z] = Spatial coordinate
//

var VERTEX_SIZE = 3
var VERTEX_STRIDE = VERTEX_SIZE * 4

function TextSprites(gl, shader, buffer, vao, axesStart, axesCount, labelOffset, labelCount, textScale) {
  this.gl = gl
  this.shader = shader
  this.buffer = buffer
  this.vao = vao
  this.axesStart = axesStart
  this.axesCount = axesCount
  this.labelOffset = labelOffset
  this.labelCount = labelCount
  this.textScale = textScale
}

var proto = TextSprites.prototype

//Bind all the textures
proto.bind = function(model, view, projection) {
  this.vao.bind()
  this.shader.bind()
  this.shader.uniforms.model = model
  this.shader.uniforms.view = view
  this.shader.uniforms.projection = projection
  this.shader.uniforms.textScale = this.textScale
}

//Draws the tick marks for an axis
proto.drawAxis = function(d, offset) {
  this.shader.uniforms.offset = offset
  var v = [0,0,0]
  v[d] = 1
  this.shader.uniforms.axis = v
  this.vao.draw(this.gl.TRIANGLES, this.axesCount[d], this.axesStart[d])
}

//Draws the text label for an axis
proto.drawLabel = function(d, offset) {
  this.shader.uniforms.offset = offset
  this.shader.uniforms.axis = [0,0,0]
  this.vao.draw(this.gl.TRIANGLES, this.labelCount[d], this.labelOffset[d])
}

//Releases all resources attached to this object
proto.dispose = function() {
  this.shader.dispose()
  this.vao.dispose()
  this.buffer.dispose()
}

//Convert number to string
function prettyPrint(number) {
  var str = number.toFixed(3)
  if(+str === number) {
    return number + ''
  }
  return str
}

//Packs all of the text objects into a texture, returns 
function createTextSprites(gl, extents, spacing, font, padding, labels) {

  var data = []

  //Use binpack to stuff text item in buffer, continue looping
  function addItem(t, text) {
    var mesh = vectorizeText(text, {
      triangles: true,
      font: font,
      textAlign: "center",
      textBaseline: "middle"
    })

    var positions = mesh.positions
    var cells = mesh.cells
    for(var i=0, nc=cells.length; i<nc; ++i) {
      var c = cells[i]
      for(var j=2; j>=0; --j) {
        var p = positions[c[j]]
        data.push(p[0], -p[1], t)
      }
    }
  }

  //Generate sprites for all 3 axes, store data in texture atlases
  var axesStart = []
  var axesCount = []
  var labelOffset = []
  var labelCount = []
  for(var d=0; d<3; ++d) {

    //Generate sprites for tick marks
    axesStart.push((data.length/VERTEX_SIZE)|0)
    var m = 0.5 * (extents[0][d] + extents[1][d])
    for(var t=m; t<=extents[1][d]; t+=spacing[d]) {
      addItem(t, prettyPrint(t))
    }
    for(var t=m-spacing[d]; t>=extents[0][d]; t-=spacing[d]) {
      addItem(t, prettyPrint(t))
    }
    axesCount.push(((data.length/VERTEX_SIZE)|0) - axesStart[d])

    //Also generate sprite for axis label
    labelOffset.push((data.length/VERTEX_SIZE)|0)
    addItem(m, labels[d])
    labelCount.push((data.length/VERTEX_SIZE - labelOffset[d])|0)
  }

  //Create vetex buffers
  var buffer = createBuffer(gl, data)
  var vao = createVAO(gl, [ 
    { "buffer": buffer,
      "offset": 0,
      "size": 3
    }
  ])

  //Create text object shader
  var shader = createShader(gl)
  shader.attributes.position.location = 0

  var textScale = 0.5 * Math.min.apply(undefined, spacing)

  //Store all the entries in the texture map
  return new TextSprites(gl, shader, buffer, vao, axesStart, axesCount, labelOffset, labelCount, textScale)
}