'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error de Aplicación Detectado:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    background: 'var(--bg-dark)',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '3rem',
                        borderRadius: '2rem',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        maxWidth: '500px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}>
                        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '1rem' }}>Oops, algo salió mal</h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
                            La aplicación ha detectado un error inesperado. Hemos registrado el incidente para solucionarlo pronto.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                margin: '0 auto',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                padding: '1rem 2rem',
                                borderRadius: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <RefreshCw size={20} />
                            RECARGAR APLICACIÓN
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                            <pre style={{
                                marginTop: '2rem',
                                padding: '1rem',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                textAlign: 'left',
                                overflow: 'auto',
                                color: '#ef4444'
                            }}>
                                {this.state.error?.toString()}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
