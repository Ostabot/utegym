// src/contexts/current-run-context.tsx
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import type { WorkoutRunState } from '@/types/workout';

type Ctx = {
    run: WorkoutRunState | null;
    setRun: (next: WorkoutRunState | null) => Promise<void>;
    loading: boolean;
};

const CurrentRunContext = createContext<Ctx | undefined>(undefined);

export function CurrentRunProvider({ children }: { children: React.ReactNode }) {
    const [run, setRunState] = useState<WorkoutRunState | null>(null);
    const [loading] = useState(false); // vi använder inte loading just nu—håll den bara stabil

    const setRun = useCallback(async (next: WorkoutRunState | null) => {
        setRunState(next);
    }, []);

    const api = useMemo(() => ({ run, setRun, loading }), [run, setRun, loading]);

    useEffect(() => {
        console.log('[CurrentRunProvider] run changed:', run ? 'HAS RUN' : 'null');
    }, [run]);

    return <CurrentRunContext.Provider value={api}>{children}</CurrentRunContext.Provider>;
}

export function useCurrentRun() {
    const ctx = useContext(CurrentRunContext);
    if (!ctx) throw new Error('useCurrentRun must be used inside <CurrentRunProvider>');
    return ctx;
}

export default CurrentRunProvider;