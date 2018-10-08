attribute vec3 position;

uniform mat4 model, view, projection;
uniform vec3 offset, axis, alignment;
uniform float scale, angle, pixelScale;
uniform vec2 resolution;

vec3 project(vec3 p) {
  vec4 pp = projection * view * model * vec4(p, 1.0);
  return pp.xyz / max(pp.w, 0.0001);
}

float PI = 3.141592;

void main() {

  //Compute world offset
  float axisDistance = position.z;
  vec3 dataPosition = axisDistance * axis + offset;

  float axisAngle = 0.0;

  if ((alignment.x != 0.0) ||
      (alignment.y != 0.0) ||
      (alignment.z != 0.0)) {

    vec3 endPoint   = project(-alignment);
    vec3 startPoint = project( alignment);

    axisAngle = atan(
      (endPoint.y - startPoint.y),
      (endPoint.x - startPoint.x)
    );

    // force positive angles
    if (axisAngle < 0.0) axisAngle += 2.0 * PI;

    // logic for horizontal or vertical align
    if (axisAngle < 0.33 * PI) axisAngle = 0.0;
    else if (axisAngle < 0.66 * PI) axisAngle = 0.5 * PI;
    else if (axisAngle < 1.33 * PI) axisAngle = 0.0;
    else if (axisAngle < 1.66 * PI) axisAngle = 0.5 * PI;
    else axisAngle = 0.0;
  }

  //Compute plane offset
  vec2 planeCoord = position.xy * pixelScale;

  float totalAngle = angle + axisAngle;

  mat2 planeXform = scale * mat2(cos(totalAngle), sin(totalAngle),
                                -sin(totalAngle), cos(totalAngle));
  vec2 viewOffset = 2.0 * planeXform * planeCoord / resolution;

  //Compute clip position
  vec3 clipPosition = project(dataPosition);

  //Apply text offset in clip coordinates
  clipPosition += vec3(viewOffset, 0.0);

  //Done
  gl_Position = vec4(clipPosition, 1.0);
}