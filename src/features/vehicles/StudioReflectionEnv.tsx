/**
 * PARKLAB 3D — Procedural Automotive Reflection Environment Map
 * Generates a high-contrast studio softbox & horizon environment map in-memory
 * using THREE.PMREMGenerator and assigns it to `scene.environment` so metallic
 * clearcoat car paints, dark glass canopies, and alloy rims exhibit realistic
 * specular reflections without external HDR network requests.
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface StudioReflectionEnvProps {
  /** Overall environment reflection intensity (default 1.25) */
  intensity?: number;
}

export function StudioReflectionEnv({
  intensity = 1.25,
}: StudioReflectionEnvProps) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileCubemapShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#070a11');

    // Overhead main automotive studio softbox strip
    const topStripGeo = new THREE.PlaneGeometry(26, 9);
    const topStripMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff').multiplyScalar(3.4 * intensity),
      side: THREE.DoubleSide,
    });
    const topStrip = new THREE.Mesh(topStripGeo, topStripMat);
    topStrip.position.set(0, 12, 0);
    topStrip.rotation.x = Math.PI / 2;
    envScene.add(topStrip);

    // Left warm-white key reflection strip (creates sleek body-line highlight)
    const sideStripGeo = new THREE.PlaneGeometry(28, 3.6);
    const leftStripMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e2e8f0').multiplyScalar(2.6 * intensity),
      side: THREE.DoubleSide,
    });
    const leftStrip = new THREE.Mesh(sideStripGeo, leftStripMat);
    leftStrip.position.set(-14, 4.5, 0);
    leftStrip.rotation.y = Math.PI / 2;
    leftStrip.rotation.z = 0.12;
    envScene.add(leftStrip);

    // Right cool-blue rim reflection strip
    const rightStripMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#bae6fd').multiplyScalar(2.2 * intensity),
      side: THREE.DoubleSide,
    });
    const rightStrip = new THREE.Mesh(sideStripGeo, rightStripMat);
    rightStrip.position.set(14, 4.8, 0);
    rightStrip.rotation.y = -Math.PI / 2;
    envScene.add(rightStrip);

    // Front & rear crimson/horizon accent reflection strips
    const horizonGeo = new THREE.PlaneGeometry(24, 2.2);
    const frontHorizonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#f8fafc').multiplyScalar(2.0 * intensity),
      side: THREE.DoubleSide,
    });
    const frontHorizon = new THREE.Mesh(horizonGeo, frontHorizonMat);
    frontHorizon.position.set(0, 2.6, -15);
    envScene.add(frontHorizon);

    const rearHorizonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#fca5a5').multiplyScalar(1.6 * intensity),
      side: THREE.DoubleSide,
    });
    const rearHorizon = new THREE.Mesh(horizonGeo, rearHorizonMat);
    rearHorizon.position.set(0, 2.8, 15);
    envScene.add(rearHorizon);

    const renderTarget = pmremGenerator.fromScene(envScene, 0.035);
    const prevEnvironment = scene.environment;
    scene.environment = renderTarget.texture;

    return () => {
      scene.environment = prevEnvironment;
      renderTarget.dispose();
      pmremGenerator.dispose();
      topStripGeo.dispose();
      topStripMat.dispose();
      sideStripGeo.dispose();
      leftStripMat.dispose();
      rightStripMat.dispose();
      horizonGeo.dispose();
      frontHorizonMat.dispose();
      rearHorizonMat.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}
