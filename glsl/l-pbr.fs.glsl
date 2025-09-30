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

vec3 Fresnel(float cosTheta, vec3 F0);
vec3 FresnelRoughness(float cosTheta, vec3 F0, float roughness);
float NormalDistribution(float nDotH, float roughness);
float GeometryEq(float dotProd, float roughness);

const float PI = 3.14159265359;

void main() {

    float sceneDepth = texture(depthTex, TexCoords).r;
    if (sceneDepth >= 0.9999) {
        // render background (transparent / sky color). 
        fragColor = vec4(0.1506, 0.1808, 0.1882, 1.0);
        return;
    }

    // deferred attachment unpacking
	vec3 fragPos = texture(gPosition, TexCoords).rgb;
	vec3 n = normalize(texture(gNormal, TexCoords).rgb);
	vec3 albedo = texture(gAlbedo, TexCoords).rgb;
    vec4 ordm = texture(gORDM, TexCoords);
	float roughness = ordm.g;
	float metallic = ordm.a;
	float ao = ordm.r;

    roughness = max(roughness, 0.0001);

	// read emission: rgb = HDR color, a = flag (0/1)
    vec4 em = texture(gEmission, TexCoords);

    // If this pixel belongs to the emissive orb, render it as full HDR emission
    if (em.a > 0.5) {
        // distance from orb center (use lightPos as orb center)
        float dist = length(fragPos - lightPos);
        float nDist = clamp(dist / max(lightRadius, 1e-6), 0.0, 1.0);

        float core = pow(max(0.0, 1.0 - nDist * 0.5), 4.0);
        float falloff = pow(1.0 - nDist, 2.0);
        float radial = mix(falloff, core, 0.6);

        // fresnel
        vec3 viewDir = normalize(viewPos - fragPos);
        float NdotV = max(dot(n, viewDir), 0.0);
        float rim = pow(1.0 - NdotV, 2.0);

        float emissionMultiplier = 1.0;
        vec3 hdrColor = em.rgb * (radial * 0.8 + rim * 0.5) * emissionMultiplier;

        fragColor = vec4(hdrColor, 1.0);
        return;
    }

	vec3 F0 = mix(vec3(0.04), albedo, metallic);
	vec3 Lo = vec3(0.0); // outgoing radiance

	vec3 v = normalize(viewPos - fragPos);
	vec3 l = normalize(lightPos - fragPos);
	vec3 h = normalize(v + l);

    // Non-PBR lighting helper
    float dist = length(lightPos - fragPos);
    float dist2 = max(dist * dist, 1e-4);
    float invSq = 1.0 / dist2;
    float radius = lightRadius;
    float radiusFade = clamp(1.0 - (dist / radius), 0.0, 1.0);
    radiusFade = pow(radiusFade, 1.25);
    float intensity = 300.0;
    float attenuation = invSq * radiusFade * intensity;
    vec3 radiance = vec3(1.0) * attenuation;

	// Dot product setup
	float nDotL = max(dot(n, l), 0.0);
	float vDotH = max(dot(v, h), 0.0);
	float nDotH = max(dot(n, h), 0.0);
	float nDotV = max(dot(n, v), 0.0);

	// Specular BRDF
	vec3 F = Fresnel(vDotH, F0);
	float D = NormalDistribution(nDotH, roughness);
	float G = GeometryEq(nDotL, roughness) * GeometryEq(nDotV, roughness);

	vec3 SpecBRDF_nom = D * G * F;
	float SpecBRDF_denom = 4.0 * nDotV * nDotL;
	vec3 SpecBRDF = SpecBRDF_nom / max(SpecBRDF_denom, 0.001);

	// Diffuse BRDF
	vec3 kS = F;
	vec3 kD = vec3(1.0) - kS;
	kD *= 1.0 - metallic;
		
	vec3 fLambert = albedo;
	vec3 DiffuseBRDF = kD * fLambert / PI;

	Lo += (DiffuseBRDF + SpecBRDF) * radiance * nDotL;

    vec3 ambient = vec3(0.05) * albedo * ao;

    vec3 color = ambient + Lo;
	fragColor = vec4(color, 1.0);
}

// uses Fresnel-Schlick approximation
vec3 Fresnel(float cosTheta, vec3 F0) {
	return F0 + (1.0 - F0) * pow(max((1.0 - cosTheta), 0.0), 5.0);
}

// based on Sebastien Lagarde's implementation
vec3 FresnelRoughness(float cosTheta, vec3 F0, float roughness) {
	return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

// uses TrowBridge-Reitz GGX
float NormalDistribution(float nDotH, float roughness) {
    float a2 = roughness * roughness;
    float denom = (nDotH * nDotH * (a2 - 1.0) + 1.0);
    return a2 / (PI * (denom * denom));
}

// uses Schlick-Beckman GGX
float GeometryEq(float dotProd, float roughness) {
	float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
	return dotProd / (dotProd * (1.0 - k) + k);
}
