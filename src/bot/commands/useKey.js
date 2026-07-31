const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../shared/guildConfig');
const { getRecoveryKey, markKeyUsed, getAllUsers, getUserCount } = require('../../shared/db');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('복구키사용')
    .setDescription('복구 키를 사용하여 인증된 유저들을 이 서버로 초대합니다 (서버 주인 전용)')
    .addStringOption(opt =>
      opt.setName('키')
        .setDescription('복구 키 값')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('원본서버db')
        .setDescription('복구할 유저들이 있는 원본 서버의 Neon DB URL')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ 이 명령어는 **서버 주인**만 사용할 수 있습니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const keyValue = interaction.options.getString('키').trim().toUpperCase();
    const sourceDbUrl = interaction.options.getString('원본서버db');

    try {
      // 키 확인
      const key = await getRecoveryKey(sourceDbUrl, keyValue);

      if (!key) {
        return interaction.editReply('❌ 존재하지 않는 복구 키입니다.');
      }

      if (key.used) {
        const usedAt = new Date(key.used_at).toLocaleString('ko-KR');
        return interaction.editReply(`❌ 이미 사용된 키입니다.\n사용 시간: ${usedAt}`);
      }

      // 키 사용 처리
      await markKeyUsed(sourceDbUrl, keyValue, interaction.user.id);

      // 유저 목록 가져오기
      const users = await getAllUsers(sourceDbUrl);
      const totalUsers = users.length;

      if (totalUsers === 0) {
        return interaction.editReply('❌ 복구할 유저가 없습니다.');
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle('🔄 복구 진행 중...')
        .setDescription(`총 **${totalUsers}명**의 유저를 초대하고 있습니다.\n완료까지 잠시 기다려주세요...`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      let success = 0;
      let failed = 0;

      // 봇 토큰으로 길드에 유저 추가
      for (const user of users) {
        try {
          await axios.put(
            `https://discord.com/api/v10/guilds/${interaction.guildId}/members/${user.user_id}`,
            {
              access_token: user.access_token,
            },
            {
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
              }
            }
          );
          success++;
        } catch (err) {
          if (err.response?.status === 429) {
            // 레이트 리밋 - 대기 후 재시도
            const retryAfter = (err.response.headers['retry-after'] || 1) * 1000;
            await new Promise(r => setTimeout(r, retryAfter));
            try {
              await axios.put(
                `https://discord.com/api/v10/guilds/${interaction.guildId}/members/${user.user_id}`,
                { access_token: user.access_token },
                {
                  headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                  }
                }
              );
              success++;
            } catch {
              failed++;
            }
          } else {
            failed++;
          }
        }

        // 레이트 리밋 방지: 500ms 간격
        await new Promise(r => setTimeout(r, 500));
      }

      const resultEmbed = new EmbedBuilder()
        .setColor(failed === 0 ? 0x00FF7F : 0xFF9900)
        .setTitle('✅ 복구 완료!')
        .addFields(
          { name: '총 대상', value: `${totalUsers}명`, inline: true },
          { name: '✅ 성공', value: `${success}명`, inline: true },
          { name: '❌ 실패', value: `${failed}명`, inline: true },
          {
            name: '💡 실패 원인',
            failed > 0
              ? { value: '토큰 만료, 서버 차단, 또는 이미 서버 내 존재', inline: false }
              : { value: '없음', inline: false }
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [resultEmbed] });

    } catch (err) {
      return interaction.editReply(`❌ 오류 발생: \`${err.message}\``);
    }
  }
};
