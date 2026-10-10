import React, { useState, useEffect } from 'react';
import { X, User, Check, Loader2, LogOut, Link as LinkIcon, Sparkles, AlertCircle, RefreshCw, ShieldCheck, Crown, Zap, Shield, ChevronRight } from 'lucide-react';
import { updateUserProfile, PRESET_AVATARS, DEFAULT_AVATAR } from '../services/supabase';
import { isUserAdmin } from '../services/adminAnalytics';
import { getUserLevelInfo, isVipUser, getVipSubscriptionData } from '../services/vipService';

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  profile,
  onProfileUpdated,
  onOpenAdmin,
  onOpenSubscription,
  onSignOut,
}) {
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const levelInfo = getUserLevelInfo(user, profile);
  const vipData = getVipSubscriptionData(user, profile);

  useEffect(() => {
    if (user) {
      const name = profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || '';
      const av = profile?.avatar_url || user.user_metadata?.avatar_url || DEFAULT_AVATAR;
      setDisplayName(name);
      setAvatarUrl(av);
      setError(null);
      setSuccessMessage(null);
    }
  }, [user, profile, isOpen]);

  if (!isOpen || !user) return null;

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:'))) {
          setAvatarUrl(text.trim());
        }
      }
    } catch (_) {
      // Clipboard permission denied or unsupported
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Por favor, informe seu nome de exibição.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const finalAvatar = avatarUrl.trim() || DEFAULT_AVATAR;
      const updated = await updateUserProfile({
        displayName: displayName.trim(),
        avatarUrl: finalAvatar,
      });

      setSuccessMessage('Perfil salvo com sucesso!');
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[ProfileModal] Erro ao atualizar perfil:', err);
      setError(err.message || 'Falha ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const displayAvatar = avatarUrl.trim() || DEFAULT_AVATAR;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0f141e] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-scale-in max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header Preview */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
          <div className={`relative w-16 h-16 rounded-2xl overflow-hidden border-2 ${levelInfo.isVip ? 'border-amber-400 shadow-amber-500/20' : 'border-sky-400/80 shadow-sky-500/10'} shadow-lg shrink-0 bg-slate-900`}>
            <img
              src={displayAvatar}
              alt="Avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR;
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2 truncate">
              <span>{displayName || 'Meu Perfil'}</span>
              {levelInfo.isVip ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-extrabold flex items-center gap-1 shrink-0">
                  <Crown size={11} className="fill-amber-400 text-amber-400" />
                  <span>VIP Diamante</span>
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold shrink-0">
                  {levelInfo.tierBadge}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <p className="text-[11px] text-sky-400/90 mt-0.5">Nível atual: <strong className="text-white">{levelInfo.title}</strong></p>
          </div>
        </div>

        {/* Card de Nível do Usuário & Progressão de XP */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#121927] to-[#0c101a] border border-white/[0.08] shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${levelInfo.isVip ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30' : 'bg-sky-500/20 text-sky-400 border border-sky-400/30'}`}>
                {levelInfo.isVip ? <Crown size={18} className="fill-amber-400" /> : <Zap size={16} />}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                  <span>{levelInfo.title}</span>
                  {levelInfo.isVip && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-extrabold uppercase">VIP</span>}
                </p>
                <p className="text-[10px] text-slate-400">
                  {levelInfo.isVip ? 'Status Diamante Perpétuo' : `${levelInfo.titlesCount} títulos assistidos`}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-mono font-bold text-slate-200">
                {levelInfo.isVip ? 'XP MÁXIMO' : `${levelInfo.currentXp} / ${levelInfo.nextLevelXp} XP`}
              </p>
              <p className="text-[10px] text-slate-400">{levelInfo.progressPercent}% do nível</p>
            </div>
          </div>

          {/* Barra de Progresso XP */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1 mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                levelInfo.isVip
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500'
                  : 'bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500'
              }`}
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>

          {/* Perks do Nível vs VIP */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${levelInfo.isVip ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{levelInfo.isVip ? 'Zero Anúncios' : 'Com Anúncios'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${levelInfo.isVip ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>{levelInfo.isVip ? '4K Ultra HD & Dolby' : '1080p Standard'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${levelInfo.isVip ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>{levelInfo.isVip ? 'Downloads Liberados' : 'Sem Downloads'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${levelInfo.isVip ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>{levelInfo.isVip ? 'Servidores VIP' : 'Servidores Padrão'}</span>
            </div>
          </div>

          {/* Botão Upgrade para VIP (Apenas usuários gratuitos) */}
          {!levelInfo.isVip && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSubscription?.();
              }}
              className="mt-3.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-sky-500/20 hover:from-sky-500/30 hover:to-blue-500/30 border border-sky-400/40 backdrop-blur-md text-sky-300 hover:text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <Crown size={15} className="text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                <span>Fazer Upgrade para VIP (MB WAY & Crypto)</span>
              </div>
              <ChevronRight size={14} className="text-sky-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {/* Admin Shortcut for shizuu122@gmail.com */}
        {isUserAdmin(user) && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAdmin?.();
            }}
            className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-sky-500/15 to-amber-500/20 hover:from-amber-500/30 hover:to-sky-500/25 border border-amber-500/40 flex items-center justify-between gap-3 text-amber-300 hover:text-white transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <ShieldCheck size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  Painel de Administração
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-extrabold uppercase">
                    Admin
                  </span>
                </p>
                <p className="text-[10px] text-slate-400">Ver pessoas online, tráfego e ferramentas</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform">
              Abrir &rarr;
            </span>
          </button>
        )}

        {/* Feedback Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs animate-fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs animate-fade-in">
            <Check size={16} className="text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="mt-5 space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome de Exibição
            </label>
            <div className="relative flex items-center">
              <User size={16} className="absolute left-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como quer ser chamado?"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
          </div>

          {/* Avatar URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <LinkIcon size={14} className="text-sky-400" />
                <span>Link da Foto de Perfil</span>
              </label>
              {avatarUrl && avatarUrl !== DEFAULT_AVATAR && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(DEFAULT_AVATAR)}
                  className="text-[11px] text-slate-400 hover:text-sky-400 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={10} />
                  <span>Padrão</span>
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Cole o link da sua imagem (ex: https://...)"
                className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="absolute right-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-medium border border-white/[0.08] transition-colors"
                title="Colar link da área de transferência"
              >
                Colar
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Cole o link direto de qualquer foto da internet (Imgur, Discord, Pinterest, Google, etc.).
            </p>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-2">
              Ou clique em uma das sugestões para preencher o link:
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((av) => {
                const isSelected = avatarUrl.trim() === av.url;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarUrl(av.url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                      isSelected
                        ? 'border-sky-400 scale-105 shadow-md shadow-sky-400/25'
                        : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                    }`}
                    title={av.name}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-sky-400/30 flex items-center justify-center">
                        <Check size={14} className="text-white font-bold" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:bg-sky-500/50 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Salvando Perfil...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Salvar Foto e Nome</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sair da sua conta neste dispositivo"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
