# 🛡️ Freebot - Discord 복구봇

Discord 서버 복구봇입니다. 인증한 유저들을 DB에 저장하고 서버가 날아가도 복구 키로 전원 재초대할 수 있습니다.

## 기능

- 🔐 Discord OAuth2 인증 시스템
- 💾 서버별 Neon PostgreSQL DB에 유저 저장
- 🔄 3시간마다 토큰 자동 갱신 (영구 복구 가능)
- 🔑 1회용 복구 키 생성 및 사용
- 📊 인증 현황 실시간 확인

## 슬래시 명령어

| 명령어 | 설명 |
|--------|------|
| `/데이터베이스` | Neon DB URL 설정 |
| `/인증창` | 인증 역할 & 웹훅 설정 |
| `/정보수집` | 수집할 유저 정보 설정 |
| `/복구키생성` | 1회용 복구 키 생성 |
| `/복구키사용` | 복구 키로 유저 초대 |
| `/인증수` | 인증 현황 확인 |
| `/사용법` | 전체 가이드 |

## 환경변수 설정 (Render)

```
DISCORD_BOT_TOKEN=봇 토큰
DISCORD_CLIENT_ID=클라이언트 ID
DISCORD_CLIENT_SECRET=클라이언트 시크릿
AUTH_SITE_URL=https://your-app.onrender.com
SESSION_SECRET=랜덤 문자열
```

## Discord 개발자 포털 설정

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. 앱 선택 → OAuth2 → Redirects에 추가:
   ```
   https://your-app.onrender.com/callback
   ```
3. Bot → Privileged Gateway Intents:
   - ✅ Server Members Intent 활성화

## UptimeRobot 설정

URL: `https://your-app.onrender.com/health`  
간격: 5분

## 라이선스

MIT
