import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { applyIdlePose } from './animations/idlePose.js';
import { startWave, updateWave, isWavePlaying } from './animations/wave.js';
import { startSit, stopSit, updateSit, isSittingNow, isInTransition, triggerLegSwing } from './animations/sit.js';
import { updateWalk, startWalk, stopWalk, isWalkingNow } from './animations/walk.js';
import { updateRoam, setRoamState, isRoaming, getRoamSpeedFactor } from './animations/roam.js';
import { startYawn, isYawnPlaying } from './animations/yawn.js';
import { initBrain, updateBrain, isBrainActive, stopBrain, getCurrentState } from './animations/brain.js';
import { initShadow, updateShadow } from './animations/shadow.js';

let scene, camera, renderer, clock;
let character;
let vrm;
let raycaster, mouse;

const CONFIG = {
    character: { scale: 1.0 },
    animation: { speedMultiplier: 1.0 },
    reactions: true
};

const state = {
    isLoaded: false,
    drag: {
        isDragging: false,
        prevX: 0,
        prevY: 0
    },
    autoLook: {
        current: new THREE.Vector3(0, 1.5, 5.0),
        target: new THREE.Vector3(0, 1.5, 5.0),
        nextChangeTime: 0,
        isIdle: true
    },
    blink: {
        isBlinking: false,
        blinkStartTime: 0,
        nextBlinkTime: 0,
        duration: 0.15
    }
};

async function init() {
    const canvas = document.getElementById('mate-canvas');
    if (!canvas) return;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    scene = new THREE.Scene();

    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(30.0, aspect, 0.1, 20.0);
    camera.position.set(0.0, 1.0, 5.0);

    clock = new THREE.Clock();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    loadVRMModel('./assets/waifu.vrm');

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('dblclick', onDoubleClick);
    // window.addEventListener('keydown', onKeyDown); // Désactivé - le personnage est autonome

    if (window.desktopMate && window.desktopMate.onSystemIdle) {
        window.desktopMate.onSystemIdle((isIdle) => {
            if (isIdle) {
                triggerSleep();
            } else {
                triggerWakeUp();
            }
        });
    }

    animate();
}

function loadVRMModel(url) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
        url,
        (gltf) => {
            const vrmInstance = gltf.userData.vrm;

            if (vrm) {
                scene.remove(vrm.scene);
                VRMUtils.deepDispose(vrm.scene);
            }

            vrm = vrmInstance;
            state.isLoaded = true;

            const loadingScreen = document.getElementById('loading');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }

            VRMUtils.rotateVRM0(vrm);

            character = vrm.scene;
            character.position.y = 0.3;
            character.rotation.y = Math.PI;

            scene.add(character);

            applyIdlePose(vrm);
            initBrain(vrm);
            initShadow(scene);
            updateClickThrough();
        },
        undefined,
        (error) => console.error('Error loading VRM:', error)
    );
}

function isMouseOverModel(event) {
    if (!character) return false;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(character, true);

    return intersects.length > 0;
}

function updateClickThrough() {
    if (window.desktopMate) {
        window.desktopMate.setIgnoreMouse(true);
    }
}

function onMouseDown(event) {
    if (event.button !== 0) return;

    if (isMouseOverModel(event)) {
        state.drag.isDragging = true;
        state.drag.prevX = event.screenX;
        state.drag.prevY = event.screenY;

        if (window.desktopMate) {
            window.desktopMate.setIgnoreMouse(false);
        }
    }
}

function onMouseMove(event) {
    if (!state.drag.isDragging) {
        const overModel = isMouseOverModel(event);
        if (window.desktopMate) {
            window.desktopMate.setIgnoreMouse(!overModel);
        }
    }

    if (state.drag.isDragging) {
        const deltaX = event.screenX - state.drag.prevX;
        const deltaY = event.screenY - state.drag.prevY;

        if (window.desktopMate && window.desktopMate.dragWindow) {
            window.desktopMate.dragWindow(deltaX, deltaY);
        }

        state.drag.prevX = event.screenX;
        state.drag.prevY = event.screenY;
    }
}

function onMouseUp(event) {
    if (state.drag.isDragging) {
        state.drag.isDragging = false;

        const overModel = isMouseOverModel(event);
        if (window.desktopMate) {
            window.desktopMate.setIgnoreMouse(!overModel);
        }
    }
}

function onDoubleClick(event) {
    if (isMouseOverModel(event) && !isWavePlaying()) {
        startWave(vrm, () => {
            applyIdlePose(vrm);
        });
    }
}

let savedPosition = null;
let sittingOnWindow = null;
let sittingOffset = { x: 0, relativeX: 0 };
let windowTrackingInterval = null;

async function onKeyDown(event) {
    if (event.key === 's' || event.key === 'S') {
        if (isWalkingNow()) stopWalk();
        if (isRoaming()) setRoamState(false, vrm);

        if (isSittingNow()) {
            stopSit();
            stopWindowTracking();
            if (savedPosition && window.desktopMate) {
                window.desktopMate.setWindowPosition(savedPosition.x, savedPosition.y);
            }
            setTimeout(() => applyIdlePose(vrm), 600);
        } else {
            await moveToTaskbar();
            startSit(vrm, 'left');
        }
    }

    if (event.key === 't' || event.key === 'T') {
        if (isWalkingNow()) stopWalk();
        if (isRoaming()) setRoamState(false, vrm);

        if (isSittingNow()) {
            stopSit();
            stopWindowTracking();
            if (savedPosition && window.desktopMate) {
                window.desktopMate.setWindowPosition(savedPosition.x, savedPosition.y);
            }
            setTimeout(() => applyIdlePose(vrm), 600);
        } else {
            const moved = await moveToWindowTop();
            if (moved) {
                startSit(vrm, 'left');
            }
        }
    }

    if (event.key === 'w' || event.key === 'W') {
        if (isRoaming()) setRoamState(false, vrm);

        if (isSittingNow()) {
            stopSit();
            setTimeout(() => startWalk(vrm), 500);
        } else {
            if (isWalkingNow()) {
                stopWalk();
                setTimeout(() => applyIdlePose(vrm), 300);
            } else {
                startWalk(vrm);
            }
        }
    }

    if (event.key === 'r' || event.key === 'R') {
        if (isSittingNow()) stopSit();

        if (isRoaming()) {
            setRoamState(false, vrm);
        } else {
            setRoamState(true, vrm);
        }
    }

    if (event.key === 'b' || event.key === 'B') {
        if (!isYawnPlaying()) {
            startYawn(vrm, () => {
                applyIdlePose(vrm);
            });
        }
    }

    if (event.key === 'l' || event.key === 'L') {
        if (isSittingNow()) {
            triggerLegSwing();
        }
    }
}

async function moveToTaskbar() {
    if (!window.desktopMate) return;

    try {
        const currentBounds = await window.desktopMate.getWindowBounds();
        savedPosition = { x: currentBounds.x, y: currentBounds.y };

        const screenSize = await window.desktopMate.getScreenSize();
        const newY = screenSize.height - 310;

        window.desktopMate.setWindowPosition(currentBounds.x, newY);
    } catch (e) {
        console.error('Failed to move to taskbar:', e);
    }
}

async function moveToWindowTop() {
    if (!window.desktopMate) return false;

    try {
        const currentBounds = await window.desktopMate.getWindowBounds();
        savedPosition = { x: currentBounds.x, y: currentBounds.y };

        const windows = await window.desktopMate.getVisibleWindows();

        if (!windows || windows.length === 0) {
            return false;
        }

        const screenSize = await window.desktopMate.getScreenSize();

        const sittableWindows = windows.filter(w =>
            w.y > 320 &&
            w.y < screenSize.height - 200 &&
            w.width > 300 &&
            w.height > 200
        );

        if (sittableWindows.length === 0) {
            return false;
        }

        sittableWindows.sort((a, b) => {
            const distA = Math.abs(a.x - currentBounds.x) + Math.abs(a.y - currentBounds.y);
            const distB = Math.abs(b.x - currentBounds.x) + Math.abs(b.y - currentBounds.y);
            return distA - distB;
        });

        const targetWindow = sittableWindows[0];
        const margin = 50;
        const minX = targetWindow.x + margin;
        const maxX = targetWindow.x + targetWindow.width - currentBounds.width - margin;
        const randomX = minX + Math.random() * Math.max(0, maxX - minX);
        const newX = Math.max(targetWindow.x, randomX);
        const newY = targetWindow.y - 315;

        sittingOnWindow = { ...targetWindow };
        sittingOffset = {
            x: newX - targetWindow.x,
            relativeX: (newX - targetWindow.x) / targetWindow.width
        };

        window.desktopMate.setWindowPosition(Math.max(0, newX), Math.max(0, newY));

        startWindowTracking();

        return true;
    } catch (e) {
        console.error('Failed to find window:', e);
        return false;
    }
}

function startWindowTracking() {
    if (windowTrackingInterval) {
        clearInterval(windowTrackingInterval);
    }

    windowTrackingInterval = setInterval(async () => {
        if (!sittingOnWindow || !window.desktopMate) {
            return;
        }

        try {
            const windows = await window.desktopMate.getVisibleWindows();
            const currentWindow = windows.find(w => w.title === sittingOnWindow.title);

            if (!currentWindow) {
                standUpFromWindow();
                return;
            }

            if (currentWindow.x !== sittingOnWindow.x || currentWindow.y !== sittingOnWindow.y) {
                standUpFromWindow();
            }
        } catch (e) {
            console.error('Window tracking error:', e);
        }
    }, 200);
}

function standUpFromWindow() {
    stopWindowTracking();
    stopSit();
    if (savedPosition && window.desktopMate) {
        window.desktopMate.setWindowPosition(savedPosition.x, savedPosition.y);
    }
    setTimeout(() => applyIdlePose(vrm), 600);
}

function stopWindowTracking() {
    if (windowTrackingInterval) {
        clearInterval(windowTrackingInterval);
        windowTrackingInterval = null;
    }
    sittingOnWindow = null;
}

function updateAutoLook(time, delta) {
    if (!vrm || !vrm.lookAt) return;

    if (time > state.autoLook.nextChangeTime) {
        if (state.autoLook.isIdle) {
            const x = (Math.random() - 0.5) * 5.0;
            const y = (Math.random() - 0.5) * 2.0 + 1.5;
            const z = 2.0 + Math.random() * 2.0;

            state.autoLook.target.set(x, y, z);
            state.autoLook.isIdle = false;
            state.autoLook.nextChangeTime = time + (1.0 + Math.random() * 2.0);
        } else {
            state.autoLook.target.set(0, 1.5, 5.0);
            state.autoLook.isIdle = true;
            state.autoLook.nextChangeTime = time + (2.0 + Math.random() * 5.0);
        }
    }

    const speed = 2.0;
    state.autoLook.current.lerp(state.autoLook.target, speed * delta);
    vrm.lookAt.lookAt(state.autoLook.current);
}

function updateProceduralAnimations(time) {
    if (!vrm) return;

    const breathSpeed = 2.0;
    const breathIntensity = 0.05;
    const breathValue = Math.sin(time * breathSpeed) * breathIntensity;

    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const spine = vrm.humanoid.getNormalizedBoneNode('spine');
    const head = vrm.humanoid.getNormalizedBoneNode('head');

    if (chest) chest.rotation.x = breathValue * 0.5;
    if (spine) spine.rotation.x = breathValue * 0.3;
    if (head) head.rotation.x = -breathValue * 0.3;
}

function updateBlink(time) {
    if (!vrm || !vrm.expressionManager) return;

    if (state.blink.nextBlinkTime === 0) {
        state.blink.nextBlinkTime = time + 2 + Math.random() * 4;
    }

    if (state.blink.isBlinking) {
        const elapsedTime = time - state.blink.blinkStartTime;
        const progress = elapsedTime / state.blink.duration;

        if (progress >= 1) {
            state.blink.isBlinking = false;
            vrm.expressionManager.setValue('blink', 0);
            state.blink.nextBlinkTime = time + 2 + Math.random() * 4;
        } else {
            const blinkValue = Math.sin(progress * Math.PI);
            vrm.expressionManager.setValue('blink', blinkValue);
        }
    } else {
        if (time >= state.blink.nextBlinkTime) {
            state.blink.isBlinking = true;
            state.blink.blinkStartTime = time;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (vrm) {
        if (isBrainActive()) {
            updateBrain(delta, time);
        } else {
            if (isWavePlaying()) {
                updateWave(time, delta);
            } else {
                if (isSittingNow() || isInTransition()) {
                    updateSit(delta);
                } else {
                    updateAutoLook(time, delta);
                    updateProceduralAnimations(time);
                }
            }

            let speedFactor = 1.0;
            if (isRoaming()) {
                speedFactor = getRoamSpeedFactor();
            }
            updateWalk(delta, speedFactor);
            updateRoam(delta);
        }

        updateShadow(vrm.scene, delta);
        updateBlink(time);
        vrm.update(delta);
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
