'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Lock, Mail, LogIn, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            router.push('/');
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'var(--background)',
            backgroundImage: 'radial-gradient(circle at 50% 50%, var(--primary-glow) 0%, transparent 70%)',
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            overflow: 'auto'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    maxWidth: '430px',
                    width: '100%',
                    padding: '4rem 3rem',
                    background: 'var(--surface)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-premium), 0 0 40px var(--primary-glow)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Decorative glow */}
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'var(--primary-glow)', filter: 'blur(50px)', borderRadius: '50%' }} />

                <div style={{ textAlign: 'center', marginBottom: '3.5rem', position: 'relative' }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem',
                        boxShadow: '0 0 25px var(--primary-glow)'
                    }}>
                        <Activity size={36} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 950, color: 'white', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
                        SisFact <span style={{ color: 'var(--primary)', fontSize: '0.8rem', verticalAlign: 'middle', background: 'rgba(0, 242, 254, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>PRO</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>Control de Auditoría Médica</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={12} /> Correo Electrónico
                        </label>
                        <input
                            type="email"
                            placeholder="usuario@coi.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                padding: '1rem 1.25rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)',
                                borderRadius: '14px',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={12} /> Contraseña
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                padding: '1rem 1.25rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)',
                                borderRadius: '14px',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700, background: 'rgba(241, 91, 181, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(241, 91, 181, 0.2)' }}
                        >
                            {error}
                        </motion.p>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 0 20px var(--primary-glow)' }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        style={{
                            height: '60px',
                            background: 'var(--primary)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            marginTop: '0.5rem',
                            boxShadow: '0 10px 20px rgba(0, 242, 254, 0.2)'
                        }}
                    >
                        {loading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '22px', height: '22px', border: '3px solid rgba(0,0,0,0.1)', borderTop: '3px solid #000', borderRadius: '50%' }} />
                        ) : (
                            <>
                                INICIAR SISTEMA <LogIn size={20} />
                            </>
                        )}
                    </motion.button>
                </form>

                <div style={{ marginTop: '3.5rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
                        Powered by Antigravity v4.0
                    </p>
                </div>
            </motion.div>
        </div>
    );

}
