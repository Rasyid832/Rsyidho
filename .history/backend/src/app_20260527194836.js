const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Supaya server bisa membaca data JSON dari frontend

// Cek apakah API Key terbaca (Hanya untuk testing, aman selama tidak di-share key-nya)
console.log("Gemini API Key Loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

// Route Testing Utama
app.get('/', (req, res) => {
    res.json({ message: "Welcome to Mini AI Hub API Backend!" });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server is running smoothly on http://localhost:${PORT}`);
});