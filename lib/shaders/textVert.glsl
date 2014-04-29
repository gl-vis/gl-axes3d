attribute float t;
attribute float textureId;
attribute vec2 texCoord;
attribute vec2 screenOffset;

uniform mat4 model, view, projection;
uniform vec3 offset, axis;
uniform float textScale;

varying float fragTexId;
varying vec2 fragTexCoord;

void main() {
  vec4 worldPosition = model * vec4(t * axis + offset, 1);
  vec4 viewPosition = view * worldPosition;
  vec4 clipPosition = projection * viewPosition;
  clipPosition /= clipPosition.w;
  clipPosition += textScale * vec4(screenOffset, 0, 0);
  gl_Position = clipPosition;
  fragTexId = textureId;
  fragTexCoord = texCoord;
}