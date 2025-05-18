import { getScore } from './game.js';

// Este archivo contendrá la lógica para los elementos de interfaz de usuario (puntuación, mensajes).

export function updateScoreDisplay() {
    const score = getScore();
    const scoreElement = document.getElementById('score-display');
    if (scoreElement) {
        scoreElement.textContent = `Puntuación: ${score}`;
    }
}

export function displayMessage(message) {
    const messageElement = document.getElementById('message-display');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

// TODO: Añadir funciones para mostrar el jugador actual