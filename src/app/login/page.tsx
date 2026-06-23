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
    const [view, setView] = useState<'login' | 'forgot' | 'register'>('login');
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
            });

            if (authError) {
                setError(authError.message);
            } else {
                setSuccess('¡Cuenta creada! Revisa tu correo para confirmar el enlace antes de iniciar sesión. O vuelve y crea con otro correo si falló.');
                setTimeout(() => setView('login'), 8000);
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
            background: '#00050a',
            backgroundImage: 'linear-gradient(rgba(0, 5, 10, 0.94), rgba(0, 5, 10, 0.94)), url("/medical-bg.png")',
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
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    border: '1px solid rgba(0, 242, 254, 0.1)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 242, 254, 0.1)',
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
                        boxShadow: '0 8px 25px rgba(0, 242, 254, 0.3)',
                        color: 'black'
                    }}>
                        <Activity size={32} />
                    </div>
                    <h1 style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                        SisFact <span style={{ color: 'var(--primary)', fontSize: '0.75rem', verticalAlign: 'middle', background: 'rgba(0, 242, 254, 0.12)', padding: '4px 10px', borderRadius: '8px', fontWeight: 900 }}>PRO V5.5</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.6rem', fontWeight: 500, letterSpacing: '0.02em' }}>
                        THE DIGITAL AUDITOR
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {view === 'login' && (
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
                                        background: 'rgba(0, 242, 254, 0.08)',
                                        border: '1px solid var(--primary)',
                                        borderRadius: '12px',
                                        color: 'var(--primary)',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCcw size={14} /> DESBLOQUEAR SISTEMA
                                </button>
                            )}

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={12} /> Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    placeholder="usuario@oftalmologia.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
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
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {error && (
                                <div style={{ color: '#ff4d4d', fontSize: '0.8rem', fontWeight: 800, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    height: '56px',
                                    borderRadius: '16px',
                                    fontSize: '0.95rem',
                                    width: '100%',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    fontWeight: 900,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    boxShadow: '0 8px 16px rgba(0, 242, 254, 0.2)'
                                }}
                            >
                                {loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN'} <LogIn size={20} />
                            </button>
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>¿No tienes cuenta?</span>
                                    <button
                                        type="button"
                                        onClick={() => setView('register')}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 800 }}
                                    >
                                        Crear Cuenta Rápida
                                    </button>
                                </div>
                        </motion.form>
                    )}
                    {view === 'forgot' && (
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

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={12} /> Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    placeholder="usuario@oftalmologia.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {success && (
                                <div style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 800, padding: '0.75rem', background: 'rgba(0, 242, 254, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                                    {success}
                                </div>
                            )}

                            {error && (
                                <div style={{ color: '#ff4d4d', fontSize: '0.8rem', fontWeight: 800, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        height: '56px',
                                        borderRadius: '16px',
                                        fontSize: '0.95rem',
                                        width: '100%',
                                        background: 'var(--primary)',
                                        color: '#000',
                                        fontWeight: 900,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 16px rgba(0, 242, 254, 0.2)'
                                    }}
                                >
                                    {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'} <Send size={18} style={{ marginLeft: '8px' }} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView('login')}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <ArrowLeft size={14} /> Volver al inicio
                                </button>
                            </div>
                        </motion.form>
                    )}
                    {view === 'register' && (
                        <motion.form
                            key="register-view"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleRegister}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Crea una cuenta rápido. Usa un correo real para confirmar el acceso.
                                </p>
                            </div>

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={12} /> Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    placeholder="usuario@oftalmologia.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Lock size={12} /> Contraseña
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {success && (
                                <div style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 800, padding: '0.75rem', background: 'rgba(0, 242, 254, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                                    {success}
                                </div>
                            )}

                            {error && (
                                <div style={{ color: '#ff4d4d', fontSize: '0.8rem', fontWeight: 800, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        height: '56px',
                                        borderRadius: '16px',
                                        fontSize: '0.95rem',
                                        width: '100%',
                                        background: 'var(--primary)',
                                        color: '#000',
                                        fontWeight: 900,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 16px rgba(0, 242, 254, 0.2)'
                                    }}
                                >
                                    {loading ? 'CREANDO...' : 'CREAR CUENTA'} <LogIn size={18} style={{ marginLeft: '8px' }} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setView('login')}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <ArrowLeft size={14} /> Volver al inicio
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
                        POWERED BY ANTIGRAVITY · DIGITAL AUDITOR EDITION
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
