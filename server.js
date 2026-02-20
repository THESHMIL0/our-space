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

// --- GAME STATE ---
let gameState = Array(9).fill(null);

// --- REAL-TIME ENGINE (No memory, just live chat!) ---
io.on('connection', (socket) => {
    console.log("A user connected!");
    
    // Sync Game State when someone opens the app
    socket.emit('game update', gameState);

    // Bounce the chat message instantly to the other person
    socket.on('chat message', (data) => {
        socket.broadcast.emit('chat message', { text: data.text, sender: 'them' });
    });

    // Tic-Tac-Toe moves
    socket.on('make move', (data) => {
        gameState[data.index] = data.symbol;
        io.emit('game update', gameState);
    });

    // Clear the board
    socket.on('reset game', () => {
        gameState = Array(9).fill(null);
        io.emit('game update', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running beautifully on port ${PORT}`);
});
