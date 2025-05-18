import * as THREE from 'three';
import * as CANNON from 'cannon';
import { getTableGroup } from './scene.js';
import { addBodyToWorld, getBallMaterial } from './physics.js';
import { isStrokeInProgress, setStrokeInProgress } from './game.js'; // Importar estado del tiro

const balls = []; // Array para { mesh, body, name }
let cueBall;
let initialBallPositions = {};

// Constants (Relacionadas con las bolas)
const ballRadius = 0.03075;
const ballMass = 0.21;
const tableSurfaceY = -0.4; // Necesario para la posición inicial de las bolas

// --- Create Balls Function (Visual + Physics Body Creation/Adding) ---
export function createBalls() {
     console.log("Creando bolas (Visual + Física)...");
     const tableGroup = getTableGroup();
     const ballMaterial = getBallMaterial();
     if (!tableGroup || !ballMaterial) { console.error("Dependencias de bolas no cargadas."); return; }

     const sphereGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
     const damping = 0.15;
     const ballYPos = ballRadius; // Posición Y local sobre la superficie
     const ballData = [
         { name: 'white', color: 0xffffff, x: 0, z: 2.84 * 0.25 }, // Usar tableHeight directamente o importarla si es constante global
         { name: 'yellow', color: 0xffff00, x: 1.42 * 0.2, z: -2.84 * 0.25 }, // Usar tableWidth y tableHeight
         { name: 'red', color: 0xff0000, x: -1.42 * 0.2, z: -2.84 * 0.25 } // Usar tableWidth y tableHeight
     ];
     balls.length = 0; // Limpiar array
     initialBallPositions = {}; // Limpiar posiciones

     ballData.forEach(data => {
         // Visual Mesh
         const material = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.1, metalness: 0.1 });
         const mesh = new THREE.Mesh(sphereGeometry, material);
         mesh.position.set(data.x, ballYPos, data.z); // Posición LOCAL
         mesh.castShadow = true; // Bolas proyectan sombras
         tableGroup.add(mesh); // Añadir al grupo

         // Physics Body
         let body = null;
         try {
             const shape = new CANNON.Sphere(ballRadius);
             body = new CANNON.Body({
                 mass: ballMass, // Masa > 0 para ser dinámico
                 material: ballMaterial,
                 shape: shape,
                 linearDamping: damping,
                 angularDamping: damping,
                 allowSleep: true,
                 sleepSpeedLimit: 0.1,
                 sleepTimeLimit: 1.0
             });
             const worldPos = tableGroup.localToWorld(mesh.position.clone()); // Calcular pos MUNDIAL inicial
             body.position.copy(worldPos);
             // body.addEventListener('collide', onCollision); // El listener de colisión se añadirá en game.js
             addBodyToWorld(body); // Añadir cuerpo al mundo físico usando la función del módulo physics

         } catch (e) { console.error(`Error creando/añadiendo cuerpo físico para ${data.name}:`, e); }

         // Guardar referencia
         const ballInfo = { mesh: mesh, body: body, name: data.name };
         balls.push(ballInfo);
         if (data.name === 'white') { cueBall = ballInfo; }
         initialBallPositions[data.name] = { mesh: mesh.position.clone(), body: body ? body.position.clone() : null };

     });
     console.log("Creación de bolas (visual + cuerpo físico) completa.");
}

// resetBall Function - Necesaria
export function resetBall(ball) {
     if (!ball || !ball.body || !ball.mesh || !initialBallPositions[ball.name]) { return; }
     // console.log(`--- RESETEANDO BOLA ${ball.name.toUpperCase()} ---`);
     ball.body.velocity.set(0, 0, 0);
     ball.body.angularVelocity.set(0, 0, 0);
     ball.body.sleep();
     ball.body.position.copy(initialBallPositions[ball.name].body); // Reset body a pos MUNDIAL inicial
     ball.body.wakeUp();
     ball.mesh.position.copy(initialBallPositions[ball.name].mesh); // Reset mesh a pos LOCAL inicial
     ball.mesh.quaternion.set(0, 0, 0, 1);
     if (ball.name === 'white') { setStrokeInProgress(false); } // Resetear estado del tiro si es la blanca usando la función del módulo game
}

export function getBalls() {
    return balls;
}

export function getCueBall() {
    return cueBall;
}

export function getBallRadius() {
    return ballRadius;
}

export function getInitialBallPositions() {
    return initialBallPositions;
}