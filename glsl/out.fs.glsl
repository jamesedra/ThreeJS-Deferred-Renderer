out vec4 FragColor;
in vec2 TexCoords;

uniform sampler2D tex;

void main() {
    vec3 res = texture(tex, TexCoords).rgb;
	FragColor = vec4(res, 1.0);
}