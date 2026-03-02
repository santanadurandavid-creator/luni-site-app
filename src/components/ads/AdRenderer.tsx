'use client';

import React, { useEffect, useRef } from 'react';
import { Advertisement } from '@/lib/types';

interface AdRendererProps {
    ad: Advertisement;
    className?: string;
}

export function AdRenderer({ ad, className = '' }: AdRendererProps) {
    const adRef = useRef<HTMLDivElement>(null);
    const isModal = ad.placement === 'modal';

    useEffect(() => {
        if (ad.type === 'script' && ad.scriptContent && adRef.current) {
            adRef.current.innerHTML = ad.scriptContent;
            const scripts = adRef.current.querySelectorAll('script');
            scripts.forEach((oldScript) => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach((attr) =>
                    newScript.setAttribute(attr.name, attr.value)
                );
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            });
        }
    }, [ad]);

    if (ad.type === 'image' && ad.imageUrl) {
        return (
            <div className={`w-full flex justify-center items-center ${className}`}>
                <a
                    href={ad.clickUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block mx-auto transition-all duration-300 overflow-hidden rounded-lg shadow-md hover:shadow-lg border border-white/10
                    ${isModal
                            ? 'w-[90vw] md:w-[60vh] h-[50vh] md:h-[60vh]' // Modal: Large, roughly square/portrait friendly or landscape. Fixed height ensures presence.
                            : 'w-[75%] md:w-[35%] h-[8vh] md:h-[10vh]'    // Banner: Small strip
                        }`}
                >
                    <img
                        src={ad.imageUrl}
                        alt={ad.name}
                        className={`w-full h-full bg-white/95 ${isModal ? 'object-contain' : 'object-fill'}`}
                    // Modal: contain to not crop info. Banner: fill to fit strict strip.
                    />
                </a>
            </div>
        );
    }

    if (ad.type === 'script' && ad.scriptContent) {
        return (
            <div
                ref={adRef}
                className={`flex justify-center items-center mx-auto transition-all duration-300 overflow-hidden ${className}
                ${isModal
                        ? 'w-[90vw] md:w-[60vh] min-h-[50vh] md:min-h-[60vh]'
                        : 'w-[75%] md:w-[35%] min-h-[8vh] md:min-h-[10vh]'
                    }`}
            />
        );
    }

    return null;
}
