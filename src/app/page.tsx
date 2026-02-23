'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { GlosaForm } from '@/components/GlosaForm';
import { GlosaTable } from '@/components/GlosaTable';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, TrendingUp, Wallet, Activity, Trash2, Download, ListChecks, PieChart, ChevronUp, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const formatPesos = (value: number): string => {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

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

interface Ingreso {
  id: string;
  factura: string;
  valor_aceptado: number;
  valor_no_aceptado: number;
  fecha: string;
}

export default function Home() {
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forcedEntry, setForcedEntry] = useState(false);
  const [showForceButton, setShowForceButton] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const lastFetchedUserId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, role, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Redirección si no está autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Temporizador de seguridad para el botón "Forzar Entrada" y Auto-Kill
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let autoKillTimer: NodeJS.Timeout;

    if (loading || authLoading) {
      timer = setTimeout(() => {
        setShowForceButton(true);
      }, 5000); // Aparece tras 5 segundos

      autoKillTimer = setTimeout(() => {
        setForcedEntry(true);
        setLoading(false);
      }, 15000); // Se quita solo tras 15 segundos (Pánico Final)
    } else {
      setShowForceButton(false);
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(autoKillTimer);
    };
  }, [loading, authLoading]);

  const loadData = React.useCallback(async (force = false) => {
    if (!user) return;
    if (!force && lastFetchedUserId.current === user.id && glosas.length > 0) return;

    try {
      setLoading(true);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión')), 10000));

      const fetchPromise = Promise.all([
        supabase.from('glosas').select('*').order('fecha', { ascending: false }),
        supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
      ]);

      const results = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const [gRes, iRes] = results;

      if (gRes.data) {
        setGlosas(gRes.data);
        lastFetchedUserId.current = user.id;
      }
      if (iRes.data) setIngresos(iRes.data);

      if (gRes.data || iRes.data) setLastUpdate(new Date());

    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, glosas.length]);

  // Cargar datos desde Supabase al montar
  useEffect(() => {
    setIsMounted(true);
    if (user) loadData();
  }, [user?.id, loadData]);

  // Migración de datos desde localStorage a Supabase (Escaneo Profundo)
  useEffect(() => {
    const migrateData = async () => {
      try {
        const isMigrated = localStorage.getItem('migrated_to_supabase_deep_v2');
        if (isMigrated === 'true') return;

        console.log('--- INICIANDO ESCANEO PROFUNDO DE RECUPERACIÓN ---');
        let recoveredGlosas: any[] = [];
        let recoveredIngresos: any[] = [];
        const foundKeys: string[] = [];

        // Llaves específicas encontradas y escaneo general
        const keysToTry = Array.from(new Set(['sisfact_glosas', 'sisfact_ingresos', ...Object.keys(localStorage)]));

        for (const key of keysToTry) {
          try {
            const val = localStorage.getItem(key);
            if (!val) continue;

            const parsed = JSON.parse(val);

            if (Array.isArray(parsed) && parsed.length > 0) {
              const first = parsed[0];

              if (key === 'sisfact_glosas' || (first.factura && first.valor_glosa !== undefined)) {
                if (!foundKeys.includes(key)) {
                  recoveredGlosas = [...recoveredGlosas, ...parsed];
                  foundKeys.push(key);
                }
              }
              else if (key === 'sisfact_ingresos' || (first.factura && first.valor_aceptado !== undefined)) {
                if (!foundKeys.includes(key)) {
                  recoveredIngresos = [...recoveredIngresos, ...parsed];
                  foundKeys.push(key);
                }
              }
            }
          } catch (e) { }
        }

        if (recoveredGlosas.length > 0 || recoveredIngresos.length > 0) {
          localStorage.setItem('migrated_to_supabase_deep_v2', 'true');
          const [{ data: gData }, { data: iData }] = await Promise.all([
            supabase.from('glosas').select('*').order('fecha', { ascending: false }),
            supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
          ]);
          if (gData) setGlosas(gData);
          if (iData) setIngresos(iData);
        }
      } catch (err: any) {
        console.error('Error durante la recuperación:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isMounted) migrateData();
  }, [isMounted]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterEstado, setFilterEstado] = useState('Todos');

  const filteredGlosas = useMemo(() => {
    return glosas.filter(g => {
      const matchesSearch = g.factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.servicio && g.servicio.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (g.descripcion && g.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTipo = filterTipo === 'Todos' || g.tipo_glosa === filterTipo;
      const matchesEstado = filterEstado === 'Todos' || g.estado === filterEstado;
      return matchesSearch && matchesTipo && matchesEstado;
    });
  }, [glosas, searchTerm, filterTipo, filterEstado]);

  const stats = useMemo(() => {
    const totalGlosasValue = glosas.reduce((acc, curr) => acc + curr.valor_glosa, 0);
    const totalAceptadoValue = ingresos.reduce((acc, curr) => acc + curr.valor_aceptado, 0);
    return {
      totalCount: glosas.length,
      totalValue: totalGlosasValue,
      pendingCount: glosas.filter(g => g.estado === 'Pendiente').length,
      respondedCount: glosas.filter(g => g.estado === 'Respondida').length,
      acceptedCount: glosas.filter(g => g.estado === 'Aceptada').length,
      totalIngresos: totalAceptadoValue,
    };
  }, [glosas, ingresos]);

  const handleAddGlosa = async (newGlosa: Glosa) => {
    const { error } = await supabase.from('glosas').insert([newGlosa]);
    if (!error) setGlosas(prev => [newGlosa, ...prev]);
  };

  const handleUpdateStatus = async (id: string, newEstado: string) => {
    const { error } = await supabase.from('glosas').update({ estado: newEstado }).eq('id', id);
    if (!error) setGlosas(prev => prev.map(g => g.id === id ? { ...g, estado: newEstado } : g));
  };

  const handleUpdateGlosa = async (updatedGlosa: Glosa) => {
    const { error } = await supabase.from('glosas').update(updatedGlosa).eq('id', updatedGlosa.id);
    if (!error) setGlosas(prev => prev.map(g => g.id === updatedGlosa.id ? updatedGlosa : g));
  };

  const handleDeleteGlosa = async (id: string) => {
    const { error } = await supabase.from('glosas').delete().eq('id', id);
    if (!error) setGlosas(prev => prev.filter(g => g.id !== id));
  };

  const handleDeleteDuplicates = async () => {
    const seen = new Map<string, string>();
    const toDelete: string[] = [];
    glosas.forEach(g => {
      const key = `${g.factura.trim().toLowerCase()}|${g.servicio.trim().toLowerCase()}|${g.valor_glosa}`;
      if (!seen.has(key)) {
        seen.set(key, g.id);
      } else {
        toDelete.push(g.id);
      }
    });
    if (toDelete.length > 0) {
      await supabase.from('glosas').delete().in('id', toDelete);
      setGlosas(prev => prev.filter(g => !toDelete.includes(g.id)));
    }
  };

  const handleAddIngreso = async (newIngreso: Ingreso) => {
    const { error } = await supabase.from('ingresos').insert([newIngreso]);
    if (!error) setIngresos(prev => [newIngreso, ...prev]);
  };

  const handleDeleteIngreso = async (id: string) => {
    const { error } = await supabase.from('ingresos').delete().eq('id', id);
    if (!error) setIngresos(prev => prev.filter(i => i.id !== id));
  };

  const consolidado = useMemo(() => {
    const facturas = new Set([...glosas.map(g => g.factura), ...ingresos.map(i => i.factura)].filter(f => f && f.trim() !== ''));
    return Array.from(facturas).map(f => {
      const glosado = glosas.filter(g => g.factura === f).reduce((acc, g) => acc + g.valor_glosa, 0);
      const aceptado = ingresos.filter(i => i.factura === f).reduce((acc, i) => acc + i.valor_aceptado, 0);
      const noAceptado = ingresos.filter(i => i.factura === f).reduce((acc, i) => acc + i.valor_no_aceptado, 0);
      return { factura: f, glosado, aceptado, noAceptado, diferencia: glosado - aceptado - noAceptado };
    }).sort((a, b) => b.glosado - a.glosado);
  }, [glosas, ingresos]);

  const testConnection = async () => {
    try {
      setLoading(true);
      // Prueba 1: Lectura (GET)
      const { error: readErr } = await supabase.from('glosas').select('id').limit(1);
      if (readErr) throw new Error('Error de lectura: ' + readErr.message);

      // Prueba 2: Escritura Trial (POST) - Intentamos insertar un registro temporal
      const testId = 'test_' + Math.random().toString(36).substr(2, 5);
      const { error: writeErr } = await supabase.from('glosas').insert([{
        id: testId,
        factura: 'TEST_CONEXION',
        descripcion: 'Eliminar esta fila'
      }]);

      if (writeErr) throw new Error('Error de escritura: ' + writeErr.message);

      // Limpiamos la prueba
      await supabase.from('glosas').delete().eq('id', testId);

      alert('✅ ¡CONEXIÓN TOTAL EXITOSA!\nTanto la lectura como la subida de datos funcionan correctamente.');
    } catch (err: any) {
      console.error('Test Connection Error:', err);
      alert('❌ ERROR DE CONEXIÓN:\n' + err.message + '\n\nSi el error es "Failed to fetch", es probable que la red de tu oficina bloquee el envío de datos (POST).');
    } finally {
      setLoading(false);
    }
  };

  const handleManualImport = async () => {
    const jsonStr = prompt('Pega aquí el contenido de tu respaldo (JSON):');
    if (!jsonStr) return;
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data)) {
        setLoading(true);
        const { error } = await supabase.from('glosas').upsert(data);
        if (!error) {
          setGlosas(prev => [...data, ...prev]);
          alert('¡Importación exitosa!');
        } else {
          alert('Error al subir a la nube: ' + error.message);
        }
        setLoading(false);
      } else {
        alert('El formato no es válido. Debe ser una lista [ ... ].');
      }
    } catch (e) {
      alert('Error al leer el JSON: ' + (e as Error).message);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('El archivo está vacío o no tiene encabezados.');

        // Detectar separador común en Excel (punto y coma o coma)
        const delimiter = text.includes(';') ? ';' : ',';
        // Limpiamos BOM y espacios de los encabezados
        const headers = lines[0]
          .replace(/^\ufeff/, '')
          .split(delimiter)
          .map(h => h.trim().toLowerCase());

        const data = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim());
          const obj: any = {
            id: 'csv_' + Math.random().toString(36).substr(2, 9),
            factura: '',
            servicio: '',
            orden_servicio: '',
            valor_glosa: 0,
            tipo_glosa: 'Tarifas',
            estado: 'Pendiente',
            fecha: new Date().toLocaleDateString('es-ES'),
            descripcion: ''
          };

          headers.forEach((header, index) => {
            const val = values[index];
            if (!val) return;

            if (header.includes('factura')) obj.factura = val;
            if (header.includes('orden')) obj.orden_servicio = val;
            if (header.includes('servicio') && !header.includes('orden')) obj.servicio = val;
            if (header.includes('valor')) {
              // Limpiar formato de moneda si existe (quitar $ y puntos de miles)
              const numericVal = val.replace(/[$. ]/g, '').replace(',', '.');
              obj.valor_glosa = parseFloat(numericVal) || 0;
            }
            if (header.includes('tipo')) obj.tipo_glosa = val;
            if (header.includes('estado')) obj.estado = val;
            if (header.includes('fecha')) obj.fecha = val;
            if (header.includes('descrip')) obj.descripcion = val;
          });
          return obj;
        }).filter(item => item.factura);

        if (data.length === 0) throw new Error('No se encontraron registros válidos por factura. Verifica los nombres de las columnas.');

        const { error } = await supabase.from('glosas').upsert(data);
        if (error) throw error;

        setGlosas(prev => [...data, ...prev]);
        alert(`¡Éxito! Se importaron ${data.length} glosas correctamente.`);
      } catch (err: any) {
        console.error('Error CSV:', err);
        alert('Error al importar CSV: ' + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const exportToExcel = () => {
    const dataToExport = consolidado; // El consolidado es por factura, así que se mantiene igual o según necesites
    if (dataToExport.length === 0) return;
    const headers = ['Factura', 'Valor Glosado', 'Valor Aceptado', 'Valor No Aceptado', 'Diferencia'];
    const rows = dataToExport.map(item => [
      item.factura,
      item.glosado.toFixed(2).replace('.', ','),
      item.aceptado.toFixed(2).replace('.', ','),
      item.noAceptado.toFixed(2).replace('.', ','),
      item.diferencia.toFixed(2).replace('.', ',')
    ]);
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CONSOLIDADO_AUDITORIA_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const exportGlosasToExcel = () => {
    const dataToExport = filteredGlosas;
    if (dataToExport.length === 0) return;
    const headers = ['Factura', 'Servicio', 'Orden Servicio', 'Valor Glosa', 'Tipo Glosa', 'Estado', 'Fecha', 'Descripcion'];
    const rows = dataToExport.map(g => [
      g.factura, g.servicio, g.orden_servicio,
      g.valor_glosa.toFixed(2).replace('.', ','),
      g.tipo_glosa, g.estado, g.fecha,
      `"${g.descripcion ? g.descripcion.replace(/"/g, '""') : ''}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LISTADO_GLOSAS_FILTRADO_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  if (!isMounted) return <div style={{ background: '#06040d', minHeight: '100vh' }}></div>;

  // Cálculos para el Donut Chart - Uso los totales reales para las estadísticas globales
  const totalStates = stats.pendingCount + stats.respondedCount + stats.acceptedCount || 1;
  const pPending = (stats.pendingCount / totalStates) * 100;
  const pResponded = (stats.respondedCount / totalStates) * 100;
  const pAccepted = (stats.acceptedCount / totalStates) * 100;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', position: 'relative' }}>
      {/* Loading overlay - Top Level */}
      <AnimatePresence>
        {((loading || authLoading) && !forcedEntry) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 20000,
              background: 'var(--background)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(139,92,246,0.2)',
                borderTop: '3px solid #8b5cf6',
                borderRadius: '50%',
                marginBottom: '1rem'
              }}
            />
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Preparando ambiente seguro...</p>

            {showForceButton && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setLoading(false);
                  setForcedEntry(true);
                }}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: 'white',
                  fontWeight: 800,
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                ¿PROBLEMAS? FORZAR ENTRADA
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Se mantiene igual */}
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        style={{
          width: '320px',
          borderRight: '1px solid var(--border)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          background: 'rgba(6, 4, 13, 0.95)',
          backdropFilter: 'blur(30px)',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px' }}
          >
            <Activity size={20} color="var(--primary)" />
          </motion.div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Estadísticas</h2>
        </div>

        {/* Categorías con Porcentajes */}
        <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(139, 92, 246, 0.15)', overflow: 'hidden' }}>
          <p className="label" style={{ marginBottom: '1.25rem', fontSize: '0.7rem' }}>Categorías Glosas (%)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {['Tarifas', 'Soportes', 'RIPS', 'Autorización'].map((tipo, idx) => {
              const count = glosas.filter(g => g.tipo_glosa === tipo).length;
              const total = glosas.length || 1;
              const percent = Math.round((count / total) * 100);
              return (
                <div key={tipo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.6rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{tipo}</span>
                    <span style={{ color: 'white', fontWeight: 700 }}>{count} ({percent}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1.5, delay: idx * 0.1, ease: "circOut" }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)', position: 'relative' }}
                    >
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
                      />
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.15)', background: 'rgba(255,255,255,0.01)' }}>
          <p className="label" style={{ marginBottom: '1.75rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={14} />
            ESTADO DE GESTIÓN DINÁMICO
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}>
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="gradPending" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <linearGradient id="gradResponded" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                  <linearGradient id="gradAccepted" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#f87171" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="url(#gradPending)" strokeWidth="8" strokeLinecap="round" initial={{ strokeDasharray: "0 251.2" }} animate={{ strokeDasharray: `${(pPending / 100) * 251.2} 251.2` }} transition={{ duration: 1.5, ease: "circOut" }} filter="url(#glow)" />
                <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="url(#gradResponded)" strokeWidth="8" strokeLinecap="round" strokeDashoffset={-((pPending / 100) * 251.2)} initial={{ strokeDasharray: "0 251.2" }} animate={{ strokeDasharray: `${(pResponded / 100) * 251.2} 251.2` }} transition={{ duration: 1.5, delay: 0.3, ease: "circOut" }} filter="url(#glow)" />
                <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="url(#gradAccepted)" strokeWidth="8" strokeLinecap="round" strokeDashoffset={-(((pPending + pResponded) / 100) * 251.2)} initial={{ strokeDasharray: "0 251.2" }} animate={{ strokeDasharray: `${(pAccepted / 100) * 251.2} 251.2` }} transition={{ duration: 1.5, delay: 0.6, ease: "circOut" }} filter="url(#glow)" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', margin: 0 }}>{glosas.length}</p>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Glosas</p>
              </div>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { label: 'Pendiente', count: stats.pendingCount, color: '#8b5cf6', p: pPending },
                { label: 'Respondida', count: stats.respondedCount, color: '#10b981', p: pResponded },
                { label: 'Aceptada', count: stats.acceptedCount, color: '#ef4444', p: pAccepted }
              ].map((st, idx) => (
                <motion.div key={st.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + (idx * 0.1) }} whileHover={{ scale: 1.05, x: 5 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '8px', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: st.color, boxShadow: `0 0 10px ${st.color}55` }}></div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{st.label}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>{st.count} <small style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>({Math.round(st.p)}%)</small></span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div whileHover={{ y: -5 }} className="card" style={{ padding: '1.5rem', marginTop: 'auto', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 4, 13, 0.5))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Activity size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Valor Auditado</span>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 950, color: 'white', letterSpacing: '-0.02em' }}>
            ${formatPesos(stats.totalValue)}
          </p>
        </motion.div>
      </motion.aside>

      <main className="container" style={{ flex: 1, margin: 0, maxWidth: 'none', overflowY: 'auto', padding: '2rem 3rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="260" height="110" viewBox="0 0 260 110" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
                <defs>
                  <linearGradient id="viu-radial-grad-corporate-exact" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4361ee" />
                    <stop offset="60%" stopColor="#4895ef" />
                    <stop offset="100%" stopColor="#4cc9f0" />
                  </linearGradient>
                </defs>
                <g transform="translate(45,40)">
                  {[...Array(38)].map((_, i) => (
                    <rect key={i} x="-1.1" y="14" width="2.2" height="16" rx="1.1" fill="url(#viu-radial-grad-corporate-exact)" transform={`rotate(${i * (360 / 38)})`} />
                  ))}
                </g>
                <text x="80" y="60" fontFamily="Arial Black, Helvetica, sans-serif" fontWeight="900" fontSize="60" fill="white" textAnchor="start" style={{ letterSpacing: '-3px' }}>VIU</text>
                <text x="130" y="95" fontFamily="Arial, sans-serif" fontSize="11" fill="white" textAnchor="middle" fontWeight="700" style={{ letterSpacing: '0.5px' }}>Clínica Oftalmológica Internacional</text>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '15px' }}>
              <h1 style={{ fontSize: '2.8rem', color: '#ffffff', fontWeight: 900, lineHeight: 1.1, margin: 0 }}>Sistema Auditoría Glosas</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', letterSpacing: '0.05em', fontWeight: 600, margin: 0, marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="rgba(255,255,255,0.3)" />
                Control Maestro de Facturación e Ingresos
              </p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {lastUpdate && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(139, 92, 246, 0.7)', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)', fontWeight: 600 }}>
                  <RefreshCw size={12} style={{ marginRight: '5px', verticalAlign: 'middle', display: 'inline' }} />
                  {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => loadData(true)}
                title="Sincronizar Datos"
                style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#8b5cf6', cursor: 'pointer', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <RefreshCw size={16} />
              </motion.button>
            </p>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'flex-end' }}>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.2)' }}></span>
                Diseñado y Desarrollado por Isaac Contreras
              </p>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={signOut}
                title="Cerrar sesión"
                style={{
                  position: 'fixed',
                  top: '1.5rem',
                  right: '1.5rem',
                  zIndex: 1100,
                  background: '#ef4444',
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
                  color: 'white',
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={20} />
              </motion.button>
            </div>
          </motion.div>
        </header>

        {((!loading && !authLoading) || forcedEntry) && user && (
          <>
            <Dashboard
              totalCount={stats.totalCount}
              totalValue={stats.totalValue}
              pendingCount={stats.pendingCount}
              respondedCount={stats.respondedCount}
              acceptedCount={stats.acceptedCount}
              totalIngresos={stats.totalIngresos}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <GlosaForm onAddGlosa={handleAddGlosa} existingGlosas={glosas} isAdmin={role === 'admin'} />
                <AnimatePresence mode="popLayout">
                  <motion.div key="table-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <GlosaTable
                      glosas={filteredGlosas}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdateGlosa={handleUpdateGlosa}
                      onDeleteGlosa={handleDeleteGlosa}
                      onDeleteDuplicates={handleDeleteDuplicates}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      filterTipo={filterTipo}
                      setFilterTipo={setFilterTipo}
                      filterEstado={filterEstado}
                      setFilterEstado={setFilterEstado}
                      isAdmin={role === 'admin'}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <IngresoForm onAddIngreso={handleAddIngreso} isAdmin={role === 'admin'} />
                <IngresoList ingresos={ingresos} onDelete={handleDeleteIngreso} isAdmin={role === 'admin'} />
              </div>
            </div>
          </>
        )}

        <footer style={{ marginTop: '8rem', padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h3 style={{
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: '2.5rem',
              fontWeight: 800
            }}>
              Panel de Control y Gestión de Datos
            </h3>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '4rem' }}>
              {/* Grupo: Gestión de Archivos */}
              <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                {role === 'admin' && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary"
                      style={{ padding: '0.7rem 1.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}
                    >
                      <ListChecks size={16} />
                      IMPORTAR EXCEL
                    </motion.button>
                    <input type="file" ref={fileInputRef} onChange={handleCSVImport} accept=".csv" style={{ display: 'none' }} />
                  </>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={exportGlosasToExcel}
                  className="btn btn-secondary"
                  style={{ padding: '0.7rem 1.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.2)' }}
                >
                  <Download size={16} />
                  EXPORTAR DATOS
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={exportToExcel}
                  className="btn btn-secondary"
                  style={{ padding: '0.7rem 1.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                >
                  <Download size={16} />
                  CONSOLIDADO
                </motion.button>
              </div>

              {/* Grupo: Mantenimiento (Discreto) */}
              {role === 'admin' && (
                <div style={{ display: 'flex', gap: '0.75rem', opacity: 0.5 }}>
                  <motion.button
                    whileHover={{ scale: 1.05, opacity: 1 }}
                    onClick={() => {
                      const recovered = {
                        glosas: JSON.parse(localStorage.getItem('sisfact_glosas') || '[]'),
                        ingresos: JSON.parse(localStorage.getItem('sisfact_ingresos') || '[]')
                      };
                      if (confirm('¿Deseas intentar IMPORTAR a la nube o DESCARGAR un respaldo?')) {
                        handleManualImport();
                      } else {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recovered, null, 2));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", "respaldo_glosas_seguro.json");
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}
                  >
                    <Activity size={12} />
                    RESCATE
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05, opacity: 1 }}
                    onClick={testConnection}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}
                  >
                    <Activity size={12} />
                    TEST NUBE
                  </motion.button>
                </div>
              )}
            </div>

            <div style={{ opacity: 0.4 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                &copy; {new Date().getFullYear()} Sisfact Auditoría. Desarrollado por Isaac Contreras.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Gestión de Alto Rendimiento para Clínicas Internacionales
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

const IngresoForm = ({ onAddIngreso, isAdmin }: { onAddIngreso: (ingreso: Ingreso) => void, isAdmin: boolean }) => {
  const [formData, setFormData] = useState({ factura: '', valor_aceptado: '', valor_no_aceptado: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !formData.factura) return;
    onAddIngreso({
      id: Math.random().toString(36).substr(2, 9),
      factura: formData.factura,
      valor_aceptado: parseFloat(formData.valor_aceptado) || 0,
      valor_no_aceptado: parseFloat(formData.valor_no_aceptado) || 0,
      fecha: new Date().toLocaleDateString('es-ES')
    });
    setFormData({ factura: '', valor_aceptado: '', valor_no_aceptado: '' });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.15)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)' }}>
      <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '1.1rem', color: '#10b981', fontWeight: 800 }}>
        <TrendingUp size={22} />
        GESTIÓN DE VALORES ACEPTADOS
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <label className="label">Número de Factura Afectada</label>
            <input type="text" className="input" style={{ padding: '0.85rem 1rem' }} placeholder="Ej: FAC-100" value={formData.factura} onChange={(e) => setFormData({ ...formData, factura: e.target.value })} required disabled={!isAdmin} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="label" style={{ color: '#10b981' }}>Valor No Aceptado</label>
              <input type="number" className="input" style={{ padding: '0.85rem 1rem', borderColor: 'rgba(16, 185, 129, 0.2)' }} placeholder="0.00" value={formData.valor_no_aceptado} onChange={(e) => setFormData({ ...formData, valor_no_aceptado: e.target.value })} disabled={!isAdmin} />
            </div>
            <div className="input-group">
              <label className="label" style={{ color: '#ef4444' }}>Valor Aceptado</label>
              <input type="number" className="input" style={{ padding: '0.85rem 1rem', borderColor: 'rgba(239, 68, 68, 0.3)' }} placeholder="0.00" value={formData.valor_aceptado} onChange={(e) => setFormData({ ...formData, valor_aceptado: e.target.value })} disabled={!isAdmin} />
            </div>
          </div>
        </div>

        {isAdmin ? (
          <motion.button whileHover={{ scale: 1.02, background: '#059669' }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', background: '#10b981', height: '52px', fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            REGISTRAR MOVIMIENTO
          </motion.button>
        ) : (
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', marginTop: '2rem' }}>
            Modo LECTURA. Registro de movimientos deshabilitado.
          </div>
        )}
      </form>
    </motion.div>
  );
};

const IngresoList = ({ ingresos, onDelete, isAdmin }: { ingresos: Ingreso[], onDelete: (id: string) => void, isAdmin: boolean }) => {
  const totalAceptado = ingresos.reduce((acc, i) => acc + i.valor_aceptado, 0);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800 }}>
          <ListChecks size={22} />
          Historial de Gestión
        </h3>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Aceptado</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#ef4444' }}>${formatPesos(totalAceptado)}</p>
        </div>
      </div>
      <div style={{ flex: 1, maxHeight: '800px', overflowY: 'auto', paddingRight: '0.75rem', minHeight: '300px' }} className="custom-scrollbar">
        <AnimatePresence>
          {ingresos.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', fontSize: '0.9rem' }}>
              Sin movimientos registrados
            </motion.p>
          ) : (
            ingresos.map((i, idx) => (
              <motion.div key={i.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ opacity: 0.8, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03))', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <h4 style={{ color: 'white', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>{i.factura}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Activity size={10} /> {i.fecha}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div>
                      <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.2rem' }}>No Aceptado</p>
                      <p style={{ color: '#10b981', fontWeight: 900, fontSize: '0.95rem' }}>${formatPesos(i.valor_no_aceptado)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.2rem' }}>Aceptado</p>
                      <p style={{ color: '#ef4444', fontWeight: 900, fontSize: '0.95rem' }}>${formatPesos(i.valor_aceptado)}</p>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <motion.button onClick={() => onDelete(i.id)} whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: '#ef4444', padding: '0.75rem', borderRadius: '1rem', cursor: 'pointer', zIndex: 1 }}>
                    <Trash2 size={16} />
                  </motion.button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
