attribute vec3 position;

uniform mat4 model, view, projection;
uniform vec3 offset, axis, alignDir, alignPos;
uniform float scale, angle, pixelScale;
uniform vec2 resolution;

vec3 project(vec3 p) {
  vec4 pp = projection * view * model * vec4(p, 1.0);
  return pp.xyz / max(pp.w, 0.0001);
}

const float PI = 3.141592;
const float TWO_PI = 2.0 * PI;
const float HALF_PI = 0.5 * PI;
const float ONE_AND_HALF_PI = 1.5 * PI;

float positive_angle(float a) {
  if (a < 0.0) return a + TWO_PI;
  return a;
}

float look_upwards(float a) {
  float b = positive_angle(a);
  if ((b > HALF_PI) && (b < ONE_AND_HALF_PI)) return b - PI;
  return b;
}

float look_horizontal_or_vertical(float a, float ratio) {
  // ratio controls the ratio between being horizontal to (vertical + horizontal)
  // if ratio is set to 0.5 then it is 50%, 50%.
  // when using a higher ratio e.g. 0.75 the result would
  // likely be more horizontal than vertical.

  float b = positive_angle(a);
       if (b < (      ratio) * HALF_PI) return 0.0;
  else if (b < (2.0 - ratio) * HALF_PI) return -HALF_PI;
  else if (b < (2.0 + ratio) * HALF_PI) return 0.0;
  else if (b < (4.0 - ratio) * HALF_PI) return HALF_PI;
  return 0.0;
}

float roundTo(float a, float b) {
  return float(b * floor((a + 0.5 * b) / b));
}

float look_round_n_directions(float a, int n) {
  float b = positive_angle(a);
  float div = TWO_PI / float(n);
  float c = roundTo(b, div);
  return look_upwards(c);
}

int alignOpt = 1; // from {-1, 0, 1, 2, 3, ..., n}

float applyAlignOption(float rawAngle) {

  if (alignOpt == -1) {
    // useful for backward compatibility, all texts remains horizontal
    return 0.0;
  } else if (alignOpt == 0) {
    // use the raw angle as calculated by atan
    return rawAngle;
  } else if (alignOpt == 1) {
    // option 1: use free angle, but flip when reversed
    return look_upwards(rawAngle);
  } else if (alignOpt == 2) {
    // option 2: horizontal or vertical
    return look_horizontal_or_vertical(rawAngle, 0.8); // 0.8 here means: increase the chance of getting horizontal labels
  }

  // option 3-n: round to n directions
  return look_round_n_directions(rawAngle, alignOpt);
}

void main() {

  //Compute world offset
  float axisDistance = position.z;
  vec3 dataPosition = axisDistance * axis + offset;

  float clipAngle = 0.0;

  if ((alignDir.x != 0.0) ||
      (alignDir.y != 0.0) ||
      (alignDir.z != 0.0)) {

    vec3 REF = alignPos + offset;

    vec3 startPoint = project(REF);
    vec3 endPoint   = project(REF + alignDir);

    clipAngle = applyAlignOption(
      atan(
        (endPoint.y - startPoint.y),
        (endPoint.x - startPoint.x)
      )
    );
  }


  //Compute plane offset
  vec2 planeCoord = position.xy * pixelScale;

  float totalAngle = angle + clipAngle;

  mat2 planeXform = scale * mat2(
     cos(totalAngle), sin(totalAngle),
    -sin(totalAngle), cos(totalAngle)
  );

  vec2 viewOffset = 2.0 * planeXform * planeCoord / resolution;

  //Compute clip position
  vec3 clipPosition = project(dataPosition);

  //Apply text offset in clip coordinates
  clipPosition += vec3(viewOffset, 0.0);

  //Done
  gl_Position = vec4(clipPosition, 1.0);
}