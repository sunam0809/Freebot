const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../shared/guildConfig');
const { createRecoveryKey, getUserCount } = require('../../shared/db');
const { randomBytes } = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('복구키생성')
    .setDescription('1회용 서버 복구 키를 생성합니다 (서버 주인 전용)')
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
      const key = randomBytes(16).toString('hex').toUpperCase();
      const formattedKey = `${key.slice(0,4)}-${key.slice(4,8)}-${key.slice(8,12)}-${key.slice(12,16)}-${key.slice(16,20)}-${key.slice(20,24)}-${key.slice(24,28)}-${key.slice(28,32)}`;

      await createRecoveryKey(config.neonDbUrl, formattedKey, interaction.user.id, interaction.guildId);

      const userCount = await getUserCount(config.neonDbUrl);

      const embed = new EmbedBuilder()
        .setColor(0xFF4444)
        .setTitle('🔑 복구 키 생성 완료')
        .setDescription('⚠️ **이 키는 절대로 타인에게 공유하지 마세요!**\n이 키로 모든 인증 유저를 다른 서버로 초대할 수 있습니다.')
        .addFields(
          {
            name: '🔐 복구 키 (클릭하여 복사)',
            value: `\`\`\`${formattedKey}\`\`\``,
            inline: false
          },
          {
            name: '👥 복구 가능한 인원',
            value: `현재 **${userCount}명** 복구 가능`,
            inline: true
          },
          {
            name: '🔄 사용 횟수',
            value: '**1회용** (한 번 사용하면 무효화)',
            inline: true
          },
          {
            name: '📋 사용 방법',
            value: '복구할 서버에서 `/복구키사용 키:위의키` 를 입력하세요.',
            inline: false
          }
        )
        .setFooter({ text: `생성자: ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(`❌ 키 생성 실패: \`${err.message}\``);
    }
  }
};
