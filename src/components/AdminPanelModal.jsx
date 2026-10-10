import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  Activity,
  BarChart3,
  Radio,
  Server,
  Trash2,
  Star,
  AlertTriangle,
  RefreshCw,
  Check,
  Megaphone,
  Eye,
  Sliders,
  ExternalLink,
  Flame,
  Clock,
  Sparkles,
  Search,
  Lock,
  Zap,
  Smartphone,
  Tv,
  Play,
  Heart,
  FileText,
  Download,
  Upload,
  Settings,
  HelpCircle,
  Copy,
  Plus,
  Compass,
  Monitor,
  Volume2,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getTrafficMetrics,
  getChartData,
  getRealtimeDevicesList,
  getGlobalAnnouncement,
  saveGlobalAnnouncement,
  testServerLatency,
  getAdminSpotlight,
  saveAdminSpotlight,
  getBlockedTmdbIds,
  toggleBlockTmdbId,
  getMaintenanceMode,
  setMaintenanceMode,
  getPlayerPreferences,
  savePlayerPreferences,
  getCustomChannels,
  addCustomChannel,
  removeCustomChannel,
  getPixSettings,
  savePixSettings,
  getBrokenStreamsLog,
  resolveBrokenStream,
  clearBrokenStreamsLog,
  getMonetizationStatus,
  exportAdminBackup,
  importAdminBackup,
  ADMIN_EMAIL,
} from '../services/adminAnalytics';
import { clearStreamCache, getStreamCacheSize, extractAllServers } from '../services/extractor';
import { searchTMDB } from '../services/tmdb';

export default function AdminPanelModal({ isOpen, onClose, user, showToast, onPreviewMaintenance }) {
  // Navegação por Categoria e Ferramenta
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // 1. Métricas & Audiência
  const [metrics, setMetrics] = useState(getTrafficMetrics());
  const [chartPeriod, setChartPeriod] = useState('24h');
  const [chartData, setChartData] = useState(() => getChartData('24h'));
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [devicesList, setDevicesList] = useState(() => getRealtimeDevicesList());

  // 2. Servidores & Diagnóstico
  const [testingServers, setTestingServers] = useState(false);
  const [serverList, setServerList] = useState([
    { id: 'frost', name: 'FrostStream (Stremio)', url: 'https://froststream.cloutteam.com', status: 'online', latency: 48 },
    { id: 'zeus', name: 'Zeus (BeamUp)', url: 'https://398fe185fed6-zeus.baby-beamup.club', status: 'online', latency: 62 },
    { id: 'fenix', name: 'FenixFlix (Stremio)', url: 'https://fenixflix.fenixhub.online', status: 'online', latency: 85 },
    { id: 'mgeb', name: 'MegaEmbed Player', url: 'https://mgeb.top', status: 'online', latency: 74 },
    { id: 'proxy', name: 'Turbo Proxy Local', url: '/api/proxy', status: 'online', latency: 5 },
    { id: 'channels', name: 'API Interna de Canais', url: '/api/channels', status: 'online', latency: 12 },
  ]);

  // 3. Cache
  const [cacheSize, setCacheSize] = useState(() => getStreamCacheSize());
  const [lastPurged, setLastPurged] = useState(null);

  // 4. Testador de TMDB / Debugger
  const [debugTmdbId, setDebugTmdbId] = useState('550');
  const [debugType, setDebugType] = useState('movie');
  const [debugSeason, setDebugSeason] = useState('1');
  const [debugEpisode, setDebugEpisode] = useState('1');
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugResults, setDebugResults] = useState(null);

  // 5. Configurações do Player
  const [playerPrefs, setPlayerPrefs] = useState(() => getPlayerPreferences());

  // 6. Destaque Hero
  const [spotlightTitle, setSpotlightTitle] = useState('');
  const [spotlightBackdrop, setSpotlightBackdrop] = useState('');
  const [spotlightOverview, setSpotlightOverview] = useState('');
  const [spotlightTmdbId, setSpotlightTmdbId] = useState('');
  const [spotlightType, setSpotlightType] = useState('movie');
  const [currentSpotlight, setCurrentSpotlight] = useState(() => getAdminSpotlight());

  // 7. Canais IPTV Customizados
  const [customChannels, setCustomChannels] = useState(() => getCustomChannels());
  const [newChanName, setNewChanName] = useState('');
  const [newChanCategory, setNewChanCategory] = useState('Esportes');
  const [newChanLogo, setNewChanLogo] = useState('');
  const [newChanUrl, setNewChanUrl] = useState('');

  // 8. Explorador Rápido TMDB
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);

  // 9. Chamados / Erros de Streams
  const [brokenStreams, setBrokenStreams] = useState(() => getBrokenStreamsLog());

  // 10. Aviso Global
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementBadge, setAnnouncementBadge] = useState('Novidade');
  const [announcementType, setAnnouncementType] = useState('green');
  const [announcementLink, setAnnouncementLink] = useState('');

  // 11. Regras de Monetização & Telegram (Imutáveis)
  const [monetizationInfo] = useState(() => getMonetizationStatus());

  // 12. Meta Pix
  const [pixSettings, setPixSettings] = useState(() => getPixSettings());

  // 13. Moderação & Manutenção
  const [isMaintenance, setIsMaintenance] = useState(() => getMaintenanceMode());
  const [blockTmdbInput, setBlockTmdbInput] = useState('');
  const [blockTitleInput, setBlockTitleInput] = useState('');
  const [blockedList, setBlockedList] = useState(() => getBlockedTmdbIds());

  // 14. Backup JSON
  const [backupJsonText, setBackupJsonText] = useState('');
  const fileInputRef = useRef(null);

  // Carregamento e sincronização em tempo real
  useEffect(() => {
    if (!isOpen) return;

    setMetrics(getTrafficMetrics());
    setChartData(getChartData(chartPeriod));
    setCacheSize(getStreamCacheSize());
    setDevicesList(getRealtimeDevicesList());

    const handlePresence = (e) => {
      if (e.detail?.online) {
        setMetrics((prev) => ({ ...prev, onlineNow: e.detail.online }));
        if (e.detail.devices) setDevicesList(e.detail.devices);
      }
    };

    const handleVisits = () => {
      setMetrics(getTrafficMetrics());
      setChartData(getChartData(chartPeriod));
    };

    window.addEventListener('kairou_presence_updated', handlePresence);
    window.addEventListener('kairou_visits_updated', handleVisits);

    const timer = setInterval(() => {
      setMetrics(getTrafficMetrics());
      setCacheSize(getStreamCacheSize());
      setDevicesList(getRealtimeDevicesList());
    }, 4000);

    // Carrega dados persistidos
    const ann = getGlobalAnnouncement();
    if (ann) {
      setAnnouncementActive(ann.active || false);
      setAnnouncementText(ann.text || '');
      setAnnouncementBadge(ann.badge || 'Novidade');
      setAnnouncementType(ann.type || 'green');
      setAnnouncementLink(ann.link || '');
    }

    const spot = getAdminSpotlight();
    if (spot) {
      setCurrentSpotlight(spot);
      setSpotlightTitle(spot.title || '');
      setSpotlightBackdrop(spot.backdrop || '');
      setSpotlightOverview(spot.overview || '');
      setSpotlightTmdbId(spot.id || '');
      setSpotlightType(spot.type || 'movie');
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('kairou_presence_updated', handlePresence);
      window.removeEventListener('kairou_visits_updated', handleVisits);
    };
  }, [isOpen, chartPeriod]);

  // ==========================================
  // HANDLERS DAS FERRAMENTAS
  // ==========================================
  const handleTestServers = async () => {
    setTestingServers(true);
    const updated = await Promise.all(
      serverList.map(async (s) => {
        const result = await testServerLatency(s.url, s.name);
        return { ...s, status: result.status, latency: result.latency || 999 };
      })
    );
    setServerList(updated);
    setTestingServers(false);
    showToast?.('Diagnóstico concluído!');
  };

  const handlePurgeCache = () => {
    clearStreamCache();
    setCacheSize(0);
    setLastPurged(new Date().toLocaleTimeString('pt-BR'));
    showToast?.('Cache de streams purgado! Próximas reproduções serão recarregadas.');
  };

  const handleRunDebugger = async () => {
    if (!debugTmdbId.trim()) return;
    setDebugLoading(true);
    setDebugResults(null);
    try {
      const res = await extractAllServers({
        tmdbId: debugTmdbId.trim(),
        type: debugType,
        season: parseInt(debugSeason, 10) || 1,
        episode: parseInt(debugEpisode, 10) || 1,
        onProgress: () => {},
      });
      setDebugResults(res || []);
      showToast?.(`Extração finalizada: ${res?.length || 0} streams encontradas!`);
    } catch (e) {
      setDebugResults([]);
      showToast?.(`Erro na extração: ${e.message}`);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleSavePlayerPrefs = () => {
    savePlayerPreferences(playerPrefs);
    showToast?.('Preferências do Player salvas!');
  };

  const handleSaveSpotlight = () => {
    if (!spotlightTitle.trim() || !spotlightBackdrop.trim()) {
      showToast?.('Preencha título e imagem de fundo.');
      return;
    }
    const spotObj = {
      id: spotlightTmdbId.trim() || String(Date.now()),
      title: spotlightTitle.trim(),
      backdrop: spotlightBackdrop.trim(),
      overview: spotlightOverview.trim() || 'Destaque especial da administração Cinetuga.',
      type: spotlightType,
      vote_average: 9.9,
      media_type: spotlightType === 'series' ? 'tv' : 'movie',
    };
    saveAdminSpotlight(spotObj);
    setCurrentSpotlight(spotObj);
    showToast?.('Destaque fixado na capa do site!');
  };

  const handleRemoveSpotlight = () => {
    saveAdminSpotlight(null);
    setCurrentSpotlight(null);
    setSpotlightTitle('');
    setSpotlightBackdrop('');
    setSpotlightOverview('');
    setSpotlightTmdbId('');
    showToast?.('Destaque removido.');
  };

  const handleAddCustomChannel = (e) => {
    e.preventDefault();
    if (!newChanName.trim() || !newChanUrl.trim()) return;
    const updated = addCustomChannel({
      name: newChanName,
      category: newChanCategory,
      logo: newChanLogo,
      url: newChanUrl,
    });
    setCustomChannels(updated);
    setNewChanName('');
    setNewChanUrl('');
    setNewChanLogo('');
    showToast?.('Canal adicionado com sucesso!');
  };

  const handleRemoveCustomChannel = (id) => {
    const updated = removeCustomChannel(id);
    setCustomChannels(updated);
    showToast?.('Canal removido.');
  };

  const handleTmdbSearch = async (e) => {
    e.preventDefault();
    if (!tmdbSearchQuery.trim()) return;
    setTmdbSearching(true);
    try {
      const res = await searchTMDB(tmdbSearchQuery.trim());
      setTmdbSearchResults(res || []);
    } catch {
      setTmdbSearchResults([]);
    } finally {
      setTmdbSearching(false);
    }
  };

  const handleSaveAnnouncement = () => {
    saveGlobalAnnouncement({
      active: announcementActive,
      text: announcementText.trim(),
      badge: announcementBadge.trim(),
      type: announcementType,
      link: announcementLink.trim(),
    });
    showToast?.('Aviso global atualizado!');
  };



  const handleSavePix = () => {
    savePixSettings(pixSettings);
    showToast?.('Configurações e Metas Pix salvas!');
  };

  const handleToggleMaintenance = () => {
    const next = !isMaintenance;
    setIsMaintenance(next);
    setMaintenanceMode(next);
    showToast?.(next ? 'Modo Manutenção ATIVADO!' : 'Modo Manutenção DESATIVADO.');
  };

  const handleBlockTitle = (e) => {
    e.preventDefault();
    if (!blockTmdbInput.trim()) return;
    const updated = toggleBlockTmdbId(blockTmdbInput.trim(), blockTitleInput.trim());
    setBlockedList(updated);
    setBlockTmdbInput('');
    setBlockTitleInput('');
    showToast?.('Título bloqueado do catálogo!');
  };

  const handleExportBackup = () => {
    const jsonStr = exportAdminBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kairou_admin_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast?.('Backup exportado com sucesso!');
  };

  const handleImportBackup = () => {
    if (!backupJsonText.trim()) return;
    const res = importAdminBackup(backupJsonText.trim());
    if (res.success) {
      showToast?.('Backup restaurado com sucesso! Atualizando painel...');
      setTimeout(() => window.location.reload(), 1200);
    } else {
      showToast?.(`Erro ao restaurar: ${res.error}`);
    }
  };

  // Cálculo SVG do gráfico
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const chartHeight = 160;
  const chartWidth = 560;
  const paddingX = 20;
  const paddingY = 20;

  const points = chartData.map((d, i) => {
    const x = paddingX + (i / Math.max(1, chartData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.value / maxValue) * (chartHeight - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${
    chartHeight - paddingY
  } Z`;

  // Menu de Ferramentas Organizadas em Grupos
  const TOOL_CATEGORIES = [
    {
      group: 'Métricas & Audiência',
      items: [
        { id: 'overview', label: 'Audiência & Gráfico', icon: BarChart3, badge: 'Realtime' },
        { id: 'devices', label: 'Dispositivos Conectados', icon: Smartphone, badge: metrics.onlineNow },
      ],
    },
    {
      group: 'Servidores & Streaming',
      items: [
        { id: 'servers', label: 'Diagnóstico de Servidores', icon: Server },
        { id: 'cache', label: 'Memória & Cache', icon: Trash2, count: cacheSize },
        { id: 'extractor_debug', label: 'Testador de TMDB / Debug', icon: Play, highlight: true },
        { id: 'player_settings', label: 'Configurações do Player', icon: SlidersHorizontal },
      ],
    },
    {
      group: 'Catálogo & Conteúdo',
      items: [
        { id: 'spotlight', label: 'Destaque Hero (Capa)', icon: Star, active: Boolean(currentSpotlight) },
        { id: 'channels_mgr', label: 'Canais IPTV Customizados', icon: Tv, count: customChannels.length },
        { id: 'tmdb_explorer', label: 'Explorador Rápido TMDB', icon: Search },
        { id: 'broken_streams', label: 'Chamados & Erros', icon: AlertCircle, count: brokenStreams.filter(b => !b.resolved).length },
      ],
    },
    {
      group: 'Comunicação & Metas',
      items: [
        { id: 'announcement', label: 'Aviso Global (Banner)', icon: Megaphone, active: announcementActive },
        { id: 'monetization', label: 'Anúncios & Telegram (Obrigatórios)', icon: ShieldCheck, badge: 'Imutável' },
        { id: 'pix', label: 'Meta de Doações Pix', icon: Heart },
      ],
    },
    {
      group: 'Segurança & Sistema',
      items: [
        { id: 'moderation', label: 'Moderação & Manutenção', icon: Sliders, active: isMaintenance },
        { id: 'backup', label: 'Backup & Restauração JSON', icon: Download },
      ],
    },
  ];

  // Filtro de busca na sidebar
  const filteredCategories = useMemo(() => {
    if (!sidebarSearch.trim()) return TOOL_CATEGORIES;
    const term = sidebarSearch.toLowerCase();
    return TOOL_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.label.toLowerCase().includes(term)),
    })).filter((cat) => cat.items.length > 0);
  }, [sidebarSearch]);

  if (!isOpen) return null;

  // Verificação de segurança: Apenas shizuu122@gmail.com
  const userEmail = user?.email?.toLowerCase() || '';
  if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none">
        <div className="relative w-full max-w-md bg-[#0f141e] border border-rose-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Lock size={24} />
          </div>
          <h3 className="text-lg font-bold text-white">Acesso Restrito</h3>
          <p className="text-xs text-slate-400">
            Este painel administrativo é restrito exclusivamente ao e-mail <strong>{ADMIN_EMAIL}</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-6xl h-[92vh] max-h-[900px] bg-[#07090e] border border-white/[0.12] rounded-3xl shadow-2xl z-10 animate-scale-in flex flex-col overflow-hidden">
        {/* Barra Superior Master */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-[#0d121f]/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <ShieldCheck size={22} className="text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Painel Administrativo Cinetuga
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                  Admin Master
                </span>
                <span className="hidden sm:flex px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Realtime Ativo (100% Real)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logado: <span className="text-sky-400 font-mono font-medium">{ADMIN_EMAIL}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            aria-label="Fechar Painel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo Principal: Sidebar + Conteúdo */}
        <div className="flex-1 flex overflow-hidden">
          {/* ============================================================== */}
          {/* SIDEBAR ORGANIZADA POR CATEGORIAS                             */}
          {/* ============================================================== */}
          <aside className="w-64 sm:w-72 bg-[#090d16] border-r border-slate-800/80 flex flex-col shrink-0">
            {/* Campo de Busca Rápida na Sidebar */}
            <div className="p-3 border-b border-slate-800/60">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar 15 ferramentas..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>
            </div>

            {/* Lista com Rolagem das Categorias */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar text-xs font-medium">
              {filteredCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {cat.group}
                  </h4>
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 text-white border border-sky-500/40 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            size={16}
                            className={isSelected ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                          {item.count !== undefined && item.count > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                              {item.count}
                            </span>
                          )}
                          {item.active && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Rodapé da Sidebar: Status do Túnel */}
            <div className="p-3 border-t border-slate-800/80 bg-[#070a10] text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Domínio cinetuga.vip
              </span>
              <span className="font-mono text-emerald-400 font-bold">Online</span>
            </div>
          </aside>

          {/* ============================================================== */}
          {/* ÁREA DE CONTEÚDO PRINCIPAL                                     */}
          {/* ============================================================== */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-7 custom-scrollbar bg-[#0a0e17]">
            {/* 1. AUDIÊNCIA & GRÁFICO REAL */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* 4 Cards Principais */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[#101726] to-[#0d131f] border border-emerald-500/25 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Online Agora
                      </span>
                      <Radio size={16} className="text-emerald-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {metrics.onlineNow}
                    </div>
                    <p className="text-[11px] text-emerald-400 mt-1 font-semibold">100% Realtime WebSocket</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-[#101726] to-[#0d131f] border border-sky-500/25 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                        Visitantes Hoje
                      </span>
                      <Users size={16} className="text-sky-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {metrics.today.toLocaleString('pt-BR')}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Registros reais salvos</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-[#101726] to-[#0d131f] border border-purple-500/25 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                        Esta Semana
                      </span>
                      <Activity size={16} className="text-purple-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {metrics.thisWeek.toLocaleString('pt-BR')}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Últimos 7 dias</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#101726] to-[#0d131f] border border-amber-500/25 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Este Mês (30D)
                      </span>
                      <Sparkles size={16} className="text-amber-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {metrics.thisMonth.toLocaleString('pt-BR')}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Acessos acumulados</p>
                  </div>
                </div>

                {/* Gráfico Real */}
                <div className="p-5 sm:p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart3 size={16} className="text-sky-400" />
                        Distribuição Real de Acessos
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Histórico exato gravado na plataforma</p>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/[0.06] text-xs">
                      {[
                        { id: '24h', label: 'Hoje (Horas)' },
                        { id: '7d', label: '7 Dias' },
                        { id: '30d', label: '30 Dias' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setChartPeriod(p.id)}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                            chartPeriod === p.id
                              ? 'bg-sky-400 text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative w-full overflow-hidden pt-4 pb-2">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 sm:h-56 overflow-visible">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                          <stop offset="60%" stopColor="#818cf8" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#0f1422" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="50%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                      </defs>

                      {[0.25, 0.5, 0.75].map((ratio) => {
                        const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
                        return (
                          <line
                            key={ratio}
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="#1e293b"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                        );
                      })}

                      <path d={areaD} fill="url(#chartGradient)" />
                      <path d={pathD} fill="none" stroke="url(#strokeGradient)" strokeWidth="3.5" strokeLinecap="round" />

                      {points.map((p, i) => (
                        <g key={i} className="cursor-pointer">
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={p.data.active ? 5 : 3.5}
                            className={`${
                              p.data.active ? 'fill-emerald-400 stroke-white' : 'fill-sky-400 stroke-[#0f1422]'
                            } transition-transform hover:scale-150`}
                            strokeWidth="2"
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}
                    </svg>

                    {hoveredPoint && (
                      <div
                        className="absolute pointer-events-none -top-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-sky-400/40 text-xs shadow-xl text-white font-mono flex items-center gap-2 transform -translate-x-1/2"
                        style={{ left: `${(hoveredPoint.x / chartWidth) * 100}%` }}
                      >
                        <span className="text-slate-400">{hoveredPoint.data.label}:</span>
                        <span className="text-sky-300 font-bold">{hoveredPoint.data.value} acessos</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1 px-2">
                      <span>{chartData[0]?.label}</span>
                      <span>{chartData[Math.floor(chartData.length / 2)]?.label}</span>
                      <span>{chartData[chartData.length - 1]?.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DISPOSITIVOS ONLINE (NOVO) */}
            {activeTab === 'devices' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Smartphone size={18} className="text-emerald-400" />
                      Dispositivos Conectados via WebSocket (Supabase Realtime)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Lista de cada celular, computador ou Smart TV atualmente com o Cinetuga aberto.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    {devicesList.length} Ativo(s)
                  </span>
                </div>

                <div className="space-y-2.5">
                  {devicesList.map((dev, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400 shrink-0">
                          {dev.os === 'Android' || dev.os === 'iOS' ? <Smartphone size={18} /> : <Monitor size={18} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{dev.user}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-normal">
                              {dev.os} · {dev.browser}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {dev.id}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Ao Vivo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. TESTADOR DE TMDB / DEBUG DE STREAMS (NOVO) */}
            {activeTab === 'extractor_debug' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Play size={18} className="text-sky-400" />
                    Testador e Inspecionador de Streams ao Vivo (Debug TMDB)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Digite qualquer ID do TMDB para rodar a raspagem em tempo real e ver todos os links de vídeo diretos extraídos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">TMDB ID</label>
                    <input
                      type="text"
                      value={debugTmdbId}
                      onChange={(e) => setDebugTmdbId(e.target.value)}
                      placeholder="Ex: 550"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
                    <select
                      value={debugType}
                      onChange={(e) => setDebugType(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    >
                      <option value="movie">Filme</option>
                      <option value="series">Série / Anime</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Temporada</label>
                    <input
                      type="number"
                      value={debugSeason}
                      onChange={(e) => setDebugSeason(e.target.value)}
                      disabled={debugType === 'movie'}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Episódio</label>
                    <input
                      type="number"
                      value={debugEpisode}
                      onChange={(e) => setDebugEpisode(e.target.value)}
                      disabled={debugType === 'movie'}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white disabled:opacity-40"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunDebugger}
                  disabled={debugLoading}
                  className="w-full py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={15} className={debugLoading ? 'animate-spin' : ''} />
                  <span>{debugLoading ? 'Extraindo Servidores (5s)...' : 'Executar Teste de Extração'}</span>
                </button>

                {debugResults && (
                  <div className="space-y-3 mt-4">
                    <h4 className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Resultado da Raspagem ({debugResults.length} servidores encontrados):</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Status 200 OK</span>
                    </h4>

                    <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                      {debugResults.map((s, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{s.providerName || s.server}</span>
                            <span className="px-2 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono">
                              {s.quality || 'HD'} · {s.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{s.url}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              Testar Link Direto <ExternalLink size={11} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. CONFIGURAÇÕES DO PLAYER (NOVO) */}
            {activeTab === 'player_settings' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-purple-400" />
                    Preferências Padrão do Player de Vídeo
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defina o comportamento inicial do reprodutor para todos os visitantes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Áudio Padrão Preferido</label>
                      <select
                        value={playerPrefs.defaultAudio}
                        onChange={(e) => setPlayerPrefs({ ...playerPrefs, defaultAudio: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      >
                        <option value="dublado">Priorizar Áudio Dublado (Português)</option>
                        <option value="legendado">Priorizar Áudio Original (Legendado)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Resolução Inicial Padrão</label>
                      <select
                        value={playerPrefs.defaultQuality}
                        onChange={(e) => setPlayerPrefs({ ...playerPrefs, defaultQuality: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      >
                        <option value="1080p">1080p Full HD (Máxima)</option>
                        <option value="720p">720p HD (Equilibrada)</option>
                        <option value="auto">Automática (Adapta à internet)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={playerPrefs.autoSkipIntro}
                        onChange={(e) => setPlayerPrefs({ ...playerPrefs, autoSkipIntro: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-400 focus:ring-0"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">Botão de Pular Abertura Inteligente</p>
                        <p className="text-[11px] text-slate-400">Exibe o botão de pular 85s em animes e séries</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={playerPrefs.autoNextEp}
                        onChange={(e) => setPlayerPrefs({ ...playerPrefs, autoNextEp: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-400 focus:ring-0"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">Autoplay do Próximo Episódio</p>
                        <p className="text-[11px] text-slate-400">Carrega o próximo episódio automaticamente ao final do vídeo</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleSavePlayerPrefs}
                    className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Salvar Configurações do Player</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. GERENCIADOR DE CANAIS IPTV (NOVO) */}
            {activeTab === 'channels_mgr' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Tv size={18} className="text-teal-400" />
                    Gerenciador de Canais de TV Ao Vivo (IPTV M3U8)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adicione canais personalizados ao vivo (.m3u8) para aparecerem na grade de Canais.
                  </p>
                </div>

                <form onSubmit={handleAddCustomChannel} className="space-y-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <h4 className="text-xs font-bold text-white">+ Adicionar Novo Canal</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nome do Canal (ex: Premiere 1 HD)"
                      value={newChanName}
                      onChange={(e) => setNewChanName(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                    <select
                      value={newChanCategory}
                      onChange={(e) => setNewChanCategory(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    >
                      <option value="Esportes">Esportes</option>
                      <option value="Canais Abertos">Canais Abertos</option>
                      <option value="Filmes & Séries">Filmes & Séries</option>
                      <option value="Notícias">Notícias</option>
                      <option value="Infantil">Infantil</option>
                    </select>
                    <input
                      type="url"
                      placeholder="URL do Logo (opcional)"
                      value={newChanLogo}
                      onChange={(e) => setNewChanLogo(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="URL do Stream HLS (.m3u8)"
                    value={newChanUrl}
                    onChange={(e) => setNewChanUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Salvar Canal na Grade
                  </button>
                </form>

                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-bold text-white">Canais Customizados Adicionados ({customChannels.length})</h4>
                  {customChannels.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">Nenhum canal personalizado adicionado ainda.</p>
                  ) : (
                    customChannels.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white">{c.name}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-teal-500/20 text-teal-300">{c.category}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveCustomChannel(c.id)}
                          className="text-rose-400 hover:text-rose-300 text-[11px]"
                        >
                          Excluir
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 6. EXPLORADOR RÁPIDO TMDB (NOVO) */}
            {activeTab === 'tmdb_explorer' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Compass size={18} className="text-sky-400" />
                    Explorador Rápido do TMDB (Metadados & IDs)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Busque qualquer filme ou anime para copiar o TMDB ID ou imagem de capa com um clique.
                  </p>
                </div>

                <form onSubmit={handleTmdbSearch} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite o nome de um filme, série ou anime..."
                    value={tmdbSearchQuery}
                    onChange={(e) => setTmdbSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={tmdbSearching}
                    className="px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {tmdbSearching ? 'Buscando...' : 'Buscar'}
                  </button>
                </form>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {tmdbSearchResults.map((m) => (
                    <div key={m.id} className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <img src={m.poster} alt={m.title} className="w-full aspect-[2/3] object-cover rounded-xl" />
                      <p className="text-xs font-bold text-white truncate">{m.title}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>ID: {m.id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(String(m.id));
                            showToast?.(`ID ${m.id} copiado!`);
                          }}
                          className="text-sky-400 hover:underline font-bold"
                        >
                          Copiar ID
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. CHAMADOS / ERROS DE STREAMS (NOVO) */}
            {activeTab === 'broken_streams' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <AlertCircle size={18} className="text-rose-400" />
                      Relatórios de Streams com Erro & Chamados
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Títulos que falharam na extração ou foram reportados para correção rápida.
                    </p>
                  </div>
                  {brokenStreams.length > 0 && (
                    <button
                      onClick={() => {
                        clearBrokenStreamsLog();
                        setBrokenStreams([]);
                        showToast?.('Relatórios limpos!');
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Limpar Todos
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {brokenStreams.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                      <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                      <p className="font-bold text-slate-300">Nenhum erro de reprodução reportado!</p>
                      <p>Todos os títulos estão reproduzindo com sucesso.</p>
                    </div>
                  ) : (
                    brokenStreams.map((b) => (
                      <div key={b.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{b.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">TMDB #{b.tmdbId}</span>
                            {b.resolved && (
                              <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">Resolvido</span>
                            )}
                          </div>
                          <p className="text-[11px] text-rose-400 mt-0.5">{b.reason} · {b.reportedAt}</p>
                        </div>
                        {!b.resolved && (
                          <button
                            onClick={() => {
                              const updated = resolveBrokenStream(b.id);
                              setBrokenStreams(updated);
                              showToast?.('Marcado como resolvido!');
                            }}
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
                          >
                            Resolver
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 8. AUDITORIA DE ANÚNCIOS & TELEGRAM (OBRIGATÓRIOS E IMUTÁVEIS) */}
            {activeTab === 'monetization' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-6 animate-fade-in">
                <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-400" />
                      Regras de Monetização & Telegram (100% Obrigatórios)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Essas diretrizes são travadas no código-fonte para garantir a sustentabilidade dos servidores e o crescimento da comunidade.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                    🔒 Protegido / Imutável
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Popup do Telegram */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#229ED9]/20 text-[#4cb8ed] flex items-center justify-center font-bold">
                          TG
                        </div>
                        <h4 className="text-sm font-bold text-white">Popup do Telegram</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-extrabold uppercase">
                        Obrigatório
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Aparece obrigatoriamente para todo visitante no primeiro acesso a cada 24 horas informando sobre o canal oficial.
                    </p>
                    <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400 space-y-1">
                      <div>• Frequência: <strong>1 vez a cada 24 horas</strong></div>
                      <div>• Trava de segurança: <strong>Nenhum admin pode desligar</strong></div>
                      <div>• Status: <strong className="text-emerald-400">Ativo e Permanente</strong></div>
                    </div>
                  </div>

                  {/* Card 2: Anúncios / Apoio */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                          AD
                        </div>
                        <h4 className="text-sm font-bold text-white">Consentimento de Anúncios</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase">
                        Obrigatório
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Aparece obrigatoriamente toda vez que alguém dá play em um filme, série, anime ou canal IPTV, além da primeira visita do dia.
                    </p>
                    <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400 space-y-1">
                      <div>• Frequência: <strong>A cada play de vídeo + 1º acesso</strong></div>
                      <div>• Trava de segurança: <strong>Impossível burlar ou remover</strong></div>
                      <div>• Status: <strong className="text-emerald-400">Ativo e Permanente</strong></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300">
                  <ShieldCheck size={20} className="shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <strong className="block text-white mb-0.5">Segurança do Modelo de Sustentação</strong>
                    O popup do Telegram e a solicitação de apoio/anúncios continuam 100% obrigatórios para todos os visitantes sem qualquer exceção ou botão de desligamento, preservando a comunidade e a sustentabilidade do Cinetuga.
                  </div>
                </div>
              </div>
            )}

            {/* 9. META DE DOAÇÕES PIX (NOVO) */}
            {activeTab === 'pix' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Heart size={18} className="text-rose-400" />
                    Configuração de Chave Pix & Metas Mensais
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Defina o link/chave de recebimento e configure uma meta comunitária para custos de servidor.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Chave Pix ou E-mail</label>
                      <input
                        type="text"
                        value={pixSettings.pixKey}
                        onChange={(e) => setPixSettings({ ...pixSettings, pixKey: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Recebedor</label>
                      <input
                        type="text"
                        value={pixSettings.receiverName}
                        onChange={(e) => setPixSettings({ ...pixSettings, receiverName: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Link Direto de Doação (PixGG)</label>
                    <input
                      type="text"
                      value={pixSettings.customLink || 'https://pixgg.com/pommern'}
                      onChange={(e) => setPixSettings({ ...pixSettings, customLink: e.target.value })}
                      placeholder="https://pixgg.com/pommern"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Meta Mensal (R$)</label>
                      <input
                        type="number"
                        value={pixSettings.monthlyGoal}
                        onChange={(e) => setPixSettings({ ...pixSettings, monthlyGoal: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Arrecadado até agora (R$)</label>
                      <input
                        type="number"
                        value={pixSettings.currentCollected}
                        onChange={(e) => setPixSettings({ ...pixSettings, currentCollected: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Barra de Progresso da Meta */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>Progresso da Meta: R$ {pixSettings.currentCollected.toFixed(2)}</span>
                      <span className="text-emerald-400">
                        {Math.min(100, Math.round((pixSettings.currentCollected / (pixSettings.monthlyGoal || 1)) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((pixSettings.currentCollected / (pixSettings.monthlyGoal || 1)) * 100))}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePix}
                    className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Salvar Configurações do Pix
                  </button>
                </div>
              </div>
            )}

            {/* 10. BACKUP & RESTAURAÇÃO JSON (NOVO) */}
            {activeTab === 'backup' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Download size={18} className="text-emerald-400" />
                    Backup e Restauração Completa de Configurações
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exporte todas as preferências, avisos e canais em um arquivo JSON para restaurar a qualquer momento.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Download size={15} className="text-emerald-400" />
                      Exportar Configurações
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Gera um arquivo .json seguro com todas as regras, destaques e bloqueios.
                    </p>
                    <button
                      onClick={handleExportBackup}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Baixar Arquivo JSON
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Upload size={15} className="text-sky-400" />
                      Restaurar Backup
                    </h4>
                    <textarea
                      rows={2}
                      placeholder="Cole aqui o texto do JSON de backup..."
                      value={backupJsonText}
                      onChange={(e) => setBackupJsonText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-white font-mono"
                    />
                    <button
                      onClick={handleImportBackup}
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Restaurar Dados
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FERRAMENTAS RESTANTES (DIAGNÓSTICO, CACHE, SPOTLIGHT, MODERAÇÃO, AVISO) */}
            {activeTab === 'servers' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Server size={18} className="text-purple-400" />
                      Diagnóstico de Saúde & Latência dos Servidores de Vídeo
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Testa a conexão de cada provedor em tempo real.</p>
                  </div>
                  <button
                    onClick={handleTestServers}
                    disabled={testingServers}
                    className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={testingServers ? 'animate-spin' : ''} />
                    <span>{testingServers ? 'Testando...' : 'Testar Todos'}</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  {serverList.map((srv) => (
                    <div key={srv.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${srv.status === 'online' ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
                        <div>
                          <p className="text-xs font-bold text-white">{srv.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{srv.url}</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">{srv.latency} ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'cache' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Trash2 size={18} className="text-cyan-400" />
                    Gerenciador de Memória & Purga de Cache de Streams
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Libera os links em cache forçando raspagens frescas com resolução máxima.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-xs font-semibold text-slate-400">Streams em Memória</span>
                    <div className="text-3xl font-extrabold text-cyan-400 mt-1">{cacheSize} itens</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-xs font-semibold text-slate-400">Última Limpeza</span>
                    <div className="text-lg font-bold text-white mt-1">{lastPurged || 'Nenhuma hoje'}</div>
                  </div>
                </div>
                <button
                  onClick={handlePurgeCache}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg"
                >
                  Purgar Todo o Cache de Vídeos Agora
                </button>
              </div>
            )}

            {activeTab === 'spotlight' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Star size={18} className="text-amber-400" />
                    Destaque Hero Personalizado (Capa do Site)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Fixe qualquer título no banner principal de entrada.</p>
                </div>
                {currentSpotlight && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400">Atualmente Fixado</span>
                      <h4 className="text-sm font-bold text-white">{currentSpotlight.title}</h4>
                    </div>
                    <button onClick={handleRemoveSpotlight} className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold">
                      Restaurar Padrão
                    </button>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Título (ex: Solo Leveling)"
                      value={spotlightTitle}
                      onChange={(e) => setSpotlightTitle(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="TMDB ID (ex: 82452)"
                      value={spotlightTmdbId}
                      onChange={(e) => setSpotlightTmdbId(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <input
                    type="url"
                    placeholder="URL Backdrop 1920x1080"
                    value={spotlightBackdrop}
                    onChange={(e) => setSpotlightBackdrop(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                  <button
                    onClick={handleSaveSpotlight}
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Fixar no Banner Principal
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'announcement' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Megaphone size={18} className="text-emerald-400" />
                      Aviso Global (Faixa Superior)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Faixa de alerta visível no topo para todos os visitantes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    className="w-5 h-5 text-emerald-400 rounded"
                  />
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Texto do aviso..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Tag (ex: Novidade)"
                      value={announcementBadge}
                      onChange={(e) => setAnnouncementBadge(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                    <select
                      value={announcementType}
                      onChange={(e) => setAnnouncementType(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    >
                      <option value="green">Verde</option>
                      <option value="blue">Azul</option>
                      <option value="amber">Amarelo</option>
                      <option value="red">Vermelho</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSaveAnnouncement}
                    className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Salvar e Publicar Aviso
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="p-6 rounded-3xl bg-[#0f1422] border border-white/[0.08] space-y-5 animate-fade-in">
                <div className="pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders size={18} className="text-rose-400" />
                    Modo Manutenção & Bloqueador de Conteúdo
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Controles de emergência e moderação de títulos.</p>
                </div>
                {/* Status Geral e Controles de Manutenção */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isMaintenance
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full animate-ping ${isMaintenance ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <h4 className="text-sm font-extrabold text-white">
                          {isMaintenance ? '🔴 Modo Manutenção ATIVADO' : '🟢 Site 100% Online e Acessível'}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                        {isMaintenance
                          ? 'Todos os visitantes normais no mundo todo estão sendo bloqueados e direcionados para a tela de manutenção preventiva.'
                          : 'O catálogo e os players estão liberados normalmente para qualquer visitante ou usuário.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {isMaintenance && onPreviewMaintenance && (
                        <button
                          type="button"
                          onClick={onPreviewMaintenance}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          👁️ Simular Visitante
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleToggleMaintenance}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide shadow-lg transition-all cursor-pointer ${
                          isMaintenance
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
                        }`}
                      >
                        {isMaintenance ? 'Desativar Manutenção' : 'Ativar Modo Manutenção'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-start gap-2.5 text-[11px] text-slate-400">
                    <span className="text-amber-400 font-bold">ℹ️ Regra de Acesso:</span>
                    <span>
                      Como você está logado no e-mail master (<strong>{ADMIN_EMAIL}</strong>), você possui <strong>passe livre total</strong> e não é bloqueado da navegação comum, para que você possa inspecionar e testar o catálogo mesmo durante a manutenção.
                    </span>
                  </div>
                </div>
                <form onSubmit={handleBlockTitle} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="TMDB ID para bloquear"
                    value={blockTmdbInput}
                    onChange={(e) => setBlockTmdbInput(e.target.value)}
                    className="w-40 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Nome do Título (opcional)"
                    value={blockTitleInput}
                    onChange={(e) => setBlockTitleInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold"
                  >
                    Bloquear
                  </button>
                </form>
                <div className="space-y-1.5 mt-2">
                  {blockedList.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span>ID #{item.id} - {item.title}</span>
                      <button onClick={() => setBlockedList(toggleBlockTmdbId(item.id))} className="text-slate-400 hover:text-white">
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

