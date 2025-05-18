import * as THREE from 'three';
import * as CANNON from 'cannon'; // Necesario para CANNON.Vec3
import { getRenderer, getScene } from './scene.js';
import { shootBall } from './game.js'; // Importar la función de disparo
import { getCueBall, getBallRadius } from './balls.js'; // Importar getCueBall y getBallRadius
import { getTableGroup } from './scene.js'; // Importar getTableGroup

let controller1, controller2;
let cueController = null; // Se asignará al controller2
let cueStickMesh;
let isTriggerDown = false;
let cuePullBackStartPosition = null; // Para almacenar la posición inicial al apretar el gatillo

export function setupControllers() {
    console.log("Configurando mandos WebXR...");
    const renderer = getRenderer();
    const scene = getScene();
    if (!renderer || !scene) { console.error("Dependencias de mandos no cargadas."); return; }

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);

    // Asignar controller2 como el mando del taco
    cueController = controller2;

    // Crear y posicionar un taco visual simple (ejemplo)
    const cueGeometry = new THREE.CylinderGeometry(0.01, 0.02, 1.5, 8);
    const cueMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    cueStickMesh = new THREE.Mesh(cueGeometry, cueMaterial);
    cueStickMesh.rotation.x = Math.PI / 2; // Orientar correctamente
    cueStickMesh.position.z = -0.75; // Posicionar en relación al mando
    cueController.add(cueStickMesh); // Añadir el taco al mando

    console.log("Configuración de mandos completa.");
}

// --- WebXR Event Handlers (Disparo Activado) ---
function onSelectStart(event) {
     const controller = event.target;
     if (controller === cueController) {
         isTriggerDown = true;
         // Guardar la posición inicial del taco (mando) al apretar el gatillo
         cuePullBackStartPosition = new THREE.Vector3();
         cueController.getWorldPosition(cuePullBackStartPosition);
         console.log("Trigger Pressed. Posición inicial del taco:", cuePullBackStartPosition);
     }
}

function onSelectEnd(event) {
     const controller = event.target;
     if (controller === cueController && isTriggerDown) {
         isTriggerDown = false;
         console.log(">>> Trigger Released - Intentando disparar...");

         if (cuePullBackStartPosition) {
             const cueBall = getCueBall();
             const tableGroup = getTableGroup();
             const ballRadius = getBallRadius();

             if (!cueBall || !cueBall.body || !tableGroup || ballRadius === undefined) {
                 console.error("Dependencias para calcular el tiro no cargadas.");
                 cuePullBackStartPosition = null;
                 return;
             }

             // Calcular la posición final del taco al soltar el gatillo
             const cueReleasePosition = new THREE.Vector3();
             cueController.getWorldPosition(cueReleasePosition);
             console.log("Posición final del taco:", cueReleasePosition);

             // Calcular la dirección del impulso (basada en la dirección del taco)
             const impulseDirection = new THREE.Vector3();
             cueController.getWorldDirection(impulseDirection);
             impulseDirection.y = 0; // Impulso en el plano XZ
             impulseDirection.normalize();
             console.log("Dirección del impulso (normalizada XZ):", impulseDirection);


             // Calcular la magnitud del impulso (basada en la distancia de retroceso)
             const pullBackVector = new THREE.Vector3().subVectors(cuePullBackStartPosition, cueReleasePosition);
             pullBackVector.y = 0; // Ignorar movimiento vertical para la magnitud
             let impulseMagnitude = pullBackVector.length();

             // Opcional: Limitar la magnitud máxima del impulso
             const maxImpulseMagnitude = 2.0; // Ajusta este valor según sea necesario
             if (impulseMagnitude > maxImpulseMagnitude) {
                 impulseMagnitude = maxImpulseMagnitude;
                 console.warn(`Magnitud de impulso limitada a ${maxImpulseMagnitude}`);
             }

             console.log("Magnitud de impulso calculada:", impulseMagnitude);


             // Calcular el punto de impacto (hitOffset) en la bola blanca
             const cueBallWorldPosition = new THREE.Vector3();
             cueBall.mesh.getWorldPosition(cueBallWorldPosition); // Posición mundial de la bola blanca

             // Proyectar la posición del taco en el plano de la mesa (a la altura de la bola blanca)
             const cueProjectedPosition = cueReleasePosition.clone();
             cueProjectedPosition.y = cueBallWorldPosition.y; // A la altura de la bola blanca

             // Vector desde el centro de la bola blanca hasta la posición proyectada del taco
             const hitVector = new THREE.Vector3().subVectors(cueProjectedPosition, cueBallWorldPosition);
             hitVector.y = 0; // Asegurarse de que esté en el plano XZ

             // Limitar el hitOffset al radio de la bola para evitar golpes fuera de la bola
             const maxHitOffsetDistance = ballRadius * 0.9; // Un poco menos que el radio para evitar problemas
             if (hitVector.length() > maxHitOffsetDistance) {
                 hitVector.setLength(maxHitOffsetDistance);
                 console.warn(`HitOffset limitado a ${maxHitOffsetDistance}`);
             }

             // Convertir el hitOffset de THREE.Vector3 a CANNON.Vec3
             const hitOffset = new CANNON.Vec3(hitVector.x, hitVector.y, hitVector.z);
             console.log("HitOffset calculado (CANNON.Vec3):", hitOffset);


             // Llamar a la función de disparo con el vector de impulso y el hitOffset
             const impulse = new CANNON.Vec3(impulseDirection.x * impulseMagnitude, impulseDirection.y * impulseMagnitude, impulseDirection.z * impulseMagnitude);
             shootBall(impulse, hitOffset); // Pasar vector de impulso y hitOffset

             cuePullBackStartPosition = null; // Resetear posición inicial

         } else {
             console.warn("cuePullBackStartPosition no definido al soltar el gatillo.");
             // Si no se registró la posición inicial, realizar un disparo con fuerza mínima o nula
             // Pasar un impulso mínimo y hitOffset cero
             shootBall(new CANNON.Vec3(0, 0, -0.1), new CANNON.Vec3(0, 0, 0)); // Impulso mínimo hacia adelante
         }
     }
}

export function getCueController() {
    return cueController;
}

export function getIsTriggerDown() {
    return isTriggerDown;
}