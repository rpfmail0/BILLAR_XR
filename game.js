// No se importa CANNON.js, se asume que Ammo.js está disponible globalmente.
import * as THREE from 'three'; // Necesario para THREE.Vector3 y THREE.Vector2
import { getCueBall, getBalls, resetBall, getBallRadius } from './balls.js';
import { getCueController, getIsTriggerDown } from './controllers.js';
import { getCushionMaterial } from './physics.js'; // Aunque no se use directamente para materiales de contacto, se mantiene por si acaso
import { tableSurfaceY, tableWidth, tableHeight } from './table.js'; // Importar constantes de table.js
import { updateScoreDisplay, displayMessage } from './ui.js'; // Importar funciones de UI

// --- Global Variables (Estado del Juego) ---
let score = 0;
export let isStrokeInProgress = false;
let hitYellowAfterStrokeStart = false; // La lógica de colisión está comentada, estas banderas no se actualizarán
let hitRedAfterStrokeStart = false; // La lógica de colisión está comentada, estas banderas no se actualizarán
let cushionHitsThisStroke = 0; // La lógica de colisión está comentada, esta variable no se actualizará
const stopVelocityThreshold = 0.01;

// --- Variables de Estado del Juego Adicionales ---
let currentPlayer = 1; // Jugador actual (ej. 1 o 2)
let foulOccurred = false; // Indica si se cometió una falta en el tiro actual (la detección de faltas está comentada)
let firstBallHit = null; // La primera bola de color golpeada por la bola blanca (la detección de colisión está comentada)

// Definir posiciones de los bolsillos (en coordenadas locales de la mesa)
const pocketPositions = [
    new THREE.Vector2(tableWidth / 2, tableHeight / 2), // Esquina superior derecha
    new THREE.Vector2(-tableWidth / 2, tableHeight / 2), // Esquina superior izquierda
    new THREE.Vector2(tableWidth / 2, -tableHeight / 2), // Esquina inferior derecha
    new THREE.Vector2(-tableWidth / 2, -tableHeight / 2), // Esquina inferior izquierda
    new THREE.Vector2(tableWidth / 2, 0), // Centro derecha
    new THREE.Vector2(-tableWidth / 2, 0)  // Centro izquierda
];


export function setStrokeInProgress(value) {
    isStrokeInProgress = value;
}

// shootBall Function - Adaptada para Ammo.js
export function shootBall(impulse, hitOffset) {
    console.log("--- Entrando a shootBall() con Ammo.js ---");
    const cueBall = getCueBall();
    const balls = getBalls();
    if (!cueBall || !cueBall.body) { console.error("Error: cueBall o cueBall.body no definido."); return; }
    console.log("Estado actual: isStrokeInProgress =", isStrokeInProgress);

    // Comprobación de quietud (Adaptada para Ammo.js)
    let allQuiet = true;
    const quietCheckThreshold = 0.3; // Umbral relajado
    balls.forEach((b, index) => {
        if (!b || !b.body) { console.warn(`Advertencia: Falta body para bola ${index} en chequeo isQuiet.`); return; }
        // En Ammo, el estado de activación 1 es ISLAND_SLEEPING
        const sleep = b.body.getActivationState() === 1;
        if (sleep) { return; }
        const vel = b.body.getLinearVelocity().length(); // Obtener magnitud de velocidad lineal
        if (vel * vel > quietCheckThreshold * quietCheckThreshold) { allQuiet = false; } // Comparar magnitudes al cuadrado
    });
    console.log("Resultado de isQuiet (Umbral Relajado):", allQuiet);

    if (!allQuiet || isStrokeInProgress) {
        console.log("CONDICIÓN DE DISPARO NO CUMPLIDA:", !allQuiet ? "Bolas en movimiento." : "", isStrokeInProgress ? "Tiro ya en progreso." : "");
        displayMessage("Bolas en movimiento o tiro en progreso."); // Mostrar mensaje en UI
        return;
    }

    // Aplicar Impulso con el vector de impulso y hitOffset calculados en controllers.js (Adaptado para Ammo.js)
    console.log("Aplicando impulso:", impulse, "con hitOffset:", hitOffset);
    try {
        // impulse y hitOffset vienen como CANNON.Vec3 o similar, convertirlos a Ammo.btVector3
        const ammoImpulse = new Ammo.btVector3(impulse.x, impulse.y, impulse.z);
        const ammoHitOffset = new Ammo.btVector3(hitOffset.x, hitOffset.y, hitOffset.z);

        cueBall.body.activate(); // Activar cuerpo para aplicar impulso
        cueBall.body.applyImpulse(ammoImpulse, ammoHitOffset); // Aplicar impulso

        // Liberar memoria de los vectores de Ammo creados temporalmente
        Ammo.destroy(ammoImpulse);
        Ammo.destroy(ammoHitOffset);


        console.log("Impulso aplicado a cueBall.body.");
        displayMessage("Tiro en progreso..."); // Mostrar mensaje en UI
    } catch(e) { console.error("¡Error al aplicar impulso con Ammo.js!", e); return; }

    // Iniciar seguimiento del tiro
    isStrokeInProgress = true;
    hitYellowAfterStrokeStart = false; // No se actualizará sin lógica de colisión
    hitRedAfterStrokeStart = false; // No se actualizará sin lógica de colisión
    cushionHitsThisStroke = 0; // No se actualizará sin lógica de colisión
    foulOccurred = false; // No se actualizará sin lógica de colisión
    firstBallHit = null; // No se actualizará sin lógica de colisión

    console.log(`¡Disparo Realizado! Stroke iniciado.`);
    console.log("--- Saliendo de shootBall() ---");
}

// onCollision Function - COMENTADA TEMPORALMENTE (Requiere re-implementación con Ammo.js)
/*
export function onCollision(event) {
     // Solo procesar colisiones si un tiro está en progreso
     if (!isStrokeInProgress) return;

     // La lógica de colisión de Ammo.js es diferente.
     // Se necesita iterar sobre el despachador de colisiones en cada paso de simulación.
     // Esta función no se usará directamente con Ammo.js de la misma manera que con CANNON.js.

     console.log("onCollision llamada (comentada para Ammo.js)");

     // Lógica original (comentada):
     // const bodyA = event.contact.bi;
     // const bodyB = event.contact.bj;
     // ... (resto de la lógica de detección de colisiones y faltas)
}
*/


// checkBallsFallen Function - Necesaria (Adaptada para Ammo.js)
export function checkBallsFallen() {
     const balls = getBalls();
     const ballRadius = getBallRadius();
     const pocketDetectionRadius = getBallRadius() * 1.5; // Radio de detección del bolsillo (ajustar según sea necesario)
     let needsReset = false;
     // const fallThreshold = tableSurfaceY - ballRadius * 5; // Umbral de caída anterior

     balls.forEach(ball => {
         if (ball && ball.body) {
             // Obtener la posición del cuerpo de Ammo.js (Ammo.btVector3)
             const ballBodyPos = ball.body.getCenterOfMassPosition();

             // Obtener la posición de la bola en el plano XZ (ignorando Y)
             const ballPosXZ = new THREE.Vector2(ballBodyPos.x(), ballBodyPos.z()); // Usar .x() y .z() para acceder a los componentes

             // Comprobar si la bola está cerca de algún bolsillo
             let isInPocket = false;
             for (const pocketPos of pocketPositions) {
                 const distanceToPocket = ballPosXZ.distanceTo(pocketPos);
                 if (distanceToPocket < pocketDetectionRadius) {
                     isInPocket = true;
                     break; // La bola está en un bolsillo, no necesitamos comprobar los demás
                 }
             }

             // Si la bola está en un bolsillo Y ha caído por debajo de la superficie de la mesa
             // (para evitar detecciones falsas si la bola está justo encima de un bolsillo pero no ha caído)
             // También comprobamos si la bola está por debajo de un umbral Y general como respaldo
             if ((isInPocket || ballBodyPos.y() < tableSurfaceY - ballRadius * 5) && ballBodyPos.y() < tableSurfaceY - ballRadius) { // Usar .y() para acceder al componente Y
                 console.log(`¡Bola ${ball.name.toUpperCase()} cayó en un bolsillo o fuera de la mesa! Reseteando.`);
                 resetBall(ball); // Usar la función resetBall del módulo balls
                 needsReset = true;
                 // TODO: Implementar lógica de puntuación/falta si una bola cae en un bolsillo (ej. bola blanca = falta)
                 // La detección de faltas está comentada temporalmente.
                 if (ball.name === 'white') {
                     console.warn("¡FALTA: Bola blanca cayó en el bolsillo! (Detección de falta comentada)");
                     // foulOccurred = true; // No se actualizará sin lógica de colisión
                     displayMessage("¡FALTA: Bola blanca en el bolsillo!"); // Mostrar mensaje en UI
                 } else {
                     // Lógica para bolas de color embocadas (si aplica en el futuro)
                 }
             }
         }
     });
     if (needsReset) { isStrokeInProgress = false; }
}

 // checkStrokeEnd Function - Necesaria (Adaptada para Ammo.js)
 export function checkStrokeEnd() {
     if (!isStrokeInProgress) return;
     const balls = getBalls();
     // Comprobar si TODAS las bolas están dormidas o casi paradas (Adaptada para Ammo.js)
     const allStopped = balls.every(b => {
         if (!b || !b.body) return true;
         // En Ammo, el estado de activación 1 es ISLAND_SLEEPING
         const sleep = b.body.getActivationState() === 1;
         if (sleep) { return true; } // Si está dormida, está parada

         // Comprobar velocidad lineal y angular
         const linearVelocity = b.body.getLinearVelocity().length();
         const angularVelocity = b.body.getAngularVelocity().length();

         return linearVelocity < stopVelocityThreshold && angularVelocity < stopVelocityThreshold;
     });

     if (allStopped) {
         console.log("Tiro finalizado. Comprobando resultado...");

         let madeCarom = false; // No se actualizará sin lógica de colisión
         let message = "";

         // La lógica de puntuación y faltas depende de la detección de colisiones, que está comentada.
         // Por ahora, simplemente terminamos el tiro y cambiamos de turno.

         message = "Tiro finalizado. Lógica de puntuación/faltas comentada. Turno para el siguiente jugador.";
         console.log(message);
         changeTurn();


         // Actualizar UI con el mensaje y la puntuación (la puntuación no se actualizará sin lógica de colisión)
         displayMessage(message);
         updateScoreDisplay(); // Esto actualizará la visualización de la puntuación actual (que no cambia)


         // Resetear estado para el próximo tiro
         isStrokeInProgress = false;
         hitYellowAfterStrokeStart = false; // No se actualizará sin lógica de colisión
         hitRedAfterStrokeStart = false; // No se actualizará sin lógica de colisión
         cushionHitsThisStroke = 0; // No se actualizará sin lógica de colisión
         foulOccurred = false; // No se actualizará sin lógica de colisión
         firstBallHit = null; // No se actualizará sin lógica de colisión

         console.log("Listo para el siguiente tiro. Jugador actual:", currentPlayer);
     }
 }

 // Función para cambiar de turno (simplificada para 2 jugadores)
 function changeTurn() {
     currentPlayer = currentPlayer === 1 ? 2 : 1;
     console.log("Cambiando turno. Ahora es el turno del Jugador", currentPlayer);
     // Actualizar UI para indicar el jugador actual
     displayMessage(`Turno del Jugador ${currentPlayer}`);
 }

 export function getScore() {
     return score; // La puntuación no se actualizará sin lógica de colisión
 }

 export function getCurrentPlayer() {
     return currentPlayer;
 }