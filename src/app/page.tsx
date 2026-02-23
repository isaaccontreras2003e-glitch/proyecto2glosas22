'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { GlosaForm } from '@/components/GlosaForm';
import { GlosaTable } from '@/components/GlosaTable';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, TrendingUp, Wallet, Activity, Trash2, Download, ListChecks, PieChart, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Cargar datos desde Supabase al montar
  useEffect(() => {
    setIsMounted(true);
    const loadData = async () => {
      setLoading(true);
      const [{ data: glosasData }, { data: ingresosData }] = await Promise.all([
        supabase.from('glosas').select('*').order('fecha', { ascending: false }),
        supabase.from('ingresos').select('*').order('fecha', { ascending: false }),
      ]);
      if (glosasData) setGlosas(glosasData);
      if (ingresosData) setIngresos(ingresosData);
      setLoading(false);
    };
    loadData();
  }, []);

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

  const exportToExcel = () => {
    if (consolidado.length === 0) return;
    const headers = ['Factura', 'Valor Glosado', 'Valor Aceptado', 'Valor No Aceptado', 'Diferencia'];
    const rows = consolidado.map(item => [
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
    if (glosas.length === 0) return;
    const headers = ['Factura', 'Servicio', 'Orden Servicio', 'Valor Glosa', 'Tipo Glosa', 'Estado', 'Fecha', 'Descripcion'];
    const rows = glosas.map(g => [
      g.factura, g.servicio, g.orden_servicio,
      g.valor_glosa.toFixed(2).replace('.', ','),
      g.tipo_glosa, g.estado, g.fecha,
      `"${g.descripcion.replace(/"/g, '""')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LISTADO_GLOSAS_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  if (!isMounted) return <div style={{ background: '#06040d', minHeight: '100vh' }}></div>;

  // Cálculos para el Donut Chart
  const totalStates = stats.pendingCount + stats.respondedCount + stats.acceptedCount || 1;
  const pPending = (stats.pendingCount / totalStates) * 100;
  const pResponded = (stats.respondedCount / totalStates) * 100;
  const pAccepted = (stats.acceptedCount / totalStates) * 100;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar */}
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

        {/* Card Valor Total */}
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

      {/* Contenido Principal */}
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
            <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportGlosasToExcel} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)', fontWeight: 700 }}>
                <Download size={14} color="var(--primary)" />
                EXPORTAR GLOSAS
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportToExcel} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}>
                <Download size={14} />
                CONSOLIDADO FACTURAS
              </motion.button>
            </div>
          </motion.div>
        </header>

        {/* Loading overlay */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.2)', borderTop: '3px solid #8b5cf6', borderRadius: '50%', margin: '0 auto 1rem' }} />
            <p>Cargando datos desde la nube...</p>
          </div>
        )}

        {!loading && (
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
                <GlosaForm onAddGlosa={handleAddGlosa} existingGlosas={glosas} />
                <AnimatePresence mode="popLayout">
                  <motion.div key="table-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <GlosaTable glosas={glosas} onUpdateStatus={handleUpdateStatus} onUpdateGlosa={handleUpdateGlosa} onDeleteGlosa={handleDeleteGlosa} onDeleteDuplicates={handleDeleteDuplicates} />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <IngresoForm onAddIngreso={handleAddIngreso} />
                <IngresoList ingresos={ingresos} onDelete={handleDeleteIngreso} />
              </div>
            </div>
          </>
        )}

        <footer style={{ marginTop: '5rem', padding: '3rem 0', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          &copy; {new Date().getFullYear()} Sisfact Auditoría. Gestión de Alto Rendimiento.
        </footer>
      </main>
    </div>
  );
}

const IngresoForm = ({ onAddIngreso }: { onAddIngreso: (ingreso: Ingreso) => void }) => {
  const [formData, setFormData] = useState({ factura: '', valor_aceptado: '', valor_no_aceptado: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.factura) return;
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
            <input type="text" className="input" style={{ padding: '0.85rem 1rem' }} placeholder="Ej: FAC-100" value={formData.factura} onChange={(e) => setFormData({ ...formData, factura: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="label" style={{ color: '#10b981' }}>Valor No Aceptado</label>
              <input type="number" className="input" style={{ padding: '0.85rem 1rem', borderColor: 'rgba(16, 185, 129, 0.2)' }} placeholder="0.00" value={formData.valor_no_aceptado} onChange={(e) => setFormData({ ...formData, valor_no_aceptado: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="label" style={{ color: '#ef4444' }}>Valor Aceptado</label>
              <input type="number" className="input" style={{ padding: '0.85rem 1rem', borderColor: 'rgba(239, 68, 68, 0.3)' }} placeholder="0.00" value={formData.valor_aceptado} onChange={(e) => setFormData({ ...formData, valor_aceptado: e.target.value })} />
            </div>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02, background: '#059669' }} whileTap={{ scale: 0.98 }} type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', background: '#10b981', height: '52px', fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          REGISTRAR MOVIMIENTO
        </motion.button>
      </form>
    </motion.div>
  );
};

const IngresoList = ({ ingresos, onDelete }: { ingresos: Ingreso[], onDelete: (id: string) => void }) => {
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
      <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.75rem' }} className="custom-scrollbar">
        <AnimatePresence>
          {ingresos.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', fontSize: '0.9rem' }}>
              Sin movimientos registrados
            </motion.p>
          ) : (
            ingresos.map((i, idx) => (
              <motion.div key={i.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>{i.factura}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Activity size={12} />
                      {i.fecha}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>No Aceptado</p>
                      <p style={{ fontSize: '1.1rem', color: '#10b981', fontWeight: 800 }}>${formatPesos(i.valor_no_aceptado)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Aceptado</p>
                      <p style={{ fontSize: '1.1rem', color: '#ef4444', fontWeight: 800 }}>${formatPesos(i.valor_aceptado)}</p>
                    </div>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.2)' }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(i.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.85rem', borderRadius: '1rem' }}>
                  <Trash2 size={18} />
                </motion.button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
