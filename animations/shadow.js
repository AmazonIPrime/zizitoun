import * as THREE from 'three';
import { isSittingNow } from './sit.js';

let shadowMesh;
let sceneRef;

export function initShadow(scene) {
    sceneRef = scene;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');

    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    const shadowTexture = new THREE.CanvasTexture(canvas);

    const geometry = new THREE.PlaneGeometry(0.8, 0.8);
    const material = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
    });

    shadowMesh = new THREE.Mesh(geometry, material);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;

    scene.add(shadowMesh);
}

export function updateShadow(character, delta) {
    if (!shadowMesh || !character) return;

    shadowMesh.position.y = character.position.y + 0.01;
    shadowMesh.position.z = character.position.z - 0.4;
    shadowMesh.position.x = character.position.x;

    shadowMesh.scale.set(0.8, 2.0, 1.0);
    shadowMesh.material.opacity = 0.6;

    if (isSittingNow()) {
        shadowMesh.position.z = character.position.z - 0.3;
        shadowMesh.scale.set(1.0, 1.5, 1.0);
    }
}
