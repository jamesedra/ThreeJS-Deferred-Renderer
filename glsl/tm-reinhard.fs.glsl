out vec4 FragColor;
in vec2 TexCoords;

uniform sampler2D hdrScene;
uniform float exposure;

void main() {
    vec3 hdrColor = texture(hdrScene, TexCoords).rgb;
	// reinhard tonemapping
	vec3 mapped = hdrColor / (hdrColor + vec3(1.0));
	FragColor = vec4(mapped, 1.0);
}