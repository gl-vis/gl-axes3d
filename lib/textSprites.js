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

function TextSprites(gl, shader, buffer, vao, textures, axesStart, axesCount, labelOffset, textScale) {
  this.gl = gl
  this.shader = shader
  this.buffer = buffer
  this.vao = vao
  this.textures = textures
  this.axesStart = axesStart
  this.axesCount = axesCount
  this.labelOffset = labelOffset
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
  for(var i=0; i<this.textures.length; ++i) {
    this.shader.uniforms.textures[i] = this.textures[i].bind(i)
  }
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
  this.vao.draw(this.gl.TRIANGLES, 6, this.labelOffset[d])
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
  var str = number.toFixed(3)
  if(+str === number) {
    return number + ''
  }
  return str
}

//Packs all of the text objects into a texture, returns 
function createTextSprites(gl, extents, spacing, font, size, padding, labels) {

  //Create scratch canvas object
  var canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 1024

  //Get 2D context
  var context = canvas.getContext("2d")

  //Initialize canvas
  context.font = size + "px " + font
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
    tex.generateMipmap()
    textures.push(tex)
  }

  //Use binpack to stuff text item in buffer, continue looping
  function addItem(t, text) {
    var dims = context.measureText(text)
    var w = dims.width
    var h = size
    var location = bin.pack({ width: w + 2*padding, 
                              height: h + 2*padding })
    if(!location) {
      endTexture()
      beginTexture()
      location = bin.pack({ width: w + 2*padding, 
                            height: h + 2*padding })
    }

    //Render the text into the canvas
    context.fillText(text, location.x+padding+w/2, location.y+h)

    //Calculate vertex data
    var textureId = textures.length
    var coord = [ (location.x + padding)/canvas.width, (location.y + padding)/canvas.height ]
    var shape = [ w/canvas.width, h/canvas.height ]
    var aspect_2 = 0.5 * w / h

    //Append vertices
    data.push(
      t, textureId, coord[0],          coord[1]+shape[1], -aspect_2, -0.5,
      t, textureId, coord[0]+shape[0], coord[1]+shape[1],  aspect_2, -0.5,
      t, textureId, coord[0],          coord[1],          -aspect_2,  0.5,
      t, textureId, coord[0]+shape[0], coord[1],           aspect_2,  0.5,
      t, textureId, coord[0],          coord[1],          -aspect_2,  0.5,
      t, textureId, coord[0]+shape[0], coord[1]+shape[1],  aspect_2, -0.5)
  }

  //Generate sprites for all 3 axes, store data in texture atlases
  beginTexture()
  var axesStart = []
  var axesCount = []
  var labelOffset = []
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
  shader.attributes.t.location = 0
  shader.attributes.textureId.location = 1
  shader.attributes.texCoord.location = 2
  shader.attributes.screenOffset.location = 3

  //Store all the entries in the texture map
  return new TextSprites(gl, shader, buffer, vao, textures, axesStart, axesCount, labelOffset, 0.5 * Math.max(spacing[0], spacing[1], spacing[2]))
}