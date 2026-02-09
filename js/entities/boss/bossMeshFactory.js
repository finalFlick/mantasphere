// Boss mesh creation functions
// Handles creation of boss meshes for all arenas

function darkenRgb(hex, factor = 0.75) {
    const f = Math.max(0, Math.min(1, Number(factor)));
    const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 0xFF) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 0xFF) * f)));
    const b = Math.max(0, Math.min(255, Math.round((hex & 0xFF) * f)));
    return (r << 16) | (g << 8) | b;
}

/**
 * Creates a porcupinefish-style mesh with body, spines, and eyes
 * Supports inflation state: 0 = deflated (streamlined swimmer), 1 = inflated (armored orb)
 */
export function createPorcupinefishMesh(size, color) {
    const group = new THREE.Group();
    
    // Main body - sphere that will be scaled for inflation states
    const bodyGeom = new THREE.SphereGeometry(size, 24, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: darkenRgb(color, 0.75),
        emissive: color,
        emissiveIntensity: 0.5
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    body.name = 'pufferBody';
    group.add(body);
    
    // Glow effect
    const glowGeom = new THREE.SphereGeometry(size * 1.15, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.name = 'pufferGlow';
    group.add(glow);
    
    // Eyes - two small spheres on the front
    const eyeGeom = new THREE.SphereGeometry(size * 0.15, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeom = new THREE.SphereGeometry(size * 0.08, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    
    // Left eye
    const leftEye = new THREE.Group();
    const leftEyeWhite = new THREE.Mesh(eyeGeom, eyeMat);
    const leftPupil = new THREE.Mesh(pupilGeom, pupilMat);
    leftPupil.position.z = size * 0.08;
    leftEye.add(leftEyeWhite);
    leftEye.add(leftPupil);
    leftEye.position.set(-size * 0.4, size * 0.3, size * 0.75);
    leftEye.name = 'leftEye';
    group.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Group();
    const rightEyeWhite = new THREE.Mesh(eyeGeom, eyeMat.clone());
    const rightPupil = new THREE.Mesh(pupilGeom, pupilMat.clone());
    rightPupil.position.z = size * 0.08;
    rightEye.add(rightEyeWhite);
    rightEye.add(rightPupil);
    rightEye.position.set(size * 0.4, size * 0.3, size * 0.75);
    rightEye.name = 'rightEye';
    group.add(rightEye);
    
    // Mouth - small dark ellipse
    const mouthGeom = new THREE.SphereGeometry(size * 0.12, 8, 8);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x331111 });
    const mouth = new THREE.Mesh(mouthGeom, mouthMat);
    mouth.scale.set(1.5, 0.6, 0.5);
    mouth.position.set(0, -size * 0.1, size * 0.9);
    mouth.name = 'mouth';
    group.add(mouth);
    
    // Tail fin - small cone at the back
    const tailGeom = new THREE.ConeGeometry(size * 0.3, size * 0.6, 4);
    const tailMat = new THREE.MeshStandardMaterial({
        color: darkenRgb(color, 0.75),
        emissive: color,
        emissiveIntensity: 0.3
    });
    const tail = new THREE.Mesh(tailGeom, tailMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0, -size * 1.1);
    tail.name = 'tail';
    group.add(tail);
    
    // Side fins - small triangular planes
    const finGeom = new THREE.ConeGeometry(size * 0.25, size * 0.5, 3);
    const finMat = new THREE.MeshStandardMaterial({
        color: darkenRgb(color, 0.75),
        emissive: color,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
    });
    
    const leftFin = new THREE.Mesh(finGeom, finMat);
    leftFin.rotation.z = Math.PI / 2;
    leftFin.rotation.y = -0.3;
    leftFin.position.set(-size * 0.9, 0, size * 0.2);
    leftFin.name = 'leftFin';
    group.add(leftFin);
    
    const rightFin = new THREE.Mesh(finGeom, finMat.clone());
    rightFin.rotation.z = -Math.PI / 2;
    rightFin.rotation.y = 0.3;
    rightFin.position.set(size * 0.9, 0, size * 0.2);
    rightFin.name = 'rightFin';
    group.add(rightFin);
    
    // Spines - distributed using icosahedron vertices for even distribution
    // Create 20 spines (icosahedron has 12 vertices, but we use more for coverage)
    const spineGroup = new THREE.Group();
    spineGroup.name = 'spines';
    
    const spineGeom = new THREE.ConeGeometry(size * 0.08, size * 0.5, 4);
    const spineMat = new THREE.MeshStandardMaterial({
        color: darkenRgb(0xffaa44, 0.75),  // Darkened diffuse for spines
        emissive: 0xff6600,
        emissiveIntensity: 0.3
    });
    
    // Generate spine positions using golden spiral for even distribution
    const spineCount = 24;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for (let i = 0; i < spineCount; i++) {
        const spine = new THREE.Mesh(spineGeom, spineMat.clone());
        
        // Golden spiral distribution on sphere
        const theta = 2 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / spineCount);
        
        // Position on unit sphere
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);
        
        // Place spine at surface
        spine.position.set(x * size, y * size, z * size);
        
        // Point outward from center
        spine.lookAt(spine.position.clone().multiplyScalar(2));
        spine.rotateX(Math.PI / 2);  // Cone points outward
        
        // Store base scale for animation
        spine.userData.baseScale = 1.0;
        spine.userData.index = i;
        
        // Start hidden (deflated state)
        spine.scale.set(0.1, 0.1, 0.1);
        spine.visible = false;
        
        spineGroup.add(spine);
    }
    
    group.add(spineGroup);
    
    // Dorsal fin (top ridge) - visible in deflated state
    const dorsalGeom = new THREE.ConeGeometry(size * 0.15, size * 0.4, 3);
    const dorsalMat = new THREE.MeshStandardMaterial({
        color: darkenRgb(color, 0.75),
        emissive: color,
        emissiveIntensity: 0.4
    });
    
    const dorsalGroup = new THREE.Group();
    dorsalGroup.name = 'dorsalFin';
    for (let i = 0; i < 3; i++) {
        const dorsal = new THREE.Mesh(dorsalGeom, dorsalMat.clone());
        dorsal.position.set(0, size * 0.8, -size * 0.3 + i * size * 0.3);
        dorsal.scale.set(1, 1 - i * 0.2, 1);
        dorsalGroup.add(dorsal);
    }
    group.add(dorsalGroup);
    
    // Store references for easy access
    group.pufferBody = body;
    group.pufferBodyMat = bodyMat;
    group.pufferGlow = glow;
    group.pufferSpines = spineGroup;
    group.pufferEyes = [leftEye, rightEye];
    group.pufferTail = tail;
    group.pufferFins = [leftFin, rightFin];
    group.pufferDorsal = dorsalGroup;
    
    return group;
}

/**
 * Creates Shieldfather (crab) mesh for Arena 2 boss
 */
export function createShieldfatherMesh(size, color) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
        color: darkenRgb(color, 0.75),
        emissive: color,
        emissiveIntensity: 0.5
    });

    // Main body (carapace) - wide, flattened sphere
    const bodyGeom = new THREE.SphereGeometry(size, 20, 20);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.scale.set(1.4, 0.6, 1.55);
    body.castShadow = true;
    body.name = 'crabBody';
    body.userData.basePosition = body.position.clone();
    group.add(body);

    // Glow halo
    const glowGeom = new THREE.SphereGeometry(size * 1.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.scale.copy(body.scale);
    glow.name = 'crabGlow';
    glow.userData.basePosition = glow.position.clone();
    group.add(glow);

    // Eyes + stalks
    const stalkGeom = new THREE.ConeGeometry(size * 0.12, size * 0.8, 6);
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
    const eyeGeom = new THREE.SphereGeometry(size * 0.16, 10, 10);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftStalk = new THREE.Mesh(stalkGeom, stalkMat);
    leftStalk.position.set(-size * 0.55, size * 0.65, size * 0.8);
    leftStalk.name = 'leftEyeStalk';
    group.add(leftStalk);
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-size * 0.55, size * 1.0, size * 0.85);
    leftEye.name = 'leftEye';
    group.add(leftEye);

    const rightStalk = new THREE.Mesh(stalkGeom, stalkMat);
    rightStalk.position.set(size * 0.55, size * 0.65, size * 0.8);
    rightStalk.name = 'rightEyeStalk';
    group.add(rightStalk);
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat.clone());
    rightEye.position.set(size * 0.55, size * 1.0, size * 0.85);
    rightEye.name = 'rightEye';
    group.add(rightEye);

    // Mouth
    const mouthGeom = new THREE.SphereGeometry(size * 0.18, 10, 10);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x221111 });
    const mouth = new THREE.Mesh(mouthGeom, mouthMat);
    mouth.scale.set(1.8, 0.6, 0.6);
    mouth.position.set(0, -size * 0.1, size * 1.0);
    mouth.name = 'mouth';
    group.add(mouth);

    // Mega claws
    const clawGeom = new THREE.SphereGeometry(size * 0.75, 12, 12);
    const clawMat = new THREE.MeshStandardMaterial({
        color: darkenRgb(color, 0.75),
        emissive: color,
        emissiveIntensity: 0.4
    });
    const leftClaw = new THREE.Mesh(clawGeom, clawMat);
    leftClaw.scale.set(1.6, 0.6, 1.0);
    leftClaw.position.set(-size * 1.6, size * 0.05, size * 0.7);
    leftClaw.name = 'leftClaw';
    leftClaw.userData.baseScale = leftClaw.scale.clone();
    leftClaw.userData.basePosition = leftClaw.position.clone();
    group.add(leftClaw);

    const rightClaw = new THREE.Mesh(clawGeom, clawMat.clone());
    rightClaw.scale.set(1.6, 0.6, 1.0);
    rightClaw.position.set(size * 1.6, size * 0.05, size * 0.7);
    rightClaw.name = 'rightClaw';
    rightClaw.userData.baseScale = rightClaw.scale.clone();
    rightClaw.userData.basePosition = rightClaw.position.clone();
    group.add(rightClaw);

    // Claw tips (cones)
    const tipGeom = new THREE.ConeGeometry(size * 0.2, size * 0.6, 6);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xffddaa });
    const leftTip = new THREE.Mesh(tipGeom, tipMat);
    leftTip.rotation.x = Math.PI / 2;
    leftTip.position.set(-size * 2.25, size * 0.05, size * 0.9);
    leftTip.name = 'leftClawTip';
    group.add(leftTip);
    const rightTip = new THREE.Mesh(tipGeom, tipMat.clone());
    rightTip.rotation.x = Math.PI / 2;
    rightTip.position.set(size * 2.25, size * 0.05, size * 0.9);
    rightTip.name = 'rightClawTip';
    group.add(rightTip);

    // Legs - 6 cones angled outward
    const legGeom = new THREE.ConeGeometry(size * 0.12, size * 0.7, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222233 });
    const legsGroup = new THREE.Group();
    legsGroup.name = 'legs';
    const legOffsets = [
        { x: -1.3, z: 0.2, rotZ: 0.7 },
        { x: -1.1, z: -0.4, rotZ: 0.6 },
        { x: -0.9, z: -0.9, rotZ: 0.5 },
        { x: 1.3, z: 0.2, rotZ: -0.7 },
        { x: 1.1, z: -0.4, rotZ: -0.6 },
        { x: 0.9, z: -0.9, rotZ: -0.5 }
    ];
    legOffsets.forEach((offset, index) => {
        const leg = new THREE.Mesh(legGeom, legMat);
        leg.position.set(size * offset.x, -size * 0.2, size * offset.z);
        leg.rotation.x = Math.PI / 2;
        leg.rotation.z = offset.rotZ;
        leg.name = `leg_${index}`;
        legsGroup.add(leg);
    });
    group.add(legsGroup);

    // Anemone crown
    const crownGroup = new THREE.Group();
    crownGroup.name = 'anemoneCrown';
    const crownBaseGeom = new THREE.SphereGeometry(size * 0.35, 10, 10);
    const crownBaseMat = new THREE.MeshStandardMaterial({
        color: 0x6688ff,
        emissive: 0x4466ff,
        emissiveIntensity: 0.8
    });
    const crownBase = new THREE.Mesh(crownBaseGeom, crownBaseMat);
    crownBase.position.set(0, size * 0.8, -size * 0.05);
    crownBase.name = 'anemoneBase';
    crownBase.userData.basePosition = crownBase.position.clone();
    crownGroup.add(crownBase);

    const tendrilGeom = new THREE.ConeGeometry(size * 0.12, size * 0.8, 7);
    const tendrilMat = new THREE.MeshStandardMaterial({
        color: 0x6688ff,
        emissive: 0x4466ff,
        emissiveIntensity: 0.9
    });
    const crownOffsets = [
        { x: -0.2, z: 0.05, rotZ: 0.25 },
        { x: 0.2, z: 0.05, rotZ: -0.25 },
        { x: 0.0, z: 0.25, rotZ: 0.0 },
        { x: 0.0, z: -0.15, rotZ: 0.1 }
    ];
    crownOffsets.forEach((offset, index) => {
        const tendril = new THREE.Mesh(tendrilGeom, tendrilMat.clone());
        tendril.position.set(size * offset.x, size * 1.2, size * offset.z);
        tendril.rotation.z = offset.rotZ;
        tendril.name = `anemoneTendril_${index}`;
        tendril.userData.baseScale = tendril.scale.clone();
        tendril.userData.basePosition = tendril.position.clone();
        crownGroup.add(tendril);
    });
    group.add(crownGroup);

    // Store references for animation
    group.crabBody = body;
    group.crabBodyMat = bodyMat;
    group.crabGlow = glow;
    group.leftClaw = leftClaw;
    group.rightClaw = rightClaw;
    group.anemoneCrown = crownGroup;
    group.legs = legsGroup;

    return group;
}
