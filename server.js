const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Memory
let chatHistory = []; 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = '/tmp/uploads'; 
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('/tmp/uploads'));

app.post('/upload', upload.single('photo'), (req, res) => {
    if(req.file) {
        // CHANGED: Send photo to everyone else
        socket.broadcast.emit('new photo', req.file.filename);
        res.json({ success: true, filename: req.file.filename });
    } else { res.status(400).send('No file.'); }
});

io.on('connection', (socket) => {
    console.log('User connected');

    // Send history
    socket.emit('load history', chatHistory);

    socket.on('chat message', (msg) => {
        // Save to memory
        const messageData = { text: msg, sender: 'them' }; // We save it as "them" for history purposes
        chatHistory.push(messageData);
        if(chatHistory.length > 50) chatHistory.shift();
        
        // CHANGED: Send to everyone EXCEPT the sender
        socket.broadcast.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
