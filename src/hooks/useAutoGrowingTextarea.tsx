import { useRef, useLayoutEffect, forwardRef, useCallback } from 'react';

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    minRows?: number;
    maxRows?: number;
}

export const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
    function AutoExpandingTextarea({ value, onChange, placeholder, minRows = 1, maxRows = 12, style, ...props }, ref) {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);
        const combinedRef = ref ? ((ref as React.RefObject<HTMLTextAreaElement>) || internalRef) : internalRef;

        const resize = useCallback(() => {
            const textarea = combinedRef.current;
            if (!textarea) return;

            const computedStyle = window.getComputedStyle(textarea);
            const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
            const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
            const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
            const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
            const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
            const extra = paddingTop + paddingBottom + borderTop + borderBottom;

            const minHeight = (minRows * lineHeight) + extra;
            const maxHeight = (maxRows * lineHeight) + extra;

            textarea.style.height = '0px';
            const scrollHeight = textarea.scrollHeight;
            let newHeight = Math.max(scrollHeight, minHeight);

            if (scrollHeight > maxHeight) {
                newHeight = maxHeight;
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }

            textarea.style.height = `${newHeight}px`;
        }, [minRows, maxRows, combinedRef]);

        useLayoutEffect(() => {
            resize();
        }, [value, resize]);

        useLayoutEffect(() => {
            const textarea = combinedRef.current;
            if (!textarea) return;

            const handleInput = () => resize();
            const handleResize = () => resize();

            textarea.addEventListener('input', handleInput);
            window.addEventListener('resize', handleResize);

            const observer = new ResizeObserver(() => resize());
            observer.observe(textarea);

            return () => {
                textarea.removeEventListener('input', handleInput);
                window.removeEventListener('resize', handleResize);
                observer.disconnect();
            };
        }, [resize]);

        const textareaStyle: React.CSSProperties = {
            ...style,
            overflowY: 'hidden',
            resize: 'vertical',
            height: 'auto',
            boxSizing: 'border-box',
            minHeight: undefined,
        };

        return (
            <textarea
                ref={combinedRef}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={textareaStyle}
                rows={minRows}
                {...props}
            />
        );
    }
);

AutoExpandingTextarea.displayName = 'AutoExpandingTextarea';