const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.end('Бот - запущен');
}).listen(PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${PORT}`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

const TOKEN = process.env.DISCORD_TOKEN;
const MY_ID = '917065909762416641';
const FRIEND_ID = '1239574407077171222';
const SERVER_IP = 'operation-jessica.gl.joinmc.link';
const CHECK_INTERVAL = 10000;
const REQUIRED_CONFIRMATIONS = 3; // сколько проверок подряд нужно для подтверждения смены статуса

let isNotified = false;     // было ли уже отправлено уведомление о текущем "онлайн"-периоде
let confirmedOnline = false; // текущий подтверждённый статус (после дебаунса)
let onlineStreak = 0;       // счётчик подряд идущих "онлайн" ответов
let offlineStreak = 0;      // счётчик подряд идущих "оффлайн" ответов

async function getServerStatus() {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_IP}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function checkServer() {
    try {
        console.log('Проверяем статус сервера...');
        const data = await getServerStatus();
        console.log(`Статус: ${data.online ? 'ОНЛАЙН' : 'ОФФЛАЙН'}`);

        if (data.online) {
            onlineStreak++;
            offlineStreak = 0;
        } else {
            offlineStreak++;
            onlineStreak = 0;
        }

        // Подтверждаем переход в ОНЛАЙН только после нескольких подряд успешных ответов
        if (!confirmedOnline && onlineStreak >= REQUIRED_CONFIRMATIONS) {
            confirmedOnline = true;

            if (!isNotified) {
                console.log('Сервер подтверждённо онлайн, готовим уведомление...');

                const embed = new EmbedBuilder()
                    .setTitle('👀 Сервер запущен!')
                    .setColor(0x9B59B6)
                    .setDescription('Уведомляю! Давай заходи! 🚀\n\n**Статус:** 🟢 Онлайн')
                    .setFooter({ text: 'Queue Botty • Made With ❤️' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('get_ip')
                        .setLabel('Узнать IP')
                        .setEmoji('📋')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('get_players')
                        .setLabel('Список игроков')
                        .setEmoji('👥')
                        .setStyle(ButtonStyle.Secondary)
                );

                const sendDM = async (userId) => {
                    try {
                        const user = await client.users.fetch(userId);
                        await user.send({ embeds: [embed], components: [row] });
                        console.log(`О, я отправил сообщение пользователью: ${user.tag}`);
                    } catch (err) {
                        console.error('Я не смог отправить сообщение:', err.message);
                    }
                };

                await sendDM(MY_ID);
                await sendDM(FRIEND_ID);

                isNotified = true;
            }
        }

        // Подтверждаем переход в ОФФЛАЙН только после нескольких подряд неудачных ответов
        if (confirmedOnline && offlineStreak >= REQUIRED_CONFIRMATIONS) {
            confirmedOnline = false;
            isNotified = false; // сбрасываем, чтобы при следующем реальном запуске снова уведомило
            console.log('Сервер подтверждённо оффлайн.');
        }

    } catch (e) {
        console.error('Ошибка при проверке сервера:', e.message);
        // Ошибку API не считаем подтверждением оффлайна — просто пропускаем тик,
        // чтобы временный сбой сети не сбрасывал статус
    }
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
        if (interaction.customId === 'get_ip') {
            await interaction.reply({
                content: `📋 IP сервера: \`${SERVER_IP}\``,
                ephemeral: true
            });
        }

        if (interaction.customId === 'get_players') {
            await interaction.deferReply({ ephemeral: true });
            const data = await getServerStatus();

            if (!data.online) {
                await interaction.editReply('😴 Сервер на данный момент оффлайн.');
                return;
            }

            const online = data.players?.online ?? 0;
            const max = data.players?.max ?? '?';
            const names = data.players?.list?.map(p => p.name_clean || p.name).join(', ');

            let text = `👥 Онлайн: **${online}/${max}**`;
            if (names) text += `\nИгроки: ${names}`;

            await interaction.editReply(text);
        }
    } catch (err) {
        console.error('Ошибка при обработке кнопки:', err.message);
    }
});

client.once('ready', () => {
    console.log(`Бот в сети: ${client.user.tag}`);
    console.log(`Мониторью сервер: ${SERVER_IP}`);
    checkServer();
    setInterval(checkServer, CHECK_INTERVAL);
});

client.login(TOKEN);