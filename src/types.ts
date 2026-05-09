export type BeamParameters = {
  length: number;
  width: number;
  height: number;
  cover: number;
  topBarCount: number;
  topBarDiameter: number;
  bottomBarCount: number;
  bottomBarDiameter: number;
  waistBarCount: number;
  waistBarDiameter: number;
  stirrupDiameter: number;
  stirrupSpacing: number;
  denseZoneLength: number;
  denseZoneSpacing: number;
  stirrupHookLength: number;
};

export type DisplayOptions = {
  showConcrete: boolean;
  showWireframe: boolean;
  showTopBars: boolean;
  showBottomBars: boolean;
  showWaistBars: boolean;
  showStirrups: boolean;
  concreteOpacity: number;
};

export type RebarLine = {
  id: string;
  category: 'top' | 'bottom' | 'waist';
  diameter: number;
  start: [number, number, number];
  end: [number, number, number];
};

export type StirrupPath = {
  id: string;
  diameter: number;
  points: [number, number, number][];
  hooks: [number, number, number][][];
};

export type BeamGeometryData = {
  concrete: {
    length: number;
    width: number;
    height: number;
  };
  rebars: RebarLine[];
  stirrups: StirrupPath[];
  stats: {
    topBars: number;
    bottomBars: number;
    waistBars: number;
    stirrups: number;
  };
};
