precision highp float;

#define PI 3.1415926535897932384626433832795

uniform vec3 extents[2];
uniform vec3 tickSpacing;
uniform float tickWidth;

varying vec3 dimension;
varying vec3 coordinate;

void main() {
  vec3 center = 0.5 * (extents[0] + extents[1]);
  vec3 freq = 2.0 * PI * (coordinate - center) / tickSpacing;
  vec3 weight = cos(freq);
  vec3 cutoff = cos(PI * tickWidth / tickSpacing);
  vec3 lines = 2./(1. + exp(20.0*(cutoff - weight)));
  lines -= dimension * lines;
  float intensity = lines.x + lines.y + lines.z;
  gl_FragColor = vec4(0.25,0.25,0.25,intensity+0.3);
}