// The value of the "varying" variable is interpolated between values computed in the vertex shader
// The varying variable we passed from the vertex shader is identified by the 'in' classifier
in float intensity;
in vec3 fragColor;

void main() {
 	// TODO: Set final rendered colour to intensity (a grey level)
	gl_FragColor = vec4(intensity*fragColor, 1.0); 
}
