'use client';

import { useEffect, useRef } from 'react';

interface Bubble {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
}

export function BouncingBubbles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bubblesRef = useRef<Bubble[]>([]);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initialize bubbles with the app's primary blue color in different shades
        const colors = [
            'rgba(74, 111, 165, 0.12)',  // primary blue (hsl 212, 35%, 45%) - base
            'rgba(104, 141, 195, 0.1)',  // lighter primary blue (hsl 212, 35%, 55%)
            'rgba(134, 171, 225, 0.15)', // even lighter (hsl 212, 35%, 65%)
            'rgba(164, 201, 255, 0.12)', // very light (hsl 212, 35%, 75%)
            'rgba(194, 221, 255, 0.1)',  // almost white blue (hsl 212, 35%, 85%)
            'rgba(224, 241, 255, 0.08)', // very pale blue (hsl 212, 35%, 95%)
        ];

        bubblesRef.current = Array.from({ length: 20 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2.5, // Velocity between -1.25 and 1.25
            vy: (Math.random() - 0.5) * 2.5,
            radius: 30 + Math.random() * 30, // Radius between 30 and 60 (much larger!)
            color: colors[Math.floor(Math.random() * colors.length)],
        }));

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            bubblesRef.current.forEach((bubble) => {
                // Update position
                bubble.x += bubble.vx;
                bubble.y += bubble.vy;

                // Bounce off walls
                if (bubble.x - bubble.radius <= 0 || bubble.x + bubble.radius >= canvas.width) {
                    bubble.vx *= -1;
                    // Keep bubble within bounds
                    bubble.x = Math.max(bubble.radius, Math.min(canvas.width - bubble.radius, bubble.x));
                }
                if (bubble.y - bubble.radius <= 0 || bubble.y + bubble.radius >= canvas.height) {
                    bubble.vy *= -1;
                    // Keep bubble within bounds
                    bubble.y = Math.max(bubble.radius, Math.min(canvas.height - bubble.radius, bubble.y));
                }

                // Draw bubble with enhanced gradient
                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
                ctx.fillStyle = bubble.color;
                ctx.fill();

                // Add very subtle glow effect
                const gradient = ctx.createRadialGradient(
                    bubble.x - bubble.radius * 0.3,
                    bubble.y - bubble.radius * 0.3,
                    0,
                    bubble.x,
                    bubble.y,
                    bubble.radius
                );
                // Very subtle gradient stops - barely visible
                gradient.addColorStop(0, bubble.color.replace(/[\d.]+\)$/, '0.2)'));
                gradient.addColorStop(0.5, bubble.color);
                gradient.addColorStop(1, bubble.color.replace(/[\d.]+\)$/, '0.02)'));
                ctx.fillStyle = gradient;
                ctx.fill();
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ mixBlendMode: 'normal' }}
        />
    );
}
