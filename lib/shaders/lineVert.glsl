attribute vec3 position;

uniform mat4 model, view, projection;
uniform vec3 offset, majorAxis, minorAxis;
uniform float centerWeight;

void main() {
  vec3 vPosition = position.x * majorAxis + position.y * minorAxis + offset + centerWeight * position;
  gl_Position = projection * view * model * vec4(vPosition, 1.0);
}