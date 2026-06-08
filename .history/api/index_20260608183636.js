const express = require('express');
const cors = require('cors');
const aiRoutes = require('../backend/src/routes/aiRoutes'); // Path ini sudah benar mengarah ke folder backend
require('dotenv').config();

const app = express();

// 1. Mengaktifkan CORS agar Frontend bisa mengakses API Backend tanpa hambatan
app.use(cors());

// 2. Mengatur limit ukuran payload data hingga 50 Megabytes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Menghubungkan rute utama aplikasi ke file aiRoutes.js
app.use('/api/ai', aiRoutes);

// 4. Fallback Router untuk mengecek jika backend berhasil diakses via browser
app.get('/', (req, res) => {
    res.send('🚀 Backend Syid AI sedang berjalan dengan mulus di Vercel, bro!');
});

// [PENTING] app.listen() DIBUANG agar tidak merusak serverless runtime Vercel

module.exports = app;