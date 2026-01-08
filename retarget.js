/**
 * Mixamo to VRM Animation Retargeting Logic
 */

// Mixamo Bone Name -> VRM Bone Name Map
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

function loadMixamoAnimation(url, vrm) {
    const loader = new FBXLoader();
    return new Promise((resolve, reject) => {

        // Read file using Electron fs to avoid URL issues
        const fs = require('fs');
        if (!fs.existsSync(url)) {
            console.warn('Animation file not found:', url);
            resolve(null);
            return;
        }

        const buffer = fs.readFileSync(url);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        // Parse
        const object = loader.parse(arrayBuffer, '');

        const clip = object.animations[0];
        if (!clip) {
            reject('No animation found');
            return;
        }

        const tracks = []; // New tracks for VRM

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
                        // Rotation: Needs retargeting (Mixamo T-pose vs VRM T-pose differences)
                        // For simplicity in this lightweight version, we copy text track directly
                        // A full retargeter is complex, but often Mixamo->VRM works okay directly if hips are handled.

                        // Create new track with VRM bone name
                        const newTrack = track.clone();
                        newTrack.name = `${vrmNodeName}.quaternion`;
                        tracks.push(newTrack);
                    } else if (property === 'position' && vrmBoneName === 'hips') {
                        // Position: Only for Hips
                        const newTrack = track.clone();
                        newTrack.name = `${vrmNodeName}.position`;
                        // Scale position down (Mixamo is often cm, VRM is m)
                        for (let i = 0; i < newTrack.values.length; i++) {
                            newTrack.values[i] *= 0.01;
                        }
                        tracks.push(newTrack);
                    }
                }
            }
        });

        const newClip = new THREE.AnimationClip(clip.name, clip.duration, tracks);
        resolve(newClip);
    });
}

module.exports = { loadMixamoAnimation };
