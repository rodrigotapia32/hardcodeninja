import { TEMP_ASSETS } from '../config/tempAssets.js';
import { Player } from '../objects/Player.js';
import { Mrpas } from 'mrpas';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Fondo
        this.cameras.main.setBackgroundColor('#181818');

        // Dimensiones del mapa (más grande)
        this.mapWidth = 800;
        this.mapHeight = 600;
        this.tileSize = TEMP_ASSETS.SIZES.WALL; // 32
        // Mapa lógico de paredes para FOV
        this.gridWidth = Math.ceil(this.mapWidth / this.tileSize);
        this.gridHeight = Math.ceil(this.mapHeight / this.tileSize);
        this.wallMap = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.wallMap[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.wallMap[y][x] = false;
            }
        }
        // Obstáculos (paredes grises) con esquinas redondeadas
        this.walls = [];
        const wallSize = this.tileSize;
        const cornerRadius = 8;
        // Paredes grandes y menos cantidad
        const bigWalls = [
            { x: 200, y: 200, w: wallSize * 3, h: wallSize * 2 }, // esquina superior izquierda
            { x: 600, y: 120, w: wallSize * 4, h: wallSize * 1.5 }, // arriba derecha
            { x: 400, y: 300, w: wallSize * 2, h: wallSize * 4 }, // centro
            { x: 200, y: 450, w: wallSize * 3, h: wallSize * 2 }, // abajo izquierda
            { x: 600, y: 450, w: wallSize * 2.5, h: wallSize * 2 }, // abajo derecha
        ];
        for (const pos of bigWalls) {
            const g = this.add.graphics();
            g.fillStyle(TEMP_ASSETS.COLORS.WALL);
            g.fillRoundedRect(
                pos.x - pos.w / 2,
                pos.y - pos.h / 2,
                pos.w,
                pos.h,
                cornerRadius
            );
            const wall = { x: pos.x, y: pos.y, width: pos.w, height: pos.h };
            this.walls.push(wall);
            // Marcar en la matriz lógica todas las celdas cubiertas por la pared
            const gx0 = Math.floor((pos.x - pos.w / 2) / this.tileSize);
            const gy0 = Math.floor((pos.y - pos.h / 2) / this.tileSize);
            const gx1 = Math.floor((pos.x + pos.w / 2) / this.tileSize);
            const gy1 = Math.floor((pos.y + pos.h / 2) / this.tileSize);
            for (let gy = gy0; gy <= gy1; gy++) {
                for (let gx = gx0; gx <= gx1; gx++) {
                    if (gy >= 0 && gy < this.gridHeight && gx >= 0 && gx < this.gridWidth) {
                        this.wallMap[gy][gx] = true;
                    }
                }
            }
        }
        // Inicializar FOV
        this.fov = new Mrpas(this.gridWidth, this.gridHeight, (x, y) => !this.wallMap[y][x]);

        // Crear jugador local
        const options = window.nick && window.color ? { nick: window.nick, color: window.color } : {};
        this.player = new Player(this, 100, 100, options);
        window.player = this.player;
        this.player.id = window.socket?.id; // Asigna el id real del socket al jugador local
        window.onPhaserReady && window.onPhaserReady(this.player);
        // Jugadores remotos
        this.remotePlayers = {};
        window.updateRemotePlayers = (players) => {
            for (const id in players) {
                if (id === window.socket?.id) continue;
                const p = players[id];
                if (!this.remotePlayers[id]) {
                    this.remotePlayers[id] = new Player(this, p.x, p.y, { nick: p.name, color: p.color });
                    this.remotePlayers[id].id = id; // Asigna el id de socket
                } else {
                    this.remotePlayers[id].x = p.x;
                    this.remotePlayers[id].y = p.y;
                    this.remotePlayers[id].nick = p.name;
                    this.remotePlayers[id].color = p.color;
                }
                // Sincroniza estado de vida/remoto
                this.remotePlayers[id].aliveRemote = p.alive;
                this.remotePlayers[id].drawNinja();
            }
            // Elimina jugadores desconectados
            for (const id in this.remotePlayers) {
                if (!players[id]) {
                    this.remotePlayers[id].graphics.destroy();
                    this.remotePlayers[id].nickText.destroy();
                    delete this.remotePlayers[id];
                }
            }
            // Exponer los jugadores remotos globalmente para sincronización de habilidades
            window.remotePlayers = this.remotePlayers;
            // Actualiza la ventana de lista de jugadores
            if (!document.getElementById('playerList')) {
                const div = document.createElement('div');
                div.id = 'playerList';
                div.style.position = 'fixed';
                div.style.top = '16px';
                div.style.right = '16px';
                div.style.background = 'rgba(0,0,0,0.7)';
                div.style.color = '#fff';
                div.style.padding = '10px 18px';
                div.style.borderRadius = '10px';
                div.style.zIndex = 9999;
                div.style.fontFamily = 'monospace';
                div.style.minWidth = '180px';
                document.body.appendChild(div);
            }
            const div = document.getElementById('playerList');
            div.style.zIndex = 9999;
            div.style.position = 'fixed';
            div.innerHTML = '<b>Jugadores conectados:</b><br>' + Object.values(players).map(p => `
                <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${p.color || '#fff'};margin-right:6px;vertical-align:middle;"></span>
                <span style="color:${p.color || '#fff'};font-weight:bold;vertical-align:middle;">${p.name || 'Ninja'}</span>
                <span style="color:#ffd700;font-weight:bold;margin-left:8px;">${typeof p.score !== 'undefined' ? '🏆 ' + p.score : ''}</span>
            `).join('<br>');
        };

        // Deshabilitar menú contextual en el canvas
        this.input.mouse.disableContextMenu();

        // Movimiento con clic derecho
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.player.moveTo(pointer.worldX, pointer.worldY);
            }
        });

        // Teclas
        this.sKey = this.input.keyboard.addKey('S');
        this.dKey = this.input.keyboard.addKey('D');
        this.qKey = this.input.keyboard.addKey('Q');
        this.wKey = this.input.keyboard.addKey('W');
        this.eKey = this.input.keyboard.addKey('E');
        this.rKey = this.input.keyboard.addKey('R');

        // Blink
        this.blinkMode = false;
        this.blinkRange = 180; // rango máximo de blink
        this.input.on('pointerdown', (pointer) => {
            if (this.blinkMode && pointer.leftButtonDown()) {
                this.player.tryBlink(pointer.worldX, pointer.worldY, this.walls, this.blinkRange);
                this.blinkMode = false;
            }
        });

        // Shockwave
        this.shockwaveMode = false;
        this.input.on('pointerdown', (pointer) => {
            if (this.shockwaveMode && pointer.leftButtonDown()) {
                // Pasa todos los jugadores (local y remotos) para que pueda matar a cualquiera
                const allPlayers = [this.player, ...Object.values(this.remotePlayers)];
                this.player.launchShockwave(pointer.worldX, pointer.worldY, allPlayers);
                this.shockwaveMode = false;
            }
        });

        // Configurar cámara
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.cameraSpeed = 8; // velocidad de desplazamiento de la cámara
        this.cameraEdge = 40; // distancia al borde para mover la cámara

        // Dagger
        this.daggerMode = false;
        this.input.on('pointerdown', (pointer) => {
            if (this.daggerMode && pointer.leftButtonDown()) {
                // Detectar si el click fue sobre un jugador remoto
                let target = null;
                for (const id in this.remotePlayers) {
                    const p = this.remotePlayers[id];
                    const dx = pointer.worldX - p.x;
                    const dy = pointer.worldY - p.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= p.radius && p.alive) {
                        target = p;
                        break;
                    }
                }
                console.log('[GAME] Click dagger. Target:', target ? target.nick : null, 'id:', target ? target.id : null);
                if (target) {
                    this.player.launchDagger(target);
                }
                this.daggerMode = false;
            }
        });

        // Variables para evitar spam de movimiento
        this.lastSentX = null;
        this.lastSentY = null;
    }

    computeFOV() {
        if (!this.fov) return;
        if (!this.fovMask) {
            this.fovMask = this.add.graphics();
            this.fovMask.setDepth(100);
        }
        this.fovMask.clear();
        // 1. Calcula celdas visibles (radio más amplio)
        const px = Math.floor(this.player.x / this.tileSize);
        const py = Math.floor(this.player.y / this.tileSize);
        const radio = 12;
        const visibles = [];
        this.fov.compute(
            px, py, radio,
            (x, y) => true,
            (x, y) => {
                // Solo agrega si está dentro del círculo
                const dx = x - px;
                const dy = y - py;
                if (dx * dx + dy * dy <= radio * radio) {
                    visibles.push(`${x},${y}`);
                }
            }
        );
        // 2. Dibuja solo las celdas NO visibles (sombra opaca)
        this.fovMask.fillStyle(0x000000, 1);
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (!visibles.includes(`${x},${y}`)) {
                    this.fovMask.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }
    }

    update(time, delta) {
        // Detener con S
        if (Phaser.Input.Keyboard.JustDown(this.sKey)) {
            this.player.stop();
        }
        // Morir con D
        if (Phaser.Input.Keyboard.JustDown(this.dKey)) {
            this.player.die();
        }
        // Activar Deflect con Q
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.player.activateDeflect();
        }
        // Activar Blink con W
        if (Phaser.Input.Keyboard.JustDown(this.wKey)) {
            if (this.player.canBlink()) {
                this.blinkMode = true;
            }
        }
        // Activar Shockwave con E
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            if (this.player.canShockwave()) {
                this.shockwaveMode = true;
            }
        }
        // Activar Dagger con R
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            if (this.player.canDagger()) {
                this.daggerMode = true;
            }
        }
        this.player.update(time, delta, this.walls);
        if (this.enemy) {
            // Movimiento lento de izquierda a derecha y regreso
            // if (this.enemy.alive) {
            //     this.enemy.x += this.enemyDirection * 0.7;
            //     if (this.enemy.x > 700) this.enemyDirection = -1;
            //     if (this.enemy.x < 500) this.enemyDirection = 1;
            // }
            // this.enemy.update(time, delta, this.walls);
        }

        // Actualizar shockwaves activas
        if (this.activeShockwaves) {
            for (const sw of this.activeShockwaves) {
                if (sw.update) sw.update();
            }
            this.activeShockwaves = this.activeShockwaves.filter(sw => sw.active);
        }

        // FOV
        this.computeFOV();

        // Cámara tipo MOBA
        const pointer = this.input.activePointer;
        const cam = this.cameras.main;
        if (pointer.x <= 40) {
            cam.scrollX = Math.max(cam.scrollX - 8, 0);
        } else if (pointer.x >= cam.width - 40) {
            cam.scrollX = Math.min(cam.scrollX + 8, this.mapWidth - cam.width);
        }
        if (pointer.y <= 40) {
            cam.scrollY = Math.max(cam.scrollY - 8, 0);
        } else if (pointer.y >= cam.height - 40) {
            cam.scrollY = Math.min(cam.scrollY + 8, this.mapHeight - cam.height);
        }

        // Sincronización de movimiento multiplayer
        if (window.sendMove && this.player && this.player.alive) {
            if (this.player.x !== this.lastSentX || this.player.y !== this.lastSentY) {
                window.sendMove(this.player.x, this.player.y);
                this.lastSentX = this.player.x;
                this.lastSentY = this.player.y;
            }
        }
        // Actualizar posición de jugadores remotos
        if (this.remotePlayers) {
            for (const id in this.remotePlayers) {
                const p = this.remotePlayers[id];
                // Si el servidor envió una nueva posición, ya fue actualizada en updateRemotePlayers
                p.drawNinja();
            }
        }

        // Actualizar daggers activos de todos los jugadores
        if (this.player && this.player.activeDaggers) {
            this.player.activeDaggers = this.player.activeDaggers.filter(d => d.active);
            for (const dagger of this.player.activeDaggers) {
                if (dagger.update) dagger.update();
            }
        }
        if (this.remotePlayers) {
            for (const id in this.remotePlayers) {
                const p = this.remotePlayers[id];
                if (p.activeDaggers) {
                    p.activeDaggers = p.activeDaggers.filter(d => d.active);
                    for (const dagger of p.activeDaggers) {
                        if (dagger.update) dagger.update();
                    }
                }
            }
        }
    }

    preload() {
        this.load.audio('deflect', 'assets/audios/deflect.mp3');
        this.load.audio('blink', 'assets/audios/blink.mp3');
        this.load.audio('shockwave', 'assets/audios/shockwave.mp3');
        this.load.audio('dagger', 'assets/audios/dagger.mp3');
        this.load.audio('error', 'assets/audios/error.mp3');
        this.load.audio('death', 'assets/audios/death.mp3');
        this.load.audio('respawn', 'assets/audios/respawn.mp3');
        this.load.audio('cooldown', 'assets/audios/cooldown.mp3');
    }
} 