// src/lib/workout.ts
export type Intensity = 'light' | 'medium' | 'hard';
export type Focus = 'full' | 'upper' | 'lower' | 'core' | 'cardio';
export type DurationKey = '5' | '10' | '15' | '30' | '45';

export type PlanInput = {
    duration: DurationKey;
    intensity: Intensity;
    focus: Focus;
    // keys från utrustning (t.ex. ['pullup_bar', 'dip_bar'])
    equipmentKeys: string[];
};

type CandidateExercise = {
    id: string;
    name: string;
    focus: Focus;
    req?: string[]; // kräver utrustning (keys)
};

// hur många övningar per längd
const perDuration: Record<DurationKey, { exercises: number }> = {
    '5': { exercises: 3 },
    '10': { exercises: 5 },
    '15': { exercises: 8 },
    '30': { exercises: 12 },
    '45': { exercises: 16 },
};

// ett minimalt “bibliotek” – byt till din datakälla om du har
const CANDIDATES: CandidateExercise[] = [
    { id: 'ex_pushups', name: 'Armhävningar', focus: 'upper' },
    { id: 'ex_squats', name: 'Knäböj', focus: 'lower' },
    { id: 'ex_plank', name: 'Plankan', focus: 'core' },
    { id: 'ex_burpees', name: 'Burpees', focus: 'full' },
    { id: 'ex_dips', name: 'Dips', focus: 'upper', req: ['dip_bar'] },
    { id: 'ex_pullups', name: 'Chins/Pull-ups', focus: 'upper', req: ['pullup_bar'] },
    { id: 'ex_stepups', name: 'Step-ups', focus: 'lower', req: ['box'] },
    { id: 'ex_mountain', name: 'Mountain climbers', focus: 'cardio' },
];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function generatePlan(opts: PlanInput) {
    // 1) Bas-filter på utrustning
    const canUse = (ex: CandidateExercise) =>
        !ex.req || ex.req.every((k) => opts.equipmentKeys.includes(k));

    // 2) Viktning på fokus: prioriterat = fler kandidater överst
    const weighted = [
        ...CANDIDATES.filter((c) => c.focus === opts.focus),
        ...CANDIDATES.filter((c) => c.focus !== opts.focus),
    ].filter(canUse);

    const candidates = shuffle(weighted);

    // 3) Antal övningar utifrån tid – robust fallback vid okänt key
    const cfg = perDuration[opts.duration] ?? { exercises: 5 };

    // 4) Välj unika övningar
    const chosen = candidates.slice(0, cfg.exercises);

    return chosen.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        // ett enkelt recept baserat på intensitet (kan förstås förbättras)
        prescription:
            opts.intensity === 'hard'
                ? { sets: 4, reps: 12 }
                : opts.intensity === 'medium'
                    ? { sets: 3, reps: 10 }
                    : { sets: 2, reps: 8 },
    }));
}