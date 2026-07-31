const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('사용법')
    .setDescription('복구봇 전체 설정 방법을 안내합니다'),

  async execute(interaction) {
    const embed1 = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📖 복구봇 사용법 - 1단계: 초기 설정')
      .setDescription('서버 복구봇을 올바르게 사용하기 위한 단계별 가이드입니다.')
      .addFields(
        {
          name: '⚠️ 필수! 봇 역할 위치 설정',
          value: [
            '1. 서버 설정 → 역할 탭으로 이동',
            '2. **봇 역할(Freebot)** 을 드래그하여 **인증 역할보다 위로** 이동',
            '3. 봇 역할이 인증 역할보다 아래에 있으면 역할 지급 불가',
            '',
            '```',
            '📌 역할 순서 예시:',
            '──────────────',
            '🤖 Freebot        ← 봇 역할 (이게 위에 있어야 함)',
            '✅ 인증됨          ← 인증 후 받는 역할',
            '👤 일반 멤버',
            '```'
          ].join('\n'),
          inline: false
        },
        {
          name: '🔧 1단계: Neon DB 연결',
          value: [
            '`/데이터베이스 url:[Neon DB URL]`',
            '',
            '• [neon.tech](https://neon.tech) 에서 무료 계정 생성',
            '• 새 프로젝트 생성 → Connection string 복사',
            '• 형식: `postgresql://user:pass@host/dbname`'
          ].join('\n'),
          inline: false
        },
        {
          name: '🎭 2단계: 인증창 설정',
          value: [
            '`/인증창 역할:[역할] 웹훅:[웹훅 URL]`',
            '',
            '• 역할: 인증 완료 시 자동으로 지급될 역할 선택',
            '• 웹훅: 인증 로그 받을 채널 → 채널 편집 → 연동 → 웹훅 생성'
          ].join('\n'),
          inline: false
        }
      )
      .setTimestamp();

    const embed2 = new EmbedBuilder()
      .setColor(0x00FF7F)
      .setTitle('📖 복구봇 사용법 - 2단계: 운영')
      .addFields(
        {
          name: '📊 3단계: 정보 수집 설정 (선택)',
          value: [
            '`/정보수집 아이피:[true/false] 이메일:[true/false]`',
            '',
            '• 인증 로그에 기록할 정보를 선택',
            '• 기본 정보(유저명, ID)는 항상 수집됨',
            '• IP/이메일은 선택적으로 수집 가능'
          ].join('\n'),
          inline: false
        },
        {
          name: '🔑 4단계: 복구 키 생성',
          value: [
            '`/복구키생성`',
            '',
            '• **1회용** 복구 키 생성',
            '• 키는 반드시 안전한 곳에 보관',
            '• 타인에게 절대 공유 금지',
            '• 키 사용 시 모든 인증 유저가 현재 서버로 초대됨'
          ].join('\n'),
          inline: false
        },
        {
          name: '🔄 5단계: 복구 사용 (서버 날아갔을 때)',
          value: [
            '새 서버에서: `/복구키사용 키:[복구키] 원본서버db:[DB URL]`',
            '',
            '• 복구 키와 원본 서버 DB URL을 입력',
            '• 봇이 자동으로 모든 인증 유저를 현재 서버로 초대',
            '• 1회 사용 후 키 자동 무효화'
          ].join('\n'),
          inline: false
        },
        {
          name: '🔗 인증 링크 배포',
          value: [
            `• 인증 링크: \`${process.env.AUTH_SITE_URL || 'https://your-app.onrender.com'}/auth?guild=서버ID\``,
            '• `/인증창` 명령어 실행 시 인증 링크가 자동 생성됨',
            '• 이 링크를 공지 채널에 고정하여 멤버들이 인증하도록 안내'
          ].join('\n'),
          inline: false
        }
      )
      .setTimestamp();

    const embed3 = new EmbedBuilder()
      .setColor(0xFF9900)
      .setTitle('📖 복구봇 사용법 - 전체 명령어')
      .addFields(
        {
          name: '📌 전체 명령어 목록',
          value: [
            '`/데이터베이스` — Neon DB URL 설정',
            '`/인증창` — 인증 역할 & 웹훅 설정',
            '`/정보수집` — 수집할 유저 정보 설정',
            '`/복구키생성` — 1회용 복구 키 생성',
            '`/복구키사용` — 복구 키로 유저 초대',
            '`/인증수` — 인증 현황 확인',
            '`/사용법` — 이 가이드'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: '모든 명령어는 서버 주인만 사용 가능합니다.' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed1, embed2, embed3], ephemeral: true });
  }
};
