import { useState, useRef, useCallback, useEffect } from 'react';

export function useToast() {
    const [message, setMessage] = useState({ text: "", type: "" });
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const showToast = useCallback((text: string, type: string) => {
        setMessage({ text, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setMessage({ text: "", type: "" });
        }, 3000);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    return { message, showToast };
}
