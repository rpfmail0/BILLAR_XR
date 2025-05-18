import { initScene, getScene, getCamera, getRenderer, onWindowResize, setTableGroup, getTableGroup } from './scene.js';
import { initPhysics, getWorld, stepPhysics } from './physics.js';
import { createTable } from './table.js';
import { createBalls, getBalls } from './balls.js';
import { setupControllers } from './controllers.js';
import { checkBallsFallen, checkStrokeEnd, onCollision } from './game.js';
import * as CANNON from 'cannon'; // Necesario para añadir el listener de colisión

const timeStep = 1 / 60;

init();

function init() {
    console.log("Iniciando aplicación WebXR Billar modular...");

    // Inicializar Scene, Camera, Renderer
    const { scene, camera, renderer } = initScene(document.body);

    // Inicializar Physics World
    const { world } = initPhysics();

    // Crear Mesa
    const tableGroup = createTable();
    scene.add(tableGroup); // Añadir la mesa a la escena

    // Crear Bolas
    createBalls();

    // Configurar Controladores
    setupControllers();

    // Añadir listener de colisión a todas las bolas después de crearlas
    const balls = getBalls();
    balls.forEach(ball => {
        if (ball && ball.body) {
            ball.body.addEventListener('collide', onCollision);
        }
    });


    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Start Animation Loop
    renderer.setAnimationLoop(animate);

    console.log("Inicialización modular completa. Iniciando bucle de animación.");
}

function animate() {
    const world = getWorld();
    const renderer = getRenderer();
    const scene = getScene();
    const camera = getCamera();
    const balls = getBalls();
    const tableGroup = getTableGroup();


    // Actualizar física
    if (world) {
        try { stepPhysics(timeStep); } catch (e) { console.error("Error during stepPhysics():", e); }
    }

    // Sincronizar visuales con física
    balls.forEach(ball => {
        if (ball && ball.body && ball.mesh && tableGroup) {
            try {
                const bodyPos = ball.body.position;
                if (isNaN(bodyPos.x) || isNaN(bodyPos.y) || isNaN(bodyPos.z)) {
                     console.warn(`Posición inválida (NaN) detectada para ${ball.name} body ANTES de worldToLocal.`);
                     return;
                }
                const localPos = tableGroup.worldToLocal(bodyPos.position.clone()); // Usar .position para obtener el Vec3 de CANNON
                ball.mesh.position.copy(localPos);
                ball.mesh.quaternion.copy(ball.body.quaternion);
            } catch(e) { console.error(`Error syncing ball ${ball.name}:`, e); }
        }
    });


    // Comprobar estado del juego
    try { checkBallsFallen(); checkStrokeEnd(); } catch (e) { console.error("Error during game state checks:", e); }

    // Render Scene
    if (renderer && scene && camera) {
        try { renderer.render(scene, camera); } catch (e) { console.error("Error during renderer.render():", e); }
    }
}