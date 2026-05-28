const aiModel = require('../config/aiConfig');

// 1. Controller untuk Text Enhancer & Ringkasan
exports.handleTextEnhancer = async (req, res) => {
    try {
        const { text, mode } = req.body; // mode bisa 'summarize', 'formal', atau 'grammar'

        if (!text) {
            return res.status(400).json({ error: "Teks tidak boleh kosong!" });
        }

        let systemInstruction = "";

        // Mengatur instruksi spesifik ke Gemini berdasarkan kebutuhan user
        if (mode === 'summarize') {
            systemInstruction = "Kamu adalah AI asisten akademik. Rangkumlah teks berikut menjadi poin-poin singkat, padat, jelas, dan mudah dipahami oleh mahasiswa: ";
        } else if (mode === 'formal') {
            systemInstruction = "Ubah teks berikut menjadi bahasa Indonesia yang formal, sopan, dan profesional (cocok untuk berkirim pesan atau email ke Dosen atau rekan kerja): ";
        } else {
            systemInstruction = "Kamu adalah ahli bahasa. Perbaiki tata bahasa, ejaan, dan tanda baca dari teks berikut agar menjadi benar dan natural (baik bahasa Indonesia maupun Inggris): ";
        }

        // Tembak ke Gemini API
        const result = await aiModel.generateContent(systemInstruction + text);
        const responseText = result.response.text();

        // Kembalikan hasilnya ke frontend
        res.json({ result: responseText });

    } catch (error) {
        console.error("Error pada Text Enhancer:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server saat memproses AI." });
    }
};

// 2. Controller untuk Code Fixer & Explainer
exports.handleCodeFixer = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: "Kode tidak boleh kosong!" });
        }

        const systemInstruction = "Kamu adalah AI Senior Developer berpengalaman. Analisis kode berikut, temukan jika ada bug/error, berikan perbaikan kodenya di dalam block code markdown, dan jelaskan letak kesalahannya secara singkat dan mudah dipahami: ";

        const result = await aiModel.generateContent(systemInstruction + code);
        const responseText = result.response.text();

        res.json({ result: responseText });

    } catch (error) {
        console.error("Error pada Code Fixer:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server saat memproses AI." });
    }
};

// Variabel global di server untuk menyimpan session chat sementara
let generalChatSession = null;

exports.handleGeneralChat = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Pesan tidak boleh kosong ya, bro!" });
        }

        // Jika session belum dibuat, inisialisasi pertama kali dengan instruksi kepribadian AI
        if (!generalChatSession) {
            generalChatSession = aiModel.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: "Mulai sekarang, bertindaklah sebagai AI Asisten Serbaguna bernama Gemini (atau kustom nama sesukamu). Karaktermu adalah teman diskusi yang cerdas, adaptif, punya sedikit selera humor, solutif, dan ramah. Gunakan bahasa Indonesia yang santai, akrab (panggil user dengan 'bro'), tapi tetap sopan dan edukatif. Kamu bisa membantu urusan coding, matematika, tugas kuliah, analisis data, hingga obrolan santai sehari-hari." }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Siap, bro! Mulai sekarang aku bakal jadi asisten pribadi sekaligus teman diskusi kamu. Mau bahas codingan, tugas kuliah, nyari ide, atau sekadar ngobrol santai? Lempar aja ke sini, kita beresin bareng-bareng! 🚀" }],
                    },
                ],
            });
        }

        // Mengirim pesan baru ke dalam session chat yang sama
        const result = await generalChatSession.sendMessage(message);
        const responseText = result.response.text();

        res.json({ result: responseText });

    } catch (error) {
        console.error("Error pada General Chat:", error);
        // Jika ada error/crash, kita reset session-nya biar user bisa refresh dan chat ulang
        generalChatSession = null; 
        res.status(500).json({ error: "Terjadi kesalahan pada server saat memproses Chat AI." });
    }
};