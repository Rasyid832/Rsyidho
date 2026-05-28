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

// Fungsi helper untuk mengubah Base64 menjadi format yang dimengerti Gemini SDK
function fileToGenerativePart(base64Str, mimeType) {
    return {
        inlineData: {
            data: base64Str,
            mimeType: mimeType
        },
    };
}

exports.handleGeneralChat = async (req, res) => {
    try {
        const { message, fileData, fileMimeType } = req.body; // Terima kiriman file dari frontend

        if (!message && !fileData) {
            return res.status(400).json({ error: "Pesan atau file tidak boleh kosong ya, bro!" });
        }

        // Jika session belum dibuat, inisialisasi pertama kali
        if (!generalChatSession) {
            generalChatSession = aiModel.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: "Mulai sekarang, bertindaklah sebagai AI Asisten Serbaguna bernama Syid AI. Karaktermu cerdas, adaptif, solutif, dan ramah. Gunakan bahasa Indonesia santai (panggil 'bro'). Kamu dibekali kemampuan multimodal, jadi kamu bisa membaca teks, menganalisis kodingan, mendeteksi bug, membaca dokumen PDF, serta melihat objek di dalam foto/gambar dengan sangat detail." }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Siap, bro! Aku Syid AI. Sekarang aku sudah full multimodal! Lempar teks, kodingan, file PDF, atau foto ke sini, kita bedah dan beresin bareng-bareng! 🚀" }],
                    },
                ],
            });
        }

        // Tempat menampung konten yang akan dikirim (bisa gabungan teks + file)
        let sendContent = [];

        // Jika user menyertakan file, konversi dan masukkan ke dalam array konten
        if (fileData && fileMimeType) {
            const filePart = fileToGenerativePart(fileData, fileMimeType);
            sendContent.push(filePart);
        }

        // Masukkan pesan teks user jika ada (atau berikan default prompt jika hanya kirim file)
        sendContent.push(message || "Tolong analisis file yang saya lampirkan ini dengan detail, bro.");

        // Kirim array konten (file + teks) ke session chat
        const result = await generalChatSession.sendMessage(sendContent);
        const responseText = result.response.text();

        res.json({ result: responseText });

    } catch (error) {
        console.error("Error pada Multimodal Chat:", error);
        generalChatSession = null; 
        res.status(500).json({ error: "Terjadi kesalahan pada server saat memproses Chat AI." });
    }
};