const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CLOUDINARY CONFIG ---
cloudinary.config({ 
  cloud_name: 'dfve8uora', 
  api_key: '422671168247312', 
  api_secret: 'Vpnar71jkKkC8vglS9j4PfEmgNY' 
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
const MONGO_URI = "mongodb+srv://love:lovel23@cluster0.xjeyvxt.mongodb.net/?appName=Cluster0"; 
mongoose.connect(MONGO_URI);

const Message = mongoose.model('Message', new mongoose.Schema({ 
    text: String, 
    sender: String, 
    timestamp: { type: Date, default: Date.now } 
}));

const Photo = mongoose.model('Photo', new mongoose.Schema({ 
    url: String, 
    timestamp: { type: Date, default: Date.now } 
}));

const upload = multer({ storage: multer.memoryStorage() });

// --- ROUTES ---
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, { resource_type: "auto" });
        const newPhoto = new Photo({ url: result.secure_url });
        await newPhoto.save();
        io.emit('new photo', result.secure_url);
        res.json({ success: true });
    } catch (e) { res.status(500).send(e); }
});

// --- REAL-TIME ENGINE ---
let gameState = Array(9).fill(null);

io.on('connection', async (socket) => {
    const history = await Message.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('load history', history);
    const photos = await Photo.find().sort({ timestamp: -1 }).limit(20);
    photos.forEach(p => socket.emit('new photo', p.url));
    socket.emit('game update', gameState);

    socket.on('chat message', async (data) => {
        // Save as 'me' so history knows who sent it
        const newMessage = new Message({ text: data.text, sender: 'me' }); 
        await newMessage.save();
        // Send to partner as 'them'
        socket.broadcast.emit('chat message', { text: data.text, sender: 'them' });
    });

    socket.on('make move', (data) => {
        gameState[data.index] = data.symbol;
        io.emit('game update', gameState);
    });

    socket.on('reset game', () => {
        gameState = Array(9).fill(null);
        io.emit('game update', gameState);
    });
});

server.listen(process.env.PORT || 3000);
