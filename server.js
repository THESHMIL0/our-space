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

// Memory Storage
let gameState = Array(9).fill(null);
let sharedNote = ""; 
let bucketList = ["Go to the beach 🏖️", "Late night drive 🚗"]; 
let partnerMood = "Happy 😊"; // NEW: Mood Memory

io.on('connection', (socket) => {
    // Send states on load
    socket.emit('game update', gameState);
    socket.emit('note update', sharedNote);
    socket.emit('list update', bucketList);
    socket.emit('mood update', partnerMood);

    // 💬 Chat (Now triggers notifications)
    socket.on('chat message', (data) => {
        socket.broadcast.emit('chat message', { text: data.text, sender: 'them' });
        socket.broadcast.emit('notification', `💬 New Message: ${data.text}`);
    });

    // 🎮 Tic-Tac-Toe
    socket.on('make move', (data) => { gameState[data.index] = data.symbol; io.emit('game update', gameState); });
    socket.on('reset game', () => { gameState = Array(9).fill(null); io.emit('game update', gameState); });

    // 🎨 Live Drawing
    socket.on('draw', (data) => socket.broadcast.emit('draw', data));

    // ❤️ Floating Hearts
    socket.on('send heart', () => {
        io.emit('show heart');
        socket.broadcast.emit('notification', `❤️ Sending you love!`);
    });

    // 📝 Sticky Note
    socket.on('update note', (text) => { 
        sharedNote = text; 
        socket.broadcast.emit('note update', sharedNote); 
    });

    // ✅ Bucket List
    socket.on('add item', (item) => { 
        bucketList.push(item); 
        io.emit('list update', bucketList); 
        socket.broadcast.emit('notification', `✅ Added to Bucket List!`);
    });
    socket.on('clear list', () => { bucketList = []; io.emit('list update', bucketList); });

    // 📸 Secret Snap Camera
    socket.on('send snap', (imgData) => {
        socket.broadcast.emit('receive snap', imgData);
        socket.broadcast.emit('notification', `📸 Sent you a Secret Snap!`);
    });

    // 🎭 Mood Tracker
    socket.on('set mood', (mood) => {
        partnerMood = mood;
        io.emit('mood update', partnerMood);
        socket.broadcast.emit('notification', `🎭 Mood changed to: ${mood}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
