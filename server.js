const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('/tmp/uploads'));

// --- DATABASE CONNECTION ---
// Using your specific connection string
// Updated with your password 'lovel23'
const MONGO_URI = "mongodb+srv://love:lovel23@cluster0.xjeyvxt.mongodb.net/?appName=Cluster0"; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to Database!'))
    .catch(err => console.error('Database Error:', err));

// Define Message Schema
const MessageSchema = new mongoose.Schema({
    text: String,
    sender: String, 
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// Define Photo Schema
const PhotoSchema = new mongoose.Schema({
    filename: String,
    timestamp: { type: Date, default: Date.now }
});
const Photo = mongoose.model('Photo', PhotoSchema);

// --- PHOTO UPLOAD SETUP ---
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

app.post('/upload', upload.single('photo'), async (req, res) => {
    if(req.file) {
        const newPhoto = new Photo({ filename: req.file.filename });
        await newPhoto.save();
        io.emit('new photo', req.file.filename);
        res.json({ success: true });
    } else { res.status(400).send('No file.'); }
});

// --- REAL-TIME LOGIC ---
io.on('connection', async (socket) => {
    console.log('User connected');

    // Load History from MongoDB
    const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('load history', messages);

    const photos = await Photo.find().sort({ timestamp: -1 }).limit(20);
    photos.forEach(p => socket.emit('new photo', p.filename));

    // Handle New Messages
    socket.on('chat message', async (msg) => {
        const newMessage = new Message({ text: msg, sender: 'them' });
        await newMessage.save();
        // Send to everyone else
        socket.broadcast.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
