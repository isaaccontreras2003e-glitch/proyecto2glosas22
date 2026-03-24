'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { TransactionType } from '@/lib/financeUtils';
import { Plus, X } from 'lucide-react';

export const TransactionForm: React.FC = () => {
    const { addTransaction } = useFinance();
    const [isOpen, setIsOpen] = useState(false);

    const [formData, setFormData] = useState({
        type: 'Ingreso' as TransactionType,
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        value: 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.value <= 0 && formData.type === 'Ingreso') {
            alert('Los ingresos deben ser mayores a 0');
            return;
        }

        addTransaction(formData);
        setFormData({
            type: 'Ingreso',
            description: '',
            category: '',
            date: new Date().toISOString().split('T')[0],
            value: 0
        });
        setIsOpen(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn btn-primary mb-6"
            >
                <Plus size={18} /> Nuevo Registro
            </button>
        );
    }

    return (
        <div className="card mb-8 border-t-4 border-t-primary p-6 relative">
            <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
                <X size={20} />
            </button>

            <h3 className="text-xl mb-6 flex items-center gap-2">
                <Plus className="text-primary" size={20} /> Registrar Movimiento
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="input-group">
                    <label className="label">Tipo</label>
                    <select
                        className="input"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
                    >
                        <option value="Ingreso">Ingreso</option>
                        <option value="Gasto">Gasto</option>
                        <option value="Costo">Costo</option>
                    </select>
                </div>

                <div className="input-group">
                    <label className="label">Descripción</label>
                    <input
                        className="input"
                        type="text"
                        placeholder="Ej: Pago de factura"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        required
                    />
                </div>

                <div className="input-group">
                    <label className="label">Categoría</label>
                    <input
                        className="input"
                        type="text"
                        placeholder="Ej: Alimentación"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        required
                    />
                </div>

                <div className="input-group">
                    <label className="label">Fecha</label>
                    <input
                        className="input"
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        required
                    />
                </div>

                <div className="input-group">
                    <label className="label">Valor ($)</label>
                    <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.value || ''}
                        onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                        required
                    />
                </div>

                <div className="lg:col-span-5 flex justify-end gap-3 mt-2">
                    <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Guardar Registro
                    </button>
                </div>
            </form>
        </div>
    );
};
