import * as CANNON from 'cannon';

let world;
let ballMaterial, cushionMaterial, tableMaterial;
let cm_ball_ball, cm_ball_cushion, cm_ball_table;

export function initPhysics() {
    console.log("Configurando mundo físico Cannon.js...");

    if (typeof CANNON === 'undefined') { console.error("Cannon.js no cargado!"); return null; }
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Gravedad activada
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;
    world.solver.iterations = 15; // Ajustar según rendimiento
    console.log("Mundo físico Cannon.js creado.");

    // Physics Materials Setup
    ballMaterial = new CANNON.Material('ball');
    cushionMaterial = new CANNON.Material('cushion');
    tableMaterial = new CANNON.Material('table');
    console.log("Materiales físicos creados.");

    // Contact Materials
    cm_ball_ball = new CANNON.ContactMaterial(ballMaterial, ballMaterial, { friction: 0.1, restitution: 0.9 });
    cm_ball_cushion = new CANNON.ContactMaterial(ballMaterial, cushionMaterial, { friction: 0.2, restitution: 0.6 }); // Ajustado para un rebote más realista en bandas
    cm_ball_table = new CANNON.ContactMaterial(ballMaterial, tableMaterial, { friction: 0.04, restitution: 0.2 });
    world.addContactMaterial(cm_ball_ball);
    world.addContactMaterial(cm_ball_cushion); // Añadir contacto bola-banda
    world.addContactMaterial(cm_ball_table);
    console.log("Materiales de contacto añadidos al mundo.");

    return { world, ballMaterial, cushionMaterial, tableMaterial };
}

export function getWorld() { return world; }
export function getBallMaterial() { return ballMaterial; }
export function getCushionMaterial() { return cushionMaterial; }
export function getTableMaterial() { return tableMaterial; }

export function addBodyToWorld(body) {
    if (world) {
        world.addBody(body);
    } else {
        console.error("Mundo físico no inicializado.");
    }
}

export function removeBodyFromWorld(body) {
     if (world) {
         world.removeBody(body);
     } else {
         console.error("Mundo físico no inicializado.");
     }
 }

export function stepPhysics(timeStep) {
    if (world) {
        world.step(timeStep);
    }
}