// src/ui/theme.ts
import { tokens } from './tokens';

type TGradient = Readonly<[string, string]>; // exakt två färger

const brand = {
  primary: '#FF7C00',
  bgLight: '#f8f6f5',
  bgDark: '#181511',
};

export const lightColors = {
  bg: brand.bgLight,
  card: '#ffffff',
  text: '#0f172a',
  subtext: '#64748b',
  border: '#e2e8f0',
  shadow: 'rgba(0,0,0,0.08)',

  primary: brand.primary,
  primaryText: '#181511',

  badgeBlue: '#dbeafe',
  badgeYellow: '#fef3c7',
  badgeGreen: '#dcfce7',

  // Header / tabs
  header: '#f3f1ee',
  headerText: '#0f172a',
  headerGradient: ['#f3f1ee', '#efeae6'] as TGradient,
  tabGradient: ['#ffffff', '#ffffff'] as TGradient,
} as const;

export const darkColors = {
  bg: brand.bgDark,
  card: '#27211b',
  text: '#ffffff',
  subtext: '#baaf9c',
  border: '#3b342c',
  shadow: 'rgba(0,0,0,0.35)',

  primary: brand.primary,
  primaryText: brand.bgDark,

  badgeBlue: '#1e3a8a',
  badgeYellow: '#7c5e00',
  badgeGreen: '#14532d',

  // Header / tabs (mörk, med diskret grön ton)
  header: '#1f1c19',
  headerText: '#ffffff',
  headerGradient: ['#1f1c19', '#181511'] as TGradient,
  tabGradient: ['#1a1815', '#181511'] as TGradient,
} as const;

// ---- Tema-typning ----
export type Theme = typeof tokens & {
  name: 'light' | 'dark';
  colors: typeof lightColors; // darkColors har samma shape
};

export const light: Theme = {
  ...tokens,
  name: 'light',
  colors: lightColors,
};

export const dark: Theme = {
  ...tokens,
  name: 'dark',
  colors: darkColors,
};