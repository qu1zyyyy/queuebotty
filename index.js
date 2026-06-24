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
const REQUIRED_CONFIRMATIONS = 3;

let isNotified = false;
let confirmedOnline = false;
let onlineStreak = 0;
let offlineStreak = 0;
let sentMessages = []; // храним сообщения, которые отправили при онлайне, чтобы потом отредактировать

async function getServerStatus() {
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${SERVER_IP}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

function buildEmbed(online) {
    return new EmbedBuilder()
        .setTitle('👀 Сервер запущен!')
        .setColor(online ? 0x9B59B6 : 0x99AAB5)
        .setDescription(`Уведомляю! Давай заходи! 🚀\n\n**Статус:** ${online ? '🟢 Онлайн' : '🔴 Оффлайн'}`)
        .setFooter({ text: 'Queue Botty • Made With ❤️' })
        .setTimestamp();
}

function buildRow() {
    return new ActionRowBuilder().addComponents(
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

        // Подтверждённый переход в ОНЛАЙН
        if (!confirmedOnline && onlineStreak >= REQUIRED_CONFIRMATIONS) {
            confirmedOnline = true;

            if (!isNotified) {
                console.log('Сервер подтверждённо онлайн, готовим уведомление...');

                const embed = buildEmbed(true);
                const row = buildRow();

                sentMessages = []; // очищаем старые ссылки на сообщения перед новой партией

                const sendDM = async (userId) => {
                    try {
                        const user = await client.users.fetch(userId);
                        const msg = await user.send({ embeds: [embed], components: [row] });
                        sentMessages.push(msg); // сохраняем сообщение для будущего редактирования
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

        // Подтверждённый переход в ОФФЛАЙН
        if (confirmedOnline && offlineStreak >= REQUIRED_CONFIRMATIONS) {
            confirmedOnline = false;
            isNotified = false;
            console.log('Сервер подтверждённо оффлайн, обновляем сообщения...');

            const offlineEmbed = buildEmbed(false);

            for (const msg of sentMessages) {
                try {
                    await msg.edit({ embeds: [offlineEmbed], components: [buildRow()] });
                } catch (err) {
                    console.error('Не удалось отредактировать сообщение:', err.message);
                }
            }

            sentMessages = []; // очищаем, чтобы не редактировать их повторно при следующем цикле
        }

    } catch (e) {
        console.error('Ошибка при проверке сервера:', e.message);
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