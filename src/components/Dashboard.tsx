import React from 'react';
import { motion } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { Card } from './Card';

const formatPesos = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface DashboardProps {
    totalCount: number;
    totalValue: number;
    pendingCount: number;
    respondedCount: number;
    acceptedCount: number;
    totalIngresos: number;
}

export const Dashboard = ({ totalCount, totalValue, pendingCount, respondedCount, acceptedCount, totalIngresos }: DashboardProps) => {
    const stats = [
        { label: 'Total Glosas', value: totalCount, icon: <FileText size={22} />, color: '#8b5cf6' },
        { label: 'Valor Glosado', value: `$${formatPesos(totalValue)}`, icon: <DollarSign size={22} />, color: '#3b82f6' },
        { label: 'Valores Aceptados', value: `$${formatPesos(totalIngresos)}`, icon: <TrendingUp size={22} />, color: '#ef4444' },
        { label: 'Glosas Respondidas', value: respondedCount, icon: <CheckCircle size={22} />, color: '#10b981' },
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem'
        }}>
            {stats.map((stat, index) => (
                <Card key={index} className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{
                            background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                            color: stat.color,
                            padding: '1rem',
                            borderRadius: '1rem',
                            display: 'flex',
                            boxShadow: `0 0 15px ${stat.color}15`,
                            border: `1px solid ${stat.color}20`
                        }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{stat.label}</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.025em' }}>{stat.value}</p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};
