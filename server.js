const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. Setup Photo Storage (Save photos in a folder called 'uploads')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Unique name
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

// 2. Handle Photo Uploads
app.post('/upload', upload.single('photo'), (req, res) => {
    if(req.file) {
        // Tell everyone a new photo is ready!
        io.emit('new photo', `/uploads/${req.file.filename}`);
        res.json({ success: true });
    } else {
        res.status(400).send('No file uploaded.');
    }
});

// 3. Chat Logic
io.on('connection', (socket) => {
    console.log('User connected');

    // Load existing photos for new user
    const uploadDir = path.join(__dirname, 'public/uploads');
    if (fs.existsSync(uploadDir)) {
        fs.readdir(uploadDir, (err, files) => {
            if (files) {
                files.forEach(file => {
                    socket.emit('new photo', `/uploads/${file}`);
                });
            }
        });
    }

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
