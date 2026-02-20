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
let partnerMood = "Happy 😊"; let locketImage = ""; let partnerBattery = "100%"; 
let currentMusic = "Silence 🤫"; let plantLevel = 0; let countdownDate = "2026-12-31";
let watchList = ["Spider-Man 🍿", "Stranger Things 📺"]; let loveLevel = 100; let partnerSleeping = false;

// 🆕 NEW GAME MEMORY
let c4State = Array(42).fill(null);
let tapScore = 50; // 50 is perfectly balanced (Tug of War)

io.on('connection', (socket) => {
    socket.emit('game update', gameState); socket.emit('mood update', partnerMood);
    socket.emit('locket update', locketImage); socket.emit('battery update', partnerBattery);
    socket.emit('music update', currentMusic); socket.emit('plant update', plantLevel);
    socket.emit('countdown update', countdownDate); socket.emit('watchlist update', watchList);
    socket.emit('love update', loveLevel); socket.emit('sleep update', partnerSleeping);
    
    // Send new game states
    socket.emit('c4 update', c4State);
    socket.emit('tap update', tapScore);

    // 🔋 System APIs
    socket.on('update battery', (batt) => { partnerBattery = batt; socket.broadcast.emit('battery update', partnerBattery); });
    socket.on('send buzz', () => { socket.broadcast.emit('receive buzz'); socket.broadcast.emit('notification', `📳 BUZZ! PAY ATTENTION!`); });
    socket.on('chat message', (data) => { socket.broadcast.emit('chat message', { text: data.text, sender: 'them' }); socket.broadcast.emit('notification', `💬 ${data.text}`); });
    socket.on('typing', () => socket.broadcast.emit('typing')); socket.on('stop typing', () => socket.broadcast.emit('stop typing'));
    socket.on('update locket', (imgData) => { locketImage = imgData; io.emit('locket update', locketImage); socket.broadcast.emit('notification', `🖼️ Updated the Locket!`); });
    socket.on('set mood', (mood) => { partnerMood = mood; io.emit('mood update', partnerMood); socket.broadcast.emit('notification', `🎭 Mood: ${mood}`); });

    // 🎮 Tic-Tac-Toe & Draw
    socket.on('make move', (data) => { gameState[data.index] = data.symbol; io.emit('game update', gameState); });
    socket.on('reset game', () => { gameState = Array(9).fill(null); io.emit('game update', gameState); });
    socket.on('draw', (data) => socket.broadcast.emit('draw', data));
    socket.on('send heart', () => { io.emit('show heart'); socket.broadcast.emit('notification', `❤️ Sent you love!`); });

    // 🔴🟡 NEW: Connect 4
    socket.on('c4 move', (data) => { c4State[data.index] = data.symbol; io.emit('c4 update', c4State); });
    socket.on('c4 reset', () => { c4State = Array(42).fill(null); io.emit('c4 update', c4State); });

    // ⚔️ NEW: Tap Battle (Tug of War)
    socket.on('tap pull', (color) => {
        if(color === 'red' && tapScore < 100 && tapScore > 0) tapScore += 2;
        if(color === 'blue' && tapScore < 100 && tapScore > 0) tapScore -= 2;
        io.emit('tap update', tapScore);
    });
    socket.on('tap reset', () => { tapScore = 50; io.emit('tap update', tapScore); });

    // 🪴 Lifestyle Apps
    socket.on('water plant', () => { plantLevel++; io.emit('plant update', plantLevel); socket.broadcast.emit('notification', `💧 Watered our plant!`); });
    socket.on('set music', (song) => { currentMusic = song; io.emit('music update', currentMusic); socket.broadcast.emit('notification', `🎵 Listening to: ${song}`); });
    socket.on('set countdown', (date) => { countdownDate = date; io.emit('countdown update', countdownDate); });
    socket.on('add movie', (item) => { watchList.push(item); io.emit('watchlist update', watchList); socket.broadcast.emit('notification', `🎬 Added to Watchlist!`); });
    socket.on('clear movies', () => { watchList = []; io.emit('watchlist update', watchList); });
    socket.on('charge love', () => { if(loveLevel < 100) loveLevel += 5; if(loveLevel > 100) loveLevel = 100; io.emit('love update', loveLevel); });
    socket.on('toggle sleep', (status) => { partnerSleeping = status; socket.broadcast.emit('sleep update', partnerSleeping); let msg = status ? "😴 I'm going to sleep. Goodnight!" : "☀️ I'm awake!"; socket.broadcast.emit('notification', msg); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
