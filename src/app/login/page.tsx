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
        <div className="flex items-center justify-center p-6 bg-[#0a0a0f]" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)',
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
                className="card"
                style={{
                    maxWidth: '430px',
                    width: '100%',
                    padding: '3.5rem 2.5rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    transform: 'none' // Disabling the hover translateY from .card
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                        borderRadius: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                    }}>
                        <Activity size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 950, color: 'white', marginBottom: '0.5rem' }}>Bienvenido</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Ingresa tus credenciales para continuar</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group">
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={14} /> Correo Electrónico
                        </label>
                        <input
                            type="email"
                            className="input"
                            placeholder="admin@clinica.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ padding: '0.85rem 1rem' }}
                        />
                    </div>

                    <div className="input-group">
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={14} /> Contraseña
                        </label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ padding: '0.85rem 1rem' }}
                        />
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}
                        >
                            {error}
                        </motion.p>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{
                            height: '56px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            marginTop: '1rem'
                        }}
                    >
                        {loading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%' }} />
                        ) : (
                            <>
                                ACCEDER AL PANEL <LogIn size={18} />
                            </>
                        )}
                    </motion.button>
                </form>

                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Sisfact Auditoría &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
