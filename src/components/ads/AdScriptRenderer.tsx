import React, { useEffect, useRef } from 'react';

interface AdScriptRendererProps {
    script: string;
}

export const AdScriptRenderer: React.FC<AdScriptRendererProps> = ({ script }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && script) {
            // Clear previous content
            containerRef.current.innerHTML = '';

            try {
                // Create a range to create a fragment from the string
                // createContextualFragment executes scripts found in the string
                const range = document.createRange();
                range.selectNode(containerRef.current);
                const documentFragment = range.createContextualFragment(script);

                // Append the fragment
                containerRef.current.appendChild(documentFragment);
            } catch (error) {
                console.error('Error rendering ad script:', error);
                containerRef.current.innerHTML = '<div class="text-xs text-red-500">Error rendering ad</div>';
            }
        }
    }, [script]);

    return <div ref={containerRef} className="w-full flex justify-center overflow-hidden" />;
};
