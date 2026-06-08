const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Pastikan API Key tersedia
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY tidak ditemukan di file .env!");
    process.exit(1);
}

// Inisialisasi yang benar sesuai dengan library @google/generative-ai
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ambil model gemini-2.5-flash
const aiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

module.exports = aiModel;