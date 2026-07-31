const { Pool } = require('pg');

// 서버별 DB 연결 풀 캐시
const pools = {};

function getPool(neonDbUrl) {
  if (!pools[neonDbUrl]) {
    pools[neonDbUrl] = new Pool({
      connectionString: neonDbUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pools[neonDbUrl];
}

async function initGuildDb(neonDbUrl) {
  const pool = getPool(neonDbUrl);
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS authenticated_users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL UNIQUE,
        username VARCHAR(100),
        discriminator VARCHAR(10),
        avatar VARCHAR(100),
        email VARCHAR(200),
        ip_address VARCHAR(45),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at BIGINT NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        authenticated_at TIMESTAMP DEFAULT NOW(),
        last_refreshed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recovery_keys (
        id SERIAL PRIMARY KEY,
        key_value VARCHAR(64) NOT NULL UNIQUE,
        created_by VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        used_at TIMESTAMP,
        used_by VARCHAR(20)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS guild_config (
        guild_id VARCHAR(20) PRIMARY KEY,
        auth_role_id VARCHAR(20),
        webhook_url TEXT,
        collect_ip BOOLEAN DEFAULT false,
        collect_email BOOLEAN DEFAULT false,
        collect_username BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

async function upsertAuthUser(neonDbUrl, userData) {
  const pool = getPool(neonDbUrl);
  const {
    userId, username, discriminator, avatar, email,
    ipAddress, accessToken, refreshToken, tokenExpiresAt, guildId
  } = userData;

  await pool.query(`
    INSERT INTO authenticated_users
      (user_id, username, discriminator, avatar, email, ip_address,
       access_token, refresh_token, token_expires_at, guild_id, authenticated_at, last_refreshed_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      username = EXCLUDED.username,
      discriminator = EXCLUDED.discriminator,
      avatar = EXCLUDED.avatar,
      email = COALESCE(EXCLUDED.email, authenticated_users.email),
      ip_address = COALESCE(EXCLUDED.ip_address, authenticated_users.ip_address),
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      last_refreshed_at = NOW()
  `, [userId, username, discriminator, avatar, email, ipAddress,
      accessToken, refreshToken, tokenExpiresAt, guildId]);
}

async function getAllUsers(neonDbUrl) {
  const pool = getPool(neonDbUrl);
  const result = await pool.query(
    'SELECT * FROM authenticated_users ORDER BY authenticated_at DESC'
  );
  return result.rows;
}

async function getUserCount(neonDbUrl) {
  const pool = getPool(neonDbUrl);
  const result = await pool.query('SELECT COUNT(*) as count FROM authenticated_users');
  return parseInt(result.rows[0].count);
}

async function updateUserTokens(neonDbUrl, userId, accessToken, refreshToken, tokenExpiresAt) {
  const pool = getPool(neonDbUrl);
  await pool.query(`
    UPDATE authenticated_users
    SET access_token = $1, refresh_token = $2, token_expires_at = $3, last_refreshed_at = NOW()
    WHERE user_id = $4
  `, [accessToken, refreshToken, tokenExpiresAt, userId]);
}

async function createRecoveryKey(neonDbUrl, keyValue, createdBy, guildId) {
  const pool = getPool(neonDbUrl);
  await pool.query(`
    INSERT INTO recovery_keys (key_value, created_by, guild_id)
    VALUES ($1, $2, $3)
  `, [keyValue, createdBy, guildId]);
}

async function getRecoveryKey(neonDbUrl, keyValue) {
  const pool = getPool(neonDbUrl);
  const result = await pool.query(
    'SELECT * FROM recovery_keys WHERE key_value = $1',
    [keyValue]
  );
  return result.rows[0] || null;
}

async function markKeyUsed(neonDbUrl, keyValue, usedBy) {
  const pool = getPool(neonDbUrl);
  await pool.query(`
    UPDATE recovery_keys
    SET used = true, used_at = NOW(), used_by = $1
    WHERE key_value = $2
  `, [usedBy, keyValue]);
}

module.exports = {
  getPool, initGuildDb, upsertAuthUser, getAllUsers, getUserCount,
  updateUserTokens, createRecoveryKey, getRecoveryKey, markKeyUsed
};
