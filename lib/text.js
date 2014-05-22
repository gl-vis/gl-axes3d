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
proto.drawAxis = function(d, offset, color) {
  this.shader.uniforms.offset = offset
  var v = [0,0,0]
  v[d] = 1
  this.shader.uniforms.axis = v
  this.shader.uniforms.color = color
  this.vao.draw(this.gl.TRIANGLES, this.axesCount[d], this.axesStart[d])
}

//Draws the text label for an axis
proto.drawLabel = function(d, offset, color) {
  this.shader.uniforms.offset = offset
  this.shader.uniforms.axis = [0,0,0]
  this.shader.uniforms.color = color
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
function createTextSprites(gl, bounds, ticks, font, labels, defaultTextScale) {

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
    var lo = [Infinity,Infinity]
    var hi = [-Infinity,-Infinity]
    for(var i=0, nc=cells.length; i<nc; ++i) {
      var c = cells[i]
      for(var j=2; j>=0; --j) {
        var p = positions[c[j]]
        data.push(p[0], -p[1], t)
        for(var k=0; k<2; ++k) {
          lo[k] = Math.min(lo[k], p[k])
          hi[k] = Math.max(hi[k], p[k])
        }
      }
    }
    var delta = [0, 0]
    for(var k=0; k<2; ++k) {
      delta[k] = hi[k] - lo[k]
    }
    return delta
  }

  //Generate sprites for all 3 axes, store data in texture atlases
  var axesStart = []
  var axesCount = []
  var labelOffset = []
  var labelCount = []
  var textScale = Infinity
  for(var d=0; d<3; ++d) {

    //Generate sprites for tick marks
    axesStart.push((data.length/VERTEX_SIZE)|0)
    for(var i=0; i<ticks[d].length; ++i) {
      if(!ticks[d][i].text) {
        continue
      }
      var size = addItem(ticks[d][i].x, ticks[d][i].text)
      var delta = Infinity
      if(i > 0) {
        delta = Math.min(ticks[d][i].x - ticks[d][i-1].x, delta)
      } else if(i < ticks[d].length-1) {
        delta = Math.min(ticks[d][i+1].x - ticks[d][i].x, delta)
      }
      for(var j=0; j<2; ++j) {
        textScale = Math.min(textScale, 0.5 * delta / size[j])
      }
    }
    axesCount.push(((data.length/VERTEX_SIZE)|0) - axesStart[d])

    //Also generate sprite for axis label
    labelOffset.push((data.length/VERTEX_SIZE)|0)
    addItem(0.5*(bounds[0][d]+bounds[1][d]), labels[d])
    labelCount.push((data.length/VERTEX_SIZE - labelOffset[d])|0)
  }

  if(textScale === Infinity) {
    textScale = 1.0
  }
  if(defaultTextScale) {
    textScale = defaultTextScale
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
  return new TextSprites(gl, shader, buffer, vao, axesStart, axesCount, labelOffset, labelCount, textScale)
}