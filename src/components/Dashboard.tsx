'use client';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, DollarSign, TrendingUp, TrendingDown,
    CheckCircle, Clock, Activity, ChevronDown, BarChart2,
    AlertTriangle, ListChecks, ArrowRight, Filter
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatPesos = (value: any): string => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return '0';
    return '$' + Math.round(num).toLocaleString('es-CO');
};

const getStatusColor = (estado: string) => {
    switch (estado) {
        case 'Aceptada': return { bg: '#fff1f1', text: '#dc2626', dot: '#ef4444', label: 'ACEPTADA' };
        case 'Respondida': return { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e', label: 'RESPONDIDA' };
        default: return { bg: '#fef9ec', text: '#b45309', dot: '#f59e0b', label: 'EN REVISIÓN' };
    }
};

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Glosa {
    id: string;
    factura: string;
    servicio: string;
    orden_servicio: string;
    valor_glosa: number;
    valor_aceptado?: number;
    descripcion: string;
    tipo_glosa: string;
    estado: string;
    fecha: string;
    registrada_internamente?: boolean;
    seccion?: string;
}

interface DashboardProps {
    glosas: Glosa[];
    consolidado: any[];
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

// ─── Donut Chart ─────────────────────────────────────────────────────────────

const DonutChart = ({ slices, total }: { slices: { value: number; color: string; label: string }[]; total: number }) => {
    const SIZE = 160;
    const STROKE = 20;
    const R = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * R;
    const CENTER = SIZE / 2;

    let offset = 0;

    return (
        <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
            <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
                {slices.map((s, i) => {
                    const dash = total > 0 ? (s.value / total) * CIRC : 0;
                    const gap = CIRC - dash;
                    const el = (
                        <motion.circle
                            key={i}
                            cx={CENTER} cy={CENTER} r={R}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={STROKE}
                            strokeLinecap="round"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.15, duration: 0.6 }}
                        />
                    );
                    offset += dash;
                    return el;
                })}
            </svg>
            <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b' }}>{total}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Glosas</span>
            </div>
        </div>
    );
};

// ─── Bar Row ─────────────────────────────────────────────────────────────────

const BarRow = ({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{value}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '36px', textAlign: 'right' }}>{percent}%</span>
            </div>
        </div>
        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, percent)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: color, borderRadius: '999px' }}
            />
        </div>
    </div>
);

// ─── Recent Activity Item ─────────────────────────────────────────────────────

const RecentItem = ({ glosa }: { glosa: Glosa }) => {
    const s = getStatusColor(glosa.estado);
    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: '#fff',
                borderRadius: '14px',
                border: '1px solid #f1f5f9',
                gap: '1rem'
            }}
        >
            <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                <FileText size={16} color={s.text} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {glosa.factura}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {glosa.servicio || 'Sin servicio'}
                </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                    {formatPesos(glosa.valor_glosa)}
                </p>
                <span style={{
                    fontSize: '0.6rem', fontWeight: 800,
                    background: s.bg, color: s.text,
                    padding: '2px 8px', borderRadius: '999px',
                    display: 'inline-block', marginTop: '3px'
                }}>
                    {s.label}
                </span>
            </div>
        </motion.div>
    );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

const KpiCard = ({
    label, value, badge, badgeColor, sub, icon, iconBg
}: {
    label: string; value: string; badge?: string; badgeColor?: string;
    sub?: string; icon: React.ReactNode; iconBg: string;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
            background: '#fff',
            borderRadius: '20px',
            border: '1px solid #f1f5f9',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {label}
            </span>
            {badge && (
                <span style={{
                    fontSize: '0.65rem', fontWeight: 800,
                    color: badgeColor || '#16a34a',
                    background: badgeColor ? `${badgeColor}18` : '#f0fdf4',
                    padding: '2px 8px', borderRadius: '999px'
                }}>
                    {badge}
                </span>
            )}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div>
                <p style={{ fontSize: '1.55rem', fontWeight: 950, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
                {sub && <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '4px 0 0 0', fontWeight: 500 }}>{sub}</p>}
            </div>
            <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                {icon}
            </div>
        </div>
    </motion.div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard = ({ glosas: allGlosas, consolidado: allConsolidado, stats }: DashboardProps) => {
    const [selectedService, setSelectedService] = useState('Todos');
    const [selectedType, setSelectedType] = useState('Todos');

    // ── Available services from data
    const availableServices = useMemo(() => {
        const services = Array.from(new Set(allGlosas.map(g => g.servicio).filter(Boolean)));
        return ['Todos', ...services.sort()];
    }, [allGlosas]);

    // ── Filtered glosas
    const glosas = useMemo(() => allGlosas.filter(g => {
        const matchService = selectedService === 'Todos' || g.servicio === selectedService;
        const matchType = selectedType === 'Todos' || g.tipo_glosa === selectedType;
        return matchService && matchType;
    }), [allGlosas, selectedService, selectedType]);

    const filteredConsolidado = useMemo(() => allConsolidado.filter(item => {
        const matchService = selectedService === 'Todos' || item.servicios?.includes(selectedService);
        const matchType = selectedType === 'Todos' || item.tipos?.includes(selectedType);
        return matchService && matchType;
    }), [allConsolidado, selectedService, selectedType]);

    // ── KPI values
    const totalGlosado = filteredConsolidado.reduce((a, c) => a + c.glosado, 0);
    const totalAceptado = filteredConsolidado.reduce((a, c) => a + c.aceptado, 0);
    const totalNoAcep = filteredConsolidado.reduce((a, c) => a + c.noAceptado, 0);
    const totalFacturas = filteredConsolidado.length;
    const percentSuccess = totalGlosado > 0 ? Math.round((totalAceptado / totalGlosado) * 100) : 0;

    // ── Glosas por Tipo (bar chart)
    const tiposData = useMemo(() => {
        const map: Record<string, number> = {};
        glosas.forEach(g => {
            const t = g.tipo_glosa || 'Sin Tipo';
            map[t] = (map[t] || 0) + 1;
        });
        const total = glosas.length || 1;
        const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, value], i) => ({
                label,
                value,
                percent: Math.round((value / total) * 100),
                color: colors[i % colors.length]
            }));
    }, [glosas]);

    // ── Donut: estado de glosas
    const donutSlices = useMemo(() => {
        const pendiente = glosas.filter(g => g.estado === 'Pendiente').length;
        const respondida = glosas.filter(g => g.estado === 'Respondida').length;
        const aceptada = glosas.filter(g => g.estado === 'Aceptada').length;
        return [
            { label: 'Aceptadas', value: aceptada, color: '#ef4444' },
            { label: 'Pendientes', value: pendiente, color: '#f59e0b' },
            { label: 'Respondidas', value: respondida, color: '#3b82f6' },
        ];
    }, [glosas]);

    // ── Actividad reciente (últimas 5)
    const recentGlosas = useMemo(() => [...glosas]
        .sort((a, b) => {
            const parse = (d: string) => {
                if (!d) return 0;
                const [datePart] = d.split(',');
                const parts = datePart.trim().split('/');
                if (parts.length < 3) return 0;
                return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
            };
            return parse(b.fecha) - parse(a.fecha);
        })
        .slice(0, 5), [glosas]);

    // ── Top consolidado (mayor diferencia)
    const topConsolidado = useMemo(() => [...filteredConsolidado]
        .sort((a, b) => b.diferencia - a.diferencia)
        .slice(0, 4), [filteredConsolidado]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'var(--font-geist-sans, Inter, sans-serif)' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'white', margin: 0 }}>
                        Resumen de Auditoría
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0 0' }}>
                        Panel de control · Glosas Médicas
                    </p>
                </div>

                {/* ── Filters ── */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Servicio */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedService}
                            onChange={e => setSelectedService(e.target.value)}
                            style={{
                                appearance: 'none',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '0.45rem 2rem 0.45rem 0.75rem',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '130px'
                            }}
                        >
                            {availableServices.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                    </div>

                    {/* Tipo Glosa */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={selectedType}
                            onChange={e => setSelectedType(e.target.value)}
                            style={{
                                appearance: 'none',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                padding: '0.45rem 2rem 0.45rem 0.75rem',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '130px'
                            }}
                        >
                            <option value="Todos">Todos los tipos</option>
                            <option value="Tarifas">Tarifas</option>
                            <option value="Soportes">Soportes</option>
                            <option value="RIPS">RIPS</option>
                            <option value="Autorización">Autorización</option>
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <KpiCard
                    label="Valor Glosado"
                    value={formatPesos(totalGlosado)}
                    badge={`+${percentSuccess}%`}
                    badgeColor="#16a34a"
                    sub="vs. mes anterior"
                    icon={<TrendingUp size={18} color="#8b5cf6" />}
                    iconBg="rgba(139,92,246,0.1)"
                />
                <KpiCard
                    label="Valor Aceptado"
                    value={formatPesos(totalAceptado)}
                    badge={`${percentSuccess}% Success`}
                    badgeColor="#16a34a"
                    sub="Tasa de recuperación efectiva"
                    icon={<CheckCircle size={18} color="#10b981" />}
                    iconBg="rgba(16,185,129,0.1)"
                />
                <KpiCard
                    label="No Aceptado"
                    value={formatPesos(totalNoAcep)}
                    badge={totalGlosado > 0 ? `${Math.round((totalNoAcep / totalGlosado) * 100)}%` : '0%'}
                    badgeColor="#ef4444"
                    sub="Pendiente de conciliación"
                    icon={<TrendingDown size={18} color="#ef4444" />}
                    iconBg="rgba(239,68,68,0.1)"
                />
                <KpiCard
                    label="Facturas Glosadas"
                    value={totalFacturas.toString()}
                    badge={`${glosas.length} Total`}
                    badgeColor="#3b82f6"
                    sub={`${glosas.filter(g => g.estado !== 'Pendiente').length} gestionadas · ${glosas.filter(g => g.estado === 'Pendiente').length} en revisión`}
                    icon={<FileText size={18} color="#3b82f6" />}
                    iconBg="rgba(59,130,246,0.1)"
                />
            </div>

            {/* ── Middle: Tipo Bar Chart + Estado Donut ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>

                {/* Glosas por Tipo */}
                <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    border: '1px solid #f1f5f9',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                        <BarChart2 size={16} color="#3b82f6" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Glosas por Tipo</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {tiposData.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos para mostrar.</p>
                        ) : tiposData.map(t => (
                            <BarRow key={t.label} label={t.label} value={t.value} percent={t.percent} color={t.color} />
                        ))}
                    </div>
                </div>

                {/* Estado de Glosas (Donut) */}
                <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    border: '1px solid #f1f5f9',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Activity size={16} color="#8b5cf6" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Estado de Glosas</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DonutChart slices={donutSlices} total={glosas.length} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {donutSlices.map(s => (
                            <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>{s.label}</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
                                    {glosas.length > 0 ? Math.round((s.value / glosas.length) * 100) : 0}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Bottom: Top Facturas + Actividad Reciente ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                {/* Top Facturas con Mayor Diferencia */}
                <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    border: '1px solid #f1f5f9',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <AlertTriangle size={16} color="#f59e0b" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Mayor Impacto</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Diferencia
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {topConsolidado.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos.</p>
                        ) : topConsolidado.map((c, i) => (
                            <div key={c.factura} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.75rem 0.85rem',
                                background: i === 0 ? '#fefce8' : '#f8fafc',
                                borderRadius: '12px',
                                border: `1px solid ${i === 0 ? '#fef08a' : '#f1f5f9'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                    <span style={{
                                        width: '22px', height: '22px', borderRadius: '8px',
                                        background: i === 0 ? '#f59e0b' : '#e2e8f0',
                                        color: i === 0 ? 'white' : '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 900, flexShrink: 0
                                    }}>{i + 1}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.factura}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: c.diferencia > 0 ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
                                    {formatPesos(c.diferencia)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actividad Reciente */}
                <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    border: '1px solid #f1f5f9',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <ListChecks size={16} color="#10b981" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>Actividad Reciente</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}>Ver todas</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {recentGlosas.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0' }}>Sin actividad reciente.</p>
                        ) : recentGlosas.map(g => (
                            <RecentItem key={g.id} glosa={g} />
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};
