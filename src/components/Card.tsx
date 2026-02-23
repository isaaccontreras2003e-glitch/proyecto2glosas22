import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    style?: React.CSSProperties;
}

export const Card = ({ children, className = '', title, style }: CardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card ${className}`}
            style={style}
        >
            {title && <h3 style={{ marginBottom: '1.25rem', fontSize: '1.125rem' }}>{title}</h3>}
            {children}
        </motion.div>
    );
};
