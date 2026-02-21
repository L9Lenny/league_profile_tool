import { useState, useRef } from 'react';

export function useToast() {
    const [message, setMessage] = useState({ text: "", type: "" });
    const toastTimerRef = useRef<number | undefined>(undefined);

    const showToast = (text: string, type: string) => {
        setMessage({ text, type });
        if (toastTimerRef.current) globalThis.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = globalThis.setTimeout(() => {
            setMessage({ text: "", type: "" });
        }, 3000);
    };

    return { message, showToast };
}
