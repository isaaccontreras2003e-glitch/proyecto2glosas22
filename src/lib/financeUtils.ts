export type TransactionType = 'Ingreso' | 'Gasto' | 'Costo';

export interface Transaction {
    id: string;
    type: TransactionType;
    description: string;
    category: string;
    date: string;
    value: number;
}

export const calculateTotals = (transactions: Transaction[]) => {
    return transactions.reduce(
        (acc, curr) => {
            if (curr.type === 'Ingreso') acc.income += curr.value;
            if (curr.type === 'Gasto') acc.expenses += curr.value;
            if (curr.type === 'Costo') acc.costs += curr.value;
            return acc;
        },
        { income: 0, expenses: 0, costs: 0 }
    );
};

export const getMonthlyData = (transactions: Transaction[]) => {
    const months = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const currentYear = new Date().getFullYear();

    const data = months.map((month, index) => {
        const monthlyTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === index && d.getFullYear() === currentYear;
        });

        const totals = calculateTotals(monthlyTransactions);
        return {
            name: month,
            ingresos: totals.income,
            gastos: totals.expenses,
            costos: totals.costs,
            balance: totals.income - (totals.expenses + totals.costs)
        };
    });

    return data;
};

export const exportToCSV = (transactions: Transaction[]) => {
    const headers = ['ID', 'Tipo', 'Descripción', 'Categoría', 'Fecha', 'Valor'];
    const rows = transactions.map(t => [
        t.id,
        t.type,
        t.description,
        t.category,
        t.date,
        t.value
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_financiero_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
