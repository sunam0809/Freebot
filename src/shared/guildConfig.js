const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'guilds.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfigs() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConfigs(configs) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
}

function getGuildConfig(guildId) {
  const configs = loadConfigs();
  return configs[guildId] || null;
}

function setGuildConfig(guildId, data) {
  const configs = loadConfigs();
  configs[guildId] = { ...(configs[guildId] || {}), ...data };
  saveConfigs(configs);
  return configs[guildId];
}

function getAllGuildIds() {
  const configs = loadConfigs();
  return Object.keys(configs).filter(id => configs[id].neonDbUrl);
}

module.exports = { getGuildConfig, setGuildConfig, getAllGuildIds };
