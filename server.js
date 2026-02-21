const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 });

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let gameState = Array(9).fill(null);
let c4State = Array(42).fill(null);
let tapScore = 50; 
let qdState = 'idle';
let balloonPumps = 0; let balloonPopped = false; let balloonThreshold = Math.floor(Math.random() * 15) + 5;
let rpsChoices = {};
let currentWallpaper = "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)";

io.on('connection', (socket) => {
    socket.emit('game update', gameState); socket.emit('c4 update', c4State); socket.emit('tap update', tapScore);
    socket.emit('qd update', qdState); socket.emit('balloon update', { pumps: balloonPumps, popped: balloonPopped });
    socket.emit('wallpaper update', currentWallpaper);

    // 💬 SEPARATED CHAT LOGIC
    socket.on('main message', (data) => {
        socket.broadcast.emit('main message', { text: data.text });
    });

    socket.on('game message', (data) => {
        socket.broadcast.emit('game message', { text: data.text });
    });

    socket.on('typing', (room) => socket.broadcast.emit('typing', room));
    socket.on('stop typing', (room) => socket.broadcast.emit('stop typing', room));

    // ⚙️ SETTINGS
    socket.on('set wallpaper', (bg) => { currentWallpaper = bg; io.emit('wallpaper update', currentWallpaper); });
    socket.on('send buzz', () => socket.broadcast.emit('receive buzz'));

    // 🎮 GAME LOGIC
    socket.on('make move', (data) => { gameState[data.index] = data.symbol; io.emit('game update', gameState); });
    socket.on('reset game', () => { gameState = Array(9).fill(null); io.emit('game update', gameState); });
    socket.on('draw', (data) => socket.broadcast.emit('draw', data));
    socket.on('c4 move', (data) => { c4State[data.index] = data.symbol; io.emit('c4 update', c4State); });
    socket.on('c4 reset', () => { c4State = Array(42).fill(null); io.emit('c4 update', c4State); });
    socket.on('tap pull', (color) => { if(tapScore < 100 && tapScore > 0) { tapScore += (color === 'red' ? 2 : -2); io.emit('tap update', tapScore); } });
    socket.on('tap reset', () => { tapScore = 50; io.emit('tap update', tapScore); });
    socket.on('balloon pump', () => { balloonPumps++; if(balloonPumps >= balloonThreshold) balloonPopped = true; io.emit('balloon update', { pumps: balloonPumps, popped: balloonPopped, popper: socket.id }); });
    socket.on('balloon reset', () => { balloonPumps = 0; balloonPopped = false; balloonThreshold = Math.floor(Math.random() * 15) + 5; io.emit('balloon update', { pumps: 0, popped: false }); });
    socket.on('rps pick', (choice) => { rpsChoices[socket.id] = choice; if(Object.keys(rpsChoices).length === 2) { io.emit('rps result', rpsChoices); rpsChoices = {}; } else { io.emit('rps waiting'); } });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Arcade Server live on ${PORT}`));
