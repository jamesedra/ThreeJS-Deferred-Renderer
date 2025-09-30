in vec3 instanceOffset;
in float instanceRotation;
in float instanceScale;
in float instanceSeed;

uniform float uTime;
uniform vec3 uWindDir;
uniform float uWindAmp;
uniform float uHitAmp;

uniform vec3 orbPosition;
uniform float orbRadius;

out vec3 FragPos;
out vec3 Normal;
out vec2 TexCoords;
out mat3 TBNMatrix;

in vec4 tangent; // from MikkTSpaceTangents

const float TAU = 6.28318530718;

mat3 rotY(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(c,0.0,-s,  0.0,1.0,0.0,  s,0.0,c);
}

void main() {
    vec3 p = position;
    vec3 n = normal;

    // local height for bends
    float h = clamp(p.y, 0.0, 1e6);

    // wind
    vec2 wind = normalize(uWindDir.xz);
    float phase = uTime * 1.7 + instanceSeed * TAU + dot(wind, vec2(instanceOffset.x, instanceOffset.z)) * 0.25;

    float wave = sin(phase);
    float bend = uWindAmp * wave * (h * h);
    p.x += bend;
    n = normalize(n + vec3(-2.0 * uWindAmp * wave * h, 0.0, 0.0));

    // per instance transforms
    p *= instanceScale;
    n = normalize(n); // before rotation
    mat3 R = rotY(instanceRotation);
    p = R * p + instanceOffset;
    n = normalize(R * n);

    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec3 Nw = normalize(mat3(modelMatrix) * n);

    // orb impact
    vec3 rootW = (modelMatrix * vec4(instanceOffset, 1.0)).xyz;
    vec3 toOrb = orbPosition - rootW;
    float dist = length(toOrb);
    float falloff = 1.0 - smoothstep(0.0, 8.0, dist);

    vec2 dir2 = (dist > 1e-4) ? normalize(toOrb.xz) : vec2(0.0);
    vec3 bendDirW = vec3(-dir2.x, 0.0, -dir2.y); // bend away from orb

    float impact = uHitAmp * falloff * (h * h);
    wp.xyz += bendDirW * impact;

    // tilt world normal along bend direction
    Nw = normalize(Nw + bendDirW * (uHitAmp * falloff * h));

    FragPos = wp.xyz;
    Normal  = Nw;
    TexCoords = uv;

    // TBN world matrix 
    vec3 Tobj = (rotY(instanceRotation) * tangent.xyz);
    vec3 Tw = normalize(mat3(modelMatrix) * Tobj);
    Tw = normalize(Tw - dot(Tw, Nw) * Nw);
    vec3 Bw = normalize(cross(Nw, Tw) * tangent.w);
    TBNMatrix = mat3(Tw, Bw, Nw);

    gl_Position = projectionMatrix * viewMatrix * wp;
}