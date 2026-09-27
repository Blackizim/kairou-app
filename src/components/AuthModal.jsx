import React, { useState } from 'react';
import { X, Lock, Mail, User, Check, Loader2, Sparkles, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { signInUser, signUpUser, PRESET_AVATARS, DEFAULT_AVATAR } from '../services/supabase';
import KairouIcon from './KairouIcon';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await signInUser({ email, password });
        if (res.user) {
          onAuthSuccess(res.user);
          onClose();
        }
      } else {
        if (!displayName.trim()) {
          throw new Error('Por favor, digite seu nome ou apelido.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        const res = await signUpUser({
          email,
          password,
          displayName,
          avatarUrl: selectedAvatar,
        });
        if (res.user) {
          onAuthSuccess(res.user);
          onClose();
        }
      }
    } catch (err) {
      console.error('[AuthModal] Erro de autenticação:', err);
      let msg = err.message || 'Ocorreu um erro ao processar sua solicitação.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Email ou senha incorretos. Verifique seus dados.';
      } else if (msg.includes('User already registered')) {
        msg = 'Este email já está cadastrado. Faça login ou use outro email.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'A senha deve conter no mínimo 6 caracteres.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Background dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#0f141e] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Brand Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <KairouIcon size={32} />
            <span className="text-2xl font-extrabold tracking-tight text-white">
              kai<span className="text-sky-400">rou</span>
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">
            {mode === 'login' ? 'Acesse sua Conta' : 'Criar Nova Conta'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Faça login para sincronizar seu histórico e continuar assistindo.'
              : 'Junte-se à kairou para salvar progresso e personalizar seu perfil.'}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/80 border border-slate-800/80 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'login'
                ? 'bg-sky-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'register'
                ? 'bg-sky-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs animate-fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              {/* Display Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Seu Nome ou Apelido
                </label>
                <div className="relative flex items-center">
                  <User size={15} className="absolute left-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alexander K."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>

              {/* Avatar Selector via Link and Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <LinkIcon size={12} className="text-sky-400" />
                    <span>Foto de Perfil (Via Link ou Sugestões)</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-normal">Pode alterar a qualquer momento</span>
                </label>

                {/* Input de link e preview */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-sky-400/60 shrink-0 bg-slate-900">
                    <img
                      src={selectedAvatar.trim() || DEFAULT_AVATAR}
                      alt="Preview"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="url"
                      placeholder="Cole aqui o link da imagem (ex: https://...)"
                      value={selectedAvatar}
                      onChange={(e) => setSelectedAvatar(e.target.value)}
                      className="w-full pl-3 pr-14 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (navigator.clipboard && navigator.clipboard.readText) {
                            const text = await navigator.clipboard.readText();
                            if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:'))) {
                              setSelectedAvatar(text.trim());
                            }
                          }
                        } catch (_) {}
                      }}
                      className="absolute right-1.5 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-white/[0.06] transition-colors"
                      title="Colar link"
                    >
                      Colar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((av) => {
                    const isSelected = selectedAvatar.trim() === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                          isSelected
                            ? 'border-sky-400 scale-105 shadow-md shadow-sky-400/20'
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
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Email
            </label>
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-3.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Senha
            </label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:bg-sky-500/50 text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : mode === 'login' ? (
              <span>Entrar na Minha Conta</span>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Criar Conta no Kairou</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            {mode === 'login' ? 'Não tem uma conta ainda? ' : 'Já possui uma conta? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-sky-400 hover:underline font-semibold"
            >
              {mode === 'login' ? 'Cadastre-se grátis' : 'Entrar agora'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
