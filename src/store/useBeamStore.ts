import { create } from 'zustand';
import { z } from 'zod';
import type { AnnotationDisplay, BeamParameters, ColumnParameters, ComponentType, DisplayOptions, FrameParameters, LoadInputs, MechanicsDisplayOptions, SlabParameters } from '../types';

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

export const defaultColumnParameters: ColumnParameters = {
  height: 3600,
  width: 500,
  depth: 500,
  cover: 25,
  seismicGrade: '2',
  cornerBarDiameter: 22,
  sideBarsX: 2,
  sideBarsZ: 2,
  sideBarDiameter: 20,
  stirrupDiameter: 10,
  stirrupLegCount: 4,
  stirrupSpacing: 200,
  denseZoneSpacing: 100,
  firstStirrupOffset: 50,
  clearHeightRatio: 6,
};

export const defaultFrameParameters: FrameParameters = {
  spanLn: 5000,
  columnHeight: 3600,
  beamHeight: 600,
  beamWidth: 300,
  columnWidth: 500,
  columnDepth: 500,
  cover: 25,
  seismicGrade: '2',
  topBarCount: 2,
  topBarDiameter: 22,
  bottomBarCount: 3,
  bottomBarDiameter: 25,
  waistBarCount: 2,
  waistBarDiameter: 12,
  beamStirrupDiameter: 8,
  beamStirrupLegCount: 4,
  beamStirrupSpacing: 200,
  beamDenseSpacing: 100,
  cornerBarDiameter: 25,
  sideBarsX: 2,
  sideBarsZ: 2,
  sideBarDiameter: 22,
  columnStirrupDiameter: 10,
  columnStirrupLegCount: 4,
  columnStirrupSpacing: 200,
  columnDenseSpacing: 100,
  firstStirrupOffset: 50,
  jointCoreSpacing: 100,
};

export const defaultSlabParameters: SlabParameters = {
  length: 4000,
  width: 3000,
  thickness: 120,
  cover: 15,
  bottomBarXDiameter: 8,
  bottomBarXSpacing: 200,
  bottomBarZDiameter: 8,
  bottomBarZSpacing: 200,
  topBarXDiameter: 8,
  topBarXSpacing: 200,
  topBarZDiameter: 8,
  topBarZSpacing: 200,
  anchorageRatio: 12,
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

export const defaultLoadInputs: LoadInputs = {
  q: 20,
  H: 0,
};

export const defaultMechanicsDisplay: MechanicsDisplayOptions = {
  show: true,
  showMoment: true,
  showShear: true,
  showAxial: false,
  showLabels: true,
  highlightTension: true,
};

export const defaultAnnotationDisplay: AnnotationDisplay = {
  master: true,
  span: true,
  section: true,
  support: false,
  anchor: false,
  joint: false,
  columnDense: false,
  beamDense: false,
};

type BeamStore = {
  componentType: ComponentType;
  parameters: BeamParameters;
  column: ColumnParameters;
  frame: FrameParameters;
  slab: SlabParameters;
  display: DisplayOptions;
  loads: LoadInputs;
  mechanicsDisplay: MechanicsDisplayOptions;
  annotationDisplay: AnnotationDisplay;
  errors: Partial<Record<keyof BeamParameters, string>>;
  setComponentType: (type: ComponentType) => void;
  updateParameter: <K extends keyof BeamParameters>(key: K, value: BeamParameters[K]) => void;
  applyParameters: (patch: Partial<BeamParameters>) => void;
  updateColumnParameter: <K extends keyof ColumnParameters>(key: K, value: ColumnParameters[K]) => void;
  updateFrameParameter: <K extends keyof FrameParameters>(key: K, value: FrameParameters[K]) => void;
  updateSlabParameter: <K extends keyof SlabParameters>(key: K, value: SlabParameters[K]) => void;
  updateDisplay: <K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) => void;
  updateLoad: <K extends keyof LoadInputs>(key: K, value: LoadInputs[K]) => void;
  updateMechanicsDisplay: <K extends keyof MechanicsDisplayOptions>(key: K, value: MechanicsDisplayOptions[K]) => void;
  updateAnnotationDisplay: <K extends keyof AnnotationDisplay>(key: K, value: AnnotationDisplay[K]) => void;
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
  componentType: 'frame',
  parameters: defaultBeamParameters,
  column: defaultColumnParameters,
  frame: defaultFrameParameters,
  slab: defaultSlabParameters,
  display: defaultDisplayOptions,
  loads: defaultLoadInputs,
  mechanicsDisplay: defaultMechanicsDisplay,
  annotationDisplay: defaultAnnotationDisplay,
  errors: {},
  setComponentType: (type) => set({ componentType: type }),
  updateParameter: (key, value) =>
    set((state) => {
      const parameters = { ...state.parameters, [key]: value };
      return { parameters, errors: validateParameters(parameters) };
    }),
  applyParameters: (patch) =>
    set((state) => {
      const parameters = { ...state.parameters, ...patch };
      return { parameters, errors: validateParameters(parameters) };
    }),
  updateColumnParameter: (key, value) =>
    set((state) => ({ column: { ...state.column, [key]: value } })),
  updateFrameParameter: (key, value) =>
    set((state) => ({ frame: { ...state.frame, [key]: value } })),
  updateSlabParameter: (key, value) =>
    set((state) => ({ slab: { ...state.slab, [key]: value } })),
  updateDisplay: (key, value) =>
    set((state) => ({ display: { ...state.display, [key]: value } })),
  updateLoad: (key, value) =>
    set((state) => ({ loads: { ...state.loads, [key]: value } })),
  updateMechanicsDisplay: (key, value) =>
    set((state) => ({ mechanicsDisplay: { ...state.mechanicsDisplay, [key]: value } })),
  updateAnnotationDisplay: (key, value) =>
    set((state) => ({ annotationDisplay: { ...state.annotationDisplay, [key]: value } })),
  reset: () =>
    set({
      componentType: 'frame',
      parameters: defaultBeamParameters,
      column: defaultColumnParameters,
      frame: defaultFrameParameters,
      slab: defaultSlabParameters,
      display: defaultDisplayOptions,
      loads: defaultLoadInputs,
      mechanicsDisplay: defaultMechanicsDisplay,
      annotationDisplay: defaultAnnotationDisplay,
      errors: {},
    }),
}));
