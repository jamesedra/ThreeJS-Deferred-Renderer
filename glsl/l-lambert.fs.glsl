uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D gAlbedo;
uniform sampler2D gORDM;
uniform sampler2D gEmission;
uniform sampler2D depthTex;

uniform vec3 lightPos;
uniform vec3 viewPos;
uniform float lightRadius;

in vec2 TexCoords;
layout(location = 0) out vec4 fragColor;

void main() {
    float sceneDepth = texture(depthTex, TexCoords).r;
    if (sceneDepth >= 0.9999) {
        // render background (transparent / sky color).
        fragColor = vec4(0.1506, 0.1808, 0.1882, 1.0);
        return;
    }

    vec3 pos = texture(gPosition, TexCoords).rgb;
    vec3 N = normalize(texture(gNormal, TexCoords).rgb);
    vec3 albedo = texture(gAlbedo, TexCoords).rgb;
    vec4 ordm = texture(gORDM, TexCoords);

    // read emission: rgb = HDR color, a = flag (0/1)
    vec4 em = texture(gEmission, TexCoords);

    // If this pixel belongs to the emissive orb, render it as full HDR emission
    if (em.a > 0.5) {
        // distance from orb center (use lightPos as orb center)
        float dist = length(pos - lightPos);
        float nDist = clamp(dist / max(lightRadius, 1e-6), 0.0, 1.0);

        float core = pow(max(0.0, 1.0 - nDist * 0.5), 4.0);
        float falloff = pow(1.0 - nDist, 2.0);
        float radial = mix(falloff, core, 0.6);

        // fresnel
        vec3 viewDir = normalize(viewPos - pos);
        float NdotV = max(dot(N, viewDir), 0.0);
        float rim = pow(1.0 - NdotV, 2.0);

        float emissionMultiplier = 1.0;
        vec3 hdrColor = em.rgb * (radial * 0.8 + rim * 0.5) * emissionMultiplier;

        fragColor = vec4(hdrColor, 1.0);
        return;
    }

    float dist = distance(lightPos, pos);
    if (dist > lightRadius) {
        vec3 ambient = 0.22 * albedo * ordm.x;
        fragColor = vec4(ambient, 1.0);
        return;
    }

    vec3 L = normalize(lightPos - pos);
    float NdotL = max(dot(N, L), 0.0);
    float t = clamp(1.0 - (dist / lightRadius), 0.0, 1.0);
    float attenuation = t * t; 

    // might keep the banding but this isn't lambert anymore
    vec3 diffuse = albedo * floor(NdotL * attenuation * 8.0) / 8.0; 

    vec3 ambient = 0.22 * albedo;
    fragColor = vec4(ambient + diffuse, 1.0);
}