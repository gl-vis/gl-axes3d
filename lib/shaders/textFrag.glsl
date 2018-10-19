precision mediump float;
uniform vec4 color;
varying float debug;
void main() {

       if (debug == 1.0) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  else if (debug == 2.0) gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
  else if (debug == 3.0) gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
  else if (debug == 4.0) gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
  else gl_FragColor = color;
}