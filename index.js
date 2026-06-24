const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { status } = require('mcstatus');
const http = require('http');

// Настройка порта для Render (использует тот, что дает хостинг, или 3000 по умолчанию)
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.end('Bot is running');
}).listen(PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${PORT}`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// НАСТРОЙКИ
const TOKEN = process.env.DISCORD_TOKEN;
const MY_ID = '917065909762416641'; // Замени на свой ID
const FRIEND_ID = 'ID_ДРУГА'; // Замени на ID друга
const SERVER_IP = 'operation-jessica.gl.joinmc.link';

let isNotified = false;

client.once('ready', () => {
    console.log(`Бот в сети: ${client.user.tag}`);

    setInterval(async () => {
        try {
            const res = await status.java(SERVER_IP);

            if (res.online) {
                if (!isNotified) {
                    const playersList = res.players.list && res.players.list.length > 0
                        ? res.players.list.map(p => p.name_clean).join(', ')
                        : "Никого нет";

                    const embed = new EmbedBuilder()
                        .setTitle('🚀 Сервер запущен!')
                        .setColor(0x00FF00)
                        .setDescription(`Приятной игры! Скопируй IP ниже:`)
                        .addFields(
                            { name: 'IP адрес', value: `\`${SERVER_IP}\`` },
                            { name: `Игроки (${res.players.online}/${res.players.max})`, value: playersList }
                        )
                        .setTimestamp();

                    const sendDM = async (userId) => {
                        try {
                            const user = await client.users.fetch(userId);
                            console.log(`Попытка отправить ЛС пользователю: ${user.tag}`);
                            await user.send({ embeds: [embed] });
                            console.log(`Успешно отправлено пользователю: ${user.tag}`);
                        } catch (err) {
                            console.error(`Ошибка при отправке ЛС пользователю ${userId}:`, err);
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
            isNotified = false;
        }
    }, 30000);
});

client.login(TOKEN);