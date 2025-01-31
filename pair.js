const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;
  async function PrabathPair() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
      let PrabathPairWeb = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!PrabathPairWeb.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await PrabathPairWeb.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      PrabathPairWeb.ev.on("creds.update", saveCreds);
      PrabathPairWeb.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
          try {
            await delay(10000);
            const sessionPrabath = fs.readFileSync("./session/creds.json");

            const auth_path = "./session/";
            const user_jid = jidNormalizedUser(PrabathPairWeb.user.id);

            function randomMegaId(length = 6, numberLength = 4) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(
                  Math.floor(Math.random() * characters.length)
                );
              }
              const number = Math.floor(
                Math.random() * Math.pow(10, numberLength)
              );
              return `${result}${number}`;
            }

            const mega_url = await upload(
              fs.createReadStream(auth_path + "creds.json"),
              `${randomMegaId()}.json`
            );

            const string_session = mega_url.replace(
              "https://mega.nz/file/",
              ""
            );

            const sid = `*📌 ඔබේ ප්රභාත් MD Session ID 👉 ${string_session} 👈*\n\n✅ *ප්රභාත් MD Pairing සාර්ථකයි!* 🎉\n\n🔗 *වෙරළබඳව WhatsApp channel එකට සම්බන්ධ වන්න:*\n\nhttps://whatsapp.com/channel/0029VawhJb77NoaADwKc7m0B\n\n📞 *සම්බන්ධ විය යුතුද?* +94771349020`;
            const mg = `🛑 *මෙම Code එක කිසිවෙකුට ලබා නොදෙන්න!* 🛑\n\n⚠️ *පෞද්ගලිකයි!*`;
            
            await PrabathPairWeb.sendMessage(user_jid, {
              image: { url: "https://i.ibb.co/jvmYRKwf/6564.jpg" },
              caption: sid,
            });
            await PrabathPairWeb.sendMessage(user_jid, { text: string_session });
            await PrabathPairWeb.sendMessage(user_jid, { text: mg });
          } catch (e) {
            exec("pm2 restart Prabath-md");
          }

          await delay(100);
          return await removeFile("./session");
        } else if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode !== 401
        ) {
          await delay(10000);
          PrabathPair();
        }
      });
    } catch (err) {
      exec("pm2 restart Prabath-md");
      console.log("Service Restarted");
      PrabathPair();
      await removeFile("./session");
      if (!res.headersSent) {
        await res.send({ code: "Service Unavailable" });
      }
    }
  }
  return await PrabathPair();
});

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart Prabath-md");
});

module.exports = router;
