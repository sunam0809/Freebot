# 🛡️ Freebot - Discord 복구봇

Discord 서버 복구봇입니다. 인증한 유저들을 DB에 저장하고 서버가 날아가도 복구 키로 전원 재초대할 수 있습니다.

## 인증 사이트 URL
**https://freebot-9jo0.onrender.com**

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

## Discord 개발자 포털 필수 설정

1. https://discord.com/developers/applications 접속
2. 앱 선택 → **OAuth2** → **Redirects** 에 추가:
   ```
   https://freebot-9jo0.onrender.com/callback
   ```
3. **Bot** → **Privileged Gateway Intents**:
   - ✅ **Server Members Intent** 활성화

## 봇 초대 링크

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268436480&scope=bot%20applications.commands
```
`YOUR_CLIENT_ID` 자리에 실제 Client ID 입력

## UptimeRobot 설정

URL: `https://freebot-9jo0.onrender.com/health`  
간격: **5분**

## 라이선스

MIT
