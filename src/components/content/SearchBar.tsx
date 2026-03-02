'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  return (
    <div className={cn("relative w-full max-w-md", className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por título o materia..."
          onChange={(e) => onSearch(e.target.value)}
          className="pl-10"
        />
    </div>
  );
}
