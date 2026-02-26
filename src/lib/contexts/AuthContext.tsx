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
        // 1. Cargar rol desde caché para rapidez inmediata
        if (typeof window !== 'undefined') {
            const cachedRole = localStorage.getItem('user_role') as 'admin' | 'visor';
            const cachedSeccion = localStorage.getItem('user_seccion');
            if (cachedRole) setRole(cachedRole);
            if (cachedSeccion) setSeccionAsignada(cachedSeccion);
        }

        // 2. Verificar sesión inicial inmediatamente
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);

                // LIBERAMOS el loading aquí para que la App cargue YA
                setLoading(false);

                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('perfiles')
                        .select('rol, seccion_asignada')
                        .eq('id', session.user.id)
                        .single();
                    if (profile) {
                        setRole(profile.rol);
                        setSeccionAsignada(profile.seccion_asignada);
                        localStorage.setItem('user_role', profile.rol);
                        if (profile.seccion_asignada) {
                            localStorage.setItem('user_seccion', profile.seccion_asignada);
                        }
                    }
                }
            } catch (err) {
                console.error('Error inicializando auth:', err);
                setLoading(false);
            }
        };

        initAuth();

        // 3. Escuchar cambios en la sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                // Sincronizar perfil en segundo plano sin bloquear
                supabase.from('perfiles').select('rol, seccion_asignada').eq('id', session.user.id).single()
                    .then(({ data: profile }) => {
                        if (profile) {
                            setRole(profile.rol);
                            setSeccionAsignada(profile.seccion_asignada);
                            localStorage.setItem('user_role', profile.rol);
                            if (profile.seccion_asignada) {
                                localStorage.setItem('user_seccion', profile.seccion_asignada);
                            } else {
                                localStorage.removeItem('user_seccion');
                            }
                        }
                    });
            } else {
                setRole(null);
                setSeccionAsignada(null);
                localStorage.removeItem('user_role');
                localStorage.removeItem('user_seccion');
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
