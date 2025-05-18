import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let camera, scene, renderer;
let tableGroup; // Necesario para añadir la mesa a la escena

// Constants (Necesarias para la posición de la cámara y luces)
const tableSurfaceY = -0.4;

export function initScene(container) {
    console.log("Configurando escena Three.js...");

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, tableSurfaceY + 1.5, 1);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearAlpha(0);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true; // Activar sombras
    container.appendChild(renderer.domElement);

    const arButton = ARButton.createButton(renderer);
    container.appendChild(arButton);

    // Iluminación
    // Luz ambiental: Aumenta ligeramente para que las sombras no sean completamente negras
    scene.add(new THREE.AmbientLight(0xCCCCCC)); // Ligeramente más brillante

    // Luz puntual: Simula una lámpara de billar sobre la mesa
    const spotLight = new THREE.SpotLight(0xffffff, 1.2, 0, Math.PI / 6, 0.5, 2); // Mayor intensidad, cono más estrecho
    spotLight.position.set(0, tableSurfaceY + 3, 0); // Posicionada más arriba y centrada sobre la mesa
    spotLight.target.position.set(0, tableSurfaceY, 0); // Apunta al centro de la mesa
    scene.add(spotLight.target); // Es necesario añadir el target a la escena para que funcione correctamente

    spotLight.castShadow = true;

    // Configuración de sombras
    spotLight.shadow.mapSize.width = 2048; // Mayor resolución para sombras más nítidas
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.camera.near = 0.5; // Ajustar el frustum de la cámara de sombra
    spotLight.shadow.camera.far = 5;
    spotLight.shadow.camera.fov = 30;
    spotLight.shadow.bias = -0.0001; // Pequeño bias para evitar "shadow acne"

    scene.add(spotLight);
    // La cámara se añade al final en main.js o donde se gestione el renderizado principal

    console.log("Configuración de escena completa.");

    return { scene, camera, renderer, tableGroup };
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getTableGroup() { return tableGroup; }
export function setTableGroup(group) { tableGroup = group; }

export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}