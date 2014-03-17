attribute float t;
attribute float textureId;
attribute vec2 texCoord;
attribute vec2 screenOffset;

uniform mat4 model, view, projection;
uniform vec3 offset, axis;

varying float fragTexId;
varying vec2 fragTexCoord;

void main() {
  vec4 worldPosition = model * vec4(t * axis + offset, 1);
  vec4 viewPosition = view * worldPosition;
  gl_Position = projection * (viewPosition + 0.25 * vec4(screenOffset, 0, 1));
  fragTexId = textureId;
  fragTexCoord = texCoord;
}