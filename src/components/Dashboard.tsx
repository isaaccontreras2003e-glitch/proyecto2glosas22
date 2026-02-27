import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle, TrendingUp, Filter, PieChart, Activity, ChevronDown, AlertTriangle, LayoutDashboard } from 'lucide-react';
// Build Trigger: v2.0.1 - Redesign Force Sync
import { Card } from './Card';

const formatPesos = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface Glosa {
    id: string;
    factura: string;
    servicio: string;
    orden_servicio: string;
    valor_glosa: number;
    descripcion: string;
    tipo_glosa: string;
    estado: string;
    fecha: string;
}

interface DashboardProps {
    glosas: Glosa[];
    totalIngresos: number;
    stats: {
        totalGlosado: number;
        totalAceptado: number;
        totalPendiente: number;
        totalRegistradoInterno: number;
        percentAceptado: number;
        percentRegistrado: number;
        totalCount: number;
        acceptedCount: number;
    };
}

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    const points = data.map((val, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: 100 - (val / 100) * 80 - 10
    }));

    const pathData = `M 0,100 ${points.map(p => `L ${p.x},${p.y}`).join(' ')} L 100,100 Z`;
    const lineData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

    return (
        <div style={{ width: '100%', height: '120px', position: 'relative', marginTop: '1rem' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                <motion.path
                    d={pathData}
                    fill={`url(#grad-${color})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                />
                <motion.path
                    d={lineData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                />
            </svg>
        </div>
    );
};

export const Dashboard = ({ glosas, totalIngresos, stats: executiveStats }: DashboardProps) => {
    const [filterTime, setFilterTime] = useState('Mensual');

    // 1. Calculate Monthly Tendency (Wave Chart)
    const monthlyData = useMemo(() => {
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            last6Months.push({
                key: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`,
                label: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()
            });
        }

        const values = last6Months.map(m => {
            return glosas
                .filter(g => g.fecha?.startsWith(m.key))
                .reduce((acc, curr) => acc + curr.valor_glosa, 0);
        });

        const maxVal = Math.max(...values, 1000);
        const normalized = values.map(v => (v / maxVal) * 100);

        return { labels: last6Months.map(m => m.label), values: normalized, rawValues: values };
    }, [glosas]);

    // 2. Calculate Service/Category Distribution (for Horizontal Bars)
    const typeDistribution = useMemo(() => {
        const types = ['Tarifas', 'Soportes', 'RIPS', 'Autorización'];
        const colors = ['var(--primary)', 'var(--secondary)', 'rgba(79, 172, 254, 0.5)', 'rgba(0, 242, 254, 0.3)'];

        return types.map((type, i) => {
            const value = glosas.filter(g => g.tipo_glosa === type).reduce((acc, curr) => acc + curr.valor_glosa, 0);
            const count = glosas.filter(g => g.tipo_glosa === type).length;
            const total = glosas.length || 1;
            return {
                label: type,
                val: `$${formatPesos(value)}`,
                p: Math.round((count / total) * 100),
                color: colors[i]
            };
        }).sort((a, b) => b.p - a.p);
    }, [glosas]);

    // 3. Calculate Management Status (for Circular Chart)
    const statusStats = useMemo(() => {
        const total = glosas.length || 1;
        const pending = glosas.filter(g => g.estado === 'Pendiente').length;
        const responded = glosas.filter(g => g.estado === 'Respondida').length;
        const accepted = glosas.filter(g => g.estado === 'Aceptada').length;

        return [
            { label: 'Pendiente', p: Math.round((pending / total) * 100), color: 'var(--primary)' },
            { label: 'Respondida', p: Math.round((responded / total) * 100), color: 'var(--secondary)' },
            { label: 'Aceptada', p: Math.round((accepted / total) * 100), color: 'var(--success)' }
        ];
    }, [glosas]);

    // 4. Recent Activity
    const recentAlerts = useMemo(() => {
        return glosas
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .slice(0, 3)
            .map(g => ({
                title: `Glosa ${g.factura}`,
                time: new Date(g.fecha).toLocaleDateString(),
                sub: `${g.tipo_glosa} - $${formatPesos(g.valor_glosa)}`,
                icon: g.estado === 'Pendiente' ? <Clock size={14} /> : (g.estado === 'Aceptada' ? <CheckCircle size={14} /> : <Activity size={14} />),
                color: g.estado === 'Pendiente' ? 'var(--warning)' : (g.estado === 'Aceptada' ? 'var(--success)' : 'var(--primary)')
            }));
    }, [glosas]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Period Selector Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {['Diario', 'Semanal', 'Mensual'].map(p => (
                    <button
                        key={p}
                        onClick={() => setFilterTime(p)}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '20px',
                            border: 'none',
                            background: filterTime === p ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: filterTime === p ? '#000' : 'rgba(255,255,255,0.6)',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Main Wave Chart Card */}
            <Card style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 700, margin: 0 }}>Glosas Mensuales (Valor)</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', margin: 0 }}>
                            ${formatPesos(executiveStats.totalGlosado)}
                        </h2>
                        <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700 }}>AUDITORÍA VIVA</span>
                    </div>
                </div>

                <Sparkline data={monthlyData.values} color="var(--primary)" />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', fontWeight: 800 }}>
                    {monthlyData.labels.map(m => <span key={m}>{m}</span>)}
                </div>
            </Card>

            {/* Bottom Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {/* Gestión Status / Circular Chart */}
                <Card style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                            {statusStats.map((s, i) => {
                                let offset = 0;
                                for (let j = 0; j < i; j++) offset += statusStats[j].p;
                                return (
                                    <motion.circle
                                        key={s.label}
                                        cx="50" cy="50" r="40" fill="transparent"
                                        stroke={s.color} strokeWidth="12" strokeLinecap="round"
                                        strokeDasharray={`${(s.p / 100) * 251.2} 251.2`}
                                        strokeDashoffset={-((offset / 100) * 251.2)}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 1, delay: i * 0.2 }}
                                    />
                                );
                            })}
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{glosas.length}</span>
                            <span style={{ fontSize: '0.5rem', opacity: 0.4, fontWeight: 800 }}>TOTAL</span>
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={14} color="var(--primary)" /> Gestión de Glosas
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {statusStats.map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color }} />
                                        <span style={{ opacity: 0.6, fontWeight: 700 }}>{item.label}</span>
                                    </div>
                                    <span style={{ fontWeight: 900 }}>{item.p}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Distribución por Categoría / Horiz Bars */}
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={14} color="var(--primary)" /> Distribución por Categoría
                        </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {typeDistribution.map(item => (
                            <div key={item.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                                    <span style={{ opacity: 0.4 }}>{item.label}</span>
                                    <span>{item.val}</span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.p}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        style={{ height: '100%', background: item.color, borderRadius: '10px' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Recent Activity List */}
            <Card style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Actividad Reciente</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {recentAlerts.length > 0 ? recentAlerts.map((alert, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${alert.color}15`, color: alert.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {alert.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0 }}>{alert.title}</p>
                                <p style={{ fontSize: '0.6rem', opacity: 0.4, margin: '2px 0 0 0' }}>{alert.time} • {alert.sub}</p>
                            </div>
                            <ChevronDown size={14} style={{ transform: 'rotate(-90deg)', opacity: 0.2 }} />
                        </div>
                    )) : (
                        <p style={{ fontSize: '0.7rem', opacity: 0.4, textAlign: 'center' }}>No hay actividad reciente</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

