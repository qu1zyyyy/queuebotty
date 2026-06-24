const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const fs = require('fs');
const http = require('http');
const { status } = require('mcstatus');

// --- НАСТРОЙКИ ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Вставь токен сюда
const MC_CONFIG = {
    ip: 'localhost',
    port: 25565,
    adminIds: ['ID_ДРУГА_1', 'ID_ДРУГА_2'] // ID сюда
};
let isMcOnline = false;

// Поддержание активности (для хостингов)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive!');
});
server.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const DATA_FILE = './config.json';
function loadConfig() { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) : {}; }
function saveConfig(cfg) { fs.writeFileSync(DATA_FILE, JSON.stringify(cfg, null, 4)); }

client.once('clientReady', async () => {
    console.log(`Бот ${client.user.tag} запущен и готов к работе!`);

    // Регистрация команд
    const setup = new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Створити панель збору')
        .addChannelOption(o => o.setName('target').setDescription('Ігровий войс').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .addIntegerOption(o => o.setName('limit').setDescription('Ліміт (мінімально 2)').setRequired(false));

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: [setup.toJSON()] });

    // --- МОНИТОРИНГ СЕРВЕРА ---
    setInterval(async () => {
        try {
            const result = await status('java', MC_CONFIG.ip, { port: MC_CONFIG.port });

            if (result.online && !isMcOnline) {
                isMcOnline = true;
                const playersList = result.players.list ? result.players.list.map(p => p.name_clean).join(', ') : 'Никого нет';
                const msg = `🟢 **Сервер запущен!**\nИгроки онлайн: ${playersList}`;

                for (const id of MC_CONFIG.adminIds) {
                    const user = await client.users.fetch(id).catch(() => null);
                    if (user) await user.send(msg).catch(() => {});
                }
            } else if (!result.online) {
                isMcOnline = false;
            }
        } catch (err) {
            isMcOnline = false;
        }
    }, 60000);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const config = loadConfig();
    const isLocked = Object.values(config).some(s => s.target === newState.channelId);
    if (isLocked && newState.member && !newState.member.user.bot) {
        await newState.disconnect().catch(() => {});
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand() && i.commandName === 'setup') {
        await i.deferReply({ ephemeral: true });
        const config = loadConfig();
        const target = i.options.getChannel('target');
        const limit = i.options.getInteger('limit') || 2;
        const msg = await i.channel.send({
            embeds: [new EmbedBuilder().setTitle('Збір паті').setDescription(`Куди: <#${target.id}>\nЗібрано: 0 / ${limit}`).setColor('#2f3136')],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('join').setLabel('Зайняти 🛡️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('leave').setLabel('Вийти ❌').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('close').setLabel('Закрити 🔒').setStyle(ButtonStyle.Secondary)
            )]
        });
        config[msg.id] = { target: target.id, limit, players: [] };
        saveConfig(config);
        await i.deleteReply();
    }

    if (i.isButton()) {
        const config = loadConfig();
        if (!config[i.message.id]) return;
        await i.deferUpdate().catch(() => {});
        const s = config[i.message.id];

        if (i.customId === 'join' && !s.players.includes(i.user.id)) s.players.push(i.user.id);
        if (i.customId === 'leave') s.players = s.players.filter(id => id !== i.user.id);
        if (i.customId === 'close') { await i.message.delete().catch(() => {}); delete config[i.message.id]; saveConfig(config); return; }

        if (s.players.length >= s.limit) {
            await i.message.edit({ embeds: [new EmbedBuilder().setTitle('🚀 Паті зібрано!').setColor('#00ff00')], components: [] });
            await i.channel.send(`🔥 **Готово!** ${s.players.map(id => `<@${id}>`).join(', ')}\n👉 **Заходьте у войс:** <#${s.target}>`);
            for (const id of s.players) {
                const member = await i.guild.members.fetch(id).catch(() => null);
                if (member && member.voice.channelId) await member.voice.setChannel(s.target).catch(() => {});
            }
            delete config[i.message.id];
        } else {
            await i.message.edit({
                embeds: [new EmbedBuilder().setTitle('Збір паті').setDescription(`Куди: <#${s.target}>\nЗібрано: ${s.players.length} / ${s.limit}\n\n${s.players.map(id => `<@${id}>`).join('\n')}`).setColor('#2f3136')],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('join').setLabel('Зайняти 🛡️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('leave').setLabel('Вийти ❌').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('close').setLabel('Закрити 🔒').setStyle(ButtonStyle.Secondary)
                )]
            });
        }
        saveConfig(config);
    }
});

client.login(DISCORD_TOKEN);