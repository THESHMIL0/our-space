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
let sharedNote = ""; 
let bucketList = ["Go to the beach 🏖️", "Late night drive 🚗"]; 
let partnerMood = "Happy 😊"; 
let locketImage = ""; 
let partnerBattery = "100%"; // NEW: Battery Memory

io.on('connection', (socket) => {
    // Sync all states on load
    socket.emit('game update', gameState);
    socket.emit('note update', sharedNote);
    socket.emit('list update', bucketList);
    socket.emit('mood update', partnerMood);
    socket.emit('locket update', locketImage);
    socket.emit('battery update', partnerBattery);

    // 🔋 Live Battery
    socket.on('update battery', (batteryData) => {
        partnerBattery = batteryData;
        socket.broadcast.emit('battery update', partnerBattery);
    });

    // 📳 Screen Shake (Buzz)
    socket.on('send buzz', () => {
        socket.broadcast.emit('receive buzz');
        socket.broadcast.emit('notification', `📳 BUZZ! PAY ATTENTION!`);
    });

    // 💬 Chat
    socket.on('chat message', (data) => {
        socket.broadcast.emit('chat message', { text: data.text, sender: 'them' });
        socket.broadcast.emit('notification', `💬 ${data.text}`);
    });
    socket.on('typing', () => socket.broadcast.emit('typing'));
    socket.on('stop typing', () => socket.broadcast.emit('stop typing'));

    // 🖼️ Locket Widget
    socket.on('update locket', (imgData) => { locketImage = imgData; io.emit('locket update', locketImage); socket.broadcast.emit('notification', `🖼️ Updated the Locket!`); });

    // 🎮 Tic-Tac-Toe
    socket.on('make move', (data) => { gameState[data.index] = data.symbol; io.emit('game update', gameState); });
    socket.on('reset game', () => { gameState = Array(9).fill(null); io.emit('game update', gameState); });

    // 🎨 Live Drawing
    socket.on('draw', (data) => socket.broadcast.emit('draw', data));

    // ❤️ Hearts
    socket.on('send heart', () => { io.emit('show heart'); socket.broadcast.emit('notification', `❤️ Sent you love!`); });

    // 📝 Note
    socket.on('update note', (text) => { sharedNote = text; socket.broadcast.emit('note update', sharedNote); });

    // ✅ Bucket List
    socket.on('add item', (item) => { bucketList.push(item); io.emit('list update', bucketList); socket.broadcast.emit('notification', `✅ Added to Bucket List!`); });
    socket.on('clear list', () => { bucketList = []; io.emit('list update', bucketList); });

    // 📸 Camera
    socket.on('send snap', (imgData) => { socket.broadcast.emit('receive snap', imgData); socket.broadcast.emit('notification', `📸 Sent a Secret Snap!`); });

    // 🎭 Mood
    socket.on('set mood', (mood) => { partnerMood = mood; io.emit('mood update', partnerMood); socket.broadcast.emit('notification', `🎭 Mood: ${mood}`); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
