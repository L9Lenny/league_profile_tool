import { useRef, useLayoutEffect, forwardRef } from 'react';

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    minRows?: number;
    maxRows?: number;
}

export const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
    function AutoExpandingTextarea({ value, onChange, placeholder, minRows = 1, maxRows = 200, style, ...props }, ref) {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);
        const combinedRef = ref ? ((ref as React.RefObject<HTMLTextAreaElement>) || internalRef) : internalRef;

        const resize = () => {
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
            const newHeight = Math.max(scrollHeight, minHeight);

            if (newHeight >= maxHeight) {
                textarea.style.overflowY = 'auto';
                textarea.style.height = `${maxHeight}px`;
            } else {
                textarea.style.overflowY = 'hidden';
                textarea.style.height = `${newHeight}px`;
            }
        };

        useLayoutEffect(() => {
            resize();
        }, [value]);

        useLayoutEffect(() => {
            const textarea = combinedRef.current;
            if (!textarea) return;

            const handleInput = () => resize();
            textarea.addEventListener('input', handleInput);

            let resizeTimer: number | undefined;
            const handleWindowResize = () => {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => resize(), 100);
            };
            window.addEventListener('resize', handleWindowResize);

            const ro = new ResizeObserver(() => {
                if (textarea.style.height === '0px') return;
                resize();
            });
            ro.observe(textarea);

            return () => {
                textarea.removeEventListener('input', handleInput);
                window.removeEventListener('resize', handleWindowResize);
                window.clearTimeout(resizeTimer);
                ro.disconnect();
            };
        }, []);

        const textareaStyle: React.CSSProperties = {
            ...style,
            overflowY: 'hidden',
            resize: 'vertical',
            height: 'auto',
            boxSizing: 'border-box',
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