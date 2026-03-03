/**
 * safeUtils.ts - Utilidades de Seguridad Global
 * Protege contra: valores nulos/NaN, localStorage bloqueado (modo privado/Safari),
 * JSON corrupto, y datos de tipo incorrecto venidos de la red o caché.
 */

// ─── Números ─────────────────────────────────────────────────────────────────

/**
 * Convierte cualquier valor a número de forma segura.
 * Retorna `fallback` (por defecto 0) si el resultado es NaN, null o undefined.
 */
export const safeNumber = (val: any, fallback = 0): number => {
    if (val === null || val === undefined) return fallback;
    const n = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(n) ? fallback : n;
};

/**
 * Formatea un valor numérico como pesos colombianos (sin símbolo, con puntos).
 * No lanza errores si el valor es nulo, NaN o undefined.
 */
export const formatPesos = (val: any): string => {
    const n = safeNumber(val);
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// ─── Strings ─────────────────────────────────────────────────────────────────

/**
 * Convierte cualquier valor a string de forma segura.
 * Retorna `fallback` si el valor es null/undefined.
 */
export const safeString = (val: any, fallback = ''): string => {
    if (val === null || val === undefined) return fallback;
    return String(val);
};

// ─── JSON ────────────────────────────────────────────────────────────────────

/**
 * Parsea un string JSON de forma segura.
 * Retorna `fallback` si el string es nulo, vacío, o tiene JSON inválido.
 */
export const safeJsonParse = <T = any>(str: string | null | undefined, fallback: T): T => {
    if (!str || str.trim() === '') return fallback;
    try {
        return JSON.parse(str) as T;
    } catch {
        return fallback;
    }
};

// ─── localStorage ────────────────────────────────────────────────────────────

/**
 * Wrapper seguro sobre localStorage.
 * Evita crashes en: modo incógnito bloqueado, Safari Private, iframes cross-origin,
 * cuota de almacenamiento llena, y entornos SSR (servidor).
 */
export const safeStorage = {
    get: (key: string, fallback: string | null = null): string | null => {
        try {
            if (typeof window === 'undefined') return fallback;
            return localStorage.getItem(key) ?? fallback;
        } catch {
            return fallback;
        }
    },

    set: (key: string, value: string): boolean => {
        try {
            if (typeof window === 'undefined') return false;
            localStorage.setItem(key, value);
            return true;
        } catch {
            // Falla silenciosamente (cuota llena, modo privado bloqueado)
            return false;
        }
    },

    remove: (key: string): boolean => {
        try {
            if (typeof window === 'undefined') return false;
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    },

    getJson: <T = any>(key: string, fallback: T): T => {
        try {
            if (typeof window === 'undefined') return fallback;
            const raw = localStorage.getItem(key);
            return safeJsonParse<T>(raw, fallback);
        } catch {
            return fallback;
        }
    },

    setJson: (key: string, value: any): boolean => {
        try {
            if (typeof window === 'undefined') return false;
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    clearAll: (): boolean => {
        try {
            if (typeof window === 'undefined') return false;
            localStorage.clear();
            return true;
        } catch {
            return false;
        }
    },
};

// ─── Arrays ──────────────────────────────────────────────────────────────────

/**
 * Garantiza que el valor sea un array. Si no lo es, retorna [].
 * Elimina elementos nulos/undefined del array resultante.
 */
export const safeArray = <T = any>(val: any): T[] => {
    if (!Array.isArray(val)) return [];
    return val.filter((item): item is T => item !== null && item !== undefined);
};

// ─── Objetos ─────────────────────────────────────────────────────────────────

/**
 * Accede a una propiedad de un objeto de forma segura.
 * Retorna `fallback` si el objeto o la propiedad son nulos.
 */
export const safeProp = <T = any>(obj: any, key: string, fallback: T): T => {
    try {
        if (obj === null || obj === undefined) return fallback;
        const val = obj[key];
        return (val === null || val === undefined) ? fallback : val as T;
    } catch {
        return fallback;
    }
};
