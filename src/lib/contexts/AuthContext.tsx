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
        // 1. Verificar sesión inicial inmediatamente
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('perfiles')
                        .select('rol')
                        .eq('id', session.user.id)
                        .single();
                    if (profile) setRole(profile.rol);
                }
            } catch (err) {
                console.error('Error inicializando auth:', err);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // 2. Escuchar cambios en la sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                setUser(session?.user ?? null);

                if (session?.user) {
                    const { data: profile, error } = await supabase
                        .from('perfiles')
                        .select('rol')
                        .eq('id', session.user.id)
                        .single();

                    if (!error && profile) {
                        setRole(profile.rol);
                    } else if (error && role === null) {
                        setRole('visor');
                    }
                } else {
                    setRole(null);
                }
            } catch (err) {
                console.error('Critical Auth State Error:', err);
                if (role === null) setRole('visor');
            } finally {
                setLoading(false);
            }
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
