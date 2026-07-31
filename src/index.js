require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { startBot } = require('./bot/client');
const { startWebServer } = require('./web/server');
const { startTokenRefresh } = require('./shared/tokenRefresh');

async function main() {
  console.log('🛡️ 복구봇 시작 중...');

  // 웹 서버 먼저 시작 (UptimeRobot이 빠르게 접근할 수 있도록)
  await startWebServer();

  // Discord 봇 시작
  await startBot();

  // 슬래시 명령어 자동 등록
  try {
    const { REST, Routes } = require('discord.js');
    const fs = require('fs');
    const path = require('path');

    const commands = [];
    const commandsPath = path.join(__dirname, 'bot/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if (command.data) commands.push(command.data.toJSON());
    }

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log(`[Commands] ${commands.length}개 슬래시 명령어 등록 완료`);
  } catch (err) {
    console.error('[Commands] 명령어 등록 오류:', err.message);
  }

  // 토큰 자동 갱신 시작
  startTokenRefresh();

  console.log('✅ 복구봇이 성공적으로 시작되었습니다!');
}

main().catch(err => {
  console.error('❌ 시작 실패:', err);
  process.exit(1);
});
