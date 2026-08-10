import { z } from "zod";

export function loadString(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function saveString(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* quota or private mode — silently ignore */
    }
}

export function loadBool(key: string): boolean {
    return loadString(key) === "true";
}

export function saveBool(key: string, value: boolean): void {
    saveString(key, value.toString());
}

export function loadJSON<T>(key: string, schema: z.ZodSchema<T>): T | null {
    const raw = loadString(key);
    if (raw === null) return null;
    try {
        const parsed = JSON.parse(raw);
        const result = schema.safeParse(parsed);
        return result.success ? result.data : null;
    } catch {
        return null;
    }
}

export function saveJSON<T>(key: string, _schema: z.ZodSchema<T>, value: T): void {
    try {
        saveString(key, JSON.stringify(value));
    } catch {
        /* ignore */
    }
}

export function removeKey(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
}
