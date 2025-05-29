const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

function preload() {
    // Aquí cargaremos los assets
}

function create() {
    // Aquí inicializaremos el juego
}

function update() {
    // Aquí actualizaremos el estado del juego
}

export default config; 