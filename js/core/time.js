import { gameState } from './gameState.js';

export function framesToSeconds(frames) {
    return (frames || 0) / 60;
}

export function getSimSeconds() {
    return Number.isFinite(gameState.time?.simSeconds) ? gameState.time.simSeconds : 0;
}

export function getRealSeconds() {
    return Number.isFinite(gameState.time?.realSeconds) ? gameState.time.realSeconds : 0;
}

export function getRunSeconds() {
    return Number.isFinite(gameState.time?.runSeconds) ? gameState.time.runSeconds : 0;
}

export function simAge(startSimSeconds) {
    return getSimSeconds() - (startSimSeconds || 0);
}
