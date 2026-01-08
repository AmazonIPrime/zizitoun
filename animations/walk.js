import * as THREE from 'three';

let isWalking = false;
let transitionProgress = 0;
let vrmRef = null;
let walkTime = 0;
let walkSpeed = 3.0;

const TRANSITION_DURATION = 0.3;

export function startWalk(vrm) {
    if (!vrm || !vrm.humanoid) return;
    vrmRef = vrm;
    isWalking = true;
    transitionProgress = 0;
    walkTime = 0;
}

export function stopWalk() {
    isWalking = false;
    transitionProgress = 1;
}

export function isWalkingNow() {
    return isWalking && transitionProgress >= 1;
}

export function updateWalk(delta, speedMultiplier = 1.0) {
    if (!vrmRef) return;

    if (isWalking) {
        transitionProgress = Math.min(transitionProgress + delta / TRANSITION_DURATION, 1);
        walkTime += delta * walkSpeed * speedMultiplier;
    } else {
        transitionProgress = Math.max(transitionProgress - delta / TRANSITION_DURATION, 0);
        walkTime += delta * walkSpeed * speedMultiplier;
    }

    if (transitionProgress <= 0 && !isWalking) {
        vrmRef = null;
        return;
    }

    const t = easeInOutQuad(transitionProgress);
    applyWalkPose(t, walkTime, speedMultiplier);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function applyWalkPose(t, time, speedMult) {
    if (!vrmRef || !vrmRef.humanoid) return;

    const clampedSpeed = Math.max(0.5, speedMult);
    const legAmp = 0.3 * clampedSpeed;
    const armAmp = 0.15 * clampedSpeed;

    const leftLegAngle = Math.sin(time) * legAmp;
    const rightLegAngle = Math.sin(time + Math.PI) * legAmp;

    const leftKneeBend = Math.max(0, Math.sin(time + Math.PI * 0.5)) * 0.8;
    const rightKneeBend = Math.max(0, Math.sin(time + Math.PI * 1.5)) * 0.8;

    const leftArmAngle = Math.sin(time + Math.PI) * armAmp;
    const rightArmAngle = Math.sin(time) * armAmp;

    const hipBob = Math.sin(time * 2) * 0.05;

    const hips = vrmRef.humanoid.getNormalizedBoneNode('hips');
    const spine = vrmRef.humanoid.getNormalizedBoneNode('spine');

    const leftUpperLeg = vrmRef.humanoid.getNormalizedBoneNode('leftUpperLeg');
    const leftLowerLeg = vrmRef.humanoid.getNormalizedBoneNode('leftLowerLeg');
    const rightUpperLeg = vrmRef.humanoid.getNormalizedBoneNode('rightUpperLeg');
    const rightLowerLeg = vrmRef.humanoid.getNormalizedBoneNode('rightLowerLeg');

    const leftUpperArm = vrmRef.humanoid.getNormalizedBoneNode('leftUpperArm');
    const leftLowerArm = vrmRef.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightUpperArm = vrmRef.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = vrmRef.humanoid.getNormalizedBoneNode('rightLowerArm');

    if (hips) {
        hips.rotation.z = Math.sin(time) * 0.05 * t;
    }

    if (leftUpperLeg) {
        leftUpperLeg.rotation.x = THREE.MathUtils.lerp(0, leftLegAngle, t);
    }
    if (leftLowerLeg) {
        leftLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -leftKneeBend, t);
    }

    if (rightUpperLeg) {
        rightUpperLeg.rotation.x = THREE.MathUtils.lerp(0, rightLegAngle, t);
    }
    if (rightLowerLeg) {
        rightLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -rightKneeBend, t);
    }

    if (leftUpperArm) {
        leftUpperArm.rotation.x = THREE.MathUtils.lerp(0, leftArmAngle, t);
        leftUpperArm.rotation.z = THREE.MathUtils.lerp(1.2, 1.3, t);
    }
    if (leftLowerArm) {
        leftLowerArm.rotation.x = THREE.MathUtils.lerp(0, 0.2, t);
    }

    if (rightUpperArm) {
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(0, rightArmAngle, t);
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(-1.2, -1.3, t);
    }
    if (rightLowerArm) {
        rightLowerArm.rotation.x = THREE.MathUtils.lerp(0, 0.2, t);
    }
}
