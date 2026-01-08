import * as THREE from 'three';

let isPlaying = false;
let startTime = 0;
let vrmRef = null;
let onCompleteCallback = null;

const WAVE_DURATION = 2.5;
const WAVE_CYCLES = 4;

export function startWave(vrm, onComplete = null) {
    if (!vrm || !vrm.humanoid) return;

    vrmRef = vrm;
    isPlaying = true;
    startTime = -1;
    onCompleteCallback = onComplete;
}

export function stopWave() {
    isPlaying = false;
    vrmRef = null;
    onCompleteCallback = null;
}

export function isWavePlaying() {
    return isPlaying;
}

export function updateWave(time, delta) {
    if (!isPlaying || !vrmRef) return;

    if (startTime < 0) {
        startTime = time;
    }

    const elapsed = time - startTime;
    const progress = Math.min(elapsed / WAVE_DURATION, 1.0);

    const waveFreq = (WAVE_CYCLES * 2 * Math.PI) / WAVE_DURATION;
    const waveIntensity = Math.sin(progress * Math.PI);
    const waveAngle = Math.sin(elapsed * waveFreq) * 0.4 * waveIntensity;

    const rightUpperArm = vrmRef.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = vrmRef.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = vrmRef.humanoid.getNormalizedBoneNode('rightHand');
    const leftUpperLeg = vrmRef.humanoid.getNormalizedBoneNode('leftUpperLeg');
    const leftLowerLeg = vrmRef.humanoid.getNormalizedBoneNode('leftLowerLeg');
    const head = vrmRef.humanoid.getNormalizedBoneNode('head');

    if (rightUpperArm) {
        rightUpperArm.rotation.set(
            THREE.MathUtils.lerp(0, -1.5, waveIntensity),
            THREE.MathUtils.lerp(0, 0.3, waveIntensity),
            THREE.MathUtils.lerp(-1.2, -0.5, waveIntensity)
        );
    }

    if (rightLowerArm) {
        rightLowerArm.rotation.set(
            THREE.MathUtils.lerp(0, 0, waveIntensity),
            THREE.MathUtils.lerp(0, -1.8, waveIntensity),
            THREE.MathUtils.lerp(-0.1, 0, waveIntensity)
        );
    }

    if (rightHand) {
        rightHand.rotation.set(
            THREE.MathUtils.lerp(0, -1.9, waveIntensity),
            waveAngle,
            THREE.MathUtils.lerp(0, 0, waveIntensity)
        );
    }

    const fingerBones = [
        'rightThumbProximal',
        'rightIndexProximal',
        'rightMiddleProximal',
        'rightRingProximal',
        'rightLittleProximal'
    ];

    fingerBones.forEach((boneName, index) => {
        const finger = vrmRef.humanoid.getNormalizedBoneNode(boneName);
        if (finger) {
            const spreadAmount = 0.08 * (index - 2);
            finger.rotation.z = THREE.MathUtils.lerp(0, spreadAmount, waveIntensity);
        }
    });

    if (leftUpperLeg) {
        leftUpperLeg.rotation.x = THREE.MathUtils.lerp(0, 0.3, waveIntensity);
        leftUpperLeg.rotation.z = THREE.MathUtils.lerp(0, 0.1, waveIntensity);
    }

    if (leftLowerLeg) {
        leftLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -0.8, waveIntensity);
    }

    if (head) {
        head.rotation.z = THREE.MathUtils.lerp(0, 0.15, waveIntensity);
    }

    if (vrmRef.expressionManager) {
        vrmRef.expressionManager.setValue('happy', waveIntensity * 0.8);
    }

    if (progress >= 1.0) {
        resetBones();
        isPlaying = false;
        if (onCompleteCallback) {
            onCompleteCallback();
        }
    }
}

function resetBones() {
    if (!vrmRef || !vrmRef.humanoid) return;

    const rightUpperArm = vrmRef.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = vrmRef.humanoid.getNormalizedBoneNode('rightLowerArm');
    const rightHand = vrmRef.humanoid.getNormalizedBoneNode('rightHand');
    const leftUpperLeg = vrmRef.humanoid.getNormalizedBoneNode('leftUpperLeg');
    const leftLowerLeg = vrmRef.humanoid.getNormalizedBoneNode('leftLowerLeg');
    const head = vrmRef.humanoid.getNormalizedBoneNode('head');

    if (rightUpperArm) rightUpperArm.rotation.set(0, 0, -1.2);
    if (rightLowerArm) rightLowerArm.rotation.set(0, 0, -0.1);
    if (rightHand) rightHand.rotation.set(0, 0, 0);
    if (leftUpperLeg) leftUpperLeg.rotation.set(0, 0, 0);
    if (leftLowerLeg) leftLowerLeg.rotation.set(0, 0, 0);
    if (head) head.rotation.z = 0;

    const fingerBones = [
        'rightThumbProximal', 'rightIndexProximal',
        'rightMiddleProximal', 'rightRingProximal', 'rightLittleProximal'
    ];
    fingerBones.forEach((boneName) => {
        const finger = vrmRef.humanoid.getNormalizedBoneNode(boneName);
        if (finger) finger.rotation.z = 0;
    });

    if (vrmRef.expressionManager) {
        vrmRef.expressionManager.setValue('happy', 0);
    }
}
