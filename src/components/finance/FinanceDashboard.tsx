'use client';

import React from 'react';
import { useFinance } from '@/context/FinanceContext';
import { calculateTotals } from '@/lib/financeUtils';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
    const { transactions } = useFinance();

    // Filter for current month
    const now = new Date();
    const currentMonthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const { income, expenses, costs } = calculateTotals(currentMonthTransactions);
    const balance = income - (expenses + costs);
    const isSurplus = balance >= 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Ingresos */}
            <div className="card" style={{ borderLeft: '4px solid var(--secondary)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="label" style={{ color: 'var(--text-muted)' }}>Ingresos Mensuales</p>
                        <h2 className="text-2xl mt-1" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>${income.toLocaleString()}</h2>
                    </div>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(0, 177, 113, 0.1)', color: 'var(--secondary)' }}>
                        <TrendingUp size={20} />
                    </div>
                </div>
            </div>

            {/* Gastos */}
            <div className="card" style={{ borderLeft: '4px solid var(--danger)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="label" style={{ color: 'var(--text-muted)' }}>Gastos Mensuales</p>
                        <h2 className="text-2xl mt-1" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>${expenses.toLocaleString()}</h2>
                    </div>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                        <TrendingDown size={20} />
                    </div>
                </div>
            </div>

            {/* Costos */}
            <div className="card" style={{ borderLeft: '4px solid var(--primary)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="label" style={{ color: 'var(--text-muted)' }}>Costos Mensuales</p>
                        <h2 className="text-2xl mt-1" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>${costs.toLocaleString()}</h2>
                    </div>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(0, 99, 65, 0.1)', color: 'var(--primary)' }}>
                        <Wallet size={20} />
                    </div>
                </div>
            </div>

            {/* Balance Neto */}
            <div className="card" style={{
                borderLeft: `4px solid ${isSurplus ? 'var(--secondary)' : 'var(--danger)'}`,
                background: 'var(--bg-card)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="label" style={{ color: 'var(--text-muted)' }}>Balance Neto</p>
                        <h2 className="text-2xl mt-1" style={{ color: isSurplus ? 'var(--secondary)' : 'var(--danger)', fontWeight: 900 }}>
                            ${balance.toLocaleString()}
                        </h2>
                    </div>
                    <div style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        background: isSurplus ? 'rgba(0, 177, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: isSurplus ? 'var(--secondary)' : 'var(--danger)'
                    }}>
                        <DollarSign size={20} />
                    </div>
                </div>
                {!isSurplus && (
                    <p style={{ fontSize: '10px', color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }} className="animate-pulse">
                        ⚠️ Advertencia: Déficit Detectado
                    </p>
                )}
            </div>
        </div>
    );
};
