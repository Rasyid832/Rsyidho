const { GoogleGenAI } = require('@google/generative-ai');
require('dotenv').config();

// Pastikan API Key tersedia
if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY tidak ditemukan di file .env!");
    process.exit(1);
}

// Inisialisasi Google Gen AI menggunakan API Key dari .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Kita gunakan model 'gemini-2.5-flash' karena super cepat dan gratis cocok untuk text-based tools
const aiModel = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

module.exports = aiModel;