import React, { useState, useMemo } from 'react';
import { Card } from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, ClipboardList, Calendar, Info, Tag, Hash, Activity, Pencil, Save, DollarSign, Trash2, AlertTriangle, Copy, CheckCircle2, UploadCloud, FileText, Filter, AlertCircle } from 'lucide-react';
import { safeNumber } from '@/lib/safeUtils';

const formatPesos = (value: any): string => {
    const n = safeNumber(value);
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

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
    sincronizado?: boolean;
    soporte_pdf?: string;
}

interface GlosaTableProps {
    glosas: Glosa[];
    onUpdateStatus: (id: string, newStatus: string) => void;
    onUpdateGlosa: (updatedGlosa: Glosa) => void;
    onDeleteGlosa: (id: string) => void;
    onDeleteDuplicates: () => void;
    onToggleInternalRegistry: (id: string, currentStatus: boolean) => void;
    onUploadPdf?: (id: string, file: File) => Promise<string | null>;
    onDeletePdf?: (id: string) => Promise<void>;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    filterTipo: string;
    setFilterTipo: (val: string) => void;
    filterEstado: string;
    setFilterEstado: (val: string) => void;
    filterInterno: string;
    setFilterInterno: (val: string) => void;
    onMarkAllAsRegistered: () => void;
    isAdmin?: boolean;

}

export const GlosaTable = ({
    glosas,
    onUpdateStatus,
    onUpdateGlosa,
    onDeleteGlosa,
    onDeleteDuplicates,
    onToggleInternalRegistry,
    onUploadPdf,
    onDeletePdf,
    searchTerm,
    setSearchTerm,
    filterTipo,
    setFilterTipo,
    filterEstado,
    setFilterEstado,
    filterInterno,
    setFilterInterno,
    onMarkAllAsRegistered,
    isAdmin = true

}: GlosaTableProps) => {
    const [selectedGlosa, setSelectedGlosa] = useState<Glosa | null>(null);
    const [editingGlosa, setEditingGlosa] = useState<Glosa | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [confirmMarkAll, setConfirmMarkAll] = useState(false);

    // ── RESUMEN CONTEXTUAL DEL FILTRO ACTIVO ──────────────────────────────
    const filterSummary = useMemo(() => {
        const safe = (glosas || []).filter(g => g && g.id);
        const total = safe.length;
        const pendientesRegistro = safe.filter(g => !g.registrada_internamente);
        const registradas = safe.filter(g => g.registrada_internamente);
        const totalValorPendiente = pendientesRegistro.reduce((acc, g) => acc + safeNumber(g.valor_glosa), 0);
        const hayFiltroActivo = filterEstado !== 'Todos' || filterTipo !== 'Todos' || filterInterno !== 'Todos' || searchTerm !== '';
        return { total, pendientesRegistro: pendientesRegistro.length, registradas: registradas.length, totalValorPendiente, hayFiltroActivo };
    }, [glosas, filterEstado, filterTipo, filterInterno, searchTerm]);

    const formatPesosSummary = (value: number): string => {
        return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };


    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pendiente': return { background: 'rgba(107, 126, 255, 0.1)', color: 'var(--primary)', borderColor: 'rgba(107, 126, 255, 0.2)' };
            case 'Respondida': return { background: 'rgba(148, 163, 184, 0.1)', color: 'var(--secondary)', borderColor: 'rgba(148, 163, 184, 0.2)' };
            case 'Aceptada': return { background: 'rgba(248, 113, 113, 0.08)', color: 'var(--danger)', borderColor: 'rgba(248, 113, 113, 0.2)' };
            default: return {};
        }
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingGlosa) {
            onUpdateGlosa(editingGlosa);
            setEditingGlosa(null);
        }
    };

    // Detectar IDs duplicados (misma factura + servicio + valor)
    // v11.0: Diferenciación entre Duplicado Exacto y Factura Repetida
    const duplicateData = useMemo(() => {
        const seenExact = new Map<string, string>(); // key: fact|serv|valor
        const seenFact = new Map<string, string>();  // key: factura

        const exactDupes = new Set<string>();
        const repeatedFacts = new Set<string>();

        const safeGlosas = (glosas || []).filter(g => g && g.id);

        safeGlosas.forEach(g => {
            const factKey = (g.factura || '').trim().toLowerCase();
            const serv = (g.servicio || '').trim().toLowerCase();
            const exactKey = `${factKey}|${serv}|${safeNumber(g.valor_glosa)}`;

            // 1. Detección de duplicado exacto
            if (seenExact.has(exactKey)) {
                exactDupes.add(g.id);
                exactDupes.add(seenExact.get(exactKey)!);
            } else {
                seenExact.set(exactKey, g.id);
            }

            // 2. Detección de factura repetida (mismo número, diferente contenido)
            if (seenFact.has(factKey)) {
                repeatedFacts.add(g.id);
                repeatedFacts.add(seenFact.get(factKey)!);
            } else {
                seenFact.set(factKey, g.id);
            }
        });

        return { exactDupes, repeatedFacts };
    }, [glosas]);

    const { exactDupes } = duplicateData;
    const duplicateCount = exactDupes.size;

    return (
        <>
            <Card title="Glosas Registradas" className="table-card" style={{ marginTop: 0 }}>
                {/* Controles de Búsqueda y Filtro */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    padding: '1.25rem',
                    background: 'rgba(255,255,255,0.015)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    alignItems: 'flex-end'
                }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Búsqueda Inteligente</label>
                        <div style={{ position: 'relative' }}>
                            <ClipboardList size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por factura o servicio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '0.75rem 1rem 0.75rem 2.8rem',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    </div>

                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Tipo de Glosa</label>
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '0.75rem 1rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="Todos">Todos los tipos</option>
                            <option value="Tarifas">Tarifas</option>
                            <option value="Cobertura">Cobertura</option>
                            <option value="Soportes">Soportes</option>
                            <option value="RIPS">RIPS</option>
                            <option value="Autorización">Autorización</option>
                        </select>
                    </div>

                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Estado</label>
                        <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '0.75rem 1rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="Todos">Cualquier estado</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Respondida">Respondida</option>
                            <option value="Aceptada">Aceptada</option>
                        </select>
                    </div>

                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Registro Interno</label>
                        <select
                            value={filterInterno}
                            onChange={(e) => setFilterInterno(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '0.75rem 1rem',
                                color: 'white',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="Todos">Todos</option>
                            <option value="Registrado">Registrado</option>
                            <option value="Pendiente">Sin Registrar</option>
                        </select>
                    </div>

                    <button
                        onClick={() => { setSearchTerm(''); setFilterTipo('Todos'); setFilterEstado('Todos'); setFilterInterno('Todos'); }}
                        style={{
                            padding: '0.75rem 1.25rem',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            height: '42px'
                        }}
                    >
                        <X size={14} /> LIMPIAR
                    </button>
                </div>

                {/* ── BARRA DE RESUMEN CONTEXTUAL ──────────────────────────────── */}
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    background: filterSummary.hayFiltroActivo
                        ? 'rgba(107, 126, 255, 0.05)'
                        : 'rgba(255,255,255,0.02)',
                    border: filterSummary.hayFiltroActivo
                        ? '1px solid rgba(107,126,255,0.2)'
                        : '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    transition: 'all 0.3s'
                }}>
                    {/* Lado izquierdo: totales de la vista */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={14} style={{ color: filterSummary.hayFiltroActivo ? 'var(--primary)' : 'var(--text-muted)' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: filterSummary.hayFiltroActivo ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {filterSummary.hayFiltroActivo ? 'Vista filtrada' : 'Vista completa'}
                            </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{filterSummary.total}</strong> glosas
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle2 size={13} />
                            <strong>{filterSummary.registradas}</strong> registradas
                        </span>
                    </div>

                    {/* Lado derecho: pendientes de registro */}
                    {filterSummary.pendientesRegistro > 0 ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            background: 'rgba(252, 211, 77, 0.07)',
                            border: '1px solid rgba(252,211,77,0.2)',
                            borderRadius: '8px',
                            padding: '0.4rem 1rem'
                        }}>
                            <AlertCircle size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--warning)' }}>
                                {filterSummary.pendientesRegistro} glosa{filterSummary.pendientesRegistro !== 1 ? 's' : ''} PENDIENTE{filterSummary.pendientesRegistro !== 1 ? 'S' : ''} DE REGISTRAR
                            </span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(252,211,77,0.65)' }}>
                                — ${formatPesosSummary(filterSummary.totalValorPendiente)}
                            </span>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(74, 222, 128, 0.05)',
                            border: '1px solid rgba(74,222,128,0.15)',
                            borderRadius: '8px',
                            padding: '0.4rem 1rem'
                        }}>
                            <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--success)' }}>✓ Todo registrado en esta vista</span>
                        </div>
                    )}
                </div>

                {/* Barra de duplicados */}
                {isAdmin && duplicateCount > 0 && (
                    <div style={{
                        marginBottom: '1.25rem',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(248,113,113,0.05)',
                        border: '1px solid rgba(248,113,113,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            {duplicateCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.8rem', fontWeight: 700 }}>
                                    <Copy size={16} />
                                    {duplicateCount} Duplicados Exactos (Rojo)
                                </div>
                            )}
                        </div>
                        {confirmDeleteAll ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', color: '#f87171' }}>¿Confirmar eliminación?</span>
                                <button
                                    onClick={() => { onDeleteDuplicates(); setConfirmDeleteAll(false); }}
                                    style={{ background: '#ef4444', border: 'none', color: 'white', padding: '0.35rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                >Sí, eliminar</button>
                                <button
                                    onClick={() => setConfirmDeleteAll(false)}
                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.35rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                >Cancelar</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmDeleteAll(true)}
                                style={{
                                    background: 'rgba(239,68,68,0.15)',
                                    border: '1px solid rgba(239,68,68,0.35)',
                                    color: '#f87171',
                                    padding: '0.4rem 1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <Trash2 size={14} /> Eliminar todos los duplicados EXACTOS
                            </button>
                        )}
                    </div>
                )}

                {/* Barra de Registro Masivo */}
                {isAdmin && (
                    <div style={{
                        marginBottom: '1.25rem',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(107,126,255,0.04)',
                        border: '1px solid rgba(107,126,255,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700 }}>
                            <CheckCircle2 size={18} />
                            <span>Gestión de Auditoría: Registro Masivo Interno</span>
                        </div>
                        {confirmMarkAll ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>¿Marcar todas como registradas?</span>
                                <button
                                    onClick={() => { onMarkAllAsRegistered(); setConfirmMarkAll(false); }}
                                    style={{ background: 'var(--primary)', border: 'none', color: '#000', padding: '0.35rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                                >SÍ, REGISTRAR TODO</button>
                                <button
                                    onClick={() => setConfirmMarkAll(false)}
                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.35rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                >Cancelar</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmMarkAll(true)}
                                style={{
                                    background: 'rgba(107, 126, 255, 0.08)',
                                    border: '1px solid rgba(107, 126, 255, 0.2)',
                                    color: 'var(--primary)',
                                    padding: '0.4rem 1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    textTransform: 'uppercase'
                                }}
                            >
                                <ClipboardList size={14} /> Marcar todas como registradas (Auditoría OK)
                            </button>
                        )}
                    </div>
                )}


                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }} className="custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1.25rem 1rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', width: '60px', textAlign: 'center' }}>Check</th>
                                <th style={{ padding: '1.25rem 1rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Factura</th>
                                <th style={{ padding: '1.25rem 1rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Servicio</th>
                                <th style={{ padding: '1.25rem 1rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Valor</th>
                                <th style={{ padding: '1.25rem 1rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Estado</th>
                                <th style={{ padding: '1.25rem 1rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Guard: filtrar elementos nulos antes de renderizar */}
                            {(glosas || []).filter(g => g && g.id).length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No hay registros de glosas disponibles.
                                    </td>
                                </tr>
                            ) : (
                                (glosas || []).filter(g => g && g.id).map((glosa, index) => {
                                    const isExactDupe = exactDupes.has(glosa.id);

                                    return (
                                        <tr
                                            key={glosa.id}
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                transition: 'background 0.2s',
                                                background: glosa.registrada_internamente
                                                        ? 'rgba(107, 126, 255, 0.04)'
                                                    : (isExactDupe ? 'rgba(248,113,113,0.04)' : (index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')),
                                                borderLeft: glosa.registrada_internamente ? '3px solid rgba(107,126,255,0.4)' : (isExactDupe ? '3px solid rgba(248,113,113,0.5)' : '1px solid var(--border)')
                                            }}
                                        >
                                            <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                                                <motion.button
                                                    whileHover={glosa.registrada_internamente ? {} : { scale: 1.2 }}
                                                    whileTap={glosa.registrada_internamente ? {} : { scale: 0.9 }}
                                                    onClick={() => onToggleInternalRegistry(glosa.id, !!glosa.registrada_internamente)}
                                                    disabled={glosa.registrada_internamente}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: glosa.registrada_internamente ? 'default' : 'pointer',
                                                        color: glosa.registrada_internamente ? 'var(--secondary)' : 'var(--text-muted)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '100%',
                                                        opacity: glosa.registrada_internamente ? 1 : 0.4
                                                    }}
                                                    title={glosa.registrada_internamente ? "Registro permanente en sistema interno" : "Marcar como registrado en sistema interno"}
                                                >
                                                    <CheckCircle2 size={20} fill={glosa.registrada_internamente ? 'rgba(107,126,255,0.15)' : 'none'} />
                                                </motion.button>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem', fontWeight: 600, color: glosa.registrada_internamente ? 'var(--secondary)' : (isExactDupe ? 'var(--danger)' : 'var(--text-primary)') }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    {isExactDupe && <Copy size={13} style={{ flexShrink: 0 }} />}
                                                    <span>{glosa.factura}</span>
                                                    {glosa.sincronizado ? (
                                                        <div title="Sincronizado en la nube" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', opacity: 0.8 }}></div>
                                                    ) : (
                                                        <div title="Guardado localmente (Pendiente de subir)" style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--warning)', opacity: 0.8 }}></div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {glosa.servicio}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem', color: 'var(--text-primary)', fontWeight: 500 }}>${formatPesos(glosa.valor_glosa)}</td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                {isAdmin ? (
                                                    <select
                                                        value={glosa.estado}
                                                        onChange={(e) => onUpdateStatus(glosa.id, e.target.value)}
                                                        style={{
                                                            padding: '0.35rem 0.85rem',
                                                            borderRadius: '2rem',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            border: '1px solid transparent',
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            appearance: 'none',
                                                            ...getStatusStyle(glosa.estado)
                                                        }}
                                                    >
                                                        <option value="Pendiente">Pendiente</option>
                                                        <option value="Respondida">Respondida</option>
                                                        <option value="Aceptada">Aceptada</option>
                                                    </select>
                                                ) : (
                                                    <span style={{
                                                        padding: '0.35rem 0.85rem',
                                                        borderRadius: '2rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        ...getStatusStyle(glosa.estado)
                                                    }}>
                                                        {glosa.estado}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setSelectedGlosa(glosa)}
                                                        title="Ver detalles"
                                                        style={{
                                                            background: 'rgba(107, 126, 255, 0.05)',
                                                            border: '1px solid rgba(107, 126, 255, 0.1)',
                                                            color: 'var(--primary)',
                                                            padding: '0.5rem',
                                                            borderRadius: '0.75rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {glosa.soporte_pdf && (
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <a
                                                                href={glosa.soporte_pdf}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="Ver Nota Crédito/PDF"
                                                                style={{
                                                                    background: 'rgba(107, 126, 255, 0.06)',
                                                                    border: '1px solid rgba(107, 126, 255, 0.15)',
                                                                    color: 'var(--primary)',
                                                                    padding: '0.5rem',
                                                                    borderRadius: '0.75rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    transition: 'all 0.2s',
                                                                    textDecoration: 'none'
                                                                }}
                                                            >
                                                                <FileText size={16} />
                                                            </a>
                                                            {isAdmin && onDeletePdf && (
                                                                <button
                                                                    onClick={() => onDeletePdf(glosa.id)}
                                                                    title="Eliminar PDF"
                                                                    style={{
                                                                        background: 'rgba(248, 113, 113, 0.06)',
                                                                        border: '1px solid rgba(248, 113, 113, 0.15)',
                                                                        color: 'var(--danger)',
                                                                        padding: '0.5rem',
                                                                        borderRadius: '0.75rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {glosa.estado === 'Aceptada' && !glosa.soporte_pdf && isAdmin && onUploadPdf && (
                                                        <label
                                                            title="Anexar Nota Crédito PDF"
                                                            style={{
                                                                background: 'rgba(74, 222, 128, 0.06)',
                                                                border: '1px solid rgba(74, 222, 128, 0.15)',
                                                                color: 'var(--success)',
                                                                padding: '0.5rem',
                                                                borderRadius: '0.75rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                transition: 'all 0.2s',
                                                                margin: 0
                                                            }}
                                                        >
                                                            <UploadCloud size={16} />
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                style={{ display: 'none' }}
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        onUploadPdf(glosa.id, e.target.files[0]);
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setEditingGlosa(glosa)}
                                                            title="Editar registro"
                                                            style={{
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                color: 'white',
                                                                padding: '0.5rem',
                                                                borderRadius: '0.75rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                    )}
                                                    {/* Botón eliminar fila */}
                                                    {isAdmin && (
                                                        confirmDeleteId === glosa.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => { onDeleteGlosa(glosa.id); setConfirmDeleteId(null); }}
                                                                    title="Confirmar eliminación"
                                                                    style={{
                                                                        background: 'rgba(239,68,68,0.2)',
                                                                        border: '1px solid rgba(239,68,68,0.4)',
                                                                        color: '#f87171',
                                                                        padding: '0.5rem 0.65rem',
                                                                        borderRadius: '0.75rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: 700,
                                                                        gap: '0.2rem'
                                                                    }}
                                                                >
                                                                    <Trash2 size={13} /> OK
                                                                </button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(null)}
                                                                    title="Cancelar"
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.05)',
                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                        color: 'rgba(255,255,255,0.5)',
                                                                        padding: '0.5rem',
                                                                        borderRadius: '0.75rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmDeleteId(glosa.id)}
                                                                title="Eliminar registro"
                                                                style={{
                                                                    background: isExactDupe ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.07)',
                                                                    border: `1px solid rgba(239,68,68,${isExactDupe ? '0.35' : '0.2'})`,
                                                                    color: '#f87171',
                                                                    padding: '0.5rem',
                                                                    borderRadius: '0.75rem',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Detalles */}
            {selectedGlosa && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '20px'
                }} onClick={() => setSelectedGlosa(null)}>
                    <div style={{
                        background: 'var(--background)', width: '100%', maxWidth: '650px',
                        borderRadius: '24px', border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                        position: 'relative', overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(0, 99, 65, 0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '10px', background: 'rgba(0, 242, 254, 0.05)', borderRadius: '12px' }}>
                                    <ClipboardList size={20} color="var(--primary)" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Detalles de la Glosa</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', margin: '0.25rem 0 0 0' }}>Expediente de Auditoría</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedGlosa(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <DetailItem icon={<Hash size={16} />} label="Factura" value={selectedGlosa.factura} isBold />
                                <DetailItem icon={<Activity size={16} />} label="Servicio" value={selectedGlosa.servicio} />
                                <DetailItem icon={<Info size={16} />} label="Orden de Servicio" value={selectedGlosa.orden_servicio} />
                                <DetailItem icon={<Tag size={16} />} label="Tipo de Glosa" value={selectedGlosa.tipo_glosa} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <DetailItem icon={<DollarSign size={16} />} label="Valor Glosado" value={`$${formatPesos(selectedGlosa.valor_glosa)}`} isHighlight />
                                <DetailItem icon={<DollarSign size={16} />} label="Valor Aceptado" value={`$${formatPesos(selectedGlosa.valor_aceptado)}`} isHighlight color="var(--secondary)" />
                                <DetailItem icon={<Calendar size={16} />} label="Fecha de Registro" value={selectedGlosa.fecha} />
                                {/* Build Sync: Timestamp V1.0 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado Actual</span>
                                    <span style={{ padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 800, width: 'fit-content', ...getStatusStyle(selectedGlosa.estado) }}>{selectedGlosa.estado}</span>
                                </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <Info size={16} color="rgba(255,255,255,0.4)" />
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Descripción Adicional</span>
                                </div>
                                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {selectedGlosa.descripcion || "Sin descripción adicional registrada."}
                                </p>
                            </div>
                        </div>
                        <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-card)', textAlign: 'right' }}>
                            <button onClick={() => setSelectedGlosa(null)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición */}
            {editingGlosa && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '20px'
                }} onClick={() => setEditingGlosa(null)}>
                    <div style={{
                        background: 'var(--background)', width: '100%', maxWidth: '700px',
                        borderRadius: '24px', border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                        position: 'relative', overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSaveEdit}>
                            <div style={{
                                padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'rgba(0, 242, 254, 0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '10px', background: 'rgba(0, 99, 65, 0.05)', borderRadius: '12px' }}>
                                        <Pencil size={20} color="var(--primary)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Modificar Registro</h3>
                                </div>
                                <button type="button" onClick={() => setEditingGlosa(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>
                            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="input-group">
                                    <label className="label">Número de Factura</label>
                                    <input className="input" value={editingGlosa.factura} onChange={(e) => setEditingGlosa({ ...editingGlosa, factura: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="label">Valor Glosa</label>
                                    <input type="number" className="input" value={editingGlosa.valor_glosa} onChange={(e) => setEditingGlosa({ ...editingGlosa, valor_glosa: parseFloat(e.target.value) })} />
                                </div>
                                <div className="input-group">
                                    <label className="label">Valor Aceptado</label>
                                    <input type="number" className="input" value={editingGlosa.valor_aceptado} onChange={(e) => setEditingGlosa({ ...editingGlosa, valor_aceptado: parseFloat(e.target.value) })} />
                                </div>
                                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="label">Servicio / Descripción Operativa</label>
                                    <input className="input" value={editingGlosa.servicio} onChange={(e) => setEditingGlosa({ ...editingGlosa, servicio: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="label">Orden de Servicio</label>
                                    <input className="input" value={editingGlosa.orden_servicio} onChange={(e) => setEditingGlosa({ ...editingGlosa, orden_servicio: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="label">Tipo de Glosa</label>
                                    <select className="input" value={editingGlosa.tipo_glosa} onChange={(e) => setEditingGlosa({ ...editingGlosa, tipo_glosa: e.target.value })}>
                                        <option value="Tarifas">Tarifas</option>
                                        <option value="Cobertura">Cobertura</option>
                                        <option value="Soportes">Soportes</option>
                                        <option value="RIPS">RIPS</option>
                                        <option value="Autorización">Autorización</option>
                                    </select>
                                </div>
                                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="label">Descripción Detallada</label>
                                    <textarea className="input" style={{ minHeight: '120px', resize: 'vertical' }} value={editingGlosa.descripcion} onChange={(e) => setEditingGlosa({ ...editingGlosa, descripcion: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setEditingGlosa(null)} style={{ background: 'var(--background)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={18} /> Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

const DetailItem = ({ icon, label, value, isBold = false, isHighlight = false, color }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        </div>
        <span style={{
            fontSize: isHighlight ? '1.25rem' : '1rem',
            fontWeight: (isBold || isHighlight) ? 800 : 500,
            color: color || (isHighlight ? 'var(--primary)' : 'var(--text-primary)')
        }}>{value}</span>
    </div>
);
