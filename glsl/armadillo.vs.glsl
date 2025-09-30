// The uniform variable is set up in the javascript code and the same for all vertices
uniform vec3 orbPosition;
uniform float radius;

// This is a "varying" variable and interpolated between vertices and across fragments.
// The shared variable is initialized in the vertex shader and passed to the fragment shader.
out float intensity;
out vec3 fragColor;

void main() {

    // TODO: Make changes here for part b, c, d
  	// HINT: INTENSITY IS CALCULATED BY TAKING THE DOT PRODUCT OF THE NORMAL AND LIGHT DIRECTION VECTORS\

    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).rgb;

    vec3 N = normalize(normalMatrix * normal);
    vec3 L = normalize(orbPosition - worldPos);
    
    float ambient = 0.1;
    float diff = max(dot(N, L), 0.0);
    // vec3 diffuse = diff; // add light color later

    intensity = ambient + diff;
    fragColor = distance(worldPos, orbPosition) < radius ? vec3(0.0, 1.0, 1.0) : vec3(1.0, 1.0, 1.0);

    // Multiply each vertex by the model matrix to get the world position of each vertex, 
    // then the view matrix to get the position in the camera coordinate system, 
    // and finally the projection matrix to get final vertex position

    // deformations, given a distance from the radius, increase the offset closer to the orb position
    vec3 offsetPos = mix(orbPosition, worldPos, min(distance(worldPos, orbPosition)/radius, 1.0));
    gl_Position = projectionMatrix * viewMatrix * vec4(offsetPos, 1.0);
    
}
