import { TempSprite } from "../objects/TempSprite.js";
import Phaser from "phaser";

export class TestScene extends Phaser.Scene {
    constructor() {
        super({ key: "TestScene" });
    }

    create() {
        // Crear un ninja en el centro
        this.ninja = new TempSprite(this, 400, 300, "ninja");

        // Ninja con escudo (borde)
        this.ninjaShield = new TempSprite(this, 550, 300, "ninja", {
            shield: true,
        });

        // Crear la daga (rectángulo rojo)
        this.dagger = new TempSprite(this, 400, 200, "dagger");
        // Crear el shockwave (rectángulo amarillo grande)
        this.shockwave = new TempSprite(this, 400, 400, "shockwave");

        // Crear algunas paredes
        this.wall1 = new TempSprite(this, 200, 200, "wall");
        this.wall2 = new TempSprite(this, 600, 400, "wall");
        this.wall3 = new TempSprite(this, 400, 500, "wall");

        // Agregar texto explicativo
        this.add.text(16, 16, "Sprites Temporales de Prueba:", {
            fontSize: "24px",
            fill: "#fff",
        });

        this.add.text(
            16,
            50,
            "Verde: Ninja\nVerde con borde cyan: Ninja con escudo\nRojo: Daga (rectángulo)\nAmarillo: Shockwave (rectángulo grande)\nGris: Paredes",
            {
                fontSize: "16px",
                fill: "#fff",
            },
        );
    }

    update() {
        // Por ahora no necesitamos actualización
    }
}
