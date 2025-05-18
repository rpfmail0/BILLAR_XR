// No se importa CANNON.js, se asume que Ammo.js está disponible globalmente o se carga asíncronamente.

let world = null;
let physicsWorld = null; // Referencia al mundo de Ammo
let dispatcher = null;
let collisionConfiguration = null;
let broadphase = null;
let solver = null;

// Materiales físicos y de contacto (la implementación en Ammo es diferente a CANNON)
// En Ammo, las propiedades de fricción y restitución se suelen establecer en los cuerpos rígidos o formas.
// Simplificaremos esto inicialmente y nos enfocaremos en las propiedades de los cuerpos.
let ballMaterialProps = { friction: 0.1, restitution: 0.9 }; // Propiedades para bolas
let cushionMaterialProps = { friction: 0.2, restitution: 0.6 }; // Propiedades para cojines
let tableMaterialProps = { friction: 0.04, restitution: 0.2 }; // Propiedades para la mesa

export async function initPhysics() {
    console.log("Configurando mundo físico Ammo.js...");

    // Inicializar Ammo.js (asumiendo que la función Ammo() está disponible globalmente)
    if (typeof Ammo === 'undefined') {
        console.error("Ammo.js no cargado. Asegúrate de incluir ammo.js o ammo.wasm.js.");
        return null;
    }
    await Ammo(); // Esperar a que Ammo.js se inicialice completamente

    // Configuración básica del mundo de física
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase(); // O btAxis3Sweep
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);

    // Configurar gravedad
    physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0)); // Gravedad activada

    console.log("Mundo físico Ammo.js creado.");

    // No retornamos materiales de contacto como en CANNON, las propiedades se aplicarán a los cuerpos.
    return { world: physicsWorld, ballMaterial: ballMaterialProps, cushionMaterial: cushionMaterialProps, tableMaterial: tableMaterialProps };
}

export function getWorld() {
    return physicsWorld;
}

// Funciones para obtener propiedades de materiales (simplificado)
export function getBallMaterial() { return ballMaterialProps; }
export function getCushionMaterial() { return cushionMaterialProps; }
export function getTableMaterial() { return tableMaterialProps; }


export function addBodyToWorld(body) {
    if (physicsWorld && body) {
        physicsWorld.addRigidBody(body);
    } else {
        console.error("Mundo físico no inicializado o cuerpo no válido.");
    }
}

export function removeBodyFromWorld(body) {
     if (physicsWorld && body) {
         physicsWorld.removeRigidBody(body);
     } else {
         console.error("Mundo físico no inicializado o cuerpo no válido.");
     }
 }

export function stepPhysics(timeStep) {
    if (physicsWorld) {
        // Ammo.js stepSimulation requiere deltaTime, y opcionalmente maxSubSteps y fixedTimeStep
        // Usaremos un paso de tiempo fijo para consistencia
        const maxSubSteps = 10; // Número máximo de substeps
        const fixedTimeStep = timeStep / maxSubSteps; // Paso de tiempo fijo para cada substep
        physicsWorld.stepSimulation(timeStep, maxSubSteps, fixedTimeStep);
    }
}

// Limpieza (opcional, pero buena práctica)
export function cleanupPhysics() {
    if (physicsWorld) {
        // Liberar memoria de Ammo.js (esto puede ser complejo dependiendo de cómo se crearon los objetos)
        // Un enfoque simple es eliminar el mundo y sus componentes principales
        Ammo.destroy(physicsWorld);
        Ammo.destroy(solver);
        Ammo.destroy(broadphase);
        Ammo.destroy(dispatcher);
        Ammo.destroy(collisionConfiguration);
        console.log("Mundo físico Ammo.js limpiado.");
    }
}