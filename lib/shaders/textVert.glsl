attribute vec3 position;

uniform mat4 model, view, projection;
uniform vec3 offset, axis;
uniform float textScale;

void main() {
  float t = position.z;
  vec4 worldPosition = model * vec4(t * axis + offset, 1);
  vec4 viewPosition = view * worldPosition + textScale * vec4(position.xy, 0, 0);
  vec4 clipPosition = projection * viewPosition;
  clipPosition /= clipPosition.w;
  gl_Position = clipPosition;
}