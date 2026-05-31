const BACKEND_URL = 'http://localhost:3000/api/ai';

// Variabel global untuk menampung file yang sedang dipilih user
let selectedFileBase64 = null;
let selectedFileMimeType = null;
let selectedFileName = null;

// =========================================================================
// FUNGSI SAKTI: Custom Parser Matematika & Markdown Bold untuk KaTeX
// =========================================================================
function parseAndRenderMath(text) {
    if (!window.katex) return text;

    // 1. Handle Display Math ($$.$$) terlebih dahulu agar karakter di dalam rumus aman
    text = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, mathExpression) => {
        try {
            return `<div class="my-3 flex justify-center text-center overflow-x-auto">${katex.renderToString(mathExpression, { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) {
            return match;
        }
    });

    // 2. Handle Inline Math ($.$) yang suka menempel ke huruf/tanda baca lain
    text = text.replace(/\$([\s\S]*?)\$/g, (match, mathExpression) => {
        // Abaikan jika isinya kosong atau hanya spasi
        if (!mathExpression.trim()) return match;
        try {
            return `<span class="inline-math px-0.5 font-sans">${katex.renderToString(mathExpression, { displayMode: false, throwOnError: false })}</span>`;
        } catch (e) {
            return match;
        }
    });

    // 3. [BARU] Render Format Tiga Bintang (Bold + Italic) ***teks*** -> <strong><em>teks</em></strong>
    // Harus dieksekusi paling pertama sebelum bintangnya dipotong terpisah oleh bold/italic biasa
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // 4. Render Format Markdown Tebal (Bold) **teks** -> <strong>teks</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 5. Render Format Markdown Miring (Italic) *teks* -> <em>teks</em>
    // Menggunakan [^*] supaya regex aman dan tidak merusak simbol matematika lain
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return text;
}
// =========================================================================

// 1. Fungsi saat user memilih file dari komputernya
function handleFileSelection() {
    const fileInput = document.getElementById('file-upload-input');
    const previewContainer = document.getElementById('file-preview-container');
    const previewName = document.getElementById('file-preview-name');
    const previewIcon = document.getElementById('file-preview-icon');
    
    const file = fileInput.files[0];
    if (!file) return;

    selectedFileName = file.name;
    selectedFileMimeType = file.type;

    // Ganti emoji ikon berdasarkan tipe file
    if (file.type.includes('image/')) {
        previewIcon.innerText = '🖼️';
    } else if (file.type === 'application/pdf') {
        previewIcon.innerText = '📄';
    } else {
        previewIcon.innerText = '📁';
    }

    // Tampilkan nama file dan munculkan container preview-nya
    previewName.innerText = file.name;
    previewContainer.classList.remove('hidden');

    // Membaca file dan mengubahnya menjadi string Base64
    const reader = new FileReader();
    reader.onload = function (e) {
        // Ambil string murni base64 setelah tanda koma
        selectedFileBase64 = e.target.result.split(',')[1];
    };
    reader.readAsDataURL(file);
}

// 2. Fungsi untuk membatalkan/menghapus file yang sudah dipilih
function clearSelectedFile() {
    document.getElementById('file-upload-input').value = '';
    document.getElementById('file-preview-container').classList.add('hidden');
    selectedFileBase64 = null;
    selectedFileMimeType = null;
    selectedFileName = null;
}

// 3. Fungsi Utama Mengirim Chat & File ke Backend
async function sendChatMessage() {
    const chatInputEl = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const messageText = chatInputEl.value.trim();

    // Validasi: Harus ada teks atau file yang dikirim
    if (!messageText && !selectedFileBase64) return;

    // Kustom pesan visual jika user melampirkan file
    let attachmentHtml = '';
    if (selectedFileName) {
        const icon = selectedFileMimeType.includes('image/') ? '🖼️' : '📄';
        attachmentHtml = `
            <div class="flex items-center gap-1.5 text-xs bg-purple-700/40 border border-purple-400/30 px-2 py-1 rounded-lg mb-1.5 font-medium text-purple-200">
                <span>${icon}</span> <span class="truncate max-w-[140px]">${selectedFileName}</span>
            </div>
        `;
    }

    // Render pesan dari USER ke layar (Kanan)
    const userMessageHtml = `
        <div class="flex items-start gap-3 max-w-[85%] ml-auto justify-end">
            <div class="flex flex-col gap-1 items-end">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-slate-400">Kamu</span>
                </div>
                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-md leading-relaxed tracking-wide">
                    ${attachmentHtml}
                    <div class="whitespace-pre-wrap">${messageText}</div>
                </div>
            </div>
            <div class="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm text-sm">
                👤
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', userMessageHtml);
    
    // Simpan data file ke variabel lokal untuk dikirim, lalu bersihkan preview input
    const fileToSend = selectedFileBase64;
    const mimeToSend = selectedFileMimeType;
    clearSelectedFile();

    chatInputEl.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Render Animasi Loading Sementara untuk AI (Kiri)
    const loadingId = 'loading-' + Date.now();
    const aiLoadingHtml = `
        <div class="flex items-start gap-3 max-w-[85%]" id="${loadingId}">
            <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm text-sm">
                🤖
            </div>
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-slate-400">Syid AI</span>
                </div>
                <div class="bg-slate-900/90 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-slate-800/80 animate-pulse shadow-md">
                    Sedang menganalisis file & mengetik... ⏳
                </div>
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', aiLoadingHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // Tembak paket data lengkap (Teks + File Base64) ke backend
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: messageText,
                fileData: fileToSend,
                fileMimeType: mimeToSend
            })
        });

        const data = await response.json();
        document.getElementById(loadingId).remove();

        // Persiapkan data teks asli dan hasil render HTML penuhnya
        let rawContent = data.result || '';
        let processedHtml = data.error ? 'Waduh error nih: ' + data.error : parseAndRenderMath(rawContent);

        // 1. Buat kontainer kosong ber-ID unik untuk diisi teks berjalan secara real-time
        const aiUniqueId = 'ai-msg-' + Date.now();
        const aiMessageHtml = `
            <div class="flex items-start gap-3 max-w-[85%]">
                <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm text-sm">
                    🤖
                </div>
                <div class="flex flex-col gap-1 w-full">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-slate-400">Syid AI</span>
                    </div>
                    <div id="${aiUniqueId}" class="bg-slate-900/90 text-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-slate-800/80 shadow-md leading-relaxed tracking-wide whitespace-pre-wrap min-h-[40px]">
                        </div>
                </div>
            </div>
        `;
        chatContainer.insertAdjacentHTML('beforeend', aiMessageHtml);
        
        const targetTargetBubble = document.getElementById(aiUniqueId);
        
        if (data.error) {
            // Jika ada error dari server, langsung cetak tanpa efek ngetik
            targetTargetBubble.innerHTML = processedHtml;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
            // --- LOGIKA SIMULASI MENGETIK KARAKTER DEMI KARAKTER ---
            let currentTextIndex = 0;
            const typingSpeed = 15; // Kecepatan jeda ketik (ms). Makin kecil makin ngebut!
            
            function typeWriterEffect() {
                if (currentTextIndex <= rawContent.length) {
                    // Potong teks murni dari indeks awal hingga indeks berjalan saat ini
                    let partialText = rawContent.substring(0, currentTextIndex);
                    
                    // Parse potongan teks tersebut agar jika ada tag dolar ($) langsung jadi rumus
                    targetTargetBubble.innerHTML = parseAndRenderMath(partialText);
                    
                    // Dorong scrollbar ke bawah mengikuti pertumbuhan teks baru
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    
                    currentTextIndex += 3; // Lompat 3 karakter per ketikan supaya speed-nya pas & natural
                    setTimeout(typeWriterEffect, typingSpeed);
                } else {
                    // Jika proses mengetik selesai, kunci elemen dengan output HTML yang 100% sempurna
                    targetTargetBubble.innerHTML = processedHtml;
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }
            
            // Eksekusi efek mengetik!
            typeWriterEffect();
        }

    } catch (error) {
        console.error(error);
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        alert("Gagal memproses pesan. Pastikan server backend kamu menyala, bro!");
    }
}