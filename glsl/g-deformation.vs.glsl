// NOTE: alternative of the armadillo shader for deformation
out vec3 FragPos;
out vec3 Normal;
out vec2 TexCoords;
out mat3 TBNMatrix;

in vec4 tangent; // from MikkTSpaceTangents

uniform vec3 orbPosition;
uniform float orbRadius;

void main() {
    // deformation FragPos
    FragPos = vec3(modelMatrix * vec4(position, 1.0));
    Normal = normalize(normalMatrix * normal);

    vec3 offsetDir = normalize(orbPosition - FragPos);
    float stretch = 5.0;
    vec3 offsetPos = FragPos + (offsetDir * stretch);

    offsetPos = length(offsetPos) < length(orbPosition - FragPos) ? offsetPos : orbPosition;

    float deformThreshold = 40.0;

    float alpha = min(distance(FragPos, orbPosition)/max(min(orbRadius, 45.0) - deformThreshold, 1e-6), 1.0);

    vec3 offset = mix(offsetPos, FragPos, alpha);
    FragPos = offset;
    
    TexCoords = uv;

    // TBN world matrix
    vec3 Nw = normalize(mat3(modelMatrix) * normal);
    vec3 Tw = normalize(mat3(modelMatrix) * tangent.xyz);
    Tw = normalize(Tw - dot(Tw, Nw) * Nw);
    vec3 Bw = normalize(cross(Nw, Tw) * tangent.w);
	TBNMatrix = (mat3(Tw, Bw, Nw));

    gl_Position = projectionMatrix * viewMatrix * vec4(FragPos, 1.0);
}