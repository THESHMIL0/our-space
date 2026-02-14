const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 1. MEMORY STORAGE (Saves messages while server is running) ---
let chatHistory = []; 

// Setup Photo Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = '/tmp/uploads'; // Use /tmp for Render (Temporary storage)
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));
// Allow accessing uploaded photos
app.use('/uploads', express.static('/tmp/uploads'));

// Upload Route
app.post('/upload', upload.single('photo'), (req, res) => {
    if(req.file) {
        io.emit('new photo', req.file.filename); // Send just the filename
        res.json({ success: true });
    } else { res.status(400).send('No file.'); }
});

// Socket Logic
io.on('connection', (socket) => {
    console.log('User connected');

    // 1. Send OLD messages to the new user immediately
    socket.emit('load history', chatHistory);

    // 2. Listen for new messages
    socket.on('chat message', (msg) => {
        // Save to memory
        chatHistory.push(msg);
        if(chatHistory.length > 50) chatHistory.shift(); // Keep only last 50
        
        // Send to everyone
        io.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
