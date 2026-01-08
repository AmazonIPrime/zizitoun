import * as THREE from 'three';
import { startWalk, stopWalk, isWalkingNow, updateWalk } from './walk.js';
import { applyIdlePose } from './idlePose.js';

let isRoamingState = false;
let vrmRef = null;
let isInitialized = false;

let currentState = 'IDLE';
let stateTimer = 0;

let currentPos = null;
let targetPos = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let targetRotationY = Math.PI;
const MOVE_SPEED = 200;

let screenBounds = { x: 0, y: 0, width: 1920, height: 1080 };

export function setRoamState(enabled, vrm) {
    if (enabled) {
        isRoamingState = true;
        vrmRef = vrm;
        currentState = 'IDLE';
        stateTimer = 1.0;
        isInitialized = false;
        updateScreenLayout();
    } else {
        isRoamingState = false;
        currentState = 'IDLE';
        stopWalk();
        if (vrmRef) {
            vrmRef.scene.rotation.y = Math.PI;
            applyIdlePose(vrmRef);
        }
    }
}

export function isRoaming() {
    return isRoamingState;
}

export function getRoamSpeedFactor() {
    if (!isRoamingState || currentState === 'IDLE' || currentState === 'ROTATING' || currentState === 'TURNING_FRONT') return 0;
    return Math.max(0.8, currentSpeed / MOVE_SPEED);
}

async function updateScreenLayout() {
    if (window.desktopMate) {
        try {
            const layout = await window.desktopMate.getScreenLayout();
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            layout.forEach(d => {
                minX = Math.min(minX, d.x);
                minY = Math.min(minY, d.y);
                maxX = Math.max(maxX, d.x + d.width);
                maxY = Math.max(maxY, d.y + d.height);
            });

            screenBounds = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };

            const bounds = await window.desktopMate.getWindowBounds();
            currentPos = { x: bounds.x, y: bounds.y };
        } catch (e) {
            console.error('Failed to update screen layout:', e);
        }
    }

    if (currentPos) {
        isInitialized = true;
    } else {
        isRoamingState = false;
        stopWalk();
    }
}

function pickRandomDestination() {
    const margin = 200;
    const x = screenBounds.x + margin + Math.random() * (screenBounds.width - margin * 2);
    const y = screenBounds.y + margin + Math.random() * (screenBounds.height - margin * 2);
    return { x, y };
}

let currentSpeed = 0;
const ACCELERATION = 600;

export function updateRoam(delta) {
    if (!isRoamingState || !vrmRef || !isInitialized || !currentPos) return;

    stateTimer -= delta;

    if (currentState === 'IDLE') {
        if (stateTimer <= 0) {
            targetPos = pickRandomDestination();

            const dx = targetPos.x - currentPos.x;
            const dy = targetPos.y - currentPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (dx > 0) targetRotationY = -Math.PI / 2;
            else targetRotationY = Math.PI / 2;

            if (distance > 100) {
                currentState = 'ROTATING';
                velocity.x = dx / distance;
                velocity.y = dy / distance;
                currentSpeed = 0;
            } else {
                stateTimer = 2.0;
            }
        }
    }

    else if (currentState === 'ROTATING') {
        const ROTATION_SPEED = 5.0;
        vrmRef.scene.rotation.y = THREE.MathUtils.lerp(vrmRef.scene.rotation.y, targetRotationY, ROTATION_SPEED * delta);

        if (Math.abs(vrmRef.scene.rotation.y - targetRotationY) < 0.1) {
            currentState = 'MOVING';
            startWalk(vrmRef);
        }
    }

    else if (currentState === 'MOVING') {
        currentSpeed = Math.min(currentSpeed + ACCELERATION * delta, MOVE_SPEED);

        currentPos.x += velocity.x * currentSpeed * delta;
        currentPos.y += velocity.y * currentSpeed * delta;

        if (window.desktopMate) {
            window.desktopMate.setWindowPosition(currentPos.x, currentPos.y);
        }

        const distSq = (targetPos.x - currentPos.x) ** 2 + (targetPos.y - currentPos.y) ** 2;

        if (distSq < 400) {
            currentState = 'TURNING_FRONT';
            stopWalk();
            targetRotationY = Math.PI;
        }
    }

    else if (currentState === 'TURNING_FRONT') {
        const ROTATION_SPEED = 2.0;
        vrmRef.scene.rotation.y = THREE.MathUtils.lerp(vrmRef.scene.rotation.y, targetRotationY, ROTATION_SPEED * delta);

        if (Math.abs(vrmRef.scene.rotation.y - targetRotationY) < 0.05) {
            currentState = 'IDLE';
            stateTimer = 2.0 + Math.random() * 5.0;
            vrmRef.scene.rotation.y = Math.PI;
            applyIdlePose(vrmRef);
        }
    }
}
