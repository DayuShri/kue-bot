require('dotenv').config();
const express = require('express');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
    const msg = req.body.message;
    const chatId = msg.chat.id;
    const text = msg.text;

    const actionPayload = await interpretMessageToPayload(text);

    try {
        let replyText = "Berhasil";

        if (actionPayload.action === "tanya_gemini") {
            const geminiRes = await axios.post(GEMINI_API_URL, {
                contents: [{ parts: [{ text: actionPayload.pertanyaan }] }]
            });
            replyText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, tidak ada jawaban dari Gemini.";
        } else {
            const gscriptRes = await axios.post(GOOGLE_APPS_SCRIPT_URL, actionPayload);
            replyText = gscriptRes.data || "Berhasil";
        }

        await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: replyText,
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
if (
    ["menu", "lihat menu", "daftar menu"].includes(lowerText) ||
    lowerText.includes("lihat produk") ||
    lowerText.includes("daftar kue") ||
    lowerText.includes("mau lihat")
) {
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
