/**
 * sanitize.ts — Input sanitization utility (OWASP XSS protection)
 * Strips HTML tags, script injections, and enforces max length.
 */

const MAX_LENGTHS: Record<string, number> = {
    factura: 60,
    servicio: 120,
    orden_servicio: 60,
    descripcion: 500,
    tipo_glosa: 60,
    estado: 30,
    default: 255,
};

/**
 * Strip HTML tags and dangerous characters from a string.
 */
export function sanitizeText(value: string, field: string = 'default'): string {
    if (typeof value !== 'string') return '';

    const maxLen = MAX_LENGTHS[field] ?? MAX_LENGTHS.default;

    return value
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove script-like patterns
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        // Trim whitespace
        .trim()
        // Enforce max length
        .slice(0, maxLen);
}

/**
 * Sanitize a numeric string: ensure it is a non-negative finite number.
 */
export function sanitizeNumber(value: string | number, max = 999_999_999): number {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isFinite(num) || isNaN(num) || num < 0) return 0;
    return Math.min(num, max);
}

/**
 * Sanitize a whole form data object with known string fields.
 */
export function sanitizeGlosaForm(data: Record<string, any>): Record<string, any> {
    const textFields = ['factura', 'servicio', 'orden_servicio', 'descripcion', 'tipo_glosa', 'estado'];
    const result = { ...data };

    for (const field of textFields) {
        if (typeof result[field] === 'string') {
            result[field] = sanitizeText(result[field], field);
        }
    }

    if ('valor_glosa' in result) {
        result.valor_glosa = sanitizeNumber(result.valor_glosa);
    }
    if ('valor_aceptado' in result) {
        result.valor_aceptado = sanitizeNumber(result.valor_aceptado);
    }

    return result;
}
