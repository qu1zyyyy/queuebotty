const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { status } = require('mcstatus');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// НАСТРОЙКИ
const TOKEN = process.env.DISCORD_TOKEN;
const MY_ID = '917065909762416641';
const FRIEND_ID = '1239574407077171222';
const SERVER_IP = 'operation-jessica.gl.joinmc.link';

let isNotified = false;

client.once('ready', () => {
    console.log(`Бот в сети: ${client.user.tag}`);

    setInterval(async () => {
        try {
            const res = await status.java(SERVER_IP);

            if (res.online) {
                if (!isNotified) {
                    // Формируем список игроков
                    const playersList = res.players.list && res.players.list.length > 0
                        ? res.players.list.map(p => p.name_clean).join(', ')
                        : "Никого нет";

                    // Создаем красивое сообщение
                    const embed = new EmbedBuilder()
                        .setTitle('🚀 Уведомляю что сервер запущен!')
                        .setColor(0x00FF00)
                        .setDescription(`Приятной игры! Скопировать IP:`)
                        .addFields(
                            { name: 'IP адрес', value: `\`${SERVER_IP}\`` },
                            { name: `Игроки онлайн (${res.players.online}/${res.players.max})`, value: playersList }
                        )
                        .setTimestamp();

                    // Функция для отправки в ЛС
                    const sendDM = async (userId) => {
                        try {
                            const user = await client.users.fetch(userId);
                            await user.send({ embeds: [embed] });
                        } catch (err) {
                            console.error(`Ошибка при отправке сообщения пользователю ${userId}:`, err);
                        }
                    };

                    // Отправляем обоим
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
    }, 30000); // Проверка каждые 30 секунд
});

client.login(TOKEN);