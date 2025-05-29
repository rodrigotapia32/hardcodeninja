import { TEMP_ASSETS } from "../config/tempAssets.js";
import Phaser from "phaser";
export class Player {
    constructor(scene, x, y, options = {}) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.speed = 180; // pixeles por segundo
        this.target = null;
        this.moving = false;
        this.radius = TEMP_ASSETS.SIZES.NINJA * 0.9;
        this.graphics = scene.add.graphics();
        this.alive = true;
        this.respawnTime = 1500; // ms
        this.nick = options.nick || "";
        this.color = options.color || TEMP_ASSETS.COLORS.NINJA;
        if (typeof this.color === "string") {
            this.color = parseInt(this.color.replace("#", "0x"));
        }
        this.nickText = scene.add
            .text(this.x, this.y - this.radius - 18, this.nick, {
                fontSize: "14px",
                color: "#fff",
                align: "center",
            })
            .setOrigin(0.5, 0.5);
        this.nickText.setDepth(10);
        // Deflect (escudo)
        this.deflectActive = false;
        this.deflectCooldown = false;
        this.deflectDuration = 700; // ms
        this.deflectCooldownTime = 2000; // ms
        this.deflectTimer = 0;
        // Blink
        this.blinkCooldown = false;
        this.blinkCooldownTime = 4000; // ms
        // Shockwave
        this.shockwaveCooldown = false;
        this.shockwaveCooldownTime = 2000; // ms
        // Dagger
        this.daggerCooldown = false;
        this.daggerCooldownTime = 5000; // ms
        this.activeDaggers = [];
        this.drawNinja();
    }

    drawNinja() {
        this.graphics.clear();
        if (typeof this.color === "string") {
            this.color = parseInt(this.color.replace("#", "0x"));
        }
        if (this.alive) {
            this.graphics.fillStyle(this.color);
            this.graphics.fillCircle(this.x, this.y, this.radius);
            // Dibujar escudo si está activo
            if (this.deflectActive) {
                this.graphics.lineStyle(4, TEMP_ASSETS.COLORS.SHIELD);
                this.graphics.strokeCircle(this.x, this.y, this.radius + 6);
            }
        }
        if (this.nickText) {
            this.nickText.setPosition(this.x, this.y - this.radius - 18);
            this.nickText.setText(this.nick);
        }
    }

    // DAGGER
    canDagger() {
        return this.alive && !this.daggerCooldown;
    }

    launchDagger(target, fromX = null, fromY = null) {
        console.log(
            "[PLAYER] launchDagger",
            this.nick,
            "desde",
            fromX,
            fromY,
            "hacia",
            target ? target.nick : null,
        );
        if (!this.canDagger()) {
            if (this.scene.sound) {
                console.log("[SOUND] cooldown (dagger)", this.nick);
                this.scene.sound.play("cooldown");
            }
            return;
        }
        if (!target || !target.alive) {
            if (this.scene.sound) {
                console.log("[SOUND] error (dagger)", this.nick);
                this.scene.sound.play("error");
            }
            return;
        }
        if (this.scene.sound) {
            console.log("[SOUND] dagger", this.nick);
            this.scene.sound.play("dagger");
        }
        // Calcular ángulo inicial
        const startX = fromX !== null ? fromX : this.x;
        const startY = fromY !== null ? fromY : this.y;
        const dx = target.x - startX;
        const dy = target.y - startY;
        const angle = Math.atan2(dy, dx);
        // Crear proyectil orientado
        const dagger = this.scene.add.rectangle(
            startX,
            startY,
            28,
            6,
            TEMP_ASSETS.COLORS.DAGGER,
        );
        dagger.setRotation(angle);
        this.scene.physics.add.existing(dagger);
        dagger.body.setAllowGravity(false);
        dagger.body.setImmovable(true);
        dagger.target = target;
        dagger.speed = 320;
        this.activeDaggers.push(dagger);
        // Cooldown
        this.daggerCooldown = true;
        this.daggerCooldownStart = this.scene.time.now;
        this.scene.time.delayedCall(this.daggerCooldownTime, () => {
            this.daggerCooldown = false;
            this.daggerCooldownStart = 0;
        });
        // Homing update
        dagger.update = () => {
            console.log(
                "[DAGGER][UPDATE] dagger.x:",
                dagger.x,
                "dagger.y:",
                dagger.y,
                "target:",
                dagger.target ? dagger.target.nick : null,
                "target.alive:",
                dagger.target ? dagger.target.alive : null,
            );
            // Si el objetivo ya está muerto, destruye la daga y no hace nada más
            if (!dagger.target || !dagger.target.alive) {
                dagger.destroy();
                return;
            }
            console.log(
                "[DAGGER] update",
                this.nick,
                "dagger.x:",
                dagger.x,
                "dagger.y:",
                dagger.y,
                "target.x:",
                dagger.target.x,
                "target.y:",
                dagger.target.y,
            );
            const dx = dagger.target.x - dagger.x;
            const dy = dagger.target.y - dagger.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < dagger.target.radius + 10) {
                // Impacto: matar objetivo
                console.log(
                    "[DAGGER] Impacto, llamando die() en",
                    dagger.target.nick,
                );
                dagger.target.die();
                dagger.destroy();
                this.activeDaggers = this.activeDaggers.filter((d) => d.active);
                // Notificar muerte al servidor si es un jugador remoto
                if (
                    window.sendState &&
                    dagger.target.id &&
                    this === window.player
                ) {
                    console.log(
                        "[KILL NOTIFY] Enviando muerte de",
                        dagger.target.nick,
                        "killer:",
                        this.nick,
                    );
                    window.sendState({
                        id: dagger.target.id,
                        alive: false,
                        killerId: this.id,
                    });
                }
                return;
            }
            const angle = Math.atan2(dy, dx);
            dagger.setRotation(angle);
            dagger.body.setVelocity(
                Math.cos(angle) * dagger.speed,
                Math.sin(angle) * dagger.speed,
            );
        };
        // Destruir si no impacta tras 2s
        this.scene.time.delayedCall(2000, () => {
            if (dagger && dagger.active) dagger.destroy();
        });
    }

    // SHOCKWAVE
    canShockwave() {
        return this.alive && !this.shockwaveCooldown;
    }

    launchShockwave(targetX, targetY, allPlayers = []) {
        if (!this.canShockwave()) {
            if (this.scene.sound) {
                console.log("[SOUND] cooldown (shockwave)", this.nick);
                this.scene.sound.play("cooldown");
            }
            return;
        }
        if (this.scene.sound && this === window.player) {
            console.log("[SOUND] shockwave", this.nick);
            this.scene.sound.play("shockwave");
        }
        // Calcular dirección
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const angle = Math.atan2(dy, dx);
        // Crear proyectil tipo rayo
        const length = 180;
        const sw = this.scene.add.graphics();
        sw.lineStyle(6, 0xffff00, 1);
        sw.beginPath();
        let x0 = 0,
            y0 = 0;
        sw.moveTo(x0, y0);
        let lastY = 0;
        for (let i = 1; i <= 12; i++) {
            const x = (length / 12) * i;
            let y;
            if (i === 12) {
                y = Phaser.Math.Between(-22, 22);
            } else if (i % 2 === 0) {
                y = Phaser.Math.Between(-18, -8);
            } else {
                y = Phaser.Math.Between(8, 18);
            }
            sw.lineTo(x, y);
            lastY = y;
        }
        sw.lineTo(length + 10, lastY * 0.5);
        sw.strokePath();
        sw.x = this.x;
        sw.y = this.y;
        sw.rotation = angle;
        this.scene.physics.add.existing(sw);
        sw.body.setAllowGravity(false);
        sw.body.setImmovable(true);
        sw.body.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);
        sw.owner = this;
        sw.alreadyHit = new Set();
        // Efecto visual: destruir tras 0.7s
        this.scene.time.delayedCall(700, () => sw.destroy());
        // Cooldown
        this.shockwaveCooldown = true;
        this.shockwaveCooldownStart = this.scene.time.now;
        this.scene.time.delayedCall(this.shockwaveCooldownTime, () => {
            this.shockwaveCooldown = false;
            this.shockwaveCooldownStart = 0;
        });
        // Colisión con otros jugadores (puede matar a varios)
        sw.update = () => {
            for (const p of allPlayers) {
                if (p === this || !p.alive || sw.alreadyHit.has(p)) continue;
                // Colisión rayo-círculo (aprox. como línea)
                const px = p.x,
                    py = p.y,
                    pr = p.radius;
                // Proyección punto a línea
                const x1 = sw.x,
                    y1 = sw.y;
                const x2 = sw.x + Math.cos(angle) * length;
                const y2 = sw.y + Math.sin(angle) * length;
                const t =
                    ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) /
                    (length * length);
                const closestX = x1 + t * (x2 - x1);
                const closestY = y1 + t * (y2 - y1);
                const dist = Math.sqrt(
                    (px - closestX) ** 2 + (py - closestY) ** 2,
                );
                if (t >= 0 && t <= 1 && dist < pr + 8) {
                    if (!p.isInvulnerable()) {
                        p.die();
                        sw.alreadyHit.add(p);
                        // Notificar muerte al servidor si es un jugador remoto
                        if (
                            window.sendState &&
                            p.id &&
                            this === window.player
                        ) {
                            console.log(
                                "[KILL NOTIFY] Enviando muerte de",
                                p.nick,
                                "killer:",
                                this.nick,
                            );
                            window.sendState({
                                id: p.id,
                                alive: false,
                                killerId: this.id,
                            });
                        }
                    }
                }
            }
        };
        // Agregar a la lista de proyectiles a actualizar
        if (!this.scene.activeShockwaves) this.scene.activeShockwaves = [];
        this.scene.activeShockwaves.push(sw);
    }

    // BLINK
    canBlink() {
        return this.alive && !this.blinkCooldown;
    }

    tryBlink(destX, destY, walls, maxRange) {
        if (!this.canBlink()) {
            if (this.scene.sound) {
                console.log("[SOUND] cooldown (blink)", this.nick);
                this.scene.sound.play("cooldown");
            }
            return;
        }
        // Calcular distancia
        const dx = destX - this.x;
        const dy = destY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxRange) {
            destX = this.x + (dx / dist) * maxRange;
            destY = this.y + (dy / dist) * maxRange;
            dist = maxRange;
        }
        // No permitir blink dentro de paredes
        if (this.collidesWithWalls(destX, destY, walls)) {
            if (this.scene.sound) {
                console.log("[SOUND] error (blink)", this.nick);
                this.scene.sound.play("error");
            }
            // Efecto visual de error
            const msg = this.scene.add
                .text(destX - 20, destY - 20, "X", {
                    fontSize: "24px",
                    fill: "#f00",
                })
                .setDepth(10)
                .setAlpha(0.8)
                .setScrollFactor(0)
                .setOrigin(0, 0);
            this.scene.time.delayedCall(700, () => msg.destroy());
            return;
        }
        if (this.scene.sound) {
            console.log("[SOUND] blink", this.nick);
            this.scene.sound.play("blink");
        }
        // Efecto visual de blink
        const blinkFx = this.scene.add.circle(
            this.x,
            this.y,
            this.radius + 8,
            0x00ffff,
            0.3,
        );
        this.scene.tweens.add({
            targets: blinkFx,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => blinkFx.destroy(),
        });
        // Teletransportar
        this.x = destX;
        this.y = destY;
        this.stop();
        this.drawNinja();
        // Cooldown
        this.blinkCooldown = true;
        this.blinkCooldownStart = this.scene.time.now;
        this.scene.time.delayedCall(this.blinkCooldownTime, () => {
            this.blinkCooldown = false;
            this.blinkCooldownStart = 0;
        });
    }

    // DEFLECT
    activateDeflect() {
        if (!this.alive || this.deflectActive || this.deflectCooldown) {
            if (this.scene.sound) {
                console.log("[SOUND] cooldown (deflect)", this.nick);
                this.scene.sound.play("cooldown");
            }
            return;
        }
        this.deflectActive = true;
        this.deflectCooldown = true;
        this.deflectCooldownStart = this.scene.time.now;
        if (this.scene.sound) {
            console.log("[SOUND] deflect", this.nick);
            this.scene.sound.play("deflect");
        }
        this.drawNinja();
        // Desactivar escudo tras duración
        this.scene.time.delayedCall(this.deflectDuration, () => {
            this.deflectActive = false;
            this.drawNinja();
        });
        // Cooldown
        this.scene.time.delayedCall(this.deflectCooldownTime, () => {
            this.deflectCooldown = false;
            this.deflectCooldownStart = 0;
        });
    }

    isInvulnerable() {
        return this.deflectActive;
    }

    moveTo(x, y) {
        if (!this.alive) return;
        this.target = { x, y };
        this.moving = true;
    }

    stop() {
        this.moving = false;
        this.target = null;
    }

    collidesWithWalls(newX, newY, walls) {
        for (const wall of walls) {
            const wx = wall.x;
            const wy = wall.y;
            const half = wall.width / 2;
            const closestX = Math.max(wx - half, Math.min(newX, wx + half));
            const closestY = Math.max(wy - half, Math.min(newY, wy + half));
            const dx = newX - closestX;
            const dy = newY - closestY;
            if (dx * dx + dy * dy < this.radius * this.radius) {
                return true;
            }
        }
        return false;
    }

    die() {
        console.log(
            "[PLAYER] die()",
            this.nick,
            "alive:",
            this.alive,
            "invulnerable:",
            this.isInvulnerable(),
        );
        if (!this.alive || this.isInvulnerable()) return;
        if (this.scene.sound) {
            console.log("[SOUND] death", this.nick);
            this.scene.sound.play("death");
        }
        this.alive = false;
        this.graphics.clear();
        // Efecto de explosión en pelotitas más pequeñas
        const fragments = 12;
        for (let i = 0; i < fragments; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 120 + Math.random() * 80;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const frag = this.scene.add.circle(this.x, this.y, 3, this.color);
            this.scene.tweens.add({
                targets: frag,
                x: this.x + vx,
                y: this.y + vy,
                alpha: 0,
                duration: 700 + Math.random() * 300,
                onComplete: () => frag.destroy(),
            });
        }
        // Mensaje de muerte temporal
        const msg = this.scene.add
            .text(this.x - 30, this.y - 40, "¡Muerto!", {
                fontSize: "18px",
                fill: "#fff",
            })
            .setDepth(10)
            .setAlpha(0.8)
            .setScrollFactor(0)
            .setOrigin(0, 0);
        this.scene.time.delayedCall(1000, () => msg.destroy());
        // Respawn automático
        this.scene.time.delayedCall(this.respawnTime, () => {
            this.respawn();
        });
    }

    respawn() {
        this.x = 100;
        this.y = 100;
        this.alive = true;
        this.stop();
        this.drawNinja();
        if (this.scene.sound) {
            console.log("[SOUND] respawn", this.nick);
            this.scene.sound.play("respawn");
        }
        // Mensaje de respawn temporal
        const msg = this.scene.add
            .text(this.x - 30, this.y - 40, "¡Respawn!", {
                fontSize: "18px",
                fill: "#fff",
            })
            .setDepth(10)
            .setAlpha(0.8)
            .setScrollFactor(0)
            .setOrigin(0, 0);
        this.scene.time.delayedCall(1000, () => msg.destroy());
        // Sincronizar respawn con el servidor para todos los jugadores
        if (window.sendState && this.id) {
            window.sendState({
                id: this.id,
                alive: true,
                x: this.x,
                y: this.y,
            });
        }
    }

    update(time, delta, walls) {
        this.drawNinja();
        // Actualizar daggers activos
        if (this.activeDaggers) {
            this.activeDaggers = this.activeDaggers.filter((d) => d.active);
            for (const dagger of this.activeDaggers) {
                if (dagger.update) dagger.update();
            }
        }
        // Sincronizar muerte/remoto SIEMPRE
        if (typeof this.aliveRemote !== "undefined") {
            if (this.alive !== this.aliveRemote) {
                this.setAlive(this.aliveRemote);
            }
        }
        if (!this.alive) return;
        if (this.moving && this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 2) {
                this.x = this.target.x;
                this.y = this.target.y;
                this.stop();
            } else {
                const angle = Math.atan2(dy, dx);
                const vx = Math.cos(angle) * this.speed * (delta / 1000);
                const vy = Math.sin(angle) * this.speed * (delta / 1000);
                let newX = this.x + vx;
                let newY = this.y + vy;
                if (!this.collidesWithWalls(newX, newY, walls)) {
                    this.x = newX;
                    this.y = newY;
                } else if (
                    !this.collidesWithWalls(this.x + vx, this.y, walls)
                ) {
                    this.x = this.x + vx;
                } else if (
                    !this.collidesWithWalls(this.x, this.y + vy, walls)
                ) {
                    this.y = this.y + vy;
                } else {
                    const frac = 0.5;
                    if (
                        !this.collidesWithWalls(
                            this.x + vx * frac,
                            this.y + vy * frac,
                            walls,
                        )
                    ) {
                        this.x = this.x + vx * frac;
                        this.y = this.y + vy * frac;
                    } else {
                        this.stop();
                    }
                }
            }
        }
    }

    setAlive(alive) {
        console.log(
            "[PLAYER] setAlive",
            this.nick,
            "actual:",
            this.alive,
            "nuevo:",
            alive,
        );
        if (this.alive === alive) return;
        if (!alive && !this.alive) return; // Ya está muerto
        this.alive = alive;
        if (!alive) {
            console.log("[PLAYER] die() llamado por setAlive en", this.nick);
            this.die();
        } else {
            this.respawn();
        }
    }
}
