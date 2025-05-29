import { TEMP_ASSETS } from '../config/tempAssets.js';
import Phaser from "phaser";

export class TempSprite extends Phaser.GameObjects.Graphics {
    constructor(scene, x, y, type, options = {}) {
        super(scene);
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.type = type;
        this.options = options;
        
        // Agregar el sprite a la escena
        scene.add.existing(this);
        
        // Dibujar el sprite según su tipo
        this.draw();
    }

    draw() {
        this.clear();
        this.lineStyle(2, 0x000000);
        
        switch(this.type) {
            case 'ninja':
                this.fillStyle(TEMP_ASSETS.COLORS.NINJA);
                this.fillCircle(0, 0, TEMP_ASSETS.SIZES.NINJA);
                // Si tiene escudo, dibujar borde
                if (this.options.shield) {
                    this.lineStyle(4, TEMP_ASSETS.COLORS.SHIELD);
                    this.strokeCircle(0, 0, TEMP_ASSETS.SIZES.NINJA + 6);
                }
                break;
            case 'dagger':
                this.fillStyle(TEMP_ASSETS.COLORS.DAGGER);
                this.fillRect(-TEMP_ASSETS.SIZES.DAGGER.WIDTH/2, -TEMP_ASSETS.SIZES.DAGGER.HEIGHT/2, 
                    TEMP_ASSETS.SIZES.DAGGER.WIDTH, TEMP_ASSETS.SIZES.DAGGER.HEIGHT);
                break;
            case 'shockwave':
                this.fillStyle(TEMP_ASSETS.COLORS.SHOCKWAVE);
                this.fillRect(-TEMP_ASSETS.SIZES.SHOCKWAVE.WIDTH/2, -TEMP_ASSETS.SIZES.SHOCKWAVE.HEIGHT/2, 
                    TEMP_ASSETS.SIZES.SHOCKWAVE.WIDTH, TEMP_ASSETS.SIZES.SHOCKWAVE.HEIGHT);
                break;
            case 'shield':
                // El escudo ahora es solo un borde alrededor del ninja
                this.lineStyle(4, TEMP_ASSETS.COLORS.SHIELD);
                this.strokeCircle(0, 0, TEMP_ASSETS.SIZES.NINJA + 6);
                break;
            case 'wall':
                this.fillStyle(TEMP_ASSETS.COLORS.WALL);
                this.fillRect(-TEMP_ASSETS.SIZES.WALL/2, -TEMP_ASSETS.SIZES.WALL/2, 
                            TEMP_ASSETS.SIZES.WALL, TEMP_ASSETS.SIZES.WALL);
                break;
        }
    }

    update() {
        // Método para actualizar el sprite si es necesario
    }
} 