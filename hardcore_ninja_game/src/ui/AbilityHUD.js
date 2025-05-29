import Phaser from "phaser";

export class AbilityHUD extends Phaser.Plugins.ScenePlugin {
    constructor(scene, pluginManager) {
        super(scene, pluginManager);
        this.abilityBoxes = [];
    }

    boot() {
        this.scene.events.on("create", this.createHUD, this);
        this.scene.events.on("update", this.updateHUD, this);
    }

    createHUD() {
        const scene = this.scene;
        const abilities = [
            { key: "Q", name: "Deflect", color: 0x00ffff, icon: "shield" },
            { key: "W", name: "Blink", color: 0xff6600, icon: "arrow" },
            { key: "E", name: "Shockwave", color: 0xffff00, icon: "bolt" },
            { key: "R", name: "Dagger", color: 0xff0000, icon: "dagger" },
        ];
        const boxSize = 64;
        const margin = 12;
        const startX =
            scene.cameras.main.width / 2 - (boxSize * 2 + margin * 1.5);
        const y = scene.cameras.main.height - boxSize - 16;
        this.abilityBoxes = [];
        for (let i = 0; i < abilities.length; i++) {
            const ab = abilities[i];
            const x = startX + i * (boxSize + margin);
            const g = scene.add.graphics();
            g.setDepth(1000);
            g.fillStyle(0x222222, 0.95);
            g.fillRoundedRect(x, y, boxSize, boxSize, 8);
            g.lineStyle(2, 0xffffff);
            g.strokeRoundedRect(x, y, boxSize, boxSize, 8);
            // Icono
            this.drawIcon(
                g,
                ab.icon,
                x + boxSize / 2,
                y + boxSize / 2,
                ab.color,
            );
            // Tecla
            const keyText = scene.add.text(x + 6, y + 2, ab.key, {
                fontSize: "16px",
                color: "#fff",
                fontStyle: "bold",
            });
            keyText.setDepth(1001);
            this.abilityBoxes.push({ x, y, boxSize, ab, g, keyText });
        }
        this.cooldownBars = abilities.map((ab, i) => {
            const bar = scene.add.graphics();
            bar.setDepth(1002);
            return bar;
        });
    }

    drawIcon(g, type, cx, cy, color) {
        g.save();
        g.lineStyle(0);
        g.fillStyle(color, 1);
        switch (type) {
            case "shield": // Deflect
                g.fillRoundedRect(cx - 14, cy - 10, 28, 20, 10);
                g.fillRect(cx - 8, cy, 16, 10);
                break;
            case "arrow": // Blink
                g.fillRect(cx - 12, cy - 4, 24, 8);
                g.fillTriangle(cx + 12, cy, cx + 22, cy - 10, cx + 22, cy + 10);
                break;
            case "bolt": // Shockwave
                g.fillPoints(
                    [
                        { x: cx - 10, y: cy - 12 },
                        { x: cx + 2, y: cy - 2 },
                        { x: cx - 4, y: cy + 2 },
                        { x: cx + 10, y: cy + 12 },
                        { x: cx - 2, y: cy + 2 },
                        { x: cx + 4, y: cy - 2 },
                    ],
                    true,
                );
                break;
            case "dagger": // Dagger
                g.fillRect(cx - 2, cy - 16, 4, 24);
                g.fillTriangle(cx - 8, cy - 16, cx + 8, cy - 16, cx, cy - 28);
                g.fillRect(cx - 8, cy + 8, 16, 4);
                break;
        }
        g.restore();
    }

    updateHUD() {
        const scene = this.scene;
        const player = scene.player;
        if (!player) return;
        // Cooldowns y duración
        const cooldowns = [
            player.deflectCooldown ? player.deflectCooldownTime : 0,
            player.blinkCooldown ? player.blinkCooldownTime : 0,
            player.shockwaveCooldown ? player.shockwaveCooldownTime : 0,
            player.daggerCooldown ? player.daggerCooldownTime : 0,
        ];
        const maxCooldowns = [2000, 4000, 2000, 5000];
        const cooldownStartTimes = [
            player.deflectCooldownStart || 0,
            player.blinkCooldownStart || 0,
            player.shockwaveCooldownStart || 0,
            player.daggerCooldownStart || 0,
        ];
        const actives = [
            player.deflectActive,
            scene.blinkMode,
            scene.shockwaveMode,
            scene.daggerMode,
        ];
        const now = scene.time.now;
        for (let i = 0; i < this.abilityBoxes.length; i++) {
            const box = this.abilityBoxes[i];
            const cooldown = cooldowns[i];
            const maxCooldown = maxCooldowns[i];
            // Limpiar gráficos
            box.g.clear();
            // Si está en cooldown, oscurecer el fondo
            if (cooldown > 0) {
                box.g.fillStyle(0x111111, 0.85);
            } else {
                box.g.fillStyle(0x222222, 0.95);
            }
            box.g.fillRoundedRect(box.x, box.y, box.boxSize, box.boxSize, 8);
            // Borde: si está disponible, resaltar con el color de la habilidad
            if (cooldown <= 0) {
                box.g.lineStyle(3, box.ab.color);
            } else if (actives[i]) {
                box.g.lineStyle(3, 0x00ff00);
            } else {
                box.g.lineStyle(2, 0xffffff);
            }
            box.g.strokeRoundedRect(box.x, box.y, box.boxSize, box.boxSize, 8);
            // Icono
            this.drawIcon(
                box.g,
                box.ab.icon,
                box.x + box.boxSize / 2,
                box.y + box.boxSize / 2,
                box.ab.color,
            );
            // Tecla
            if (!box.keyText) {
                box.keyText = scene.add.text(box.x + 6, box.y + 2, box.ab.key, {
                    fontSize: "16px",
                    color: "#fff",
                    fontStyle: "bold",
                });
            }
            // Cooldown bar: de arriba hacia abajo, cubriendo todo el botón y avanzando en tiempo real
            this.cooldownBars[i].clear();
            if (cooldown > 0 && cooldownStartTimes[i]) {
                const elapsed = now - cooldownStartTimes[i];
                const pct = Phaser.Math.Clamp(1 - elapsed / maxCooldown, 0, 1);
                const margin = 5;
                const barX = box.x + margin;
                const barY = box.y + margin;
                const barW = box.boxSize - margin * 2;
                const barH = (box.boxSize - margin * 2) * pct;
                this.cooldownBars[i].fillStyle(0x00bfff, 0.7);
                this.cooldownBars[i].fillRoundedRect(barX, barY, barW, barH, 8);
            }
        }
    }
}
