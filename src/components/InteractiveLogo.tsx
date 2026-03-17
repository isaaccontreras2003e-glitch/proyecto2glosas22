import React from 'react';
import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';

export const InteractiveLogo = () => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="interactive-logo-container"
            style={{
                position: 'fixed',
                top: '1.5rem',
                right: '1.5rem',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1rem',
                background: 'rgba(15, 15, 25, 0.7)',
                backdropFilter: 'blur(12px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '180px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0, 242, 254, 0.1)',
                pointerEvents: 'auto'
            }}
        >
            {/* Dashed Animated Rings - MORE VIBRANT */}
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '0.75rem' }}>
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                    transition={{
                        rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                        scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '2px dashed #00f2fe',
                        boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)',
                    }}
                />
                <motion.div
                    animate={{ rotate: -360, scale: [1, 1.1, 1] }}
                    transition={{
                        rotate: { duration: 7, repeat: Infinity, ease: "linear" },
                        scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }}
                    style={{
                        position: 'absolute',
                        inset: '8px',
                        borderRadius: '50%',
                        border: '1.5px dashed #ff00ff',
                        boxShadow: '0 0 15px rgba(255, 0, 255, 0.4)',
                    }}
                />

                {/* Central Icon */}
                <motion.div
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '44px',
                        height: '44px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer'
                    }}
                >
                    <Search size={24} color="#00f2fe" style={{ filter: 'drop-shadow(0 0 8px #00f2fe)' }} />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: '#ff00ff',
                            borderRadius: '4px',
                            padding: '1px',
                            boxShadow: '0 0 10px #ff00ff'
                        }}
                    >
                        <Check size={10} color="#fff" strokeWidth={4} />
                    </motion.div>
                </motion.div>
            </div>

            {/* Brand Text - COMPACT & VIBRANT */}
            <div style={{ textAlign: 'center' }}>
                <h2 style={{
                    fontSize: '0.8rem',
                    fontWeight: 950,
                    color: 'white',
                    margin: 0,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                }}>
                    GESTIÓN DE <span style={{ color: '#00f2fe', textShadow: '0 0 10px #00f2fe' }}>GLOSAS</span>
                </h2>
                <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{
                        fontSize: '0.4rem',
                        fontWeight: 800,
                        color: '#ff00ff',
                        marginTop: '0.2rem',
                        letterSpacing: '0.1rem',
                        textTransform: 'uppercase'
                    }}
                >
                    AUDIT PLATFORM V4
                </motion.p>
            </div>
        </motion.div>
    );
};
