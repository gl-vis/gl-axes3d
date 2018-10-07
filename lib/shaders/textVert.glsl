attribute vec3 position;

uniform mat4 model, view, projection;
uniform vec3 offset, axis;
uniform float scale, angle, pixelScale;
uniform vec2 resolution;
uniform vec3 direction;

float PI = 3.141592;

void main() {

  //Compute world offset
  float axisDistance = position.z;
  vec3 dataPosition = axisDistance * axis + offset;
  vec4 worldPosition = model * vec4(dataPosition, 1);

  //Compute clip position
  vec4 viewPosition = view * worldPosition;
  vec4 clipPosition = projection * viewPosition;
  clipPosition /= clipPosition.w;

  float axisAngle = 0.0;
  
  if ((direction.x != 0.0) || 
      (direction.y != 0.0) ||
      (direction.z != 0.0)) {

    vec4 endPoint   = projection * view * model * vec4( direction, 1.0);
    vec4 startPoint = projection * view * model * vec4(-direction, 1.0);

    axisAngle = atan(
      (endPoint.y - startPoint.y),
      (endPoint.x - startPoint.x)
    );

    // force positive angles
    if (axisAngle < 0.0) axisAngle += 2.0 * PI;

    // logic for horizontal or vertical align
    if (axisAngle < 0.35 * PI) axisAngle = 0.0;
    else if (axisAngle < 0.65 * PI) axisAngle = 0.5 * PI;
    else if (axisAngle < 1.35 * PI) axisAngle = 0.0;
    else if (axisAngle < 1.65 * PI) axisAngle = 0.5 * PI;
    else axisAngle = 0.0;
  }

  //Compute plane offset
  vec2 planeCoord = position.xy * pixelScale;

  float totalAngle = angle + axisAngle;

  mat2 planeXform = scale * mat2(cos(totalAngle), sin(totalAngle),
                                -sin(totalAngle), cos(totalAngle));
  vec2 viewOffset = 2.0 * planeXform * planeCoord / resolution;

  //Apply text offset in clip coordinates
  clipPosition += vec4(viewOffset, 0, 0);

  //Done
  gl_Position = clipPosition;
}