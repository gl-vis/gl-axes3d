precision highp float;

uniform sampler2D textures[8];

varying float fragTexId;
varying vec2 fragTexCoord;

vec4 intensity() {
  if(fragTexId<0.5) {
    return texture2D(textures[0], fragTexCoord);
  } else if(fragTexId<1.5) {
    return texture2D(textures[1], fragTexCoord);
  } else if(fragTexId<2.5) {
    return texture2D(textures[2], fragTexCoord);
  } else if(fragTexId<3.5) {
    return texture2D(textures[3], fragTexCoord);
  } else if(fragTexId<4.5) {
    return texture2D(textures[4], fragTexCoord);
  } else if(fragTexId<5.5) {
    return texture2D(textures[5], fragTexCoord);
  } else if(fragTexId<6.5) {
    return texture2D(textures[6], fragTexCoord);
  } else if(fragTexId<7.5) {
    return texture2D(textures[7], fragTexCoord);
  } else {
    return vec4(0,0,0,0);
  }
}

void main() {
  gl_FragColor = intensity();
}