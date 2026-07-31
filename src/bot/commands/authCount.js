const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../shared/guildConfig');
const { getUserCount, getAllUsers } = require('../../shared/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('인증수')
    .setDescription('인증된 유저 수와 복구 가능한 인원을 확인합니다 (서버 주인 전용)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ 이 명령어는 **서버 주인**만 사용할 수 있습니다.', ephemeral: true });
    }

    const config = getGuildConfig(interaction.guildId);
    if (!config || !config.neonDbUrl) {
      return interaction.reply({
        content: '❌ 먼저 `/데이터베이스` 명령어로 Neon DB URL을 설정해주세요.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const users = await getAllUsers(config.neonDbUrl);
      const totalCount = users.length;
      const now = Date.now();

      // 토큰이 유효한 유저 (만료 안 됨)
      const validTokenCount = users.filter(u => u.token_expires_at > now).length;

      // 최근 30일 이내 인증
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentCount = users.filter(u => new Date(u.authenticated_at) > thirtyDaysAgo).length;

      // 가장 최근 인증 유저
      const latestUser = users[0];

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 인증 현황')
        .setDescription(`**${interaction.guild.name}** 서버의 인증 데이터 현황`)
        .addFields(
          { name: '👥 총 인증 인원', value: `**${totalCount}명**`, inline: true },
          { name: '✅ 복구 가능 인원', value: `**${validTokenCount}명**`, inline: true },
          { name: '📅 최근 30일 인증', value: `**${recentCount}명**`, inline: true },
          {
            name: '🔄 토큰 갱신',
            value: `유효 토큰: **${validTokenCount}/${totalCount}명**\n(3시간마다 자동 갱신됨)`,
            inline: false
          },
          {
            name: '👤 최근 인증 유저',
            value: latestUser
              ? `**${latestUser.username}** (${new Date(latestUser.authenticated_at).toLocaleString('ko-KR')})`
              : '없음',
            inline: false
          }
        )
        .setFooter({ text: '3시간마다 토큰이 자동 갱신되어 복구 가능 인원이 유지됩니다.' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(`❌ 오류 발생: \`${err.message}\``);
    }
  }
};
