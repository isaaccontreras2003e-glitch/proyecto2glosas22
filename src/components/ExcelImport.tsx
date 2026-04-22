'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/contexts/ToastContext';

interface ExcelImportProps {
    onComplete: () => void;
}

export const ExcelImport = ({ onComplete }: ExcelImportProps) => {
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [stats, setStats] = useState<{ glosas: number; ingresos: number } | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setStats(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });

                let glosasToInsert: any[] = [];
                let ingresosToInsert: any[] = [];

                // 1. Procesar Glosas
                const gSheet = wb.Sheets['📋 Glosas'];
                if (gSheet) {
                    const rows = XLSX.utils.sheet_to_json(gSheet, { header: 1 }) as any[][];
                    const seen = new Set();
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row[0] === 'TOTALES' || !row[1] || !row[13]) continue;
                        
                        // Deduplicación estricta por Factura (Instrucción Usuario V9.0)
                        const contentKey = String(row[1]).trim().toUpperCase();
                        if (seen.has(contentKey)) continue;
                        seen.add(contentKey);

                        glosasToInsert.push({
                            factura: String(row[1]).trim(),
                            servicio: String(row[2] || '').trim(),
                            orden_servicio: String(row[3] || '').trim(),
                            valor_glosa: Number(row[4]) || 0,
                            valor_aceptado: Number(row[5]) || 0,
                            valor_no_aceptado: Number(row[6]) || 0,
                            estado: String(row[7] || 'Pendiente'),
                            tipo_glosa: String(row[8] || 'Tarifas'),
                            descripcion: String(row[9] || ''),
                            registrada_internamente: String(row[10]).includes('SÍ'),
                            soporte_pdf: row[11] || null,
                            fecha: String(row[12] || ''),
                            id: String(row[13]).trim()
                        });
                    }
                }

                // 2. Procesar Ingresos
                const iSheet = wb.Sheets['💰 Ingresos'];
                if (iSheet) {
                    const rows = XLSX.utils.sheet_to_json(iSheet, { header: 1 }) as any[][];
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row[0] === 'TOTALES' || !row[1] || !row[6]) continue;
                        ingresosToInsert.push({
                            factura: String(row[1]).trim(),
                            valor_aceptado: Number(row[2]) || 0,
                            valor_no_aceptado: Number(row[3]) || 0,
                            fecha: String(row[4] || ''),
                            soporte_pdf: row[5] || null,
                            id: String(row[6]).trim()
                        });
                    }
                }

                if (glosasToInsert.length === 0 && ingresosToInsert.length === 0) {
                    throw new Error('No se encontraron datos válidos en las hojas "Glosas" o "Ingresos".');
                }

                showToast(`Iniciando restauración de ${glosasToInsert.length} glosas y ${ingresosToInsert.length} ingresos...`, 'info');

                // 3. Subir a Supabase en lotes
                if (glosasToInsert.length > 0) {
                    for (let i = 0; i < glosasToInsert.length; i += 50) {
                        const batch = glosasToInsert.slice(i, i + 50);
                        const { error } = await supabase.from('glosas').upsert(batch, { onConflict: 'id' });
                        if (error) throw error;
                    }
                }

                if (ingresosToInsert.length > 0) {
                    for (let i = 0; i < ingresosToInsert.length; i += 50) {
                        const batch = ingresosToInsert.slice(i, i + 50);
                        const { error } = await supabase.from('ingresos').upsert(batch, { onConflict: 'id' });
                        if (error) throw error;
                    }
                }

                setStats({ glosas: glosasToInsert.length, ingresos: ingresosToInsert.length });
                showToast('✅ Restauración completada con éxito', 'success');
                onComplete();
            } catch (err: any) {
                console.error(err);
                showToast('Error al importar Excel: ' + err.message, 'error');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div style={{
            padding: '2rem',
            background: 'var(--surface)',
            borderRadius: '24px',
            border: '2px dashed var(--border)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            margin: '1rem 0'
        }}>
            <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(0, 177, 113, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
            }}>
                {isProcessing ? <Loader2 size={32} className="animate-spin" /> : <FileSpreadsheet size={32} />}
            </div>

            <div style={{ maxWidth: '400px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Importar Restauración de Emergencia</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Selecciona el archivo Excel <strong>BACKUP_RECUPERADO</strong> que tienes en tu escritorio para restaurar todos los datos borrados.
                </p>
            </div>

            {!stats ? (
                <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1.5rem',
                    background: 'var(--primary)',
                    color: '#000',
                    borderRadius: '12px',
                    fontWeight: 800,
                    cursor: isProcessing ? 'wait' : 'pointer',
                    opacity: isProcessing ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                }}>
                    <Upload size={20} />
                    {isProcessing ? 'Procesando...' : 'Seleccionar Archivo Excel'}
                    <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isProcessing} />
                </label>
            ) : (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    fontSize: '0.9rem',
                    fontWeight: 700
                }}>
                    <CheckCircle size={20} />
                    Restaurados: {stats.glosas} glosas y {stats.ingresos} ingresos.
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>
                <AlertCircle size={14} />
                Solo usa esta herramienta para restaurar datos perdidos.
            </div>
        </div>
    );
};
