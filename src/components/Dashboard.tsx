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

export const Dashboard = ({ glosas: allGlosas, totalIngresos, stats: executiveStats }: DashboardProps) => {
    const [selectedService, setSelectedService] = useState('Todos los Servicios');

    // Filter logic
    const glosas = useMemo(() => {
        if (selectedService === 'Todos los Servicios') return allGlosas;
        return allGlosas.filter(g => g.servicio === selectedService);
    }, [allGlosas, selectedService]);

    // Format for M abbreviations like screenshot
    const formatM = (val: number) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
        return `$${val}`;
    };

    // Calculate metrics based on filtered data
    const metrics = useMemo(() => {
        const glosado = glosas.reduce((acc, curr) => acc + curr.valor_glosa, 0);
        const aceptado = glosas.filter(g => g.estado === 'Aceptada').reduce((acc, curr) => acc + curr.valor_glosa, 0);
        const countGlosadas = glosas.length;
        const countAceptadas = glosas.filter(g => g.estado === 'Aceptada').length;

        return { glosado, aceptado, countGlosadas, countAceptadas };
    }, [glosas]);

    // Category Distribution (Administrative, Medical, Technical)
    const typeAnalysis = useMemo(() => {
        const types = [
            { label: 'Administrativa', color: 'var(--primary)' },
            { label: 'Médica', color: 'var(--secondary)' },
            { label: 'Técnica', color: 'rgba(255,255,255,0.2)' }
        ];
        const total = glosas.length || 1;

        return types.map(t => {
            const count = glosas.filter(g => g.tipo_glosa === t.label).length;
            return {
                ...t,
                p: Math.round((count / total) * 100)
            };
        });
    }, [glosas]);

    // Status Summary for Donut
    const statusSummary = useMemo(() => {
        const total = glosas.length || 1;
        const responded = glosas.filter(g => g.estado === 'Respondida').length;
        const accepted = glosas.filter(g => g.estado === 'Aceptada').length;
        const pending = glosas.filter(g => g.estado === 'Pendiente').length;

        return [
            { label: 'Respondidas', p: Math.round((responded / total) * 100), color: 'var(--secondary)' },
            { label: 'Aceptadas', p: Math.round((accepted / total) * 100), color: 'var(--primary)' },
            { label: 'Pendientes', p: Math.round((pending / total) * 100), color: 'rgba(255,255,255,0.2)' }
        ];
    }, [glosas]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Executive Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <LayoutDashboard size={24} color="var(--primary)" /> Gestión de Glosas
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 600, margin: '4px 0 0 0' }}>Dashboard Administrativo</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                        <Activity size={18} color="rgba(255,255,255,0.4)" />
                    </div>
                </div>
            </div>

            {/* Service Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {['Todos los Servicios', 'Urgencias', 'Hospitalización', 'Cirugía'].map(s => (
                    <button
                        key={s}
                        onClick={() => setSelectedService(s)}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: selectedService === s ? 'var(--primary)' : 'var(--border)',
                            background: selectedService === s ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                            color: selectedService === s ? '#000' : 'white',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Main Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <Card style={{ padding: '2rem', background: 'rgba(0, 242, 254, 0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800 }}>+12.4%</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>Valor Glosado</p>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 950, margin: '0.5rem 0', color: 'white' }}>{formatM(metrics.glosado)}</h2>
                    <div style={{ height: '40px', borderTop: '1px solid var(--border)', marginTop: '2rem', display: 'flex', alignItems: 'center' }}>
                        <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>{metrics.countGlosadas.toLocaleString()}</p>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, margin: '0 0 0 8px', textTransform: 'uppercase' }}>Facturas Glosadas</p>
                    </div>
                </Card>

                <Card style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <CheckCircle size={20} color="var(--secondary)" />
                        <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 800 }}>+8.1%</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>Valor Aceptado</p>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 950, margin: '0.5rem 0', color: 'white' }}>{formatM(metrics.aceptado)}</h2>
                    <div style={{ height: '40px', borderTop: '1px solid var(--border)', marginTop: '2rem', display: 'flex', alignItems: 'center' }}>
                        <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>{metrics.countAceptadas.toLocaleString()}</p>
                        <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, margin: '0 0 0 8px', textTransform: 'uppercase' }}>Facturas Aceptadas</p>
                    </div>
                </Card>
            </div>

            {/* Bottom Analysis Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Card style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, margin: 0 }}>Glosas por Tipo</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        {typeAnalysis.map(t => (
                            <div key={t.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                                    <span style={{ opacity: 0.6 }}>{t.label}</span>
                                    <span style={{ color: t.color }}>{t.p}%</span>
                                </div>
                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${t.p}%` }}
                                        style={{ height: '100%', background: t.color, borderRadius: '10px', boxShadow: `0 0 10px ${t.color}40` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                    <Card style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '2.5rem' }}>Estado de Glosas</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                            <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                                    {statusSummary.map((s, i) => {
                                        let offset = 0;
                                        for (let j = 0; j < i; j++) offset += statusSummary[j].p;
                                        return (
                                            <motion.circle
                                                key={s.label}
                                                cx="50" cy="50" r="40" fill="transparent"
                                                stroke={s.color} strokeWidth="10" strokeLinecap="round"
                                                strokeDasharray={`${(s.p / 100) * 251.2} 251.2`}
                                                strokeDashoffset={-((offset / 100) * 251.2)}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            />
                                        );
                                    })}
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 950 }}>{(glosas.length / 1000).toFixed(1)}k</span>
                                    <span style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 800 }}>TOTAL</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {statusSummary.map(s => (
                                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{s.label}</span>
                                            <span style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 700 }}>{s.p}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '2rem' }}>Actividad Reciente</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {glosas.slice(0, 3).map((g, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={16} color="var(--primary)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0 }}>Factura #{g.factura}</p>
                                        <p style={{ fontSize: '0.6rem', opacity: 0.4, margin: '2px 0 0 0' }}>{g.tipo_glosa}</p>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 900, margin: 0 }}>{formatM(g.valor_glosa)}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

