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

    vec3 fragPos = texture(gPosition, TexCoords).rgb;
    vec3 N = texture(gNormal, TexCoords).rgb;
    vec3 albedo = texture(gAlbedo, TexCoords).rgb;
    vec4 ordm = texture(gORDM, TexCoords);
    N = normalize(N);

    // emission.a = flag (0/1)
    vec4 em = texture(gEmission, TexCoords);

    // If pixel belongs to the emissive orb, render it as full HDR emission
    if (em.a > 0.5) {
        // distance from orb center (use lightPos as orb center)
        float dist = length(fragPos - lightPos);
        float nDist = clamp(dist / max(lightRadius, 1e-6), 0.0, 1.0);

        float core = pow(max(0.0, 1.0 - nDist * 0.5), 4.0);
        float falloff = pow(1.0 - nDist, 2.0);
        float radial = mix(falloff, core, 0.6);

        // fresnel
        vec3 viewDir = normalize(viewPos - fragPos);
        float NdotV = max(dot(N, viewDir), 0.0);
        float rim = pow(1.0 - NdotV, 2.0);

        float emissionMultiplier = 1.0;
        vec3 hdrColor = em.rgb * (radial * 0.8 + rim * 0.5) * emissionMultiplier;

        fragColor = vec4(hdrColor, 1.0);
        return;
    }

    vec3 Lvec = lightPos - fragPos;
    float dist2 = dot(Lvec, Lvec);
    float radius2 = max(lightRadius * lightRadius, 1e-6);
    float attenuation = 1.0;
    if (dist2 > radius2) {
        attenuation = radius2 / dist2;
    }
    vec3 L = normalize(Lvec);

    vec3 V = normalize(viewPos - fragPos);
    vec3 H = normalize(L + V);

    float ambient = 0.08; // tweak
    float NdotL = max(dot(N, L), 0.0);
    vec3 diffuse = albedo * NdotL;

    float shininess = 32.0;
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, shininess);
    vec3 specColor = vec3(0.2) * spec;


    float ao = ordm.r;
    ao = (ao == 0.0) ? 1.0 : ao;

    vec3 color = (vec3(ambient) * albedo + diffuse + specColor) * attenuation * ao;
    fragColor = vec4(color, 1.0);
}