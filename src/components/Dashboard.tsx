import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle, TrendingUp, Filter, PieChart, Activity, ChevronDown } from 'lucide-react';
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
}

export const Dashboard = ({ glosas, totalIngresos }: DashboardProps) => {
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

            {/* Main Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
            }}>
                {[
                    { label: 'Glosas Filtradas', value: stats.total, icon: <FileText size={22} />, color: '#8b5cf6' },
                    { label: 'Valor Glosado', value: `$${formatPesos(stats.value)}`, icon: <DollarSign size={22} />, color: '#3b82f6' },
                    { label: 'Recuperado (Aceptado)', value: `$${formatPesos(totalIngresos)}`, icon: <TrendingUp size={22} />, color: '#ef4444' },
                    { label: 'Gestión Finalizada', value: stats.resolved, icon: <CheckCircle size={22} />, color: '#10b981' },
                ].map((stat, index) => (
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
                                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{stat.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detailed Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                <Card style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Activity size={20} color="var(--primary)" />
                            DISTRIBUCIÓN POR CATEGORÍA
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {['Tarifas', 'Soportes', 'RIPS', 'Autorización'].map((tipo) => {
                            const count = filteredData.filter(g => g.tipo_glosa === tipo).length;
                            const total = filteredData.length || 1;
                            const percent = Math.round((count / total) * 100);
                            return (
                                <div key={tipo}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.7rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{tipo}</span>
                                        <span style={{ color: 'white', fontWeight: 700 }}>{count} ({percent}%)</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            style={{
                                                height: '100%',
                                                background: `linear-gradient(90deg, var(--primary), #3b82f6)`,
                                                boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <PieChart size={20} color="var(--primary)" />
                            ESTADO DE GESTIÓN
                        </h3>
                    </div>

                    <div style={{ position: 'relative', width: '220px', height: '220px', marginTop: '2rem' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.2))' }}>
                            <defs>
                                <linearGradient id="gradPending" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                                <linearGradient id="gradResponded" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#059669" />
                                </linearGradient>
                                <linearGradient id="gradAccepted" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset="100%" stopColor="#dc2626" />
                                </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="10" />

                            {/* Pendiente */}
                            <motion.circle
                                cx="50" cy="50" r="40" fill="transparent"
                                stroke="url(#gradPending)" strokeWidth="10" strokeLinecap="round"
                                initial={{ strokeDasharray: "0 251.2" }}
                                animate={{ strokeDasharray: `${(pPending / 100) * 251.2} 251.2` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                            />

                            {/* Respondida */}
                            <motion.circle
                                cx="50" cy="50" r="40" fill="transparent"
                                stroke="url(#gradResponded)" strokeWidth="10" strokeLinecap="round"
                                strokeDashoffset={-((pPending / 100) * 251.2)}
                                initial={{ strokeDasharray: "0 251.2" }}
                                animate={{ strokeDasharray: `${(pResponded / 100) * 251.2} 251.2` }}
                                transition={{ duration: 1.5, delay: 0.2, ease: "circOut" }}
                            />

                            {/* Aceptada */}
                            <motion.circle
                                cx="50" cy="50" r="40" fill="transparent"
                                stroke="url(#gradAccepted)" strokeWidth="10" strokeLinecap="round"
                                strokeDashoffset={-(((pPending + pResponded) / 100) * 251.2)}
                                initial={{ strokeDasharray: "0 251.2" }}
                                animate={{ strokeDasharray: `${(pAccepted / 100) * 251.2} 251.2` }}
                                transition={{ duration: 1.5, delay: 0.4, ease: "circOut" }}
                            />
                        </svg>

                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, margin: 0, letterSpacing: '0.1em' }}>TOTAL</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white', margin: 0, lineHeight: 1 }}>{stats.total}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pend.</span>
                            </div>
                            <p style={{ color: 'white', fontWeight: 900, margin: 0 }}>{Math.round(pPending)}%</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Resp.</span>
                            </div>
                            <p style={{ color: 'white', fontWeight: 900, margin: 0 }}>{Math.round(pResponded)}%</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Acept.</span>
                            </div>
                            <p style={{ color: 'white', fontWeight: 900, margin: 0 }}>{Math.round(pAccepted)}%</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
