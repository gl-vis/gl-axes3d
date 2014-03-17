attribute vec3 position;

uniform mat4 model, view, projection;
uniform vec3 offset, majorAxis, minorAxis;

void main() {
  gl_Position = projection * view * model * vec4(position.x * majorAxis + position.y * minorAxis + offset, 1.0);
}