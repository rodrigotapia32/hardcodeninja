export const TEMP_ASSETS = {
    // Colores
    COLORS: {
        NINJA: 0x00ff00,      // Verde para el ninja
        DAGGER: 0xff0000,     // Rojo para la daga
        TELEPORT: 0x0000ff,   // Azul para el teletransporte
        SHOCKWAVE: 0xffff00,  // Amarillo para la onda de choque
        SHIELD: 0x00ffff,     // Cyan para el escudo
        WALL: 0x808080,       // Gris para las paredes
        FLOOR: 0x404040,      // Gris oscuro para el suelo
        HEALTH: 0xff0000,     // Rojo para la barra de vida
        COOLDOWN: 0x0000ff    // Azul para los cooldowns
    },

    // Tamaños
    SIZES: {
        NINJA: 18,            // Radio del ninja (más pequeño)
        DAGGER: {             // Tamaño de la daga (rectángulo)
            WIDTH: 28,
            HEIGHT: 6
        },
        SHOCKWAVE: {          // Tamaño del shockwave (rectángulo grande)
            WIDTH: 60,
            HEIGHT: 16
        },
        SHIELD: 24,           // Grosor del borde del escudo
        WALL: 32,             // Tamaño de las paredes
        HEALTH_BAR: {         // Dimensiones de la barra de vida
            WIDTH: 100,
            HEIGHT: 10
        }
    }
}; 