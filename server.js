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

// --- CLOUDINARY CONFIG (Permanent Photos) ---
// Using your credentials: Cloud Name 'dfve8uora' and API Key '422671168247312'
cloudinary.config({ 
  cloud_name: 'dfve8uora', 
  api_key: '422671168247312', 
  api_secret: 'Vpnar71jkKkC8vglS9j4PfEmgNY' // Your final secret
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION (Permanent Chat) ---
// Using your MongoDB link and password 'lovel23'
const MONGO_URI = "mongodb+srv://love:lovel23@cluster0.xjeyvxt.mongodb.net/?appName=Cluster0"; 
mongoose.connect(MONGO_URI);

const Message = mongoose.model('Message', new mongoose.Schema({ text: String, timestamp: { type: Date, default: Date.now } }));
const Photo = mongoose.model('Photo', new mongoose.Schema({ url: String, timestamp: { type: Date, default: Date.now } }));

// Multer memory setup for cloud transfer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- PERMANENT UPLOAD ROUTE ---
app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        if(!req.file) return res.status(400).send('No file.');
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        
        // This sends the photo to Cloudinary forever
        const result = await cloudinary.uploader.upload(dataURI, { resource_type: "auto" });
        
        // This saves the link to your MongoDB database
        const newPhoto = new Photo({ url: result.secure_url });
        await newPhoto.save();
        
        io.emit('new photo', result.secure_url);
        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).send('Upload Error'); 
    }
});

// --- REAL-TIME CHAT LOGIC ---
io.on('connection', async (socket) => {
    // Load history from MongoDB
    const history = await Message.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('load history', history);
    
    const photos = await Photo.find().sort({ timestamp: -1 }).limit(20);
    photos.forEach(p => socket.emit('new photo', p.url));

    socket.on('chat message', async (msg) => {
        const newMessage = new Message({ text: msg });
        await newMessage.save();
        socket.broadcast.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server live on port ${PORT}`));
