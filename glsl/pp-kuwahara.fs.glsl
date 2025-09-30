out vec4 FragColor;
in vec2 TexCoords;

uniform sampler2D hdrScene;
uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D gAlbedo;
uniform sampler2D gORDM;
uniform sampler2D gEmission;
uniform sampler2D depthTex;
uniform vec3 lightPos;
uniform vec3 viewPos;
uniform float lightRadius;

uniform vec2 texelSize;

const int RADIUS = 4;
const float EPS = 1e-6;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  // passthrough background / sky
  float sceneDepth = texture(depthTex, TexCoords).r;
  if (sceneDepth >= 0.9999) {
    FragColor = vec4(texture(hdrScene, TexCoords).rgb, 1.0);
    return;
  }

  // accumulate four quadrants (isotropic Kuwahara)
  vec3 meanCol0 = vec3(0.0);
  vec3 meanCol1 = vec3(0.0);
  vec3 meanCol2 = vec3(0.0);
  vec3 meanCol3 = vec3(0.0);

  float sumLum0 = 0.0; float sumLum1 = 0.0; float sumLum2 = 0.0; float sumLum3 = 0.0;
  float sumSq0 = 0.0; float sumSq1 = 0.0; float sumSq2 = 0.0; float sumSq3 = 0.0;
  int c0 = 0; int c1 = 0; int c2 = 0; int c3 = 0;

  for (int y = -RADIUS; y <= RADIUS; ++y) {
    for (int x = -RADIUS; x <= RADIUS; ++x) {
      vec2 offset = vec2(float(x) * texelSize.x, float(y) * texelSize.y);
      vec2 uv = clamp(TexCoords + offset, vec2(0.0), vec2(1.0));
      vec3 col = texture(hdrScene, uv).rgb;
      float L = luma(col);

      // quadrant: left/top = 0, right/top = 1, left/bottom = 2, right/bottom = 3
      bool right = (x >= 0);
      bool bottom = (y >= 0);
      int q = int(right) + 2 * int(bottom);

      if (q == 0) { meanCol0 += col; sumLum0 += L; sumSq0 += L*L; c0++; }
      else if (q == 1) { meanCol1 += col; sumLum1 += L; sumSq1 += L*L; c1++; }
      else if (q == 2) { meanCol2 += col; sumLum2 += L; sumSq2 += L*L; c2++; }
      else { meanCol3 += col; sumLum3 += L; sumSq3 += L*L; c3++; }
    }
  }

  vec3 fallback = texture(hdrScene, TexCoords).rgb;

  float var0 = 1e6, var1 = 1e6, var2 = 1e6, var3 = 1e6;
  if (c0 > 0) { meanCol0 /= float(c0); float m = sumLum0/float(c0); var0 = max(sumSq0/float(c0) - m*m, 0.0); } else meanCol0 = fallback;
  if (c1 > 0) { meanCol1 /= float(c1); float m = sumLum1/float(c1); var1 = max(sumSq1/float(c1) - m*m, 0.0); } else meanCol1 = fallback;
  if (c2 > 0) { meanCol2 /= float(c2); float m = sumLum2/float(c2); var2 = max(sumSq2/float(c2) - m*m, 0.0); } else meanCol2 = fallback;
  if (c3 > 0) { meanCol3 /= float(c3); float m = sumLum3/float(c3); var3 = max(sumSq3/float(c3) - m*m, 0.0); } else meanCol3 = fallback;

  // pick lowest variance region
  vec3 best = meanCol0;
  float bestVar = var0;
  if (var1 < bestVar) { bestVar = var1; best = meanCol1; }
  if (var2 < bestVar) { bestVar = var2; best = meanCol2; }
  if (var3 < bestVar) { bestVar = var3; best = meanCol3; }

  FragColor = vec4(best, 1.0);
}
