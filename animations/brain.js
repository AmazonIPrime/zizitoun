import * as THREE from 'three';
import { startWalk, stopWalk, isWalkingNow, updateWalk } from './walk.js';
import { startSit, stopSit, isSittingNow, updateSit, isInTransition, triggerLegSwing } from './sit.js';
import { startWave, stopWave, isWavePlaying, updateWave } from './wave.js';
import { startYawn, stopYawn, isYawnPlaying, updateYawn } from './yawn.js';
import { initNeeds, updateNeeds, selectAction, getNeedsState, isExhausted, isVeryBored, modifyCuriosity } from './needs.js';
import { applyIdlePose } from './idlePose.js';

let vrmRef = null;
let isActive = false;

const STATES = {
    IDLE: 'IDLE',
    THINKING: 'THINKING',
    WALKING_TO: 'WALKING_TO',
    SITTING: 'SITTING',
    WAVING: 'WAVING',
    YAWNING: 'YAWNING'
};

let currentState = STATES.IDLE;
let stateTimer = 0;

let walkTarget = null;
let walkCallback = null;
let currentPos = null;
let velocity = { x: 0, y: 0 };
const WALK_SPEED = 180;
const WALK_ACCELERATION = 400;
let currentSpeed = 0;
let targetRotationY = Math.PI;

let pendingSitTarget = null;
let screenBounds = { x: 0, y: 0, width: 1920, height: 1080 };
let sittingOnWindow = null;
let windowCheckInterval = null;

export function initBrain(vrm) {
    vrmRef = vrm;
    isActive = true;
    currentState = STATES.WAVING;
    updateScreenBounds();
    initNeeds();

    setTimeout(() => {
        if (vrmRef && isActive) {
            startWave(vrmRef, () => {
                currentState = STATES.IDLE;
                stateTimer = 3 + Math.random() * 5;
                applyIdlePose(vrmRef);
            });
        }
    }, 500);
}

export function stopBrain() {
    isActive = false;
    currentState = STATES.IDLE;
    stopWalk();
    stopSit();
    stopWindowCheck();
    if (vrmRef) applyIdlePose(vrmRef);
}

export function isBrainActive() {
    return isActive;
}

export function getCurrentState() {
    return currentState;
}

async function updateScreenBounds() {
    if (!window.desktopMate) return;

    try {
        const layout = await window.desktopMate.getScreenLayout();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        layout.forEach(d => {
            minX = Math.min(minX, d.x);
            minY = Math.min(minY, d.y);
            maxX = Math.max(maxX, d.x + d.width);
            maxY = Math.max(maxY, d.y + d.height);
        });

        screenBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

        const bounds = await window.desktopMate.getWindowBounds();
        currentPos = { x: bounds.x, y: bounds.y };
    } catch (e) {
        console.error('Failed to update screen bounds:', e);
    }
}

export function walkTo(x, y, callback = null) {
    if (!vrmRef || !currentPos) return;

    walkTarget = { x, y };
    walkCallback = callback;
    currentSpeed = 0;

    const dx = walkTarget.x - currentPos.x;
    const dy = walkTarget.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 30) {
        if (callback) callback();
        return;
    }

    velocity.x = dx / distance;
    velocity.y = dy / distance;

    if (dx > 30) targetRotationY = -Math.PI / 2;
    else if (dx < -30) targetRotationY = Math.PI / 2;
    else targetRotationY = Math.PI;

    currentState = STATES.WALKING_TO;
    startWalk(vrmRef);
}

function updateWalking(delta) {
    if (!walkTarget || !currentPos || !vrmRef) return;

    const rotSpeed = 5.0;
    vrmRef.scene.rotation.y = THREE.MathUtils.lerp(
        vrmRef.scene.rotation.y,
        targetRotationY,
        rotSpeed * delta
    );

    currentSpeed = Math.min(currentSpeed + WALK_ACCELERATION * delta, WALK_SPEED);

    currentPos.x += velocity.x * currentSpeed * delta;
    currentPos.y += velocity.y * currentSpeed * delta;

    if (window.desktopMate && !isNaN(currentPos.x) && !isNaN(currentPos.y)) {
        window.desktopMate.setWindowPosition(currentPos.x, currentPos.y);
    }

    const distSq = (walkTarget.x - currentPos.x) ** 2 + (walkTarget.y - currentPos.y) ** 2;

    if (distSq < 400) {
        stopWalk();

        const turnToFront = () => {
            const turnDuration = 0.5;
            let turnTime = 0;
            const startRot = vrmRef.scene.rotation.y;

            const turnInterval = setInterval(() => {
                turnTime += 0.016;
                const t = Math.min(turnTime / turnDuration, 1);
                vrmRef.scene.rotation.y = THREE.MathUtils.lerp(startRot, Math.PI, t);

                if (t >= 1) {
                    clearInterval(turnInterval);
                    vrmRef.scene.rotation.y = Math.PI;

                    walkTarget = null;
                    if (walkCallback) {
                        const cb = walkCallback;
                        walkCallback = null;
                        cb();
                    } else {
                        currentState = STATES.IDLE;
                        stateTimer = 2 + Math.random() * 4;
                        applyIdlePose(vrmRef);
                    }
                }
            }, 16);
        };

        turnToFront();
    }
}

async function decideNextAction() {
    if (!window.desktopMate || !currentPos) {
        currentState = STATES.IDLE;
        stateTimer = 3;
        return;
    }

    if (isSittingNow() || isInTransition()) {
        stopWindowCheck();
        stopSit();
        sittingOnWindow = null;

        const bounds = await window.desktopMate.getWindowBounds();
        currentPos = { x: bounds.x, y: bounds.y };

        currentState = STATES.IDLE;
        stateTimer = 0.8;
        setTimeout(() => applyIdlePose(vrmRef), 600);
        return;
    }

    const action = selectAction();
    const needsState = getNeedsState();

    function calculateVisibleSegments(targetWindow, allWindows) {
        let segments = [{ start: targetWindow.x, end: targetWindow.x + targetWindow.width }];

        const targetIndex = allWindows.findIndex(w => w.title === targetWindow.title);
        if (targetIndex === -1) return segments;

        const sittingY = targetWindow.y;

        for (let i = 0; i < targetIndex; i++) {
            const higher = allWindows[i];

            const horizontalOverlap = higher.x < (targetWindow.x + targetWindow.width) &&
                (higher.x + higher.width) > targetWindow.x;

            const coversTop = higher.y <= sittingY && (higher.y + higher.height) >= sittingY;

            if (horizontalOverlap && coversTop) {
                segments = subtractRange(segments, higher.x, higher.x + higher.width);
            }
        }
        return segments;
    }

    function subtractRange(segments, blockStart, blockEnd) {
        const newSegments = [];
        for (const seg of segments) {
            if (blockEnd <= seg.start || blockStart >= seg.end) {
                newSegments.push(seg);
            } else if (blockStart <= seg.start && blockEnd >= seg.end) {
            } else if (blockStart > seg.start && blockEnd < seg.end) {
                newSegments.push({ start: seg.start, end: blockStart });
                newSegments.push({ start: blockEnd, end: seg.end });
            } else if (blockEnd > seg.start && blockEnd < seg.end) {
                newSegments.push({ start: blockEnd, end: seg.end });
            } else if (blockStart > seg.start && blockStart < seg.end) {
                newSegments.push({ start: seg.start, end: blockStart });
            }
        }
        return newSegments;
    }

    const finalAction = isExhausted() ? 'sit' : action;

    switch (finalAction) {
        case 'idle':
            currentState = STATES.IDLE;
            stateTimer = 3 + Math.random() * 5;
            return;

        case 'walk':
        case 'explore': {
            const margin = 150;
            const bottomMargin = 450;
            const targetX = screenBounds.x + margin + Math.random() * (screenBounds.width - margin * 2);
            const targetY = screenBounds.y + margin + Math.random() * (screenBounds.height - bottomMargin);

            walkTo(targetX, targetY, () => {
                currentState = STATES.IDLE;
                stateTimer = 2 + Math.random() * 4;
                applyIdlePose(vrmRef);
                if (finalAction === 'explore') {
                    modifyCuriosity(-30);
                }
            });
            return;
        }

        case 'sit': {
            try {
                const screenSize = await window.desktopMate.getScreenSize();
                const windows = await window.desktopMate.getVisibleWindows();

                const sittableWindows = windows.filter(w =>
                    w.y > 350 &&
                    w.y < screenSize.height - 200 &&
                    w.width > 300 &&
                    w.height > 200
                );

                if (sittableWindows.length > 0 && Math.random() > 0.3) {
                    const shuffledWindows = sittableWindows.sort(() => 0.5 - Math.random());

                    for (const win of shuffledWindows) {
                        const validSegments = calculateVisibleSegments(win, windows);
                        const usableSegments = validSegments.filter(s => s.end - s.start > 200);

                        if (usableSegments.length > 0) {
                            const selectedSegment = usableSegments[Math.floor(Math.random() * usableSegments.length)];
                            const margin = 50;
                            const safeStart = selectedSegment.start + margin;
                            const safeEnd = selectedSegment.end - margin;
                            const sitX = safeStart < safeEnd
                                ? safeStart + Math.random() * (safeEnd - safeStart)
                                : selectedSegment.start + (selectedSegment.end - selectedSegment.start) / 2;
                            const sitY = win.y - 315;

                            const chosenXOffset = sitX - win.x;
                            pendingSitTarget = { type: 'window', window: win, xOffset: chosenXOffset };

                            walkTo(sitX, sitY, async () => {
                                try {
                                    const freshWindows = await window.desktopMate.getVisibleWindows();
                                    const freshWindow = freshWindows.find(w => w.title === win.title);
                                    if (freshWindow) {
                                        const exactX = freshWindow.x + chosenXOffset;
                                        const exactY = freshWindow.y - 315;
                                        currentPos = { x: exactX, y: exactY };
                                        window.desktopMate.setWindowPosition(exactX, exactY);
                                        sittingOnWindow = { ...freshWindow };
                                    } else {
                                        sittingOnWindow = { ...win };
                                    }
                                } catch (e) {
                                    sittingOnWindow = { ...win };
                                }

                                startSit(vrmRef, 'left');
                                currentState = STATES.SITTING;
                                startWindowCheck();

                                if (Math.random() > 0.5) {
                                    setTimeout(() => triggerLegSwing(), 2000 + Math.random() * 3000);
                                }
                            });
                            return;
                        }
                    }
                }

                const taskbarY = screenSize.height - 310;
                const taskbarX = 100 + Math.random() * (screenSize.width - 300);

                pendingSitTarget = { type: 'taskbar', chosenX: taskbarX };

                walkTo(taskbarX, taskbarY, async () => {
                    try {
                        const freshScreenSize = await window.desktopMate.getScreenSize();
                        const exactY = freshScreenSize.height - 310;
                        currentPos = { x: taskbarX, y: exactY };
                        window.desktopMate.setWindowPosition(taskbarX, exactY);
                    } catch (e) { }

                    startSit(vrmRef, 'left');
                    currentState = STATES.SITTING;

                    if (Math.random() > 0.5) {
                        setTimeout(() => triggerLegSwing(), 2000 + Math.random() * 3000);
                    }
                });
            } catch (e) {
                currentState = STATES.IDLE;
                stateTimer = 3;
            }
            return;
        }

        case 'wave':
            currentState = STATES.WAVING;
            startWave(vrmRef, () => {
                currentState = STATES.IDLE;
                stateTimer = 3 + Math.random() * 5;
                applyIdlePose(vrmRef);
            });
            return;

        case 'yawn':
            currentState = STATES.YAWNING;
            startYawn(vrmRef, () => {
                currentState = STATES.IDLE;
                stateTimer = 4 + Math.random() * 6;
                applyIdlePose(vrmRef);
            });
            return;

        default:
            currentState = STATES.IDLE;
            stateTimer = 3;
            return;
    }
}

function startWindowCheck() {
    stopWindowCheck();

    windowCheckInterval = setInterval(async () => {
        if (!sittingOnWindow || !window.desktopMate) return;

        try {
            const windows = await window.desktopMate.getVisibleWindows();
            const currentWindow = windows.find(w => w.title === sittingOnWindow.title);

            if (!currentWindow) {
                standUp();
                return;
            }

            const MOVE_THRESHOLD = 10;
            const deltaX = Math.abs(currentWindow.x - sittingOnWindow.x);
            const deltaY = Math.abs(currentWindow.y - sittingOnWindow.y);

            if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
                standUp();
            }
        } catch (e) {
            console.error('Window check error:', e);
        }
    }, 200);
}

function stopWindowCheck() {
    if (windowCheckInterval) {
        clearInterval(windowCheckInterval);
        windowCheckInterval = null;
    }
}

async function standUp() {
    stopWindowCheck();
    stopSit();
    sittingOnWindow = null;
    pendingSitTarget = null;

    if (window.desktopMate) {
        const bounds = await window.desktopMate.getWindowBounds();
        currentPos = { x: bounds.x, y: bounds.y };
    }

    currentState = STATES.IDLE;
    stateTimer = 1 + Math.random() * 2;

    setTimeout(() => {
        if (vrmRef) applyIdlePose(vrmRef);
    }, 600);
}

export function updateBrain(delta, time) {
    if (!isActive || !vrmRef) return;

    if (currentState === STATES.WALKING_TO) {
        updateWalk(delta, currentSpeed / WALK_SPEED);
        updateWalking(delta);
    }

    if (currentState === STATES.SITTING || isSittingNow() || isInTransition()) {
        updateSit(delta);
    }

    if (currentState === STATES.WAVING || isWavePlaying()) {
        updateWave(time, delta);
    }

    if (currentState === STATES.YAWNING || isYawnPlaying()) {
        updateYawn(time, delta);
    }

    let activity = 'IDLE';
    if (currentState === STATES.WALKING_TO) activity = 'WALKING';
    else if (currentState === STATES.SITTING) activity = 'SITTING';
    updateNeeds(delta, activity);

    if (currentState === STATES.IDLE) {
        stateTimer -= delta;

        if (stateTimer <= 0) {
            currentState = STATES.THINKING;
            decideNextAction();
        }
    }
}
