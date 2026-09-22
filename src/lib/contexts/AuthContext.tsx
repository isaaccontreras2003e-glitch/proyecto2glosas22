'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null;
    role: 'admin' | 'visor' | null;
    seccion_asignada: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    seccion_asignada: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'admin' | 'visor' | null>(null);
    const [seccionAsignada, setSeccionAsignada] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Cargar rol desde caché para rapidez inmediata (con try/catch por modo privado/Safari)
        try {
            if (typeof window !== 'undefined') {
                const cachedRole = localStorage.getItem('user_role') as 'admin' | 'visor';
                const cachedSeccion = localStorage.getItem('user_seccion');
                if (cachedRole) setRole(cachedRole);
                if (cachedSeccion) setSeccionAsignada(cachedSeccion);
            }
        } catch { /* localStorage bloqueado - continuar sin caché */ }

        // 2. Verificar sesión inicial
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
                setLoading(false);

                if (session?.user) {
                    // Obtener perfil con timeout de 10s para no bloquear indefinidamente
                    try {
                        const profilePromise = supabase
                            .from('perfiles')
                            .select('rol, seccion_asignada')
                            .eq('id', session.user.id)
                            .single();

                        const timeoutPromise = new Promise<null>((resolve) =>
                            setTimeout(() => resolve(null), 10000)
                        );

                        const result = await Promise.race([profilePromise, timeoutPromise]);

                        if (result && 'data' in result && result.data) {
                            const profile = result.data;
                            setRole(profile.rol);
                            setSeccionAsignada(profile.seccion_asignada);
                            try {
                                localStorage.setItem('user_role', profile.rol);
                                if (profile.seccion_asignada) {
                                    localStorage.setItem('user_seccion', profile.seccion_asignada);
                                }
                            } catch { /* localStorage bloqueado */ }
                        }
                    } catch (profileErr) {
                        console.error('Error obteniendo perfil (no crítico):', profileErr);
                        // Continuar sin perfil - la app funciona con rol null
                    }
                }
            } catch (err) {
                console.error('Error inicializando auth:', err);
                setLoading(false);
            }
        };

        initAuth();

        // 3. Escuchar cambios en la sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const incomingUserId = session?.user?.id ?? null;

            // ── FIX: Detectar cambio de usuario y limpiar caché de sesión anterior ──
            // Esto evita que al compartir el sistema (o al cambiar de usuario en el
            // mismo equipo) aparezcan datos desactualizados o de otro usuario.
            try {
                if (typeof window !== 'undefined') {
                    const prevUserId = localStorage.getItem('active_user_id');
                    if (prevUserId && incomingUserId && prevUserId !== incomingUserId) {
                        // Usuario diferente: limpiar TODOS los cachés de datos
                        console.log('[AuthContext] Cambio de usuario detectado. Limpiando caché de sesión anterior...');
                        clearAllDataCache();
                    }
                    if (incomingUserId) {
                        localStorage.setItem('active_user_id', incomingUserId);
                    } else {
                        // Logout: limpiar caché de datos
                        clearAllDataCache();
                        localStorage.removeItem('active_user_id');
                    }
                }
            } catch { /* localStorage bloqueado */ }

            setUser(session?.user ?? null);

            if (session?.user) {
                // Sincronizar perfil en segundo plano (IIFE async para manejar errores)
                (async () => {
                    try {
                        const { data: profile } = await supabase
                            .from('perfiles')
                            .select('rol, seccion_asignada')
                            .eq('id', session.user!.id)
                            .single();

                        if (!profile) return;

                        setRole(profile.rol);
                        setSeccionAsignada(profile.seccion_asignada);
                        try {
                            localStorage.setItem('user_role', profile.rol);
                            if (profile.seccion_asignada) {
                                localStorage.setItem('user_seccion', profile.seccion_asignada);
                            } else {
                                localStorage.removeItem('user_seccion');
                            }
                        } catch { /* localStorage bloqueado */ }
                    } catch (err) {
                        console.error('Error sincronizando perfil:', err);
                    }
                })();
            } else {
                setRole(null);
                setSeccionAsignada(null);
                try {
                    localStorage.removeItem('user_role');
                    localStorage.removeItem('user_seccion');
                } catch { /* localStorage bloqueado */ }
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        // Limpiar caché de datos antes de cerrar sesión para que el próximo usuario
        // (o la próxima apertura del link compartido) vea datos frescos de Supabase.
        clearAllDataCache();
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, role, seccion_asignada: seccionAsignada, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

/**
 * clearAllDataCache — elimina todos los cachés de datos del localStorage.
 * Se llama al hacer logout o al detectar que se inició sesión con un usuario
 * diferente al que había antes. Esto garantiza que nunca aparezcan datos
 * desactualizados o de otro usuario al compartir el sistema.
 */
export function clearAllDataCache() {
    const CACHE_KEYS = [
        'cached_glosas',
        'cached_ingresos',
        'emergency_buffer',
        'emergency_buffer_glosas',
        'emergency_buffer_ingresos',
        'pending_glosas',
        'checked_ids_registry',
        'MASTER_RECORD_LOG',
        'sisfact_app_version',
        'cache_owner_user_id',  // FIX v17.0: ownership marker para detectar cambio de usuario
    ];
    try {
        if (typeof window === 'undefined') return;
        CACHE_KEYS.forEach(key => {
            try { localStorage.removeItem(key); } catch { /* ignorar */ }
        });
        console.log('[AuthContext] Caché de datos limpiado correctamente.');
    } catch { /* localStorage bloqueado */ }
}
