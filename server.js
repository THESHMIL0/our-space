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

// Premium Memory Storage
let gameState = Array(9).fill(null);
let partnerMood = "Happy 😊"; 
let locketImage = ""; 
let partnerBattery = "100%"; 

// NEW APP MEMORY
let currentMusic = "Silence 🤫";
let plantLevel = 0;
let countdownDate = "2026-12-31";

io.on('connection', (socket) => {
    // Sync all states on load
    socket.emit('game update', gameState);
    socket.emit('mood update', partnerMood);
    socket.emit('locket update', locketImage);
    socket.emit('battery update', partnerBattery);
    socket.emit('music update', currentMusic);
    socket.emit('plant update', plantLevel);
    socket.emit('countdown update', countdownDate);

    // 🔋 Live Battery & 📳 Buzz
    socket.on('update battery', (batt) => { partnerBattery = batt; socket.broadcast.emit('battery update', partnerBattery); });
    socket.on('send buzz', () => { socket.broadcast.emit('receive buzz'); socket.broadcast.emit('notification', `📳 BUZZ! PAY ATTENTION!`); });

    // 💬 Chat & Typing
    socket.on('chat message', (data) => { socket.broadcast.emit('chat message', { text: data.text, sender: 'them' }); socket.broadcast.emit('notification', `💬 ${data.text}`); });
    socket.on('typing', () => socket.broadcast.emit('typing'));
    socket.on('stop typing', () => socket.broadcast.emit('stop typing'));

    // 🖼️ Locket & 🎭 Mood
    socket.on('update locket', (imgData) => { locketImage = imgData; io.emit('locket update', locketImage); socket.broadcast.emit('notification', `🖼️ Updated the Locket!`); });
    socket.on('set mood', (mood) => { partnerMood = mood; io.emit('mood update', partnerMood); socket.broadcast.emit('notification', `🎭 Mood: ${mood}`); });

    // 🎮 Games (Tic-Tac-Toe & Draw & Hearts)
    socket.on('make move', (data) => { gameState[data.index] = data.symbol; io.emit('game update', gameState); });
    socket.on('reset game', () => { gameState = Array(9).fill(null); io.emit('game update', gameState); });
    socket.on('draw', (data) => socket.broadcast.emit('draw', data));
    socket.on('send heart', () => { io.emit('show heart'); socket.broadcast.emit('notification', `❤️ Sent you love!`); });

    // 🪴 NEW: Shared Plant
    socket.on('water plant', () => { 
        plantLevel++; 
        io.emit('plant update', plantLevel); 
        socket.broadcast.emit('notification', `💧 Watered our plant!`);
    });

    // 🎵 NEW: Music Status
    socket.on('set music', (song) => { 
        currentMusic = song; 
        io.emit('music update', currentMusic); 
        socket.broadcast.emit('notification', `🎵 Listening to: ${song}`);
    });

    // ⏳ NEW: Countdown
    socket.on('set countdown', (date) => {
        countdownDate = date;
        io.emit('countdown update', countdownDate);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
