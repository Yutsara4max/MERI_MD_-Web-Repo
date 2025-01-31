const express = require('express');
const fs = require('fs');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function PrabathPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let PrabathPairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            PrabathPairWeb.ev.on('creds.update', saveCreds);
            PrabathPairWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                
                if (connection === "open") {
                    try {
                        await delay(5000);
                        const user_jid = jidNormalizedUser(PrabathPairWeb.user.id);

                        // Generate session & upload
                        const auth_path = './session/';
                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `PrabathMD.json`);
                        const sid = mega_url.replace('https://mega.nz/file/', '');

                        // Send session ID
                        await PrabathPairWeb.sendMessage(user_jid, { text: sid });

                        // Pairing Success Message & Image
                        const successMessage = `𝗠𝗘𝗥𝗜_𝗠𝗗 𝗣𝗔𝗜𝗥 𝗦𝗨𝗖𝗖𝗘𝗦𝗦 🔷\n\n\n𝗢𝗙𝗙𝗜𝗖𝗜𝗔𝗟 𝗖𝗛𝗔𝗡𝗘𝗟 | Follow the MERI_MD | Support Service  | 👩‍💻 channel on WhatsApp:\n\nhttps://whatsapp.com/channel/0029VawhJb77NoaADwKc7m0B\n\n𝗖𝗢𝗡𝗧𝗔𝗖𝗧 | +94771349020`;
                        const successImage = "https://i.ibb.co/jvmYRKwf/6564.jpg";

                        await PrabathPairWeb.sendMessage(user_jid, { text: successMessage });
                        await PrabathPairWeb.sendMessage(user_jid, {
                            image: { url: successImage },
                            caption: successMessage,
                        });

                    } catch (e) {
                        console.log("Error sending message:", e);
                    }

                    await delay(100);
                    removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log("Retrying connection...");
                    await delay(5000);
                    PrabathPair();
                }
            });

            if (!PrabathPairWeb.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await PrabathPairWeb.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

        } catch (err) {
            console.log("Error in pairing:", err);
            exec('pm2 restart prabath-md');
            removeFile('./session');
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }

    PrabathPair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception:', err);
    exec('pm2 restart prabath');
});

module.exports = router;
