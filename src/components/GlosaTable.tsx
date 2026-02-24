import React, { useState, useMemo } from 'react';
import { Card } from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, ClipboardList, Calendar, Info, Tag, Hash, Activity, Pencil, Save, DollarSign, Trash2, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';

const formatPesos = (value: number): string =>
    Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

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
    registrada_internamente?: boolean;
}

interface GlosaTableProps {
    glosas: Glosa[];
    onUpdateStatus: (id: string, newStatus: string) => void;
    onUpdateGlosa: (updatedGlosa: Glosa) => void;
    onDeleteGlosa: (id: string) => void;
    onDeleteDuplicates: () => void;
    onToggleInternalRegistry: (id: string, currentStatus: boolean) => void;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    filterTipo: string;
    setFilterTipo: (val: string) => void;
    filterEstado: string;
    setFilterEstado: (val: string) => void;
    filterInterno: string;
    setFilterInterno: (val: string) => void;
    isAdmin?: boolean;
}

export const GlosaTable = ({
    glosas,
    onUpdateStatus,
    onUpdateGlosa,
    onDeleteGlosa,
    onDeleteDuplicates,
    onToggleInternalRegistry,
    searchTerm,
    setSearchTerm,
    filterTipo,
    setFilterTipo,
    filterEstado,
    setFilterEstado,
    filterInterno,
    setFilterInterno,
    isAdmin = true
}: GlosaTableProps) => {
    const [selectedGlosa, setSelectedGlosa] = useState<Glosa | null>(null);
    const [editingGlosa, setEditingGlosa] = useState<Glosa | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pendiente': return { background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.3)' };
            case 'Respondida': return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' };
            case 'Aceptada': return { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' };
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
    const duplicateIds = useMemo(() => {
        const seen = new Map<string, string>();
        const dupes = new Set<string>();
        glosas.forEach(g => {
            const key = `${g.factura.trim().toLowerCase()}|${g.servicio.trim().toLowerCase()}|${g.valor_glosa}`;
            if (seen.has(key)) {
                dupes.add(g.id);
                dupes.add(seen.get(key)!);
            } else {
                seen.set(key, g.id);
            }
        });
        return dupes;
    }, [glosas]);

    const duplicateCount = duplicateIds.size;

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
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    alignItems: 'flex-end'
                }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Búsqueda Inteligente</label>
                        <div style={{ position: 'relative' }}>
                            <ClipboardList size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por factura o servicio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '0.75rem 1rem 0.75rem 2.8rem',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>
                    </div>

                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Tipo de Glosa</label>
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '0.75rem 1rem',
                                color: 'white',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="Todos">Todos los tipos</option>
                            <option value="Tarifas">Tarifas</option>
                            <option value="Soportes">Soportes</option>
                            <option value="RIPS">RIPS</option>
                            <option value="Autorización">Autorización</option>
                        </select>
                    </div>

                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Estado</label>
                        <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '0.75rem 1rem',
                                color: 'white',
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
                        <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Registro Interno</label>
                        <select
                            value={filterInterno}
                            onChange={(e) => setFilterInterno(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
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
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: 'rgba(255,255,255,0.6)',
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

                {/* Barra de duplicados */}
                {isAdmin && duplicateCount > 0 && (
                    <div style={{
                        marginBottom: '1.25rem',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(239,68,68,0.07)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#f87171', fontSize: '0.8rem', fontWeight: 700 }}>
                            <Copy size={16} />
                            {duplicateCount} registro(s) duplicado(s) detectado(s) — marcados en rojo
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
                                <Trash2 size={14} /> Eliminar todos los duplicados
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
                            {glosas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No hay registros de glosas disponibles.
                                    </td>
                                </tr>
                            ) : (
                                glosas.map((glosa) => {
                                    const isDupe = duplicateIds.has(glosa.id);
                                    return (
                                        <tr
                                            key={glosa.id}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'background 0.2s',
                                                background: glosa.registrada_internamente ? 'rgba(16,185,129,0.03)' : (isDupe ? 'rgba(239,68,68,0.05)' : undefined),
                                                borderLeft: glosa.registrada_internamente ? '3px solid #10b981' : (isDupe ? '3px solid rgba(239,68,68,0.5)' : '3px solid transparent')
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
                                                        color: glosa.registrada_internamente ? '#10b981' : 'rgba(255,255,255,0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '100%',
                                                        opacity: glosa.registrada_internamente ? 1 : 0.6
                                                    }}
                                                    title={glosa.registrada_internamente ? "Registro permanente en sistema interno" : "Marcar como registrado en sistema interno"}
                                                >
                                                    <CheckCircle2 size={20} fill={glosa.registrada_internamente ? "rgba(16,185,129,0.1)" : "none"} />
                                                </motion.button>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem', fontWeight: 600, color: glosa.registrada_internamente ? '#10b981' : (isDupe ? '#f87171' : 'white') }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {isDupe && <Copy size={13} style={{ flexShrink: 0 }} />}
                                                    {glosa.factura}
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
                                                            background: 'rgba(139, 92, 246, 0.1)',
                                                            border: '1px solid rgba(139, 92, 246, 0.2)',
                                                            color: '#a78bfa',
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
                                                                    background: isDupe ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.07)',
                                                                    border: `1px solid rgba(239,68,68,${isDupe ? '0.35' : '0.2'})`,
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
                        background: '#0a0812', width: '100%', maxWidth: '650px',
                        borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        position: 'relative', overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(139, 92, 246, 0.03)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}>
                                    <ClipboardList size={20} color="#a78bfa" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>Detalles de la Glosa</h3>
                                    <p style={{ fontSize: '0.75rem', color: '#a78bfa', margin: '0.25rem 0 0 0' }}>Expediente de Auditoría</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedGlosa(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px' }}>
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
                                <DetailItem icon={<Calendar size={16} />} label="Fecha de Registro" value={selectedGlosa.fecha} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado Actual</span>
                                    <span style={{ padding: '0.4rem 1rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 800, width: 'fit-content', ...getStatusStyle(selectedGlosa.estado) }}>{selectedGlosa.estado}</span>
                                </div>
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <Info size={16} color="rgba(255,255,255,0.4)" />
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Descripción Adicional</span>
                                </div>
                                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {selectedGlosa.descripcion || "Sin descripción adicional registrada."}
                                </p>
                            </div>
                        </div>
                        <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', textAlign: 'right' }}>
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
                        background: '#0a0812', width: '100%', maxWidth: '700px',
                        borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        position: 'relative', overflow: 'hidden'
                    }} onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSaveEdit}>
                            <div style={{
                                padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                                        <Pencil size={20} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>Modificar Registro</h3>
                                </div>
                                <button type="button" onClick={() => setEditingGlosa(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
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
                            <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setEditingGlosa(null)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
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

const DetailItem = ({ icon, label, value, isBold = false, isHighlight = false }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>{icon}</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        </div>
        <span style={{ fontSize: isHighlight ? '1.25rem' : '1rem', fontWeight: (isBold || isHighlight) ? 800 : 500, color: isHighlight ? 'var(--primary)' : 'white' }}>{value}</span>
    </div>
);
