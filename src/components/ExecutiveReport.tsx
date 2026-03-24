'use client';

import React from 'react';
import { Card } from './Card';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle, Clock, FileText, DollarSign } from 'lucide-react';

interface ExecutiveReportProps {
    stats: {
        totalGlosado: number;
        totalAceptado: number;
        totalNoAceptado: number;
        totalPendiente: number;
        totalRegistradoInterno: number;
        totalNoRegistrado: number;
        percentAceptado: number;
        percentRegistrado: number;
    };
}

const formatCurrency = (value: any) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
};

export const ExecutiveReport = ({ stats }: ExecutiveReportProps) => {
    const kpis = [
        {
            title: 'VALOR TOTAL GLOSADO',
            value: formatCurrency(stats.totalGlosado),
            icon: <TrendingUp size={24} />,
            color: 'var(--primary)',
            description: 'Total acumulado de glosas con registro interno'
        },
        {
            title: 'VALOR ACEPTADO',
            value: formatCurrency(stats.totalAceptado),
            icon: <CheckCircle size={24} />,
            color: 'var(--danger)',
            description: `${stats.percentAceptado}% de recuperación (PAGO)`
        },
        {
            title: 'PENDIENTE DE REGISTRO',
            value: formatCurrency(stats.totalNoRegistrado),
            icon: <Clock size={24} />,
            color: '#f59e0b',
            description: 'Valores en el sistema sin confirmación de registro interno'
        },
        {
            title: 'GESTIÓN TOTAL (POTENCIAL)',
            value: formatCurrency(stats.totalGlosado + stats.totalNoRegistrado),
            icon: <FileText size={24} />,
            color: 'var(--secondary)',
            description: 'Suma de registros internos + pendientes de registro'
        }
    ];

    return (
        <Card title="REPORTE EJECUTIVO DE GESTIÓN" style={{ marginBottom: '2rem' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                padding: '0.5rem'
            }}>
                {kpis.map((kpi, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        style={{
                            background: 'var(--bg-card)',
                            border: `1px solid var(--border)`,
                            borderLeft: `4px solid ${kpi.color}`,
                            padding: '1.5rem',
                            borderRadius: '1.5rem',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        {/* Background Decoration */}
                        <div style={{
                            position: 'absolute',
                            top: '-10%',
                            right: '-10%',
                            width: '100px',
                            height: '100px',
                            background: kpi.color,
                            opacity: 0.05,
                            borderRadius: '50%',
                            filter: 'blur(30px)'
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                background: kpi.color === 'var(--primary)' ? 'rgba(0, 99, 65, 0.1)' :
                                    kpi.color === 'var(--secondary)' ? 'rgba(0, 177, 113, 0.1)' :
                                        kpi.color === 'var(--danger)' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: kpi.color,
                                padding: '0.75rem',
                                borderRadius: '12px'
                            }}>
                                {kpi.icon}
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                                {kpi.title}
                            </span>
                        </div>

                        <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            {kpi.value}
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {kpi.description}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Resumen de Salud Financiera */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem 1.5rem',
                background: 'var(--bg-card)',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Efectividad</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conciliación</span>
                    </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    * Datos actualizados en tiempo real según registros en base de datos.
                </div>
            </div>
        </Card>
    );
};
