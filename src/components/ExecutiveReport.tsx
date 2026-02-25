'use client';

import React from 'react';
import { Card } from './Card';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle, Clock, FileText, DollarSign } from 'lucide-react';

interface ExecutiveReportProps {
    stats: {
        totalGlosado: number;
        totalAceptado: number;
        totalPendiente: number;
        totalRegistradoInterno: number;
        percentAceptado: number;
        percentRegistrado: number;
    };
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const ExecutiveReport = ({ stats }: ExecutiveReportProps) => {
    const kpis = [
        {
            title: 'VALOR TOTAL GLOSADO',
            value: formatCurrency(stats.totalGlosado),
            icon: <TrendingUp size={24} />,
            color: '#8b5cf6',
            description: 'Total acumulado de glosas registradas'
        },
        {
            title: 'VALOR ACEPTADO',
            value: formatCurrency(stats.totalAceptado),
            icon: <CheckCircle size={24} />,
            color: '#10b981',
            description: `${stats.percentAceptado}% de efectividad en respuesta`
        },
        {
            title: 'VALORES EN PENDIENTE',
            value: formatCurrency(stats.totalPendiente),
            icon: <Clock size={24} />,
            color: '#f59e0b',
            description: 'Saldo pendiente por gestionar/conciliar'
        },
        {
            title: 'FACTURAS REGISTRADAS',
            value: formatCurrency(stats.totalRegistradoInterno),
            icon: <FileText size={24} />,
            color: '#3b82f6',
            description: `${stats.percentRegistrado}% del valor total conciliado en sistema`
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
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid rgba(255,255,255,0.05)`,
                            borderLeft: `4px solid ${kpi.color}`,
                            padding: '1.5rem',
                            borderRadius: '1.5rem',
                            position: 'relative',
                            overflow: 'hidden'
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
                                background: `rgba(${kpi.color === '#8b5cf6' ? '139, 92, 246' :
                                    kpi.color === '#10b981' ? '16, 185, 129' :
                                        kpi.color === '#f59e0b' ? '245, 158, 11' : '59, 130, 246'}, 0.1)`,
                                color: kpi.color,
                                padding: '0.75rem',
                                borderRadius: '12px'
                            }}>
                                {kpi.icon}
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
                                {kpi.title}
                            </span>
                        </div>

                        <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white', marginBottom: '0.5rem' }}>
                            {kpi.value}
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                            {kpi.description}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Resumen de Salud Financiera */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem 1.5rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Efectividad</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Conciliación</span>
                    </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                    * Datos actualizados en tiempo real según registros en base de datos.
                </div>
            </div>
        </Card>
    );
};
