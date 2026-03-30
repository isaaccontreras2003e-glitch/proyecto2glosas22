'use client';

import React, { useMemo } from 'react';
import { Card } from './Card';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, Legend, Cell
} from 'recharts';
import { Download, Calendar, TrendingUp, BarChart3, FileSpreadsheet } from 'lucide-react';
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

export const MonthlyReport = ({ glosas }: MonthlyReportProps) => {
    // Procesar datos
    const monthlyData = useMemo(() => {
        const months: Record<string, { month: string, count: number, totalVal: number, year: number, monthNum: number }> = {};
        
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
                    count: 0, 
                    totalVal: 0,
                    year,
                    monthNum: month
                };
            }
            
            months[key].count += 1;
            months[key].totalVal += (Number(g.valor_glosa) || 0);
        });
        
        // Convertir a array y ordenar cronológicamente
        return Object.values(months).sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.monthNum - b.monthNum;
        });
    }, [glosas]);

    const totalRecords = glosas.length;
    const totalValue = glosas.reduce((acc, curr) => acc + (Number(curr.valor_glosa) || 0), 0);

    const handleExportExcel = () => {
        const dataToExport = monthlyData.map(d => ({
            'Mes': d.month,
            'Cantidad de Glosas': d.count,
            'Valor Total': d.totalVal
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte Mensual");
        
        // Ajustar anchos de columna
        const wscols = [
            { wch: 20 },
            { wch: 20 },
            { wch: 25 }
        ];
        ws['!cols'] = wscols;

        XLSX.writeFile(wb, `Reporte_Mensual_Glosas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (monthlyData.length === 0) {
        return (
            <Card title="REPORTE MENSUAL HISTÓRICO">
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay datos suficientes para generar el reporte mensual.
                </div>
            </Card>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card title="RESUMEN HISTÓRICO POR MES">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Glosas</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>{totalRecords}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Valor Acumulado</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary)' }}>{formatCurrency(totalValue)}</p>
                        </div>
                    </div>
                    
                    <motion.button
                        whileHover={{ scale: 1.02, translateY: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleExportExcel}
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '0.8rem 1.5rem',
                            borderRadius: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
                            fontSize: '0.85rem'
                        }}
                    >
                        <FileSpreadsheet size={18} /> DESCARGAR EXCEL CON GRÁFICOS
                    </motion.button>
                </div>

                <div style={{ height: '400px', width: '100%', marginTop: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    background: 'var(--bg-card)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '12px',
                                    boxShadow: 'var(--shadow-lg)',
                                    color: 'var(--text-primary)'
                                }}
                                formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Valor Total']}
                                labelStyle={{ fontWeight: 800, marginBottom: '5px', color: 'var(--primary)' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="totalVal" 
                                stroke="var(--primary)" 
                                fillOpacity={1} 
                                fill="url(#colorVal)" 
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <Card title="VOLUMEN MENSUAL">
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Cant. Glosas">
                                    {monthlyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : 'var(--secondary)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="DETALLE DE DATOS">
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="custom-scrollbar">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mes</th>
                                    <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cantidad</th>
                                    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((d, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>{d.month}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--primary)', fontWeight: 700 }}>{d.count}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(d.totalVal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
