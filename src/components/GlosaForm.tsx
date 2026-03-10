'use client';

import React, { useState, useMemo } from 'react';
import { Save, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { useToast } from '@/lib/contexts/ToastContext';
import { sanitizeGlosaForm } from '@/lib/sanitize';

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

    // Cálculos de control diario con formato MANUAL y SEGURO (DD/MM/YYYY)
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }, []);

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
            const matchesDate = normalizeDate(g.fecha) === todayNormalized;
            const itemSection = (g as any).seccion?.toUpperCase() || 'GLOSAS';
            const currentUpper = currentSeccion.toUpperCase();
            return matchesDate && itemSection === currentUpper;
        });

        // 2. Filtrar Ingresos (Pagos) de hoy
        const todayIngresos = (existingIngresos || []).filter(i => {
            if (!i.fecha) return false;
            const matchesDate = normalizeDate(i.fecha) === todayNormalized;
            const itemSection = (i as any).seccion?.toUpperCase() || 'GLOSAS';
            const currentUpper = currentSeccion.toUpperCase();
            return matchesDate && itemSection === currentUpper;
        });

        const uniqueFacturas = new Set([
            ...todayGlosas.map(g => g.factura),
            ...todayIngresos.map(i => i.factura)
        ]).size;

        // Valor total ingresado = valor_glosa de glosas + valor_aceptado de ingresos
        const totalValue =
            todayGlosas.reduce((acc, g) => acc + (parseFloat(g.valor_glosa as any) || 0), 0) +
            todayIngresos.reduce((acc, i) => acc + (parseFloat(i.valor_aceptado as any) || 0), 0);

        // Valor aceptado = SOLO glosas de hoy con estado 'Aceptada'
        const valorAceptado =
            todayGlosas.filter(g => g.estado === 'Aceptada').reduce((acc, g) => acc + (parseFloat(g.valor_aceptado as any) || 0), 0);

        return {
            count: todayGlosas.length + todayIngresos.length,
            facturas: uniqueFacturas,
            value: totalValue,
            valorAceptado
        };
    }, [existingGlosas, existingIngresos, todayStr, currentSeccion]);

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

    const handleSubmit = (e: React.FormEvent) => {
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
            showToast('❌ FACTURA YA EXISTE: Esta factura ya está en el sistema.', 'error');
            return;
        }

        if (isDupeMatch && !forceSubmit) {
            showToast('⚠ REGISTRO DUPLICADO: Esta factura ya tiene un registro idéntico hoy.', 'info');
            return;
        }

        const uniqueId = typeof window !== 'undefined' && window.crypto && (window.crypto as any).randomUUID
            ? (window.crypto as any).randomUUID()
            : Math.random().toString(36).substring(2) + Date.now().toString(36);

        // Sanitize all fields before storing (XSS protection)
        const sanitizedData = sanitizeGlosaForm({
            ...formData,
            factura,
            servicio,
            id: uniqueId,
            valor_glosa: valor,
            valor_aceptado: valorAceptado,
            fecha: nowTimestamp(),
            registrada_internamente: false,
            seccion: currentSeccion.toUpperCase()
        });

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
        setForceSubmit(false);

        console.log('✅ Registro enviado y formulario reseteado:', uniqueId);
    };

    const formTitle = currentSeccion === 'MEDICAMENTOS' ? 'Registrar Medicamentos' : 'Registrar Gestión de Glosa';
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
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
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
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
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
                    <div className="input-group" style={{ marginTop: '1.5rem' }}>
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
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', marginTop: '1rem' }}>
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
                            style={{
                                width: '100%',
                                gap: '0.75rem',
                                marginTop: '1rem',
                                opacity: 1,
                                cursor: 'pointer',
                                background: facturaExiste ? 'rgba(139, 92, 246, 0.8)' : undefined,
                            }}
                        >
                            <Plus size={18} />
                            {facturaExiste ? 'Añadir nuevo registro a Factura' : 'Guardar Ingreso Diario'}
                        </button>
                    )
                )}

                {/* Indicadores de Control Diario */}
                <div style={{
                    marginTop: '2.5rem',
                    padding: '1.5rem',
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderRadius: '1.75rem',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1.25rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>INGRESOS DIARIOS</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white' }}>{dailyStats.count}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({dailyStats.facturas} facturas hoy)</span>
                        </div>
                    </div>
                    <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>VALOR TOTAL INGRESADO</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', textShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>${new Intl.NumberFormat('es-CO').format(dailyStats.value)}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>VALOR ACEPTADO</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 950, color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>${new Intl.NumberFormat('es-CO').format(dailyStats.valorAceptado)}</p>
                    </div>
                </div>
            </form>
        </Card>
    );
};
