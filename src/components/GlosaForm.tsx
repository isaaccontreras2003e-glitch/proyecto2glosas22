'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Save, Plus, AlertTriangle, CheckCircle2, UploadCloud, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { useToast } from '@/lib/contexts/ToastContext';
import { sanitizeGlosaForm } from '@/lib/sanitize';
import { supabase } from '@/lib/supabase';

interface Glosa {
    id: string;
    factura: string;
    servicio: string;
    orden_servicio: string;
    valor_glosa: number;
    valor_aceptado: number;
    descripcion: string;
    tipo_glosa: string;
    estado: string;
    fecha: string;
    registrada_internamente?: boolean;
    seccion?: string;
    soporte_pdf?: string;
}

interface GlosaFormProps {
    onAddGlosa: (glosa: any) => void;
    existingGlosas: Glosa[];
    existingIngresos?: any[];
    currentSeccion: string;
    isAdmin?: boolean;
}

export const GlosaForm = ({ onAddGlosa, existingGlosas, existingIngresos = [], currentSeccion, isAdmin = true }: GlosaFormProps) => {
    const [formData, setFormData] = useState({
        factura: '',
        servicio: '',
        orden_servicio: '',
        valor_glosa: '',
        valor_aceptado: '',
        descripcion: '',
        tipo_glosa: 'Tarifas',
        estado: 'Pendiente'
    });
    const { showToast } = useToast();
    const [forceSubmit, setForceSubmit] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);

    // PERSISTENCIA: Cargar datos guardados al montar
    useEffect(() => {
        const saved = localStorage.getItem(`glosa_form_draft_${currentSeccion}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Error cargando borrador:', e);
            }
        }
    }, [currentSeccion]);

    // PERSISTENCIA: Guardar cambios automáticamente
    useEffect(() => {
        const hasData = Object.values(formData).some(val => val !== '' && val !== 'Tarifas' && val !== 'Pendiente');
        if (hasData) {
            localStorage.setItem(`glosa_form_draft_${currentSeccion}`, JSON.stringify(formData));
        } else {
            localStorage.removeItem(`glosa_form_draft_${currentSeccion}`);
        }
    }, [formData, currentSeccion]);

    // Cálculos de control diario con formato MANUAL y SEGURO (DD/MM/YYYY)
    // v10.1: RELOJ DINÁMICO - Se actualiza solo al cambiar el día
    const [currentDateStr, setCurrentDateStr] = useState(() => {
        const d = new Date();
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const d = new Date();
            const newDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            if (newDate !== currentDateStr) {
                console.log('🔄 Cambio de día detectado:', newDate);
                setCurrentDateStr(newDate);
            }
        }, 60000); // Revisar cada minuto
        return () => clearInterval(timer);
    }, [currentDateStr]);

    const todayStr = currentDateStr;

    const nowTimestamp = () => {
        const d = new Date();
        const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
        return `${date}, ${time}`;
    };

    const dailyStats = useMemo(() => {
        const normalizeDate = (d: string) => {
            if (!d) return '';
            const datePart = d.split(',')[0].trim();
            return datePart.replace(/[-\.]/g, '/');
        };

        const todayNormalized = normalizeDate(todayStr);

        // 1. Filtrar Glosas de hoy
        const todayGlosas = (existingGlosas || []).filter(g => {
            if (!g.fecha) return false;
            return normalizeDate(g.fecha) === todayNormalized;
        });

        // 2. Filtrar Ingresos (Pagos) de hoy
        const todayIngresos = (existingIngresos || []).filter(i => {
            if (!i.fecha) return false;
            return normalizeDate(i.fecha) === todayNormalized;
        });

        const uniqueFacturas = new Set(todayGlosas.map(g => g.factura)).size;

        // Valor total ingresado = SOLO valor_glosa de glosas de hoy
        const totalValue =
            todayGlosas.reduce((acc, g) => acc + (parseFloat(g.valor_glosa as any) || 0), 0);

        // Valor aceptado = SOLO glosas de hoy con estado 'Aceptada'
        const valorAceptado =
            todayGlosas.filter(g => g.estado === 'Aceptada').reduce((acc, g) => acc + (parseFloat(g.valor_aceptado as any) || 0), 0);

        return {
            count: todayGlosas.length,
            facturas: uniqueFacturas,
            value: totalValue,
            valorAceptado
        };
    }, [existingGlosas, todayStr, currentSeccion]);

    // Detectar si la factura ya existe
    const facturaMatch = useMemo(() => {
        if (!formData.factura.trim()) return null;
        return existingGlosas.filter(
            g => g.factura.trim().toLowerCase() === formData.factura.trim().toLowerCase()
        );
    }, [formData.factura, existingGlosas]);

    // v9.1: Protección de integridad con navegación segura
    const isDupeMatch = useMemo(() => {
        if (!formData.factura || !formData.servicio) return false;
        const formFact = (formData.factura || '').trim().toLowerCase();
        const formServ = (formData.servicio || '').trim().toLowerCase();
        const formValor = parseFloat(formData.valor_glosa) || 0;

        return (existingGlosas || []).some(g => {
            if (!g) return false;
            const gFact = (g.factura || '').trim().toLowerCase();
            const gServ = (g.servicio || '').trim().toLowerCase();
            return gFact === formFact && gServ === formServ && g.valor_glosa === formValor;
        });
    }, [formData, existingGlosas]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // VALIDACIÓN SENIOR: Protección de integridad de datos
        const factura = formData.factura.trim();
        const servicio = formData.servicio.trim();
        const valor = parseFloat(formData.valor_glosa);
        const valorAceptado = parseFloat(formData.valor_aceptado || '0');

        if (!factura || !servicio || isNaN(valor)) {
            showToast('❌ CAMPOS REQUERIDOS: Completa Factura, Servicio y Valor.', 'error');
            return;
        }

        if (valor < 0 || valorAceptado < 0) {
            showToast('❌ ERROR: Los valores no pueden ser negativos.', 'error');
            return;
        }

        if (facturaExiste && !forceSubmit) {
            showToast('⚠️ ATENCIÓN: Esta factura ya tiene registros previos. Revisa si es un nuevo servicio.', 'info');
            // No bloqueamos completamente si no es dupe exacto, pero mostramos info
        }

        if (isDupeMatch && !forceSubmit) {
            showToast('❌ ERROR: REGISTRO DUPLICADO EXACTO. Ya existe este servicio con este valor para esta factura.', 'error');
            return;
        }

        const uniqueId = typeof window !== 'undefined' && window.crypto && (window.crypto as any).randomUUID
            ? (window.crypto as any).randomUUID()
            : Math.random().toString(36).substring(2) + Date.now().toString(36);

        const sanitizedData: Glosa = sanitizeGlosaForm({
            ...formData,
            factura,
            servicio,
            id: uniqueId,
            valor_glosa: valor,
            valor_aceptado: valorAceptado,
            fecha: nowTimestamp(),
            registrada_internamente: false,
            seccion: currentSeccion.toUpperCase()
        }) as any;

        if (pdfFile && formData.estado === 'Aceptada') {
            setIsUploadingPdf(true);
            try {
                showToast('Subiendo PDF...', 'info');
                const fileExt = pdfFile.name.split('.').pop();
                const fileName = `${uniqueId}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('soportes_glosas').upload(fileName, pdfFile, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = supabase.storage.from('soportes_glosas').getPublicUrl(fileName);
                sanitizedData.soporte_pdf = publicUrlData.publicUrl;
            } catch (err: any) {
                console.error(err);
                showToast('Error subiendo PDF: ' + err.message, 'error');
            } finally {
                setIsUploadingPdf(false);
            }
        }

        onAddGlosa(sanitizedData);

        // Mostrar éxito instantáneo
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        // RESET ABSOLUTO: Limpiar todo para el siguiente registro
        setFormData({
            factura: '',
            servicio: '',
            orden_servicio: '',
            valor_glosa: '',
            valor_aceptado: '',
            descripcion: '',
            tipo_glosa: 'Tarifas',
            estado: 'Pendiente'
        });
        localStorage.removeItem(`glosa_form_draft_${currentSeccion}`);
        setForceSubmit(false);
        setPdfFile(null);

        console.log('✅ Registro enviado y formulario reseteado:', uniqueId);
    };

    const formTitle = 'Registrar Gestión de Glosa';
    const facturaExiste = facturaMatch && facturaMatch.length > 0;
    const alertColor = isDupeMatch ? '#ef4444' : '#f59e0b';

    return (
        <Card
            title={formTitle}
        >
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            padding: '1rem',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                        }}>
                            <CheckCircle2 size={20} />
                            Registro exitoso el día {todayStr} en la sección {currentSeccion}.
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>1. Información de la Factura</p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'var(--surface)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-premium)'
                    }}>
                        <div className="input-group">
                            <label className="label">Número de Factura</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ej: FAC-10020"
                                value={formData.factura}
                                style={{
                                    borderColor: isDupeMatch
                                        ? 'rgba(239,68,68,0.6)'
                                        : facturaExiste
                                            ? 'rgba(245,158,11,0.6)'
                                            : undefined
                                }}
                                onChange={(e) => {
                                    setFormData({ ...formData, factura: e.target.value });
                                    setForceSubmit(false);
                                }}
                            />
                            {/* Alerta de factura existente */}
                            {facturaExiste && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    padding: '0.6rem 0.85rem',
                                    borderRadius: '10px',
                                    background: `rgba(${isDupeMatch ? '239,68,68' : '245,158,11'},0.08)`,
                                    border: `1px solid rgba(${isDupeMatch ? '239,68,68' : '245,158,11'},0.25)`,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.6rem',
                                    fontSize: '0.72rem',
                                    color: alertColor,
                                    lineHeight: 1.4
                                }}>
                                    <AlertTriangle size={14} style={{ marginTop: '1px', flexShrink: 0 }} />
                                    <div>
                                        {isDupeMatch
                                            ? <><strong>⚠ DUPLICADO EXACTO:</strong> Esta factura ya tiene registrado el mismo servicio y valor.</>
                                            : <><strong>Factura ya ingresada</strong> con {facturaMatch!.length} registro(s): {facturaMatch!.map(g => g.servicio).join(', ')}.</>
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="input-group">
                            <label className="label">Servicio</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ej: Consulta Externa"
                                value={formData.servicio}
                                onChange={(e) => setFormData({ ...formData, servicio: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">Orden de Servicio</label>
                            <input
                                id="orden_servicio"
                                type="text"
                                className="input"
                                placeholder="Ej: OS-9988"
                                value={formData.orden_servicio}
                                onChange={(e) => setFormData({ ...formData, orden_servicio: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>2. Clasificación y Estado</p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'var(--surface)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-premium)'
                    }}>
                        <div className="input-group">
                            <label className="label">Valor Glosa</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="0.00"
                                value={formData.valor_glosa}
                                onChange={(e) => setFormData({ ...formData, valor_glosa: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">Valor Aceptado</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="0.00"
                                value={formData.valor_aceptado}
                                onChange={(e) => setFormData({ ...formData, valor_aceptado: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">Tipo de Glosa</label>
                            <select
                                className="input"
                                value={formData.tipo_glosa}
                                onChange={(e) => setFormData({ ...formData, tipo_glosa: e.target.value })}
                            >
                                <option value="Tarifas">Tarifas</option>
                                <option value="Soportes">Soportes</option>
                                <option value="RIPS">RIPS</option>
                                <option value="Autorización">Autorización</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="label">Estado Inicial</label>
                            <select
                                className="input"
                                value={formData.estado}
                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                            >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Respondida">Respondida</option>
                                <option value="Aceptada">Aceptada</option>
                            </select>
                        </div>
                    </div>

                    <AnimatePresence>
                        {formData.estado === 'Aceptada' && isAdmin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden', marginTop: '1.5rem', gridColumn: '1 / -1' }}
                            >
                                <div style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px dashed rgba(0, 242, 254, 0.3)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                                    <input
                                        type="file"
                                        id="pdf-upload"
                                        accept=".pdf"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setPdfFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <label htmlFor="pdf-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: pdfFile ? 'var(--secondary)' : 'var(--text-muted)' }}>
                                        {pdfFile ? <FileText size={32} /> : <UploadCloud size={32} />}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{pdfFile ? pdfFile.name : 'Anexar Nota Crédito PDF (Opcional)'}</span>
                                    </label>
                                    {pdfFile && (
                                        <button type="button" onClick={() => setPdfFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', marginTop: '0.5rem', cursor: 'pointer', textDecoration: 'underline' }}>Quitar archivo</button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="input-group" style={{ marginTop: '1.5rem', gridColumn: '1 / -1' }}>
                        <label className="label">Descripción Adicional</label>
                        <textarea
                            className="input"
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            placeholder="Detalles sobre el motivo de la glosa..."
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            disabled={!isAdmin}
                        />
                    </div>
                </div>

                {!isAdmin && (
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', border: '1px dashed var(--border)', marginTop: '1rem' }}>
                        Cuenta en modo <strong>LECTURA</strong>. No puedes realizar registros.
                    </div>
                )}

                {/* Botón principal o botón de confirmación si es duplicado exacto */}
                {isAdmin && (
                    isDupeMatch && !forceSubmit ? (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, factura: '', servicio: '', valor_glosa: '', valor_aceptado: '' })}
                                className="btn btn-secondary"
                                style={{ flex: 1, gap: '0.5rem' }}
                            >
                                Limpiar Formulario
                            </button>
                            <button
                                type="button"
                                onClick={() => setForceSubmit(true)}
                                className="btn btn-primary"
                                style={{ flex: 1, gap: '0.5rem', background: 'rgba(239,68,68,0.8)', fontSize: '0.8rem' }}
                            >
                                <AlertTriangle size={16} />
                                Registrar de todas formas
                            </button>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isUploadingPdf}
                            style={{
                                width: '100%',
                                gap: '0.75rem',
                                marginTop: '1rem',
                                opacity: isUploadingPdf ? 0.7 : 1,
                                cursor: isUploadingPdf ? 'wait' : 'pointer',
                                background: facturaExiste ? 'var(--secondary)' : undefined,
                            }}
                        >
                            {facturaExiste ? <AlertTriangle size={18} /> : (isUploadingPdf ? <Save size={18} /> : <Plus size={18} />)}
                            {facturaExiste ? 'Añadir nuevo registro a Factura' : (isUploadingPdf ? 'Subiendo PDF y Guardando...' : 'Guardar Ingreso Diario')}
                        </button>
                    )
                )}

                {/* Indicadores de Control Diario */}
                <div style={{
                    marginTop: '2.5rem',
                    padding: '1.5rem',
                    background: 'var(--surface)',
                    borderRadius: '1.75rem',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1.25rem',
                    boxShadow: 'var(--shadow-premium)'
                }}>
                    <div style={{ borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>INGRESOS DIARIOS</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fff' }}>{dailyStats.count}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({dailyStats.facturas} facturas hoy)</span>
                        </div>
                    </div>
                    <div style={{ borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>VALOR TOTAL INGRESADO</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', textShadow: '0 0 20px var(--primary-glow)' }}>${new Intl.NumberFormat('es-CO').format(dailyStats.value)}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>VALOR ACEPTADO</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--danger)', textShadow: '0 0 20px var(--danger-glow)' }}>${new Intl.NumberFormat('es-CO').format(dailyStats.valorAceptado)}</p>
                    </div>
                </div>
            </form>
        </Card>
    );
};
