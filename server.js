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

// Game States
let gameState = Array(9).fill(null);
let c4State = Array(42).fill(null);
let tapScore = 50;
let qdState = 'idle'; let qdTimeout = null;
let balloonPumps = 0; let balloonPopped = false; let balloonThreshold = Math.floor(Math.random() * 15) + 5;
let rpsChoices = {};
let partnerBattery = "100%";
let currentWallpaper = "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)";

let memoryBoard = []; let memoryFlipped = []; let memoryMatched = [];
function initMemory() { const e = ['🍎','🍎','🍌','🍌','🍇','🍇','🍉','🍉','🍓','🍓','🍒','🍒','🍍','🍍','🥝','🥝']; memoryBoard = e.sort(() => Math.random() - 0.5); memoryFlipped = []; memoryMatched = []; }
initMemory();

// 🕵️‍♂️ NEW GAME: Odd One Out
let oddGrid = []; let oddIndex = 0; let oddScores = {};
function initOdd() {
    const pairs = [['😀','😃'], ['🍎','🍅'], ['🚗','🚙'], ['🌲','🌳'], ['🐶','🐱'], ['🌕','🌖'], ['🍔','🥪']];
    let pair = pairs[Math.floor(Math.random() * pairs.length)];
    oddGrid = Array(25).fill(pair[0]);
    oddIndex = Math.floor(Math.random() * 25);
    oddGrid[oddIndex] = pair[1];
}
initOdd();

function resetBalloon() { balloonPumps = 0; balloonPopped = false; balloonThreshold = Math.floor(Math.random() * 15) + 5; }

io.on('connection', (socket) => {
    // Sync all states on load
    socket.emit('game update', gameState); socket.emit('c4 update', c4State); socket.emit('tap update', tapScore);
    socket.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched });
    socket.emit('qd update', qdState); socket.emit('balloon update', { pumps: balloonPumps, popped: balloonPopped });
    socket.emit('battery update', partnerBattery); socket.emit('wallpaper update', currentWallpaper);
    socket.emit('odd update', { grid: oddGrid, scores: oddScores });

    // System APIs
    socket.on('update battery', (batt) => { partnerBattery = batt; socket.broadcast.emit('battery update', partnerBattery); });
    socket.on('send buzz', () => socket.broadcast.emit('receive buzz'));
    socket.on('chat message', (data) => socket.broadcast.emit('chat message', { text: data.text, sender: 'them' }));
    socket.on('typing', () => socket.broadcast.emit('typing')); socket.on('stop typing', () => socket.broadcast.emit('stop typing'));
    
    // ⚙️ Settings
    socket.on('set wallpaper', (bg) => { currentWallpaper = bg; io.emit('wallpaper update', currentWallpaper); });

    // Games
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
    socket.on('rps pick', (choice) => { rpsChoices[socket.id] = choice; if(Object.keys(rpsChoices).length === 2) { let ids = Object.keys(rpsChoices); io.emit('rps result', { id1: ids[0], choice1: rpsChoices[ids[0]], id2: ids[1], choice2: rpsChoices[ids[1]] }); rpsChoices = {}; } else { io.emit('rps waiting'); } });
    socket.on('rps reset', () => { rpsChoices = {}; io.emit('rps clear'); });
    
    // Odd One Out Server Logic
    socket.on('odd tap', (idx) => {
        if(idx === oddIndex) {
            oddScores[socket.id] = (oddScores[socket.id] || 0) + 1;
            initOdd();
            io.emit('odd update', { grid: oddGrid, scores: oddScores, winner: socket.id });
        }
    });
    socket.on('odd reset', () => { oddScores = {}; initOdd(); io.emit('odd update', { grid: oddGrid, scores: oddScores }); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
