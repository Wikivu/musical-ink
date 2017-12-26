precision highp float;
precision mediump sampler2D;

varying vec2 coords;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;

void main () {
    vec2 p = coords - point;
    vec2 p2 = coords + point * vec2(1, -1);
    p2.x -= 1.0;
    p.x *= aspectRatio;
    p2.x *= aspectRatio;
    vec3 col = color;
    col.x *= sign(col.z);
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 splat2 = exp(-dot(p2, p2) / radius) * col;
    vec3 base = texture2D(uTarget, coords).xyz;
    gl_FragColor = vec4(base + splat + splat2, 1.0);
}
