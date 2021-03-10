precision highp float;
precision mediump sampler2D;

varying vec2 coords;
uniform sampler2D velocity;
uniform sampler2D density;
uniform float aspectRatio;
uniform vec3 inkColor;
uniform vec3 inkVelocity;
uniform vec2 point;
uniform float radius;
float veLen(vec3 inp){
  return inp.x+inp.y+inp.z;
}
void main() {
  vec2 p = coords - point;
  vec2 p2 = coords + point * vec2(1, -1);
  p2.x -= 1.0;
  p.x *= aspectRatio;
  p2.x *= aspectRatio;
  float radiusW = radius * aspectRatio * aspectRatio;
  float splat = length(p);

  splat = pow(max(radius*radius-pow(length(p), 2.0),0.0),0.5)/radius;//exp(-pow(length(p), 2.0)/radius/radius)/radius/50.0;

  float interp=min(splat, 1.0);
  vec3 baseD = texture2D(density, coords).xyz;
  vec3 baseV = texture2D(velocity, coords).xyz;
  
  vec3 newBaseD=baseD+interp * inkColor;
  
  float originalMass=veLen(baseD);
  float newMass=veLen(newBaseD)+0.00000001;
  float addedMass=newMass-originalMass;
  vec3 newV=(baseV*originalMass+addedMass*inkVelocity)/newMass;
  vec3 newD=(baseD*originalMass+addedMass*inkColor)/newMass;
  
  gl_FragColor = vec4(newV, 1.0);
}
