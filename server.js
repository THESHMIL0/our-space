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

// Server State
let gameState = Array(9).fill(null);
let c4State = Array(42).fill(null);
let tapScore = 50; 
let qdState = 'idle'; let qdTimeout = null;
let balloonPumps = 0; let balloonPopped = false; let balloonThreshold = Math.floor(Math.random() * 15) + 5;
let rpsChoices = {};
let currentWallpaper = "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)";
let partnerBattery = "100% 🔋";

// Memory Match State
let memoryBoard = []; let memoryFlipped = []; let memoryMatched = [];
function initMemory() { const e = ['🍎','🍎','🍌','🍌','🍇','🍇','🍉','🍉','🍓','🍓','🍒','🍒','🍍','🍍','🥝','🥝']; memoryBoard = e.sort(() => Math.random() - 0.5); memoryFlipped = []; memoryMatched = []; }
initMemory();

// Odd One Out State
let oddGrid = []; let oddIndex = 0; let oddScores = {};
function initOdd() {
    const pairs = [['😀','😃'], ['🍎','🍅'], ['🚗','🚙'], ['🌲','🌳'], ['🐶','🐱'], ['🌕','🌖'], ['🍔','🥪']];
    let pair = pairs[Math.floor(Math.random() * pairs.length)];
    oddGrid = Array(25).fill(pair[0]); oddIndex = Math.floor(Math.random() * 25); oddGrid[oddIndex] = pair[1];
}
initOdd();

io.on('connection', (socket) => {
    // Send initial states
    socket.emit('wallpaper update', currentWallpaper); socket.emit('battery update', partnerBattery);
    socket.emit('game update', gameState); socket.emit('c4 update', c4State); socket.emit('tap update', tapScore);
    socket.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched });
    socket.emit('qd update', qdState); socket.emit('balloon update', { pumps: balloonPumps, popped: balloonPopped });
    socket.emit('odd update', { grid: oddGrid, scores: oddScores });

    // Separated Chats
    socket.on('main message', (data) => socket.broadcast.emit('main message', { text: data.text }));
    socket.on('game message', (data) => socket.broadcast.emit('game message', { text: data.text }));
    socket.on('main typing', () => socket.broadcast.emit('main typing'));
    socket.on('game typing', () => socket.broadcast.emit('game typing'));

    // Utilities
    socket.on('update battery', (batt) => { partnerBattery = batt; socket.broadcast.emit('battery update', partnerBattery); });
    socket.on('send buzz', () => socket.broadcast.emit('receive buzz'));
    socket.on('set wallpaper', (bg) => { currentWallpaper = bg; io.emit('wallpaper update', currentWallpaper); });

    // Game Engines
    socket.on('make move', (data) => { gameState[data.index] = data.symbol; io.emit('game update', gameState); });
    socket.on('reset game', () => { gameState = Array(9).fill(null); io.emit('game update', gameState); });
    socket.on('draw', (data) => socket.broadcast.emit('draw', data));
    socket.on('c4 move', (data) => { c4State[data.index] = data.symbol; io.emit('c4 update', c4State); });
    socket.on('c4 reset', () => { c4State = Array(42).fill(null); io.emit('c4 update', c4State); });
    socket.on('tap pull', (color) => { if(tapScore < 100 && tapScore > 0) { tapScore += (color === 'red' ? 2 : -2); io.emit('tap update', tapScore); } });
    socket.on('tap reset', () => { tapScore = 50; io.emit('tap update', tapScore); });
    
    socket.on('mem flip', (idx) => {
        if(memoryMatched.includes(idx) || memoryFlipped.includes(idx)) return;
        if(memoryFlipped.length < 2) {
            memoryFlipped.push(idx); io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched });
            if(memoryFlipped.length === 2) {
                if(memoryBoard[memoryFlipped[0]] === memoryBoard[memoryFlipped[1]]) {
                    memoryMatched.push(memoryFlipped[0], memoryFlipped[1]); memoryFlipped = [];
                    setTimeout(() => io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched }), 500);
                } else {
                    setTimeout(() => { memoryFlipped = []; io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched }); }, 1000);
                }
            }
        }
    });
    socket.on('mem reset', () => { initMemory(); io.emit('memory update', { board: memoryBoard, flipped: memoryFlipped, matched: memoryMatched }); });

    socket.on('qd start', () => { if(qdState !== 'idle') return; qdState = 'wait'; io.emit('qd update', qdState); qdTimeout = setTimeout(() => { qdState = 'go'; io.emit('qd update', qdState); }, Math.random() * 3000 + 2000); });
    socket.on('qd tap', () => { if(qdState === 'go') { qdState = 'win'; io.emit('qd update', qdState); setTimeout(() => { qdState = 'idle'; io.emit('qd update', qdState); }, 3000); } else if (qdState === 'wait') { qdState = 'fail'; clearTimeout(qdTimeout); io.emit('qd update', qdState); setTimeout(() => { qdState = 'idle'; io.emit('qd update', qdState); }, 3000); } });
    
    socket.on('balloon pump', () => { if(balloonPopped) return; balloonPumps++; if(balloonPumps >= balloonThreshold) { balloonPopped = true; io.emit('balloon update', { pumps: balloonPumps, popped: true, popper: socket.id }); } else { io.emit('balloon update', { pumps: balloonPumps, popped: false }); } });
    socket.on('balloon reset', () => { balloonPumps = 0; balloonPopped = false; balloonThreshold = Math.floor(Math.random() * 15) + 5; io.emit('balloon update', { pumps: 0, popped: false }); });

    socket.on('rps pick', (choice) => { rpsChoices[socket.id] = choice; if(Object.keys(rpsChoices).length === 2) { let ids = Object.keys(rpsChoices); io.emit('rps result', { id1: ids[0], choice1: rpsChoices[ids[0]], id2: ids[1], choice2: rpsChoices[ids[1]] }); rpsChoices = {}; } else { io.emit('rps waiting'); } });
    socket.on('rps reset', () => { rpsChoices = {}; io.emit('rps clear'); });

    socket.on('odd tap', (idx) => { if(idx === oddIndex) { oddScores[socket.id] = (oddScores[socket.id] || 0) + 1; initOdd(); io.emit('odd update', { grid: oddGrid, scores: oddScores }); } });
    socket.on('odd reset', () => { oddScores = {}; initOdd(); io.emit('odd update', { grid: oddGrid, scores: oddScores }); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Arcade Server live on ${PORT}`));
