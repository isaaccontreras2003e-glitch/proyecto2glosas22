import React from 'react';
import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';

export const InteractiveLogo = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="interactive-logo-container"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '450px',
                margin: '0 auto 2rem auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
        >
            {/* Dashed Animated Rings */}
            <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '1.5rem' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '2px dashed rgba(0, 242, 254, 0.2)',
                    }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: 'absolute',
                        inset: '20px',
                        borderRadius: '50%',
                        border: '1.5px dashed rgba(59, 130, 246, 0.3)',
                    }}
                />

                {/* Central Square Icon */}
                <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100px',
                        height: '100px',
                        background: 'rgba(20, 20, 30, 0.8)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(0, 242, 254, 0.1)',
                        cursor: 'pointer'
                    }}
                >
                    <motion.div
                        animate={{
                            y: [0, -5, 0],
                            rotate: [0, 5, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        style={{ position: 'relative' }}
                    >
                        <Search size={48} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' }} />
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: 'spring' }}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                background: 'var(--primary)',
                                borderRadius: '4px',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 15px var(--primary-glow)'
                            }}
                        >
                            <Check size={18} color="#000" strokeWidth={4} />
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Brand Text */}
            <div style={{ textAlign: 'center', zIndex: 1 }}>
                <h2 style={{
                    fontSize: '2.2rem',
                    fontWeight: 950,
                    color: 'white',
                    margin: 0,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                }}>
                    GESTIÓN DE <motion.span
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ color: 'var(--primary)', textShadow: '0 0 20px var(--primary-glow)' }}
                    >
                        GLOSAS
                    </motion.span>
                </h2>
                <p style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'rgba(56, 189, 248, 0.6)',
                    marginTop: '0.5rem',
                    letterSpacing: '0.2rem',
                    textTransform: 'uppercase'
                }}>
                    MEDICAL BILLING & AUDIT PLATFORM
                </p>
            </div>

            {/* Hover to Interact Pill */}
            <motion.div
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.05)' }}
                style={{
                    marginTop: '2rem',
                    padding: '0.6rem 1.5rem',
                    borderRadius: '100px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'default'
                }}
            >
                HOVER TO INTERACT
            </motion.div>

            {/* Decorative Glow */}
            <div style={{
                position: 'absolute',
                bottom: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '200px',
                height: '100px',
                background: 'var(--primary)',
                filter: 'blur(100px)',
                opacity: 0.1,
                pointerEvents: 'none'
            }}></div>
        </motion.div>
    );
};
