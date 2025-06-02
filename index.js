require('dotenv').config();
const express = require('express');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
    const msg = req.body.message;
    const chatId = msg.chat.id;
    const text = msg.text;

    const actionPayload = await interpretMessageToPayload(text);

    try {
        const gscriptRes = await axios.post(GOOGLE_APPS_SCRIPT_URL, actionPayload);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: gscriptRes.data || "Berhasil",
        });
    } catch (err) {
        console.error("Error:", err.message);
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: "Terjadi kesalahan saat memproses.",
        });
    }

    res.sendStatus(200);
});

async function interpretMessageToPayload(text) {
    if (!text) return { action: "unknown" };

    const lowerText = text.toLowerCase();

    // Perintah eksplisit
    if (["menu", "lihat menu", "daftar menu"].includes(lowerText)) {
        return { action: "lihat_menu" };

    } else if (lowerText.startsWith("pesan ")) {
        // Contoh: pesan nastar 2
        const parts = text.split(" ");
        return {
            action: "buat_pesanan",
            nama_produk: parts[1],
            jumlah: parts[2] || 1
        };

    } else if (lowerText.startsWith("tanya ")) {
        // Kirim langsung ke Gemini endpoint
        return {
            action: "tanya_gemini",
            pertanyaan: text.substring(6).trim()
        };

    } else if (lowerText.startsWith("update ")) {
        const [, id, status] = text.split(" ");
        return {
            action: "update_status",
            id_pesanan: id,
            status: status
        };

    } else if (lowerText.startsWith("cek ")) {
        const [, id] = text.split(" ");
        return {
            action: "cek_status",
            id_pesanan: id
        };

    } else if (lowerText.startsWith("hapus ")) {
        const [, id] = text.split(" ");
        return {
            action: "hapus_pesanan",
            id_pesanan: id
        };
    }

    // Jika tidak dikenali, fallback ke Gemini untuk deteksi otomatis
    return {
        action: "tanya_gemini",
        pertanyaan: text.trim()
    };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
});
