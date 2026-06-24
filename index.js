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
    res.end('Bot is running');
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

let isNotified = false;

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
            if (!isNotified) {
                console.log('Сервер онлайн, готовим уведомление...');

                const embed = new EmbedBuilder()
                    .setTitle('🟢 Сервер запущен!')
                    .setColor(0x57F287)
                    .setDescription('Уведомляю что сервер запущен! Приятной игры 🎮')
                    .setFooter({ text: 'Queue Botty • следит за сервером для тебя' })
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

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
        if (interaction.customId === 'get_ip') {
            await interaction.reply(`📋 IP сервера: \`${SERVER_IP}\``);
        }

        if (interaction.customId === 'get_players') {
            await interaction.deferReply();
            const data = await getServerStatus();

            if (!data.online) {
                await interaction.editReply('😴 Сервер сейчас оффлайн.');
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
    console.log(`Мониторим сервер: ${SERVER_IP}`);
    checkServer();
    setInterval(checkServer, 60000);
});

client.login(TOKEN);