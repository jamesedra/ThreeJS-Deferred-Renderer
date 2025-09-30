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
        // render background
        fragColor = vec4(0.506, 0.808, 0.882, 1.0);
        return;
    }

    vec3 fragPos = texture(gPosition, TexCoords).rgb;
    vec3 N = texture(gNormal, TexCoords).rgb;
    vec3 albedo = texture(gAlbedo, TexCoords).rgb;
    vec4 em = texture(gEmission, TexCoords);
    N = normalize(N);

    if (em.a > 0.5) {
        fragColor = vec4(1.0, 1.0, 0.0, 0.5);
        return;
    }

    vec3 L = normalize(lightPos - fragPos);

    float ambient = 0.45;
    float NdotL = max(dot(N, L), 0.0);
    vec3 diffuse = albedo * NdotL;

    vec3 color = vec3(ambient * albedo + diffuse);
    fragColor = vec4(color, 1.0);
}