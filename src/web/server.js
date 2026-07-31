const express = require('express');
const session = require('express-session');
const path = require('path');
const authRouter = require('./routes/auth');

function createWebServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'freebot-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 10 * 60 * 1000 }
  }));

  // 헬스체크 (UptimeRobot용)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // OAuth2 인증 라우터
  app.use('/', authRouter);

  // 메인 페이지
  app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>복구봇 인증 시스템</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 50px;
      text-align: center;
      max-width: 500px;
    }
    .logo { font-size: 60px; margin-bottom: 20px; }
    h1 { font-size: 32px; font-weight: 700; margin-bottom: 10px; }
    p { color: rgba(255,255,255,0.7); margin-bottom: 30px; line-height: 1.6; }
    .badge {
      background: rgba(88,101,242,0.3);
      border: 1px solid #5865F2;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      color: #5865F2;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🛡️</div>
    <h1>복구봇</h1>
    <p>Discord 서버 복구 시스템입니다.<br>인증 링크는 서버 관리자에게 받으세요.</p>
    <div class="badge">✅ 서버 정상 운영 중</div>
  </div>
</body>
</html>
    `);
  });

  return app;
}

async function startWebServer() {
  const app = createWebServer();
  const PORT = process.env.PORT || 3000;

  return new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Web] 인증 서버가 포트 ${PORT}에서 실행 중입니다.`);
      resolve(app);
    });
  });
}

module.exports = { startWebServer };
