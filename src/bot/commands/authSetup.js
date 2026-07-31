const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { setGuildConfig, getGuildConfig } = require('../../shared/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('인증창')
    .setDescription('인증 버튼 패널을 이 채널에 생성합니다 (서버 주인 전용)')
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
      return interaction.reply({
        content: '❌ 이 명령어는 **서버 주인**만 사용할 수 있습니다.',
        ephemeral: true,
      });
    }

    const config = getGuildConfig(interaction.guildId);
    if (!config || !config.neonDbUrl) {
      return interaction.reply({
        content: '❌ 먼저 `/데이터베이스` 명령어로 Neon DB URL을 설정해주세요.',
        ephemeral: true,
      });
    }

    const role = interaction.options.getRole('역할');
    const webhookUrl = interaction.options.getString('웹훅');

    if (
      !webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')
    ) {
      return interaction.reply({
        content: '❌ 올바른 Discord 웹훅 URL이 아닙니다.',
        ephemeral: true,
      });
    }

    setGuildConfig(interaction.guildId, {
      authRoleId: role.id,
      webhookUrl,
    });

    const authUrl = `${process.env.AUTH_SITE_URL}/auth?guild=${interaction.guildId}`;

    // 유저들에게 보이는 인증 패널 임베드
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔐 서버 인증')
      .setDescription(
        '이 서버에 입장하려면 아래 버튼을 눌러 인증을 완료해주세요.\n\n' +
        '인증하면 **서버 멤버** 역할이 자동으로 지급됩니다.'
      )
      .addFields(
        { name: '✅ 인증 역할', value: `${role}`, inline: true },
        { name: '⏱️ 소요 시간', value: '약 10초', inline: true }
      )
      .setFooter({ text: '버튼을 눌러 Discord 계정으로 안전하게 인증하세요.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🔐 인증하기')
        .setStyle(ButtonStyle.Link)
        .setURL(authUrl)
    );

    // 현재 채널에 공개 인증 패널 전송
    await interaction.channel.send({ embeds: [embed], components: [row] });

    // 설정 완료 알림 (본인만 보임)
    return interaction.reply({
      content: '✅ 인증 패널이 이 채널에 생성되었습니다!',
      ephemeral: true,
    });
  },
};
