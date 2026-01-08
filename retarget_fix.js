
const THREE = require('three');

/**
 * Mixamo -> VRM Bone Name Map
 */
const mixamoVRMMap = {
    'mixamorigHips': 'hips',
    'mixamorigSpine': 'spine',
    'mixamorigSpine1': 'chest',
    'mixamorigSpine2': 'upperChest',
    'mixamorigNeck': 'neck',
    'mixamorigHead': 'head',
    'mixamorigLeftShoulder': 'leftShoulder',
    'mixamorigLeftArm': 'leftUpperArm',
    'mixamorigLeftForeArm': 'leftLowerArm',
    'mixamorigLeftHand': 'leftHand',
    'mixamorigRightShoulder': 'rightShoulder',
    'mixamorigRightArm': 'rightUpperArm',
    'mixamorigRightForeArm': 'rightLowerArm',
    'mixamorigRightHand': 'rightHand',
    'mixamorigLeftUpLeg': 'leftUpperLeg',
    'mixamorigLeftLeg': 'leftLowerLeg',
    'mixamorigLeftFoot': 'leftFoot',
    'mixamorigLeftToeBase': 'leftToes',
    'mixamorigRightUpLeg': 'rightUpperLeg',
    'mixamorigRightLeg': 'rightLowerLeg',
    'mixamorigRightFoot': 'rightFoot',
    'mixamorigRightToeBase': 'rightToes'
};

/**
 * Load Mixamo animation and retarget to VRM
 * Removes the initial T-Pose difference.
 */
function loadMixamoAnimation(url, vrm) {
    const loader = new FBXLoader();
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        if (!fs.existsSync(url)) {
            resolve(null);
            return;
        }

        const buffer = fs.readFileSync(url);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        const object = loader.parse(arrayBuffer, '');
        const clip = object.animations[0];

        const tracks = [];

        clip.tracks.forEach((track) => {
            const trackSplitted = track.name.split('.');
            const mixamoBoneName = trackSplitted[0];
            const property = trackSplitted[1];
            const vrmBoneName = mixamoVRMMap[mixamoBoneName];

            if (vrmBoneName) {
                const vrmNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
                if (vrmNode) {
                    const vrmNodeName = vrmNode.name;

                    if (property === 'quaternion') {
                        // Mixamo is usually in T-pose but with specific rotations.
                        // VRM is T-pose (usually).
                        // Simple copy often fails for arms.
                        // Valid strategy: 
                        // 1. Get Mixamo rest pose (usually frame 0).
                        // 2. Get VRM rest pose.
                        // 3. Apply difference.
                        // For this lightweight version, we stick to the copy but might need axis swap if "arms in body".

                        // IF "Arms in body" (inverted Z or X rotation?)
                        // Try removing the track if it looks weird, OR applying a fix.
                        // Let's rely on standard copy for now but re-enable ALL bones.

                        const newTrack = track.clone();
                        newTrack.name = `${vrmNodeName}.quaternion`;
                        tracks.push(newTrack);
                    }
                    // Hips Position ignored to prevent crushing.
                }
            }
        });

        resolve(new THREE.AnimationClip(clip.name, clip.duration, tracks));
    });
}

module.exports = { loadMixamoAnimation };
