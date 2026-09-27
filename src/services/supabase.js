import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbspfpymitvkglmvghca.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o2wFFOdCe5hDFury0BQxzA_dQqXhLkg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Lista de Avatares Predefinidos do Kairou
export const PRESET_AVATARS = [
  {
    id: 'kairou-cyan',
    name: 'Kairou Cyan',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'cyber-samurai',
    name: 'Cyber Samurai',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'neon-pilot',
    name: 'Neon Pilot',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'space-ranger',
    name: 'Space Ranger',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'cinema-director',
    name: 'Director',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'anime-hero',
    name: 'Anime Hero',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_AVATAR = PRESET_AVATARS[0].url;

// 1. Obter Perfil do Usuário
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] Erro ao buscar perfil:', err);
    return null;
  }
}

// 2. Registrar Novo Usuário
export async function signUpUser({ email, password, displayName, avatarUrl }) {
  const chosenAvatar = avatarUrl || DEFAULT_AVATAR;
  const chosenName = displayName?.trim() || email.split('@')[0];

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: chosenName,
        avatar_url: chosenAvatar,
      },
    },
  });

  if (error) throw error;

  // Se o usuário foi criado, atualizar ou garantir entrada na tabela profiles
  if (data?.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      display_name: chosenName,
      avatar_url: chosenAvatar,
      updated_at: new Date().toISOString(),
    });
  }

  return data;
}

// 3. Fazer Login
export async function signInUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// 4. Fazer Logout
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 5. Atualizar Perfil (Nome e Foto)
export async function updateUserProfile({ displayName, avatarUrl }) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Usuário não autenticado.');

  const updates = {};
  if (displayName) updates.display_name = displayName.trim();
  if (avatarUrl) updates.avatar_url = avatarUrl;
  updates.updated_at = new Date().toISOString();

  // Atualizar auth metadata
  await supabase.auth.updateUser({
    data: {
      display_name: displayName?.trim() || user.user_metadata?.display_name,
      avatar_url: avatarUrl || user.user_metadata?.avatar_url,
    },
  });

  // Atualizar tabela profiles
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...updates,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 6. Salvar Progresso (Continuar Assistindo)
export async function saveWatchProgress({
  mediaId,
  mediaType,
  title,
  posterPath,
  backdropPath,
  season = 1,
  episode = 1,
  episodeTitle = '',
  currentTime = 0,
  duration = 0,
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null; // Apenas salva se o usuário estiver logado

    if (!mediaId || !title || duration <= 0) return null;

    const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));

    // Se assistiu mais de 95%, remove do continuar assistindo
    if (progressPercent >= 95) {
      await removeWatchProgress(mediaId, season, episode);
      return null;
    }

    // Se assistiu menos de 10 segundos, não precisa salvar ainda
    if (currentTime < 10) return null;

    const payload = {
      user_id: user.id,
      media_id: String(mediaId),
      media_type: mediaType || 'movie',
      title: title,
      poster_path: posterPath || '',
      backdrop_path: backdropPath || '',
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      episode_title: episodeTitle || '',
      playback_time: Math.round(currentTime),
      duration: Math.round(duration),
      progress_percent: progressPercent,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('watch_progress')
      .upsert(payload, {
        onConflict: 'user_id,media_id,season,episode',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] Erro ao salvar progresso de reprodução:', err);
    return null;
  }
}

// 7. Obter Lista de Continuar Assistindo
export async function getWatchProgressList() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[Supabase] Erro ao buscar lista de progresso:', err);
    return [];
  }
}

// 8. Remover item de Continuar Assistindo
export async function removeWatchProgress(mediaId, season = 1, episode = 1) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('watch_progress')
      .delete()
      .match({
        user_id: user.id,
        media_id: String(mediaId),
        season: Number(season) || 1,
        episode: Number(episode) || 1,
      });
  } catch (err) {
    console.warn('[Supabase] Erro ao deletar progresso:', err);
  }
}
