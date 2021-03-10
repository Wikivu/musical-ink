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

// Only used for rendering, but useful helpers
float softmax(float a, float b, float k) {
	return log(exp(k*a)+exp(k*b))/k;    
}

float softmin(float a, float b, float k) {
	return -log(exp(-k*a)+exp(-k*b))/k;    
}

vec4 softmax(vec4 a, vec4 b, float k) {
	return log(exp(k*a)+exp(k*b))/k;    
}

vec4 softmin(vec4 a, vec4 b, float k) {
	return -log(exp(-k*a)+exp(-k*b))/k;    
}

float softclamp(float a, float b, float x, float k) {
	return (softmin(b,softmax(a,x,k),k) + softmax(a,softmin(b,x,k),k)) / 2.0;    
}

vec4 softclamp(vec4 a, vec4 b, vec4 x, float k) {
	return (softmin(b,softmax(a,x,k),k) + softmax(a,softmin(b,x,k),k)) / 2.0;    
}

vec4 softclamp(float a, float b, vec4 x, float k) {
	return (softmin(vec4(b),softmax(vec4(a),x,k),k) + softmax(vec4(a),softmin(vec4(b),x,k),k)) / 2.0;    
}




// GGX from Noby's Goo shader https://www.shadertoy.com/view/lllBDM

// MIT License: https://opensource.org/licenses/MIT
float G1V(float dnv, float k){
    return 1.0/(dnv*(1.0-k)+k);
}

float ggx(vec3 n, vec3 v, vec3 l, float rough, float f0){
    float alpha = rough*rough;
    vec3 h = normalize(v+l);
    float dnl = clamp(dot(n,l), 0.0, 1.0);
    float dnv = clamp(dot(n,v), 0.0, 1.0);
    float dnh = clamp(dot(n,h), 0.0, 1.0);
    float dlh = clamp(dot(l,h), 0.0, 1.0);
    float f, d, vis;
    float asqr = alpha*alpha;
    const float pi = 3.14159;
    float den = dnh*dnh*(asqr-1.0)+1.0;
    d = asqr/(pi * den * den);
    dlh = pow(1.0-dlh, 5.0);
    f = f0 + (1.0-f0)*dlh;
    float k = alpha/1.0;
    vis = G1V(dnl, k)*G1V(dnv, k);
    float spec = dnl * d * f * vis;
    return spec;
}
// End Noby's GGX


// Modified from Shane's Bumped Sinusoidal Warp shadertoy here:
// https://www.shadertoy.com/view/4l2XWK
vec3 light(vec2 uv, float BUMP, float SRC_DIST, vec2 dxy, float iTime, inout vec3 avd) {
    vec3 sp = vec3(uv-0.5, 0);
    vec3 light = vec3(cos(iTime/2.0)*0.5, sin(iTime/2.0)*0.5, -SRC_DIST);
    vec3 ld = light - sp;
    float lDist = max(length(ld), 0.001);
    ld /= lDist;
    avd = reflect(normalize(vec3(BUMP*dxy, -1.0)), vec3(0,1,0));
    return ld;
}
// End Shane's bumpmapping section


#define BUMP 3200.0

#define D(d) -veLen(texture2D(density, fract(uv+(d+0.0))).xyz)

vec2 diff(vec2 uv, float mip) {
    vec2 texel = texelSize;//1.0/iResolution.xy;
    vec4 t = float(pow(2.0,mip))*vec4(texel, -texel.y, 0);

    float d =    D( t.ww); float d_n =  D( t.wy); float d_e =  D( t.xw);
    float d_s =  D( t.wz); float d_w =  D(-t.xw); float d_nw = D(-t.xz);
    float d_sw = D(-t.xy); float d_ne = D( t.xy); float d_se = D( t.xz);
    
    return vec2(
        0.5 * (d_e - d_w) + 0.25 * (d_ne - d_nw + d_se - d_sw),
        0.5 * (d_n - d_s) + 0.25 * (d_ne + d_nw - d_se - d_sw)
    );
}

vec4 contrast(vec4 col, float x) {
	return x * (col - 0.5) + 0.5;
}
/*
void main( ){
  float pixelSize = 0.5;
  vec2 coords2 = floor(coords / texelSize / pixelSize) * texelSize * pixelSize;
    vec2 uv = coords.xy;// *texelSize;

    vec2 dxy = vec2(0);
    float occ, mip = 0.0;
    float d   = D();
    
    // blur the gradient to reduce appearance of artifacts,
    // and do cheap occlusion with mipmaps
    #define STEPS 1.0
    #define ODIST 2.0
    for(float mip = 1.0; mip <= STEPS; mip += 1.0) {	 
        dxy += (1.0/pow(2.0,mip)) * diff(uv, mip-1.0);	
    	occ += softclamp(-ODIST, ODIST, d - D(),1.0)/(pow(1.5,mip));
    }
    dxy /= float(STEPS);
    dxy.y*=-1.0;
    
    // I think this looks nicer than using smoothstep
    occ = pow(max(0.0,softclamp(0.2,0.8,100.0*occ + 0.5,1.0)),0.5);
  float iTime=193.0;
    vec3 avd;
    vec3 ld = light(uv, BUMP, 0.5, dxy, iTime, avd);
    
    float spec = ggx(avd, vec3(0,1,0), ld, 0.1, 0.1);
    
    #define LOG_SPEC 1000.0
    spec = (log(LOG_SPEC+1.0)/LOG_SPEC)*log(1.0+LOG_SPEC*spec);    
    
    
    vec3 ccol=texture2D(density, coords2).xyz;
    vec3 ccc=rgb2hsv(texture2D(density, coords2).xyz);
    ccc.z=min(max(ccc.z-0.1,0.0)/0.9,1.0);
    ccc.y=min(min(ccc.z,ccc.y*10.0),1.0);
    //ccc=vec3(0.0,0.0,0.5);
		vec4 diffuse = vec4(hsv2rgb(ccc),1.0);//vec4(ccol/1.0,1.0);//vec4(ccol.xyz/max(max(ccol.x,max(ccol.y,ccol.z)),0.5),1.0);//softclamp(0.0,1.0,6.0*vec4(texture(iChannel0,uv).xy,0,0)+0.5,2.0);    
 
    
    
    vec4 glFragColorr = (diffuse + 4.0*mix(vec4(spec),1.5*diffuse*spec,0.3));
    gl_FragColor = mix(1.0,occ,0.7) * (softclamp(0.0,1.0,contrast(glFragColorr,4.5),3.0));
    
    //fragColor = vec4(occ);
    //fragColor = vec4(spec);
    //fragColor = diffuse;
    //fragColor = vec4(diffuse+(occ-0.5));
}
*/