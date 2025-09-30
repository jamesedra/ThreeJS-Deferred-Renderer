in vec3 FragPos;
in vec3 Normal;
in vec2 TexCoords;
in mat3 TBNMatrix;

uniform bool uUseAlbedoTex;
uniform bool uUseNormalTex;
uniform bool uUseRoughTex;
uniform bool uUseMetalTex;
uniform bool uUseAOTex;
uniform bool uUseDispTex;

uniform vec3 uAlbedo;
uniform float uRoughness;
uniform float uMetallic;
uniform float uAO;
uniform float uDisplacement;

uniform sampler2D uAlbedoTex;
uniform sampler2D uNormalTex;
uniform sampler2D uRoughTex;
uniform sampler2D uMetalTex;
uniform sampler2D uAOTex;
uniform sampler2D uDispTex;

layout(location = 0) out vec4 gPosition;
layout(location = 1) out vec4 gNormal;
layout(location = 2) out vec4 gAlbedo;
layout(location = 3) out vec4 gORDM;
layout(location = 4) out vec4 gEmission;

void main() {
    vec3 albedo = uAlbedo;
    if (uUseAlbedoTex) albedo = texture(uAlbedoTex, TexCoords).rgb;

    float ao = uAO;
    if (uUseAOTex) ao = texture(uAOTex, TexCoords).r;
    ao = clamp(ao, 0.0, 1.0);

    vec3 n = normalize(Normal);
    if (uUseNormalTex) {
        vec3 nm = texture(uNormalTex, TexCoords).rgb;
        // nm.g = 1.0 - nm.g;
        vec3 tsNormal = nm * 2.0 - 1.0;
        n = normalize(TBNMatrix * tsNormal);
    }

    float roughness = uRoughness;
    if (uUseRoughTex) roughness = texture(uRoughTex, TexCoords).r;
    roughness = clamp(roughness, 0.0, 1.0);

    float metallic = uMetallic;
    if (uUseMetalTex) metallic = texture(uMetalTex, TexCoords).r;
    metallic = clamp(metallic, 0.0, 1.0);

    float disp = uDisplacement;
    if (uUseDispTex) {
        float s = texture(uDispTex, TexCoords).r;
        disp = s * uDisplacement;
    }

    gPosition = vec4(FragPos, 1.0);
    gNormal = vec4(normalize(n), 1.0);
    gAlbedo = vec4(albedo, 1.0);
    gORDM = vec4(ao, roughness, disp, metallic);
    vec3 emissiveHDR = vec3(12.0, 10.0, 2.0);
    gEmission = vec4(emissiveHDR, 1.0); // use gEmission.a as the emissive flag
}