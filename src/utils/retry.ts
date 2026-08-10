const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

function isRetryableError(error: unknown): boolean {
    const msg = String(error).toLowerCase();
    if (msg.includes("not connected")) return false;
    if (msg.includes("endpoint not allowed")) return false;
    if (msg.includes("invalid endpoint")) return false;
    if (msg.includes("invalid method")) return false;
    if (msg.includes("invalid port")) return false;
    if (msg.includes("missing token")) return false;
    return true;
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = DEFAULT_MAX_RETRIES
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (err) {
            lastError = err;
            if (attempt >= maxRetries || !isRetryableError(err)) throw err;
            const delay = BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
