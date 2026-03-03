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
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, role, seccion_asignada: seccionAsignada, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
