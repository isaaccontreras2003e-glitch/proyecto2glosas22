'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error de Aplicación Detectado:', error, errorInfo);
        this.setState({ errorInfo: errorInfo.componentStack || null });
    }

    private handleClearAndReload = () => {
        try {
            // Limpiar caché que puede contener datos corruptos
            localStorage.removeItem('cached_glosas');
            localStorage.removeItem('cached_ingresos');
            localStorage.removeItem('emergency_buffer');
        } catch {
            // Si localStorage falla, ignorar y recargar de todas formas
        }
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            // Obtener mensaje amigable
            const rawMsg = this.state.error?.message || '';
            let friendlyMsg = 'La aplicación detectó un problema inesperado.';
            if (rawMsg.includes('useToast') || rawMsg.includes('Context'))
                friendlyMsg = 'Error de inicialización de componente.';
            else if (rawMsg.includes('localStorage') || rawMsg.includes('storage'))
                friendlyMsg = 'Error de almacenamiento local. Prueba "Limpiar caché".';
            else if (rawMsg.includes('network') || rawMsg.includes('fetch'))
                friendlyMsg = 'Error de conexión con el servidor.';
            else if (rawMsg.includes('null') || rawMsg.includes('undefined'))
                friendlyMsg = 'Se recibió un dato vacío inesperado.';
            else if (rawMsg.length > 0 && rawMsg.length < 120)
                friendlyMsg = rawMsg;

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    background: 'var(--bg-dark, #06040d)',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '3rem',
                        borderRadius: '2rem',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        maxWidth: '520px',
                        width: '100%',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}>
                        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.75rem' }}>
                            Oops, algo salió mal
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                            {friendlyMsg}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginBottom: '2rem' }}>
                            Hemos registrado el incidente para solucionarlo pronto.
                        </p>

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    background: 'var(--primary, #8b5cf6)', color: 'white', border: 'none',
                                    padding: '1rem 2rem', borderRadius: '12px', fontWeight: 800,
                                    cursor: 'pointer', fontSize: '0.9rem', width: '100%',
                                    justifyContent: 'center'
                                }}
                            >
                                <RefreshCw size={18} /> RECARGAR APLICACIÓN
                            </button>

                            <button
                                onClick={this.handleClearAndReload}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    background: 'rgba(239, 68, 68, 0.15)', color: '#f87171',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    padding: '0.85rem 2rem', borderRadius: '12px', fontWeight: 700,
                                    cursor: 'pointer', fontSize: '0.8rem', width: '100%',
                                    justifyContent: 'center'
                                }}
                                title="Elimina el caché local y recarga. Útil si hay datos corruptos."
                            >
                                <Trash2 size={16} /> LIMPIAR CACHÉ Y RECARGAR
                            </button>
                        </div>

                        {/* Detalles técnicos (siempre visibles, colapsados por defecto) */}
                        <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                            <summary style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', userSelect: 'none' }}>
                                Ver detalles técnicos
                            </summary>
                            <pre style={{
                                marginTop: '0.75rem', padding: '1rem',
                                background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
                                fontSize: '0.65rem', overflow: 'auto', color: '#ef4444',
                                maxHeight: '150px', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                            }}>
                                {this.state.error?.toString()}
                                {this.state.errorInfo ? '\n\n' + this.state.errorInfo.slice(0, 600) : ''}
                            </pre>
                        </details>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
