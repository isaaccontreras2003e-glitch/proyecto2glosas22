'use client';

import React, { useState, useMemo } from 'react';
import { Save, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from './Card';

interface Glosa {
    id: string;
    factura: string;
    servicio: string;
    orden_servicio: string;
    valor_glosa: number;
    descripcion: string;
    tipo_glosa: string;
    estado: string;
    fecha: string;
}

interface GlosaFormProps {
    onAddGlosa: (glosa: any) => void;
    existingGlosas: Glosa[];
}

export const GlosaForm = ({ onAddGlosa, existingGlosas }: GlosaFormProps) => {
    const [formData, setFormData] = useState({
        factura: '',
        servicio: '',
        orden_servicio: '',
        valor_glosa: '',
        descripcion: '',
        tipo_glosa: 'Tarifas',
        estado: 'Pendiente'
    });
    const [forceSubmit, setForceSubmit] = useState(false);

    // Detectar si la factura ya existe
    const facturaMatch = useMemo(() => {
        if (!formData.factura.trim()) return null;
        return existingGlosas.filter(
            g => g.factura.trim().toLowerCase() === formData.factura.trim().toLowerCase()
        );
    }, [formData.factura, existingGlosas]);

    // Detectar si es duplicado exacto (factura + servicio + valor)
    const isDuplicateExact = useMemo(() => {
        if (!formData.factura || !formData.servicio || !formData.valor_glosa) return false;
        return existingGlosas.some(
            g =>
                g.factura.trim().toLowerCase() === formData.factura.trim().toLowerCase() &&
                g.servicio.trim().toLowerCase() === formData.servicio.trim().toLowerCase() &&
                g.valor_glosa === parseFloat(formData.valor_glosa)
        );
    }, [formData, existingGlosas]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.factura || !formData.servicio || !formData.valor_glosa) return;
        if (isDuplicateExact && !forceSubmit) return; // Bloquear si es duplicado exacto sin confirmación

        onAddGlosa({
            ...formData,
            id: Math.random().toString(36).substr(2, 9),
            valor_glosa: parseFloat(formData.valor_glosa),
            fecha: new Date().toLocaleDateString('es-ES')
        });

        setFormData({
            factura: '',
            servicio: '',
            orden_servicio: '',
            valor_glosa: '',
            descripcion: '',
            tipo_glosa: 'Tarifas',
            estado: 'Pendiente'
        });
        setForceSubmit(false);
    };

    const facturaExiste = facturaMatch && facturaMatch.length > 0;
    const alertColor = isDuplicateExact ? '#ef4444' : '#f59e0b';

    return (
        <Card title="Registrar Gestión de Glosa">
            <form onSubmit={handleSubmit}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <div className="input-group">
                        <label className="label">Número de Factura</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Ej: FAC-10020"
                            value={formData.factura}
                            style={{
                                borderColor: isDuplicateExact
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
                                background: `rgba(${isDuplicateExact ? '239,68,68' : '245,158,11'},0.08)`,
                                border: `1px solid rgba(${isDuplicateExact ? '239,68,68' : '245,158,11'},0.25)`,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.6rem',
                                fontSize: '0.72rem',
                                color: alertColor,
                                lineHeight: 1.4
                            }}>
                                <AlertTriangle size={14} style={{ marginTop: '1px', flexShrink: 0 }} />
                                <div>
                                    {isDuplicateExact
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
                            type="text"
                            className="input"
                            placeholder="Ej: OS-9988"
                            value={formData.orden_servicio}
                            onChange={(e) => setFormData({ ...formData, orden_servicio: e.target.value })}
                        />
                    </div>
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
                <div className="input-group">
                    <label className="label">Descripción Adicional</label>
                    <textarea
                        className="input"
                        style={{ minHeight: '100px', resize: 'vertical' }}
                        placeholder="Detalles sobre el motivo de la glosa..."
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    />
                </div>

                {/* Botón principal o botón de confirmación si es duplicado exacto */}
                {isDuplicateExact && !forceSubmit ? (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, factura: '', servicio: '', valor_glosa: '' })}
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
                        style={{ width: '100%', gap: '0.75rem', marginTop: '1rem' }}
                    >
                        {forceSubmit ? <AlertTriangle size={18} /> : <Plus size={18} />}
                        {forceSubmit ? 'Confirmar Registro Duplicado' : 'Guardar Registro'}
                    </button>
                )}
            </form>
        </Card>
    );
};
