precision highp float;
precision mediump sampler2D;

varying vec2 coords;
uniform sampler2D density;
uniform vec2 texelSize; // 1 / grid scale
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
float veLen(vec3 inp){
  return inp.x+inp.y+inp.z;
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main() {
  float pixelSize = 0.01;
  float g=texelSize.y*40.0;
  vec2 coords2 = floor(coords / texelSize / pixelSize) * texelSize * pixelSize;
  vec2 coordsTL =
      floor(coords / texelSize / pixelSize) * texelSize * pixelSize +
      vec2(-texelSize.x, texelSize.y);
  vec2 coordsTR =
      floor(coords / texelSize / pixelSize) * texelSize * pixelSize +
      vec2(texelSize.x, texelSize.y);
  float w = texture2D(density, coords2).a;
  vec3 hsvT = rgb2hsv(texture2D(density, coords2).rgb);
  vec3 hsvTE = rgb2hsv(texture2D(density, coords2).rgb);
  vec3 cTL = vec3(vec2(-1.0, -1.0)*g,
                  veLen(texture2D(density, coordsTL).rgb));
  vec3 cTR = vec3(vec2(1.0, -1.0)*g,
                  veLen(texture2D(density, coordsTR).rgb));
  vec3 c = vec3(0.0, 0.0, veLen(texture2D(density, coords2).rgb));
  vec3 norm = normalize(cross(cTL - c, cTR - c));
  hsvT.y = 0.0;
  hsvTE.y = 1.0;
  hsvT.z = -dot(norm, normalize(vec3(1.0, 1.0, -1.0))) / 2.0 + 0.5;
  hsvTE.z = hsvT.z * (hsvTE.z > 0.1 ? 1.0 : hsvTE.z / 0.1);
  float posterCount = 100.0;
  gl_FragColor = vec4(hsv2rgb(hsvTE) + vec3(1.0) * pow(hsvTE.z, 4.0) / 2.0, w);
}