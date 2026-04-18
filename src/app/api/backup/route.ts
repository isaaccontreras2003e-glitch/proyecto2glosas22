import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const IS_VERCEL = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const DESKTOP_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop';
const FILE_NAME = 'Glosas_Tiempo_Real.xlsx';
const FULL_PATH = path.join(DESKTOP_PATH, FILE_NAME);

// ─── HELPERS ────────────────────────────────────────────────────────────────
function canWriteLocal() {
  if (IS_VERCEL) return false;
  try { return fs.existsSync(DESKTOP_PATH); } catch { return false; }
}

function nowTimestamp() {
  return new Date().toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function formatCOP(n: number | undefined | null) {
  if (n == null || isNaN(Number(n))) return '$ 0';
  return '$ ' + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ─── ESTILOS ─────────────────────────────────────────────────────────────────
const HEADER_FILL   = { fgColor: { rgb: '1E3A5F' } }; // azul oscuro
const HEADER_FONT   = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' };
const HEADER_ALIGN  = { horizontal: 'center', vertical: 'center', wrapText: true };
const BORDER_STYLE  = { style: 'thin', color: { rgb: 'CCCCCC' } };
const BORDER_ALL    = { top: BORDER_STYLE, bottom: BORDER_STYLE, left: BORDER_STYLE, right: BORDER_STYLE };

const ROW_FILLS: Record<string, any> = {
  'Pendiente':   { fgColor: { rgb: 'FFF9C4' } }, // amarillo suave
  'Respondida':  { fgColor: { rgb: 'BBE0FF' } }, // azul suave
  'Aceptada':    { fgColor: { rgb: 'C8E6C9' } }, // verde suave
  'No Aceptada': { fgColor: { rgb: 'FFCDD2' } }, // rojo suave
};

function styleCell(ws: XLSX.WorkSheet, addr: string, opts: { fill?: any; font?: any; align?: any; border?: any; numFmt?: string }) {
  if (!ws[addr]) ws[addr] = { t: 's', v: '' };
  ws[addr].s = {
    fill:      opts.fill   ? { patternType: 'solid', ...opts.fill } : undefined,
    font:      opts.font,
    alignment: opts.align,
    border:    opts.border,
    numFmt:    opts.numFmt,
  };
}

/** Aplica estilos de cabecera a una fila entera */
function applyHeaderRow(ws: XLSX.WorkSheet, rowIdx: number, colCount: number) {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
    styleCell(ws, addr, { fill: HEADER_FILL, font: HEADER_FONT, align: HEADER_ALIGN, border: BORDER_ALL });
  }
}

/** Aplica color de fila según estado */
function applyRowColor(ws: XLSX.WorkSheet, rowIdx: number, colCount: number, estado: string) {
  const fill = ROW_FILLS[estado];
  if (!fill) return;
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    if (!ws[addr].s) ws[addr].s = {};
    ws[addr].s.fill = { patternType: 'solid', ...fill };
    ws[addr].s.border = BORDER_ALL;
  }
}

// ─── HOJA 1: GLOSAS ──────────────────────────────────────────────────────────
function buildGlosasSheet(glosas: any[]): XLSX.WorkSheet {
  const headers = [
    '# Fila', 'Factura', 'Servicio', 'Orden Servicio',
    'Valor Glosa', 'Valor Aceptado', 'Valor No Aceptado',
    'Estado', 'Tipo Glosa', 'Descripción',
    'Registrada Internamente', 'Soporte PDF', 'Fecha', 'ID'
  ];

  const rows = glosas.map((g, i) => [
    i + 1,
    g.factura || '',
    g.servicio || '',
    g.orden_servicio || '',
    Number(g.valor_glosa) || 0,
    Number(g.valor_aceptado) || 0,
    Number(g.valor_no_aceptado) || 0,
    g.estado || '',
    g.tipo_glosa || '',
    g.descripcion || '',
    g.registrada_internamente ? 'SÍ ✔' : 'NO',
    g.soporte_pdf || '',
    g.fecha || '',
    g.id || ''
  ]);

  // Fila de totales
  const totalGlosa     = glosas.reduce((s, g) => s + (Number(g.valor_glosa)    || 0), 0);
  const totalAceptado  = glosas.reduce((s, g) => s + (Number(g.valor_aceptado) || 0), 0);
  const totalNoAcept   = glosas.reduce((s, g) => s + (Number(g.valor_no_aceptado) || 0), 0);
  const totalRow = ['TOTALES', '', '', '', totalGlosa, totalAceptado, totalNoAcept, '', '', '', '', '', '', ''];

  const data = [headers, ...rows, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Estilos fila cabecera
  applyHeaderRow(ws, 0, headers.length);

  // Color por fila según estado
  rows.forEach((row, i) => {
    applyRowColor(ws, i + 1, headers.length, row[7] as string);
  });

  // Fila totales — fondo verde oscuro
  const totalRowIdx = rows.length + 1;
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
    styleCell(ws, addr, {
      fill: { fgColor: { rgb: '1B5E20' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      border: BORDER_ALL,
    });
  }

  // Anchos de columna
  ws['!cols'] = [
    { wch: 7 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
    { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 35 },
    { wch: 22 }, { wch: 40 }, { wch: 20 }, { wch: 36 }
  ];

  // Freeze top row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  return ws;
}

// ─── HOJA 2: INGRESOS ────────────────────────────────────────────────────────
function buildIngresosSheet(ingresos: any[]): XLSX.WorkSheet {
  const headers = [
    '# Fila', 'Factura', 'Valor Aceptado', 'Valor No Aceptado', 'Fecha', 'Soporte PDF', 'ID'
  ];

  const rows = ingresos.map((i, idx) => [
    idx + 1,
    i.factura || '',
    Number(i.valor_aceptado) || 0,
    Number(i.valor_no_aceptado) || 0,
    i.fecha || '',
    i.soporte_pdf || '',
    i.id || ''
  ]);

  const totAcept   = ingresos.reduce((s, i) => s + (Number(i.valor_aceptado) || 0), 0);
  const totNoAcept = ingresos.reduce((s, i) => s + (Number(i.valor_no_aceptado) || 0), 0);
  const totalRow = ['TOTALES', '', totAcept, totNoAcept, '', '', ''];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);

  applyHeaderRow(ws, 0, headers.length);

  // Color alternado para ingresos
  rows.forEach((_, i) => {
    const fill = i % 2 === 0 ? { fgColor: { rgb: 'F1F8E9' } } : { fgColor: { rgb: 'DCEDC8' } };
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: i + 1, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      if (!ws[addr].s) ws[addr].s = {};
      ws[addr].s = { fill: { patternType: 'solid', ...fill }, border: BORDER_ALL };
    }
  });

  // Fila totales
  const totalRowIdx = rows.length + 1;
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
    styleCell(ws, addr, {
      fill: { fgColor: { rgb: '2E7D32' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      border: BORDER_ALL,
    });
  }

  ws['!cols'] = [{ wch: 7 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 36 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  return ws;
}

// ─── HOJA 3: CONSOLIDADO POR FACTURA ─────────────────────────────────────────
function buildConsolidadoSheet(glosas: any[], ingresos: any[]): XLSX.WorkSheet {
  const headers = [
    'Factura', 'Total Glosado', 'Total Aceptado', 'Total No Aceptado',
    'Diferencia', 'Servicios', 'Estados', 'Tiene Ingreso', 'Último Movimiento'
  ];

  const parseDate = (d: string) => {
    if (!d || d === '---') return 0;
    const [dp] = d.split(',');
    const parts = dp.split('/');
    if (parts.length < 3) return new Date(d).getTime() || 0;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
  };

  const facturas = new Set([
    ...glosas.map(g => (g.factura || '').trim().toUpperCase()),
    ...ingresos.map(i => (i.factura || '').trim().toUpperCase())
  ].filter(Boolean));

  const rows: any[][] = [];
  facturas.forEach(f => {
    const fg = glosas.filter(g => (g.factura || '').trim().toUpperCase() === f);
    const fi = ingresos.filter(i => (i.factura || '').trim().toUpperCase() === f);
    const glosado = fg.reduce((s, g) => s + (Number(g.valor_glosa) || 0), 0);
    const aceptado = fi.length > 0
      ? fi.reduce((s, i) => s + (Number(i.valor_aceptado) || 0), 0)
      : fg.reduce((s, g) => s + (Number(g.valor_aceptado) || 0), 0);
    const noAcept = fi.length > 0
      ? fi.reduce((s, i) => s + (Number(i.valor_no_aceptado) || 0), 0)
      : fg.reduce((s, g) => s + (Number(g.valor_no_aceptado) || 0), 0);

    const allDates = [...fg.map(g => parseDate(g.fecha)), ...fi.map(i => parseDate(i.fecha))].filter(Boolean);
    const lastDate = allDates.length > 0
      ? new Date(Math.max(...allDates)).toLocaleDateString('es-ES')
      : '---';

    rows.push([
      f,
      glosado,
      aceptado,
      noAcept,
      glosado - aceptado,
      [...new Set(fg.map(g => g.servicio).filter(Boolean))].join(', '),
      [...new Set(fg.map(g => g.estado).filter(Boolean))].join(', '),
      fi.length > 0 ? 'SÍ ✔' : 'NO',
      lastDate
    ]);
  });

  // Ordenar por glosado desc
  rows.sort((a, b) => b[1] - a[1]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  applyHeaderRow(ws, 0, headers.length);

  rows.forEach((row, i) => {
    const diferencia = row[4] as number;
    const fill = diferencia > 0
      ? { fgColor: { rgb: 'FFCCBC' } }  // naranja = hay diferencia
      : { fgColor: { rgb: 'C8E6C9' } };  // verde = balanceado
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: i + 1, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = { fill: { patternType: 'solid', ...fill }, border: BORDER_ALL };
    }
  });

  ws['!cols'] = [
    { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 16 }, { wch: 35 }, { wch: 30 }, { wch: 14 }, { wch: 20 }
  ];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

// ─── HOJA 4: RESUMEN EJECUTIVO ────────────────────────────────────────────────
function buildResumenSheet(glosas: any[], ingresos: any[], lastSync: string): XLSX.WorkSheet {
  const totalGlosado    = glosas.reduce((s, g) => s + (Number(g.valor_glosa) || 0), 0);
  const totalRegistrado = glosas.filter(g => g.registrada_internamente).reduce((s, g) => s + (Number(g.valor_glosa) || 0), 0);
  const totalAceptado   = ingresos.reduce((s, i) => s + (Number(i.valor_aceptado) || 0), 0);
  const totalNoAcept    = ingresos.reduce((s, i) => s + (Number(i.valor_no_aceptado) || 0), 0);
  const pendientes      = glosas.filter(g => g.estado === 'Pendiente').length;
  const respondidas     = glosas.filter(g => g.estado === 'Respondida').length;
  const aceptadas       = glosas.filter(g => g.estado === 'Aceptada').length;
  const tasaRecuper     = totalGlosado > 0 ? Math.round((totalAceptado / totalGlosado) * 100) : 0;

  const data = [
    ['📊 RESUMEN EJECUTIVO — SISTEMA DE GLOSAS', ''],
    ['Última sincronización:', lastSync],
    ['', ''],
    ['INDICADOR', 'VALOR'],
    ['━━━━━━━━━━━━━━━━━━━━', '━━━━━━━━━━━━'],
    ['Total de registros (Glosas)',   glosas.length],
    ['Total de registros (Ingresos)', ingresos.length],
    ['', ''],
    ['💵 VALORES FINANCIEROS', ''],
    ['Total Glosado (Potencial)',  totalGlosado],
    ['Total Registrado Interno',   totalRegistrado],
    ['Total Aceptado (Ingresos)',  totalAceptado],
    ['Total No Aceptado',          totalNoAcept],
    ['Diferencia Pendiente',       totalGlosado - totalAceptado],
    ['', ''],
    ['📈 ESTADOS DE GLOSAS', ''],
    ['Pendientes',  pendientes],
    ['Respondidas', respondidas],
    ['Aceptadas',   aceptadas],
    ['', ''],
    ['📉 INDICADORES CLAVE', ''],
    ['Tasa de Recuperación (%)',   `${tasaRecuper}%`],
    ['Glosas Registradas Internamente', glosas.filter(g => g.registrada_internamente).length],
    ['Facturas con Ingreso Registrado', new Set(ingresos.map(i => i.factura)).size],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Título principal
  styleCell(ws, 'A1', { fill: { fgColor: { rgb: '1E3A5F' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14, name: 'Calibri' } });
  styleCell(ws, 'A4', { font: { bold: true, sz: 11, name: 'Calibri' }, fill: { fgColor: { rgb: 'E3F2FD' } } });
  styleCell(ws, 'B4', { font: { bold: true, sz: 11, name: 'Calibri' }, fill: { fgColor: { rgb: 'E3F2FD' } } });

  ws['!cols'] = [{ wch: 38 }, { wch: 22 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  return ws;
}

// ─── HOJA 5: HISTORIAL DE CAMBIOS ────────────────────────────────────────────
function buildHistorialSheet(existing: any[]): XLSX.WorkSheet {
  const headers = ['Timestamp', 'Acción', 'Tabla', 'Factura', 'Campo Clave', 'Valor', 'ID Registro'];
  const rows = existing.length > 0 ? existing : [];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  applyHeaderRow(ws, 0, headers.length);

  rows.forEach((row, i) => {
    const accion = row[1] as string;
    let fill;
    if (accion === 'INSERT') fill = { fgColor: { rgb: 'C8E6C9' } };       // verde
    else if (accion === 'UPDATE') fill = { fgColor: { rgb: 'FFF9C4' } };   // amarillo
    else if (accion === 'DELETE') fill = { fgColor: { rgb: 'FFCDD2' } };   // rojo
    else fill = { fgColor: { rgb: 'F5F5F5' } };

    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: i + 1, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = { fill: { patternType: 'solid', ...fill }, border: BORDER_ALL };
    }
  });

  ws['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 36 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

// ─── CONSTRUCTOR DEL LIBRO COMPLETO ──────────────────────────────────────────
function buildFullWorkbook(glosas: any[], ingresos: any[], historial: any[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ts = nowTimestamp();

  XLSX.utils.book_append_sheet(wb, buildGlosasSheet(glosas),              '📋 Glosas');
  XLSX.utils.book_append_sheet(wb, buildIngresosSheet(ingresos),          '💰 Ingresos');
  XLSX.utils.book_append_sheet(wb, buildConsolidadoSheet(glosas, ingresos), '📊 Consolidado');
  XLSX.utils.book_append_sheet(wb, buildResumenSheet(glosas, ingresos, ts), '📈 Resumen Ejecutivo');
  XLSX.utils.book_append_sheet(wb, buildHistorialSheet(historial),         '🕒 Historial');

  return wb;
}

// ─── LEER / GUARDAR HISTORIAL DEL EXCEL EXISTENTE ────────────────────────────
function readExistingHistorial(): any[] {
  if (!canWriteLocal() || !fs.existsSync(FULL_PATH)) return [];
  try {
    const wb = XLSX.readFile(FULL_PATH);
    const histSheet = wb.Sheets['🕒 Historial'];
    if (!histSheet) return [];
    const rows = XLSX.utils.sheet_to_json(histSheet, { header: 1 }) as any[][];
    return rows.slice(1); // sin cabecera
  } catch { return []; }
}

function saveWorkbook(wb: XLSX.WorkBook) {
  if (canWriteLocal()) {
    XLSX.writeFile(wb, FULL_PATH, { bookSST: false, type: 'binary', cellStyles: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST → Registro en tiempo real (INSERT / UPDATE / DELETE)
// Body: { type: 'glosa'|'ingreso', action: 'insert'|'update'|'delete', data: {...} }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, action = 'insert', data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Faltan parámetros: type y data son requeridos.' }, { status: 400 });
    }

    const ts = nowTimestamp();

    // 1. Obtener todos los datos actuales desde Supabase para regenerar el Excel completo
    const [{ data: glosas }, { data: ingresos }] = await Promise.all([
      supabase.from('glosas').select('*').order('fecha', { ascending: false }),
      supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
    ]);

    // 2. Leer historial previo
    const historial = readExistingHistorial();

    // 3. Agregar nueva entrada en historial
    const actionLabel = action.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE';
    const factura     = data.factura || data.id || '—';
    const campoValor  = type === 'glosa'
      ? `${data.estado || ''} | $${(data.valor_glosa || 0).toLocaleString('es-ES')}`
      : `Acept=$${(data.valor_aceptado || 0).toLocaleString('es-ES')}`;

    const nuevaEntrada = [ts, actionLabel, type === 'glosa' ? 'Glosas' : 'Ingresos', factura, data.servicio || data.estado || '—', campoValor, data.id || ''];
    historial.unshift(nuevaEntrada); // Lo más reciente arriba

    // Limitar historial a 500 entradas
    const histSafe = historial.slice(0, 500);

    // 4. Generar el libro completo
    const wb = buildFullWorkbook(glosas || [], ingresos || [], histSafe);

    // 5. Guardar localmente (Escritorio) - Solo si es modo local
    if (canWriteLocal()) {
      saveWorkbook(wb);
    }

    // 6. SUBIDA A LA NUBE (Supabase Storage) para "Consolidado Fijo"
    // Esto permite que el usuario tenga un link permanente sin bajar archivos.
    let cloudUrl = null;
    try {
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false, cellStyles: true });
      const fileName = 'Consolidado_Fijo_Sisfact.xlsx';
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('soportes_glosas')
        .upload(fileName, excelBuffer, { 
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true 
        });

      if (uploadError) {
        console.error('⚠️ Error al subir Excel a la nube:', uploadError);
      } else {
        const { data: publicData } = supabase.storage
          .from('soportes_glosas')
          .getPublicUrl(fileName);
        cloudUrl = publicData.publicUrl;
      }
    } catch (err) {
      console.error('❌ Error crítico en subida cloud:', err);
    }

    const mode = canWriteLocal() ? 'local' : 'cloud';
    return NextResponse.json({
      ok: true,
      mode,
      message: canWriteLocal()
        ? `✅ Excel actualizado en Escritorio y Nube — ${ts}`
        : `☁️ Conexión fija actualizada en la nube.`,
      timestamp: ts,
      action: actionLabel,
      type,
      cloudUrl
    });

  } catch (error: any) {
    console.error('❌ Error en Backup API (POST):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET → Generar backup completo desde Supabase
// ?download=true  → devuelve el archivo para descarga directa
// ?sync=true      → solo guarda en escritorio (sin descarga)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    // Obtener TODOS los datos de Supabase
    const [{ data: glosas, error: gErr }, { data: ingresos, error: iErr }] = await Promise.all([
      supabase.from('glosas').select('*').order('fecha', { ascending: false }),
      supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
    ]);

    if (gErr) throw new Error('Error al obtener glosas: ' + gErr.message);
    if (iErr) throw new Error('Error al obtener ingresos: ' + iErr.message);

    const historial = readExistingHistorial();
    const wb = buildFullWorkbook(glosas || [], ingresos || [], historial);

    // Guardar en escritorio si es local
    saveWorkbook(wb);

    // Actualizar Consolidado Fijo en la nube
    let cloudUrl = null;
    try {
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false, cellStyles: true });
      const fileName = 'Consolidado_Fijo_Sisfact.xlsx';
      await supabase.storage.from('soportes_glosas').upload(fileName, excelBuffer, { upsert: true });
      const { data } = supabase.storage.from('soportes_glosas').getPublicUrl(fileName);
      cloudUrl = data.publicUrl;
    } catch (e) { console.error('Error cloud sync GET:', e); }

    if (download) {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false, cellStyles: true });
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${FILE_NAME}"`,
          'Cache-Control': 'no-cache',
        }
      });
    }

    return NextResponse.json({
      ok: true,
      message: `✅ Backup completo generado — ${nowTimestamp()}`,
      path: canWriteLocal() ? FULL_PATH : '(modo nube)',
      cloudUrl,
      totalGlosas: (glosas || []).length,
      totalIngresos: (ingresos || []).length,
    });

  } catch (error: any) {
    console.error('❌ Error en Backup API (GET):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
