const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.end('Bot is running');
}).listen(PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${PORT}`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const MY_ID = '917065909762416641';
const FRIEND_ID = '1239574407077171222';
const SERVER_IP = 'operation-jessica.gl.joinmc.link';

let isNotified = false;

async function checkServer() {
    try {
        console.log('Проверяем статус сервера...');

        const res = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_IP}`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        console.log(`Статус: ${data.online ? 'ОНЛАЙН' : 'ОФФЛАЙН'}`);

        if (data.online) {
            if (!isNotified) {
                console.log('Сервер онлайн, готовим уведомление...');

                const embed = new EmbedBuilder()
                    .setTitle('🚀 Сервер запущен!')
                    .setColor(0x00FF00)
                    .setDescription(`IP: \`${SERVER_IP}\`\nИгроков: ${data.players?.online ?? 0}/${data.players?.max ?? '?'}`)
                    .setTimestamp();

                const sendDM = async (userId) => {
                    try {
                        const user = await client.users.fetch(userId);
                        await user.send({ embeds: [embed] });
                        console.log(`Успешно отправлено пользователю: ${user.tag}`);
                    } catch (err) {
                        console.error('Ошибка при отправке ЛС:', err.message);
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
        console.error('Ошибка при проверке сервера:', e.message);
        isNotified = false;
    }
}

client.once('ready', () => {
    console.log(`Бот в сети: ${client.user.tag}`);
    console.log(`Мониторим сервер: ${SERVER_IP}`);
    checkServer();
    setInterval(checkServer, 60000);
});

client.login(TOKEN);