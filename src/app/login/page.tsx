'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, LogIn, Activity, AlertTriangle, RefreshCcw, ArrowLeft, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showClearButton, setShowClearButton] = useState(false);
    const [view, setView] = useState<'login' | 'forgot'>('login');
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('sisfact_login_rl')) {
            setShowClearButton(true);
        }
    }, []);

    const handleClearBlock = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('sisfact_login_rl');
            setShowClearButton(false);
            setError('Bloqueo limpiado. Intenta de nuevo.');
            window.location.reload();
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (authError) {
                if (authError.message === 'Invalid login credentials') {
                    setError('Correo o contraseña incorrectos.');
                } else if (authError.message.includes('rate limit')) {
                    setError('Acceso bloqueado temporalmente por seguridad. Espera unos minutos.');
                } else {
                    setError(authError.message);
                }
                return;
            }

            if (data.session) {
                router.push('/');
            }
        } catch (err: any) {
            setError('Error de conexión. Verifica tu internet.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/login/reset`,
            });

            if (resetError) {
                setError(resetError.message);
            } else {
                setSuccess('Se ha enviado un enlace de recuperación a tu correo.');
            }
        } catch (err: any) {
            setError('Error al procesar la solicitud.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100vw',
            background: 'var(--background)',
            backgroundImage: 'linear-gradient(rgba(248, 249, 250, 0.85), rgba(248, 249, 250, 0.85)), url("/medical-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            overflow: 'auto',
            padding: '1.5rem'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    maxWidth: '440px',
                    width: '100%',
                    padding: '3.5rem 2.5rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    border: '1px solid rgba(0, 99, 65, 0.1)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.05), 0 0 30px rgba(0, 99, 65, 0.05)',
                    position: 'relative',
                    textAlign: 'center'
                }}
            >
                {/* Branding Section */}
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 8px 20px rgba(0, 99, 65, 0.2)',
                        color: 'white'
                    }}>
                        <Activity size={32} />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                        SisFact <span style={{ color: 'var(--primary)', fontSize: '0.7rem', verticalAlign: 'middle', background: 'rgba(0, 99, 65, 0.06)', padding: '4px 10px', borderRadius: '8px', fontWeight: 800 }}>PRO V4.0</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 500 }}>
                        Servicios Oftalmológicos de Auditoría
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {view === 'login' ? (
                        <motion.form
                            key="login-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={handleLogin}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                        >
                            {/* Clear Block Button */}
                            {showClearButton && (
                                <button
                                    type="button"
                                    onClick={handleClearBlock}
                                    style={{
                                        padding: '0.75rem',
                                        background: 'rgba(0, 99, 65, 0.05)',
                                        border: '1px solid var(--primary)',
                                        borderRadius: '12px',
                                        color: 'var(--primary)',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCcw size={14} /> DESBLOQUEAR INTENTOS
                                </button>
                            )}

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={12} /> Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    placeholder="usuario@oftalmologia.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Lock size={12} /> Contraseña
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot')}
                                        style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {error && (
                                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ height: '54px', borderRadius: '14px', fontSize: '0.9rem', width: '100%' }}
                            >
                                {loading ? 'CONECTANDO...' : 'ACCEDER AL PANEL'} <LogIn size={18} style={{ marginLeft: '8px' }} />
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="forgot-view"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleForgotPassword}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Ingresa tu correo para recibir un enlace de recuperación.
                                </p>
                            </div>

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={12} /> Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    placeholder="usuario@oftalmologia.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {success && (
                                <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 700, padding: '0.75rem', background: 'rgba(0, 177, 113, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 177, 113, 0.1)' }}>
                                    {success}
                                </div>
                            )}

                            {error && (
                                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{ height: '54px', borderRadius: '14px', fontSize: '0.9rem', width: '100%' }}
                                >
                                    {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'} <Send size={18} style={{ marginLeft: '8px' }} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView('login')}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <ArrowLeft size={14} /> Volver al inicio
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0, 99, 65, 0.06)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                        Powered by Antigravity · Ophthalmology Edition
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
