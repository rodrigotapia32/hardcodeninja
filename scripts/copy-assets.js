const fs = require('fs');
const path = require('path');

// Crear directorio dist si no existe
if (!fs.existsSync('public/dist')) {
    fs.mkdirSync('public/dist', { recursive: true });
}

// Copiar Phaser
const phaserPath = path.join('node_modules', 'phaser', 'dist', 'phaser.min.js');
const phaserDest = path.join('public', 'phaser.min.js');

fs.copyFileSync(phaserPath, phaserDest);
console.log('Phaser copiado correctamente'); 