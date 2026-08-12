import * as THREE from "three";

import type { AvatarMorphs } from "@/lib/profiles/avatar";

/**
 * Builds the greyscale 3D figure.
 *
 * The body is assembled from capsules and spheres whose radii are driven by
 * two continuous parameters:
 *   - `mass`   (from BMI)        widens the torso, waist, and limbs
 *   - `muscle` (from experience) broadens the shoulders and chest, tapers the
 *                               waist, and thickens arms and thighs
 *
 * Because both inputs are continuous, a user whose weight drops by 2kg sees a
 * slightly slimmer figure rather than an unchanged one until they cross a
 * bucket boundary.
 */

export type FigureParts = {
  group: THREE.Group;
  dispose: () => void;
};

const GREY = {
  skin: 0xb4b4b4,
  shade: 0x8a8a8a,
  joint: 0x9c9c9c,
};

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

/** Capsule between two points, oriented automatically. */
function limb(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();

  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 6, 16);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  return mesh;
}

export function buildFigure(morphs: AvatarMorphs): FigureParts {
  const { mass, muscle } = morphs;
  const group = new THREE.Group();
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: GREY.skin,
    roughness: 0.62,
    metalness: 0.08,
  });
  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: GREY.shade,
    roughness: 0.7,
    metalness: 0.05,
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: GREY.joint,
    roughness: 0.55,
    metalness: 0.1,
  });
  disposables.push(bodyMaterial, shadeMaterial, jointMaterial);

  // -- Derived proportions ---------------------------------------------------
  // Muscle broadens the shoulders and narrows the waist (the V-taper);
  // mass widens everything, waist most of all.
  const shoulderWidth = lerp(0.34, 0.44, muscle) + mass * 0.07;
  const chestDepth = lerp(0.15, 0.22, muscle) + mass * 0.09;
  const chestWidth = lerp(0.26, 0.34, muscle) + mass * 0.09;
  const waistWidth = lerp(0.19, 0.21, muscle * 0.3) + mass * 0.17;
  const waistDepth = lerp(0.13, 0.145, muscle * 0.3) + mass * 0.15;
  const hipWidth = lerp(0.23, 0.25, muscle * 0.4) + mass * 0.12;

  const upperArmRadius = lerp(0.045, 0.082, muscle) + mass * 0.026;
  const forearmRadius = lerp(0.04, 0.062, muscle) + mass * 0.019;
  const thighRadius = lerp(0.082, 0.115, muscle) + mass * 0.045;
  const calfRadius = lerp(0.058, 0.079, muscle) + mass * 0.026;
  const neckRadius = lerp(0.045, 0.062, muscle) + mass * 0.014;

  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    disposables.push(mesh.geometry);
    group.add(mesh);
    return mesh;
  };

  // -- Head ------------------------------------------------------------------
  const headGeometry = new THREE.SphereGeometry(0.115, 32, 24);
  const head = new THREE.Mesh(headGeometry, bodyMaterial);
  head.position.set(0, 1.62, 0);
  head.scale.set(0.92, 1.12, 0.98);
  add(head);

  // Jaw fills out with body mass.
  const jawGeometry = new THREE.SphereGeometry(0.085 + mass * 0.022, 24, 16);
  const jaw = new THREE.Mesh(jawGeometry, bodyMaterial);
  jaw.position.set(0, 1.555, 0.016);
  jaw.scale.set(1, 0.78, 1);
  add(jaw);

  // -- Neck ------------------------------------------------------------------
  const neckGeometry = new THREE.CylinderGeometry(neckRadius, neckRadius * 1.16, 0.12, 20);
  const neck = new THREE.Mesh(neckGeometry, shadeMaterial);
  neck.position.set(0, 1.468, 0);
  add(neck);

  // -- Torso -----------------------------------------------------------------
  // Chest, waist and hips are separate ellipsoids so the silhouette can taper.
  const chestGeometry = new THREE.SphereGeometry(1, 32, 24);
  const chest = new THREE.Mesh(chestGeometry, bodyMaterial);
  chest.position.set(0, 1.245, 0);
  chest.scale.set(chestWidth, 0.235, chestDepth);
  add(chest);

  const shoulderGeometry = new THREE.SphereGeometry(1, 32, 20);
  const shoulders = new THREE.Mesh(shoulderGeometry, bodyMaterial);
  shoulders.position.set(0, 1.352, 0);
  shoulders.scale.set(shoulderWidth, 0.105, chestDepth * 0.94);
  add(shoulders);

  const waistGeometry = new THREE.SphereGeometry(1, 32, 24);
  const waist = new THREE.Mesh(waistGeometry, bodyMaterial);
  waist.position.set(0, 1.02, 0);
  waist.scale.set(waistWidth, 0.16, waistDepth);
  add(waist);

  const hipGeometry = new THREE.SphereGeometry(1, 32, 24);
  const hips = new THREE.Mesh(hipGeometry, shadeMaterial);
  hips.position.set(0, 0.875, 0);
  hips.scale.set(hipWidth, 0.135, waistDepth * 1.06);
  add(hips);

  // Abdominal definition only appears once there is real training behind it
  // and body mass is not covering it.
  const definition = Math.max(0, muscle - mass * 0.85);
  if (definition > 0.25) {
    for (let row = 0; row < 3; row += 1) {
      for (const side of [-1, 1]) {
        const absGeometry = new THREE.SphereGeometry(0.032, 12, 10);
        const ab = new THREE.Mesh(absGeometry, jointMaterial);
        ab.position.set(side * 0.042, 1.095 - row * 0.062, waistDepth * 0.92);
        ab.scale.set(1, 0.78, 0.5);
        add(ab);
      }
    }
    // Pectoral separation.
    for (const side of [-1, 1]) {
      const pecGeometry = new THREE.SphereGeometry(0.075 + muscle * 0.028, 20, 16);
      const pec = new THREE.Mesh(pecGeometry, jointMaterial);
      pec.position.set(side * (chestWidth * 0.45), 1.285, chestDepth * 0.82);
      pec.scale.set(1.12, 0.72, 0.42);
      add(pec);
    }
  }

  // -- Arms ------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const shoulderX = side * shoulderWidth * 0.92;

    const deltoidGeometry = new THREE.SphereGeometry(upperArmRadius * 1.42, 20, 16);
    const deltoid = new THREE.Mesh(deltoidGeometry, bodyMaterial);
    deltoid.position.set(shoulderX, 1.338, 0);
    add(deltoid);

    // Arms hang slightly away from the body, more so on a wider figure.
    const elbow = new THREE.Vector3(shoulderX + side * 0.045, 1.045, 0.01);
    const wrist = new THREE.Vector3(shoulderX + side * 0.085, 0.79, 0.03);

    add(limb(new THREE.Vector3(shoulderX, 1.325, 0), elbow, upperArmRadius, bodyMaterial));
    add(limb(elbow, wrist, forearmRadius, shadeMaterial));

    const handGeometry = new THREE.SphereGeometry(forearmRadius * 1.18, 16, 12);
    const hand = new THREE.Mesh(handGeometry, jointMaterial);
    hand.position.copy(wrist).add(new THREE.Vector3(side * 0.012, -0.048, 0.006));
    hand.scale.set(0.82, 1.35, 0.55);
    add(hand);
  }

  // -- Legs ------------------------------------------------------------------
  for (const side of [-1, 1]) {
    const hipX = side * hipWidth * 0.5;
    const knee = new THREE.Vector3(hipX * 0.94, 0.475, 0);
    const ankle = new THREE.Vector3(hipX * 0.9, 0.075, 0);

    add(limb(new THREE.Vector3(hipX, 0.845, 0), knee, thighRadius, bodyMaterial));
    add(limb(knee, ankle, calfRadius, shadeMaterial));

    const kneeGeometry = new THREE.SphereGeometry(calfRadius * 1.12, 16, 12);
    const kneeCap = new THREE.Mesh(kneeGeometry, jointMaterial);
    kneeCap.position.copy(knee);
    add(kneeCap);

    const footGeometry = new THREE.BoxGeometry(calfRadius * 1.7, 0.055, 0.2);
    const foot = new THREE.Mesh(footGeometry, jointMaterial);
    foot.position.set(hipX * 0.9, 0.032, 0.055);
    add(foot);
  }

  // Centre the figure vertically around the origin for orbiting.
  group.position.y = -0.85;

  return {
    group,
    dispose: () => {
      disposables.forEach((item) => item.dispose());
    },
  };
}
