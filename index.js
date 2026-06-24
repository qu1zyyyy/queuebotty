const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { status } = require('mcstatus');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.end('Bot is running');
}).listen(PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${PORT}`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const TOKEN = process.env.DISCORD_TOKEN;
const MY_ID = '917065909762416641';
const FRIEND_ID = '1239574407077171222'; // <--- ВАЖНО: Если тут текст, бот будет выдавать ошибку!
const SERVER_IP = 'operation-jessica.gl.joinmc.link';

let isNotified = false;

client.once('ready', () => {
    console.log(`Бот в сети: ${client.user.tag}`);
    console.log(`Мониторим сервер: ${SERVER_IP}`);
});

setInterval(async () => {
    try {
        console.log(`Проверяем статус сервера...`);
        const res = await status.java(SERVER_IP);
        console.log(`Статус: ${res.online ? 'ОНЛАЙН' : 'ОФФЛАЙН'}`);

        if (res.online) {
            if (!isNotified) {
                console.log("Сервер онлайн, готовим уведомление...");

                const embed = new EmbedBuilder()
                    .setTitle('🚀 Сервер запущен!')
                    .setColor(0x00FF00)
                    .setDescription(`IP: \`${SERVER_IP}\``)
                    .setTimestamp();

                const sendDM = async (userId) => {
                    if (!userId || userId === 'ID_ДРУГА') return; // Проверка, чтобы не слать на текст
                    try {
                        const user = await client.users.fetch(userId);
                        await user.send({ embeds: [embed] });
                        console.log(`Успешно отправлено пользователю: ${user.tag}`);
                    } catch (err) {
                        console.error(`Ошибка при отправке ЛС:`, err);
                    }
                };

                await sendDM(MY_ID);
                await sendDM(FRIEND_ID);

                isNotified = true;
            }
        } else {
            isNotified = false;
        }
    } catch (e) {
        console.error("Ошибка при проверке сервера:", e.message);
        isNotified = false;
    }
}, 60000); // Увеличил до 60 секунд, чтобы Render не ругался

client.login(TOKEN);