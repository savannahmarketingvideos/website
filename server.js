require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { File, Storage } = require('megajs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for temporary file storage
const storage = multer.diskStorage({
    destination: 'temp/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// MEGA client setup
let megaStorage = null;

async function initMega() {
    try {
        megaStorage = new Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD
        });

        await megaStorage.ready;
        console.log('Connected to MEGA');
    } catch (error) {
        console.error('Error connecting to MEGA:', error);
    }
}

// Initialize MEGA connection
initMega();

// Upload endpoint
app.post('/api/upload', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    try {
        // Get file details from the request
        const { carModel, date, notes } = req.body;
        const filePath = req.file.path;
        const fileName = `${carModel}_${date}_${path.basename(req.file.originalname)}`;

        // Upload to MEGA
        const file = await megaStorage.upload(filePath, fileName).complete;
        
        // Get the shareable link
        const shareLink = await file.link();

        // Send response
        res.json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                fileName,
                shareLink,
                carModel,
                date,
                notes
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading video' });
    }
});

// Get videos endpoint
app.get('/api/videos', async (req, res) => {
    try {
        const files = await megaStorage.getFiles();
        const videos = await Promise.all(files.map(async (file) => {
            const link = await file.link();
            return {
                name: file.name,
                size: file.size,
                link,
                timestamp: file.timestamp
            };
        }));

        res.json(videos);
    } catch (error) {
        console.error('Error getting videos:', error);
        res.status(500).json({ error: 'Error retrieving videos' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 