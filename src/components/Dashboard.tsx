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
        y: 100 - (val / 150) * 80 - 10
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

    // Simulated data for the wave chart
    const waveData = [40, 60, 45, 70, 55, 85, 70, 95, 80, 110, 90, 105];

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
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 700, margin: 0 }}>Ingresos Mensuales</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', margin: 0 }}>
                            ${formatPesos(executiveStats.totalGlosado)}
                        </h2>
                        <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700 }}>+12.5% <span style={{ opacity: 0.5, fontWeight: 500 }}>vs. mes anterior</span></span>
                    </div>
                </div>

                <Sparkline data={waveData} color="var(--primary)" />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem', fontWeight: 800 }}>
                    {['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN'].map(m => <span key={m}>{m}</span>)}
                </div>
            </Card>

            {/* Bottom Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {/* Demografía / Circular Chart */}
                <Card style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                            <motion.circle
                                cx="50" cy="50" r="40" fill="transparent"
                                stroke="var(--primary)" strokeWidth="12" strokeLinecap="round"
                                initial={{ strokeDasharray: "0 251.2" }}
                                animate={{ strokeDasharray: "150 251.2" }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                            />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>1.2k</span>
                            <span style={{ fontSize: '0.5rem', opacity: 0.4, fontWeight: 800 }}>TOTAL</span>
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={14} color="var(--primary)" /> Demografía
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { label: 'Gen Z', p: 60, color: 'var(--primary)' },
                                { label: 'Millennial', p: 25, color: 'var(--secondary)' },
                                { label: 'Otros', p: 15, color: 'rgba(255,255,255,0.2)' }
                            ].map(item => (
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

                {/* Ventas por Región / Horiz Bars */}
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={14} color="var(--primary)" /> Ventas por Categoría
                        </h4>
                        <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Ver todas</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {[
                            { label: 'Tarifas', val: '$12,400', p: 85, color: 'var(--primary)' },
                            { label: 'Soportes', val: '$8,200', p: 65, color: 'var(--secondary)' },
                            { label: 'RIPS', val: '$5,900', p: 45, color: 'rgba(79, 172, 254, 0.5)' }
                        ].map(item => (
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

            {/* Recent Alerts List */}
            <Card style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>Alertas Recientes</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { title: 'Pico de tráfico detectado', time: 'Hace 5 minutos', sub: '+450% de lo normal', icon: <AlertTriangle size={14} />, color: 'var(--danger)' },
                        { title: 'Meta mensual alcanzada', time: 'Ayer', sub: '$45k / $45k', icon: <CheckCircle size={14} />, color: 'var(--success)' }
                    ].map((alert, idx) => (
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
                    ))}
                </div>
            </Card>
        </div>
    );
};

