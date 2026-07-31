const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { setGuildConfig, getGuildConfig } = require('../../shared/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('정보수집')
    .setDescription('인증 로그에 기록할 유저 정보를 설정합니다 (서버 주인 전용)')
    .addBooleanOption(opt =>
      opt.setName('아이피')
        .setDescription('유저의 IP 주소를 수집합니다')
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('이메일')
        .setDescription('유저의 이메일 주소를 수집합니다 (Discord 계정의 이메일)')
        .setRequired(true)
    )
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

    const collectIp = interaction.options.getBoolean('아이피');
    const collectEmail = interaction.options.getBoolean('이메일');

    setGuildConfig(interaction.guildId, {
      collectIp,
      collectEmail,
    });

    const embed = new EmbedBuilder()
      .setColor(0xFF9900)
      .setTitle('✅ 정보 수집 설정 완료')
      .setDescription('인증 로그에 기록될 유저 정보 설정이 업데이트되었습니다.')
      .addFields(
        { name: '👤 기본 정보', value: '✅ 항상 수집\n• 유저명 (username)\n• 디스코드 태그\n• 유저 ID', inline: true },
        { name: '🌐 IP 주소', value: collectIp ? '✅ 수집함' : '❌ 수집 안 함', inline: true },
        { name: '📧 이메일', value: collectEmail ? '✅ 수집함' : '❌ 수집 안 함', inline: true },
        {
          name: '⚠️ 법적 안내',
          value: '수집된 정보는 서버 관리 목적으로만 사용하세요.\n개인정보 수집 시 반드시 유저에게 고지하시기 바랍니다.',
          inline: false
        }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
