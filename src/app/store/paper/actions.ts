import { CursorType, ToolMode } from 'app/model/paper';
import { Point } from 'app/scripts/common';
import { Action } from 'app/store/ngrx';

export enum PaperActionTypes {
  SetToolMode = '__paper__SET_TOOL_MODE',
  SetSelectionBox = '__paper__SET_SELECTION_BOX',
  SetCreatePathInfo = '__paper__SET_CREATE_PATH_INFO',
  SetSplitCurveInfo = '__paper__SET_SPLIT_CURVE_INFO',
  SetFocusedPathInfo = '__paper__SET_FOCUSED_PATH_INFO',
  SetRotateItemsInfo = '__paper__SET_ROTATE_ITEMS_INFO',
  SetTransformPathInfo = '__paper__SET_TRANSFORM_PATHS_INFO',
  SetCursorType = '__paper__SET_CANVAS_CURSOR',
  SetSnapGuideInfo = '__paper__SET_SNAP_GUIDE_INFO',
  SetZoomPanInfo = '__paper__SET_ZOOM_PAN_INFO',
  SetTooltipInfo = '__paper__SET_TOOLTIP_INFO',
}

export class SetToolMode implements Action {
  readonly type = PaperActionTypes.SetToolMode;
  constructor(readonly toolMode: ToolMode) {}
}

export class SetSelectionBox implements Action {
  readonly type = PaperActionTypes.SetSelectionBox;
  constructor(readonly selectionBox: SelectionBox | undefined) {}
}

export class SetCreatePathInfo implements Action {
  readonly type = PaperActionTypes.SetCreatePathInfo;
  constructor(readonly createPathInfo: CreatePathInfo | undefined) {}
}

export class SetSplitCurveInfo implements Action {
  readonly type = PaperActionTypes.SetSplitCurveInfo;
  constructor(readonly splitCurveInfo: SplitCurveInfo | undefined) {}
}

export class SetFocusedPathInfo implements Action {
  readonly type = PaperActionTypes.SetFocusedPathInfo;
  constructor(readonly focusedPathInfo: FocusedPathInfo | undefined) {}
}

export class SetRotateItemsInfo implements Action {
  readonly type = PaperActionTypes.SetRotateItemsInfo;
  constructor(readonly rotateItemsInfo: RotateItemsInfo | undefined) {}
}

export class SetTransformPathsInfo implements Action {
  readonly type = PaperActionTypes.SetTransformPathInfo;
  constructor(readonly transformPathsInfo: TransformPathsInfo | undefined) {}
}

export class SetCursorType implements Action {
  readonly type = PaperActionTypes.SetCursorType;
  constructor(readonly cursorType: CursorType | undefined) {}
}

export class SetSnapGuideInfo implements Action {
  readonly type = PaperActionTypes.SetSnapGuideInfo;
  constructor(readonly snapGuideInfo: SnapGuideInfo | undefined) {}
}

export class SetZoomPanInfo implements Action {
  readonly type = PaperActionTypes.SetZoomPanInfo;
  constructor(readonly zoomPanInfo: ZoomPanInfo) {}
}

export class SetTooltipInfo implements Action {
  readonly type = PaperActionTypes.SetTooltipInfo;
  constructor(readonly tooltipInfo: TooltipInfo | undefined) {}
}

export type PaperActions =
  | SetToolMode
  | SetSelectionBox
  | SetCreatePathInfo
  | SetSplitCurveInfo
  | SetFocusedPathInfo
  | SetRotateItemsInfo
  | SetTransformPathsInfo
  | SetCursorType
  | SetSnapGuideInfo
  | SetZoomPanInfo
  | SetTooltipInfo;

export interface SelectionBox {
  readonly from: Point;
  readonly to: Point;
}

export interface CreatePathInfo {
  readonly pathData: string;
  readonly strokeColor: string;
}

export type Segment = Readonly<{ point: Point; handleIn: Point; handleOut: Point }>;

export interface SplitCurveInfo {
  readonly splitPoint: Point;
  readonly segment1: Segment;
  readonly segment2: Segment;
}

export interface FocusedPathInfo {
  readonly layerId: string;
  // TODO: suffix these variables with 'index'
  readonly selectedSegments: ReadonlySet<number>;
  readonly visibleHandleIns: ReadonlySet<number>;
  readonly visibleHandleOuts: ReadonlySet<number>;
  readonly selectedHandleIn: number;
  readonly selectedHandleOut: number;
}

export interface RotateItemsInfo {
  readonly layerIds: ReadonlySet<string>;
  // readonly pivot: Point;
}

export interface TransformPathsInfo {
  readonly layerIds: ReadonlySet<string>;
}

export type Line = Readonly<{ from: Point; to: Point }>;

export interface SnapGuideInfo {
  readonly guides: ReadonlyArray<Line>;
  readonly rulers: ReadonlyArray<Line>;
}

export interface ZoomPanInfo {
  readonly zoom: number;
  readonly translation: Readonly<{ tx: number; ty: number }>;
}

export interface TooltipInfo {
  readonly point: Point;
  readonly label: string;
}
