'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null;
    role: 'admin' | 'visor' | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'admin' | 'visor' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Cargar rol desde caché para rapidez inmediata
        if (typeof window !== 'undefined') {
            const cachedRole = localStorage.getItem('user_role') as 'admin' | 'visor';
            if (cachedRole) setRole(cachedRole);
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
                        .select('rol')
                        .eq('id', session.user.id)
                        .single();
                    if (profile) {
                        setRole(profile.rol);
                        localStorage.setItem('user_role', profile.rol);
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
                supabase.from('perfiles').select('rol').eq('id', session.user.id).single()
                    .then(({ data: profile }) => {
                        if (profile) {
                            setRole(profile.rol);
                            localStorage.setItem('user_role', profile.rol);
                        }
                    });
            } else {
                setRole(null);
                localStorage.removeItem('user_role');
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
        <AuthContext.Provider value={{ user, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
