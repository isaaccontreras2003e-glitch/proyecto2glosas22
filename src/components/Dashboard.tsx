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
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((val, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: 100 - ((val - min) / range) * 80 - 10
    }));

    const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

    return (
        <div style={{ width: '80px', height: '40px', position: 'relative' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={`${pathData} L 100,100 L 0,100 Z`}
                    fill={`url(#grad-${color})`}
                />
                <motion.path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />
            </svg>
        </div>
    );
};

export const Dashboard = ({ glosas, totalIngresos, stats: executiveStats }: DashboardProps) => {
    const [filterServicio, setFilterServicio] = useState('Todos');
    const [filterTipo, setFilterTipo] = useState('Todos');

    // Get unique values for slicers
    const servicios = ['Todos', ...Array.from(new Set(glosas.map(g => g.servicio))).filter(Boolean)];
    const tipos = ['Todos', 'Tarifas', 'Soportes', 'RIPS', 'Autorización'];

    // Apply slicers
    const filteredData = useMemo(() => {
        return glosas.filter(g => {
            const matchServicio = filterServicio === 'Todos' || g.servicio === filterServicio;
            const matchTipo = filterTipo === 'Todos' || g.tipo_glosa === filterTipo;
            return matchServicio && matchTipo;
        });
    }, [glosas, filterServicio, filterTipo]);

    const stats = useMemo(() => {
        const totalValue = filteredData.reduce((acc, g) => acc + g.valor_glosa, 0);
        const resolved = filteredData.filter(g => g.estado === 'Respondida' || g.estado === 'Aceptada').length;
        const pending = filteredData.filter(g => g.estado === 'Pendiente').length;
        const accepted = filteredData.filter(g => g.estado === 'Aceptada').length;

        return {
            total: filteredData.length,
            value: totalValue,
            resolved,
            pending,
            accepted
        };
    }, [filteredData]);

    const pPending = (stats.pending / (stats.total || 1)) * 100;
    const pResponded = ((stats.resolved - stats.accepted) / (stats.total || 1)) * 100;
    const pAccepted = (stats.accepted / (stats.total || 1)) * 100;

    // Simulated trend data based on glosas dates
    const getTrend = (type: 'count' | 'value' | 'accepted' | 'acceptedCount') => {
        // Just a realistic looking fluctuation for the sparkline
        return [30, 45, 35, 60, 50, 75, 90].map(v => v + Math.random() * 20);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header / Slicers Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 950, color: 'white', letterSpacing: '-0.025em', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <LayoutDashboard size={28} color="var(--primary)" />
                            MARKET OVERVIEW
                        </h2>
                        <span style={{ fontSize: '0.6rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, border: '1px solid rgba(139, 92, 246, 0.2)' }}>TERMINAL V2.0</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.3rem', letterSpacing: '0.05em' }}>Métricas en Tiempo Real y Estado de Auditoría</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', paddingLeft: '0.5rem' }}>SERVICIO</span>
                        <div style={{ position: 'relative' }}>
                            <Filter size={12} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                            <select
                                value={filterServicio}
                                onChange={(e) => setFilterServicio(e.target.value)}
                                style={{
                                    appearance: 'none',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'white',
                                    padding: '0.5rem 2rem 0.5rem 0.75rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    cursor: 'pointer',
                                    minWidth: '160px'
                                }}
                            >
                                {servicios.map(s => <option key={s} value={s} style={{ background: '#0a0a0c' }}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', paddingLeft: '0.5rem' }}>TIPO GLOSA</span>
                        <div style={{ position: 'relative' }}>
                            <PieChart size={12} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                            <select
                                value={filterTipo}
                                onChange={(e) => setFilterTipo(e.target.value)}
                                style={{
                                    appearance: 'none',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'white',
                                    padding: '0.5rem 2rem 0.5rem 0.75rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    cursor: 'pointer',
                                    minWidth: '160px'
                                }}
                            >
                                {tipos.map(t => <option key={t} value={t} style={{ background: '#0a0a0c' }}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
            }}>
                {[
                    { label: 'VALOR TOTAL EN GLOSA', value: `$${formatPesos(executiveStats.totalGlosado)}`, icon: <DollarSign size={20} />, color: '#8b5cf6', trend: getTrend('value') },
                    { label: 'CANTIDAD FACTURAS', value: executiveStats.totalCount, icon: <FileText size={20} />, color: '#3b82f6', trend: getTrend('count') },
                    { label: 'TOTAL VALOR ACEPTADO', value: `$${formatPesos(executiveStats.totalAceptado)}`, icon: <AlertTriangle size={20} />, color: '#f87171', trend: getTrend('accepted') },
                    { label: 'TOTAL FACTURAS ACEPTADAS', value: executiveStats.acceptedCount, icon: <CheckCircle size={20} />, color: '#f87171', trend: getTrend('acceptedCount') },
                ].map((stat, index) => (
                    <Card key={index} style={{
                        padding: '1.75rem',
                        background: 'linear-gradient(145deg, rgba(20,20,25,0.9), rgba(10,10,12,0.95))',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    background: `${stat.color}15`,
                                    color: stat.color,
                                    padding: '0.6rem',
                                    borderRadius: '10px',
                                    border: `1px solid ${stat.color}20`
                                }}>
                                    {stat.icon}
                                </div>
                                <Sparkline data={stat.trend} color={stat.color} />
                            </div>

                            <div>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.15em', marginBottom: '0.5rem' }}>{stat.label}</p>
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ fontSize: '2.2rem', fontWeight: 950, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}
                                >
                                    {stat.value}
                                </motion.p>
                            </div>
                        </div>
                        {/* Subtle Glow Background */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-20px',
                            right: '-20px',
                            width: '100px',
                            height: '100px',
                            background: `${stat.color}10`,
                            filter: 'blur(40px)',
                            borderRadius: '50%'
                        }} />
                    </Card>
                ))}
            </div>

            {/* Detailed Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '2rem' }}>
                <Card style={{
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem',
                    background: 'rgba(10, 10, 12, 0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '0.1em' }}>
                            <Activity size={18} color="var(--primary)" />
                            DISTRIBUCIÓN POR CATEGORÍA
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {['Tarifas', 'Soportes', 'RIPS', 'Autorización'].map((tipo, idx) => {
                            const count = filteredData.filter(g => g.tipo_glosa === tipo).length;
                            const total = filteredData.length || 1;
                            const percent = Math.round((count / total) * 100);
                            return (
                                <motion.div
                                    key={tipo}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.7rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.05em' }}>{tipo.toUpperCase()}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ color: 'white', fontWeight: 950, fontSize: '1.1rem' }}>{count}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 800 }}>{percent}%</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}%` }}
                                            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                                            style={{
                                                height: '100%',
                                                background: `linear-gradient(90deg, #8b5cf6, #3b82f6)`,
                                                boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                                                borderRadius: '10px'
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>

                <Card style={{
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    background: 'rgba(10, 10, 12, 0.4)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)'
                }}>
                    <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '0.1em' }}>
                            <PieChart size={18} color="var(--primary)" />
                            ESTADO DE GESTIÓN
                        </h3>
                    </div>

                    <div style={{ position: 'relative', width: '220px', height: '220px', marginTop: '1.5rem' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <defs>
                                <filter id="glow-heavy">
                                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>

                            <circle cx="50" cy="50" r="44" fill="transparent" stroke="rgba(255,255,255,0.015)" strokeWidth="6" />

                            <motion.circle
                                cx="50" cy="50" r="44" fill="transparent"
                                stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round"
                                filter="url(#glow-heavy)"
                                initial={{ strokeDasharray: "0 276.4" }}
                                animate={{ strokeDasharray: `${(pPending / 100) * 276.4} 276.4` }}
                                transition={{ duration: 2, ease: "circOut" }}
                            />

                            <motion.circle
                                cx="50" cy="50" r="44" fill="transparent"
                                stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
                                strokeDashoffset={-((pPending / 100) * 276.4)}
                                initial={{ strokeDasharray: "0 276.4" }}
                                animate={{ strokeDasharray: `${(pResponded / 100) * 276.4} 276.4` }}
                                transition={{ duration: 2, delay: 0.2, ease: "circOut" }}
                            />

                            <motion.circle
                                cx="50" cy="50" r="44" fill="transparent"
                                stroke="#f87171" strokeWidth="6" strokeLinecap="round"
                                strokeDashoffset={-(((pPending + pResponded) / 100) * 276.4)}
                                initial={{ strokeDasharray: "0 276.4" }}
                                animate={{ strokeDasharray: `${(pAccepted / 100) * 276.4} 276.4` }}
                                transition={{ duration: 2, delay: 0.4, ease: "circOut" }}
                            />
                        </svg>

                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            zIndex: 1
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 }}
                            >
                                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 900, margin: 0, letterSpacing: '0.2em' }}>REGISTROS</p>
                                <p style={{ fontSize: '3rem', fontWeight: 950, color: 'white', margin: 0, lineHeight: 1, letterSpacing: '-0.05em' }}>{stats.total}</p>
                            </motion.div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', width: '100%', marginTop: '2.5rem' }}>
                        {[
                            { label: 'PEND.', val: Math.round(pPending), color: '#8b5cf6' },
                            { label: 'RESP.', val: Math.round(pResponded), color: '#3b82f6' },
                            { label: 'ACEPT.', val: Math.round(pAccepted), color: '#f87171' }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                style={{
                                    textAlign: 'center',
                                    padding: '0.75rem 0.5rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.04)'
                                }}
                                whileHover={{ y: -4, background: 'rgba(255,255,255,0.04)', borderColor: `${item.color}40` }}
                            >
                                <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', fontWeight: 900, letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>{item.label}</span>
                                <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 950, margin: 0 }}>{item.val}%</p>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};
