const express = require('express');
const cors = require('cors');
const aiRoutes = require('../backend/src/routes/aiRoutes');
require('dotenv').config();

const app = express();

// 1. Mengaktifkan CORS agar Frontend bisa mengakses API Backend tanpa hambatan
app.use(cors());

// 2. [PENTING] Mengatur limit ukuran payload data hingga 50 Megabytes
// Ini agar server kuat menerima data konversi Base64 dari foto beresolusi tinggi tanpa putus koneksi
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Menghubungkan rute utama aplikasi ke file aiRoutes.js milikmu
// Endpoint kamu nantinya akan mengarah ke http://localhost:3000/api/ai/...
app.use('/api/ai', aiRoutes);

// 4. Fallback Router untuk mengecek jika backend berhasil diakses via browser
app.get('/', (req, res) => {
    res.send('🚀 Backend Syid AI sedang berjalan dengan mulus, bro!');
});

// 5. Menjalankan server pada port dari file .env atau fallback ke port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🔥 Syid AI Backend is up and running on port ${PORT}`);
    console.log(`=================================================`);
});

module.exports = app;