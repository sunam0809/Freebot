const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { setGuildConfig } = require('../../shared/guildConfig');
const { initGuildDb } = require('../../shared/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('데이터베이스')
    .setDescription('서버의 Neon DB URL을 설정합니다 (서버 주인 전용)')
    .addStringOption(opt =>
      opt.setName('url')
        .setDescription('Neon PostgreSQL 연결 URL (postgresql://...)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ 이 명령어는 **서버 주인**만 사용할 수 있습니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const url = interaction.options.getString('url');

    if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
      return interaction.editReply('❌ 올바른 PostgreSQL URL 형식이 아닙니다.\n형식: `postgresql://user:password@host/dbname`');
    }

    try {
      const result = await initGuildDb(url);
      if (!result.success) {
        return interaction.editReply(`❌ DB 연결 실패:\n\`\`\`${result.error}\`\`\``);
      }

      setGuildConfig(interaction.guildId, { neonDbUrl: url });

      const embed = new EmbedBuilder()
        .setColor(0x00FF7F)
        .setTitle('✅ 데이터베이스 설정 완료')
        .setDescription('Neon DB가 성공적으로 연결되었습니다!')
        .addFields(
          { name: '🗄️ DB 주소', value: `\`${url.slice(0, 40)}...\``, inline: false },
          { name: '📋 생성된 테이블', value: '• `authenticated_users` - 인증된 유저\n• `recovery_keys` - 복구 키\n• `guild_config` - 서버 설정', inline: false },
          { name: '💡 다음 단계', value: '`/인증창` 명령어로 인증 역할과 웹훅을 설정하세요.', inline: false }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(`❌ 오류 발생: \`${err.message}\``);
    }
  }
};
