const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let gameState = Array(9).fill(null);
let sharedNote = "Type a sweet note here... 📝"; // Memory for the sticky note

io.on('connection', (socket) => {
    // Send current states when they open the app
    socket.emit('game update', gameState);
    socket.emit('note update', sharedNote);

    // Chat
    socket.on('chat message', (data) => {
        socket.broadcast.emit('chat message', { text: data.text, sender: 'them' });
    });

    // Tic-Tac-Toe
    socket.on('make move', (data) => {
        gameState[data.index] = data.symbol;
        io.emit('game update', gameState);
    });

    socket.on('reset game', () => {
        gameState = Array(9).fill(null);
        io.emit('game update', gameState);
    });

    // Live Drawing
    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data); 
    });

    // Floating Hearts
    socket.on('send heart', () => {
        io.emit('show heart'); 
    });

    // Shared Sticky Note Widget
    socket.on('update note', (text) => {
        sharedNote = text;
        socket.broadcast.emit('note update', sharedNote);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on ${PORT}`));
