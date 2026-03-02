
'use client';
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: 'normal' | 'large';
}

export function Logo({ className, size = 'normal' }: LogoProps) {

  const containerClasses = cn(
    "text-center text-primary-foreground",
    className
  );

  const titleClasses = cn(
    "font-thin tracking-wider relative text-white",
    size === 'normal' && "text-6xl",
    size === 'large' && "text-7xl",
  );
  
  const dotClasses = cn(
    "absolute text-[#FF4081]",
     size === 'normal' && "top-1 -right-2 text-5xl",
     size === 'large' && "top-1 -right-3 text-6xl",
  );

  const subtitleClasses = cn(
    "font-light text-white/80",
    size === 'normal' && "text-lg tracking-[0.4em]",
    size === 'large' && "text-xl tracking-[0.45em]",
  );


  return (
    <div className={containerClasses}>
        <h1 className={titleClasses}>
            Luni
            <span className={dotClasses}>.</span>
        </h1>
        <p className={subtitleClasses}>SITE</p>
    </div>
  );
}
