let energy = 80;
let curiosity = 30;

const ENERGY_DRAIN_MOVING = 0.5;
const ENERGY_GAIN_SITTING = 1.5;
const CURIOSITY_GAIN_IDLE = 0.8;
const CURIOSITY_RESET_EXPLORE = 50;

const THRESHOLDS = {
    TIRED: 25,
    EXHAUSTED: 10,
    BORED: 70,
    VERY_BORED: 90
};

let currentActivity = 'IDLE';

export function initNeeds() {
    energy = 70 + Math.random() * 20;
    curiosity = 20 + Math.random() * 30;
}

export function updateNeeds(delta, activity) {
    currentActivity = activity;

    if (activity === 'WALKING' || activity === 'EXPLORING') {
        energy = Math.max(0, energy - ENERGY_DRAIN_MOVING * delta);
    } else if (activity === 'SITTING') {
        energy = Math.min(100, energy + ENERGY_GAIN_SITTING * delta);
    }

    if (activity === 'IDLE' || activity === 'SITTING') {
        curiosity = Math.min(100, curiosity + CURIOSITY_GAIN_IDLE * delta);
    } else if (activity === 'EXPLORING') {
        curiosity = Math.max(0, curiosity - CURIOSITY_RESET_EXPLORE * delta * 0.1);
    }
}

export function getDesires() {
    const desires = {
        idle: 0,
        walk: 0,
        sit: 0,
        explore: 0,
        wave: 0,
        yawn: 0
    };

    desires.idle = 20;

    desires.walk = 15 + (curiosity / 100) * 20;

    const tiredness = 100 - energy;
    desires.sit = tiredness * 0.8;
    if (energy < THRESHOLDS.TIRED) desires.sit += 30;
    if (energy < THRESHOLDS.EXHAUSTED) desires.sit += 50;

    desires.explore = (curiosity / 100) * 40;
    if (curiosity > THRESHOLDS.BORED) desires.explore += 20;
    if (curiosity > THRESHOLDS.VERY_BORED) desires.explore += 30;

    desires.wave = 5 + (energy / 100) * 10;

    desires.yawn = (tiredness / 100) * 25;
    if (energy < THRESHOLDS.TIRED) desires.yawn += 15;

    return desires;
}

export function selectAction() {
    const desires = getDesires();

    const actions = Object.entries(desires);
    const totalWeight = actions.reduce((sum, [, weight]) => sum + weight, 0);

    let roll = Math.random() * totalWeight;

    for (const [action, weight] of actions) {
        roll -= weight;
        if (roll <= 0) {
            return action;
        }
    }

    return 'idle';
}

export function modifyEnergy(amount) {
    energy = Math.max(0, Math.min(100, energy + amount));
}

export function modifyCuriosity(amount) {
    curiosity = Math.max(0, Math.min(100, curiosity + amount));
}

export function getNeedsState() {
    return {
        energy: Math.round(energy),
        curiosity: Math.round(curiosity),
        activity: currentActivity
    };
}

export function isExhausted() {
    return energy < THRESHOLDS.EXHAUSTED;
}

export function isVeryBored() {
    return curiosity > THRESHOLDS.VERY_BORED;
}
