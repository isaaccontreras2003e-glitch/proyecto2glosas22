'use client';
// HARDENING v10.0 - Protección completa contra errores comunes y agresivos

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { GlosaForm } from '@/components/GlosaForm';
import { GlosaTable } from '@/components/GlosaTable';
import { supabase } from '@/lib/supabase';
import { safeNumber, safeArray, safeStorage } from '@/lib/safeUtils';
import { LayoutDashboard, TrendingUp, Wallet, Activity, Trash2, Download, ListChecks, PieChart, ChevronUp, RefreshCw, ClipboardList, LogOut, FileText, CheckCircle, Clock, Cloud, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider, useToast } from '@/lib/contexts/ToastContext';

const formatPesos = (value: any): string => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface Glosa {
  id: string;
  factura: string;
  servicio: string;
  orden_servicio: string;
  valor_glosa: number;
  valor_aceptado: number;
  valor_no_aceptado?: number;
  descripcion: string;
  tipo_glosa: string;
  estado: string;
  fecha: string;
  registrada_internamente?: boolean;
  seccion?: string;
  sincronizado?: boolean;
}

interface Ingreso {
  id: string;
  factura: string;
  valor_aceptado: number;
  valor_no_aceptado: number;
  fecha: string;
  seccion?: string;
  sincronizado?: boolean;
}

function Home() {
  const [activeSection, setActiveSection] = useState<'dashboard' | 'ingreso' | 'consolidado' | 'valores'>('dashboard');
  const [currentMainSection, setCurrentMainSection] = useState<'GLOSAS' | 'MEDICAMENTOS'>('GLOSAS');
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
      const safeSection = (seccion_asignada === 'RATIFICADAS' ? 'GLOSAS' : seccion_asignada) as any;
      setCurrentMainSection(safeSection);
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

        if (gRes && Array.isArray(gRes.data)) {
          // MEJORADO: Merge inteligente que no destruye el estado local optimista
          setGlosas(prev => {
            const emergencyBuffer = safeStorage.getJson<Glosa[]>('emergency_buffer', []);
            const cloudIds = new Set(safeArray(gRes.data).map((c: any) => c.id));
            const localOnly = safeArray(prev).filter(p => !cloudIds.has(p.id));

            // USANDO MAP PARA EVITAR DUPLICADOS DE IDS
            const glosaMap = new Map();

            // 1. Prioridad: Datos de la Nube
            safeArray(gRes.data).forEach((c: any) => {
              if (c && c.id) glosaMap.set(c.id, { ...c, sincronizado: true });
            });

            // 2. Complemento: Local y Buffer
            [...localOnly, ...emergencyBuffer].forEach(item => {
              if (item && item.id && !glosaMap.has(item.id)) {
                glosaMap.set(item.id, { ...item, sincronizado: false });
              }
            });

            const sorted = Array.from(glosaMap.values()).sort((a: any, b: any) => {
              const dateA = (a.fecha || '').split(',')[0].trim().split('/').reverse().join('') || '0';
              const dateB = (b.fecha || '').split(',')[0].trim().split('/').reverse().join('') || '0';
              return dateB.localeCompare(dateA);
            });

            safeStorage.setJson('cached_glosas', sorted);
            return sorted;
          });
          lastFetchedUserId.current = user.id;
        }

        if (iRes && Array.isArray(iRes.data)) {
          setIngresos(prev => {
            const cloudIds = new Set(safeArray(iRes.data).map((c: any) => c.id));
            const localOnly = safeArray(prev).filter(p => !cloudIds.has(p.id));

            const ingresoMap = new Map();
            safeArray(iRes.data).forEach((c: any) => {
              if (c && c.id) ingresoMap.set(c.id, { ...c, sincronizado: true });
            });
            localOnly.forEach(l => {
              if (l && l.id && !ingresoMap.has(l.id)) {
                ingresoMap.set(l.id, { ...l, sincronizado: false });
              }
            });

            const combined = Array.from(ingresoMap.values()).sort((a: any, b: any) => {
              const dateA = (a.fecha || '').split(',')[0].trim().split('/').reverse().join('') || '0';
              const dateB = (b.fecha || '').split(',')[0].trim().split('/').reverse().join('') || '0';
              return dateB.localeCompare(dateA);
            });
            safeStorage.setJson('cached_ingresos', combined);
            return combined;
          });
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

  // Cargar datos desde caché local (INSTANTÁNEO) — con safeStorage para modo privado
  useEffect(() => {
    const g = safeStorage.getJson<Glosa[]>('cached_glosas', []);
    const i = safeStorage.getJson<Ingreso[]>('cached_ingresos', []);
    if (g.length > 0) setGlosas(g);
    if (i.length > 0) setIngresos(i);
    if (g.length > 0 || i.length > 0) {
      setLoading(false);
      setLastUpdate(new Date());
    }
  }, []);

  // Cargar datos desde Supabase al montar o cambiar usuario
  useEffect(() => {
    setIsMounted(true);
    if (user) {
      loadData();
    }
  }, [user?.id, loadData]);

  // Migración de datos desde localStorage a Supabase (SUPER ESCANEO V5.1 - Sensible a Contexto)
  const migrateData = useCallback(async (force = false) => {
    try {
      const isMigrated = localStorage.getItem('migrated_to_supabase_v5_final_context');
      if (isMigrated === 'true' && !force) return;

      console.log(`--- INICIANDO ${force ? 'RESCATE PROFUNDO' : 'SUPER ESCANEO'} V8.7 ---`);
      let recoveredGlosas: any[] = [];
      let recoveredIngresos: any[] = [];
      const seenIds = new Set(glosas.map(g => g.id)); // No duplicar lo que ya está en RAM

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const val = localStorage.getItem(key);
          if (!val || (!val.includes('[') && !val.includes('{'))) continue;

          const parsed = JSON.parse(val);
          const items = Array.isArray(parsed) ? parsed : [parsed];

          // Inteligencia de sección mejorada
          let inferredSection = currentMainSection || 'GLOSAS';
          const kLower = key.toLowerCase();
          if (kLower.includes('medic')) inferredSection = 'MEDICAMENTOS';

          for (const item of items) {
            if (!item || typeof item !== 'object') continue;

            const itemSection = (item.seccion?.toUpperCase() || inferredSection.toUpperCase());

            if (item.factura && (item.valor_glosa !== undefined || item.servicio !== undefined)) {
              const id = item.id || `rec_${item.factura}_${item.valor_glosa}_${Date.now()}`;
              if (!seenIds.has(id)) {
                recoveredGlosas.push({ ...item, id: id.toString(), seccion: itemSection });
                seenIds.add(id);
              }
            }
            else if (item.factura && (item.valor_aceptado !== undefined || item.valor_no_aceptado !== undefined)) {
              const id = item.id || `rec_ing_${item.factura}_${item.valor_aceptado}_${Date.now()}`;
              if (!seenIds.has(id)) {
                recoveredIngresos.push({ ...item, id: id.toString(), seccion: itemSection });
                seenIds.add(id);
              }
            }
          }
        } catch (e) { }
      }

      if (recoveredGlosas.length > 0 || recoveredIngresos.length > 0) {
        if (recoveredGlosas.length > 0) await supabase.from('glosas').upsert(recoveredGlosas);
        if (recoveredIngresos.length > 0) await supabase.from('ingresos').upsert(recoveredIngresos);
        showToast(`¡Rescate exitoso! ${recoveredGlosas.length} registros recuperados.`, 'success');
        loadData(true);
      } else if (force) {
        showToast('No se encontraron más registros para recuperar.', 'info');
      }

      localStorage.setItem('migrated_to_supabase_v5_final_context', 'true');
    } catch (err: any) {
      console.error('Error durante la recuperación:', err);
    } finally {
      setLoading(false);
    }
  }, [glosas, currentMainSection, loadData, showToast]);

  useEffect(() => {
    if (isMounted) migrateData();
  }, [isMounted, migrateData]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterInterno, setFilterInterno] = useState('Todos');
  const [searchTermIngresos, setSearchTermIngresos] = useState('');
  const [searchTermConsolidado, setSearchTermConsolidado] = useState('');

  const filteredGlosas = useMemo(() => {
    const currentUpper = currentMainSection.toUpperCase();
    return glosas.filter(g => {
      // Normalización nuclear para la tabla
      const gSection = (g as any).seccion?.toUpperCase() || 'GLOSAS';
      const matchesSection = gSection === currentUpper;

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
    const currentUpper = currentMainSection.toUpperCase();
    return ingresos.filter(i => {
      const iSection = (i as any).seccion?.toUpperCase() || 'GLOSAS';
      const matchesSection = iSection === currentUpper;
      return matchesSection && i.factura.toLowerCase().includes(searchTermIngresos.toLowerCase());
    });
  }, [ingresos, currentMainSection, searchTermIngresos]);

  const currentSectionGlosas = useMemo(() => {
    const currentUpper = currentMainSection.toUpperCase();
    return glosas.filter(g => {
      const gSection = (g as any).seccion?.toUpperCase() || 'GLOSAS';
      return gSection === currentUpper;
    });
  }, [glosas, currentMainSection]);

  const stats = useMemo(() => {
    try {
      const currentUpper = currentMainSection.toUpperCase();
      const sectionGlosas = safeArray(glosas).filter(g => ((g as any).seccion?.toUpperCase() || 'GLOSAS') === currentUpper);
      const sectionIngresos = safeArray(ingresos).filter(i => ((i as any).seccion?.toUpperCase() || 'GLOSAS') === currentUpper);

      // ESTRATEGIA: Agrupamos por factura para reconciliación total
      const facturasSet = new Set([...sectionGlosas.map(g => g.factura), ...sectionIngresos.map(i => i.factura)]);

      let totalGlosadoValue = 0;
      let totalAceptadoValue = 0;
      let totalNoAceptadoValue = 0;

      facturasSet.forEach(f => {
        const factGlosas = sectionGlosas.filter(g => g.factura === f);
        const factIngresos = sectionIngresos.filter(i => i.factura === f);

        // Totales base
        const sumGlosasValor = factGlosas.reduce((acc, g) => acc + safeNumber(g.valor_glosa), 0);

        // Valor aceptado & No aceptado: PRIORIDAD ESTRICTA
        const sumIngresosAceptado = factIngresos.reduce((acc, i) => acc + safeNumber(i.valor_aceptado), 0);
        const sumIngresosNoAceptado = factIngresos.reduce((acc, i) => acc + safeNumber(i.valor_no_aceptado), 0);

        const sumGlosasAceptado = factGlosas.reduce((acc, g) => acc + safeNumber(g.valor_aceptado), 0);
        const sumGlosasNoAceptado = factGlosas.reduce((acc, g) => {
          if (g.valor_no_aceptado !== undefined && g.valor_no_aceptado !== null) return acc + safeNumber(g.valor_no_aceptado);
          if (g.estado !== 'Pendiente') return acc + (safeNumber(g.valor_glosa) - safeNumber(g.valor_aceptado));
          return acc;
        }, 0);

        // REGLA DE NEGOCIO: Si existe AL MENOS UN registro de ingreso (pago), 
        // usamos los valores de ingresos, incluso si son cero.
        const hasIngresos = factIngresos.length > 0;
        const currentAceptado = hasIngresos ? sumIngresosAceptado : sumGlosasAceptado;
        const currentNoAceptado = hasIngresos ? sumIngresosNoAceptado : sumGlosasNoAceptado;

        // RECONCILIACIÓN DE GLOSA: El importe glosado debe ser al menos la suma de las respuestas
        // Esto evita que Respondido > Glosado si hay pagos sin glosas registradas.
        const respondedTotal = currentAceptado + currentNoAceptado;
        totalGlosadoValue += Math.max(sumGlosasValor, respondedTotal);
        totalAceptadoValue += currentAceptado;
        totalNoAceptadoValue += currentNoAceptado;
      });

      const totalRegistradoInternoValue = sectionGlosas
        .filter(g => g.registrada_internamente)
        .reduce((acc, curr) => acc + safeNumber(curr.valor_glosa), 0);

      const pendingValue = totalGlosadoValue - totalAceptadoValue - totalNoAceptadoValue;

      return {
        totalCount: sectionGlosas.length,
        totalGlosado: totalGlosadoValue,
        totalAceptado: totalAceptadoValue,
        totalPendiente: Math.max(0, pendingValue),
        totalRegistradoInterno: totalRegistradoInternoValue,
        totalNoAceptado: totalNoAceptadoValue,
        percentAceptado: totalGlosadoValue > 0 ? Math.round((totalAceptadoValue / totalGlosadoValue) * 100) : 0,
        percentRegistrado: totalGlosadoValue > 0 ? Math.round((totalRegistradoInternoValue / totalGlosadoValue) * 100) : 0,
        totalValue: totalGlosadoValue,
        totalIngresos: totalAceptadoValue,
        pendingCount: sectionGlosas.filter(g => g.estado === 'Pendiente').length,
        respondedCount: sectionGlosas.filter(g => g.estado === 'Respondida').length,
        acceptedCount: sectionGlosas.filter(g => g.estado === 'Aceptada' || sectionIngresos.some(i => i.factura === g.factura)).length,
      };
    } catch (err) {
      console.error('[stats] Error calculando estadísticas:', err);
      return { totalCount: 0, totalGlosado: 0, totalAceptado: 0, totalPendiente: 0, totalRegistradoInterno: 0, totalNoAceptado: 0, percentAceptado: 0, percentRegistrado: 0, totalValue: 0, totalIngresos: 0, pendingCount: 0, respondedCount: 0, acceptedCount: 0 };
    }
  }, [glosas, ingresos, currentMainSection]);

  const handleAddGlosa = async (newGlosa: Glosa) => {
    // Escudo de Persistencia: Guardar en un buffer aparte para emergencias
    const backupBuffer = safeStorage.getJson<Glosa[]>('emergency_buffer', []);
    safeStorage.setJson('emergency_buffer', [newGlosa, ...backupBuffer]);

    // Optimista con estado Local
    const glosaConEstado: Glosa = { ...newGlosa, sincronizado: false };
    setGlosas(prev => {
      const updated = [glosaConEstado, ...safeArray(prev)];
      safeStorage.setJson('cached_glosas', updated);
      return updated;
    });

    // Sincronizar con Supabase
    try {
      const { error } = await supabase.from('glosas').insert([newGlosa]);
      if (error) {
        console.error('Error sincronizando nueva glosa:', error);
        showToast('Guardado localmente. Se subirá automáticamente al recuperar conexión.', 'info');
      } else {
        setGlosas(prev => safeArray(prev).map(g => g.id === newGlosa.id ? { ...g, sincronizado: true } : g));
        const currentBuffer = safeStorage.getJson<Glosa[]>('emergency_buffer', []);
        safeStorage.setJson('emergency_buffer', currentBuffer.filter((g: any) => g.id !== newGlosa.id));
      }
    } catch (err: any) {
      console.error('Error crítico al insertar glosa:', err);
      showToast('Error de conexión. Datos guardados localmente.', 'info');
    }
  };

  const handleUpdateStatus = async (id: string, newEstado: string) => {
    setGlosas(prev => {
      const updated = safeArray(prev).map(g => g.id === id ? { ...g, estado: newEstado } : g);
      safeStorage.setJson('cached_glosas', updated);
      return updated;
    });
    try {
      const { error } = await supabase.from('glosas').update({ estado: newEstado }).eq('id', id);
      if (error) console.error('Error actualizando estado:', error);
    } catch (err) { console.error('Error crítico actualizando estado:', err); }
  };

  const handleUpdateGlosa = async (updatedGlosa: Glosa) => {
    setGlosas(prev => {
      const updated = safeArray(prev).map(g => g.id === updatedGlosa.id ? updatedGlosa : g);
      safeStorage.setJson('cached_glosas', updated);
      return updated;
    });
    try {
      const { error } = await supabase.from('glosas').update(updatedGlosa).eq('id', updatedGlosa.id);
      if (error) console.error('Error actualizando glosa:', error);
    } catch (err) { console.error('Error crítico actualizando glosa:', err); }
  };

  const handleDeleteGlosa = async (id: string) => {
    setGlosas(prev => {
      const updated = safeArray(prev).filter(g => g.id !== id);
      safeStorage.setJson('cached_glosas', updated);
      return updated;
    });
    try {
      const { error } = await supabase.from('glosas').delete().eq('id', id);
      if (error) console.error('Error eliminando glosa:', error);
    } catch (err) { console.error('Error crítico eliminando glosa:', err); }
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
    // Escudo de Persistencia: Guardar en un buffer aparte para emergencias
    const backupBuffer = safeStorage.getJson<Ingreso[]>('emergency_buffer_ingresos', []);
    safeStorage.setJson('emergency_buffer_ingresos', [newIngreso, ...backupBuffer]);

    const ingresoConEstado = { ...newIngreso, sincronizado: false };
    setIngresos(prev => {
      const updated = [ingresoConEstado, ...safeArray(prev)];
      safeStorage.setJson('cached_ingresos', updated);
      return updated;
    });
    try {
      const { error } = await supabase.from('ingresos').insert([newIngreso]);
      if (error) {
        console.error('Error sincronizando ingreso:', error);
        showToast('Guardado localmente. Se subirá de fondo.', 'info');
      } else {
        setIngresos(prev => safeArray(prev).map(i => i.id === newIngreso.id ? { ...i, sincronizado: true } : i));
        // Limpiar del buffer de emergencia si tuvo éxito
        const currentBuffer = safeStorage.getJson<Ingreso[]>('emergency_buffer_ingresos', []);
        safeStorage.setJson('emergency_buffer_ingresos', currentBuffer.filter((i: any) => i.id !== newIngreso.id));
      }
    } catch (err: any) {
      console.error('Error crítico al insertar ingreso:', err);
      showToast('Error de conexión. Datos guardados localmente.', 'info');
    }
  };

  const handleDeleteIngreso = async (id: string) => {
    const updatedIngresos = safeArray(ingresos).filter(i => i.id !== id);
    setIngresos(updatedIngresos);
    safeStorage.setJson('cached_ingresos', updatedIngresos);
    try {
      const { error } = await supabase.from('ingresos').delete().eq('id', id);
      if (error) console.error('Error eliminando ingreso:', error);
    } catch (err) { console.error('Error crítico eliminando ingreso:', err); }
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

      const sumGlosasValor = factGlosas.reduce((acc, g) => acc + g.valor_glosa, 0);

      // Sumar aceptados & no aceptados de AMBOS con lógica de PRIORIDAD ESTRICTA para evitar duplicidad
      const factTotalAceptadoIngresos = factIngresos.reduce((acc, i) => acc + (i.valor_aceptado || 0), 0);
      const factTotalNoAceptadoIngresos = factIngresos.reduce((acc, i) => acc + (i.valor_no_aceptado || 0), 0);

      const factTotalAceptadoGlosas = factGlosas.reduce((acc, g) => acc + (g.valor_aceptado || 0), 0);
      const factTotalNoAceptadoGlosas = factGlosas.reduce((acc, g) => {
        if (g.valor_no_aceptado !== undefined && g.valor_no_aceptado !== null) return acc + g.valor_no_aceptado;
        if (g.estado !== 'Pendiente') return acc + (g.valor_glosa - (g.valor_aceptado || 0));
        return acc;
      }, 0);

      const hasIngresos = factIngresos.length > 0;
      let aceptado = hasIngresos ? factTotalAceptadoIngresos : factTotalAceptadoGlosas;
      let noAceptado = hasIngresos ? factTotalNoAceptadoIngresos : factTotalNoAceptadoGlosas;

      // RECONCILIACIÓN: El importe glosado es el máximo entre el registro de glosa y la suma de respuestas
      const glosado = Math.max(sumGlosasValor, aceptado + noAceptado);

      const servicios = Array.from(new Set(factGlosas.map(g => g.servicio).filter(Boolean)));
      const tipos = Array.from(new Set(factGlosas.map(g => g.tipo_glosa).filter(Boolean)));

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
        servicios,
        tipos,
        fecha: fechaActividad,
        timestamp: maxFechaTimestamp,
        diferencia: glosado - aceptado - noAceptado // DIFERENCIA REAL: Lo que queda por auditar/conciliar
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

  const handleReconcilePayments = async () => {
    if (!confirm('Esta acción buscará todas las glosas ACEPTADAS y generará registros de pago automáticos si no existen. ¿Deseas continuar?')) return;
    try {
      setLoading(true);
      const currentUpper = currentMainSection.toUpperCase();
      const glosasAceptadas = glosas.filter(g =>
        g.estado === 'Aceptada' &&
        ((g as any).seccion?.toUpperCase() || 'GLOSAS') === currentUpper
      );

      let created = 0;
      for (const glosa of glosasAceptadas) {
        // Verificar si ya existe un ingreso para esta factura con este valor
        const exists = ingresos.some(i =>
          i.factura === glosa.factura &&
          i.valor_aceptado === glosa.valor_aceptado &&
          ((i as any).seccion?.toUpperCase() || 'GLOSAS') === currentUpper
        );

        if (!exists) {
          const newIngreso: Ingreso = {
            id: 'auto_' + Math.random().toString(36).substr(2, 9),
            factura: glosa.factura,
            valor_aceptado: glosa.valor_aceptado,
            valor_no_aceptado: glosa.valor_glosa - glosa.valor_aceptado,
            fecha: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            seccion: currentUpper
          };

          const { error } = await supabase.from('ingresos').insert([newIngreso]);
          if (!error) {
            setIngresos(prev => [{ ...newIngreso, sincronizado: true }, ...prev]);
            created++;
          }
        }
      }

      showToast(`✅ Sincronización completa: ${created} pagos automáticos generados.`, 'success');
      loadData(true);
    } catch (err: any) {
      console.error('Error en reconciliación:', err);
      showToast('❌ Error al reconciliar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLocalCheckpoints = async () => {
    try {
      setLoading(true);
      const localGlosas = safeStorage.getJson<Glosa[]>('cached_glosas', []);
      const markedLocally = safeArray(localGlosas).filter((lg: any) => lg.registrada_internamente);

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

  const handleEmergencySync = async () => {
    if (!confirm('Esta acción subirá todos tus datos locales actuales a la nube. ¿Deseas continuar?')) return;
    try {
      setLoading(true);
      const localGlosas = safeStorage.getJson<Glosa[]>('cached_glosas', []);
      const localIngresos = safeStorage.getJson<Ingreso[]>('cached_ingresos', []);

      if (localGlosas.length > 0) {
        await supabase.from('glosas').upsert(localGlosas);
      }
      if (localIngresos.length > 0) {
        await supabase.from('ingresos').upsert(localIngresos);
      }

      showToast(`✅ Sincronización de emergencia exitosa.`, 'success');
      loadData(true);
    } catch (err: any) {
      console.error('Error en sincronización de emergencia:', err);
      showToast('❌ Error al sincronizar: ' + err.message, 'error');
    } finally {
      setLoading(false);
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

  // v9.0: REINTENTO AUTOMÁTICO DE SINCRONIZACIÓN (Auto-Sync)
  // IMPORTANTE: este hook debe estar ANTES de cualquier return condicional
  useEffect(() => {
    if (!isMounted) return; // Saltamos si no está montado, pero el hook siempre se llama
    const autoSync = async () => {
      // 1. Reintentar GLOSAS
      const pendingGlosas = glosas.filter(g => g.sincronizado === false);
      if (pendingGlosas.length > 0) {
        console.log(`--- [v9.1] Auto-Sync Glosas: Reintentando ${pendingGlosas.length} ---`);
        for (const item of pendingGlosas) {
          const { sincronizado, ...cleanItem } = item as any;
          const { error } = await supabase.from('glosas').insert([cleanItem]);
          if (!error) {
            setGlosas(prev => prev.map(g => g.id === item.id ? { ...g, sincronizado: true } : g));
            const currentBuffer = safeStorage.getJson<Glosa[]>('emergency_buffer', []);
            safeStorage.setJson('emergency_buffer', currentBuffer.filter((g: any) => g.id !== item.id));
          }
        }
      }

      // 2. Reintentar INGRESOS (NUEVO v9.1)
      const pendingIngresos = ingresos.filter(i => i.sincronizado === false);
      if (pendingIngresos.length > 0) {
        console.log(`--- [v9.1] Auto-Sync Ingresos: Reintentando ${pendingIngresos.length} ---`);
        for (const item of pendingIngresos) {
          const { sincronizado, ...cleanItem } = item as any;
          const { error } = await supabase.from('ingresos').insert([cleanItem]);
          if (!error) {
            setIngresos(prev => prev.map(i => i.id === item.id ? { ...i, sincronizado: true } : i));
            const currentBuffer = safeStorage.getJson<Ingreso[]>('emergency_buffer_ingresos', []);
            safeStorage.setJson('emergency_buffer_ingresos', currentBuffer.filter((i: any) => i.id !== item.id));
          }
        }
      }
    };

    const interval = setInterval(autoSync, 60000); // Cada 1 minuto
    return () => clearInterval(interval);
  }, [glosas, ingresos, isMounted]);

  if (!isMounted) return <div style={{ background: '#06040d', minHeight: '100vh' }}></div>;

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', position: 'relative' }}>
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

      {/* Sidebar - Rediseñado Premium Dark */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="app-sidebar custom-scrollbar"
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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'ingreso', label: 'Registro', icon: PieChart },
            { id: 'consolidado', label: 'Auditoría', icon: ListChecks },
            { id: 'valores', label: 'Pagos', icon: Wallet },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'inherit', opacity: isActive ? 1 : 0.6 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeGlow"
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      boxShadow: '0 0 8px var(--primary)'
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User Profile / Logout bottom section */}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: '0.75rem' }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', margin: 0, textTransform: 'uppercase' }}>{role}</p>
            </div>
          </div>
        </div>
      </motion.aside>

      <main className="container" style={{ flex: 1, margin: 0, maxWidth: 'none', overflowY: 'auto', padding: '1.5rem 2.5rem' }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 0',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 15px var(--primary-glow)'
            }}>
              <Activity size={18} />
            </div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
              Análisis de Datos <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#000', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem', verticalAlign: 'middle', fontWeight: 900 }}>V4.0 PREMIUM</span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Search and Notification icons like in the screenshot */}
            <div style={{ display: 'flex', gap: '1rem', color: 'rgba(255,255,255,0.4)' }}>
              <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><LayoutDashboard size={18} /></button>
              <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><Activity size={18} /></button>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={signOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f15bb5',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <LogOut size={14} />
              SALIR
            </motion.button>
          </div>
        </header>

        {/* Info Box / Footer del Header */}
        <div style={{ marginBottom: '2rem', marginTop: '-0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
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
          {/* Fecha de creación del software */}
          <p style={{
            fontSize: '0.65rem',
            color: 'rgba(0,242,254,0.45)',
            fontWeight: 700,
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(0,242,254,0.04)',
            border: '1px solid rgba(0,242,254,0.1)',
            borderRadius: '6px',
            padding: '2px 10px'
          }}>
            🗓 Creado el 23 · Feb · 2026
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Sección Actual Highlight Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2rem',
                padding: '1rem 1.5rem',
                background: currentMainSection === 'GLOSAS'
                  ? 'rgba(139, 92, 246, 0.05)'
                  : 'rgba(16, 185, 129, 0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                margin: '-2rem -2rem 2rem -2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backdropFilter: 'blur(20px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '10px',
                    height: '100%',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    background: currentMainSection === 'GLOSAS' ? '#8b5cf6' : '#10b981',
                    boxShadow: `0 0 15px ${currentMainSection === 'GLOSAS' ? '#8b5cf6' : '#10b981'}`
                  }} />
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    color: currentMainSection === 'GLOSAS' ? '#a78bfa' : '#34d399',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase'
                  }}>Sección Activa</span>
                  <h2 style={{
                    fontSize: '1.2rem',
                    fontWeight: 950,
                    color: 'white',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {currentMainSection === 'GLOSAS' && <FileText size={20} color="#8b5cf6" />}
                    {currentMainSection === 'MEDICAMENTOS' && <Activity size={20} color="#10b981" />}
                    {currentMainSection}
                  </h2>
                </div>

                <div style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Clock size={12} /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>

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
                      consolidado={consolidado}
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
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>Registrar {currentMainSection.toLowerCase()}</h2>
                      <p style={{ color: 'var(--text-secondary)' }}>Complete el siguiente formulario para ingresar un nuevo registro de {currentMainSection.toLowerCase()}.</p>
                    </div>
                    <GlosaForm
                      onAddGlosa={handleAddGlosa}
                      existingGlosas={glosas}
                      existingIngresos={ingresos}
                      currentSeccion={currentMainSection}
                      isAdmin={role === 'admin'}
                    />

                    {/* v8.6: VISIBILIDAD INSTANTÁNEA - Historial de Hoy */}
                    <div style={{ marginTop: '3.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ width: '4px', height: '24px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: 0 }}>Pendientes de Ingreso Interno ({currentMainSection})</h3>
                      </div>

                      <GlosaTable
                        glosas={currentSectionGlosas.filter(g => {
                          const today = new Date();
                          const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
                          // v9.0: FLUJO DE DESCARGA - Solo mostrar si NO está registrada internamente
                          return (g.fecha || '').includes(todayStr) && !g.registrada_internamente;
                        })}
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
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>Consolidado de {currentMainSection}</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '800px' }}>
                          Resumen agrupado por factura para visualizar el balance final de <strong>{currentMainSection.toLowerCase()}</strong>.
                          Permite comparar el monto total frente a lo aceptado y la diferencia pendiente.
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
                        <p style={{ color: 'var(--text-secondary)' }}>Registre los pagos aceptados y no aceptados para su control final de auditoría.</p>
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
                      <div style={{ display: 'flex', gap: '0.75rem', opacity: 0.5, flexWrap: 'wrap' }}>
                        <motion.button
                          whileHover={{ scale: 1.05, opacity: 1 }}
                          onClick={async () => {
                            if (!confirm('Esta acción forzará un nuevo escaneo profundo V5.1 (Contextual). Si estás en la pestaña MEDICAMENTOS, los datos se recuperarán allí. ¿Continuar?')) return;
                            localStorage.removeItem('migrated_to_supabase_v5_final_context');
                            window.location.reload();
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}
                        >
                          <RefreshCw size={12} />
                          FORZAR NUEVO ESCANEO
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05, opacity: 1 }}
                          onClick={handleReconcilePayments}
                          className="btn btn-secondary"
                          style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.3)' }}
                        >
                          <TrendingUp size={12} />
                          SINCRONIZAR PAGOS
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05, opacity: 1 }}
                          onClick={async () => {
                            if (!confirm('SINCRO UNIVERSAL: Intentará subir CUALQUIER dato encontrado categorizándolo por sección (Glosas/Med). ¿Continuar?')) return;
                            setLoading(true);
                            try {
                              let count = 0;
                              for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (!key) continue;
                                const val = localStorage.getItem(key);
                                if (val && (val.includes('factura') || val.includes('valor_glosa'))) {
                                  try {
                                    const parsed = JSON.parse(val);
                                    const items = Array.isArray(parsed) ? parsed : [parsed];

                                    // Inteligencia de sección
                                    let inferred = 'GLOSAS';
                                    if (key.toLowerCase().includes('medic')) inferred = 'MEDICAMENTOS';

                                    const prepared = items.map(it => ({
                                      ...it,
                                      seccion: it.seccion?.toUpperCase() || inferred
                                    })).filter(it => it && it.factura);

                                    if (prepared.length > 0) {
                                      await supabase.from(key.includes('ingreso') ? 'ingresos' : 'glosas').upsert(prepared);
                                      count += prepared.length;
                                    }
                                  } catch (e) { }
                                }
                              }
                              showToast(`Sincronización Inteligente finalizada.`, 'success');
                              loadData(true);
                            } catch (e) {
                              showToast('Error en sincronización.', 'error');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                        >
                          <RefreshCw size={12} />
                          SINCRO UNIVERSAL
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05, opacity: 1 }}
                          onClick={() => {
                            const sections = {
                              medicamentos: glosas.filter(g => (g as any).seccion === 'MEDICAMENTOS' || (g as any).seccion === 'medicamentos').length,
                            };
                            const todayManual = (() => {
                              const d = new Date();
                              return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                            })();
                            const buffer = JSON.parse(localStorage.getItem('emergency_buffer') || '[]');
                            const last10 = glosas.slice(0, 10).map(g => `• ${g.factura} | ${g.seccion} | ${g.fecha}`).join('\n');
                            const todayRecords = glosas.filter(g => (g.fecha || '').includes(todayManual));

                            const confirmRescue = window.confirm(`DIAGNÓSTICO V8.7 (RESCATE PROFUNDO):\n\n` +
                              `EN NUBE (Total): ${glosas.length}\n` +
                              `HOY EN RAM: ${todayRecords.length}\n` +
                              `ESCUDO (Buffer): ${buffer.length}\n\n` +
                              `¿Deseas ejecutar un ESCANEO FORZADO para buscar tus 3 facturas perdidas?`);

                            if (confirmRescue) {
                              migrateData(true);
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.6rem 1.25rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}
                        >
                          <Activity size={12} />
                          INFORME DE SALUD
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
            </div>
          )
        }
      </main >
    </div >
  );
}

const IngresoForm = ({ onAddIngreso, isAdmin, currentSeccion }: { onAddIngreso: (ingreso: Ingreso) => void, isAdmin: boolean, currentSeccion: string }) => {
  const [formData, setFormData] = useState({ factura: '', valor_aceptado: '', valor_no_aceptado: '' });
  const key = `ingreso_form_draft_${currentSeccion}`;

  // PERSISTENCIA: Cargar datos guardados
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error cargando borrador ingreso:', e);
      }
    }
  }, [key]);

  // PERSISTENCIA: Guardar cambios
  useEffect(() => {
    const hasData = Object.values(formData).some(val => val !== '');
    if (hasData) {
      localStorage.setItem(key, JSON.stringify(formData));
    } else {
      localStorage.removeItem(key);
    }
  }, [formData, key]);

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
    localStorage.removeItem(key);
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
                boxShadow: idx % 2 === 0 ? '0 4px 20px rgba(0,0,0,0.1)' : 'none'
              }}>
                <div style={{ opacity: 0.8, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03))', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <h4 style={{ color: 'white', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>{i.factura}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Activity size={10} /> {i.fecha}
                      {i.sincronizado === false ? (
                        <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.5rem' }}>
                          <CloudOff size={10} /> PENDIENTE
                        </span>
                      ) : (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.5rem' }}>
                          <Cloud size={10} /> NUBE
                        </span>
                      )}
                    </span>
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
