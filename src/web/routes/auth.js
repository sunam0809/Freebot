const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getGuildConfig } = require('../../shared/guildConfig');
const { upsertAuthUser } = require('../../shared/db');

const DISCORD_API = 'https://discord.com/api/v10';
const SCOPES = 'identify email guilds.join';

// 인증 시작 - 디스코드 OAuth2로 리다이렉트
router.get('/auth', (req, res) => {
  const { guild } = req.query;
  if (!guild) {
    return res.status(400).send(renderError('잘못된 인증 링크입니다. 서버 관리자에게 문의하세요.'));
  }

  const config = getGuildConfig(guild);
  if (!config || !config.neonDbUrl) {
    return res.status(400).send(renderError('이 서버는 아직 데이터베이스가 설정되지 않았습니다.'));
  }

  req.session.guildId = guild;
  req.session.userIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: `${process.env.AUTH_SITE_URL}/callback`,
    response_type: 'code',
    scope: SCOPES,
    state: guild,
    prompt: 'none',
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// OAuth2 콜백
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(renderError('인증을 취소했습니다.'));
  }

  if (!code || !state) {
    return res.status(400).send(renderError('잘못된 콜백입니다.'));
  }

  const guildId = state || req.session.guildId;
  if (!guildId) {
    return res.status(400).send(renderError('세션이 만료되었습니다. 다시 시도해주세요.'));
  }

  const config = getGuildConfig(guildId);
  if (!config || !config.neonDbUrl) {
    return res.status(400).send(renderError('서버 설정을 찾을 수 없습니다.'));
  }

  try {
    // 토큰 교환
    const tokenParams = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.AUTH_SITE_URL}/callback`,
    });

    const tokenRes = await axios.post(`${DISCORD_API}/oauth2/token`, tokenParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const tokenExpiresAt = Date.now() + expires_in * 1000;

    // 유저 정보 가져오기
    const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data;
    const userIp = req.session.userIp || req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

    // DB에 저장
    await upsertAuthUser(config.neonDbUrl, {
      userId: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar,
      email: config.collectEmail ? user.email : null,
      ipAddress: config.collectIp ? userIp : null,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt,
      guildId,
    });

    // 봇으로 서버에 유저 추가
    try {
      const addBody = { access_token };
      if (config.authRoleId) {
        addBody.roles = [config.authRoleId];
      }

      await axios.put(
        `${DISCORD_API}/guilds/${guildId}/members/${user.id}`,
        addBody,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }
      );
    } catch (addErr) {
      // 이미 서버에 있는 경우 역할만 추가
      if (addErr.response?.status === 204 || addErr.response?.status === 200) {
        // 정상
      } else if (config.authRoleId) {
        try {
          await axios.put(
            `${DISCORD_API}/guilds/${guildId}/members/${user.id}/roles/${config.authRoleId}`,
            {},
            {
              headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
            }
          );
        } catch (_) { /* ignore */ }
      }
    }

    // 웹훅 로그 전송
    if (config.webhookUrl) {
      const infoLines = [
        `👤 **${user.username}** (ID: ${user.id})`,
        config.collectEmail && user.email ? `📧 이메일: ${user.email}` : null,
        config.collectIp && userIp ? `🌐 IP: ${userIp}` : null,
        `📅 인증 시각: ${new Date().toLocaleString('ko-KR')}`,
      ].filter(Boolean).join('\n');

      await axios.post(config.webhookUrl, {
        embeds: [{
          title: '✅ 새로운 인증 완료',
          description: infoLines,
          color: 0x00FF7F,
          thumbnail: user.avatar
            ? { url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` }
            : undefined,
          timestamp: new Date().toISOString(),
        }]
      }).catch(() => {}); // 웹훅 실패 무시
    }

    return res.send(renderSuccess(user.username));

  } catch (err) {
    console.error('[Auth] 콜백 처리 오류:', err.response?.data || err.message);
    return res.status(500).send(renderError('인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.'));
  }
});

function renderSuccess(username) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>인증 완료!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .card {
      background: rgba(0,255,127,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(0,255,127,0.3);
      border-radius: 24px;
      padding: 60px 50px;
      text-align: center;
      max-width: 480px;
      box-shadow: 0 0 60px rgba(0,255,127,0.1);
    }
    .icon { font-size: 80px; margin-bottom: 24px; animation: bounce 0.6s ease; }
    @keyframes bounce {
      0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); }
    }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #00ff7f; }
    .username { font-size: 18px; color: rgba(255,255,255,0.7); margin-bottom: 30px; }
    .info {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>인증 완료!</h1>
    <div class="username">안녕하세요, <strong>${username}</strong>님!</div>
    <div class="info">
      🎉 서버 인증이 성공적으로 완료되었습니다.<br>
      역할이 자동으로 지급되었습니다.<br>
      이 창을 닫아도 됩니다.
    </div>
  </div>
</body>
</html>`;
}

function renderError(message) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>인증 오류</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .card {
      background: rgba(255,68,68,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,68,68,0.3);
      border-radius: 24px;
      padding: 60px 50px;
      text-align: center;
      max-width: 480px;
    }
    .icon { font-size: 80px; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 700; color: #ff4444; margin-bottom: 16px; }
    p { color: rgba(255,255,255,0.7); line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>인증 실패</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

module.exports = router;
