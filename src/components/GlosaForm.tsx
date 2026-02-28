'use client';

import React, { useState, useMemo } from 'react';
import { Save, Plus, AlertTriangle, CheckCircle2, Scan, Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { useToast } from '@/lib/contexts/ToastContext';

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
    seccion?: string;
}

interface GlosaFormProps {
    onAddGlosa: (glosa: any) => void;
    existingGlosas: Glosa[];
    currentSeccion: string;
    isAdmin?: boolean;
}

export const GlosaForm = ({ onAddGlosa, existingGlosas, currentSeccion, isAdmin = true }: GlosaFormProps) => {
    const [formData, setFormData] = useState({
        factura: '',
        servicio: '',
        orden_servicio: '',
        valor_glosa: '',
        descripcion: '',
        tipo_glosa: 'Tarifas',
        estado: 'Pendiente'
    });
    const { showToast } = useToast();
    const [forceSubmit, setForceSubmit] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Cálculos de control diario
    const todayStr = useMemo(() => new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }), []);
    const nowTimestamp = () => new Date().toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const dailyStats = useMemo(() => {
        const todayGlosas = existingGlosas.filter(g => {
            const matchesDate = g.fecha?.split(',')[0] === todayStr;
            const matchesSection = (g as any).seccion === currentSeccion || (!(g as any).seccion && currentSeccion === 'GLOSAS');
            return matchesDate && matchesSection;
        });
        const uniqueFacturas = new Set(todayGlosas.map(g => g.factura)).size;
        const totalValue = todayGlosas.reduce((acc, g) => acc + g.valor_glosa, 0);

        return {
            count: todayGlosas.length,
            facturas: uniqueFacturas,
            value: totalValue
        };
    }, [existingGlosas, todayStr, currentSeccion]);

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

    // Lógica de Escaneo OCR
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        showToast('🔍 ESCANEANDO IMAGEN... Por favor espera.', 'info');

        try {
            const worker = await createWorker('spa'); // Usar español
            const { data: { text } } = await worker.recognize(file);
            console.log("OCR Text Raw:", text);

            const cleanText = text.replace(/\s+/g, ' '); // Normalizar espacios para regex sencillos

            // 1. Extraer Factura (Patrón: FEB o FAC seguido de números)
            // Agregamos limpieza de errores comunes (O -> 0)
            const facturaMatch = text.match(/(FEB|FAC|FE|FC|F EB|F AC)[\s\-\#]?\s?(\d[O\d]{3,})/i);
            let extractedFactura = '';
            if (facturaMatch) {
                let code = facturaMatch[2].replace(/O/g, '0'); // Error común de OCR
                const prefix = facturaMatch[1].replace(/\s/g, '').toUpperCase();
                extractedFactura = `${prefix}${code}`;
            }

            // 2. Extraer Valores (Suma y Búsqueda contextual)
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let totalSum = 0;
            let foundAnyValue = false;

            // Buscamos en cada línea y su contexto
            lines.forEach((line, idx) => {
                const lowerLine = line.toLowerCase();
                const keywords = ['objetado', 'inicial', 'facturado', 'glosa', 'valor', 'vr', 'monto'];

                if (keywords.some(k => lowerLine.includes(k))) {
                    // Buscar número en la misma línea
                    const numMatch = line.match(/(\d{1,3}(\.\d{3})*(,\d+)?)/g);
                    if (numMatch) {
                        numMatch.forEach(n => {
                            const val = parseFloat(n.replace(/\./g, '').replace(/,/g, '.'));
                            if (val > 1000) {
                                totalSum += val;
                                foundAnyValue = true;
                            }
                        });
                    } else {
                        // Si no hay número, buscar en la siguiente línea (contexto de tabla)
                        const nextLine = lines[idx + 1] || '';
                        const nextNumMatch = nextLine.match(/(\d{1,3}(\.\d{3})*(,\d+)?)/g);
                        if (nextNumMatch) {
                            // En tablas, el valor suele estar al final o en la misma posición
                            const val = parseFloat(nextNumMatch[nextNumMatch.length - 1].replace(/\./g, '').replace(/,/g, '.'));
                            if (val > 1000) {
                                totalSum += val;
                                foundAnyValue = true;
                            }
                        }
                    }
                }
            });

            let extractedValor = '';
            if (foundAnyValue) {
                // Si encontramos varios valores, sumarlos (pedito del usuario)
                // Pero si hay duplicados exactos muy cercanos, podríamos estar sumando la misma fila
                extractedValor = Math.round(totalSum).toString();
            } else {
                // Búsqueda profunda en todo el texto si falló el línea a línea
                const allNumbers = text.match(/\d{1,3}(\.\d{3})+(,\d+)?/g);
                if (allNumbers) {
                    const values = allNumbers.map(n => parseInt(n.replace(/\./g, ''))).filter(v => v > 1000);
                    // Tomar el valor más probable (a menudo el más grande en glosas totales)
                    if (values.length > 0) extractedValor = Math.max(...values).toString();
                }
            }

            // 3. Extraer Servicio (Descripción de texto) - REPARACIÓN PROFUNDA v4.3.2
            // Problema: Tesseract lee horizontalmente mezclando columnas.
            // "FOTOGRAFÍA A COLOR DE SEGMENTO Glosa total..."
            let extractedServicio = '';
            const servicioKeywords = ['servicio', 'descripcion', 'procedimiento'];
            const stopKeywords = ['glosa', 'gloss', 'detalle', 'motivo', 'objetado', 'valor', 'inicial', 'facturado', 'aceptado', 'cod', 'cod.'];

            // Buscar la línea que parece ser el servicio
            const serviceLines = lines.filter(l => {
                const lower = l.toLowerCase();
                const isNotId = !l.match(/^(CC|TI|RC|CE|PA|AS|MS|NI)[\s\-]?\d+/i);
                const hasLetters = /[A-Z]{5,}/.test(l);
                return isNotId && hasLetters && l.length > 10;
            });

            if (serviceLines.length > 0) {
                let candidate = serviceLines[0];

                // Si la línea contiene una palabra de parada, cortarla ahí (limpieza de mezcla de columnas)
                for (const stop of stopKeywords) {
                    const stopIdx = candidate.toLowerCase().indexOf(' ' + stop);
                    if (stopIdx !== -1) {
                        candidate = candidate.substring(0, stopIdx);
                    }
                }

                // Limpiar prefijos basura de OCR (ej: "ce ", "menea ")
                extractedServicio = candidate.replace(/^[a-z]{1,3}\s/i, '').trim().substring(0, 80);
            }

            // 4. Extraer Descripción (Detalle de la objeción)
            let extractedDescripcion = '';
            const descKeywords = ['detalle', 'motivo', 'observación', 'glosa total', 'anexo', 'tarifario', 'incluido', 'objetado'];

            // Buscar la primera línea que contenga descripción o donde cortamos el servicio
            const descCandidateIdx = lines.findIndex(l => descKeywords.some(k => l.toLowerCase().includes(k)));

            if (descCandidateIdx !== -1) {
                let descText = lines.slice(descCandidateIdx, descCandidateIdx + 3).join(' ');

                // Limpiar si el nombre del servicio se coló al principio
                if (extractedServicio && descText.includes(extractedServicio)) {
                    descText = descText.replace(extractedServicio, '');
                }

                extractedDescripcion = descText.trim().substring(0, 200);
            } else {
                // Fallback: Si no hay keywords, tomar líneas que no son servicio ni factura
                const remainingLines = lines.filter(l => l !== extractedServicio && !l.includes(extractedFactura) && l.length > 20);
                if (remainingLines.length > 0) {
                    extractedDescripcion = remainingLines[0].substring(0, 200);
                }
            }

            setFormData(prev => ({
                ...prev,
                factura: extractedFactura || prev.factura,
                valor_glosa: extractedValor || prev.valor_glosa,
                servicio: extractedServicio || prev.servicio,
                descripcion: extractedDescripcion || prev.descripcion
            }));

            await worker.terminate();
            showToast('✅ ESCANEO COMPLETADO: Revisa los campos autocompletados.', 'success');
        } catch (error) {
            console.error("OCR Error:", error);
            showToast('❌ ERROR DE ESCANEO: No se pudo leer la imagen.', 'error');
        } finally {
            setIsScanning(false);
            // Enfocar el campo manual Orden de Servicio
            const osInput = document.getElementById('orden_servicio');
            if (osInput) osInput.focus();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // VALIDACIÓN SENIOR: Protección de integridad de datos
        const factura = formData.factura.trim();
        const servicio = formData.servicio.trim();
        const valor = parseFloat(formData.valor_glosa);

        if (!factura || !servicio || isNaN(valor)) {
            showToast('❌ CAMPOS REQUERIDOS: Completa Factura, Servicio y Valor.', 'error');
            return;
        }

        if (valor < 0) {
            showToast('❌ ERROR: El valor no puede ser negativo.', 'error');
            return;
        }

        if (isDuplicateExact && !forceSubmit) return; // Bloquear si es duplicado exacto sin confirmación

        onAddGlosa({
            ...formData,
            factura, // Usamos la versión sanitizada (con trim)
            servicio,
            id: Math.random().toString(36).substr(2, 9),
            valor_glosa: valor,
            fecha: nowTimestamp(),
            registrada_internamente: false,
            seccion: currentSeccion
        });

        // Mostrar éxito
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);

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

    const formTitle = currentSeccion === 'MEDICAMENTOS' ? 'Registrar Medicamentos' : 'Registrar Gestión de Glosa';
    const facturaExiste = facturaMatch && facturaMatch.length > 0;
    const alertColor = isDuplicateExact ? '#ef4444' : '#f59e0b';

    return (
        <Card
            title={formTitle}
            headerAction={
                isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="file"
                            id="ocr-upload"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageUpload}
                            disabled={isScanning}
                        />
                        <button
                            type="button"
                            onClick={() => document.getElementById('ocr-upload')?.click()}
                            disabled={isScanning}
                            style={{
                                background: isScanning ? 'rgba(255,255,255,0.05)' : 'rgba(139, 92, 246, 0.15)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                color: 'var(--primary)',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: isScanning ? 'not-allowed' : 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                            className="ocr-btn"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Analizando...
                                </>
                            ) : (
                                <>
                                    <Camera size={14} />
                                    Escanear Imagen
                                </>
                            )}
                        </button>
                    </div>
                )
            }
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
                    isDuplicateExact && !forceSubmit ? (
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
                    )
                )}

                {/* Indicadores de Control Diario */}
                <div style={{
                    marginTop: '2.5rem',
                    padding: '1.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '1.75rem',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>FACTURAS HOY</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 950, color: 'white' }}>{dailyStats.facturas}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({dailyStats.count} registros)</span>
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>VALOR TOTAL HOY</p>
                        <p style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)', textShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>${new Intl.NumberFormat('es-CO').format(dailyStats.value)}</p>
                    </div>
                </div>
            </form>
        </Card>
    );
};
