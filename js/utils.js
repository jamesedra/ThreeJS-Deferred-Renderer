import * as THREE from './three.module.js';

// BASE MATERIAL HELPERS
function _toVec3(v) {
  if (!v) return null;
  if (v.isColor) return new THREE.Vector3(v.r, v.g, v.b);
  if (v.isVector3) return new THREE.Vector3(v.x, v.y, v.z);
  if (Array.isArray(v) && v.length >= 3) return new THREE.Vector3(v[0], v[1], v[2]);
  return null;
}

function _setIfExists(uniforms, name, value) {
  if (!uniforms || uniforms[name] === undefined) return;
  uniforms[name].value = value;
}

// Clone baseMaterial (and its uniforms) and apply textures/scalars from opts.
// opts keys:
// textures: albedo, normal, rough, metal, ao, disp   (THREE.Texture)
// scalars:  albedoColor (THREE.Color/Vector3/array), roughness, metallic, ao, displacement
export function createMaterialWithTextures(baseMaterial, opts = {}) {
  const mat = baseMaterial.clone();
  mat.uniforms = THREE.UniformsUtils.clone(baseMaterial.uniforms);
  const u = mat.uniforms;

  // ALBEDO
  if (opts.albedo) {
    _setIfExists(u, 'uAlbedoTex', opts.albedo);
    _setIfExists(u, 'uUseAlbedoTex', true);
  } else {
    _setIfExists(u, 'uUseAlbedoTex', false);
    if (opts.albedoColor !== undefined) {
      const v = _toVec3(opts.albedoColor);
      if (v && u.uAlbedo) {
        // u.uAlbedo.value might be THREE.Vector3 or plain object
        if (u.uAlbedo.value && u.uAlbedo.value.copy) u.uAlbedo.value.copy(v);
        else u.uAlbedo.value = v;
      }
    }
  }

  // NORMAL
  if (opts.normal) {
    _setIfExists(u, 'uNormalTex', opts.normal);
    _setIfExists(u, 'uUseNormalTex', true);
  } else {
    _setIfExists(u, 'uUseNormalTex', false);
  }

  // ROUGHNESS (texture preferred)
  if (opts.rough) {
    _setIfExists(u, 'uRoughTex', opts.rough);
    _setIfExists(u, 'uUseRoughTex', true);
  } else {
    _setIfExists(u, 'uUseRoughTex', false);
    if (opts.roughness !== undefined) _setIfExists(u, 'uRoughness', opts.roughness);
  }

  // METALLIC (texture preferred)
  if (opts.metal) {
    _setIfExists(u, 'uMetalTex', opts.metal);
    _setIfExists(u, 'uUseMetalTex', true);
  } else {
    _setIfExists(u, 'uUseMetalTex', false);
    if (opts.metallic !== undefined) _setIfExists(u, 'uMetallic', opts.metallic);
  }

  // AO (texture preferred)
  if (opts.ao) {
    _setIfExists(u, 'uAOTex', opts.ao);
    _setIfExists(u, 'uUseAOTex', true);
  } else {
    _setIfExists(u, 'uUseAOTex', false);
    if (opts.aoValue !== undefined) _setIfExists(u, 'uAO', opts.aoValue);
    else if (opts.ao !== undefined && !(opts.ao && opts.ao.isTexture)) {
      // if user passed ao scalar as opts.ao (alternate name), use it
      _setIfExists(u, 'uAO', opts.ao);
    }
  }

  // DISPLACEMENT (texture preferred)
  if (opts.disp) {
    _setIfExists(u, 'uDispTex', opts.disp);
    _setIfExists(u, 'uUseDispTex', true);
  } else {
    _setIfExists(u, 'uUseDispTex', false);
    if (opts.displacement !== undefined) _setIfExists(u, 'uDisplacement', opts.displacement);
  }

  return mat;
}

export function degToRad(d) {
  return (d * Math.PI) / 180;
}