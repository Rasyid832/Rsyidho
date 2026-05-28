const BACKEND_URL = 'http://localhost:3000/api/ai';

async function sendChatMessage() {
    const chatInputEl = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const messageText = chatInputEl.value.trim();

    // Validasi jika input kosong
    if (!messageText) return;

    // 1. Render pesan dari USER ke layar (Sebelah Kanan + Avatar 👤)
    const userMessageHtml = `
        <div class="flex items-start gap-3 max-w-[85%] ml-auto justify-end">
            <div class="flex flex-col gap-1 items-end">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-slate-400">Kamu</span>
                </div>
                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-md leading-relaxed tracking-wide">
                    ${messageText}
                </div>
            </div>
            <div class="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm text-sm">
                👤
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', userMessageHtml);
    
    // Reset kolom input dan scroll otomatis ke bawah
    chatInputEl.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 2. Render Animasi Loading Sementara untuk AI (Sebelah Kiri + Avatar 🤖)
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
                    Sedang mengetik... ⏳
                </div>
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', aiLoadingHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // 3. Tembak data pesan ke endpoint '/chat' backend
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageText })
        });

        const data = await response.json();
        
        // Hapus animasi loading setelah mendapat respons dari server
        document.getElementById(loadingId).remove();

        // 4. Render JAWABAN ASLI dari AI (Sebelah Kiri + Avatar 🤖)
        const aiMessageHtml = `
            <div class="flex items-start gap-3 max-w-[85%]">
                <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm text-sm">
                    🤖
                </div>
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-slate-400">Syid AI</span>
                    </div>
                    <div class="bg-slate-900/90 text-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-slate-800/80 shadow-md leading-relaxed tracking-wide whitespace-pre-wrap">
                        ${data.error ? 'Waduh error nih: ' + data.error : data.result}
                    </div>
                </div>
            </div>
        `;
        chatContainer.insertAdjacentHTML('beforeend', aiMessageHtml);
        
        // Geser scroll otomatis ke baris chat paling baru
        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (error) {
        console.error(error);
        if (document.getElementById(loadingId)) {
            document.getElementById(loadingId).remove();
        }
        alert("Koneksi terputus. Pastikan terminal backend kamu masih menyala, bro!");
    }
}