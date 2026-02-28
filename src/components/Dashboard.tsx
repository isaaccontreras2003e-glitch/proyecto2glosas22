import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle, TrendingUp, Filter, PieChart, Activity, ChevronDown, AlertTriangle, LayoutDashboard } from 'lucide-react';
// Build Trigger: v2.0.2 - Redesign Force Sync REFRESH
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
        totalNoAceptado: number;
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
    const [selectedService, setSelectedService] = useState('Todos');
    const [selectedType, setSelectedType] = useState('Todos');

    // 0. Extract unique services dynamically from data
    const availableServices = useMemo(() => {
        const services = Array.from(new Set(allGlosas.map(g => g.servicio).filter(Boolean)));
        return ['Todos', ...services.sort()];
    }, [allGlosas]);

    // 1. Filter logic
    const glosas = useMemo(() => {
        return allGlosas.filter(g => {
            const matchService = selectedService === 'Todos' || g.servicio === selectedService;
            const matchType = selectedType === 'Todos' || g.tipo_glosa === selectedType;
            return matchService && matchType;
        });
    }, [allGlosas, selectedService, selectedType]);

    // 2. Metrics for the 4 Cards
    const metrics = useMemo(() => {
        const totalValue = glosas.reduce((acc, curr) => acc + curr.valor_glosa, 0);
        const totalCount = glosas.length;
        const acceptedValue = executiveStats.totalAceptado;
        const totalManagedValue = executiveStats.totalAceptado + executiveStats.totalNoAceptado;
        const acceptedCount = glosas.filter(g => g.estado === 'Aceptada').length;

        return {
            totalValue,
            totalCount,
            acceptedValue,
            totalManagedValue,
            acceptedCount,
            waves: { totalValue: [30, 45, 35, 60, 40, 70, 55], totalCount: [20, 30, 25, 40, 35, 50, 45], acceptedValue: [10, 20, 15, 30, 25, 40, 35], acceptedCount: [5, 10, 8, 15, 12, 20, 18] }
        };
    }, [glosas]);

    // 3. Category Bars
    const categories = useMemo(() => {
        const types = ['Tarifas', 'Soportes', 'RIPS', 'Autorización'];
        const total = glosas.length || 1;
        return types.map(t => {
            const count = glosas.filter(g => g.tipo_glosa === t).length;
            const p = Math.round((count / total) * 100);
            return { label: t, p, count };
        });
    }, [glosas]);

    // 4. Status Stats (Bottom legend)
    const statusStats = useMemo(() => {
        const total = glosas.length || 1;
        const pending = glosas.filter(g => g.estado === 'Pendiente').length;
        const responded = glosas.filter(g => g.estado === 'Respondida').length;
        const accepted = glosas.filter(g => g.estado === 'Aceptada').length;

        return [
            { label: 'PEND.', p: Math.round((pending / total) * 100), color: 'rgba(255,255,255,0.2)' },
            { label: 'RESP.', p: Math.round((responded / total) * 100), color: 'var(--primary)' },
            { label: 'ACEPT.', p: Math.round((accepted / total) * 100), color: '#ff4d4d' }
        ];
    }, [glosas]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Section from Screenshot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <LayoutDashboard size={20} color="var(--primary)" />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 950, color: 'white', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                        TABLERO DE MANDO - AUDITORÍA MÉDICA
                        <span style={{ fontSize: '0.55rem', background: 'var(--primary)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.75rem', verticalAlign: 'middle', fontWeight: 900 }}>COI V3.0</span>
                    </h2>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>SERVICIO</label>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedService}
                                onChange={(e) => setSelectedService(e.target.value)}
                                style={{ background: 'rgba(20,20,30,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.4rem 2rem 0.4rem 0.75rem', color: 'white', fontSize: '0.75rem', fontWeight: 700, appearance: 'none', minWidth: '160px' }}
                            >
                                {availableServices.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                        </div>
                    </div>
                    <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>TIPO GLOSA</label>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                style={{ background: 'rgba(20,20,30,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.4rem 2rem 0.4rem 0.75rem', color: 'white', fontSize: '0.75rem', fontWeight: 700, appearance: 'none', minWidth: '160px' }}
                            >
                                <option>Todos</option>
                                <option>Tarifas</option>
                                <option>Soportes</option>
                                <option>RIPS</option>
                                <option>Autorización</option>
                            </select>
                            <Clock size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4 Cards Grid (FUNCTIONAL VERSION) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={16} color="var(--primary)" />
                        </div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 800 }}>
                            {metrics.totalManagedValue > 0 ? ((metrics.acceptedValue / metrics.totalManagedValue) * 100).toFixed(1) : 0}% ↑
                        </span>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>IMPORTE TOTAL GLOSADO</p>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 950, margin: '4px 0', color: 'white' }}>${formatPesos(metrics.totalValue)}</h2>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                            <div style={{ width: '70%', height: '100%', background: 'var(--primary)', borderRadius: '10px' }}></div>
                        </div>
                        <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px', fontWeight: 700 }}>RIESGO EN AUDITORÍA</p>
                    </div>
                </Card>

                <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={16} color="var(--secondary)" />
                        </div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--secondary)', fontWeight: 800 }}>PROYECTADO</span>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>TOTAL FACTURAS</p>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 950, margin: '4px 0', color: 'white' }}>{metrics.totalCount}</h2>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <p style={{ fontSize: '0.7rem', color: 'white', fontWeight: 800, margin: 0 }}>{glosas.filter(g => g.estado !== 'Pendiente').length} de {metrics.totalCount}</p>
                        <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px', fontWeight: 700 }}>GESTIONADAS</p>
                    </div>
                </Card>

                <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertTriangle size={16} color="#ff4d4d" />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#ff4d4d', fontWeight: 900 }}>PÉRDIDA IPS</span>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>VALORES ACEPTADOS (PAGO)</p>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 950, margin: '4px 0', color: '#ff4d4d' }}>-${formatPesos(metrics.acceptedValue)}</h2>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>IMPACTO EN FACTURACIÓN</span>
                            <span style={{ fontSize: '0.55rem', color: '#ff4d4d', fontWeight: 950 }}>{metrics.totalValue > 0 ? ((metrics.acceptedValue / metrics.totalValue) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, metrics.totalValue > 0 ? (metrics.acceptedValue / metrics.totalValue) * 100 : 0)}%` }}
                                style={{ height: '100%', background: '#ff4d4d', borderRadius: '10px', boxShadow: '0 0 10px rgba(255, 77, 77, 0.3)' }}
                            />
                        </div>
                    </div>
                </Card>

                <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={16} color="#f59e0b" />
                        </div>
                        <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800 }}>% DE ACEPTACIÓN</span>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>FACTURAS CON ERROR</p>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 950, margin: '4px 0', color: 'white' }}>{metrics.acceptedCount}</h2>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', color: 'white', fontWeight: 800, margin: 0 }}>
                            {metrics.totalCount > 0 ? ((metrics.acceptedCount / metrics.totalCount) * 100).toFixed(1) : 0}% <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>Frecuencia</span>
                        </p>
                        <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px', fontWeight: 700 }}>INCIDENCIA DE ERROR</p>
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Categories and Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                {/* Distribution Section (LEFT) */}
                <Card style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Activity size={16} color="var(--primary)" /> DISTRIBUCIÓN POR CATEGORÍA
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        {categories.map(cat => (
                            <div key={cat.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.6rem' }}>
                                    <span style={{ opacity: 0.4, textTransform: 'uppercase' }}>{cat.label}</span>
                                    <span>
                                        <span style={{ marginRight: '1rem' }}>{cat.count}</span>
                                        <span style={{ opacity: 0.4 }}>{cat.p}%</span>
                                    </span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, cat.p)}%` }}
                                        style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '10px', boxShadow: `0 0 10px var(--primary-glow)` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Management Status (RIGHT) */}
                <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <PieChart size={16} color="var(--primary)" /> ESTADO DE GESTIÓN
                    </h3>
                    <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 2.5rem auto' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="50" cy="50" r="44" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                            {statusStats.map((s, i) => {
                                let offset = 0;
                                for (let j = 0; j < i; j++) offset += statusStats[j].p;
                                return (
                                    <motion.circle
                                        key={s.label}
                                        cx="50" cy="50" r="44" fill="transparent"
                                        stroke={s.color} strokeWidth="12" strokeLinecap="round"
                                        strokeDasharray={`${(s.p / 100) * 276.32} 276.32`}
                                        strokeDashoffset={-((offset / 100) * 276.32)}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    />
                                );
                            })}
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 800 }}>REGISTROS</span>
                            <span style={{ fontSize: '2rem', fontWeight: 950 }}>{glosas.length}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        {statusStats.map(s => (
                            <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px 0' }}>{s.label}</p>
                                <p style={{ fontSize: '1rem', fontWeight: 950, margin: 0, color: s.color === 'rgba(255,255,255,0.2)' ? 'white' : s.color }}>{s.p}%</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};


