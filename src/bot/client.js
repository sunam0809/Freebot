const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

client.commands = new Collection();

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`[Bot] 명령어 로드: /${command.data.name}`);
    }
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Bot] 명령어 오류 (${interaction.commandName}):`, err);
    const msg = { content: '❌ 명령어 실행 중 오류가 발생했습니다.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.once(Events.ClientReady, (c) => {
  console.log(`[Bot] ${c.user.tag} 로그인 성공! (${c.guilds.cache.size}개 서버)`);
  c.user.setActivity('서버 복구 대기 중 🛡️', { type: 4 });
});

async function startBot() {
  loadCommands();
  await client.login(process.env.DISCORD_BOT_TOKEN);
  return client;
}

module.exports = { client, startBot };
