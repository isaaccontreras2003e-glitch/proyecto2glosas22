'use client';

import React, { useMemo } from 'react';
import { Card } from './Card';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, Legend, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import { Download, Calendar, TrendingUp, BarChart3, FileSpreadsheet, Clock, CheckCircle, Activity, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

interface Glosa {
    id: string;
    factura: string;
    valor_glosa: number;
    valor_aceptado: number;
    fecha: string;
    estado: string;
}

interface MonthlyReportProps {
    glosas: Glosa[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP', 
        maximumFractionDigits: 0 
    }).format(value);
};

const formatMillions = (value: number) => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    return formatCurrency(value);
};

export const MonthlyReport = ({ glosas }: MonthlyReportProps) => {
    // Procesar datos históricos agrupados por mes
    const monthlyData = useMemo(() => {
        const months: Record<string, { 
            month: string, 
            count: number, 
            totalVal: number, 
            totalAceptado: number,
            year: number, 
            monthNum: number,
            period: string
        }> = {};
        
        glosas.forEach(g => {
            if (!g.fecha) return;
            
            // Formato esperado: "dd/mm/yyyy, hh:mm:ss"
            const [datePart] = g.fecha.split(',');
            const [day, month, year] = datePart.split('/').map(Number);
            
            if (!day || !month || !year) return;
            
            const key = `${year}-${month.toString().padStart(2, '0')}`;
            if (!months[key]) {
                const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });
                months[key] = { 
                    month: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
                    period: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
                    count: 0, 
                    totalVal: 0,
                    totalAceptado: 0,
                    year,
                    monthNum: month
                };
            }
            
            months[key].count += 1;
            months[key].totalVal += (Number(g.valor_glosa) || 0);
            months[key].totalAceptado += (Number(g.valor_aceptado) || 0);
        });
        
        // Convertir a array y ordenar cronológicamente
        return Object.values(months).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.monthNum - b.monthNum;
        });
    }, [glosas]);

    // Estadísticas generales
    const totalRecords = glosas.length;
    const totalValue = glosas.reduce((acc, curr) => acc + (Number(curr.valor_glosa) || 0), 0);
    const totalAccepted = glosas.reduce((acc, curr) => acc + (Number(curr.valor_aceptado) || 0), 0);
    const recoveryRate = totalValue > 0 ? (totalAccepted / totalValue) * 100 : 0;
    
    // Cálculo de "Tiempo Promedio" en días para las glosas no resueltas
    const avgTime = useMemo(() => {
        const pendientes = glosas.filter(g => g.estado !== 'Aceptada' && g.estado !== 'Conciliada');
        if (pendientes.length === 0) return "0d";
        
        let totalDays = 0;
        let validDates = 0;
        const now = new Date().getTime();
        
        pendientes.forEach(g => {
            if (!g.fecha) return;
            const [datePart] = g.fecha.split(',');
            const [day, month, year] = datePart.split('/').map(Number);
            if (day && month && year) {
                const gDate = new Date(year, month - 1, day).getTime();
                const diffTime = Math.abs(now - gDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDays += diffDays;
                validDates++;
            }
        });
        
        if (validDates === 0) return "0d";
        return Math.round(totalDays / validDates) + "d";
    }, [glosas]);

    // Mes reciente para mostrar cantidad suministrada
    const recentMonthData = useMemo(() => {
        if (monthlyData.length === 0) return { count: 0, name: '' };
        return {
            count: monthlyData[monthlyData.length - 1].count,
            name: monthlyData[monthlyData.length - 1].period.split(' ')[0]
        };
    }, [monthlyData]);

    // Cálculo de incremento neto respecto al mes anterior
    const netIncrement = useMemo(() => {
        if (monthlyData.length < 2) return "+0%";
        const currentCount = monthlyData[monthlyData.length - 1].count;
        const prevCount = monthlyData[monthlyData.length - 2].count;
        if (prevCount === 0) return "+0%";
        const inc = ((currentCount - prevCount) / prevCount) * 100;
        return (inc >= 0 ? "+" : "") + inc.toFixed(1) + "%";
    }, [monthlyData]);

    const handleExportExcel = () => {
        const dataToExport = monthlyData.map(d => ({
            'Mes Periodo': d.month,
            'Cantidad Glosas': d.count,
            'Valor Total': d.totalVal,
            'Valor Aceptado': d.totalAceptado,
            'Tasa Recuperación': d.totalVal > 0 ? ((d.totalAceptado / d.totalVal) * 100).toFixed(1) + '%' : '0%'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Histórico Auditoría");
        
        const wscols = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        ws['!cols'] = wscols;

        XLSX.writeFile(wb, `Audit_History_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (monthlyData.length === 0) {
        return (
            <Card title="HISTÓRICO DE AUDITORÍA">
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay suficientes datos registrados para generar el análisis retrospectivo.
                </div>
            </Card>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Moderno con botón XL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>HISTÓRICO DE AUDITORÍA</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Análisis retrospectivo de rendimiento y mitigación de glosas</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportExcel}
                    style={{
                        background: 'var(--secondary)',
                        color: '#000',
                        border: 'none',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '10px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        boxShadow: '0 0 20px var(--secondary-glow)'
                    }}
                >
                    <Download size={16} /> Descargar Reporte Excel
                </motion.button>
            </div>

            {/* 4 Cards de Métricas Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>TOTAL GLOSAS</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white' }}>{totalRecords}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>{netIncrement}</span>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, marginTop: 'auto' }}>
                        <strong>{recentMonthData.count}</strong> registradas en {recentMonthData.name}
                    </p>
                </Card>
                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>VALOR ACUMULADO</p>
                    <span style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--secondary)', textShadow: '0 0 15px var(--secondary-glow)' }}>{formatMillions(totalValue)}</span>
                </Card>
                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>TASA DE RECUPERACIÓN</p>
                    <span style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white' }}>{recoveryRate.toFixed(1)}%</span>
                </Card>
                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>TIEMPO PROMEDIO</p>
                    <span style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white' }}>{avgTime}</span>
                </Card>
            </div>

            {/* Layout Principal: Evolución y Comparativa */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <Card style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>EVOLUCIÓN HISTÓRICA</h3>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5 }}>TOTAL GLOSAS</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }} />
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5 }}>VALOR ACUMULADO</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ height: '350px', width: '100%', position: 'relative' }}>
                        <svg width="0" height="0">
                            <defs>
                                <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                        </svg>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'var(--primary)', fontSize: 9, fontWeight: 700 }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000000).toFixed(0)}M`} tick={{ fill: 'var(--secondary)', fontSize: 9, fontWeight: 700 }} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }}
                                    itemStyle={{ fontSize: '0.75rem', fontWeight: 700 }}
                                    formatter={(value: any, name: any) => {
                                        if (name === 'totalVal') return [formatCurrency(Number(value) || 0), 'Valor Acumulado'];
                                        return [value, 'Cantidad Glosas'];
                                    }}
                                />
                                <Bar 
                                    yAxisId="left"
                                    dataKey="count" 
                                    fill="var(--primary)" 
                                    barSize={20} 
                                    radius={[4, 4, 0, 0]} 
                                    opacity={0.8} 
                                    name="count"
                                />
                                <Line 
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey="totalVal" 
                                    stroke="var(--secondary)" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: 'var(--secondary)', strokeWidth: 2, stroke: 'var(--bg-card)' }}
                                    activeDot={{ r: 6, fill: '#fff' }}
                                    name="totalVal"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2.5rem' }}>COMPARATIVA MENSUAL</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData.slice(-6)}>
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 8, fontWeight: 800 }}
                                />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={24}>
                                    {monthlyData.slice(-6).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === monthlyData.slice(-6).length - 1 ? 'var(--secondary)' : 'rgba(255,255,255,0.1)'} strokeWidth={index === monthlyData.slice(-6).length - 1 ? 0 : 0} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: '2rem', background: 'var(--surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Incremento Neto</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 900 }}>{netIncrement}</span>
                    </div>
                </Card>
            </div>

            {/* Tabla Detalle Mensual Auditoría */}
            <Card style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>DETALLE MENSUAL DE AUDITORÍA</h3>
                    <Activity size={18} color="var(--primary)" />
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MES PERIODO</th>
                                <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CANTIDAD GLOSAS</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VALOR TOTAL</th>
                                <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ESTADO AUDITORÍA</th>
                                <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyData.slice().reverse().map((d, i) => {
                                // Lógica de estado sugerido
                                const isCurrentMonth = new Date().getMonth() + 1 === d.monthNum && new Date().getFullYear() === d.year;
                                
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} className="table-row-hover">
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 800 }}>{d.period}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', textAlign: 'center', fontWeight: 700 }}>{d.count}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 900, color: 'var(--secondary)' }}>{formatCurrency(d.totalVal)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.55rem', 
                                                fontWeight: 900, 
                                                padding: '4px 10px', 
                                                borderRadius: '100px', 
                                                background: isCurrentMonth ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255,255,255,0.05)',
                                                color: isCurrentMonth ? 'var(--primary)' : 'var(--text-muted)',
                                                border: `1px solid ${isCurrentMonth ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.1)'}`,
                                                textTransform: 'uppercase'
                                            }}>
                                                {isCurrentMonth ? 'EN PROCESO' : 'CERRADO'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                <TrendingUp size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <style jsx>{`
                .table-row-hover:hover {
                    background: rgba(255,255,255,0.015);
                }
            `}</style>
        </div>
    );
};
