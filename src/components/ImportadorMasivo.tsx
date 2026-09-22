'use client';

import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, X, ChevronDown,
  ChevronRight, Loader2, Download, RefreshCw, Eye, EyeOff, BarChart3,
  ClipboardList, TrendingUp, AlertCircle, Check, Filter, FileText, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface GlosaImportada {
  id: string;
  factura: string;
  servicio: string;
  orden_servicio: string;
  valor_glosa: number;
  valor_aceptado: number;
  valor_no_aceptado: number;
  descripcion: string;
  tipo_glosa: string;
  estado: string;
  fecha: string;
  registrada_internamente: boolean;
  seccion: string;
  soporte_pdf?: string | null;
  _status?: 'nuevo' | 'actualizado' | 'error' | 'pendiente';
  _errorMsg?: string;
}

interface IngresoImportado {
  id: string;
  factura: string;
  valor_aceptado: number;
  valor_no_aceptado: number;
  fecha: string;
  seccion: string;
  soporte_pdf?: string | null;
  _status?: 'nuevo' | 'actualizado' | 'error';
  _errorMsg?: string;
}

interface ImportadorMasivoProps {
  currentSeccion: 'GLOSAS' | 'MEDICAMENTOS';
  onImportComplete: () => void;
  onClose: () => void;
}

// ── Utilidades ───────────────────────────────────────────────────────────────
const cleanNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val || '').replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
};

const normalizeText = (val: any): string => String(val || '').trim();

// Valida si un string es un UUID v4 válido
const isValidUUID = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

// Genera un ID determinístico basado en campos clave del registro.
// Produce un UUID v4 válido basado en un hash de los campos.
// Así la misma fila del Excel siempre produce el mismo ID, sin duplicados
// aunque se importe el archivo varias veces.
const deterministicId = (fields: string[]): string => {
  const raw = fields.join('|').toLowerCase().trim();

  // Hash djb2 sobre el string completo
  let h1 = 5381;
  for (let i = 0; i < raw.length; i++) {
    h1 = ((h1 << 5) + h1) ^ raw.charCodeAt(i);
    h1 = h1 >>> 0;
  }
  // Segundo hash (sdbm) para más entropía
  let h2 = 0;
  for (let i = 0; i < raw.length; i++) {
    h2 = raw.charCodeAt(i) + (h2 << 6) + (h2 << 16) - h2;
    h2 = h2 >>> 0;
  }
  // Tercer hash (reverse djb2)
  let h3 = 5381;
  for (let i = raw.length - 1; i >= 0; i--) {
    h3 = ((h3 << 5) + h3) ^ raw.charCodeAt(i);
    h3 = h3 >>> 0;
  }

  // Convertir a hex con padding garantizado
  const p = (n: number, len: number) => n.toString(16).padStart(len, '0').slice(0, len);

  // UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Grupos: 8 - 4 - 4 - 4 - 12 chars
  const g1 = p(h1, 8);                          // 8
  const g2 = p(h2, 4);                          // 4
  const g3 = '4' + p(h1 ^ h2, 3);              // 4 (versión 4)
  const g4 = (8 + (h2 & 3)).toString(16) + p(h3, 3); // 4 (variante 8/9/a/b)
  const g5 = p(h1, 8) + p(h2 ^ h3, 4);         // 12

  return `${g1}-${g2}-${g3}-${g4}-${g5}`;
};

// Intenta mapear columna buscando variantes del nombre
const findCol = (row: any, variants: string[]): any => {
  for (const v of variants) {
    if (row[v] !== undefined) return row[v];
    // Búsqueda insensible a mayúsculas/acentos y espacios en los encabezados
    const key = Object.keys(row).find(k => {
      const cleanK = k.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const cleanV = v.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (cleanK === cleanV) return true;
      if (cleanK.includes('factura') && cleanV.includes('factura')) return true;
      return false;
    });
    if (key) return row[key];
  }
  
  // Último recurso: buscar cualquier llave que contenga palabras clave principales
  const mainVariant = variants[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const keys = Object.keys(row);
  
  if (mainVariant.includes('factura')) {
    const key = keys.find(k => k.toLowerCase().includes('factura'));
    if (key) return row[key];
  }
  if (mainVariant.includes('valorglosa') || variants.includes('glosa')) {
    const key = keys.find(k => {
      const lk = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (lk.includes('valor') && lk.includes('glosa')) || lk.includes('vlr glosa') || lk.includes('v. glosa') || lk === 'glosa';
    });
    if (key) return row[key];
  }
  if (mainVariant.includes('valoraceptado')) {
    const key = keys.find(k => {
      const lk = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (lk.includes('valor') && lk.includes('aceptado')) || lk.includes('vlr aceptado') || lk === 'aceptado';
    });
    if (key) return row[key];
  }
  if (mainVariant.includes('valornoaceptado')) {
    const key = keys.find(k => {
      const lk = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (lk.includes('valor') && lk.includes('no aceptado')) || lk.includes('vlr no aceptado') || lk.includes('rechazado');
    });
    if (key) return row[key];
  }

  return undefined;
};

const BATCH_SIZE = 50; // Supabase recomienda lotes de 50

// ── Componente principal ──────────────────────────────────────────────────────
export const ImportadorMasivo = ({ currentSeccion, onImportComplete, onClose }: ImportadorMasivoProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // FIX: Guardar el workbook en un ref para poder re-procesar hojas sin re-leer el archivo
  const workbookRef = useRef<XLSX.WorkBook | null>(null);

  const [step, setStep] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [fileName, setFileName] = useState('');
  const [rawSheets, setRawSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);

  // Modo de carga: reemplazar todo vs agregar/actualizar
  const [loadMode, setLoadMode] = useState<'replace' | 'upsert'>('replace');

  // Filas procesadas para importar
  const [glosasPreview, setGlosasPreview] = useState<GlosaImportada[]>([]);
  const [ingresosPreview, setIngresosPreview] = useState<IngresoImportado[]>([]);
  const [importMode, setImportMode] = useState<'glosas' | 'ingresos' | 'auto'>('auto');
  const [detectedMode, setDetectedMode] = useState<'glosas' | 'ingresos' | null>(null);

  // Estado de importación
  const [progress, setProgress] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [showPreviewTable, setShowPreviewTable] = useState(true);
  const [filterPendientes, setFilterPendientes] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');

  // Resultado final
  const [resultStats, setResultStats] = useState<{
    total: number;
    nuevos: number;
    actualizados: number;
    errores: number;
    pendientes: number;
  } | null>(null);

  const addLog = useCallback((msg: string) => {
    setImportLog(prev => [`[${new Date().toLocaleTimeString('es-ES')}] ${msg}`, ...prev.slice(0, 199)]);
  }, []);

  // ── 1. Leer archivo Excel ────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStep('idle');
    setGlosasPreview([]);
    setIngresosPreview([]);
    setImportLog([]);
    setResultStats(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      // FIX: Guardar el workbook en el ref para reutilizarlo al cambiar de hoja
      workbookRef.current = wb;
      setRawSheets(wb.SheetNames);

      // Auto-seleccionar la hoja más relevante
      const autoSheet =
        wb.SheetNames.find(n => /glosa/i.test(n)) ||
        wb.SheetNames.find(n => /ingreso/i.test(n)) ||
        wb.SheetNames[0];

      setSelectedSheet(autoSheet || '');
      processSheet(wb, autoSheet || wb.SheetNames[0]);
    } catch (err: any) {
      addLog('❌ Error leyendo el archivo: ' + err.message);
    }
  };

  // FIX: Usar el workbook guardado en el ref, no crear uno vacío
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbookRef.current) {
      processSheet(workbookRef.current, sheetName);
    }
  };

  const processSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    setDetectedColumns(cols);

    // Detectar si es hoja de glosas o ingresos
    const hasGlosaFields = cols.some(c => /glosa|servicio|tipo/i.test(c));
    const hasIngresoFields = cols.some(c => /ingreso|aceptado/i.test(c)) && !hasGlosaFields;
    const mode = hasIngresoFields ? 'ingresos' : 'glosas';
    setDetectedMode(mode);
    setImportMode(mode);

    // Procesar filas
    const validRows = rows.filter(row => {
      const f = normalizeText(findCol(row, ['Factura', 'factura', 'FACTURA', 'Nro Factura', 'No. Factura', 'numero_factura', 'NroFactura', 'No de Factura', 'Numero de Factura']));
      return f && f.toUpperCase() !== 'TOTALES' && f.toUpperCase() !== 'TOTAL';
    });

    if (mode === 'glosas') {
      const glosas: GlosaImportada[] = validRows.map((row, idx) => {
        const idRaw = normalizeText(findCol(row, ['ID', 'id', 'Id', 'Id Glosa']));
        const factura = normalizeText(findCol(row, ['Factura', 'factura', 'FACTURA', 'Nro Factura', 'No. Factura', 'NroFactura', 'No de Factura', 'Numero de Factura']));
        const servicio = normalizeText(findCol(row, ['Servicio', 'servicio', 'SERVICIO', 'Tipo Servicio', 'tipo_servicio', 'Area']));
        const fecha = normalizeText(findCol(row, ['Fecha', 'fecha', 'FECHA', 'Fecha Glosa', 'FechaGlosa', 'Fecha de Glosa'])) ||
          new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const estado = normalizeText(findCol(row, ['Estado', 'estado', 'ESTADO', 'Status', 'Estado Glosa'])) || 'Pendiente';
        const regInterna = normalizeText(findCol(row, ['Registrada Internamente', 'registrada_internamente', 'RegistradaInternamente', 'Registrada']));

        // FIX: Validar que el ID del Excel sea un UUID real antes de usarlo.
        // Si el Excel tiene columna "ID" con números (1,2,3) o texto personalizado,
        // Supabase lo rechaza porque la columna id es tipo UUID.
        const finalId = (idRaw && isValidUUID(idRaw))
          ? idRaw
          : deterministicId([factura, servicio, fecha, String(idx), currentSeccion]);

        return {
          id: finalId,
          factura,
          servicio,
          orden_servicio: normalizeText(findCol(row, ['Orden Servicio', 'orden_servicio', 'OrdenServicio', 'Orden', 'orden', 'No Orden'])),
          valor_glosa: cleanNum(findCol(row, ['Valor Glosa', 'valor_glosa', 'ValorGlosa', 'Glosa', 'glosa', 'Valor Glosado', 'valor_glosado', 'Total Glosa'])),
          valor_aceptado: cleanNum(findCol(row, ['Valor Aceptado', 'valor_aceptado', 'ValorAceptado', 'Aceptado', 'aceptado', 'Total Aceptado'])),
          valor_no_aceptado: cleanNum(findCol(row, ['Valor No Aceptado', 'valor_no_aceptado', 'ValorNoAceptado', 'No Aceptado', 'Total No Aceptado', 'Valor Rechazado'])),
          descripcion: normalizeText(findCol(row, ['Descripción', 'Descripcion', 'descripcion', 'DESCRIPCION', 'Obs', 'Observacion', 'observacion', 'Observaciones', 'Motivo', 'Detalle'])),
          tipo_glosa: normalizeText(findCol(row, ['Tipo Glosa', 'tipo_glosa', 'TipoGlosa', 'Tipo', 'tipo', 'Motivo Glosa'])) || 'Tarifas',
          estado,
          fecha,
          registrada_internamente: regInterna.toUpperCase().includes('SÍ') || regInterna.toUpperCase().includes('SI') || regInterna === '1' || regInterna.toUpperCase() === 'TRUE',
          seccion: currentSeccion,
          soporte_pdf: normalizeText(findCol(row, ['Soporte PDF', 'soporte_pdf', 'SoportePDF', 'Soporte', 'PDF', 'Archivo'])) || null,
          _status: estado === 'Pendiente' ? 'pendiente' : 'nuevo',
        };
      });
      setGlosasPreview(glosas);
    } else {
      const ingresos: IngresoImportado[] = validRows.map((row, idx) => {
        const idRaw = normalizeText(findCol(row, ['ID', 'id', 'Id', 'Id Ingreso']));
        const factura = normalizeText(findCol(row, ['Factura', 'factura', 'FACTURA', 'Nro Factura', 'NroFactura', 'No de Factura', 'Numero de Factura']));
        const fecha = normalizeText(findCol(row, ['Fecha', 'fecha', 'FECHA', 'Fecha Ingreso'])) ||
          new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // FIX: Validar UUID igual que en glosas
        const finalId = (idRaw && isValidUUID(idRaw))
          ? idRaw
          : deterministicId([factura, fecha, String(idx), currentSeccion, 'ingreso']);

        return {
          id: finalId,
          factura,
          valor_aceptado: cleanNum(findCol(row, ['Valor Aceptado', 'valor_aceptado', 'ValorAceptado', 'Aceptado', 'Ingreso', 'Total Ingreso', 'Valor Pagado'])),
          valor_no_aceptado: cleanNum(findCol(row, ['Valor No Aceptado', 'valor_no_aceptado', 'No Aceptado', 'Total No Aceptado'])),
          fecha,
          seccion: currentSeccion,
          soporte_pdf: normalizeText(findCol(row, ['Soporte PDF', 'soporte_pdf', 'Soporte', 'PDF', 'Archivo'])) || null,
          _status: 'nuevo',
        };
      });
      setIngresosPreview(ingresos);
    }

    setStep('preview');
    addLog(`✅ Hoja "${sheetName}" cargada: ${validRows.length} registros válidos detectados`);
    addLog(`📊 Modo detectado: ${mode === 'glosas' ? 'GLOSAS' : 'INGRESOS'}`);
  };

  // ── 2. Backup automático antes de borrar ─────────────────────────────────
  const backupCurrentData = async (tableName: string): Promise<number> => {
    addLog(`💾 Haciendo backup de datos actuales...`);
    const { data, error } = await supabase.from(tableName).select('*').limit(100000);
    if (error) throw new Error('No se pudo hacer backup: ' + error.message);
    if (!data || data.length === 0) {
      addLog(`ℹ️ No había datos anteriores en ${tableName}. Continuando...`);
      return 0;
    }
    // Descargar backup como JSON automáticamente
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${tableName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog(`✅ Backup descargado: ${data.length} registros guardados en tu PC`);
    return data.length;
  };

  // ── 3. Borrar todos los registros de una tabla ───────────────────────────
  const deleteAllRecords = async (tableName: string): Promise<void> => {
    addLog(`🗑️ Eliminando todos los registros anteriores de ${tableName}...`);
    // Supabase requiere una condición para DELETE masivo; usamos "id is not null"
    const { error } = await supabase.from(tableName).delete().not('id', 'is', null);
    if (error) throw new Error('Error al eliminar registros: ' + error.message);
    addLog(`✅ Registros anteriores eliminados correctamente`);
  };

  // ── 4. Importar en lotes ─────────────────────────────────────────────────
  const startImport = async () => {
    const items = importMode === 'glosas' ? glosasPreview : ingresosPreview;
    if (items.length === 0) return;

    setStep('importing');
    setTotalToImport(items.length);
    setProgress(0);
    setImportedCount(0);
    setErrorCount(0);
    const tableName = importMode === 'glosas' ? 'glosas' : 'ingresos';

    addLog(`🚀 Modo: ${loadMode === 'replace' ? '🔄 REEMPLAZAR TODO' : '➕ AGREGAR/ACTUALIZAR'}`);

    try {
      // PASO A — Si es modo "Reemplazar todo": backup + borrar
      if (loadMode === 'replace') {
        setCurrentPhase('backup');
        addLog(`📋 Paso 1/3: Creando backup de seguridad...`);
        await backupCurrentData(tableName);

        setCurrentPhase('deleting');
        addLog(`📋 Paso 2/3: Eliminando registros anteriores...`);
        await deleteAllRecords(tableName);

        addLog(`📋 Paso 3/3: Cargando ${items.length} registros del Excel...`);
      } else {
        addLog(`📋 Cargando ${items.length} registros en lotes de ${BATCH_SIZE}...`);
      }

      setCurrentPhase('uploading');

      let ok = 0;
      let err = 0;
      let firstErrorMsg = '';

      // Limpiar campos internos antes de enviar a Supabase
      const cleanItems = items.map(({ _status, _errorMsg, ...rest }: any) => rest);

      for (let i = 0; i < cleanItems.length; i += BATCH_SIZE) {
        const batch = cleanItems.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(cleanItems.length / BATCH_SIZE);

        try {
          const { error } = await supabase.from(tableName).upsert(batch, { onConflict: 'id' });
          if (error) throw error;
          ok += batch.length;
          if (batchNum <= 3 || batchNum === totalBatches) {
            addLog(`✅ Lote ${batchNum}/${totalBatches}: ${batch.length} registros guardados`);
          }
        } catch (e: any) {
          err += batch.length;
          const msg = e?.message || e?.details || JSON.stringify(e);
          // Mostrar el primer error con detalle completo
          if (!firstErrorMsg) {
            firstErrorMsg = msg;
            addLog(`❌ ERROR SUPABASE: "${msg}"`);
            // Intentar 1 registro solo para ver el error exacto
            try {
              const { error: singleErr } = await supabase.from(tableName).upsert([batch[0]], { onConflict: 'id' });
              if (singleErr) {
                addLog(`🔍 Detalle del registro #1: ${singleErr.message} | código: ${singleErr.code}`);
                addLog(`🔍 Campos: ${Object.keys(batch[0]).join(', ')}`);
                addLog(`🔍 ID enviado: "${batch[0].id}" (¿válido? ${isValidUUID(batch[0].id) ? 'SÍ' : 'NO'})`);
              }
            } catch { /* ignorar */ }
          } else {
            addLog(`❌ Lote ${batchNum}/${totalBatches}: Error - ${msg.slice(0, 80)}`);
          }
        }

        setImportedCount(ok);
        setErrorCount(err);
        setProgress(Math.round(((i + batch.length) / cleanItems.length) * 100));

        // Pausa pequeña para no saturar la API
        await new Promise(r => setTimeout(r, 120));
      }

      // Calcular estadísticas finales
      const pendientes = importMode === 'glosas'
        ? glosasPreview.filter(g => g.estado === 'Pendiente').length
        : 0;

      setResultStats({
        total: items.length,
        nuevos: ok,
        actualizados: 0,
        errores: err,
        pendientes,
      });

      addLog(`🎉 Importación completada: ${ok} exitosos, ${err} errores`);
    } catch (fatalErr: any) {
      addLog(`💥 Error crítico: ${fatalErr.message}`);
      addLog(`⚠️ Proceso interrumpido. Revisa el backup descargado.`);
    }

    setCurrentPhase('');
    setStep('done');
    onImportComplete();
  };

  // ── 5. Exportar pendientes ────────────────────────────────────────────────
  const exportPendientes = () => {
    const pendientes = glosasPreview.filter(g => g.estado === 'Pendiente');
    if (pendientes.length === 0) {
      addLog('ℹ️ No hay registros pendientes para exportar');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(pendientes.map(g => ({
      'ID': g.id,
      'Factura': g.factura,
      'Servicio': g.servicio,
      'Orden Servicio': g.orden_servicio,
      'Valor Glosa': g.valor_glosa,
      'Valor Aceptado': g.valor_aceptado,
      'Valor No Aceptado': g.valor_no_aceptado,
      'Tipo Glosa': g.tipo_glosa,
      'Descripción': g.descripcion,
      'Estado': g.estado,
      'Fecha': g.fecha,
      'Registrada Internamente': g.registrada_internamente ? 'SÍ' : 'NO',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
    XLSX.writeFile(wb, `pendientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addLog(`📥 Exportados ${pendientes.length} registros pendientes`);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const previewItems = importMode === 'glosas' ? glosasPreview : ingresosPreview;
  const displayedItems = filterPendientes
    ? glosasPreview.filter(g => g.estado === 'Pendiente')
    : previewItems;

  const pendienteCount = glosasPreview.filter(g => g.estado === 'Pendiente').length;

  // Texto de la fase actual
  const phaseLabel =
    currentPhase === 'backup' ? '💾 Creando backup...' :
    currentPhase === 'deleting' ? '🗑️ Eliminando registros anteriores...' :
    currentPhase === 'uploading' ? '⬆️ Subiendo registros del Excel...' : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 30 }}
        style={{
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1117 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2rem',
          boxShadow: '0 25px 80px rgba(139,92,246,0.2)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(139,92,246,0.4)'
            }}>
              <UploadCloud size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Importador Masivo de Excel
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                Sección: <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{currentSeccion}</span>
                {' · '}Soporta hasta 5.000+ registros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: '#fff'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── MODO DE CARGA ── */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setLoadMode('replace')}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: `2px solid ${loadMode === 'replace' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
              background: loadMode === 'replace' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
              color: loadMode === 'replace' ? '#ef4444' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.2rem' }}>
              <Trash2 size={15} />
              🔄 Reemplazar todo
              {loadMode === 'replace' && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: '#ef4444', color: '#fff', borderRadius: '99px', padding: '0.1rem 0.5rem' }}>ACTIVO</span>}
            </div>
            <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.7, lineHeight: 1.4 }}>
              Borra todos los registros actuales y carga solo los del Excel. Hace backup automático antes de borrar.
            </p>
          </button>
          <button
            onClick={() => setLoadMode('upsert')}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: `2px solid ${loadMode === 'upsert' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
              background: loadMode === 'upsert' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              color: loadMode === 'upsert' ? '#10b981' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.2rem' }}>
              <CheckCircle2 size={15} />
              ➕ Agregar / Actualizar
              {loadMode === 'upsert' && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: '#10b981', color: '#fff', borderRadius: '99px', padding: '0.1rem 0.5rem' }}>ACTIVO</span>}
            </div>
            <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.7, lineHeight: 1.4 }}>
              Mantiene los registros actuales y solo añade o actualiza los que vienen en el Excel.
            </p>
          </button>
        </div>

        {/* Aviso modo reemplazar */}
        {loadMode === 'replace' && (
          <div style={{
            marginBottom: '1.25rem', padding: '0.75rem 1rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.6rem'
          }}>
            <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              <strong style={{ color: '#ef4444' }}>Modo "Reemplazar todo" activo.</strong>{' '}
              Se descargará automáticamente un backup JSON de los datos actuales antes de borrarlos.
              La base de datos quedará idéntica al Excel importado.
            </p>
          </div>
        )}

        {/* ── PASO 1: Drop zone ── */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed rgba(139,92,246,0.5)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(139,92,246,0.04)',
            transition: 'all 0.2s',
            marginBottom: '1.5rem',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#8b5cf6')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
        >
          <FileSpreadsheet size={36} color="#8b5cf6" style={{ marginBottom: '0.5rem' }} />
          {fileName ? (
            <p style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>📄 {fileName}</p>
          ) : (
            <>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                Haz clic para seleccionar tu Excel
              </p>
              <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                .xlsx o .xls — Soporta cualquier estructura de columnas
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {/* ── Selector de hoja ── */}
        {rawSheets.length > 1 && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>
              Hoja del Excel:
            </label>
            {/* FIX: Ahora usa handleSheetChange que re-procesa desde el workbook guardado en ref */}
            <select
              value={selectedSheet}
              onChange={e => handleSheetChange(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px', color: '#fff', padding: '0.4rem 0.75rem',
                fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              {rawSheets.map(s => (
                <option key={s} value={s} style={{ background: '#1a1a3e' }}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── PASO 2: Preview ── */}
        <AnimatePresence>
          {step !== 'idle' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Tarjetas de resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Total registros', value: previewItems.length, color: '#8b5cf6', icon: <ClipboardList size={16} /> },
                  { label: 'Pendientes', value: pendienteCount, color: '#f59e0b', icon: <AlertCircle size={16} /> },
                  { label: 'Respondidas', value: glosasPreview.filter(g => g.estado === 'Respondida').length, color: '#10b981', icon: <CheckCircle2 size={16} /> },
                  { label: 'Sin estado', value: glosasPreview.filter(g => !g.estado || g.estado === '').length, color: '#6b7280', icon: <Filter size={16} /> },
                ].map(card => (
                  <div key={card.label} style={{
                    background: `rgba(${card.color === '#8b5cf6' ? '139,92,246' : card.color === '#f59e0b' ? '245,158,11' : card.color === '#10b981' ? '16,185,129' : '107,114,128'},0.1)`,
                    border: `1px solid ${card.color}30`,
                    borderRadius: '12px', padding: '0.75rem 1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: card.color }}>
                      {card.icon}
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                    </div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{card.value.toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>

              {/* Barra de progreso (cuando importa) */}
              {step === 'importing' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  {phaseLabel && (
                    <p style={{ margin: '0 0 0.5rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700 }}>{phaseLabel}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Loader2 size={14} style={{ display: 'inline', marginRight: '0.25rem', animation: 'spin 1s linear infinite' }} />
                      Importando... {importedCount}/{totalToImport}
                    </span>
                    <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '0.8rem' }}>{progress}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', borderRadius: '99px' }}
                    />
                  </div>
                  {errorCount > 0 && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                      ⚠️ {errorCount} registros con error
                    </p>
                  )}
                </div>
              )}

              {/* Resultado final */}
              {step === 'done' && resultStats && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem',
                    display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center'
                  }}
                >
                  <CheckCircle2 size={28} color="#10b981" />
                  <div>
                    <p style={{ margin: 0, color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>
                      ✅ Importación completada exitosamente
                    </p>
                    <p style={{ margin: '0.2rem 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                      {resultStats.nuevos} registros subidos a Supabase · {resultStats.errores} errores · {resultStats.pendientes} pendientes por registrar
                      {loadMode === 'replace' && ' · Modo: Reemplazó todos los registros anteriores'}
                    </p>
                  </div>
                  {pendienteCount > 0 && (
                    <button
                      onClick={exportPendientes}
                      style={{
                        marginLeft: 'auto', background: 'rgba(245,158,11,0.15)',
                        border: '1px solid rgba(245,158,11,0.4)', borderRadius: '8px',
                        padding: '0.5rem 1rem', color: '#f59e0b', fontWeight: 700,
                        fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                      }}
                    >
                      <Download size={14} />
                      Exportar {pendienteCount} pendientes
                    </button>
                  )}
                </motion.div>
              )}

              {/* Controles de tabla */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowPreviewTable(p => !p)}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                    }}
                  >
                    {showPreviewTable ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showPreviewTable ? 'Ocultar tabla' : 'Ver tabla'}
                  </button>
                  {importMode === 'glosas' && pendienteCount > 0 && (
                    <button
                      onClick={() => setFilterPendientes(p => !p)}
                      style={{
                        background: filterPendientes ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${filterPendientes ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: '8px', padding: '0.4rem 0.75rem',
                        color: filterPendientes ? '#f59e0b' : 'rgba(255,255,255,0.7)',
                        fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                      }}
                    >
                      <Filter size={13} />
                      Solo pendientes ({pendienteCount})
                    </button>
                  )}
                  {step !== 'importing' && (
                    <button
                      onClick={exportPendientes}
                      disabled={pendienteCount === 0}
                      style={{
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: '8px', padding: '0.4rem 0.75rem', color: '#10b981',
                        fontSize: '0.75rem', cursor: pendienteCount > 0 ? 'pointer' : 'not-allowed',
                        opacity: pendienteCount > 0 ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: '0.35rem'
                      }}
                    >
                      <Download size={13} />
                      Descargar pendientes
                    </button>
                  )}
                </div>

                {/* Botón principal de importar */}
                {step === 'preview' && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={startImport}
                    style={{
                      background: loadMode === 'replace'
                        ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                        : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                      border: 'none', borderRadius: '10px',
                      padding: '0.6rem 1.5rem', color: '#fff',
                      fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      boxShadow: loadMode === 'replace'
                        ? '0 4px 15px rgba(239,68,68,0.4)'
                        : '0 4px 15px rgba(139,92,246,0.4)'
                    }}
                  >
                    {loadMode === 'replace' ? <Trash2 size={16} /> : <UploadCloud size={16} />}
                    {loadMode === 'replace'
                      ? `REEMPLAZAR CON ${previewItems.length.toLocaleString('es-CO')} REGISTROS`
                      : `SUBIR ${previewItems.length.toLocaleString('es-CO')} REGISTROS`}
                  </motion.button>
                )}

                {step === 'done' && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    onClick={() => {
                      setStep('idle');
                      setFileName('');
                      setGlosasPreview([]);
                      setIngresosPreview([]);
                      setResultStats(null);
                      workbookRef.current = null;
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
                      borderRadius: '10px', padding: '0.6rem 1.25rem', color: '#8b5cf6',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                  >
                    <RefreshCw size={14} />
                    Nueva importación
                  </motion.button>
                )}
              </div>

              {/* Tabla de preview */}
              {showPreviewTable && displayedItems.length > 0 && (
                <div style={{
                  overflowX: 'auto', overflowY: 'auto',
                  maxHeight: '320px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: '1.25rem'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(139,92,246,0.15)', position: 'sticky', top: 0 }}>
                        <th style={thStyle}>#</th>
                        {importMode === 'glosas' ? (
                          <>
                            <th style={thStyle}>Factura</th>
                            <th style={thStyle}>Servicio</th>
                            <th style={thStyle}>Valor Glosa</th>
                            <th style={thStyle}>Estado</th>
                            <th style={thStyle}>Tipo</th>
                            <th style={thStyle}>Registrada</th>
                            <th style={thStyle}>Fecha</th>
                          </>
                        ) : (
                          <>
                            <th style={thStyle}>Factura</th>
                            <th style={thStyle}>Valor Aceptado</th>
                            <th style={thStyle}>Valor No Aceptado</th>
                            <th style={thStyle}>Fecha</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(displayedItems as any[]).slice(0, 200).map((item, idx) => {
                        const isPendiente = (item as GlosaImportada).estado === 'Pendiente';
                        return (
                          <tr
                            key={item.id}
                            style={{
                              background: isPendiente
                                ? 'rgba(245,158,11,0.06)'
                                : idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                              borderBottom: '1px solid rgba(255,255,255,0.04)'
                            }}
                          >
                            <td style={tdStyle}>{idx + 1}</td>
                            {importMode === 'glosas' ? (
                              <>
                                <td style={{ ...tdStyle, color: '#c4b5fd', fontWeight: 700 }}>{(item as GlosaImportada).factura}</td>
                                <td style={tdStyle}>{(item as GlosaImportada).servicio}</td>
                                <td style={{ ...tdStyle, color: '#10b981' }}>
                                  ${Math.round((item as GlosaImportada).valor_glosa).toLocaleString('es-CO')}
                                </td>
                                <td style={tdStyle}>
                                  <span style={{
                                    padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.65rem', fontWeight: 700,
                                    background: isPendiente ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                                    color: isPendiente ? '#f59e0b' : '#10b981'
                                  }}>
                                    {(item as GlosaImportada).estado}
                                  </span>
                                </td>
                                <td style={tdStyle}>{(item as GlosaImportada).tipo_glosa}</td>
                                <td style={tdStyle}>
                                  {(item as GlosaImportada).registrada_internamente
                                    ? <Check size={12} color="#10b981" />
                                    : <X size={12} color="#ef4444" />}
                                </td>
                                <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)' }}>
                                  {((item as GlosaImportada).fecha || '').slice(0, 10)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ ...tdStyle, color: '#c4b5fd', fontWeight: 700 }}>{(item as IngresoImportado).factura}</td>
                                <td style={{ ...tdStyle, color: '#10b981' }}>
                                  ${Math.round((item as IngresoImportado).valor_aceptado).toLocaleString('es-CO')}
                                </td>
                                <td style={{ ...tdStyle, color: '#ef4444' }}>
                                  ${Math.round((item as IngresoImportado).valor_no_aceptado).toLocaleString('es-CO')}
                                </td>
                                <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)' }}>
                                  {((item as IngresoImportado).fecha || '').slice(0, 10)}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {displayedItems.length > 200 && (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', padding: '0.5rem' }}>
                      Mostrando primeros 200 de {displayedItems.length.toLocaleString('es-CO')} registros
                    </p>
                  )}
                </div>
              )}

              {/* Log de actividad */}
              {importLog.length > 0 && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '0.75rem', maxHeight: '140px', overflowY: 'auto'
                }}>
                  <p style={{ margin: '0 0 0.4rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <FileText size={11} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    Log de actividad
                  </p>
                  {importLog.map((line, i) => (
                    <p key={i} style={{
                      margin: '0.15rem 0', fontSize: '0.7rem',
                      color: line.includes('❌') || line.includes('💥') ? '#ef4444' : line.includes('✅') ? '#10b981' : line.includes('⚠️') || line.includes('🗑️') ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                      fontFamily: 'monospace'
                    }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pie de ayuda */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', lineHeight: 1.6 }}>
            💡 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Columnas soportadas para Glosas:</strong>{' '}
            Factura, Servicio, Orden Servicio, Valor Glosa, Valor Aceptado, Valor No Aceptado, Tipo Glosa, Estado, Descripción, Fecha, Registrada Internamente
            <br />
            💡 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Para Ingresos:</strong>{' '}
            Factura, Valor Aceptado, Valor No Aceptado, Fecha
            <br />
            💡 <strong style={{ color: 'rgba(255,255,255,0.5)' }}>IDs:</strong>{' '}
            Si tu Excel no tiene columna &quot;ID&quot;, el sistema genera IDs únicos automáticamente basados en Factura + Servicio + Fecha.
          </p>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

// Estilos de tabla
const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  color: 'rgba(255,255,255,0.6)',
  fontWeight: 700,
  fontSize: '0.68rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  color: 'rgba(255,255,255,0.75)',
  whiteSpace: 'nowrap',
};

export default ImportadorMasivo;
