import * as CANNON from 'cannon';
import * as THREE from 'three'; // Necesario para THREE.Vector3
import { getCueBall, getBalls, resetBall, getBallRadius } from './balls.js';
import { getCueController, getIsTriggerDown } from './controllers.js';
import { getCushionMaterial } from './physics.js';
import { tableSurfaceY, tableWidth, tableHeight } from './table.js'; // Importar constantes de table.js
import { updateScoreDisplay, displayMessage } from './ui.js'; // Importar funciones de UI

// --- Global Variables (Estado del Juego) ---
let score = 0;
export let isStrokeInProgress = false;
let hitYellowAfterStrokeStart = false;
let hitRedAfterStrokeStart = false;
let cushionHitsThisStroke = 0;
const stopVelocityThreshold = 0.01;

// --- Variables de Estado del Juego Adicionales ---
let currentPlayer = 1; // Jugador actual (ej. 1 o 2)
let foulOccurred = false; // Indica si se cometió una falta en el tiro actual
let firstBallHit = null; // La primera bola de color golpeada por la bola blanca

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

// shootBall Function - CON COMPROBACIÓN isQuiet MODIFICADA
export function shootBall(impulse, hitOffset) {
    console.log("--- Entrando a shootBall() ---");
    const cueBall = getCueBall();
    const balls = getBalls();
    if (!cueBall || !cueBall.body) { console.error("Error: cueBall o cueBall.body no definido."); return; }
    console.log("Estado actual: isStrokeInProgress =", isStrokeInProgress);

    // Comprobación de quietud MÁS PERMISIVA
    let allQuiet = true;
    const quietCheckThreshold = 0.3; // Umbral relajado
    balls.forEach((b, index) => {
        if (!b || !b.body) { console.warn(`Advertencia: Falta body para bola ${index} en chequeo isQuiet.`); return; }
        const sleep = b.body.sleepState === CANNON.Body.SLEEPING;
        if (sleep) { return; }
        const vel = b.body.velocity.lengthSquared();
        if (vel > quietCheckThreshold) { allQuiet = false; }
    });
    console.log("Resultado de isQuiet (Umbral Relajado):", allQuiet);

    if (!allQuiet || isStrokeInProgress) {
        console.log("CONDICIÓN DE DISPARO NO CUMPLIDA:", !allQuiet ? "Bolas en movimiento." : "", isStrokeInProgress ? "Tiro ya en progreso." : "");
        displayMessage("Bolas en movimiento o tiro en progreso."); // Mostrar mensaje en UI
        return;
    }

    // Aplicar Impulso con el vector de impulso y hitOffset calculados en controllers.js
    console.log("Aplicando impulso:", impulse, "con hitOffset:", hitOffset);
    try {
        cueBall.body.wakeUp();
        cueBall.body.applyImpulse(impulse, hitOffset);
        console.log("Impulso aplicado a cueBall.body.");
        displayMessage("Tiro en progreso..."); // Mostrar mensaje en UI
    } catch(e) { console.error("¡Error al aplicar impulso!", e); return; }

    // Iniciar seguimiento del tiro
    isStrokeInProgress = true;
    hitYellowAfterStrokeStart = false;
    hitRedAfterStrokeStart = false;
    cushionHitsThisStroke = 0;
    foulOccurred = false; // Resetear falta al inicio del tiro
    firstBallHit = null; // Resetear primera bola golpeada al inicio del tiro

    console.log(`¡Disparo Realizado! Stroke iniciado.`);
    console.log("--- Saliendo de shootBall() ---");
}

// onCollision Function - Necesaria para lógica de puntuación
export function onCollision(event) {
     // Solo procesar colisiones si un tiro está en progreso
     if (!isStrokeInProgress) return;

     const bodyA = event.contact.bi;
     const bodyB = event.contact.bj;
     const cueBall = getCueBall();
     const balls = getBalls();
     const cushionMaterial = getCushionMaterial();
     const isTriggerDown = getIsTriggerDown(); // Obtener estado del gatillo

     const whiteBallBody = cueBall?.body;
     const yellowBallBody = balls.find(b => b.name === 'yellow')?.body;
     const redBallBody = balls.find(b => b.name === 'red')?.body;
     // Necesitamos el cuerpo del taco para detectar doble golpe
     // Asumiendo que el cuerpo del taco se añade al mundo físico y se puede identificar
     // Por ahora, usaremos una detección simplificada basada en el estado del gatillo y colisión con la blanca.

     if (!whiteBallBody || !yellowBallBody || !redBallBody || !cushionMaterial) return;

     // --- Detección de Faltas ---

     // Falta: Doble Golpe (si el gatillo sigue apretado y la blanca colisiona con algo)
     // Esta es una simplificación. Una detección más precisa requeriría un cuerpo físico para el taco.
     if (isTriggerDown && (bodyA === whiteBallBody || bodyB === whiteBallBody)) {
         console.warn("¡FALTA: Posible Doble Golpe detectado!");
         foulOccurred = true;
         displayMessage("¡FALTA: Doble Golpe!"); // Mostrar mensaje en UI
         // No retornar inmediatamente para permitir que se detecten otras colisiones (ej. primera bola golpeada)
     }


     // --- Rastrear Primera Bola Golpeada por la Blanca ---
     // Solo si la colisión involucra a la bola blanca y una bola de color, y aún no hemos registrado la primera bola.
     if ((bodyA === whiteBallBody || bodyB === whiteBallBody) && (bodyA === yellowBallBody || bodyB === yellowBallBody || bodyA === redBallBody || bodyB === redBallBody)) {
         if (firstBallHit === null) {
             if (bodyA === whiteBallBody) {
                 firstBallHit = balls.find(b => b.body === bodyB)?.name;
             } else { // bodyB === whiteBallBody
                 firstBallHit = balls.find(b => b.body === bodyA)?.name;
             }
             console.log("Primera bola golpeada por la blanca:", firstBallHit);
             // Opcional: Mostrar en UI la primera bola golpeada
             // displayMessage(`Primera bola golpeada: ${firstBallHit.toUpperCase()}`);
         }
     }


     // Comprobar colisión con bandas (cushionMaterial)
     if ((bodyA === whiteBallBody && bodyB.material === cushionMaterial) || (bodyB === whiteBallBody && bodyA.material === cushionMaterial)) {
         cushionHitsThisStroke++;
         console.log("Golpe a banda! Total:", cushionHitsThisStroke); // Log temporal
     }
     // Las colisiones bola-bola (amarilla/roja) ya se rastrean con hitYellowAfterStrokeStart/hitRedAfterStrokeStart
     // No necesitamos lógica adicional aquí por ahora, ya que checkStrokeEnd usa estas banderas.
}

// checkBallsFallen Function - Necesaria
export function checkBallsFallen() {
     const balls = getBalls();
     const ballRadius = getBallRadius();
     const pocketDetectionRadius = getBallRadius() * 1.5; // Radio de detección del bolsillo (ajustar según sea necesario)
     let needsReset = false;
     // const fallThreshold = tableSurfaceY - ballRadius * 5; // Umbral de caída anterior

     balls.forEach(ball => {
         if (ball && ball.body) {
             // Obtener la posición de la bola en el plano XZ (ignorando Y)
             const ballPosXZ = new THREE.Vector2(ball.body.position.x, ball.body.position.z);

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
             if ((isInPocket || ball.body.position.y < tableSurfaceY - ballRadius * 5) && ball.body.position.y < tableSurfaceY - ballRadius) { // Ajustar umbral Y si es necesario
                 console.log(`¡Bola ${ball.name.toUpperCase()} cayó en un bolsillo o fuera de la mesa! Reseteando.`);
                 resetBall(ball); // Usar la función resetBall del módulo balls
                 needsReset = true;
                 // TODO: Implementar lógica de puntuación/falta si una bola cae en un bolsillo (ej. bola blanca = falta)
                 if (ball.name === 'white') {
                     console.warn("¡FALTA: Bola blanca cayó en el bolsillo!");
                     foulOccurred = true;
                     displayMessage("¡FALTA: Bola blanca en el bolsillo!"); // Mostrar mensaje en UI
                 } else {
                     // Lógica para bolas de color embocadas (si aplica en el futuro)
                 }
             }
         }
     });
     if (needsReset) { isStrokeInProgress = false; }
}

 // checkStrokeEnd Function - Necesaria
 export function checkStrokeEnd() {
     if (!isStrokeInProgress) return;
     const balls = getBalls();
     // Comprobar si TODAS las bolas están dormidas o casi paradas
     const allStopped = balls.every(b => {
         if (!b || !b.body) return true;
         return b.body.sleepState === CANNON.Body.SLEEPING || b.body.velocity.lengthSquared() < stopVelocityThreshold
     });

     if (allStopped) {
         console.log("Tiro finalizado. Comprobando resultado...");

         let madeCarom = false;
         let message = "";

         if (foulOccurred) {
             message = "¡FALTA! Turno para el siguiente jugador.";
             console.log(message);
             changeTurn();
         } else {
             // Comprobar si se hizo carambola a 3 bandas (Blanca -> Amarilla -> Roja + 3 Bandas O Blanca -> Roja -> Amarilla + 3 Bandas)
             // Simplificación: Solo comprobamos si golpeó ambas bolas de color y al menos 3 bandas.
             // Una implementación más precisa rastrearía el orden de los golpes.
             if (hitYellowAfterStrokeStart && hitRedAfterStrokeStart && cushionHitsThisStroke >= 3) {
                 madeCarom = true;
                 score++; // Asumiendo que solo hay un jugador o puntuación global por ahora
                 message = `¡CARAMBOLA A 3 BANDAS! Puntuación: ${score}`;
                 console.log(message);
                 // El jugador mantiene el turno si hace carambola
             } else {
                 message = "Tiro fallido o carambola no válida. Turno para el siguiente jugador.";
                 console.log(message);
                 changeTurn();
             }
         }

         // Actualizar UI con el mensaje y la puntuación
         displayMessage(message);
         updateScoreDisplay();


         // Resetear estado para el próximo tiro
         isStrokeInProgress = false;
         hitYellowAfterStrokeStart = false;
         hitRedAfterStrokeStart = false;
         cushionHitsThisStroke = 0;
         foulOccurred = false; // Resetear estado de falta
         firstBallHit = null; // Resetear primera bola golpeada

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
     return score;
 }

 export function getCurrentPlayer() {
     return currentPlayer;
 }