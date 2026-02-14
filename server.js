const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Chat Logic
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg); // Send to everyone
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
