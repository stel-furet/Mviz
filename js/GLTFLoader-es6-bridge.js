/**
 * GLTFLoader ES6 Bridge
 * Imports the ES6 GLTFLoader module and exposes it to the global THREE object
 * for compatibility with plugins that expect THREE.GLTFLoader
 */

import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// Expose to global THREE object
if (window.THREE) {
    window.THREE.GLTFLoader = GLTFLoader;
    console.log('THREE.GLTFLoader (ES6) loaded and attached to global THREE object');
} else {
    console.error('THREE.GLTFLoader: THREE is not defined. Make sure three.js is loaded first.');
}

