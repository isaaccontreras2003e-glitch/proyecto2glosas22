'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Lock, Mail, LogIn, Activity, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Rate Limit Constants ──────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const STORAGE_KEY = 'sisfact_login_rl';

interface RateLimitState {
    attempts: number;
    lockedUntil: number | null;
}

function getRL(): RateLimitState {
    if (typeof window === 'undefined') return { attempts: 0, lockedUntil: null };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
    } catch {
        return { attempts: 0, lockedUntil: null };
    }
}

function setRL(state: RateLimitState) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetRL() {
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [locked, setLocked] = useState(false);
    const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
    const router = useRouter();

    // ── Check lockout on mount + countdown timer ──
    useEffect(() => {
        const check = () => {
            const rl = getRL();
            if (rl.lockedUntil && Date.now() < rl.lockedUntil) {
                setLocked(true);
                setLockSecondsLeft(Math.ceil((rl.lockedUntil - Date.now()) / 1000));
            } else if (rl.lockedUntil && Date.now() >= rl.lockedUntil) {
                // Lockout expired — reset
                resetRL();
                setLocked(false);
                setLockSecondsLeft(0);
            }
        };

        check();
        const interval = setInterval(check, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // ── Rate limit guard ──
        const rl = getRL();
        if (rl.lockedUntil && Date.now() < rl.lockedUntil) {
            const remaining = Math.ceil((rl.lockedUntil - Date.now()) / 1000);
            setError(`Demasiados intentos fallidos. Espera ${Math.ceil(remaining / 60)} min ${remaining % 60} seg.`);
            setLocked(true);
            return;
        }

        setLoading(true);
        setError(null);

        // Basic input sanitization
        const cleanEmail = email.trim().slice(0, 254);
        const cleanPassword = password.slice(0, 128);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: cleanPassword,
            });

            if (authError) {
                // Increment failure counter
                const current = getRL();
                const newAttempts = (current.attempts ?? 0) + 1;

                if (newAttempts >= MAX_ATTEMPTS) {
                    const lockedUntil = Date.now() + LOCKOUT_MS;
                    setRL({ attempts: newAttempts, lockedUntil });
                    setLocked(true);
                    setLockSecondsLeft(Math.ceil(LOCKOUT_MS / 1000));
                    setError(`Cuenta bloqueada por ${LOCKOUT_MS / 60000} minutos por demasiados intentos fallidos.`);
                } else {
                    setRL({ attempts: newAttempts, lockedUntil: null });
                    const remaining = MAX_ATTEMPTS - newAttempts;
                    setError(
                        authError.message === 'Invalid login credentials'
                            ? `Correo o contraseña incorrectos. (${remaining} intento${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''})`
                            : authError.message
                    );
                }
            } else {
                // Login success → reset rate limit
                resetRL();
                router.push('/');
            }
        } catch (err: any) {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
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

                {/* Lockout Banner */}
                {locked && lockSecondsLeft > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            color: '#f87171',
                            fontSize: '0.85rem',
                            fontWeight: 700
                        }}
                    >
                        <AlertTriangle size={18} />
                        <div>
                            <div>Acceso bloqueado temporalmente</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, marginTop: '2px' }}>
                                ⏱ {formatTime(lockSecondsLeft)}
                            </div>
                        </div>
                    </motion.div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'relative' }} noValidate>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label htmlFor="login-email" style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={12} /> Correo Electrónico
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            placeholder="usuario@coi.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={locked}
                            maxLength={254}
                            autoComplete="email"
                            aria-label="Correo electrónico"
                            style={{
                                padding: '1rem 1.25rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)',
                                borderRadius: '14px',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease',
                                opacity: locked ? 0.5 : 1
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <label htmlFor="login-password" style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={12} /> Contraseña
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={locked}
                            maxLength={128}
                            autoComplete="current-password"
                            aria-label="Contraseña"
                            style={{
                                padding: '1rem 1.25rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)',
                                borderRadius: '14px',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease',
                                opacity: locked ? 0.5 : 1
                            }}
                        />
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            role="alert"
                            style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700, background: 'rgba(241, 91, 181, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(241, 91, 181, 0.2)' }}
                        >
                            {error}
                        </motion.p>
                    )}

                    <motion.button
                        whileHover={!locked ? { scale: 1.02, boxShadow: '0 0 20px var(--primary-glow)' } : {}}
                        whileTap={!locked ? { scale: 0.98 } : {}}
                        type="submit"
                        disabled={loading || locked}
                        aria-busy={loading}
                        style={{
                            height: '60px',
                            background: locked ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                            color: locked ? 'rgba(255,255,255,0.3)' : '#000',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '1rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            cursor: locked ? 'not-allowed' : 'pointer',
                            marginTop: '0.5rem',
                            boxShadow: locked ? 'none' : '0 10px 20px rgba(0, 242, 254, 0.2)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {loading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '22px', height: '22px', border: '3px solid rgba(0,0,0,0.1)', borderTop: '3px solid #000', borderRadius: '50%' }} />
                        ) : locked ? (
                            <>🔒 ACCESO BLOQUEADO</>
                        ) : (
                            <>INICIAR SISTEMA <LogIn size={20} /></>
                        )}
                    </motion.button>
                </form>

                <div style={{ marginTop: '3.5rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
                        SisFact Pro · Auditoría Médica Segura
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
