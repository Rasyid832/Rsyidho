const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Rute AI
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

console.log("Gemini API Key Loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

// Pasang Rute AI di endpoint /api/ai
app.use('/api/ai', aiRoutes);

// Route Testing Utama
app.get('/', (req, res) => {
    res.json({ message: "Welcome to Mini AI Hub API Backend!" });
});

app.listen(PORT, () => {
    console.log(`Server is running smoothly on http://localhost:${PORT}`);
});