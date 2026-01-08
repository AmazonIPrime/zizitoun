import * as THREE from 'three';

let isPlaying = false;
let startTime = 0;
let vrmRef = null;
let onCompleteCallback = null;

const YAWN_DURATION = 3.5;

export function startYawn(vrm, onComplete = null) {
    if (!vrm || !vrm.humanoid) return;

    vrmRef = vrm;
    isPlaying = true;
    startTime = -1;
    onCompleteCallback = onComplete;
}

export function stopYawn() {
    isPlaying = false;
    vrmRef = null;
    onCompleteCallback = null;
}

export function isYawnPlaying() {
    return isPlaying;
}

export function updateYawn(time, delta) {
    if (!isPlaying || !vrmRef) return;

    if (startTime < 0) {
        startTime = time;
    }

    const elapsed = time - startTime;
    const progress = Math.min(elapsed / YAWN_DURATION, 1.0);

    let intensity;
    if (progress < 0.3) {
        intensity = progress / 0.3;
    } else if (progress < 0.7) {
        intensity = 1.0;
    } else {
        intensity = 1.0 - ((progress - 0.7) / 0.3);
    }

    const easeIntensity = easeInOutQuad(intensity);

    const head = vrmRef.humanoid.getNormalizedBoneNode('head');
    const neck = vrmRef.humanoid.getNormalizedBoneNode('neck');
    const spine = vrmRef.humanoid.getNormalizedBoneNode('spine');
    const chest = vrmRef.humanoid.getNormalizedBoneNode('chest');

    const leftUpperArm = vrmRef.humanoid.getNormalizedBoneNode('leftUpperArm');
    const leftLowerArm = vrmRef.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightUpperArm = vrmRef.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = vrmRef.humanoid.getNormalizedBoneNode('rightLowerArm');

    if (head) {
        head.rotation.x = THREE.MathUtils.lerp(0, 0.5, easeIntensity);
        head.rotation.z = THREE.MathUtils.lerp(0, 0.05, easeIntensity);
    }

    if (neck) {
        neck.rotation.x = THREE.MathUtils.lerp(0, -0.2, easeIntensity);
    }

    if (spine) {
        spine.rotation.x = THREE.MathUtils.lerp(0, -0.1, easeIntensity);
    }

    if (chest) {
        chest.rotation.x = THREE.MathUtils.lerp(0, -0.15, easeIntensity);
    }

    if (leftUpperArm) {
        leftUpperArm.rotation.x = THREE.MathUtils.lerp(0, 0.8, easeIntensity);
        leftUpperArm.rotation.z = THREE.MathUtils.lerp(1.2, 0.2, easeIntensity);
        leftUpperArm.rotation.y = THREE.MathUtils.lerp(0, -1.0, easeIntensity);
    }

    if (leftLowerArm) {
        leftLowerArm.rotation.y = THREE.MathUtils.lerp(0, -1.8, easeIntensity);
        leftLowerArm.rotation.z = THREE.MathUtils.lerp(0, 0.5, easeIntensity);
    }

    const leftHand = vrmRef.humanoid.getNormalizedBoneNode('leftHand');
    if (leftHand) {
        leftHand.rotation.x = THREE.MathUtils.lerp(0, 1.5, easeIntensity);
        leftHand.rotation.y = THREE.MathUtils.lerp(0, 0, easeIntensity);
        leftHand.rotation.z = THREE.MathUtils.lerp(0, -0.2, easeIntensity);
    }

    if (rightUpperArm) {
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(0, 0.2, easeIntensity);
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(-1.2, -1.3, easeIntensity);
        rightUpperArm.rotation.y = THREE.MathUtils.lerp(0, 0.1, easeIntensity);
    }

    if (rightLowerArm) {
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(0, -0.2, easeIntensity);
        rightLowerArm.rotation.z = THREE.MathUtils.lerp(0, 0, easeIntensity);
    }

    const rightHand = vrmRef.humanoid.getNormalizedBoneNode('rightHand');
    if (rightHand) {
        rightHand.rotation.x = THREE.MathUtils.lerp(0, 0, easeIntensity);
        rightHand.rotation.y = THREE.MathUtils.lerp(0, 0, easeIntensity);
        rightHand.rotation.z = THREE.MathUtils.lerp(0, 0, easeIntensity);
    }

    if (vrmRef.expressionManager) {
        vrmRef.expressionManager.setValue('blink', easeIntensity * 0.95);
        vrmRef.expressionManager.setValue('aa', easeIntensity * 1.0);
        vrmRef.expressionManager.setValue('relaxed', easeIntensity * 0.5);
    }

    if (progress >= 1.0) {
        resetBones();
        isPlaying = false;
        if (onCompleteCallback) {
            onCompleteCallback();
        }
    }
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function resetBones() {
    if (!vrmRef || !vrmRef.humanoid) return;

    const head = vrmRef.humanoid.getNormalizedBoneNode('head');
    const neck = vrmRef.humanoid.getNormalizedBoneNode('neck');
    const spine = vrmRef.humanoid.getNormalizedBoneNode('spine');
    const chest = vrmRef.humanoid.getNormalizedBoneNode('chest');
    const leftUpperArm = vrmRef.humanoid.getNormalizedBoneNode('leftUpperArm');
    const leftLowerArm = vrmRef.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightUpperArm = vrmRef.humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = vrmRef.humanoid.getNormalizedBoneNode('rightLowerArm');

    if (head) head.rotation.set(0, 0, 0);
    if (neck) neck.rotation.set(0, 0, 0);
    if (spine) spine.rotation.set(0, 0, 0);
    if (chest) chest.rotation.set(0, 0, 0);
    if (leftUpperArm) leftUpperArm.rotation.set(0, 0, 1.2);
    if (leftLowerArm) leftLowerArm.rotation.set(0, 0, 0.1);
    if (rightUpperArm) rightUpperArm.rotation.set(0, 0, -1.2);
    if (rightLowerArm) rightLowerArm.rotation.set(0, 0, -0.1);

    if (vrmRef.expressionManager) {
        vrmRef.expressionManager.setValue('blink', 0);
        vrmRef.expressionManager.setValue('aa', 0);
        vrmRef.expressionManager.setValue('relaxed', 0);
    }
}
