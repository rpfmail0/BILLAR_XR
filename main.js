import { initScene, getScene, getCamera, getRenderer, onWindowResize, setTableGroup, getTableGroup } from './scene.js';
import { initPhysics, getWorld, stepPhysics } from './physics.js'; // initPhysics ahora es async
import { createTable } from './table.js';
import { createBalls, getBalls } from './balls.js';
import { setupControllers } from './controllers.js';
import { checkBallsFallen, checkStrokeEnd } from './game.js'; // onCollision ya no se importa/usa directamente
// No se importa CANNON.js

const timeStep = 1 / 60;

init();

async function init() { // Función init ahora es async
    console.log("Iniciando aplicación WebXR Billar modular con Ammo.js...");

    // Inicializar Scene, Camera, Renderer
    const { scene, camera, renderer } = initScene(document.body);

    // Inicializar Physics World (esperar inicialización de Ammo.js)
    const physicsResult = await initPhysics();
    if (!physicsResult) {
        console.error("Error al inicializar el mundo físico con Ammo.js.");
        return; // Detener la inicialización si falla la física
    }
    const world = physicsResult.world; // Obtener el mundo de Ammo.js

    // Crear Mesa
    const tableGroup = createTable();
    scene.add(tableGroup); // Añadir la mesa a la escena

    // Crear Bolas
    createBalls();

    // Configurar Controladores
    setupControllers();

    // El listener de colisión se manejaba de forma diferente en CANNON.js.
    // Con Ammo.js, la detección de colisiones se suele hacer iterando sobre el despachador de colisiones
    // en el bucle de simulación. La función onCollision en game.js está comentada temporalmente.
    // Por lo tanto, eliminamos el código que añadía el listener de colisión de CANNON.js.
    /*
    const balls = getBalls();
    balls.forEach(ball => {
        if (ball && ball.body) {
            ball.body.addEventListener('collide', onCollision);
        }
    });
    */


    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Start Animation Loop
    renderer.setAnimationLoop(animate);

    console.log("Inicialización modular con Ammo.js completa. Iniciando bucle de animación.");
}

// Objeto temporal para la sincronización de Ammo.js
const transformAux = new Ammo.btTransform();

function animate() {
    const world = getWorld(); // Obtener el mundo de Ammo.js
    const renderer = getRenderer();
    const scene = getScene();
    const camera = getCamera();
    const balls = getBalls();
    const tableGroup = getTableGroup();


    // Actualizar física
    if (world) {
        try { stepPhysics(timeStep); } catch (e) { console.error("Error during stepPhysics():", e); }
    }

    // Sincronizar visuales con física (Adaptado para Ammo.js)
    balls.forEach(ball => {
        if (ball && ball.body && ball.mesh && tableGroup) {
            try {
                // Obtener la transformación del cuerpo rígido de Ammo.js
                ball.body.getMotionState().getWorldTransform(transformAux);
                const ammoPos = transformAux.getOrigin();
                const ammoQuat = transformAux.getRotation();

                // Convertir la posición de Ammo.js (MUNDIAL) a posición LOCAL para la malla
                const worldPos = new THREE.Vector3(ammoPos.x(), ammoPos.y(), ammoPos.z());
                const localPos = tableGroup.worldToLocal(worldPos);

                // Aplicar posición y rotación a la malla de Three.js
                ball.mesh.position.copy(localPos);
                ball.mesh.quaternion.set(ammoQuat.x(), ammoQuat.y(), ammoQuat.z(), ammoQuat.w());

            } catch(e) { console.error(`Error syncing ball ${ball.name} with Ammo.js:`, e); }
        }
    });


    // Comprobar estado del juego (funciones adaptadas para Ammo.js)
    try { checkBallsFallen(); checkStrokeEnd(); } catch (e) { console.error("Error during game state checks:", e); }

    // Render Scene
    if (renderer && scene && camera) {
        try { renderer.render(scene, camera); } catch (e) { console.error("Error during renderer.render():", e); }
    }
}