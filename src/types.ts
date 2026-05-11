export type SeismicGrade = 'none' | '1' | '2' | '3' | '4';
export type StirrupLegCount = 2 | 4 | 6;
export type ComponentType = 'beam' | 'column' | 'frame' | 'slab';

export type SlabParameters = {
  length: number;        // X (mm)
  width: number;         // Z (mm)
  thickness: number;     // Y (mm)
  cover: number;
  bottomBarXDiameter: number;
  bottomBarXSpacing: number;
  bottomBarZDiameter: number;
  bottomBarZSpacing: number;
  topBarXDiameter: number;
  topBarXSpacing: number;
  topBarZDiameter: number;
  topBarZSpacing: number;
  anchorageRatio: number; // 顶筋弯锚长度 = anchorageRatio * d (典型 12)
};

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
  jointCoreSpacing: number;             // 节点核心区箍筋间距 mm
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

export type LoadInputs = {
  q: number;   // kN/m, 梁均布竖向荷载 (含自重等效)
  H: number;   // kN, 梁顶水平节点荷载, 作用在左节点, 向右为正
};

export type AnnotationDisplay = {
  master: boolean;
  span: boolean;
  section: boolean;
  support: boolean;
  anchor: boolean;
  joint: boolean;
  columnDense: boolean;
  beamDense: boolean;
};

export type MechanicsDisplayOptions = {
  show: boolean;            // 是否显示 2D 内力图层
  showMoment: boolean;
  showShear: boolean;
  showAxial: boolean;
  showLabels: boolean;
  highlightTension: boolean;
};

export type ColumnForceProfile = {
  M_top: number; M_bot: number; V: number; N: number;
  M_max: number;
  samples: { y: number; M: number; V: number; N: number }[];
  height: number;
};

export type FrameForces = {
  beam: {
    M_left: number; M_mid: number; M_right: number;
    V_left: number; V_right: number;
    M_max_pos: number;
    M_max_neg: number;
    V_max: number;
    samples: { x: number; M: number; V: number }[];
    length: number;
  };
  column: { left: ColumnForceProfile; right: ColumnForceProfile };
  inputs: LoadInputs;
};

export type DesignAdvice = {
  beam: {
    AsTop_support: number;
    AsBot_mid: number;
    suggestedTop: { count: number; diameter: number; provided: number };
    suggestedBot: { count: number; diameter: number; provided: number };
    stirrupSpacingDense: number;
    stirrupSpacingNormal: number;
    notes: string[];
  };
  column: {
    As_total: number;
    suggestedCorner: { diameter: number };
    stirrupSpacingDense: number;
    notes: string[];
  };
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
  kind: 'outer' | 'inner' | 'joint';
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
