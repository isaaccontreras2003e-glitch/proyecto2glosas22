'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { GlosaForm } from '@/components/GlosaForm';
import { GlosaTable } from '@/components/GlosaTable';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, TrendingUp, Wallet, Activity, Trash2, Download, ListChecks, PieChart, ChevronUp, RefreshCw, ClipboardList, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider, useToast } from '@/lib/contexts/ToastContext';

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
  registrada_internamente?: boolean;
  seccion?: string;
}

interface Ingreso {
  id: string;
  factura: string;
  valor_aceptado: number;
  valor_no_aceptado: number;
  fecha: string;
  seccion?: string;
}

function Home() {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'ingreso' | 'consolidado' | 'valores'>('dashboard');
  const [currentMainSection, setCurrentMainSection] = useState<'GLOSAS' | 'RATIFICADAS' | 'MEDICAMENTOS'>('GLOSAS');
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forcedEntry, setForcedEntry] = useState(false);
  const [showForceButton, setShowForceButton] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const lastFetchedUserId = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, role, seccion_asignada, loading: authLoading, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Redirección si no está autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    // Si el usuario tiene una sección asignada y no es admin, forzar esa sección
    if (user && role !== 'admin' && seccion_asignada) {
      setCurrentMainSection(seccion_asignada as any);
    }
  }, [user, authLoading, router, role, seccion_asignada]);

  // Temporizador de seguridad para el botón "Forzar Entrada" y Auto-Kill
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let autoKillTimer: NodeJS.Timeout;

    if (loading || authLoading) {
      timer = setTimeout(() => {
        setShowForceButton(true);
      }, 2000); // APARECE TRAS 2 SEGUNDOS

      autoKillTimer = setTimeout(() => {
        setForcedEntry(true);
        setLoading(false);
      }, 8000); // SE QUITA SOLO TRAS 8 SEGUNDOS (MUCHO MÁS RÁPIDO)
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

    let retries = 0;
    const maxRetries = 2;

    const attemptFetch = async (): Promise<boolean> => {
      try {
        setLoading(true);
        setSupabaseError(retries > 0 ? `Reintentando... (${retries}/${maxRetries})` : null);

        // Timeout de seguridad de 20s
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de conexión (20s)')), 20000)
        );

        const fetchPromise = Promise.all([
          supabase.from('glosas').select('*').order('fecha', { ascending: false }),
          supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
        ]);

        const results = await Promise.race([fetchPromise, timeoutPromise]) as any;
        const [gRes, iRes] = results;

        if (gRes?.error) throw gRes.error;
        if (iRes?.error) throw iRes.error;

        if (gRes && gRes.data) {
          // RECUPERACIÓN: Si tenemos marcas locales que no están en la nube (ej: antes de la columna)
          // intentamos mezclarlas solo si el registro de la nube viene sin ese campo o en falso
          const localGlosas = JSON.parse(localStorage.getItem('cached_glosas') || '[]');
          const mergedGlosas = gRes.data.map((cloudG: any) => {
            const localG = localGlosas.find((lg: any) => lg.id === cloudG.id);
            if (localG?.registrada_internamente && !cloudG.registrada_internamente) {
              return { ...cloudG, registrada_internamente: true };
            }
            return cloudG;
          });

          setGlosas(mergedGlosas);
          localStorage.setItem('cached_glosas', JSON.stringify(mergedGlosas));
          lastFetchedUserId.current = user.id;
        }
        if (iRes && iRes.data) {
          if (iRes.data.length > 0 || ingresos.length === 0) {
            setIngresos(iRes.data);
            localStorage.setItem('cached_ingresos', JSON.stringify(iRes.data));
          }
        }

        setLastUpdate(new Date());
        setSupabaseError(null);
        return true;
      } catch (err: any) {
        console.error(`Error en intento ${retries + 1}:`, err);
        if (retries < maxRetries) {
          retries++;
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 2000));
          return attemptFetch();
        }
        setSupabaseError(err.message || 'Error de conexión persistente');
        return false;
      } finally {
        setLoading(false);
      }
    };

    await attemptFetch();
  }, [user?.id]);

  // Cargar datos desde caché local (INSTANTÁNEO)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const g = localStorage.getItem('cached_glosas');
      const i = localStorage.getItem('cached_ingresos');
      if (g) setGlosas(JSON.parse(g));
      if (i) setIngresos(JSON.parse(i));
      if (g || i) {
        setLoading(false); // Quitar loader si hay caché
        setLastUpdate(new Date());
      }
    }
  }, []);

  // Cargar datos desde Supabase al montar o cambiar usuario
  useEffect(() => {
    setIsMounted(true);
    if (user) {
      loadData();
    }
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
  const [filterInterno, setFilterInterno] = useState('Todos');
  const [searchTermIngresos, setSearchTermIngresos] = useState('');
  const [searchTermConsolidado, setSearchTermConsolidado] = useState('');

  const filteredGlosas = useMemo(() => {
    return glosas.filter(g => {
      const matchesSection = (g as any).seccion === currentMainSection || (!(g as any).seccion && currentMainSection === 'GLOSAS');
      const matchesSearch = g.factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.servicio && g.servicio.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (g.descripcion && g.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTipo = filterTipo === 'Todos' || g.tipo_glosa === filterTipo;
      const matchesEstado = filterEstado === 'Todos' || g.estado === filterEstado;
      const matchesInterno = filterInterno === 'Todos' ||
        (filterInterno === 'Registrado' ? g.registrada_internamente : !g.registrada_internamente);

      return matchesSection && matchesSearch && matchesTipo && matchesEstado && matchesInterno;
    });
  }, [glosas, currentMainSection, searchTerm, filterTipo, filterEstado, filterInterno]);

  const handleToggleInternalRegistry = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // Si ya está registrado, no permitir desmarcar

    const newStatus = true;
    const updatedGlosas = glosas.map(g => g.id === id ? { ...g, registrada_internamente: newStatus } : g);
    setGlosas(updatedGlosas);
    localStorage.setItem('cached_glosas', JSON.stringify(updatedGlosas));

    const { error } = await supabase.from('glosas').update({ registrada_internamente: newStatus }).eq('id', id);
    if (error) {
      console.error('Error actualizando registro interno:', error);
      showToast('Error al guardar en la nube. Verifica tu conexión.', 'error');
    }
  };

  const filteredIngresos = useMemo(() => {
    return ingresos.filter(i => {
      const matchesSection = (i as any).seccion === currentMainSection || (!(i as any).seccion && currentMainSection === 'GLOSAS');
      return matchesSection && i.factura.toLowerCase().includes(searchTermIngresos.toLowerCase());
    });
  }, [ingresos, currentMainSection, searchTermIngresos]);

  const currentSectionGlosas = useMemo(() => {
    return glosas.filter(g => (g as any).seccion === currentMainSection || (!(g as any).seccion && currentMainSection === 'GLOSAS'));
  }, [glosas, currentMainSection]);

  const stats = useMemo(() => {
    const sectionGlosas = glosas.filter(g => (g as any).seccion === currentMainSection || (!(g as any).seccion && currentMainSection === 'GLOSAS'));
    const sectionIngresos = ingresos.filter(i => (i as any).seccion === currentMainSection || (!(i as any).seccion && currentMainSection === 'GLOSAS'));

    const totalGlosadoValue = sectionGlosas.reduce((acc, curr) => acc + curr.valor_glosa, 0);
    const totalAceptadoValue = sectionIngresos.reduce((acc, curr) => acc + curr.valor_aceptado, 0);
    const totalNoAceptadoValue = sectionIngresos.reduce((acc, curr) => acc + curr.valor_no_aceptado, 0);
    const totalRegistradoInternoValue = sectionGlosas.filter(g => g.registrada_internamente).reduce((acc, curr) => acc + curr.valor_glosa, 0);

    const pendingValue = totalGlosadoValue - totalAceptadoValue - totalNoAceptadoValue;

    return {
      totalCount: sectionGlosas.length,
      totalGlosado: totalGlosadoValue,
      totalAceptado: totalAceptadoValue,
      totalPendiente: Math.max(0, pendingValue),
      totalRegistradoInterno: totalRegistradoInternoValue,
      percentAceptado: totalGlosadoValue > 0 ? Math.round((totalAceptadoValue / totalGlosadoValue) * 100) : 0,
      percentRegistrado: totalGlosadoValue > 0 ? Math.round((totalRegistradoInternoValue / totalGlosadoValue) * 100) : 0,

      // Legacy fields to support other UI parts
      totalValue: totalGlosadoValue,
      totalIngresos: totalAceptadoValue,
      pendingCount: sectionGlosas.filter(g => g.estado === 'Pendiente').length,
      respondedCount: sectionGlosas.filter(g => g.estado === 'Respondida').length,
      acceptedCount: sectionGlosas.filter(g => g.estado === 'Aceptada' || sectionIngresos.some(i => i.factura === g.factura)).length,
    };
  }, [glosas, ingresos, currentMainSection]);

  const handleAddGlosa = async (newGlosa: Glosa) => {
    // Optimista: Actualizar UI y Caché primero
    const updatedGlosas = [newGlosa, ...glosas];
    setGlosas(updatedGlosas);
    localStorage.setItem('cached_glosas', JSON.stringify(updatedGlosas));

    // Segundo plano: Sincronizar con Supabase
    const { error } = await supabase.from('glosas').insert([newGlosa]);
    if (error) {
      console.error('Error sincronizando nueva glosa:', error);
      // Opcional: Notificar error persistente o intentar colar después
    }
  };

  const handleUpdateStatus = async (id: string, newEstado: string) => {
    const updatedGlosas = glosas.map(g => g.id === id ? { ...g, estado: newEstado } : g);
    setGlosas(updatedGlosas);
    localStorage.setItem('cached_glosas', JSON.stringify(updatedGlosas));

    const { error } = await supabase.from('glosas').update({ estado: newEstado }).eq('id', id);
    if (error) console.error('Error actualizando estado:', error);
  };

  const handleUpdateGlosa = async (updatedGlosa: Glosa) => {
    const updatedGlosas = glosas.map(g => g.id === updatedGlosa.id ? updatedGlosa : g);
    setGlosas(updatedGlosas);
    localStorage.setItem('cached_glosas', JSON.stringify(updatedGlosas));

    const { error } = await supabase.from('glosas').update(updatedGlosa).eq('id', updatedGlosa.id);
    if (error) console.error('Error actualizando glosa:', error);
  };

  const handleDeleteGlosa = async (id: string) => {
    const updatedGlosas = glosas.filter(g => g.id !== id);
    setGlosas(updatedGlosas);
    localStorage.setItem('cached_glosas', JSON.stringify(updatedGlosas));

    const { error } = await supabase.from('glosas').delete().eq('id', id);
    if (error) console.error('Error eliminando glosa:', error);
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
    const updatedIngresos = [newIngreso, ...ingresos];
    setIngresos(updatedIngresos);
    localStorage.setItem('cached_ingresos', JSON.stringify(updatedIngresos));

    const { error } = await supabase.from('ingresos').insert([newIngreso]);
    if (error) console.error('Error sincronizando ingreso:', error);
  };

  const handleDeleteIngreso = async (id: string) => {
    const updatedIngresos = ingresos.filter(i => i.id !== id);
    setIngresos(updatedIngresos);
    localStorage.setItem('cached_ingresos', JSON.stringify(updatedIngresos));

    const { error } = await supabase.from('ingresos').delete().eq('id', id);
    if (error) console.error('Error eliminando ingreso:', error);
  };

  const consolidado = useMemo(() => {
    const parseDate = (d: string) => {
      if (!d || d === '---') return 0;
      // Handle "DD/MM/YYYY, HH:mm:ss" or "DD/MM/YYYY"
      const [datePart] = d.split(',');
      const parts = datePart.split('/');
      if (parts.length < 3) return new Date(d).getTime() || 0;
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    };

    const sectionGlosas = glosas.filter(g => (g as any).seccion === currentMainSection || (!(g as any).seccion && currentMainSection === 'GLOSAS'));
    const sectionIngresos = ingresos.filter(i => (i as any).seccion === currentMainSection || (!(i as any).seccion && currentMainSection === 'GLOSAS'));

    const facturas = new Set([...sectionGlosas.map(g => g.factura), ...sectionIngresos.map(i => i.factura)].filter(f => f && f.trim() !== ''));

    return Array.from(facturas).map(f => {
      const factGlosas = sectionGlosas.filter(g => g.factura === f);
      const factIngresos = sectionIngresos.filter(i => i.factura === f);

      const glosado = factGlosas.reduce((acc, g) => acc + g.valor_glosa, 0);
      const aceptado = factIngresos.reduce((acc, i) => acc + i.valor_aceptado, 0);
      const noAceptado = factIngresos.reduce((acc, i) => acc + i.valor_no_aceptado, 0);

      const fechasGlosas = factGlosas.map(g => parseDate(g.fecha));
      const fechasIngresos = factIngresos.map(i => parseDate(i.fecha));
      const todasLasFechas = [...fechasGlosas, ...fechasIngresos].filter(Boolean);

      const maxFechaTimestamp = todasLasFechas.length > 0 ? Math.max(...todasLasFechas) : 0;
      const fechaActividad = maxFechaTimestamp > 0 ? new Date(maxFechaTimestamp).toLocaleDateString('es-ES') : '---';

      return {
        factura: f,
        glosado,
        aceptado,
        noAceptado,
        fecha: fechaActividad,
        timestamp: maxFechaTimestamp,
        diferencia: glosado - aceptado - noAceptado
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [glosas, ingresos, currentMainSection]);

  const filteredConsolidado = useMemo(() => {
    return (consolidado || []).filter(item =>
      item.factura.toLowerCase().includes(searchTermConsolidado.toLowerCase())
    );
  }, [consolidado, searchTermConsolidado]);

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

      showToast('✅ ¡CONEXIÓN TOTAL EXITOSA! Todo funciona correctamente.', 'success');
    } catch (err: any) {
      console.error('Test Connection Error:', err);
      showToast('❌ ERROR DE CONEXIÓN: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLocalCheckpoints = async () => {
    try {
      setLoading(true);
      const localGlosas = JSON.parse(localStorage.getItem('cached_glosas') || '[]');
      const markedLocally = localGlosas.filter((lg: any) => lg.registrada_internamente);

      if (markedLocally.length === 0) {
        alert('ℹ️ No se detectaron marcas locales pendientes de sincronizar.');
        return;
      }

      if (!confirm(`Se encontraron ${markedLocally.length} glosas marcadas localmente. ¿Deseas subirlas a la nube para que sean permanentes?`)) return;

      let synced = 0;
      for (const g of markedLocally) {
        const { error } = await supabase.from('glosas').update({ registrada_internamente: true }).eq('id', g.id);
        if (!error) synced++;
      }

      showToast(`✅ Sincronización completa: ${synced} marcas subidas.`, 'success');
      loadData(true);
    } catch (err: any) {
      console.error('Error en sincronización:', err);
      showToast('❌ Error al sincronizar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeepRecovery = () => {
    try {
      let foundMarks = 0;
      const recoveredGlosas = [...glosas];

      // ESCANEO TOTAL: Revisamos absolutamente todas las llaves en el navegador
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const raw = localStorage.getItem(key);
          if (!raw || !raw.includes('registrada_internamente')) continue;

          const data = JSON.parse(raw);
          const dataArray = Array.isArray(data) ? data : [data];

          dataArray.forEach((g: any) => {
            if (g && g.registrada_internamente) {
              // Intentar encontrar la glosa por ID, o por coincidencia de Factura + Valor + Servicio
              const target = recoveredGlosas.find(rg =>
                rg.id === g.id ||
                (rg.factura === g.factura && rg.valor_glosa === g.valor_glosa && rg.servicio === g.servicio)
              );

              if (target && !target.registrada_internamente) {
                target.registrada_internamente = true;
                foundMarks++;
              }
            }
          });
        } catch (e) {
          // Ignorar errores de llaves que no sean JSON
        }
      }

      if (foundMarks > 0) {
        setGlosas([...recoveredGlosas]);
        localStorage.setItem('cached_glosas', JSON.stringify(recoveredGlosas));
        showToast(`🎉 ¡ÉXITO! Se han recuperado ${foundMarks} marcas.`, 'success');
      } else {
        showToast('❌ No se encontró rastro de marcas en este navegador.', 'info');
      }
    } catch (e: any) {
      showToast('Error en recuperación: ' + e.message, 'error');
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
          showToast('✅ ¡Importación exitosa!', 'success');
        } else {
          showToast('❌ Error al subir: ' + error.message, 'error');
        }
        setLoading(false);
      } else {
        showToast('El formato JSON no es válido.', 'error');
      }
    } catch (e: any) {
      showToast('Error al leer el JSON: ' + e.message, 'error');
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
            fecha: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            descripcion: '',
            seccion: currentMainSection
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

        if (data.length === 0) throw new Error('No se encontraron registros válidos por factura.');

        const { error } = await supabase.from('glosas').upsert(data);
        if (error) throw error;

        setGlosas(prev => [...data, ...prev]);
        showToast(`✅ CSV Importado: ${data.length} registros subidos.`, 'success');
      } catch (err: any) {
        console.error('CSV Error:', err);
        showToast('❌ Error leyendo CSV: ' + err.message, 'error');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const exportToExcel = () => {
    const dataToExport = consolidado;
    if (dataToExport.length === 0) return;
    const headers = ['Factura', 'Última Actividad', 'Valor Glosado', 'Valor Aceptado', 'Valor No Aceptado', 'Diferencia'];
    const rows = dataToExport.map(item => [
      item.factura,
      item.fecha,
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
    const headers = ['Factura', 'Servicio', 'Orden Servicio', 'Valor Glosa', 'Tipo Glosa', 'Estado', 'Fecha', 'Registro Interno', 'Descripcion'];
    const rows = dataToExport.map(g => [
      g.factura, g.servicio, g.orden_servicio,
      g.valor_glosa.toFixed(2).replace('.', ','),
      g.tipo_glosa, g.estado, g.fecha,
      g.registrada_internamente ? 'SÍ' : 'NO',
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

      {/* Sidebar - Rediseñado como Navegación */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        style={{
          width: '280px',
          borderRight: '1px solid var(--border)',
          padding: '2rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          height: '100vh',
          background: 'rgba(6, 4, 13, 0.98)',
          backdropFilter: 'blur(40px)',
          zIndex: 100
        }}
      >
        <div style={{ padding: '0 1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px' }}>
              <Activity size={20} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', letterSpacing: '0.05em' }}>NAVEGACIÓN V2</h2>
          </div>


          {/* Selector de Sección Principal (Visible para Admins) */}
          {role === 'admin' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '1rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>SECCIÓN ACTIVA</p>
              <select
                value={currentMainSection}
                onChange={(e) => {
                  setCurrentMainSection(e.target.value as any);
                  setSearchTerm(''); // Limpiar búsquedas al cambiar sección
                }}
                style={{
                  width: '100%',
                  background: 'rgba(6, 4, 13, 0.5)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '10px',
                  padding: '0.6rem',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="GLOSAS">GLOSAS</option>
                <option value="RATIFICADAS">GLOSAS RATIFICADAS</option>
                <option value="MEDICAMENTOS">MEDICAMENTOS</option>
              </select>
            </div>
          ) : (
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent)',
              borderRadius: '16px',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em' }}>MODALIDAD</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white', marginTop: '0.2rem' }}>{currentMainSection}</p>
            </div>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'dashboard', label: '1. TABLERO MASTER', icon: LayoutDashboard },
            { id: 'ingreso', label: '2. REGISTRO GLOSAS', icon: PieChart },
            { id: 'consolidado', label: '3. CONSOLIDADO POR FACTURA', icon: ListChecks },
            { id: 'valores', label: '4. GESTIÓN DE PAGOS', icon: Wallet },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 5, background: 'rgba(255,255,255,0.03)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.15), transparent)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activePill"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: '4px',
                      background: 'var(--primary)',
                      borderRadius: '0 4px 4px 0',
                      boxShadow: '0 0 10px var(--primary)'
                    }}
                  />
                )}
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'inherit' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: isActive ? 800 : 600, letterSpacing: '0.05em' }}>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Mini Stats persistentes en Sidebar (Opcional) */}
        <div style={{ marginTop: 'auto', padding: '1rem' }}>
          <div className="card" style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>TOTAL AUDITADO</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>${formatPesos(stats.totalValue)}</p>
          </div>
        </div>
      </motion.aside>

      <main className="container" style={{ flex: 1, margin: 0, maxWidth: 'none', overflowY: 'auto', padding: '1.5rem 2.5rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}>
              <svg width="200" height="60" viewBox="0 0 280 85" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#4361ee" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="icon-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* Icono de precisión / Iris Estilizado */}
                <g transform="translate(0, 5)">
                  <circle cx="35" cy="35" r="32" stroke="url(#logo-grad)" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.3" />
                  <circle cx="35" cy="35" r="25" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.6" />
                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    d="M35 15C46.0457 15 55 23.9543 55 35C55 46.0457 46.0457 55 35 55C23.9543 55 15 46.0457 15 35"
                    stroke="url(#icon-grad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />
                  <circle cx="35" cy="35" r="8" fill="url(#logo-grad)" filter="url(#glow)" />
                </g>

                {/* Texto COI */}
                <text x="85" y="55" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fontSize="58" fill="white" letterSpacing="-4">
                  COI
                </text>

                {/* Subtexto */}
                <text x="87" y="78" fontFamily="Inter, sans-serif" fontSize="9.5" fill="rgba(255,255,255,0.4)" fontWeight="700" letterSpacing="1.5">
                  CLÍNICA OFTALMOLÓGICA INTERNACIONAL
                </text>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ fontSize: '1.8rem', color: '#ffffff', fontWeight: 900, lineHeight: 1.1, margin: 0 }}>Glosas (V2)</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.05em', fontWeight: 600, margin: 0, marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={14} color="rgba(255,255,255,0.3)" />
                  Control de Facturación e Ingresos
                </p>
                {supabaseError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      background: supabaseError.includes('Reintentando') ? 'rgba(139, 92, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${supabaseError.includes('Reintentando') ? 'rgba(139, 92, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                      color: supabaseError.includes('Reintentando') ? '#8b5cf6' : '#ef4444',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginTop: '0.82rem'
                    }}
                  >
                    {supabaseError.includes('Reintentando') ? '🔄 ' : '⚠️ '} {supabaseError.includes('Reintentando') ? supabaseError : `ERROR BD: ${supabaseError}`}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'right', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem', marginBottom: '0.1rem' }}>
                {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              {lastUpdate && (
                <p style={{ fontSize: '0.7rem', color: 'rgba(139, 92, 246, 0.7)', fontWeight: 600 }}>
                  Actualizado: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => loadData(true)}
              title="Sincronizar"
              style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#8b5cf6', cursor: 'pointer', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RefreshCw size={18} />
            </motion.button>
          </motion.div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                margin: 0
              }}>
                SECCIÓN: {currentMainSection}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={signOut}
              title="Cerrar sesión"
              style={{
                background: '#ef4444',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
                color: 'white',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <LogOut size={18} />
            </motion.button>
          </div>
        </header>

        {/* Info Box / Footer del Header (Opcional) */}
        <div style={{ marginBottom: '2rem', marginTop: '-0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <p style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 600,
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <ClipboardList size={12} />
            SISTEMA DE AUDITORÍA MÉDICA V2.1
          </p>
          <p style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}>
            Diseño y Desarrollo por Isaac Contreras
          </p>
        </div>

        {
          ((!loading && !authLoading) || forcedEntry) && user && (
            <AnimatePresence mode="wait">
              {activeSection === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Dashboard
                    glosas={currentSectionGlosas}
                    totalIngresos={stats.totalIngresos}
                    stats={stats}
                  />
                </motion.div>
              )}

              {activeSection === 'ingreso' && (
                <motion.div
                  key="ingreso"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ maxWidth: '1000px', margin: '0 auto' }}
                >
                  <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>Registrar Nueva Glosa</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Complete el siguiente formulario para ingresar una nueva glosa al sistema.</p>
                  </div>
                  <GlosaForm
                    onAddGlosa={handleAddGlosa}
                    existingGlosas={glosas}
                    currentSeccion={currentMainSection}
                    isAdmin={role === 'admin'}
                  />
                </motion.div>
              )}

              {activeSection === 'consolidado' && (
                <motion.div
                  key="consolidado"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>Resumen de Auditoría por Factura</h2>
                      <p style={{ color: 'var(--text-secondary)', maxWidth: '800px' }}>
                        Este panel agrupa todas las reclamaciones por factura para visualizar el balance final.
                        Permite comparar el <strong>monto total glosado</strong> frente a los <strong>pagos aceptados</strong>,
                        identificando la diferencia pendiente de conciliar.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid var(--border)', gap: '1rem' }}>
                    <div style={{ flex: '1', maxWidth: '400px' }}>
                      <div style={{ position: 'relative' }}>
                        <ClipboardList size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                          type="text"
                          placeholder="Buscar factura en consolidado..."
                          value={searchTermConsolidado}
                          onChange={(e) => setSearchTermConsolidado(e.target.value)}
                          style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '0.75rem 1rem 0.75rem 2.8rem',
                            color: 'white',
                            fontSize: '0.85rem',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <motion.button whileHover={{ scale: 1.05 }} onClick={exportToExcel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(139,92,246,0.1)', color: 'var(--primary)', height: '42px' }}>
                        <Download size={16} /> CONSOLIDADO CSV
                      </motion.button>
                    </div>
                  </div>

                  <ConsolidadoTable data={filteredConsolidado} />

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Listado Detallado</h3>
                    </div>
                    <GlosaTable
                      glosas={filteredGlosas}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdateGlosa={handleUpdateGlosa}
                      onDeleteGlosa={handleDeleteGlosa}
                      onDeleteDuplicates={handleDeleteDuplicates}
                      onToggleInternalRegistry={handleToggleInternalRegistry}
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      filterTipo={filterTipo}
                      setFilterTipo={setFilterTipo}
                      filterEstado={filterEstado}
                      setFilterEstado={setFilterEstado}
                      filterInterno={filterInterno}
                      setFilterInterno={setFilterInterno}
                      isAdmin={role === 'admin'}
                    />
                  </div>
                </motion.div>
              )}

              {activeSection === 'valores' && (
                <motion.div
                  key="valores"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>Gestión de Valores</h2>
                      <p style={{ color: 'var(--text-secondary)' }}>Registre los pagos aceptados y no aceptados para conciliar facturas.</p>
                    </div>
                    <IngresoForm
                      onAddIngreso={handleAddIngreso}
                      isAdmin={role === 'admin'}
                      currentSeccion={currentMainSection}
                    />
                  </div>
                  <div>
                    <IngresoList
                      ingresos={filteredIngresos}
                      onDelete={handleDeleteIngreso}
                      isAdmin={role === 'admin'}
                      searchTerm={searchTermIngresos}
                      setSearchTerm={setSearchTermIngresos}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )
        }

        <footer style={{ marginTop: '8rem', padding: '6rem 0', borderTop: '2px solid var(--border)', textAlign: 'center' }}>
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
              <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '1.25rem', border: '1px solid var(--border)' }}>
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
                    RECUPERACIÓN LOCAL
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05, opacity: 1 }}
                    onClick={testConnection}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}
                  >
                    <Activity size={12} />
                    VERIFICAR CONEXIÓN NUBE
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05, opacity: 1 }}
                    onClick={handleSyncLocalCheckpoints}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}
                  >
                    <RefreshCw size={12} />
                    SINCRONIZAR MARCAS LOCALES
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05, opacity: 1 }}
                    onClick={handleDeepRecovery}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}
                  >
                    <Activity size={12} />
                    ESCANEO DE SEGURIDAD
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
            <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>
              DEBUG: ID={user?.id} | ROL={role} | EMAIL={user?.email}
            </div>
          </div>
        </footer>
      </main >
    </div >
  );
}

const IngresoForm = ({ onAddIngreso, isAdmin, currentSeccion }: { onAddIngreso: (ingreso: Ingreso) => void, isAdmin: boolean, currentSeccion: string }) => {
  const [formData, setFormData] = useState({ factura: '', valor_aceptado: '', valor_no_aceptado: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !formData.factura) return;
    onAddIngreso({
      id: Math.random().toString(36).substr(2, 9),
      factura: formData.factura,
      valor_aceptado: parseFloat(formData.valor_aceptado) || 0,
      valor_no_aceptado: parseFloat(formData.valor_no_aceptado) || 0,
      fecha: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      seccion: currentSeccion
    });
    setFormData({ factura: '', valor_aceptado: '', valor_no_aceptado: '' });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), transparent)', boxShadow: '0 10px 40px rgba(16, 185, 129, 0.1)' }}>
      <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '1.2rem', color: '#10b981', fontWeight: 900 }}>
        <TrendingUp size={22} />
        GESTIÓN DE VALORES ACEPTADOS
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          padding: '1.5rem',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          marginBottom: '1rem'
        }}>
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

const IngresoList = ({
  ingresos,
  onDelete,
  isAdmin,
  searchTerm,
  setSearchTerm
}: {
  ingresos: Ingreso[],
  onDelete: (id: string) => void,
  isAdmin: boolean,
  searchTerm: string,
  setSearchTerm: (val: string) => void
}) => {
  const totalAceptado = ingresos.reduce((acc, i) => acc + i.valor_aceptado, 0);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800 }}>
          <ListChecks size={22} />
          Historial ({ingresos.length})
        </h3>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Aceptado</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 950, color: '#ef4444' }}>${formatPesos(totalAceptado)}</p>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <ClipboardList size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
        <input
          type="text"
          placeholder="Buscar factura en pagos..."
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

      <div style={{ flex: 1, maxHeight: '600px', overflowY: 'auto', paddingRight: '0.75rem', minHeight: '300px' }} className="custom-scrollbar">
        <AnimatePresence>
          {ingresos.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', fontSize: '0.9rem' }}>
              Sin movimientos registrados
            </motion.p>
          ) : (
            ingresos.map((i, idx) => (
              <motion.div key={i.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }} style={{
                background: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                marginBottom: '1rem',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: index % 2 === 0 ? '0 4px 20px rgba(0,0,0,0.1)' : 'none'
              }}>
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
const ConsolidadoTable = ({ data }: { data: any[] }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 10px 40px rgba(139, 92, 246, 0.1)' }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '1.2rem', color: '#8b5cf6', fontWeight: 900 }}>
        <ListChecks size={22} />
        CONSOLIDADO POR FACTURA ({data.length})
      </h3>
      <div style={{ maxHeight: '600px', overflowY: 'auto' }} className="custom-scrollbar">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Factura</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Última Actividad</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Glosado</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Aceptado</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} style={{
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
              }}>
                <td style={{ padding: '1rem 0.75rem', fontWeight: 800, color: 'white' }}>{item.factura}</td>
                <td style={{ padding: '1rem 0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{item.fecha}</td>
                <td style={{ padding: '1rem 0.75rem', fontWeight: 700 }}>${formatPesos(item.glosado)}</td>
                <td style={{ padding: '1rem 0.75rem', color: '#ef4444', fontWeight: 700 }}>${formatPesos(item.aceptado)}</td>
                <td style={{ padding: '1rem 0.75rem', textAlign: 'right', color: item.diferencia > 0 ? '#10b981' : 'rgba(255,255,255,0.5)', fontWeight: 950, fontSize: '1rem' }}>
                  ${formatPesos(item.diferencia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default function HomeWithBoundary() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Home />
      </ToastProvider>
    </ErrorBoundary>
  );
}
