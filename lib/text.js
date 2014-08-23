"use strict"

module.exports = createTextSprites

var createBuffer  = require('gl-buffer')
var createVAO     = require('gl-vao')
var vectorizeText = require('vectorize-text')
var glslify       = require('glslify')

var createShader = glslify({
  vert: './shaders/textVert.glsl',
  frag: './shaders/textFrag.glsl'
})

//Vertex buffer format for text is:
//
/// [x,y,z] = Spatial coordinate
//

var VERTEX_SIZE = 3
var VERTEX_STRIDE = VERTEX_SIZE * 4

function TextSprites(
  gl, 
  shader, 
  buffer, 
  vao, 
  tickOffset, 
  tickCount, 
  labelOffset, 
  labelCount) {
  this.gl           = gl
  this.shader       = shader
  this.buffer       = buffer
  this.vao          = vao
  this.tickOffset   = tickOffset
  this.tickCount    = tickCount
  this.labelOffset  = labelOffset
  this.labelCount   = labelCount
}

var proto = TextSprites.prototype

//Bind textures for rendering
proto.bind = function(model, view, projection) {
  this.vao.bind()
  this.shader.bind()
  this.shader.uniforms.model = model
  this.shader.uniforms.view = view
  this.shader.uniforms.projection = projection
  this.shader.uniforms.resolution = [this.gl.drawingBufferWidth, this.gl.drawingBufferHeight]
}


//Draws the tick marks for an axis
proto.drawTicks = function(d, scale, angle, offset, color) {
  var v = [0,0,0]
  v[d] = 1
  this.shader.uniforms.axis = v
  this.shader.uniforms.color = color
  this.shader.uniforms.angle = angle
  this.shader.uniforms.scale = scale
  this.shader.uniforms.offset = offset
  this.vao.draw(this.gl.TRIANGLES, this.tickCount[d], this.tickOffset[d])
}

//Draws the text label for an axis
proto.drawLabel = function(d, scale, angle, offset, color) {
  this.shader.uniforms.axis = [0,0,0]
  this.shader.uniforms.color = color
  this.shader.uniforms.angle = angle
  this.shader.uniforms.scale = scale
  this.shader.uniforms.offset = offset
  this.vao.draw(this.gl.TRIANGLES, this.labelCount[d], this.labelOffset[d])
}

//Releases all resources attached to this object
proto.dispose = function() {
  this.shader.dispose()
  this.vao.dispose()
  this.buffer.dispose()
}

//Packs all of the text objects into a texture, returns 
function createTextSprites(
    gl, 
    bounds, 
    labels,
    labelFont,
    ticks,
    tickFont) {

  var data = []

  function addItem(t, text, font) {
    var mesh = vectorizeText(text, {
      triangles: true,
      font: font,
      textAlign: 'center',
      textBaseline: 'middle'
    })
    var positions = mesh.positions
    var cells = mesh.cells
    var lo = [ Infinity, Infinity]
    var hi = [-Infinity,-Infinity]
    for(var i=0, nc=cells.length; i<nc; ++i) {
      var c = cells[i]
      for(var j=2; j>=0; --j) {
        var p = positions[c[j]]
        data.push(p[0], -p[1], t)
      }
    }
  }

  //Generate sprites for all 3 axes, store data in texture atlases
  var tickOffset  = [0,0,0]
  var tickCount   = [0,0,0]
  var labelOffset = [0,0,0]
  var labelCount  = [0,0,0]
  for(var d=0; d<3; ++d) {

    //Generate label
    labelOffset[d] = (data.length/VERTEX_SIZE)|0
    addItem(0.5*(bounds[0][d]+bounds[1][d]), labels[d], labelFont)
    labelCount[d] = ((data.length/VERTEX_SIZE)|0) - labelOffset[d]

    //Generate sprites for tick marks
    tickOffset[d] = (data.length/VERTEX_SIZE)|0
    for(var i=0; i<ticks[d].length; ++i) {
      if(!ticks[d][i].text) {
        continue
      }
      addItem(ticks[d][i].x, ticks[d][i].text, tickFont)
    }
    tickCount[d] = ((data.length/VERTEX_SIZE)|0) - tickOffset[d]
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

  //Store all the entries in the texture map
  return new TextSprites(
    gl, 
    shader, 
    buffer, 
    vao, 
    tickOffset, 
    tickCount, 
    labelOffset, 
    labelCount)
}