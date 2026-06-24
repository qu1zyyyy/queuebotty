const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { status } = require('mcstatus');
const http = require('http');

// Создаем HTTP-сервер для Render, чтобы он не выключал бота
http.createServer((req, res) => {
    res.write('Bot is running');
    res.end();
}).listen(3000);

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
                            await user.send({ embeds: [embed] });
                        } catch (err) {
                            console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, err);
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