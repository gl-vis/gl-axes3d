precision mediump float;

uniform vec4 colors[3];

varying vec3 colorChannel;

void main() {
  /*
  gl_FragColor = colorChannel.x * colors[0] + 
                 colorChannel.y * colors[1] +
                 colorChannel.z * colors[2];
  */

  gl_FragColor = vec4(1, 0, 0, 1);
}