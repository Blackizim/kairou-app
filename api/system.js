// Vercel Serverless / Local Node API: /api/system
// Manages global system settings across all clients (maintenance mode, announcement, spotlight)
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.resolve(process.cwd(), 'system_settings.json');

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[API system] Erro ao ler system_settings.json:', e.message);
  }
  return {
    maintenance: false,
    announcement: null,
    spotlight: null,
    blockedIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function writeSettings(newSettings) {
  try {
    let settingsObj = newSettings;
    if (typeof settingsObj === 'string') {
      try {
        settingsObj = JSON.parse(settingsObj);
      } catch {
        settingsObj = {};
      }
    }
    if (typeof settingsObj !== 'object' || settingsObj === null || Array.isArray(settingsObj)) {
      settingsObj = {};
    }

    const current = readSettings();
    // Limpar quaisquer chaves espúrias
    const cleanCurrent = {
      maintenance: false,
      announcement: null,
      spotlight: null,
      blockedIds: [],
    };
    for (const [k, v] of Object.entries(current)) {
      if (isNaN(Number(k))) {
        cleanCurrent[k] = v;
      }
    }

    const updated = {
      ...cleanCurrent,
      ...settingsObj,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (e) {
    console.error('[API system] Erro ao gravar system_settings.json:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};

  // GET: Obter status global do sistema
  if (req.method === 'GET') {
    // Atalho query params: ?set_maintenance=true|false
    if (query.set_maintenance !== undefined) {
      const enabled = query.set_maintenance === 'true' || query.set_maintenance === '1';
      const updated = writeSettings({ maintenance: enabled });
      return res.status(200).json({ ok: true, settings: updated });
    }

    const settings = readSettings();
    return res.status(200).json({ ok: true, settings });
  }

  // POST: Atualizar configurações
  if (req.method === 'POST') {
    const body = req.body || {};
    const updated = writeSettings(body);
    if (!updated) {
      return res.status(500).json({ ok: false, error: 'Falha ao salvar configurações do sistema' });
    }
    return res.status(200).json({ ok: true, settings: updated });
  }

  return res.status(405).json({ ok: false, error: 'Método não suportado' });
}
