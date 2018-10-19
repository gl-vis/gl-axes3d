attribute vec3 position;

uniform mat4 model, view, projection;
uniform vec3 offset, axis, alignDir, alignOpt;
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

int option = int(floor(alignOpt.x + 0.001));
float hv_ratio =       alignOpt.y;

float positive_angle(float a) {
  return (a < 0.0) ?
    a + TWO_PI :
    a;
}

float look_upwards(float a) {
  /*
  float b = positive_angle(a);
  return ((b > HALF_PI) && (b <= ONE_AND_HALF_PI)) ?
    b - PI :
    b;
  */
  return a;
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

float applyAlignOption(float rawAngle) {

  if (option == -1) {
    // useful for backward compatibility, all texts remains horizontal
    return 0.0;
  } else if (option == 0) {
    // use the raw angle as calculated by atan
    return rawAngle;
  } else if (option == 1) {
    // option 1: use free angle, but flip when reversed
    return look_upwards(rawAngle);
  } else if (option == 2) {
    // option 2: horizontal or vertical
    return look_horizontal_or_vertical(rawAngle, hv_ratio);
  }

  // option 3-n: round to n directions
  return look_round_n_directions(rawAngle, option);
}

bool enableAlign = (alignDir.x != 0.0) || (alignDir.y != 0.0) || (alignDir.z != 0.0);

float computeViewAngle(vec3 a, vec3 b) {
  vec3 A = project(a);
  vec3 B = project(b);

  return atan(
    (B.y - A.y) * resolution.y,
    (B.x - A.x) * resolution.x
  );
}

varying float debug;

void main() {
  
///////// we could compute this outside main //////////  
float axisAngle;
///////////////////////////////////////////////////////
  

  //Compute world offset
  float axisDistance = position.z;
  vec3 dataPosition = axisDistance * axis + offset;

  float clipAngle = angle; // i.e. user defined attributes for each tick
  
  if (enableAlign) {
    //clipAngle = applyAlignOption(computeViewAngle(dataPosition, alignDir));
    
    
    clipAngle = computeViewAngle(dataPosition, dataPosition + alignDir);
    axisAngle = computeViewAngle(dataPosition, dataPosition - axis);
    if (sin(axisAngle) < 0.0) axisAngle = -axisAngle;
    
    if (dot(vec2(cos(clipAngle), sin(clipAngle)), 
            vec2(cos(axisAngle), sin(axisAngle))) < 0.0) {
      //clipAngle = PI + clipAngle;
      
      debug = 1.0;
    } else debug = 0.0;
    
    clipAngle = applyAlignOption(clipAngle);

  }    

  //Compute plane offset
  vec2 planeCoord = position.xy * pixelScale;

  mat2 planeXform = scale * mat2(
     cos(clipAngle), sin(clipAngle),
    -sin(clipAngle), cos(clipAngle)
  );

  vec2 viewOffset = 2.0 * planeXform * planeCoord / resolution;

  //Compute clip position
  vec3 clipPosition = project(dataPosition);

  //Apply text offset in clip coordinates
  clipPosition += vec3(viewOffset, 0.0);

  //Done
  gl_Position = vec4(clipPosition, 1.0);
}