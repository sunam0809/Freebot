const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { setGuildConfig, getGuildConfig } = require('../../shared/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('인증창')
    .setDescription('인증 후 받을 역할과 인증 로그 웹훅을 설정합니다 (서버 주인 전용)')
    .addRoleOption(opt =>
      opt.setName('역할')
        .setDescription('인증 완료 시 지급할 역할')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('웹훅')
        .setDescription('인증 로그를 받을 Discord 웹훅 URL')
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

    const role = interaction.options.getRole('역할');
    const webhookUrl = interaction.options.getString('웹훅');

    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
      return interaction.reply({ content: '❌ 올바른 Discord 웹훅 URL이 아닙니다.', ephemeral: true });
    }

    setGuildConfig(interaction.guildId, {
      authRoleId: role.id,
      webhookUrl: webhookUrl,
    });

    const authUrl = `${process.env.AUTH_SITE_URL}/auth?guild=${interaction.guildId}`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('✅ 인증창 설정 완료')
      .addFields(
        { name: '🎭 인증 역할', value: `${role}`, inline: true },
        { name: '📢 로그 웹훅', value: '설정 완료 ✓', inline: true },
        { name: '🔗 인증 링크', value: `[여기를 클릭하여 인증](${authUrl})\n\`${authUrl}\``, inline: false },
        { name: '⚠️ 중요', value: '봇의 역할이 인증 역할보다 **위에** 있어야 역할을 지급할 수 있습니다.\n`/사용법`에서 자세한 설정 방법을 확인하세요.', inline: false }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
