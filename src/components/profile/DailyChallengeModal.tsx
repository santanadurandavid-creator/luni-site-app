'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { DailyChallenge, UserChallengeAttempt, QuizQuestion } from '@/lib/types';
import { format, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Gamepad2, Timer, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

// --- Word Search Game Logic ---
const generateGrid = (size: number, words: string[]): { grid: string[][], placedWords: string[] } => {
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const placedWords: string[] = [];
    const directions = [
        { x: 1, y: 0 }, // Horizontal
        { x: 0, y: 1 }, // Vertical
        { x: 1, y: 1 }, // Diagonal down-right
    ];

    const fits = (word: string, r: number, c: number, dir: { x: number; y: number }) => {
        if (r + word.length * dir.y > size || c + word.length * dir.x > size) return false;
        for (let i = 0; i < word.length; i++) {
            const char = grid[r + i * dir.y][c + i * dir.x];
            if (char !== '' && char !== word[i]) return false;
        }
        return true;
    };

    const place = (word: string, r: number, c: number, dir: { x: number; y: number }) => {
        for (let i = 0; i < word.length; i++) {
            grid[r + i * dir.y][c + i * dir.x] = word[i];
        }
    };

    // Sort words by length descending
    words.sort((a, b) => b.length - a.length);

    words.forEach(word => {
        const uppercaseWord = word.toUpperCase();
        let placed = false;
        for (let i = 0; i < 100 && !placed; i++) { // 100 attempts to place
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const r = Math.floor(Math.random() * size);
            const c = Math.floor(Math.random() * size);

            if (fits(uppercaseWord, r, c, dir)) {
                place(uppercaseWord, r, c, dir);
                placed = true;
                placedWords.push(uppercaseWord);
            }
        }
    });

    // Fill empty cells
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }

    return { grid, placedWords };
};

// --- WordSearchGame Component ---
const WordSearchGame = ({ challenge, onGameEnd }: { challenge: DailyChallenge, onGameEnd: (score: number) => void }) => {
    const { words: wordList, gridSize } = challenge as unknown as { words: string; gridSize: number };
    const words = useMemo(() => wordList.toUpperCase().split(',').map(w => w.trim()).filter(w => w.length >= 3 && w.length <= 10), [wordList]);
    
    const [{ grid, placedWords }, setGridData] = useState<{ grid: string[][], placedWords: string[] }>({ grid: [], placedWords: [] });
    const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
    const [selection, setSelection] = useState<{ start: [number, number] | null, end: [number, number] | null }>({ start: null, end: null });
    
    useEffect(() => {
        setGridData(generateGrid(gridSize, words));
    }, [words, gridSize]);

    const getSelectedCells = () => {
        const cells = new Set<string>();
        if (!selection.start || !selection.end) return cells;
        const [r1, c1] = selection.start;
        const [r2, c2] = selection.end;
        if (r1 === r2) { // Horizontal
            for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) cells.add(`${r1},${c}`);
        } else if (c1 === c2) { // Vertical
            for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) cells.add(`${r},${c1}`);
        } else if (Math.abs(r1 - r2) === Math.abs(c1 - c2)) { // Diagonal
            const rDir = r1 < r2 ? 1 : -1;
            const cDir = c1 < c2 ? 1 : -1;
            for (let i = 0; i <= Math.abs(r1 - r2); i++) cells.add(`${r1 + i * rDir},${c1 + i * cDir}`);
        }
        return cells;
    };

    const handleMouseUp = () => {
        if (!selection.start || !selection.end) return;
        let selectedWord = "";
        const [r1, c1] = selection.start;
        const [r2, c2] = selection.end;

        if (r1 === r2) { // Horizontal
            for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) selectedWord += grid[r1][c];
        } else if (c1 === c2) { // Vertical
            for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) selectedWord += grid[r][c1];
        } else if (Math.abs(r1 - r2) === Math.abs(c1 - c2)) { // Diagonal
            const rDir = r1 < r2 ? 1 : -1;
            const cDir = c1 < c2 ? 1 : -1;
            for (let i = 0; i <= Math.abs(r1 - r2); i++) selectedWord += grid[r1 + i * rDir][c1 + i * cDir];
        }

        const reversedWord = selectedWord.split('').reverse().join('');
        if (placedWords.includes(selectedWord) || placedWords.includes(reversedWord)) {
            const wordToFind = placedWords.includes(selectedWord) ? selectedWord : reversedWord;
            const newFoundWords = new Set(foundWords).add(wordToFind);
            setFoundWords(newFoundWords);
            if(newFoundWords.size === placedWords.length) {
                onGameEnd(placedWords.length * 10);
            }
        }
        setSelection({ start: null, end: null });
    };

    if (grid.length === 0) return <Loader2 className="animate-spin" />;

    return (
        <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full" onMouseUp={handleMouseUp} onMouseLeave={() => setSelection({ start: null, end: null })}>
                 <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                    {grid.map((row, r) => row.map((cell, c) => (
                        <div
                            key={`${r}-${c}`}
                            className={cn(
                                "aspect-square flex items-center justify-center font-bold text-sm md:text-base border rounded-md cursor-pointer select-none",
                                getSelectedCells().has(`${r},${c}`) ? 'bg-primary/50 text-primary-foreground' : 'bg-muted/50'
                            )}
                            onMouseDown={() => setSelection({ start: [r, c], end: null })}
                            onMouseEnter={() => selection.start && setSelection(s => ({ ...s, end: [r, c] }))}
                        >
                            {cell}
                        </div>
                    )))}
                </div>
            </div>
            <div className="w-full md:w-48">
                <h4 className="font-bold mb-2">Palabras a encontrar:</h4>
                <ul className="space-y-1">
                    {placedWords.map(word => (
                        <li key={word} className={cn("text-sm", foundWords.has(word) && 'line-through text-muted-foreground')}>
                            {word}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


interface DailyChallengeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// --- Hangman Game Component ---
const HangmanGame = ({ challenge, onGameEnd }: { challenge: DailyChallenge, onGameEnd: (score: number) => void }) => {
    const { word, hint } = challenge as unknown as { word: string; hint: string };
    const normalizedWord = useMemo(() => word.toUpperCase().replace(/[^A-Z]/g, ''), [word]);
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [mistakes, setMistakes] = useState(0);
    const maxMistakes = 6;
    const isWon = useMemo(() => [...normalizedWord].every(letter => guessedLetters.has(letter)), [normalizedWord, guessedLetters]);
    const isLost = useMemo(() => mistakes >= maxMistakes, [mistakes]);

    const handleGuess = (letter: string) => {
        if (isWon || isLost || guessedLetters.has(letter)) return;

        const newGuessedLetters = new Set(guessedLetters).add(letter);
        setGuessedLetters(newGuessedLetters);

        if (!normalizedWord.includes(letter)) {
            setMistakes(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (isWon) {
            onGameEnd(100 - mistakes * 10); // Score based on mistakes
        }
        if (isLost) {
            onGameEnd(0);
        }
    }, [isWon, isLost, onGameEnd, mistakes]);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">Pista: {hint}</p>
            <div className="flex gap-2 text-2xl md:text-3xl font-bold font-mono tracking-widest">
                {[...word.toUpperCase()].map((letter, index) => (
                    <span key={index} className="w-8 h-10 md:w-10 md:h-12 border-b-4 flex items-center justify-center">
                        {letter.match(/[^A-Z]/) ? letter : (guessedLetters.has(letter) ? letter : '_')}
                    </span>
                ))}
            </div>
            <p className="text-sm text-destructive">Errores: {mistakes} / {maxMistakes}</p>
             <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {alphabet.map(letter => (
                    <Button 
                        key={letter}
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleGuess(letter)}
                        disabled={guessedLetters.has(letter) || isWon || isLost}
                    >
                        {letter}
                    </Button>
                ))}
            </div>
        </div>
    );
};

// --- Quiz Game Component ---
const QuizGame = ({ challenge, onGameEnd }: { challenge: DailyChallenge, onGameEnd: (score: number) => void }) => {
    const { questions } = challenge as { questions: QuizQuestion[] };
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    
    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswer = (optionIndex: number) => {
        if (isAnswered) return;
        setSelectedOption(optionIndex);
        setIsAnswered(true);
        if (currentQuestion.options[optionIndex].isCorrect) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        const isLastQuestion = currentQuestionIndex === questions.length - 1;
        setIsAnswered(false);
        setSelectedOption(null);
        if (!isLastQuestion) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
         // Score for next question needs to be calculated before finishing
        if (isLastQuestion) {
            onGameEnd(Math.round(((isAnswered && currentQuestion.options[selectedOption!].isCorrect ? score + 1 : score) / questions.length) * 100));
        }
    };
    
    // Adjusted to handle end of quiz from next button
     useEffect(() => {
        if (isAnswered && currentQuestionIndex === questions.length - 1) {
            // onGameEnd(Math.round((score / questions.length) * 100));
        }
    }, [isAnswered, currentQuestionIndex, questions.length, score, onGameEnd]);


    return (
        <div className="w-full max-w-md mx-auto text-center">
            <p className="text-sm text-muted-foreground mb-2">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>
            <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
            <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, index) => {
                    const isCorrect = option.isCorrect;
                    const isSelected = selectedOption === index;
                    return (
                        <Button
                            key={index}
                            variant="outline"
                            className={cn("h-auto justify-start text-left whitespace-normal",
                                isAnswered && isCorrect && "bg-green-100 border-green-500 text-green-800",
                                isAnswered && isSelected && !isCorrect && "bg-red-100 border-destructive text-destructive"
                            )}
                            onClick={() => handleAnswer(index)}
                            disabled={isAnswered}
                        >
                           {option.text}
                        </Button>
                    );
                })}
            </div>
            {isAnswered && (
                 <Button onClick={handleNext} className="mt-6">
                    {currentQuestionIndex < questions.length - 1 ? "Siguiente" : "Finalizar"}
                </Button>
            )}
        </div>
    );
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
};
// This component is no longer used, but kept in case it's needed again.
// The main logic has been removed from profile page.
export function DailyChallengeModal({ isOpen, setIsOpen }: DailyChallengeModalProps) { return null; }
