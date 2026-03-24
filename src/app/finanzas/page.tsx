'use client';

import React from 'react';
import { FinanceProvider } from '@/context/FinanceContext';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { TransactionForm } from '@/components/finance/TransactionForm';
import { TransactionHistory } from '@/components/finance/TransactionHistory';
import { AnnualReport } from '@/components/finance/AnnualReport';
import { Wallet, Info } from 'lucide-react';

export default function FinanzasPage() {
    return (
        <FinanceProvider>
            <main className="container pb-20">
                {/* Header Section */}
                <section className="mb-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                                <Wallet className="text-primary" size={36} /> Control Financiero
                            </h1>
                            <p className="text-text-secondary max-w-2xl">
                                Gestiona tus ingresos, costos y gastos de forma profesional.
                                Analiza tu rentabilidad mensual y anual con herramientas intuitivas.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-primary text-xs font-bold uppercase tracking-widest">
                            <Info size={16} />
                            Actualizado: {new Date().toLocaleDateString()}
                        </div>
                    </div>
                </section>

                {/* Dashboard Cards */}
                <FinanceDashboard />

                {/* Action Row */}
                <div className="mb-8">
                    <TransactionForm />
                </div>

                <div className="grid grid-cols-1 gap-12">
                    {/* History Table */}
                    <section>
                        <TransactionHistory />
                    </section>

                    {/* Annual Analysis */}
                    <section>
                        <AnnualReport />
                    </section>
                </div>
            </main>
        </FinanceProvider>
    );
}
