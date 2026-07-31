const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'guilds.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 메모리 캐시 (재배포 후에도 env에서 복구됨)
let memoryCache = {};

// 시작 시 GUILD_DB_MAP 환경변수에서 로드
function loadFromEnv() {
  try {
    const envMap = process.env.GUILD_DB_MAP;
    if (envMap && envMap !== '{}') {
      const parsed = JSON.parse(envMap);
      memoryCache = { ...parsed };
      console.log(`[GuildConfig] 환경변수에서 ${Object.keys(parsed).length}개 서버 설정 복구 완료`);
    }
  } catch (e) {
    console.error('[GuildConfig] 환경변수 파싱 오류:', e.message);
  }
}

// 로컬 파일에서 로드
function loadFromFile() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

// 로컬 파일에 저장
function saveToFile(configs) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
  } catch (e) {
    console.error('[GuildConfig] 파일 저장 오류:', e.message);
  }
}

// Render 환경변수에 저장 (재배포 후에도 유지)
async function saveToRender(configs) {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!apiKey || !serviceId) return;

  try {
    // 현재 환경변수 목록 가져오기
    const listRes = await fetch(
      `https://api.render.com/v1/services/${serviceId}/env-vars`,
      { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } }
    );
    const envList = await listRes.json();

    // GUILD_DB_MAP만 업데이트
    const updated = Array.isArray(envList)
      ? envList.map(e =>
          e.envVar?.key === 'GUILD_DB_MAP'
            ? { key: 'GUILD_DB_MAP', value: JSON.stringify(configs) }
            : { key: e.envVar?.key, value: e.envVar?.value }
        )
      : [{ key: 'GUILD_DB_MAP', value: JSON.stringify(configs) }];

    // GUILD_DB_MAP이 목록에 없으면 추가
    if (!updated.find(e => e.key === 'GUILD_DB_MAP')) {
      updated.push({ key: 'GUILD_DB_MAP', value: JSON.stringify(configs) });
    }

    await fetch(
      `https://api.render.com/v1/services/${serviceId}/env-vars`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      }
    );
    console.log('[GuildConfig] Render 환경변수 저장 완료');
  } catch (e) {
    console.error('[GuildConfig] Render 저장 오류:', e.message);
  }
}

function getGuildConfig(guildId) {
  return memoryCache[guildId] || null;
}

async function setGuildConfig(guildId, data) {
  memoryCache[guildId] = { ...(memoryCache[guildId] || {}), ...data };

  // 로컬 파일 저장 (빠름)
  saveToFile(memoryCache);

  // Render 환경변수 저장 (재배포 후에도 살아남음)
  await saveToRender(memoryCache);

  return memoryCache[guildId];
}

function getAllGuildIds() {
  return Object.keys(memoryCache).filter(id => memoryCache[id].neonDbUrl);
}

// 초기화: 환경변수 → 파일 순으로 로드
function init() {
  loadFromEnv();
  // 파일에 추가 데이터 있으면 병합
  const fileData = loadFromFile();
  memoryCache = { ...fileData, ...memoryCache };
}

init();

module.exports = { getGuildConfig, setGuildConfig, getAllGuildIds };
