import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    style?: React.CSSProperties;
    headerAction?: React.ReactNode;
}

export const Card = ({ children, className = '', title, style, headerAction }: CardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card ${className}`}
            style={style}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                {title && <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{title}</h3>}
                {headerAction && <div>{headerAction}</div>}
            </div>
            {children}
        </motion.div>
    );
};
