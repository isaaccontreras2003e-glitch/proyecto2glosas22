import React from 'react';
import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';

export const InteractiveLogo = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="interactive-logo-container"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(0, 177, 113, 0.05), rgba(0, 99, 65, 0.05))',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                width: '100%',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow-md)',
                cursor: 'default',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Dashed Animated Rings - EMERALD VIBRANCY */}
            <div style={{ position: 'relative', width: '70px', height: '70px', marginBottom: '0.75rem' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '2px dashed var(--secondary)',
                        filter: 'drop-shadow(0 0 8px var(--secondary-glow))',
                    }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: 'absolute',
                        inset: '6px',
                        borderRadius: '50%',
                        border: '1.5px dashed var(--primary)',
                        filter: 'drop-shadow(0 0 8px var(--primary-glow))',
                    }}
                />

                {/* Central Icon */}
                <motion.div
                    whileHover={{ scale: 1.15, rotate: 15 }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer'
                    }}
                >
                    <Search size={20} color="var(--secondary)" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 3px var(--secondary-glow))' }} />
                    <motion.div
                        animate={{ scale: [1, 1.3, 1], filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '-3px',
                            background: 'var(--primary)',
                            borderRadius: '4px',
                            padding: '1px',
                            boxShadow: '0 0 8px var(--primary-glow)',
                            zIndex: 2
                        }}
                    >
                        <Check size={10} color="#fff" strokeWidth={4} />
                    </motion.div>
                </motion.div>
            </div>

            {/* Brand Text - COMPACT & EMERALD */}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <h2 style={{
                    fontSize: '0.75rem',
                    fontWeight: 950,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    lineHeight: 1
                }}>
                    GESTIÓN DE
                </h2>
                <motion.span
                    animate={{ opacity: [1, 0.8, 1], scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                        color: 'var(--primary)',
                        textShadow: '0 0 10px var(--primary-glow)',
                        fontSize: '0.9rem',
                        fontWeight: 1000,
                        display: 'block',
                        marginTop: '0.1rem'
                    }}
                >
                    GLOSAS
                </motion.span>
                <p style={{
                    fontSize: '0.35rem',
                    fontWeight: 800,
                    color: 'var(--secondary)',
                    marginTop: '0.25rem',
                    letterSpacing: '0.15rem',
                    textTransform: 'uppercase'
                }}>
                    PLATFORM V4.0 PREMIUM
                </p>
            </div>

            {/* Ambient Glow background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, rgba(0, 177, 113, 0.1), transparent 70%)',
                pointerEvents: 'none'
            }}></div>
        </motion.div>
    );
};
