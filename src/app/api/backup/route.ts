import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// Configuraciones adaptativas (Local vs Nube)
const IS_VERCEL = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const DESKTOP_PATH = 'C:\\Users\\AUXFACTURACION8-VIVA\\Desktop';
const FILE_NAME = 'Base_Datos_Glosas_Backup.xlsx';
const FULL_PATH = path.join(DESKTOP_PATH, FILE_NAME);

/**
 * Función para verificar si podemos escribir en el Escritorio local
 */
function canWriteToLocal() {
  if (IS_VERCEL) return false;
  try {
    return fs.existsSync(DESKTOP_PATH);
  } catch {
    return false;
  }
}

/**
 * Función auxiliar para obtener o crear el libro de Excel
 */
function getWorkbook() {
  if (canWriteToLocal() && fs.existsSync(FULL_PATH)) {
    return XLSX.readFile(FULL_PATH);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), 'Glosas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), 'Ingresos');
    return wb;
  }
}

/**
 * Función para guardar el libro en el Escritorio
 */
function saveWorkbook(wb: XLSX.WorkBook) {
  if (canWriteToLocal()) {
    XLSX.writeFile(wb, FULL_PATH);
  }
}

// POST: Añade un nuevo registro al Excel (Glosas o Ingresos)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body; // type: 'glosa' | 'ingreso'

    if (!type || !data) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const wb = getWorkbook();
    const sheetName = type === 'glosa' ? 'Glosas' : 'Ingresos';
    
    // Obtener datos actuales de la pestaña
    const sheet = wb.Sheets[sheetName];
    const existingData = XLSX.utils.sheet_to_json(sheet);
    
    // Añadir el nuevo dato
    existingData.push(data);
    
    // Reemplazar la pestaña con los nuevos datos
    const newSheet = XLSX.utils.json_to_sheet(existingData);
    wb.Sheets[sheetName] = newSheet;
    
    saveWorkbook(wb);

    if (IS_VERCEL) {
      return NextResponse.json({ message: 'Modo Nube: No se puede actualizar el escritorio remoto, pero el registro se guardó en Supabase.' });
    }

    return NextResponse.json({ message: 'Backup actualizado en Escritorio' });
  } catch (error: any) {
    console.error('Error en Backup API (POST):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Genera un backup COMPLETO desde Supabase y lo guarda/devuelve
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    // 1. Obtener todos los datos de Supabase
    const { data: glosas, error: gErr } = await supabase.from('glosas').select('*').order('fecha', { ascending: false });
    const { data: ingresos, error: iErr } = await supabase.from('ingresos').select('*').order('fecha', { ascending: false });

    if (gErr || iErr) throw new Error('Error al obtener datos de Supabase');

    // 2. Crear nuevo libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Formatear datos para que se vean bien en Excel
    const glosasFormatted = (glosas || []).map(g => ({
      'Factura': g.factura,
      'Servicio': g.servicio,
      'O. Servicio': g.orden_servicio,
      'Valor Glosa': g.valor_glosa,
      'Aceptado': g.valor_aceptado,
      'Estado': g.estado,
      'Fecha': g.fecha,
      'Tipo': g.tipo_glosa,
      'Descripción': g.descripcion,
      'Interno': g.registrada_internamente ? 'SÍ' : 'NO'
    }));

    const ingresosFormatted = (ingresos || []).map(i => ({
      'Factura': i.factura,
      'Valor Aceptado': i.valor_aceptado,
      'Valor No Aceptado': i.valor_no_aceptado,
      'Fecha': i.fecha
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(glosasFormatted), 'Glosas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ingresosFormatted), 'Ingresos');

    // 3. Guardar en Escritorio
    saveWorkbook(wb);

    // 4. Si se solicita descarga, devolver el buffer
    if (download) {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${FILE_NAME}"`
        }
      });
    }

    return NextResponse.json({ message: 'Backup completo generado en Escritorio', path: FULL_PATH });
  } catch (error: any) {
    console.error('Error en Backup API (GET):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
