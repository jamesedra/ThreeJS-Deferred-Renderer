out vec2 TexCoords;

void main() {
    TexCoords = uv;
    gl_Position = vec4(position, 1.0);
}