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
        // Escuchar cambios en la sesión
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                setUser(session?.user ?? null);

                if (session?.user) {
                    // Obtener el rol del perfil con timeout implícito si es posible, o simplemente try-catch
                    const { data: profile, error } = await supabase
                        .from('perfiles')
                        .select('rol')
                        .eq('id', session.user.id)
                        .single();

                    if (error) {
                        console.warn('Error fetching profile, defaulting to visor:', error);
                        setRole('visor');
                    } else {
                        setRole(profile?.rol ?? 'visor');
                    }
                } else {
                    setRole(null);
                }
            } catch (err) {
                console.error('Critical Auth State Error:', err);
                setRole('visor'); // Fallback seguro
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
