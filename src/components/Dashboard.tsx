import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle, TrendingUp, Filter, PieChart, Activity, ChevronDown, AlertTriangle } from 'lucide-react';
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Slicers / Segmentaciones */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex',
                    gap: '1.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '1.25rem',
                    borderRadius: '1.5rem',
                    border: '1px solid rgba(255,255,255,0.05)',
                    alignItems: 'center'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', marginRight: '1rem' }}>
                    <Filter size={18} />
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em' }}>SEGMENTACIONES</span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '0.5rem' }}>SERVICIO</label>
                        <select
                            value={filterServicio}
                            onChange={(e) => setFilterServicio(e.target.value)}
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '0.6rem 1rem',
                                borderRadius: '10px',
                                fontSize: '0.85rem'
                            }}
                        >
                            {servicios.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '0.5rem' }}>TIPO DE GLOSA</label>
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            style={{
                                background: 'rgba(0,0,0,0.3)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '0.6rem 1rem',
                                borderRadius: '10px',
                                fontSize: '0.85rem'
                            }}
                        >
                            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </motion.div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
            }}>
                {[
                    { label: 'VALOR TOTAL EN GLOSA', value: `$${formatPesos(executiveStats.totalGlosado)}`, icon: <DollarSign size={22} />, color: '#8b5cf6', sub: 'MONTO HISTÓRICO TOTAL' },
                    { label: 'CANTIDAD FACTURAS', value: executiveStats.totalCount, icon: <FileText size={22} />, color: '#3b82f6', sub: 'REGISTROS EN SISTEMA' },
                    { label: 'TOTAL VALOR ACEPTADO', value: `$${formatPesos(executiveStats.totalAceptado)}`, icon: <AlertTriangle size={22} />, color: '#f87171', sub: `${executiveStats.percentAceptado}% DE IMPACTO FINANCIERO` },
                    { label: 'TOTAL FACTURAS ACEPTADAS', value: executiveStats.acceptedCount, icon: <CheckCircle size={22} />, color: '#f87171', sub: 'GESTIONES CON ÉXITO' },
                ].map((stat, index) => (
                    <Card key={index} className="stat-card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{
                                background: `${stat.color}15`,
                                color: stat.color,
                                padding: '1rem',
                                borderRadius: '1rem',
                                display: 'flex',
                                border: `1px solid ${stat.color}25`
                            }}>
                                {stat.icon}
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>{stat.label}</p>
                                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{stat.value}</p>
                                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.4rem' }}>{stat.sub}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detailed Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '2rem' }}>
                <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Activity size={20} color="var(--primary)" />
                            DISTRIBUCIÓN POR CATEGORÍA
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>{tipo.toUpperCase()}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                            <span style={{ color: 'white', fontWeight: 900, fontSize: '1rem' }}>{count}</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>({percent}%)</span>
                                        </div>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}%` }}
                                            transition={{ duration: 1.2, ease: "circOut" }}
                                            style={{
                                                height: '100%',
                                                background: `linear-gradient(90deg, var(--primary), #3b82f6)`,
                                                boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
                                                borderRadius: '10px'
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>

                <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <PieChart size={20} color="var(--primary)" />
                            ESTADO DE GESTIÓN
                        </h3>
                    </div>

                    <div style={{ position: 'relative', width: '220px', height: '220px', marginTop: '2rem' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                <linearGradient id="gradPending" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                                <linearGradient id="gradResponded" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#2dd4bf" />
                                </linearGradient>
                                <linearGradient id="gradAccepted" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f87171" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>

                            {/* Background Circle */}
                            <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />

                            {/* Pendiente */}
                            <motion.circle
                                cx="50" cy="50" r="42" fill="transparent"
                                stroke="url(#gradPending)" strokeWidth="8" strokeLinecap="round"
                                filter="url(#glow)"
                                initial={{ strokeDasharray: "0 263.8" }}
                                animate={{ strokeDasharray: `${(pPending / 100) * 263.8} 263.8` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                            />

                            {/* Respondida */}
                            <motion.circle
                                cx="50" cy="50" r="42" fill="transparent"
                                stroke="url(#gradResponded)" strokeWidth="8" strokeLinecap="round"
                                strokeDashoffset={-((pPending / 100) * 263.8)}
                                initial={{ strokeDasharray: "0 263.8" }}
                                animate={{ strokeDasharray: `${(pResponded / 100) * 263.8} 263.8` }}
                                transition={{ duration: 1.5, delay: 0.2, ease: "circOut" }}
                            />

                            {/* Aceptada */}
                            <motion.circle
                                cx="50" cy="50" r="42" fill="transparent"
                                stroke="url(#gradAccepted)" strokeWidth="8" strokeLinecap="round"
                                strokeDashoffset={-(((pPending + pResponded) / 100) * 263.8)}
                                initial={{ strokeDasharray: "0 263.8" }}
                                animate={{ strokeDasharray: `${(pAccepted / 100) * 263.8} 263.8` }}
                                transition={{ duration: 1.5, delay: 0.4, ease: "circOut" }}
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
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 800, margin: 0, letterSpacing: '0.15em' }}>REGISTROS</p>
                                <p style={{ fontSize: '2.2rem', fontWeight: 950, color: 'white', margin: 0, lineHeight: 1, textShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>{stats.total}</p>
                            </motion.div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', width: '100%', marginTop: '2rem' }}>
                        {[
                            { label: 'PEND.', val: Math.round(pPending), color: '#8b5cf6' },
                            { label: 'RESP.', val: Math.round(pResponded), color: '#3b82f6' },
                            { label: 'ACEPT.', val: Math.round(pAccepted), color: '#f87171' }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                style={{ textAlign: 'center', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}
                                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.04)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 800 }}>{item.label}</span>
                                </div>
                                <p style={{ color: 'white', fontSize: '1rem', fontWeight: 950, margin: 0 }}>{item.val}%</p>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};
