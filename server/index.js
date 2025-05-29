const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const os = require('os');

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Estado global de jugadores
let players = {};

// Nueva función para reiniciar partida
function resetGame() {
    for (const id in players) {
        players[id].score = 0;
    }
    io.emit('state', players);
}

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado, socket.id:', socket.id);

    // Nuevo jugador se une
    socket.on('newPlayer', (data) => {
        console.log('[SERVER] newPlayer recibido:', data, 'socket.id:', socket.id);
        players[socket.id] = {
            id: socket.id,
            x: data.x,
            y: data.y,
            name: data.name || '',
            color: data.color || '#00ff00',
            alive: true,
            score: 0 // Score inicial
        };
        console.log('[SERVER] Estado actual de players tras newPlayer:', JSON.stringify(players));
        io.emit('state', players);
    });

    // Movimiento de jugador
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
        console.log('[SERVER] move recibido:', data, 'socket.id:', socket.id);
        console.log('[SERVER] Estado actual de players tras move:', JSON.stringify(players));
        io.emit('state', players);
    });

    // Actualización de estado (muerte, respawn, etc)
    socket.on('updateState', (data) => {
        // Si se pasa un id, actualiza ese jugador; si no, el del socket
        const targetId = data.id || socket.id;
        if (players[targetId]) {
            Object.assign(players[targetId], data);
        }
        // Si el updateState incluye killerId y es una muerte, suma score
        if (data.killerId && data.alive === false && players[data.killerId]) {
            players[data.killerId].score = (players[data.killerId].score || 0) + 1;
            // Si llega a 5 puntos, notificar victoria
            if (players[data.killerId].score >= 5) {
                io.emit('victory', { winner: players[data.killerId].name, score: players[data.killerId].score });
                setTimeout(resetGame, 3000); // Reinicia la partida tras 3 segundos
            }
        }
        console.log('[SERVER] updateState recibido:', data, 'socket.id:', socket.id);
        console.log('[SERVER] Estado actual de players tras updateState:', JSON.stringify(players));
        io.emit('state', players);
    });

    // Evento para sincronizar habilidades
    socket.on('ability', (data) => {
        // Adjunta el id de quien la activó
        data.from = socket.id;
        // Reenvía a todos menos al emisor
        socket.broadcast.emit('ability', data);
    });

    socket.on('disconnect', () => {
        console.log('Un usuario se ha desconectado, socket.id:', socket.id);
        delete players[socket.id];
        console.log('[SERVER] Estado actual de players tras disconnect:', JSON.stringify(players));
        io.emit('state', players);
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    // Obtener la IP local
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIp = iface.address;
                break;
            }
        }
    }
    console.log('Servidor corriendo en:');
    console.log(`- http://localhost:${PORT}`);
    console.log(`- http://${localIp}:${PORT}`);
}); 