import * as THREE from 'three';
// No se importa CANNON.js, se asume que Ammo.js está disponible globalmente.
import { getTableGroup } from './scene.js';
import { addBodyToWorld, removeBodyFromWorld, getBallMaterial } from './physics.js'; // Importar removeBodyFromWorld si se usa
import { isStrokeInProgress, setStrokeInProgress } from './game.js'; // Importar estado del tiro

const balls = []; // Array para { mesh, body, name }
let cueBall;
let initialBallPositions = {};

// Constants (Relacionadas con las bolas)
var ballRadius = 0.03075; // Usando var por si acaso, aunque const debería funcionar con Ammo
const ballMass = 0.21;
const tableSurfaceY = -0.4; // Necesario para la posición inicial de las bolas

// --- Create Balls Function (Visual + Physics Body Creation/Adding) ---
export function createBalls() {
     console.log("Creando bolas (Visual + Física) con Ammo.js...");
     const tableGroup = getTableGroup();
     const ballMaterialProps = getBallMaterial(); // Obtener propiedades del material de physics.js
     if (!tableGroup || !ballMaterialProps) { console.error("Dependencias de bolas no cargadas."); return; }

     const sphereGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
     const damping = 0.15; // Amortiguación lineal y angular
     const ballYPos = ballRadius; // Posición Y local sobre la superficie
     const ballData = [
         { name: 'white', color: 0xffffff, x: 0, z: 2.84 * 0.25 }, // Usar tableHeight directamente o importarla si es constante global
         { name: 'yellow', color: 0xffff00, x: 1.42 * 0.2, z: -2.84 * 0.25 }, // Usar tableWidth y tableHeight
         { name: 'red', color: 0xff0000, x: -1.42 * 0.2, z: -2.84 * 0.25 } // Usar tableWidth y tableHeight
     ];
     balls.length = 0; // Limpiar array
     initialBallPositions = {}; // Limpiar posiciones

     // Reutilizar forma y transformaciones para eficiencia
     const sphereShape = new Ammo.btSphereShape(ballRadius);
     const localInertia = new Ammo.btVector3(0, 0, 0);
     if (ballMass !== 0) {
         sphereShape.calculateLocalInertia(ballMass, localInertia);
     }

     ballData.forEach(data => {
         // Visual Mesh
         const material = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.1, metalness: 0.1 });
         const mesh = new THREE.Mesh(sphereGeometry, material);
         mesh.position.set(data.x, ballYPos, data.z); // Posición LOCAL
         mesh.castShadow = true; // Bolas proyectan sombras
         tableGroup.add(mesh); // Añadir al grupo

         // Physics Body (Ammo.js)
         let body = null;
         try {
             const startTransform = new Ammo.btTransform();
             const worldPos = tableGroup.localToWorld(mesh.position.clone()); // Calcular pos MUNDIAL inicial
             startTransform.setIdentity();
             startTransform.setOrigin(new Ammo.btVector3(worldPos.x, worldPos.y, worldPos.z));

             const motionState = new Ammo.btDefaultMotionState(startTransform);
             const rbInfo = new Ammo.btRigidBodyConstructionInfo(ballMass, motionState, sphereShape, localInertia);

             // Aplicar propiedades de material (fricción, restitución)
             rbInfo.set_m_friction(ballMaterialProps.friction);
             rbInfo.set_m_restitution(ballMaterialProps.restitution);

             body = new Ammo.btRigidBody(rbInfo);

             // Configurar amortiguación
             body.setDamping(damping, damping);

             // Configurar estado de sueño
             if (ballMass !== 0) { // Solo cuerpos dinámicos pueden dormir
                 body.setActivationState(4); // 4 = DISABLE_DEACTIVATION, 0 = ACTIVE, 1 = ISLAND_SLEEPING, 2 = WANTS_DEACTIVATION, 3 = DISABLE_SIMULATION
                 body.setSleepingThresholds(0.1, 0.1); // Umbrales de velocidad lineal/angular para dormir
             }


             addBodyToWorld(body); // Añadir cuerpo al mundo físico usando la función del módulo physics

         } catch (e) { console.error(`Error creando/añadiendo cuerpo físico para ${data.name} con Ammo.js:`, e); }

         // Guardar referencia
         const ballInfo = { mesh: mesh, body: body, name: data.name };
         balls.push(ballInfo);
         if (data.name === 'white') { cueBall = ballInfo; }

         // Guardar posición inicial del cuerpo físico (MUNDIAL) y malla (LOCAL)
         const initialBodyPos = new Ammo.btVector3(worldPos.x, worldPos.y, worldPos.z);
         initialBallPositions[data.name] = { mesh: mesh.position.clone(), body: initialBodyPos };

     });
     console.log("Creación de bolas (visual + cuerpo físico Ammo.js) completa.");
}

// resetBall Function - Necesaria (Adaptada para Ammo.js)
export function resetBall(ball) {
     if (!ball || !ball.body || !ball.mesh || !initialBallPositions[ball.name] || !initialBallPositions[ball.name].body) { return; }
     console.log(`--- RESETEANDO BOLA ${ball.name.toUpperCase()} con Ammo.js ---`);

     // Resetear velocidad y amortiguación
     ball.body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
     ball.body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
     ball.body.setDamping(0.15, 0.15); // Asegurar que la amortiguación se restablece

     // Resetear posición y rotación
     const initialTransform = new Ammo.btTransform();
     initialTransform.setIdentity();
     const initialBodyPos = initialBallPositions[ball.name].body;
     initialTransform.setOrigin(new Ammo.btVector3(initialBodyPos.x(), initialBodyPos.y(), initialBodyPos.z()));
     ball.body.setWorldTransform(initialTransform);

     // Activar cuerpo y ponerlo a dormir si es dinámico
     if (ball.body.getMass() !== 0) {
         ball.body.activate(); // Activar para asegurar que se actualice la transformación
         ball.body.setActivationState(1); // 1 = ISLAND_SLEEPING
     }


     // Resetear malla visual a posición LOCAL inicial
     ball.mesh.position.copy(initialBallPositions[ball.name].mesh);
     ball.mesh.quaternion.set(0, 0, 0, 1); // Resetear rotación visual

     if (ball.name === 'white') { setStrokeInProgress(false); } // Resetear estado del tiro si es la blanca usando la función del módulo game
     console.log(`--- BOLA ${ball.name.toUpperCase()} RESETEADA ---`);
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