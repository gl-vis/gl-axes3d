"use strict"

module.exports = createTextSprites

var boxpack = require("boxpack")
var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var createTexture = require("gl-texture2d")
var glslify = require("glslify")

var createShader = glslify({
  vertex: "./shaders/textVert.glsl",
  fragment: "./shaders/textFrag.glsl"
})

//Vertex buffer format for text is:
//
//  t - axial coordinate
//  textureId - number of texture to use
//  [x,y] - texture index
//  [dx,dy] - screen offset

var VERTEX_SIZE = 6
var VERTEX_STRIDE = VERTEX_SIZE * 4

function TextSprites(gl, shader, buffer, vao, textures, axesStart, axesCount, labelOffset) {
  this.gl
  this.shader = shader
  this.buffer = buffer
  this.vao = vao
  this.textures = textures
  this.axesStart = axesStart
  this.axesCount = axesCount
  this.labelOffset = labelOffset
}

var proto = TextSprites.prototype

//Bind all the textures
proto.bind = function(params) {
  this.vao.bind()
  this.shader.bind()
  this.shader.uniforms.model = params.model
  this.shader.uniforms.view = params.view
  this.shader.uniforms.projection = params.projection
  for(var i=0; i<this.textures.length; ++i) {
    this.shader.uniforms.textures[i] = this.textures[i].bind(i)
  }
}

//Draws the tick marks for an axis
proto.drawAxis = function(d, offset) {
  this.shader.uniforms.offset = offset
  var v = [0,0,0]
  v[d] = 1
  this.shader.uniforms.axis = d
  this.vao.draw(this.gl.TRIANGLES, axesCount[d], axesStart[d])
}

//Draws the text label for an axis
proto.drawLabel = function(d, offset) {
  this.shader.uniforms.offset = offset
  this.shader.uniforms.axis = [0,0,0]
  this.vao.draw(this.gl.TRIANGLES, 1, this.labelOffset[d])
}

//Releases all resources attached to this object
proto.dispose = function() {
  this.shader.dispose()
  this.vao.dispose()
  this.buffer.dispose()
  for(var i=0; i<this.textures.length; ++i) {
    this.textures[i].dispose()
  }
}

//Convert number to string
function prettyPrint(number) {
  return number + ""
}

//Packs all of the text objects into a texture, returns 
function createTextSprites(gl, extents, spacing, font, padding, labelNames) {

  //Create scratch canvas object
  var canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 1024

  //Get 2D context
  var context = canvas.getContext("2d")

  //Initialize canvas
  context.font = font
  context.textAlign = "center"
  context.textBaseLine = "middle"

  //Pack all of the strings into the texture map
  var textures = []
  var data = []
  var bin

  function beginTexture() {
    bin = boxpack({
      width: canvas.width,
      height: canvas.height
    })
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  function endTexture() {
    var tex = createTexture(gl, canvas)
    tex.generateMipMaps()
    textures.push(tex)
  }

  //Use binpack to stuff text item in buffer, continue looping
  function addItem(t, text) {
    var dims = drawContext.measureText(str)
    var location = bin.pack({ width: dims.width + 2*padding, 
                              height: dims.height + 2*padding })
    if(!location) {
      endTexture()
      beginTexture()
      location = bin.pack({ width: dims.width + 2*padding, 
                            height: dims.height + 2*padding })
    }

    //Render the text into the canvas
    drawContext.fillText(text, location.x+padding+dims.width/2, location.y+padding+dims.height/2)

    //Calculate vertex data
    var textureId = textures.length
    var coord = [ (location.x + padding)/canvas.width, (location.y + padding)/canvas.height ]
    var shape = [ dims.width/canvas.width, dims.height/canvas.height ]
    var aspect_2 = 0.5 * dims.width / dims.height

    //Append vertices
    data.push(
      t, textureId, coord[0], coord[1], -aspect_2, -0.5,
      t, textureId, coord[0]+shape[0], coord[1], aspect_2, -0.5,
      t, textureId, coord[0], coord[1]+shape[1], -aspect_2, 0.5,
      t, textureId, coord[0], coord[1]+shape[1], -aspect_2, 0.5,
      t, textureId, coord[0]+shape[0], coord[1]+shape[1], aspect_2, 0.5,
      t, textureId, coord[0]+shape[0], coord[1], aspect_2, -0.5)
  }

  //Generate sprites for all 3 axes, store data in texture atlases
  beginTexture()
  var axesStart = []
  var axesCount = []
  var labelOffset = []
  for(var d=0; d<3; ++d) {

    //Generate sprites for tick marks
    axesStart.push((data.length/VERTEX_SIZE)|0)
    var m = 0.5 * (extents[d][0] + extents[d][1])
    for(var t=m; t<=extents[d][1]; t+=spacing[d]) {
      addItem(t, prettyPrint(t))
    }
    for(var t=m-spacing[d]; t>=extents[d][0]; t-=spacing[d]) {
      addItem(t, prettyPrint(t))
    }
    axesCount.push(((data.length/VERTEX_SIZE)|0) - axesStart[d])

    //Also generate sprite for axis label
    labelOffsets.push(data.length)
    addItem(m, labels[i])
  }
  endTexture()

  //Create vetex buffers
  var buffer = createBuffer(gl, data)
  var vao = createVAO(gl, [ 
    { //t
      "buffer": buffer,
      "offset": 0,
      "size": 1,
      "stride": VERTEX_STRIDE
    }, 
    { //textureId
      "buffer": buffer,
      "offset": 4,
      "size": 1,
      "stride": VERTEX_STRIDE
    },
    { //texCoord
      "buffer": buffer,
      "offset": 8,
      "size": 2,
      "stride": VERTEX_STRIDE
    },
    { //screenOffset
      "buffer": buffer,
      "offset": 16,
      "size": 2,
      "stride": VERTEX_STRIDE
    }
  ])

  //Create text object shader
  var shader = createShader(gl)

  //Store all the entries in the texture map
  return new TextSprites(gl, shader, buffer, vao, textures, axesStart, axesCount, labelOffset)
}