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

// OS Memory Storage
let gameState = Array(9).fill(null);
let c4State = Array(42).fill(null);
let tapScore = 50; 
let plantLevel = 0; 
let loveLevel = 100; 
let partnerSleeping = false;
let locketImage = ""; 
let partnerBattery = "100%"; 

let memoryBoard = []; let memoryFlipped = []; let memoryMatched = [];
function initMemory() { const e = ['🍎','🍎','🍌','🍌','🍇','🍇','🍉','🍉','🍓','🍓','🍒','🍒','🍍','🍍','🥝','🥝']; memoryBoard = e.sort(() => Math.random() - 0.5); memoryFlipped = []; memoryMatched = []; }
initMemory();

let qdState = 'idle'; let qdTimeout = null;
let balloonPumps = 0; let balloonPopped = false; let balloonThreshold = Math.floor(Math.random() * 15) + 5; 
function resetBalloon() { balloonPumps = 0; balloonPopped = false; balloonThreshold = Math.floor(Math.random() * 15) + 5; }

// 🆕 NEW: RPS State
let rpsChoices = {}; 

io.on('connection', (socket) => {
    socket.emit('game update', gameState); socket.emit('c4 update', c4State); socket.emit('tap update', tapScore);
    socket.emit('plant update', plantLevel); socket.emit('love update', loveLevel); socket.emit('sleep update', partnerSleeping);
    socket.emit('locket update', locketImage); socket.emit('battery update', partnerBattery);
    socket.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched });
    socket.emit('qd update', qdState); socket.emit('balloon update', { pumps: balloonPumps, popped: balloonPopped });

    // System APIs
    socket.on('update battery', (batt) => { partnerBattery = batt; socket.broadcast.emit('battery update', partnerBattery); });
    socket.on('send buzz', () => { socket.broadcast.emit('receive buzz'); socket.broadcast.emit('notification', `📳 BUZZ! PAY ATTENTION!`); });
    socket.on('chat message', (data) => { socket.broadcast.emit('chat message', { text: data.text, sender: 'them' }); socket.broadcast.emit('notification', `💬 ${data.text}`); });
    socket.on('typing', () => socket.broadcast.emit('typing')); socket.on('stop typing', () => socket.broadcast.emit('stop typing'));
    socket.on('update locket', (imgData) => { locketImage = imgData; io.emit('locket update', locketImage); socket.broadcast.emit('notification', `🖼️ Updated the Locket!`); });
    socket.on('send heart', () => { io.emit('show heart'); socket.broadcast.emit('notification', `❤️ Sent you love!`); });
    socket.on('water plant', () => { plantLevel++; io.emit('plant update', plantLevel); });
    socket.on('charge love', () => { if(loveLevel < 100) loveLevel += 5; if(loveLevel > 100) loveLevel = 100; io.emit('love update', loveLevel); });
    socket.on('toggle sleep', (status) => { partnerSleeping = status; socket.broadcast.emit('sleep update', partnerSleeping); let msg = status ? "😴 I'm sleeping!" : "☀️ I'm awake!"; socket.broadcast.emit('notification', msg); });

    // Existing Games
    socket.on('make move', (data) => { gameState[data.index] = data.symbol; io.emit('game update', gameState); });
    socket.on('reset game', () => { gameState = Array(9).fill(null); io.emit('game update', gameState); });
    socket.on('draw', (data) => socket.broadcast.emit('draw', data));
    socket.on('c4 move', (data) => { c4State[data.index] = data.symbol; io.emit('c4 update', c4State); });
    socket.on('c4 reset', () => { c4State = Array(42).fill(null); io.emit('c4 update', c4State); });
    socket.on('tap pull', (color) => { if(color === 'red' && tapScore < 100 && tapScore > 0) tapScore += 2; if(color === 'blue' && tapScore < 100 && tapScore > 0) tapScore -= 2; io.emit('tap update', tapScore); });
    socket.on('tap reset', () => { tapScore = 50; io.emit('tap update', tapScore); });
    socket.on('mem flip', (idx) => { if(memoryMatched.includes(idx) || memoryFlipped.includes(idx)) return; if(memoryFlipped.length < 2) { memoryFlipped.push(idx); io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched }); if(memoryFlipped.length === 2) { let i1 = memoryFlipped[0], i2 = memoryFlipped[1]; if(memoryBoard[i1] === memoryBoard[i2]) { memoryMatched.push(i1, i2); memoryFlipped = []; setTimeout(() => io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched }), 500); } else { setTimeout(() => { memoryFlipped = []; io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched }); }, 1000); } } } });
    socket.on('mem reset', () => { initMemory(); io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched }); });
    socket.on('qd start', () => { if(qdState !== 'idle') return; qdState = 'wait'; io.emit('qd update', qdState); qdTimeout = setTimeout(() => { qdState = 'go'; io.emit('qd update', qdState); }, Math.random() * 3000 + 2000); });
    socket.on('qd tap', () => { if(qdState === 'go') { qdState = 'win'; io.emit('qd update', qdState); setTimeout(() => { qdState = 'idle'; io.emit('qd update', qdState); }, 3000); } else if (qdState === 'wait') { qdState = 'fail'; clearTimeout(qdTimeout); io.emit('qd update', qdState); setTimeout(() => { qdState = 'idle'; io.emit('qd update', qdState); }, 3000); } });
    socket.on('balloon pump', () => { if(balloonPopped) return; balloonPumps++; if(balloonPumps >= balloonThreshold) { balloonPopped = true; io.emit('balloon update', { pumps: balloonPumps, popped: true, popper: socket.id }); } else { io.emit('balloon update', { pumps: balloonPumps, popped: false }); } });
    socket.on('balloon reset', () => { resetBalloon(); io.emit('balloon update', { pumps: balloonPumps, popped: balloonPopped }); });

    // 🆕 NEW: Rock Paper Scissors Logic
    socket.on('rps pick', (choice) => {
        rpsChoices[socket.id] = choice;
        if(Object.keys(rpsChoices).length === 2) {
            // Both picked! Resolve winner
            let ids = Object.keys(rpsChoices);
            let p1 = rpsChoices[ids[0]], p2 = rpsChoices[ids[1]];
            io.emit('rps result', { id1: ids[0], choice1: p1, id2: ids[1], choice2: p2 });
            rpsChoices = {}; // Reset for next game
        } else {
            // Only one picked, tell the other to hurry up
            io.emit('rps waiting');
        }
    });
    socket.on('rps reset', () => { rpsChoices = {}; io.emit('rps clear'); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
