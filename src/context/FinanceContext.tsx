'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, TransactionType } from '@/lib/financeUtils';

interface FinanceContextType {
    transactions: Transaction[];
    addTransaction: (t: Omit<Transaction, 'id'>) => void;
    updateTransaction: (id: string, t: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('finance_transactions');
        if (saved) {
            try {
                setTransactions(JSON.parse(saved));
            } catch (e) {
                console.error('Error loading transactions', e);
            }
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        localStorage.setItem('finance_transactions', JSON.stringify(transactions));
    }, [transactions]);

    const addTransaction = (t: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            ...t,
            id: crypto.randomUUID(),
        };
        setTransactions(prev => [newTransaction, ...prev]);
    };

    const updateTransaction = (id: string, t: Partial<Transaction>) => {
        setTransactions(prev => prev.map(item => item.id === id ? { ...item, ...t } : item));
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(item => item.id !== id));
    };

    return (
        <FinanceContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) throw new Error('useFinance must be used within a FinanceProvider');
    return context;
};
