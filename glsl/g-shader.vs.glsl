out vec3 FragPos;
out vec3 Normal;
out vec2 TexCoords;
out mat3 TBNMatrix;

in vec4 tangent; // from MikkTSpaceTangents

void main() {
    FragPos = vec3(modelMatrix * vec4(position, 1.0));
    Normal = normalMatrix * normal;
    TexCoords = uv;

    // TBN world matrix
    vec3 Nw = normalize(mat3(modelMatrix) * normal);
    vec3 Tw = normalize(mat3(modelMatrix) * tangent.xyz);
    Tw = normalize(Tw - dot(Tw, Nw) * Nw);
    vec3 Bw = normalize(cross(Nw, Tw) * tangent.w);
    TBNMatrix = mat3(Tw, Bw, Nw);
    
    gl_Position = projectionMatrix * viewMatrix * vec4(FragPos, 1.0);
}