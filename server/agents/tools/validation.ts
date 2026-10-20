/**
 * AbangColek Sovereign GrowthOS — Strict Tool Input Validation
 *
 * A tiny, dependency-free schema validator with the discipline the platform
 * expects: unknown keys are rejected, missing required fields are rejected and
 * wrong types are rejected. Money is always integer Sen.
 */

export type FieldType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'unknown';

export interface FieldSpec {
  type: FieldType;
  required?: boolean;
  /** Minimum string length or minimum numeric value. */
  min?: number;
  /** Maximum string length or maximum numeric value. */
  max?: number;
  maxItems?: number;
  pattern?: RegExp;
  enum?: readonly string[];
  /** Element spec for `array`. */
  items?: FieldSpec;
  /** Property specs for `object`. */
  fields?: Record<string, FieldSpec>;
}

export type Schema = Record<string, FieldSpec>;

export type ValidationOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const typeName = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

function validateField(path: string, spec: FieldSpec, value: unknown): string | null {
  switch (spec.type) {
    case 'string': {
      if (typeof value !== 'string') return `INVALID_TYPE:${path}`;
      if (spec.min !== undefined && value.trim().length < spec.min) return `INVALID_VALUE:${path}`;
      if (spec.max !== undefined && value.length > spec.max) return `INVALID_VALUE:${path}`;
      if (spec.pattern && !spec.pattern.test(value)) return `INVALID_VALUE:${path}`;
      if (spec.enum && !spec.enum.includes(value)) return `INVALID_VALUE:${path}`;
      return null;
    }
    case 'integer': {
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) return `INVALID_TYPE:${path}`;
      if (spec.min !== undefined && value < spec.min) return `INVALID_VALUE:${path}`;
      if (spec.max !== undefined && value > spec.max) return `INVALID_VALUE:${path}`;
      return null;
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return `INVALID_TYPE:${path}`;
      if (spec.min !== undefined && value < spec.min) return `INVALID_VALUE:${path}`;
      if (spec.max !== undefined && value > spec.max) return `INVALID_VALUE:${path}`;
      return null;
    }
    case 'boolean': {
      return typeof value === 'boolean' ? null : `INVALID_TYPE:${path}`;
    }
    case 'array': {
      if (!Array.isArray(value)) return `INVALID_TYPE:${path}`;
      if (spec.maxItems !== undefined && value.length > spec.maxItems) return `INVALID_VALUE:${path}`;
      if (spec.items) {
        for (let index = 0; index < value.length; index += 1) {
          const error = validateField(`${path}[${index}]`, spec.items, value[index]);
          if (error) return error;
        }
      }
      return null;
    }
    case 'object': {
      if (!isPlainObject(value)) return `INVALID_TYPE:${path}`;
      if (spec.fields) {
        const nested = validateStrict(spec.fields, value, path);
        if (!nested.ok) return nested.error;
      }
      return null;
    }
    case 'unknown':
    default:
      return null;
  }
}

/**
 * Validates `input` against `schema`.
 * - unknown top-level keys are rejected (`UNKNOWN_FIELD:<key>`)
 * - missing required fields are rejected (`MISSING_FIELD:<key>`)
 * - type / range violations are rejected (`INVALID_TYPE:<key>` / `INVALID_VALUE:<key>`)
 */
export function validateStrict(
  schema: Schema,
  input: unknown,
  prefix = '',
): ValidationOutcome {
  if (!isPlainObject(input)) {
    return { ok: false, error: 'INPUT_MUST_BE_OBJECT' };
  }
  for (const key of Object.keys(input)) {
    if (key.startsWith('$')) {
      return { ok: false, error: `UNKNOWN_FIELD:${prefix}${key}` };
    }
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      return { ok: false, error: `UNKNOWN_FIELD:${prefix}${key}` };
    }
  }
  // `$oneOf` declares that at least one of the named fields must be present.
  const oneOf = (schema as Record<string, unknown>).$oneOf;
  if (Array.isArray(oneOf)) {
    const names = oneOf.filter((name): name is string => typeof name === 'string');
    const present = names.some((name) => input[name] !== undefined && input[name] !== null);
    if (!present) {
      return { ok: false, error: `MISSING_FIELD:${prefix}${names.join('|')}` };
    }
  }
  const data: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema)) {
    if (key.startsWith('$')) continue;
    const value = input[key];
    const path = `${prefix}${key}`;
    if (value === undefined || value === null) {
      if (spec.required) return { ok: false, error: `MISSING_FIELD:${path}` };
      continue;
    }
    const error = validateField(path, spec, value);
    if (error) return { ok: false, error };
    data[key] = value;
  }
  return { ok: true, data };
}

/** Human readable rendering of a validation failure code. */
export function describeValidationError(error: string): string {
  const [code, ...rest] = error.split(':');
  const field = rest.join(':');
  switch (code) {
    case 'UNKNOWN_FIELD':
      return `Medan tidak dibenarkan dihantar: ${field}.`;
    case 'MISSING_FIELD':
      return `Medan diperlukan: ${field}.`;
    case 'INVALID_TYPE':
      return `Jenis data tidak sah untuk ${field}.`;
    case 'INVALID_VALUE':
      return `Nilai tidak sah untuk ${field}.`;
    case 'INPUT_MUST_BE_OBJECT':
      return 'Input mesti objek.';
    default:
      return error;
  }
}
