import { useRef, useLayoutEffect, forwardRef } from 'react';

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    minRows?: number;
    maxRows?: number;
}

export const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
    function AutoExpandingTextarea({ value, onChange, placeholder, minRows = 1, maxRows = 60, style, ...props }, ref) {
        const internalRef = useRef<HTMLTextAreaElement | null>(null);
        const combinedRef = ref ? ((ref as React.RefObject<HTMLTextAreaElement>) || internalRef) : internalRef;
        const isUserResizing = useRef(false);

        useLayoutEffect(() => {
            const textarea = combinedRef.current;
            if (!textarea) return;
            if (isUserResizing.current) return;

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

            if (newHeight > maxHeight) {
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.overflowY = 'hidden';
            }

            textarea.style.height = `${newHeight}px`;
        }, [value, minRows, maxRows, combinedRef]);

        useLayoutEffect(() => {
            const textarea = combinedRef.current;
            if (!textarea) return;

            let resizeTimeout: number | undefined;

            const handleInput = () => {
                isUserResizing.current = false;
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

                if (newHeight > maxHeight) {
                    textarea.style.overflowY = 'auto';
                } else {
                    textarea.style.overflowY = 'hidden';
                }

                textarea.style.height = `${newHeight}px`;
            };

            const handleMouseDown = (e: MouseEvent) => {
                const rect = textarea.getBoundingClientRect();
                const inResizeZone = e.clientY >= rect.bottom - 20 && e.clientY <= rect.bottom + 5;
                if (inResizeZone) {
                    isUserResizing.current = true;
                }
            };

            const handleMouseUp = () => {
                if (isUserResizing.current) {
                    isUserResizing.current = false;
                    handleInput();
                }
            };

            textarea.addEventListener('input', handleInput);
            textarea.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mouseup', handleMouseUp);

            const handleWindowResize = () => {
                if (resizeTimeout) window.clearTimeout(resizeTimeout);
                resizeTimeout = window.setTimeout(() => {
                    isUserResizing.current = false;
                    handleInput();
                }, 100);
            };
            window.addEventListener('resize', handleWindowResize);

            return () => {
                textarea.removeEventListener('input', handleInput);
                textarea.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('resize', handleWindowResize);
                if (resizeTimeout) window.clearTimeout(resizeTimeout);
            };
        }, [minRows, maxRows, combinedRef]);

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