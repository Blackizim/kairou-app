import React, { useState, useEffect } from 'react';
import { X, User, Check, Loader2, LogOut, Link as LinkIcon, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { updateUserProfile, PRESET_AVATARS, DEFAULT_AVATAR } from '../services/supabase';

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  profile,
  onProfileUpdated,
  onSignOut,
}) {
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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
        <div className="flex items-center gap-4 pb-5 border-b border-slate-800">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-sky-400/80 shadow-lg shadow-sky-500/10 shrink-0 bg-slate-900">
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
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-normal shrink-0">
                Kairou Member
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <p className="text-[11px] text-sky-400/90 mt-0.5">Pré-visualização da foto ao vivo</p>
          </div>
        </div>

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
