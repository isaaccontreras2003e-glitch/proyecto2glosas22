'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { exportToCSV, TransactionType } from '@/lib/financeUtils';
import { Search, Download, Trash2, Edit2, Filter } from 'lucide-react';

export const TransactionHistory: React.FC = () => {
    const { transactions, deleteTransaction } = useFinance();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<TransactionType | 'Todos'>('Todos');
    const [filterMonth, setFilterMonth] = useState('Todos');

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'Todos' || t.type === filterType;

            const d = new Date(t.date);
            const month = d.toLocaleString('es-ES', { month: 'long' });
            const matchesMonth = filterMonth === 'Todos' || month.toLowerCase() === filterMonth.toLowerCase();

            return matchesSearch && matchesType && matchesMonth;
        });
    }, [transactions, searchTerm, filterType, filterMonth]);

    const months = [
        'Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
        <div className="card table-card overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h3 className="text-xl flex items-center gap-2">
                    <Filter className="text-primary" size={20} /> Historial de Movimientos
                </h3>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => exportToCSV(transactions)}
                        className="btn btn-secondary py-2 px-3"
                        title="Exportar a CSV"
                    >
                        <Download size={18} />
                    </button>

                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar descripción o categoría..."
                            className="input pl-10 py-2 w-full md:w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filtros rápidos */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-var(--border)">
                <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                    <label className="label text-[10px]" style={{ color: 'var(--text-muted)' }}>Filtrar por Tipo</label>
                    <select
                        className="input py-1 text-sm"
                        style={{ backgroundColor: 'white', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                    >
                        <option value="Todos">Todos los tipos</option>
                        <option value="Ingreso">Ingresos</option>
                        <option value="Gasto">Gastos</option>
                        <option value="Costo">Costos</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                    <label className="label text-[10px]" style={{ color: 'var(--text-muted)' }}>Filtrar por Mes</label>
                    <select
                        className="input py-1 text-sm"
                        style={{ backgroundColor: 'white', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                    >
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="table-responsive">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            <th className="py-4 px-4 label" style={{ color: 'var(--text-muted)' }}>Fecha</th>
                            <th className="py-4 px-4 label" style={{ color: 'var(--text-muted)' }}>Descripción</th>
                            <th className="py-4 px-4 label" style={{ color: 'var(--text-muted)' }}>Categoría</th>
                            <th className="py-4 px-4 label text-center" style={{ color: 'var(--text-muted)' }}>Tipo</th>
                            <th className="py-4 px-4 label text-right" style={{ color: 'var(--text-muted)' }}>Valor</th>
                            <th className="py-4 px-4 label text-center" style={{ color: 'var(--text-muted)' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((t, idx) => (
                                <tr key={t.id} style={{
                                    borderBottom: '1px solid var(--border)',
                                    backgroundColor: idx % 2 === 0 ? 'rgba(248, 249, 250, 0.5)' : 'white'
                                }} className="hover:bg-gray-50 transition-colors group">
                                    <td className="py-4 px-4 text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.description}</td>
                                    <td className="py-4 px-4">
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '9999px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                            fontSize: '10px',
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            fontWeight: 600
                                        }}>
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.375rem',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            backgroundColor: t.type === 'Ingreso' ? 'rgba(0, 177, 113, 0.1)' :
                                                t.type === 'Gasto' ? 'rgba(239, 68, 68, 0.1)' :
                                                    'rgba(0, 99, 65, 0.1)',
                                            color: t.type === 'Ingreso' ? 'var(--secondary)' :
                                                t.type === 'Gasto' ? 'var(--danger)' :
                                                    'var(--primary)'
                                        }}>
                                            {t.type}
                                        </span>
                                    </td>
                                    <td style={{
                                        padding: '1rem 1rem',
                                        textAlign: 'right',
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        color: t.type === 'Ingreso' ? 'var(--secondary)' : 'var(--text-primary)'
                                    }}>
                                        ${t.value.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => deleteTransaction(t.id)}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '0.375rem',
                                                    color: 'var(--text-muted)',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="hover:bg-red-50 hover:text-red-500"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-12 text-center italic" style={{ color: 'var(--text-muted)' }}>
                                    No se encontraron registros financieros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: 'rgba(0, 99, 65, 0.05)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(0, 99, 65, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Totales del Filtro:</span>
                <div className="flex gap-6">
                    <div className="text-right">
                        <p style={{ fontSize: '10px' }} className="label">Total Seleccionado</p>
                        <p style={{ fontWeight: 700, color: 'var(--primary)' }}>${filteredTransactions.reduce((a, b) => a + b.value, 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
