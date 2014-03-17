attribute vec4 position;
attribute vec3 normal;

uniform mat4 model, view, projection;
uniform vec3 extents[2];
uniform vec3 axis;

varying vec3 dimension;
varying vec3 coordinate;

void main() {
  if(dot(axis, normal) < 0.0) {
    gl_Position = vec4(10,10,10,0);
  } else {
    vec3 worldPosition = extents[0] + 0.5 * (extents[1] - extents[0]) * (position.xyz+1.);
    coordinate = worldPosition;
    if(position.w == 0.) {
      dimension = vec3(1, 0, 0);
    } else if(position.w == 1.) {
      dimension = vec3(0, 1, 0);
    } else if(position.w == 2.) {
      dimension = vec3(0, 0, 1);
    }
    gl_Position = projection * view * model * vec4(worldPosition, 1);
  }
}