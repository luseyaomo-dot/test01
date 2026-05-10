export type SeismicGrade = 'none' | '1' | '2' | '3' | '4';
export type StirrupLegCount = 2 | 4 | 6;
export type ComponentType = 'beam' | 'column' | 'frame';

export type ConcreteBox = {
  id: string;
  label?: string;
  size: [number, number, number];      // [X, Y, Z] meters
  position: [number, number, number];  // center in meters
};

export type FrameParameters = {
  spanLn: number;                       // 净跨 mm
  columnHeight: number;                 // 柱总高 mm
  beamHeight: number;                   // 梁高 mm
  beamWidth: number;                    // 梁宽 mm
  columnWidth: number;                  // b
  columnDepth: number;                  // h
  cover: number;
  seismicGrade: SeismicGrade;
  // 梁
  topBarCount: number;
  topBarDiameter: number;
  bottomBarCount: number;
  bottomBarDiameter: number;
  waistBarCount: number;
  waistBarDiameter: number;
  beamStirrupDiameter: number;
  beamStirrupLegCount: StirrupLegCount;
  beamStirrupSpacing: number;
  beamDenseSpacing: number;
  // 柱
  cornerBarDiameter: number;
  sideBarsX: number;
  sideBarsZ: number;
  sideBarDiameter: number;
  columnStirrupDiameter: number;
  columnStirrupLegCount: StirrupLegCount;
  columnStirrupSpacing: number;
  columnDenseSpacing: number;
  firstStirrupOffset: number;
};

export type ColumnParameters = {
  height: number;          // 柱总高 (mm)
  width: number;           // b: X 方向 (mm)
  depth: number;           // h: Z 方向 (mm)
  cover: number;
  seismicGrade: SeismicGrade;
  cornerBarDiameter: number;       // 角筋直径
  sideBarsX: number;               // X 边一侧的中部纵筋根数
  sideBarsZ: number;               // Z 边一侧的中部纵筋根数
  sideBarDiameter: number;
  stirrupDiameter: number;
  stirrupLegCount: StirrupLegCount;
  stirrupSpacing: number;
  denseZoneSpacing: number;
  firstStirrupOffset: number;
  clearHeightRatio: number;        // 节点加密区取 max(h, Hn/clearHeightRatio, 500)，默认 6
};

export type BeamParameters = {
  length: number;
  width: number;
  height: number;
  cover: number;
  seismicGrade: SeismicGrade;
  topBarCount: number;
  topBarDiameter: number;
  bottomBarCount: number;
  bottomBarDiameter: number;
  waistBarCount: number;
  waistBarDiameter: number;
  stirrupDiameter: number;
  stirrupLegCount: StirrupLegCount;
  stirrupSpacing: number;
  denseZoneSpacing: number;
  anchorageLength: number;
  firstStirrupOffset: number;
};

export type DisplayOptions = {
  showConcrete: boolean;
  showWireframe: boolean;
  showTopBars: boolean;
  showBottomBars: boolean;
  showWaistBars: boolean;
  showStirrups: boolean;
  showInnerStirrups: boolean;
  concreteOpacity: number;
};

export type RebarLine = {
  id: string;
  category: 'top' | 'bottom' | 'waist';
  diameter: number;
  start: [number, number, number];
  end: [number, number, number];
};

export type RebarHook = {
  id: string;
  category: 'top' | 'bottom';
  diameter: number;
  points: [number, number, number][];
};

export type StirrupPath = {
  id: string;
  diameter: number;
  kind: 'outer' | 'inner';
  points: [number, number, number][];
  hooks: [number, number, number][][];
};

export type BeamGeometryData = {
  concretes: ConcreteBox[];
  rebars: RebarLine[];
  rebarHooks: RebarHook[];
  stirrups: StirrupPath[];
  bounds: {
    length: number;   // X 方向总跨度
    height: number;   // Y 方向总高
    width: number;    // Z 方向总宽
  };
  stats: {
    topBars: number;
    bottomBars: number;
    waistBars: number;
    stirrups: number;
    legCount: number;
    denseZoneLength: number;
    hookLength: number;
  };
};
