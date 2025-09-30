// Setup and return the scene and related objects.
// You should look into js/setup.js to see what exactly is done here.
// const { renderer, scene, camera, worldFrame } = setup();

import * as THREE from "./js/three.module.js";
import { OrbitControls } from "./js/OrbitControls.js";
// import { OBJLoader } from "./js/OBJLoader.js";
import { setup } from "./js/setup.js";
import { loadAndPlaceOBJ } from "./js/setup.js";
import { createMaterialWithTextures, degToRad } from "./js/utils.js";

const canvas = document.getElementById("webglcanvas");
const { renderer, scene, camera, worldFrame } = setup(canvas);
console.log("THREE.REVISION", THREE.REVISION);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;

// deferred / G-buffer setup
const width = window.innerWidth;
const height = window.innerHeight;

// which RT to display
// 0 = post process
// 1 = tonemap
// 2 = pbr
// 3 - blinn phong
// 4 = lambert
// 5 = gouraud
// 6 = gPosition
// 7 = gNormal
// 8 = gAlbedo
// 9 = gORDM
let displayMode = 1;
let grassEnabled = true;
let grassToggleLatch = false;

// -------------- RENDER TARGET SECTION -------------------
// Creates GBuffer
const gBuffer = new THREE.WebGLRenderTarget(width, height, {
  count: 5,
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  depthBuffer: true,
});
gBuffer.textures[0].name = "gPosition";
gBuffer.textures[1].name = "gNormal";
gBuffer.textures[2].name = "gAlbedo";
gBuffer.textures[3].name = "gORDM";
gBuffer.textures[4].name = "gEmission";
gBuffer.depthTexture = new THREE.DepthTexture(width, height);
gBuffer.depthTexture.type = THREE.UnsignedShortType;
window.gBuffer = gBuffer;

// original gouraud shading target
const gouraudRT = new THREE.WebGLRenderTarget(width, height, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  depthBuffer: false,
});
window.gouraudRT = gouraudRT;

// lambertian diffuse
const lambertRT = new THREE.WebGLRenderTarget(width, height, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  depthBuffer: false,
});
window.lambertRT = lambertRT;

// blinn phong
const blinnRT = new THREE.WebGLRenderTarget(width, height, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  depthBuffer: false,
});
window.blinnRT = blinnRT;

// HDR target for lighting result
const pbrRT = new THREE.WebGLRenderTarget(width, height, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  depthBuffer: false,
});
window.pbrRT = pbrRT;

// tonemapped target
const toneRT = new THREE.WebGLRenderTarget(width, height, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  depthBuffer: false,
});
window.toneRT = toneRT;

// postprocess target
const postRT = new THREE.WebGLRenderTarget(width, height, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  depthBuffer: false,
});
window.postRT = postRT;

// Initialize uniform
const orbPosition = { type: "v3", value: new THREE.Vector3(0.0, 6.0, 0.0) };
const orbRadius = { type: "f", value: 45.0 };

// uniform helpers
function updateDeferredUniforms(mat) {
  if (!mat || !mat.uniforms) return;
  mat.uniforms.gPosition.value = gBuffer.textures[0];
  mat.uniforms.gNormal.value = gBuffer.textures[1];
  mat.uniforms.gAlbedo.value = gBuffer.textures[2];
  mat.uniforms.gORDM.value = gBuffer.textures[3];
  mat.uniforms.gEmission.value = gBuffer.textures[4];
  mat.uniforms.depthTex.value = gBuffer.depthTexture;
  mat.uniforms.lightPos.value = orbPosition.value.clone();
  mat.uniforms.viewPos.value = camera.position;
  mat.uniforms.lightRadius.value = orbRadius.value;
}

function updateTonemapUniforms() {
  toneMaterial.uniforms.hdrScene.value = pbrRT.texture;
}

function updatePPUniforms() {
  ppMaterial.uniforms.hdrScene.value = blinnRT.texture;
  ppMaterial.uniforms.gPosition.value = gBuffer.textures[0];
  ppMaterial.uniforms.gNormal.value = gBuffer.textures[1];
  ppMaterial.uniforms.gAlbedo.value = gBuffer.textures[2];
  ppMaterial.uniforms.gORDM.value = gBuffer.textures[3];
  ppMaterial.uniforms.gEmission.value = gBuffer.textures[4];
  ppMaterial.uniforms.depthTex.value = gBuffer.depthTexture;
  ppMaterial.uniforms.lightPos.value = orbPosition.value.clone();
  ppMaterial.uniforms.viewPos.value = camera.position;
  ppMaterial.uniforms.lightRadius.value = orbRadius.value;

  const tex = new THREE.Vector2(
    1.0 / window.innerWidth,
    1.0 / window.innerHeight
  );
  ppMaterial.uniforms.texelSize = { value: tex };
}

// -------------- TEXTURES SECTION -------------------
// Diffuse texture map (this defines the main colors of the boxing glove)
const gloveColorMap = new THREE.TextureLoader().load(
  "images/boxing_gloves_texture.png"
);
const gloveDisp = new THREE.TextureLoader().load("images/leather_disp.png");
const gloveNorm = new THREE.TextureLoader().load("images/leather_nor.png");
const gloveRoughness = new THREE.TextureLoader().load(
  "images/leather_rough.png"
);

// floor textures
const floorDiff = new THREE.TextureLoader().load(
  "images/cobblestone_floor_diff.jpg"
);
const floorAo = new THREE.TextureLoader().load(
  "images/cobblestone_floor_ao.jpg"
);
const floorDisp = new THREE.TextureLoader().load(
  "images/cobblestone_floor_disp.jpg"
);
const floorNorm = new THREE.TextureLoader().load(
  "images/cobblestone_floor_nor.jpg"
);
const floorRoughness = new THREE.TextureLoader().load(
  "images/cobblestone_floor_rough.jpg"
);

// metal textures
const metalDiff = new THREE.TextureLoader().load("images/gold_diff.png");
const metalDisp = new THREE.TextureLoader().load("images/gold_disp.png");
const metalNorm = new THREE.TextureLoader().load("images/gold_nor.png");
const metalRoughness = new THREE.TextureLoader().load("images/gold_rough.png");
const metalMetallic = new THREE.TextureLoader().load(
  "images/gold_metallic.png"
);

// -------------- SHADER SECTION -------------------
// armadillo GShader needs tinting and deformation
const armadilloGMaterial = new THREE.ShaderMaterial({
  uniforms: {
    orbPosition: orbPosition,
    orbRadius: orbRadius,

    uUseAlbedoTex: { value: true },
    uUseNormalTex: { value: true },
    uUseRoughTex: { value: true },
    uUseMetalTex: { value: true },
    uUseAOTex: { value: false },
    uUseDispTex: { value: true },

    uAlbedo: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    uRoughness: { value: 1.0 },
    uMetallic: { value: 0.0 },
    uAO: { value: 1.0 },
    uDisplacement: { value: 0.0 },

    uAlbedoTex: { value: metalDiff },
    uNormalTex: { value: metalNorm },
    uRoughTex: { value: metalRoughness },
    uMetalTex: { value: metalMetallic },
    uAOTex: { value: null },
    uDispTex: { value: metalDisp },
  },
  glslVersion: THREE.GLSL3,
});

// base GShader
const baseGMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uUseAlbedoTex: { value: false },
    uUseNormalTex: { value: false },
    uUseRoughTex: { value: false },
    uUseMetalTex: { value: false },
    uUseAOTex: { value: false },
    uUseDispTex: { value: false },

    uAlbedo: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    uRoughness: { value: 1.0 },
    uMetallic: { value: 0.0 },
    uAO: { value: 1.0 },
    uDisplacement: { value: 0.0 },

    uAlbedoTex: { value: null },
    uNormalTex: { value: null },
    uRoughTex: { value: null },
    uMetalTex: { value: null },
    uAOTex: { value: null },
    uDispTex: { value: null },
  },
  glslVersion: THREE.GLSL3,
});

// base Emissive shader
const emissiveGMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uUseAlbedoTex: { value: false },
    uUseNormalTex: { value: false },
    uUseRoughTex: { value: false },
    uUseMetalTex: { value: false },
    uUseAOTex: { value: false },
    uUseDispTex: { value: false },

    uAlbedo: { value: new THREE.Vector3(1.0, 1.0, 0.0) },
    uRoughness: { value: 1.0 },
    uMetallic: { value: 0.0 },
    uAO: { value: 1.0 },
    uDisplacement: { value: 0.0 },

    uAlbedoTex: { value: null },
    uNormalTex: { value: null },
    uRoughTex: { value: null },
    uMetalTex: { value: null },
    uAOTex: { value: null },
    uDispTex: { value: null },
  },
  glslVersion: THREE.GLSL3,
});

//  base grass shader
const grassGMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector3(1, 0, 0) },
    uWindAmp: { value: 0.05 },
    uHitAmp: { value: 0.5 },
    orbPosition: orbPosition,
    orbRadius: orbRadius,

    uUseAlbedoTex: { value: false },
    uUseNormalTex: { value: false },
    uUseRoughTex: { value: false },
    uUseMetalTex: { value: false },
    uUseAOTex: { value: false },
    uUseDispTex: { value: false },

    uAlbedo: { value: new THREE.Vector3(0.18, 0.45, 0.2) },
    uRoughness: { value: 0.85 },
    uMetallic: { value: 0.0 },
    uAO: { value: 1.0 },
    uDisplacement: { value: 0.0 },

    uAlbedoTex: { value: null },
    uNormalTex: { value: null },
    uRoughTex: { value: null },
    uMetalTex: { value: null },
    uAOTex: { value: null },
    uDispTex: { value: null },
  },
  glslVersion: THREE.GLSL3,
  side: THREE.DoubleSide,
  transparent: false,
  depthWrite: true,
});

// glove shader
let gloveGMaterial = null;
let sphere = null;

// -------------- DEFERRED SHADER SECTION -------------------
// gouraud shader
const gouraudMaterial = new THREE.ShaderMaterial({
  uniforms: {
    gPosition: { value: null },
    gNormal: { value: null },
    gAlbedo: { value: null },
    gORDM: { value: null },
    gEmission: { value: null },
    depthTex: { value: null },
    lightPos: orbPosition,
    viewPos: { value: camera.position },
    lightRadius: { value: orbRadius.value },
  },
  glslVersion: THREE.GLSL3,
});

// lambert shader
const lambertMaterial = new THREE.ShaderMaterial({
  uniforms: {
    gPosition: { value: null },
    gNormal: { value: null },
    gAlbedo: { value: null },
    gORDM: { value: null },
    gEmission: { value: null },
    depthTex: { value: null },
    lightPos: orbPosition,
    viewPos: { value: camera.position },
    lightRadius: { value: orbRadius.value },
  },
  glslVersion: THREE.GLSL3,
});

// blinn phong shader
const blinnMaterial = new THREE.ShaderMaterial({
  uniforms: {
    gPosition: { value: null },
    gNormal: { value: null },
    gAlbedo: { value: null },
    gORDM: { value: null },
    gEmission: { value: null },
    depthTex: { value: null },
    lightPos: orbPosition,
    viewPos: { value: camera.position },
    lightRadius: { value: orbRadius.value },
  },
  glslVersion: THREE.GLSL3,
});

// lighting shader (pbr)
const lightingMaterial = new THREE.ShaderMaterial({
  uniforms: {
    gPosition: { value: null },
    gNormal: { value: null },
    gAlbedo: { value: null },
    gORDM: { value: null },
    gEmission: { value: null },
    depthTex: { value: null },
    lightPos: orbPosition,
    viewPos: { value: camera.position },
    lightRadius: { value: orbRadius.value },
  },
  glslVersion: THREE.GLSL3,
});

// tonemapping shader
const toneMaterial = new THREE.ShaderMaterial({
  uniforms: {
    hdrScene: { value: null },
    exposure: { value: 0.01 },
  },
  glslVersion: THREE.GLSL3,
});

// post process material
const ppMaterial = new THREE.ShaderMaterial({
  uniforms: {
    hdrScene: { value: null },
    gPosition: { value: null },
    gNormal: { value: null },
    gAlbedo: { value: null },
    gORDM: { value: null },
    gEmission: { value: null },
    depthTex: { value: null },
    lightPos: orbPosition,
    viewPos: { value: camera.position },
    lightRadius: { value: orbRadius.value },
    texelSize: { value: null },
  },
  glslVersion: THREE.GLSL3,
});

// out shader
const outMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tex: { value: null },
  },
  glslVersion: THREE.GLSL3,
});

// Load shaders.
const shaderFiles = [
  // "glsl/armadillo.vs.glsl",
  // "glsl/armadillo.fs.glsl",
  // "glsl/sphere.vs.glsl",
  // "glsl/sphere.fs.glsl",

  // added shaders
  "glsl/g-shader.vs.glsl",
  "glsl/g-shader.fs.glsl",
  "glsl/g-deformation.vs.glsl",
  "glsl/g-grass.vs.glsl",
  "glsl/g-tinting.fs.glsl",
  "glsl/g-emissive.fs.glsl",
  "glsl/frame.vs.glsl",
  "glsl/l-lambert.fs.glsl",
  "glsl/l-gouraud.fs.glsl",
  "glsl/l-blinn-phong.fs.glsl",
  "glsl/l-pbr.fs.glsl",
  "glsl/tm-reinhard.fs.glsl",
  "glsl/pp-kuwahara.fs.glsl",
  "glsl/out.fs.glsl",
];

// -------------- FRAME SECTION -------------------
const quadGeometry = new THREE.BufferGeometry();
const quadVerts = new Float32Array([
  -1,
  -1,
  0, // 0
  1,
  -1,
  0, // 1
  1,
  1,
  0, // 2
  -1,
  1,
  0, // 3
]);
const quadInd = new Uint16Array([0, 1, 2, 0, 2, 3]);
const quadUvs = new Float32Array([
  0.0,
  0.0, // for vertex 0
  1.0,
  0.0, // 1
  1.0,
  1.0, // 2
  0.0,
  1.0, // 3
]);

quadGeometry.setAttribute("position", new THREE.BufferAttribute(quadVerts, 3));
quadGeometry.setAttribute("uv", new THREE.BufferAttribute(quadUvs, 2));
quadGeometry.setIndex(new THREE.BufferAttribute(quadInd, 1));

await new Promise((resolve, reject) => {
  const s = document.createElement("script");
  s.src = "./js/KeyboardState.js";
  s.onload = resolve;
  s.onerror = () => reject(new Error("Failed to load KeyboardState.js"));
  document.head.appendChild(s);
});

async function loadSources(paths, onLoad) {
  const out = {};
  await Promise.all(
    paths.map(async (p) => {
      const res = await fetch(p);
      if (!res.ok) throw new Error(`Failed to fetch ${p}`);
      out[p] = await res.text();
    })
  );
  onLoad(out);
}

// -------------- LOADER SECTION -------------------
loadSources(shaderFiles, function (shaders) {
  armadilloGMaterial.vertexShader = shaders["glsl/g-deformation.vs.glsl"];
  armadilloGMaterial.fragmentShader = shaders["glsl/g-tinting.fs.glsl"];
  armadilloGMaterial.glslVersion = THREE.GLSL3;
  armadilloGMaterial.needsUpdate = true;

  baseGMaterial.vertexShader = shaders["glsl/g-shader.vs.glsl"];
  baseGMaterial.fragmentShader = shaders["glsl/g-shader.fs.glsl"];
  baseGMaterial.glslVersion = THREE.GLSL3;
  baseGMaterial.needsUpdate = true;

  grassGMaterial.vertexShader = shaders["glsl/g-grass.vs.glsl"];
  grassGMaterial.fragmentShader = shaders["glsl/g-shader.fs.glsl"];
  grassGMaterial.glslVersion = THREE.GLSL3;
  grassGMaterial.needsUpdate = true;

  emissiveGMaterial.vertexShader = shaders["glsl/g-shader.vs.glsl"];
  emissiveGMaterial.fragmentShader = shaders["glsl/g-emissive.fs.glsl"];
  emissiveGMaterial.glslVersion = THREE.GLSL3;
  emissiveGMaterial.needsUpdate = true;

  gouraudMaterial.vertexShader = shaders["glsl/frame.vs.glsl"];
  gouraudMaterial.fragmentShader = shaders["glsl/l-gouraud.fs.glsl"];
  gouraudMaterial.glslVersion = THREE.GLSL3;
  gouraudMaterial.needsUpdate = true;

  lambertMaterial.vertexShader = shaders["glsl/frame.vs.glsl"];
  lambertMaterial.fragmentShader = shaders["glsl/l-lambert.fs.glsl"];
  lambertMaterial.glslVersion = THREE.GLSL3;
  lambertMaterial.needsUpdate = true;

  blinnMaterial.vertexShader = shaders["glsl/frame.vs.glsl"];
  blinnMaterial.fragmentShader = shaders["glsl/l-blinn-phong.fs.glsl"];
  blinnMaterial.glslVersion = THREE.GLSL3;
  blinnMaterial.needsUpdate = true;

  lightingMaterial.vertexShader = shaders["glsl/frame.vs.glsl"];
  lightingMaterial.fragmentShader = shaders["glsl/l-pbr.fs.glsl"];
  lightingMaterial.glslVersion = THREE.GLSL3;
  lightingMaterial.needsUpdate = true;

  toneMaterial.vertexShader = shaders["glsl/frame.vs.glsl"];
  toneMaterial.fragmentShader = shaders["glsl/tm-reinhard.fs.glsl"];
  toneMaterial.glslVersion = THREE.GLSL3;
  toneMaterial.needsUpdate = true;

  ppMaterial.vertexShader = shaders["glsl/frame.vs.glsl"];
  ppMaterial.fragmentShader = shaders["glsl/pp-kuwahara.fs.glsl"];
  ppMaterial.glslVersion = THREE.GLSL3;
  ppMaterial.needsUpdate = true;

  outMaterial.vertexShader = shaders["glsl/frame.vs.glsl"];
  outMaterial.fragmentShader = shaders["glsl/out.fs.glsl"];
  outMaterial.glslVersion = THREE.GLSL3;
  outMaterial.needsUpdate = true;

  // TO CHANGE WHEN MULTIPLE PASSES
  if (!window.quadScene) {
    window.quadScene = new THREE.Scene();
    window.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    window.quadMaterial = lightingMaterial;
    window.quadMaterial.glslVersion = THREE.GLSL3;
    window.quadMaterial.needsUpdate = true;

    const quadMesh = new THREE.Mesh(quadGeometry, lightingMaterial);
    quadMesh.name = "__output_quad__";
    window.quadScene.add(quadMesh);
    window.quadMesh = quadMesh;
  } else {
    window.quadMaterial = lightingMaterial;
  }

  // new floor GShader (clone of base)
  const floorGMaterial = createMaterialWithTextures(baseGMaterial, {
    albedo: floorDiff,
    normal: floorNorm,
    rough: floorRoughness,
    disp: floorDisp,
    ao: floorAo,
  });

  const floorGeometry = new THREE.PlaneGeometry(30.0, 30.0, 1, 1);
  const count = floorGeometry.attributes.position.count;
  const tangents = new Float32Array(count * 4);
  for (let i = 0; i < count; ++i) {
    tangents[i * 4 + 0] = 1.0; // tx
    tangents[i * 4 + 1] = 0.0; // ty
    tangents[i * 4 + 2] = 0.0; // tz
    tangents[i * 4 + 3] = 1.0;
  }
  floorGeometry.setAttribute("tangent", new THREE.BufferAttribute(tangents, 4));
  floorGeometry.attributes.tangent.needsUpdate = true;
  const floor = new THREE.Mesh(floorGeometry, floorGMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.3;
  scene.add(floor);
  floor.parent = worldFrame;

  // create grass instancing
  const blade = new THREE.PlaneGeometry(0.05, 0.6, 1.0, 4.0);
  const vertCount = blade.attributes.position.count;
  const bladeTangents = new Float32Array(vertCount * 4);
  for (let i = 0; i < vertCount; i++) {
    bladeTangents[i * 4 + 0] = 1.0; // tx
    bladeTangents[i * 4 + 1] = 0.0; // ty
    bladeTangents[i * 4 + 2] = 0.0; // tz
    bladeTangents[i * 4 + 3] = 1.0; // handiness
  }
  blade.setAttribute("tangent", new THREE.BufferAttribute(bladeTangents, 4));
  blade.translate(0.0, 0.3, 0.0);
  blade.scale(5.0, 5.0, 5.0);
  const GRASS_COUNT = 250000;
  const grass = new THREE.InstancedMesh(blade, grassGMaterial, GRASS_COUNT);

  const offsets = new Float32Array(GRASS_COUNT * 3);
  const rotations = new Float32Array(GRASS_COUNT);
  const scales = new Float32Array(GRASS_COUNT);
  const seeds = new Float32Array(GRASS_COUNT);

  const AREA = 125.0;
  const m = new THREE.Matrix4();
  for (let i = 0; i < GRASS_COUNT; i++) {
    const x = (Math.random() - 0.5) * AREA;
    const z = (Math.random() - 0.5) * AREA;
    const y = Math.random() * 0.005 * AREA;

    offsets[i * 3 + 0] = x;
    offsets[i * 3 + 1] = y + 0.001;
    offsets[i * 3 + 2] = z;

    rotations[i] = Math.random() * Math.PI * 2.0;
    scales[i] = 0.8 + Math.random() * 0.6;
    seeds[i] = Math.random();

    grass.setMatrixAt(i, m.identity());
  }
  grass.instanceMatrix.needsUpdate = true;

  // Attach instanced attributes to geometry
  blade.setAttribute(
    "instanceOffset",
    new THREE.InstancedBufferAttribute(offsets, 3)
  );
  blade.setAttribute(
    "instanceRotation",
    new THREE.InstancedBufferAttribute(rotations, 1)
  );
  blade.setAttribute(
    "instanceScale",
    new THREE.InstancedBufferAttribute(scales, 1)
  );
  blade.setAttribute(
    "instanceSeed",
    new THREE.InstancedBufferAttribute(seeds, 1)
  );

  grass.frustumCulled = true;
  grass.parent = worldFrame;
  grass.instanceMatrix.needsUpdate = true;
  scene.add(grass);
  window.grassMaterial = grassGMaterial;
  window.grass = grass;
  window.grass.visible = true;

  // Create the sphere geometry
  // https://threejs.org/docs/#api/en/geometries/SphereGeometry
  const sphereGeometry = new THREE.SphereGeometry(1.0, 32.0, 32.0);
  sphere = new THREE.Mesh(sphereGeometry, emissiveGMaterial);
  sphere.position.set(0.0, 1.0, 0.0);
  scene.add(sphere);
  sphere.parent = worldFrame;

  // const sphereLight = new THREE.PointLight(0xffffff, 1, 100);
  // scene.add(sphereLight);

  gloveGMaterial = createMaterialWithTextures(baseGMaterial, {
    albedo: gloveColorMap,
    normal: gloveNorm,
    rough: gloveRoughness,
    disp: gloveDisp,
  });
  gloveGMaterial.needsUpdate = true;

  // Load and place the Armadillo geometry
  loadAndPlaceOBJ(
    "obj/armadillo-unwrap.obj",
    armadilloGMaterial,
    function (armadillo) {
      armadillo.position.set(0.0, 5.3, -8.0);
      armadillo.rotation.y = Math.PI;
      armadillo.scale.set(0.1, 0.1, 0.1);
      armadillo.parent = worldFrame;
      scene.add(armadillo);
    }
  );

  loadAndPlaceOBJ(
    "obj/boxing_glove.obj",
    gloveGMaterial,
    function (boxingGloveR) {
      boxingGloveR.position.set(5.25, 13.0, -3);
      boxingGloveR.rotation.x = degToRad(-110);
      boxingGloveR.rotation.y = degToRad(185);
      boxingGloveR.rotation.z = degToRad(75);
      boxingGloveR.scale.set(1.75, 1.75, 1.75);
      boxingGloveR.parent = worldFrame;
      scene.add(boxingGloveR);
    }
  );

  loadAndPlaceOBJ(
    "obj/boxing_glove.obj",
    gloveGMaterial,
    function (boxingGloveL) {
      boxingGloveL.position.set(-5.25, 14.0, -3.5);
      boxingGloveL.rotation.x = degToRad(-120);
      boxingGloveL.rotation.y = degToRad(185);
      boxingGloveL.rotation.z = degToRad(105);
      boxingGloveL.scale.set(1.75, -1.75, 1.75);
      boxingGloveL.parent = worldFrame;
      scene.add(boxingGloveL);
    }
  );

  requestAnimationFrame(update);
});

// Listen to keyboard events.
const keyboard = new globalThis.THREEx.KeyboardState();
function checkKeyboard() {
  if (keyboard.pressed("W")) orbPosition.value.z -= 0.3;
  else if (keyboard.pressed("S")) orbPosition.value.z += 0.3;

  if (keyboard.pressed("A")) orbPosition.value.x -= 0.3;
  else if (keyboard.pressed("D")) orbPosition.value.x += 0.3;

  if (keyboard.pressed("E")) orbPosition.value.y -= 0.3;
  else if (keyboard.pressed("Q")) orbPosition.value.y += 0.3;

  if (keyboard.pressed("O"))
    orbRadius.value = Math.max(orbRadius.value - 0.3, 0.01);
  else if (keyboard.pressed("P")) orbRadius.value += 0.3;

  if (keyboard.pressed("G")) {
    if (!grassToggleLatch) {
      grassEnabled = !grassEnabled;
      if (window.grass) window.grass.visible = grassEnabled;
      grassToggleLatch = true;
    }
  } else {
    grassToggleLatch = false;
  }

  for (let i = 0; i <= 9; i++) {
    if (keyboard.pressed(String(i))) {
      displayMode = i;
      break;
    }
  }

  if (sphere) {
    sphere.position.copy(orbPosition.value);
    sphere.updateMatrixWorld();
  }
}

// -------------- RENDER SECTION -------------------
function gRender() {
  // GBuffer
  renderer.setRenderTarget(gBuffer);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);

  // Deferred lighting passes
  // PBR (HDR)
  updateDeferredUniforms(lightingMaterial);
  window.quadMesh.material = lightingMaterial;
  renderer.setRenderTarget(pbrRT);
  renderer.clear(true, true, true);
  renderer.render(window.quadScene, window.quadCamera);

  // Blinn Phong
  updateDeferredUniforms(blinnMaterial);
  window.quadMesh.material = blinnMaterial;
  renderer.setRenderTarget(blinnRT);
  renderer.clear(true, true, true);
  renderer.render(window.quadScene, window.quadCamera);

  // Lambert diffuse
  updateDeferredUniforms(lambertMaterial);
  window.quadMesh.material = lambertMaterial;
  renderer.setRenderTarget(lambertRT);
  renderer.clear(true, true, true);
  renderer.render(window.quadScene, window.quadCamera);

  // Gouraud
  updateDeferredUniforms(gouraudMaterial);
  window.quadMesh.material = gouraudMaterial;
  renderer.setRenderTarget(gouraudRT);
  renderer.clear(true, true, true);
  renderer.render(window.quadScene, window.quadCamera);

  let displayTex = null;

  switch (displayMode) {
    case 0:
      updatePPUniforms();
      window.quadMesh.material = ppMaterial;
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(window.quadScene, window.quadCamera);
      return;
    case 1: // tonemap (tonemapped PBR)
      updateTonemapUniforms();
      window.quadMesh.material = toneMaterial;
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(window.quadScene, window.quadCamera);
      return;

    case 2:
      displayTex = pbrRT.texture;
      break;
    case 3:
      displayTex = blinnRT.texture;
      break;
    case 4:
      displayTex = lambertRT.texture;
      break;
    case 5:
      displayTex = gouraudRT.texture;
      break;
    case 6:
      displayTex = gBuffer.textures[0];
      break;
    case 7:
      displayTex = gBuffer.textures[1];
      break;
    case 8:
      displayTex = gBuffer.textures[2];
      break;
    case 9:
      displayTex = gBuffer.textures[3];
      break;
    default:
      // show tonemapped PBR
      updateTonemapUniforms();
      window.quadMesh.material = toneMaterial;
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(window.quadScene, window.quadCamera);
      return;
  }

  outMaterial.uniforms.tex.value = displayTex;
  window.quadMesh.material = outMaterial;
  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);
  renderer.render(window.quadScene, window.quadCamera);
}

// Setup update callback
function update() {
  checkKeyboard();

  // Requests the next update call, this creates a loop
  requestAnimationFrame(update);
  // renderer.render(scene, camera);
  gRender();

  if (window.grassMaterial && grassEnabled) {
    window.grassMaterial.uniforms.uTime.value = performance.now() * 0.001;
  }
}

