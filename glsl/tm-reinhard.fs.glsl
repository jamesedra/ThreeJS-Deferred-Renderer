out vec4 FragColor;
in vec2 TexCoords;

uniform sampler2D hdrScene;
uniform float exposure;

// float luminance(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }

void main() {
	vec3 hdr = texture(hdrScene, TexCoords).rgb;
    hdr *= exposure;
    vec3 mapped = hdr / (hdr + 1.0);
    FragColor = vec4(mapped, 1.0);
}