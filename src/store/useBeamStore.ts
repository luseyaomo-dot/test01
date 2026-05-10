import { create } from 'zustand';
import { z } from 'zod';
import type { BeamParameters, DisplayOptions } from '../types';

const beamSchema = z.object({
  length: z.number().min(1000).max(30000),
  width: z.number().min(120).max(2000),
  height: z.number().min(200).max(3000),
  cover: z.number().min(10).max(120),
  seismicGrade: z.enum(['none', '1', '2', '3', '4']),
  topBarCount: z.number().int().min(1).max(20),
  topBarDiameter: z.number().min(6).max(50),
  bottomBarCount: z.number().int().min(1).max(20),
  bottomBarDiameter: z.number().min(6).max(50),
  waistBarCount: z.number().int().min(0).max(20),
  waistBarDiameter: z.number().min(6).max(40),
  stirrupDiameter: z.number().min(4).max(20),
  stirrupLegCount: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  stirrupSpacing: z.number().min(50).max(500),
  denseZoneSpacing: z.number().min(40).max(300),
  anchorageLength: z.number().min(0).max(2000),
  firstStirrupOffset: z.number().min(0).max(200),
});

export const defaultBeamParameters: BeamParameters = {
  length: 6000,
  width: 300,
  height: 600,
  cover: 25,
  seismicGrade: '2',
  topBarCount: 2,
  topBarDiameter: 20,
  bottomBarCount: 3,
  bottomBarDiameter: 22,
  waistBarCount: 2,
  waistBarDiameter: 12,
  stirrupDiameter: 8,
  stirrupLegCount: 4,
  stirrupSpacing: 200,
  denseZoneSpacing: 100,
  anchorageLength: 700,
  firstStirrupOffset: 50,
};

export const defaultDisplayOptions: DisplayOptions = {
  showConcrete: true,
  showWireframe: true,
  showTopBars: true,
  showBottomBars: true,
  showWaistBars: true,
  showStirrups: true,
  showInnerStirrups: true,
  concreteOpacity: 0.28,
};

type BeamStore = {
  parameters: BeamParameters;
  display: DisplayOptions;
  errors: Partial<Record<keyof BeamParameters, string>>;
  updateParameter: <K extends keyof BeamParameters>(key: K, value: BeamParameters[K]) => void;
  updateDisplay: <K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) => void;
  reset: () => void;
};

const validateParameters = (parameters: BeamParameters) => {
  const result = beamSchema.safeParse(parameters);
  if (result.success) {
    return {};
  }

  return result.error.issues.reduce<Partial<Record<keyof BeamParameters, string>>>((errors, issue) => {
    const key = issue.path[0] as keyof BeamParameters;
    errors[key] = issue.message;
    return errors;
  }, {});
};

export const useBeamStore = create<BeamStore>((set) => ({
  parameters: defaultBeamParameters,
  display: defaultDisplayOptions,
  errors: {},
  updateParameter: (key, value) =>
    set((state) => {
      const parameters = { ...state.parameters, [key]: value };
      return { parameters, errors: validateParameters(parameters) };
    }),
  updateDisplay: (key, value) =>
    set((state) => ({ display: { ...state.display, [key]: value } })),
  reset: () => set({ parameters: defaultBeamParameters, display: defaultDisplayOptions, errors: {} }),
}));
