import { GameScene } from '../src/scenes/GameScene.js';
import { AbilityHUD } from '../src/ui/AbilityHUD.js';
import io from 'socket.io-client';

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
    scene: [GameScene],
    plugins: {
        scene: [
            { key: 'AbilityHUD', plugin: AbilityHUD, mapping: 'abilityHUD' }
        ]
    }
};

let socket;
let myId = null;
let allPlayers = {};

function showLoginUI(onSubmit) {
    const overlay = document.createElement('div');
    overlay.id = 'loginOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 3000;
    overlay.innerHTML = `
      <div style="background:#222;padding:32px 40px;border-radius:18px;box-shadow:0 4px 32px #0008;text-align:center;min-width:320px;">
        <h2 style='color:#fff;margin-bottom:18px;'>¡Bienvenido a Hardcore Ninja!</h2>
        <input id='nickInput' type='text' maxlength='16' placeholder='Tu nick...' style='font-size:18px;padding:8px 12px;border-radius:8px;border:none;width:80%;margin-bottom:16px;'><br>
        <label style='color:#fff;font-size:16px;'>Color de tu ninja:</label><br>
        <input id='colorInput' type='color' value='#00ff00' style='width:60px;height:36px;margin:8px 0 18px 0;border-radius:8px;border:none;'><br>
        <button id='startBtn' style='font-size:18px;padding:8px 32px;border-radius:8px;background:#00bfff;color:#fff;border:none;cursor:pointer;'>Entrar</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('startBtn').onclick = () => {
        const nick = document.getElementById('nickInput').value.trim() || 'Ninja';
        const color = document.getElementById('colorInput').value || '#00ff00';
        overlay.remove();
        onSubmit({ nick, color });
    };
}

window.onload = function() {
    showLoginUI(({ nick, color }) => {
        window.nick = nick;
        window.color = color;
        console.log('[CLIENT] Nick elegido:', nick, 'Color:', color);
        socket = io();
        window.socket = socket;
        socket.on('connect', () => {
            myId = socket.id;
            console.log('[CLIENT] Socket conectado, id:', socket.id);
            const game = new Phaser.Game(config);
            window.onPhaserReady = (player) => {
                console.log('[CLIENT] onPhaserReady, socket.id:', socket.id);
                socket.emit('newPlayer', { x: player.x, y: player.y, name: nick, color });
                console.log('[CLIENT] Emit newPlayer:', { x: player.x, y: player.y, name: nick, color });
                player.nick = nick;
                player.color = color;
                player._origActivateDeflect = player.activateDeflect;
                player.activateDeflect = function() {
                    console.log('[CLIENT] Emit ability: deflect');
                    socket.emit('ability', { type: 'deflect' });
                    player._origActivateDeflect.call(player);
                };
                player._origTryBlink = player.tryBlink;
                player.tryBlink = function(x, y, walls, range) {
                    socket.emit('ability', { type: 'blink', x, y });
                    player._origTryBlink.call(player, x, y, walls, range);
                };
                player._origLaunchShockwave = player.launchShockwave;
                player.launchShockwave = function(x, y, allPlayers) {
                    socket.emit('ability', { type: 'shockwave', x, y });
                    player._origLaunchShockwave.call(player, x, y, allPlayers);
                };
                player._origLaunchDagger = player.launchDagger;
                player.launchDagger = function(target) {
                    if (target && target.id) {
                        console.log('[CLIENT] Emit ability: dagger', target.id);
                        socket.emit('ability', { type: 'dagger', targetId: target.id, x: player.x, y: player.y });
                    }
                    player._origLaunchDagger.call(player, target);
                };
            };
        });
        socket.on('state', (players) => {
            console.log('[CLIENT] Recibido state:', players);
            allPlayers = players;
            window.updateRemotePlayers && window.updateRemotePlayers(players);
        });
        socket.on('ability', (data) => {
            console.log('[CLIENT] Recibido ability:', data);
            if (!window.updateRemotePlayers) {
                console.log('[CLIENT] updateRemotePlayers no está definido, return');
                return;
            }
            const id = data.from;
            if (!id) {
                console.log('[CLIENT] id no definido, return');
                return;
            }
            if (id === socket.id) {
                console.log('[CLIENT] id es el propio socket, return');
                return;
            }
            let remote = window.remotePlayers && window.remotePlayers[id];
            let tries = 0;
            function tryAbility() {
                remote = window.remotePlayers && window.remotePlayers[id];
                console.log('[CLIENT] Buscando remotePlayer para id', id, 'Intento', tries, 'remotePlayers:', window.remotePlayers);
                if (!remote) {
                    tries++;
                    if (tries < 5) {
                        setTimeout(tryAbility, 100);
                    } else {
                        console.log('[CLIENT] No se encontró remotePlayer para id', id, 'después de 5 intentos');
                    }
                    return;
                }
                if (data.type === 'deflect') {
                    console.log('[CLIENT] Ejecutando activateDeflect en remotePlayer', id);
                    remote.activateDeflect();
                }
                if (data.type === 'blink') remote.tryBlink(data.x, data.y, remote.scene.walls, 180);
                if (data.type === 'shockwave') {
                    const allPlayers = [window.player, ...Object.values(window.remotePlayers || {})];
                    remote.launchShockwave(data.x, data.y, allPlayers);
                }
                if (data.type === 'dagger') {
                    let target = window.remotePlayers[data.targetId] || null;
                    if (!target && window.player && window.player.id === data.targetId) {
                        target = window.player;
                        console.log('[CLIENT] Dagger: target es el jugador local', window.player.nick);
                    }
                    console.log('[CLIENT] Ejecutando launchDagger en remotePlayer', id, 'contra target', data.targetId, target);
                    if (target) {
                        remote.launchDagger(target, data.x, data.y);
                    } else {
                        console.log('[CLIENT] Dagger: target no encontrado para id', data.targetId);
                    }
                }
            }
            tryAbility();
        });
        socket.on('victory', (data) => {
            alert(`¡Victoria! ${data.winner} ha ganado con ${data.score} puntos. La partida se reiniciará en 3 segundos.`);
        });
        window.sendMove = (x, y) => {
            if (socket && socket.connected) {
                socket.emit('move', { x, y });
            }
        };
        window.sendState = (data) => {
            if (socket && socket.connected) {
                socket.emit('updateState', data);
            }
        };
    });
}; 