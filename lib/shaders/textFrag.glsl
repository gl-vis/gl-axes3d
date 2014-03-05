precision highp float;

uniform sampler2D textures[8];

varying float fragTexId;
varying vec2 fragTexCoord;

void main() {
  if(fragTexId<1.0) {
    gl_FragColor = texture2D(textures[0], fragTexCoord);
  } else if(fragTexId<2.0) {
    gl_FragColor = texture2D(textures[1], fragTexCoord);
  } else if(fragTexId<3.0) {
    gl_FragColor = texture2D(textures[2], fragTexCoord);
  } else if(fragTexId<4.0) {
    gl_FragColor = texture2D(textures[3], fragTexCoord);
  } else if(fragTexId<5.0) {
    gl_FragColor = texture2D(textures[4], fragTexCoord);
  } else if(fragTexId<6.0) {
    gl_FragColor = texture2D(textures[5], fragTexCoord);
  } else if(fragTexId<7.0) {
    gl_FragColor = texture2D(textures[6], fragTexCoord);
  } else if(fragTexId<8.0) {
    gl_FragColor = texture2D(textures[7], fragTexCoord);
  } else {
    gl_FragColor = vec4(0,0,0,0);
  }
}