precision highp float;
precision mediump sampler2D;

varying vec2 coords;
uniform sampler2D density;
uniform vec2 texelSize;      // 1 / grid scale
vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main () {
float pixelSize=2.0;
vec2 coords2=floor(coords/texelSize/pixelSize)*texelSize*pixelSize;
float w=texture2D(density, coords2).a;
vec3 hsvT=rgb2hsv(texture2D(density, coords2).rgb);
hsvT.y=hsvT.y/2.0+0.5;
float posterCount=2.0;
  gl_FragColor = vec4(floor(hsv2rgb(hsvT)*posterCount)/posterCount,w);
}
