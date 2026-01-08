export const IDLE_POSE = {
    leftUpperArm: { x: 0, y: 0, z: 1.2 },
    rightUpperArm: { x: 0, y: 0, z: -1.2 },
    leftLowerArm: { x: 0, y: 0, z: 0.1 },
    rightLowerArm: { x: 0, y: 0, z: -0.1 },
    leftHand: { x: 0, y: 0, z: 0 },
    rightHand: { x: 0, y: 0, z: 0 },
    leftShoulder: { x: 0, y: 0, z: 0.05 },
    rightShoulder: { x: 0, y: 0, z: -0.05 }
};

export function applyIdlePose(vrm) {
    if (!vrm || !vrm.humanoid) return;

    const boneMap = {
        'leftUpperArm': IDLE_POSE.leftUpperArm,
        'rightUpperArm': IDLE_POSE.rightUpperArm,
        'leftLowerArm': IDLE_POSE.leftLowerArm,
        'rightLowerArm': IDLE_POSE.rightLowerArm,
        'leftHand': IDLE_POSE.leftHand,
        'rightHand': IDLE_POSE.rightHand,
        'leftShoulder': IDLE_POSE.leftShoulder,
        'rightShoulder': IDLE_POSE.rightShoulder
    };

    for (const [boneName, rotation] of Object.entries(boneMap)) {
        const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
        if (bone) {
            bone.rotation.x = rotation.x;
            bone.rotation.y = rotation.y;
            bone.rotation.z = rotation.z;
        }
    }
}

export function resetToTPose(vrm) {
    if (!vrm || !vrm.humanoid) return;

    const armBones = [
        'leftUpperArm', 'rightUpperArm',
        'leftLowerArm', 'rightLowerArm',
        'leftHand', 'rightHand',
        'leftShoulder', 'rightShoulder'
    ];

    for (const boneName of armBones) {
        const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
        if (bone) {
            bone.rotation.set(0, 0, 0);
        }
    }
}
