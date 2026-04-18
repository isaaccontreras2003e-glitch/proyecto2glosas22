'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, RefreshCw, Download, Clock, CheckCircle2,
  AlertCircle, Wifi, WifiOff, Activity, Database, TrendingUp, Zap
} from 'lucide-react';

interface SyncEvent {
  timestamp: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  type: 'glosa' | 'ingreso';
  factura?: string;
}

interface ExcelSyncPanelProps {
  glosaCount: number;
  ingresoCount: number;
  onFullSync: () => Promise<void>;
  onDownload: () => void;
}

export function ExcelSyncPanel({ glosaCount, ingresoCount, onFullSync, onDownload }: ExcelSyncPanelProps) {
  const [syncHistory, setSyncHistory] = useState<SyncEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [cloudUrl, setCloudUrl] = useState<string | null>(null);

  // Escuchar eventos globales de sincronización emitidos por page.tsx
  useEffect(() => {
    const handler = (e: CustomEvent<SyncEvent & { cloudUrl?: string }>) => {
      const evt = e.detail;
      setSyncHistory(prev => [evt, ...prev].slice(0, 15));
      setLastSync(evt.timestamp);
      if (evt.cloudUrl) setCloudUrl(evt.cloudUrl);
      setSyncStatus('ok');
      // Pulso animado
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    };

    window.addEventListener('excel-sync-event', handler as EventListener);
    return () => window.removeEventListener('excel-sync-event', handler as EventListener);
  }, []);

  const handleFullSync = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/backup?sync=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en sincronización');
      
      const ts = new Date().toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      setLastSync(ts);
      if (data.cloudUrl) setCloudUrl(data.cloudUrl);
      setSyncStatus('ok');
    } catch (err: any) {
      setSyncStatus('error');
      setErrorMsg(err.message || 'Error desconocido');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenOnline = () => {
    if (!cloudUrl) {
      // Intentar obtener la URL si no existe
      const baseUrl = 'https://pcnxektqlxplrwanazuw.supabase.co/storage/v1/object/public/soportes_glosas/Consolidado_Fijo_Sisfact.xlsx';
      const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(baseUrl)}`;
      window.open(officeUrl, '_blank');
      return;
    }
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(cloudUrl)}`;
    window.open(officeUrl, '_blank');
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      onDownload();
      await new Promise(res => setTimeout(res, 1500));
    } finally {
      setIsDownloading(false);
    }
  };

  const actionColors: Record<string, string> = {
    INSERT: '#4CAF50',
    UPDATE: '#FFC107',
    DELETE: '#F44336',
  };

  const actionLabels: Record<string, string> = {
    INSERT: '➕ Nuevo',
    UPDATE: '✏️ Editado',
    DELETE: '🗑️ Eliminado',
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0D1B2A 0%, #1A2E45 50%, #0D1B2A 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '24px',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(78,205,196,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <motion.div
          animate={pulse ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, #1DB954, #17a448)',
            borderRadius: '10px', padding: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: pulse ? '0 0 20px rgba(29,185,84,0.6)' : '0 0 10px rgba(29,185,84,0.2)',
            transition: 'box-shadow 0.3s',
          }}
        >
          <FileSpreadsheet size={22} color="#fff" />
        </motion.div>
        <div>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 15, fontWeight: 700 }}>
            Excel en Tiempo Real
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: 11 }}>
            Registro automático y estructurado
          </p>
        </div>

        {/* Indicador de estado */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: syncStatus === 'error' ? '#F44336' : '#1DB954',
            }}
          />
          <span style={{ color: syncStatus === 'error' ? '#F44336' : '#1DB954', fontSize: 11, fontWeight: 600 }}>
            {syncStatus === 'error' ? 'Error' : 'Activo'}
          </span>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Glosas', value: glosaCount, icon: <Database size={14} />, color: '#4ECDC4' },
          { label: 'Ingresos', value: ingresoCount, icon: <TrendingUp size={14} />, color: '#FFE66D' },
          { label: 'Eventos Hoy', value: syncHistory.length, icon: <Activity size={14} />, color: '#FF6B6B' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10, padding: '10px 12px',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ color: stat.color, marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{stat.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Última sincronización */}
      {lastSync && (
        <div style={{
          background: 'rgba(29,185,84,0.1)', border: '1px solid rgba(29,185,84,0.25)',
          borderRadius: 8, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        }}>
          <CheckCircle2 size={14} color="#1DB954" />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
            Último guardado: <strong style={{ color: '#1DB954' }}>{lastSync}</strong>
          </span>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
              borderRadius: 8, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            }}
          >
            <AlertCircle size={14} color="#F44336" />
            <span style={{ color: '#FF8A80', fontSize: 11 }}>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botones de acción */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        {/* Sincronización completa */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleFullSync}
          disabled={isSyncing}
          style={{
            background: isSyncing
              ? 'rgba(78,205,196,0.2)'
              : 'linear-gradient(135deg, #4ECDC4, #38B2AC)',
            border: 'none', borderRadius: 10, padding: '12px 16px',
            color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: isSyncing ? 0.7 : 1,
          }}
        >
          <motion.div animate={isSyncing ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={14} />
          </motion.div>
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Todo'}
        </motion.button>

        {/* Descargar Excel */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={handleDownload}
          disabled={isDownloading}
          style={{
            background: isDownloading
              ? 'rgba(29,185,84,0.2)'
              : 'linear-gradient(135deg, #1DB954, #17a448)',
            border: 'none', borderRadius: 10, padding: '12px 16px',
            color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: isDownloading ? 0.7 : 1,
          }}
        >
          <motion.div animate={isDownloading ? { y: [0, 4, 0] } : { y: 0 }} transition={{ duration: 0.5, repeat: isDownloading ? Infinity : 0 }}>
            <Download size={14} />
          </motion.div>
          {isDownloading ? 'Generando...' : 'Bajar Excel'}
        </motion.button>
      </div>

      {/* Botón Consolidado Online (Novedad V4) */}
      <motion.button
        whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(29,185,84,0.3)' }}
        whileTap={{ scale: 0.99 }}
        onClick={handleOpenOnline}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '14px',
          color: '#fff',
          fontWeight: 700,
          fontSize: '13px',
          cursor: 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}
      >
        <TrendingUp size={16} color="#1DB954" />
        VER CONSOLIDADO EN VIVO (ONLINE)
        <span style={{ 
          fontSize: '9px', 
          background: '#1DB954', 
          color: '#000', 
          padding: '2px 6px', 
          borderRadius: 4,
          fontWeight: 900
        }}>FIXED</span>
      </motion.button>

      {/* Hojas del Excel — descripción visual */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Hojas del archivo Excel
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { name: '📋 Glosas', desc: 'Todos los registros con colores por estado' },
            { name: '💰 Ingresos', desc: 'Pagos y valores aceptados' },
            { name: '📊 Consolidado', desc: 'Agrupado por factura con diferencias' },
            { name: '📈 Resumen Ejecutivo', desc: 'KPIs y métricas globales' },
            { name: '🕒 Historial', desc: 'Log de cada cambio (INSERT/UPDATE/DELETE)' },
          ].map(sheet => (
            <div key={sheet.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
            }}>
              <span style={{ color: '#4ECDC4', fontSize: 11, fontWeight: 600, minWidth: 140 }}>{sheet.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{sheet.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historial reciente */}
      {syncHistory.length > 0 && (
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Eventos recientes
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
            <AnimatePresence>
              {syncHistory.map((evt, i) => (
                <motion.div
                  key={`${evt.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)',
                    borderLeft: `3px solid ${actionColors[evt.action] || '#666'}`,
                  }}
                >
                  <span style={{ color: actionColors[evt.action], fontSize: 10, fontWeight: 700, minWidth: 70 }}>
                    {actionLabels[evt.action]}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                    {evt.type === 'glosa' ? '📋' : '💰'} {evt.factura || '—'}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, marginLeft: 'auto' }}>
                    {evt.timestamp.split(' ')[1] || evt.timestamp}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Ícono de rayo — sincronización en tiempo real */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        color: 'rgba(78,205,196,0.15)', pointerEvents: 'none',
      }}>
        <Zap size={48} />
      </div>
    </div>
  );
}
