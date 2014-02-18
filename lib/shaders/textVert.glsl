attribute float t;
attribute float textureId;
attribute vec2 texCoord;
attribute vec2 spriteCoord;

uniform mat4 model, view, projection;
uniform vec3 offset, axis;

varying 
varying vec2 fragTexCoord;

void main() {
  vec4 worldPosition = model * vec4(t * axis + offset, 1);
  vec4 viewPosition = view * worldPosition;
  vec4 clipPosition = projection * view * worldPosition;

  fragTexCoord = texCoord;
  fragTexId = textureId;
  gl_Position = clipPosition;
}