require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

  try {
    console.log(`[Deploy] ${commands.length}개 슬래시 명령어 등록 시작...`);

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );

    console.log('[Deploy] 슬래시 명령어 등록 완료!');
    commands.forEach(c => console.log(`  ✅ /${c.name}`));
  } catch (err) {
    console.error('[Deploy] 오류:', err);
  }
}

deployCommands();
