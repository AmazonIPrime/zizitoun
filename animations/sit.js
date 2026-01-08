import * as THREE from 'three';

let isSitting = false;
let transitionProgress = 0;
let vrmRef = null;
let sitDirection = 'left';
let sitTime = 0;

let currentPose = 'NEUTRAL';
let poseTimer = 0;
let nextPoseChange = 5;
let wavePhase = 0;

let isLegSwinging = false;
let legSwingPhase = 0;
let legSwingBlend = 0;
const LEG_SWING_TRANSITION = 0.5;

const TRANSITION_DURATION = 0.5;
const POSE_TRANSITION = 0.8;
let poseBlend = 0;
let targetPose = 'NEUTRAL';

export function startSit(vrm, direction = 'left') {
    if (!vrm || !vrm.humanoid) return;
    vrmRef = vrm;
    isSitting = true;
    sitDirection = direction;
    transitionProgress = 0;
    sitTime = 0;
    currentPose = 'NEUTRAL';
    targetPose = 'NEUTRAL';
    poseBlend = 1;
    scheduleNextPose();
}

export function stopSit() {
    isSitting = false;
    transitionProgress = 1;
}

export function isSittingNow() {
    return isSitting && transitionProgress >= 1;
}

export function triggerLegSwing() {
    if (isSitting) {
        isLegSwinging = !isLegSwinging;
    }
}

export function isInTransition() {
    return (isSitting && transitionProgress < 1) || (!isSitting && transitionProgress > 0);
}

function scheduleNextPose() {
    nextPoseChange = 60 + Math.random() * 240;
    poseTimer = 0;
}

function pickRandomPose() {
    const poses = ['NEUTRAL', 'CROSSED_ARMS', 'WAVE'];
    let newPose;
    do {
        newPose = poses[Math.floor(Math.random() * poses.length)];
    } while (newPose === currentPose && Math.random() > 0.3);
    return newPose;
}

export function updateSit(delta) {
    if (!vrmRef) return;

    if (isSitting) {
        transitionProgress = Math.min(transitionProgress + delta / TRANSITION_DURATION, 1);
        sitTime += delta;

        poseTimer += delta;
        if (poseTimer >= nextPoseChange && poseBlend >= 1) {
            targetPose = pickRandomPose();
            if (targetPose !== currentPose) {
                poseBlend = 0;
            }
            scheduleNextPose();
        }

        if (poseBlend < 1) {
            poseBlend = Math.min(poseBlend + delta / POSE_TRANSITION, 1);
            if (poseBlend >= 1) {
                currentPose = targetPose;
            }
        }

        if (targetPose === 'WAVE' || currentPose === 'WAVE') {
            wavePhase += delta * 8;
        }

        if (isLegSwinging) {
            legSwingPhase += delta * 3;
            legSwingBlend = Math.min(legSwingBlend + delta / LEG_SWING_TRANSITION, 1);
        } else {
            legSwingBlend = Math.max(legSwingBlend - delta / LEG_SWING_TRANSITION, 0);
        }
    } else {
        transitionProgress = Math.max(transitionProgress - delta / TRANSITION_DURATION, 0);
        isLegSwinging = false;
        legSwingBlend = 0;
    }

    if (transitionProgress <= 0 && !isSitting) {
        vrmRef = null;
        return;
    }

    const t = easeInOutQuad(transitionProgress);
    const dir = sitDirection === 'left' ? 1 : -1;
    applyPose(t, dir, sitTime, poseBlend);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function applyPose(t, dir, time, blend) {
    if (!vrmRef || !vrmRef.humanoid) return;

    const idleIntensity = t;

    const headLookX = (Math.sin(time * 0.3) * 0.2 + Math.sin(time * 0.7) * 0.1) * idleIntensity;
    const headLookY = (Math.sin(time * 0.2) * 0.3 + Math.cos(time * 0.5) * 0.15) * idleIntensity;
    const headTilt = Math.sin(time * 0.25) * 0.12 * idleIntensity;

    const breathe = Math.sin(time * 2.0) * 0.02 * idleIntensity;
    const legSwing = Math.sin(time * 0.5) * 0.08 * idleIntensity;

    const hips = vrmRef.humanoid.getNormalizedBoneNode('hips');
    const spine = vrmRef.humanoid.getNormalizedBoneNode('spine');
    const chest = vrmRef.humanoid.getNormalizedBoneNode('chest');

    const leftUpperLeg = vrmRef.humanoid.getNormalizedBoneNode('leftUpperLeg');
    const leftLowerLeg = vrmRef.humanoid.getNormalizedBoneNode('leftLowerLeg');
    const rightUpperLeg = vrmRef.humanoid.getNormalizedBoneNode('rightUpperLeg');
    const rightLowerLeg = vrmRef.humanoid.getNormalizedBoneNode('rightLowerLeg');

    const leftUpperArm = vrmRef.humanoid.getNormalizedBoneNode('leftUpperArm');
    const leftLowerArm = vrmRef.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightUpperArm = vrmRef.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = vrmRef.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = vrmRef.humanoid.getNormalizedBoneNode('rightHand');

    const head = vrmRef.humanoid.getNormalizedBoneNode('head');

    if (hips) hips.rotation.x = THREE.MathUtils.lerp(0, -0.2, t);
    if (spine) spine.rotation.x = THREE.MathUtils.lerp(0, 0.1 + breathe, t);
    if (chest) chest.rotation.x = THREE.MathUtils.lerp(0, 0.05 + breathe * 0.5, t);

    let leftLegSwingOffset = legSwing;
    let rightLegSwingOffset = -legSwing;

    if (legSwingBlend > 0) {
        const enhancedSwing = Math.sin(legSwingPhase) * 0.35 * idleIntensity * legSwingBlend;
        const altSwing = Math.sin(legSwingPhase + Math.PI * 0.7) * 0.35 * idleIntensity * legSwingBlend;
        leftLegSwingOffset = THREE.MathUtils.lerp(legSwing, enhancedSwing, legSwingBlend);
        rightLegSwingOffset = THREE.MathUtils.lerp(-legSwing, altSwing, legSwingBlend);
    }

    if (leftUpperLeg) {
        leftUpperLeg.rotation.x = THREE.MathUtils.lerp(0, 1.4, t);
        leftUpperLeg.rotation.z = THREE.MathUtils.lerp(0, 0.05, t);
    }
    if (leftLowerLeg) leftLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -1.2 + leftLegSwingOffset, t);
    if (rightUpperLeg) {
        rightUpperLeg.rotation.x = THREE.MathUtils.lerp(0, 1.4, t);
        rightUpperLeg.rotation.z = THREE.MathUtils.lerp(0, -0.05, t);
    }
    if (rightLowerLeg) rightLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -1.2 + rightLegSwingOffset, t);

    const easeBlend = easeInOutQuad(blend);

    let armValues = getArmValues(targetPose, time, t);

    if (blend < 1) {
        const currentValues = getArmValues(currentPose, time, t);
        armValues = lerpArmValues(currentValues, armValues, easeBlend);
    }

    if (leftUpperArm) {
        leftUpperArm.rotation.z = armValues.leftUpperZ;
        leftUpperArm.rotation.x = armValues.leftUpperX;
        leftUpperArm.rotation.y = armValues.leftUpperY;
    }
    if (leftLowerArm) {
        leftLowerArm.rotation.y = armValues.leftLowerY;
    }
    if (rightUpperArm) {
        rightUpperArm.rotation.z = armValues.rightUpperZ;
        rightUpperArm.rotation.x = armValues.rightUpperX;
        rightUpperArm.rotation.y = armValues.rightUpperY;
    }
    if (rightLowerArm) {
        rightLowerArm.rotation.y = armValues.rightLowerY;
    }
    if (rightHand) {
        rightHand.rotation.y = armValues.rightHandY;
        rightHand.rotation.x = armValues.rightHandX;
    }

    if (head) {
        let extraHeadY = 0;
        let extraHeadTilt = 0;

        if (targetPose === 'WAVE') {
            extraHeadTilt = 0.15 * easeBlend * t;
        }

        head.rotation.x = THREE.MathUtils.lerp(0, 0.1 + headLookX, t);
        head.rotation.y = headLookY + extraHeadY;
        head.rotation.z = THREE.MathUtils.lerp(0, dir * 0.05 + headTilt + extraHeadTilt, t);
    }

    if (vrmRef.expressionManager) {
        const waveSmile = (targetPose === 'WAVE' ? 0.7 * easeBlend : 0);
        vrmRef.expressionManager.setValue('happy', waveSmile * t);
    }
}

function getArmValues(pose, time, t) {
    const values = {
        leftUpperZ: 1.2 * t,
        leftUpperX: 0,
        leftUpperY: 0,
        leftLowerY: 0,
        rightUpperZ: -1.2 * t,
        rightUpperX: 0,
        rightUpperY: 0,
        rightLowerY: 0,
        rightHandY: 0,
        rightHandX: 0
    };

    if (pose === 'NEUTRAL') {
        values.leftUpperZ = THREE.MathUtils.lerp(1.2, 1.0, t);
        values.leftUpperX = THREE.MathUtils.lerp(0, 0.1, t);
        values.leftLowerY = THREE.MathUtils.lerp(0, 0.2, t);
        values.rightUpperZ = THREE.MathUtils.lerp(-1.2, -1.0, t);
        values.rightUpperX = THREE.MathUtils.lerp(0, 0.1, t);
        values.rightLowerY = THREE.MathUtils.lerp(0, -0.2, t);
    } else if (pose === 'CROSSED_ARMS') {
        values.leftUpperZ = THREE.MathUtils.lerp(1.2, 1.3, t);
        values.leftUpperX = THREE.MathUtils.lerp(0, 0.8, t);
        values.leftUpperY = THREE.MathUtils.lerp(0, 0.4, t);
        values.leftLowerY = THREE.MathUtils.lerp(0, 1.5, t);
        values.rightUpperZ = THREE.MathUtils.lerp(-1.2, -1.3, t);
        values.rightUpperX = THREE.MathUtils.lerp(0, 0.8, t);
        values.rightUpperY = THREE.MathUtils.lerp(0, -0.4, t);
        values.rightLowerY = THREE.MathUtils.lerp(0, -1.5, t);
    } else if (pose === 'WAVE') {
        values.leftUpperZ = THREE.MathUtils.lerp(1.2, 1.0, t);
        values.leftUpperX = THREE.MathUtils.lerp(0, 0.1, t);
        values.leftLowerY = THREE.MathUtils.lerp(0, 0.2, t);

        values.rightUpperZ = THREE.MathUtils.lerp(-1.2, -0.5, t);
        values.rightUpperX = THREE.MathUtils.lerp(0, -1.5, t);
        values.rightUpperY = THREE.MathUtils.lerp(0, 0.3, t);
        values.rightLowerY = THREE.MathUtils.lerp(0, -1.8, t);
        values.rightHandY = Math.sin(wavePhase) * 0.5 * t;
        values.rightHandX = THREE.MathUtils.lerp(0, -1.9, t);
    }

    return values;
}

function lerpArmValues(a, b, t) {
    const result = {};
    for (const key in a) {
        result[key] = THREE.MathUtils.lerp(a[key], b[key], t);
    }
    return result;
}

export function getSitYOffset() {
    return isSitting ? 0.3 : 0;
}
