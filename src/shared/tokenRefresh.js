const axios = require('axios');
const cron = require('node-cron');
const { getAllGuildIds, getGuildConfig } = require('./guildConfig');
const { getAllUsers, updateUserTokens } = require('./db');

async function refreshToken(refreshToken) {
  try {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await axios.post('https://discord.com/api/oauth2/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: Date.now() + response.data.expires_in * 1000,
    };
  } catch (err) {
    return null;
  }
}

async function refreshAllTokens() {
  console.log('[TokenRefresh] 토큰 갱신 시작...');
  const guildIds = getAllGuildIds();

  for (const guildId of guildIds) {
    const config = getGuildConfig(guildId);
    if (!config || !config.neonDbUrl) continue;

    try {
      const { getAllUsers: getUsers, updateUserTokens: updateTokens } = require('./db');
      const users = await getUsers(config.neonDbUrl);
      let refreshed = 0;
      let failed = 0;

      for (const user of users) {
        // 만료 1시간 전이거나 이미 만료된 경우 갱신
        const shouldRefresh = Date.now() > (user.token_expires_at - 3600000);

        if (shouldRefresh) {
          const newTokens = await refreshToken(user.refresh_token);
          if (newTokens) {
            await updateTokens(
              config.neonDbUrl,
              user.user_id,
              newTokens.accessToken,
              newTokens.refreshToken,
              newTokens.expiresAt
            );
            refreshed++;
          } else {
            failed++;
          }
          // 레이트 리밋 방지: 요청 간 300ms 대기
          await new Promise(r => setTimeout(r, 300));
        }
      }

      console.log(`[TokenRefresh] 서버 ${guildId}: 갱신 ${refreshed}명, 실패 ${failed}명`);
    } catch (err) {
      console.error(`[TokenRefresh] 서버 ${guildId} 오류:`, err.message);
    }
  }

  console.log('[TokenRefresh] 토큰 갱신 완료');
}

function startTokenRefresh() {
  // 3시간마다 실행
  cron.schedule('0 */3 * * *', refreshAllTokens);
  console.log('[TokenRefresh] 3시간마다 토큰 자동 갱신이 설정되었습니다.');

  // 시작 시 5분 후 첫 번째 갱신
  setTimeout(refreshAllTokens, 5 * 60 * 1000);
}

module.exports = { startTokenRefresh, refreshAllTokens, refreshToken };
