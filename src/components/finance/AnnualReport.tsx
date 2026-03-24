'use client';

import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { getMonthlyData } from '@/lib/financeUtils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';

export const AnnualReport: React.FC = () => {
    const { transactions } = useFinance();
    const data = getMonthlyData(transactions);

    const currentYear = new Date().getFullYear();

    const annualTotals = data.reduce((acc, curr) => {
        acc.income += curr.ingresos;
        acc.expenses += curr.gastos;
        acc.costs += curr.costos;
        return acc;
    }, { income: 0, expenses: 0, costs: 0 });

    const annualBalance = annualTotals.income - (annualTotals.expenses + annualTotals.costs);

    return (
        <div className="space-y-8 mt-12">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reporte Anual {currentYear}</h2>
                <div className="h-[1px] flex-1" style={{ backgroundColor: 'var(--border)' }}></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gráfico Comparativo */}
                <div className="card lg:col-span-2 min-h-[400px]">
                    <h3 className="text-lg mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <BarChart3 className="text-primary" size={20} /> Comportamiento Mensual
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#00b171" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="costos" name="Costos" fill="#006341" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Resumen Anual */}
                <div className="card space-y-6">
                    <h3 className="text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <PieChart className="text-primary" size={20} /> Resumen de Totales
                    </h3>

                    <div className="space-y-4">
                        <div style={{ padding: '1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(0, 177, 113, 0.05)', border: '1px solid rgba(0, 177, 113, 0.1)' }}>
                            <p className="label text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Ingresos</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--secondary)' }}>${annualTotals.income.toLocaleString()}</p>
                        </div>

                        <div style={{ padding: '1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                            <p className="label text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Gastos</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--danger)' }}>${annualTotals.expenses.toLocaleString()}</p>
                        </div>

                        <div style={{ padding: '1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(0, 99, 65, 0.05)', border: '1px solid rgba(0, 99, 65, 0.1)' }}>
                            <p className="label text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Costos</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>${annualTotals.costs.toLocaleString()}</p>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            borderRadius: '1rem',
                            border: `2px solid ${annualBalance >= 0 ? 'rgba(0, 177, 113, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            backgroundColor: annualBalance >= 0 ? 'rgba(0, 177, 113, 0.05)' : 'rgba(239, 68, 68, 0.05)'
                        }}>
                            <p className="label text-[10px] text-center mb-1" style={{ color: 'var(--text-muted)' }}>Balance Anual</p>
                            <p className="text-3xl font-black text-center" style={{
                                color: annualBalance >= 0 ? 'var(--secondary)' : 'var(--danger)'
                            }}>
                                ${annualBalance.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráfico de Balance (Línea) */}
            <div className="card">
                <h3 className="text-lg mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <TrendingUp className="text-primary" size={20} /> Tendencia de Balance Neto
                </h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#006341" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#006341" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                name="Balance"
                                stroke="#006341"
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
