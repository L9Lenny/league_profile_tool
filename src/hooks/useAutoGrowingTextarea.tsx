import { useRef, useEffect, forwardRef } from 'react';

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    minRows?: number;
    maxRows?: number;
}

export const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
    function AutoExpandingTextarea({ value, onChange, placeholder, minRows = 1, maxRows = 10, style, ...props }, ref) {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);
        const combinedRef = ref ? ((ref as React.RefObject<HTMLTextAreaElement>) || internalRef) : internalRef;

        useEffect(() => {
            const textarea = combinedRef.current;
            if (!textarea) return;

            const updateHeight = () => {
                textarea.style.height = 'auto';
                const scrollHeight = textarea.scrollHeight;
                const computedStyle = window.getComputedStyle(textarea);
                const borderHeight = 
                    parseFloat(computedStyle.borderTopWidth || '0') + 
                    parseFloat(computedStyle.borderBottomWidth || '0');
                
                let newHeight = scrollHeight + borderHeight;

                if (minRows) {
                    const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
                    const minHeight = (minRows * lineHeight) + borderHeight;
                    newHeight = Math.max(newHeight, minHeight);
                }

                if (maxRows) {
                    const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
                    const maxHeight = (maxRows * lineHeight) + borderHeight;
                    newHeight = Math.min(newHeight, maxHeight);
                }

                textarea.style.height = `${newHeight}px`;
            };

            updateHeight();

            const handleInput = () => {
                updateHeight();
            };

            textarea.addEventListener('input', handleInput);
            window.addEventListener('resize', updateHeight);

            return () => {
                textarea.removeEventListener('input', handleInput);
                window.removeEventListener('resize', updateHeight);
            };
        }, [value, minRows, maxRows, combinedRef]);

        const textareaStyle = {
            ...style,
            overflow: 'hidden' as const,
            resize: 'vertical' as const,
            height: 'auto' as const
        };

        return (
            <textarea
                ref={combinedRef}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>).disabled}
                style={textareaStyle}
                {...props}
            />
        );
    }
);

AutoExpandingTextarea.displayName = 'AutoExpandingTextarea';