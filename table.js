import * as THREE from 'three';
import * as CANNON from 'cannon';
import { getTableGroup, setTableGroup } from './scene.js';
import { addBodyToWorld, getTableMaterial, getCushionMaterial } from './physics.js';

const tableParts = [];

// Rutas de las texturas (asegúrate de que estos archivos existan)
const feltTexturePath = './felt_texture.jpg';
const woodTexturePath = './wood_texture.jpg';

// Cargador de texturas
const textureLoader = new THREE.TextureLoader();

// Texturas (se cargarán de forma asíncrona)
let feltTexture = null;
let woodTexture = null;

// Cargar texturas
textureLoader.load(feltTexturePath, (texture) => {
    feltTexture = texture;
    feltTexture.wrapS = THREE.RepeatWrapping;
    feltTexture.wrapT = THREE.RepeatWrapping;
    feltTexture.repeat.set(2, 4); // Ajusta el tiling según el tamaño de la mesa
    console.log("Textura de tapete cargada.");
    // Opcional: Actualizar el material de la superficie si ya se creó
    const tableSurfaceMesh = getTableGroup()?.getObjectByName("TableSurface");
    if (tableSurfaceMesh && tableSurfaceMesh.material) {
        tableSurfaceMesh.material.map = feltTexture;
        tableSurfaceMesh.material.needsUpdate = true;
    }
}, undefined, (err) => {
    console.error('Error cargando textura de tapete:', err);
});

textureLoader.load(woodTexturePath, (texture) => {
    woodTexture = texture;
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(1, 1); // Ajusta el tiling según sea necesario
    console.log("Textura de madera cargada.");
    // Opcional: Actualizar el material de madera si ya se creó
    const tableGroup = getTableGroup();
    if (tableGroup) {
        tableGroup.traverse((object) => {
            if (object.isMesh && object.material && object.material.color.getHex() === 0x8B4513) { // Identificar por color inicial
                 object.material.map = woodTexture;
                 object.material.needsUpdate = true;
            }
        });
    }
}, undefined, (err) => {
    console.error('Error cargando textura de madera:', err);
});



// Constants (Relacionadas con la mesa)
const tableWidth = 1.42;
const tableHeight = 2.84;
const tableThickness = 0.01;
const cushionHeight = 0.05;
const cushionWidth = 0.05;
const tableSurfaceY = -0.4; // Mantener altura baja

export function createTable() {
    console.log("Creando mesa de billar (Visual + Física)...");

    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, tableSurfaceY, -1.5);
    setTableGroup(tableGroup); // Guardar referencia en scene.js

    createTableSurface(); // Crea visual y AÑADE cuerpo físico
    createCushionsAndFrame(); // Crea visual y AÑADE cuerpos físicos

    console.log("Mesa de billar creada.");
    return tableGroup;
}

// --- Función para crear superficie (Visual + Física AÑADIDA a World) ---
function createTableSurface() {
     // console.log("Creando superficie (Visual + Física)...");
     const tableGroup = getTableGroup();
     const tableMaterial = getTableMaterial();
     if (!tableGroup || !tableMaterial) { console.error("Dependencias de mesa no cargadas."); return; }

     let tableSurfaceMesh;
     try {
         const tableGeometry = new THREE.BoxGeometry(tableWidth, tableThickness, tableHeight);
         // Usar la textura si está cargada, de lo contrario usar color sólido
         const tableMeshMaterial = new THREE.MeshStandardMaterial({
             map: feltTexture,
             color: feltTexture ? 0xffffff : 0x006400, // Usar color blanco si hay textura para que la textura se vea correctamente
             roughness: 0.9
         });
         tableSurfaceMesh = new THREE.Mesh(tableGeometry, tableMeshMaterial);
         tableSurfaceMesh.name = "TableSurface";
         tableSurfaceMesh.position.y = -tableThickness / 2; // Local
         tableSurfaceMesh.receiveShadow = true;
         tableGroup.add(tableSurfaceMesh);
     } catch(e) { console.error("***** ERROR creando malla de tapete:", e); return; }

     let tableBody;
     try {
         const tableShape = new CANNON.Box(new CANNON.Vec3(tableWidth / 2, tableThickness / 2, tableHeight / 2));
         tableBody = new CANNON.Body({ mass: 0, material: tableMaterial });
         tableBody.addShape(tableShape);
         const tableBodyWorldPos = tableGroup.localToWorld(tableSurfaceMesh.position.clone());
         tableBody.position.copy(tableBodyWorldPos);
         tableBody.quaternion.copy(tableGroup.quaternion);
         addBodyToWorld(tableBody); // Añadir a world usando la función del módulo physics
         tableParts.push({ mesh: tableSurfaceMesh, body: tableBody, type: 'table' });
     } catch(e) { console.error("***** ERROR creando/añadiendo cuerpo físico de superficie:", e); }
     // console.log("Superficie (Visual+Física) añadida.");
 }


// --- Función para crear cojines y marco (Visual + Física AÑADIDA a World) ---
function createCushionsAndFrame() {
    // console.log("Creando visuales y física estática de cojines/marco...");
    const tableGroup = getTableGroup();
    const cushionMaterial = getCushionMaterial();
    if (!tableGroup || !cushionMaterial) { console.error("Dependencias de cojines no cargadas."); return; }

    const cushionYPos = cushionHeight / 2;
    // Usar la textura de madera si está cargada, de lo contrario usar color sólido
    const woodMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: woodTexture ? 0xffffff : 0x8B4513, // Usar color blanco si hay textura
        roughness: 0.7
    });
    const cushionGeometryLong = new THREE.BoxGeometry(tableWidth + 2 * cushionWidth, cushionHeight, cushionWidth);
    const cushionGeometryShort = new THREE.BoxGeometry(cushionWidth, cushionHeight, tableHeight);
    // Definir las posiciones de los cojines
    const cushionPositions = [
        { geometry: cushionGeometryLong, x: 0, y: cushionYPos, z: tableHeight / 2 + cushionWidth / 2 }, // Arriba
        { geometry: cushionGeometryLong, x: 0, y: cushionYPos, z: -(tableHeight / 2 + cushionWidth / 2) }, // Abajo
        { geometry: cushionGeometryShort, x: tableWidth / 2 + cushionWidth / 2, y: cushionYPos, z: 0 }, // Derecha
        { geometry: cushionGeometryShort, x: -(tableWidth / 2 + cushionWidth / 2), y: cushionYPos, z: 0 } // Izquierda
    ];


    cushionPositions.forEach((posData, index) => {
         try {
             // Visual
             const cushionMesh = new THREE.Mesh(posData.geometry, woodMaterial);
             cushionMesh.position.set(posData.x, posData.y, posData.z); // Local
             cushionMesh.castShadow = true;
             cushionMesh.receiveShadow = true;
             tableGroup.add(cushionMesh);

             // Física Estática
             const cannonVec = new CANNON.Vec3(posData.geometry.parameters.width / 2, posData.geometry.parameters.height / 2, posData.geometry.parameters.depth / 2);
             const cushionShape = new CANNON.Box(cannonVec);
             const cushionBody = new CANNON.Body({ mass: 0, material: cushionMaterial }); // Estático
             cushionBody.addShape(cushionShape);
             const worldPos = tableGroup.localToWorld(cushionMesh.position.clone());
             cushionBody.position.copy(worldPos);
             cushionBody.quaternion.copy(tableGroup.quaternion);
             // ***** AÑADIR COJINES A WORLD *****
             addBodyToWorld(cushionBody); // Añadir a world usando la función del módulo physics
             tableParts.push({ mesh: cushionMesh, body: cushionBody, type: 'cushion' });

         } catch(e) { console.error(`Error creando/añadiendo cojín ${index+1}:`, e); }
    });
    // console.log("Cuerpos físicos de cojines añadidos a world.");

    // Base visual (sin física)
    try {
         const baseHeight = 0.15;
         const baseGeometry = new THREE.BoxGeometry(tableWidth + 2 * cushionWidth + 0.1, baseHeight, tableHeight + 2 * cushionWidth + 0.1);
         const baseMesh = new THREE.Mesh(baseGeometry, woodMaterial); // Usar el mismo material de madera
         baseMesh.position.y = -tableThickness - baseHeight / 2; // Local
         baseMesh.castShadow = true;
         baseMesh.receiveShadow = true;
         tableGroup.add(baseMesh);
    } catch(e) { console.error("Error creando base visual:", e); }
    // console.log("Marco/Bandas (Visual+Física) añadidos.");
}

export function getTableParts() {
    return tableParts;
}