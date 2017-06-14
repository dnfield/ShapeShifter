import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
} from '@angular/core';
import {
  ActionMode,
  ActionModeUtil,
  ActionSource,
  Selection,
  SelectionType,
} from 'app/scripts/model/actionmode';
import { MorphableLayer } from 'app/scripts/model/layers';
import { PathAnimationBlock } from 'app/scripts/model/timeline';
import { ActionModeService } from 'app/services/actionmode/actionmode.service';
import {
  State,
  Store,
} from 'app/store';
import { getToolbarState } from 'app/store/actionmode/selectors';
import { environment } from 'environments/environment';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';

declare const ga: Function;

type ActionModeState = 'inactive' | 'active';
const INACTIVE = 'inactive';
const ACTIVE = 'active';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('actionModeState', [
      // Blue grey 500.
      state(INACTIVE, style({ backgroundColor: '#607D8B' })),
      // Blue A400.
      state(ACTIVE, style({ backgroundColor: '#2979FF' })),
      transition('* => *', animate('200ms ease-out')),
    ]),
  ],
})
export class ToolbarComponent implements OnInit {
  readonly IS_DEV_BUILD = !environment.production;

  toolbarData$: Observable<ToolbarData>;
  actionModeState$: Observable<ActionModeState>;

  constructor(
    private readonly actionModeService: ActionModeService,
    private readonly store: Store<State>,
  ) { }

  ngOnInit() {
    const toolbarState = this.store.select(getToolbarState);
    this.toolbarData$ = toolbarState
      .map(({ actionMode, fromMl, toMl, mode, selections, unpairedSubPath, block }) => {
        return new ToolbarData(
          actionMode, fromMl, toMl, mode, selections, unpairedSubPath, block);
      });
    this.actionModeState$ =
      toolbarState.map(({ actionMode, block }) => {
        return actionMode === ActionMode.None ? INACTIVE : ACTIVE;
      });
  }

  onAutoFixClick() {
    ga('send', 'event', 'Action mode', 'Auto fix click');
    this.actionModeService.autoFixClick();
  }

  onSendFeedbackClick() {
    ga('send', 'event', 'Miscellaneous', 'Send feedback click');
  }

  onAboutClick() {
    ga('send', 'event', 'Miscellaneous', 'About click');
  }

  onCloseActionModeClick() {
    this.actionModeService.closeActionMode();
  }

  onAddPointsClick() {
    ga('send', 'event', 'Action mode', 'Add points');
    this.actionModeService.toggleSplitCommandsMode();
  }

  onSplitSubPathsClick() {
    ga('send', 'event', 'Action mode', 'Split sub paths');
    this.actionModeService.toggleSplitSubPathsMode();
  }

  onPairSubPathsClick() {
    ga('send', 'event', 'Action mode', 'Pair sub paths');
    this.actionModeService.togglePairSubPathsMode();
  }

  onReversePointsClick() {
    this.actionModeService.reverseSelectedSubPaths();
  }

  onShiftBackPointsClick() {
    this.actionModeService.shiftBackSelectedSubPaths();
  }

  onShiftForwardPointsClick() {
    this.actionModeService.shiftForwardSelectedSubPaths();
  }

  onDeleteSubPathsClick() {
    this.actionModeService.deleteSelections();
  }

  onDeleteSegmentsClick() {
    this.actionModeService.deleteSelections();
  }

  onSetFirstPositionClick() {
    this.actionModeService.shiftPointToFront();
  }

  onSplitInHalfHoverEvent(isHovering: boolean) {
    if (isHovering) {
      this.actionModeService.splitInHalfHover();
    } else {
      this.actionModeService.clearHover();
    }
  }

  onSplitInHalfClick() {
    this.actionModeService.splitInHalfClick();
  }

  onDeletePointsClick() {
    this.actionModeService.deleteSelections();
  }
}

class ToolbarData {
  private readonly subPaths: ReadonlyArray<number> = [];
  private readonly segments: ReadonlyArray<{ subIdx: number, cmdIdx: number }> = [];
  private readonly points: ReadonlyArray<{ subIdx: number, cmdIdx: number }> = [];
  private readonly numSplitSubPaths: number;
  private readonly numSplitPoints: number;
  private readonly showSetFirstPosition: boolean;
  private readonly showShiftSubPath: boolean;
  private readonly isFilled: boolean;
  private readonly isStroked: boolean;
  private readonly showSplitInHalf: boolean;
  private readonly unpairedSubPathSource: ActionSource;
  private readonly showPairSubPaths: boolean;
  private readonly morphableLayerName: string;

  constructor(
    private readonly actionMode: ActionMode,
    startMorphableLayer: MorphableLayer,
    endMorphableLayer: MorphableLayer,
    public readonly mode: ActionMode,
    public readonly selections: ReadonlyArray<Selection>,
    unpair: { source: ActionSource; subIdx: number; },
    private readonly block: PathAnimationBlock | undefined,
  ) {
    // Precondition: assume all selections are for the same canvas type
    if (!selections.length) {
      return;
    }
    const canvasType = selections[0].source;
    const morphableLayer =
      canvasType === ActionSource.From ? startMorphableLayer : endMorphableLayer;
    if (!morphableLayer) {
      return;
    }
    this.morphableLayerName = morphableLayer.name;
    const activePath = morphableLayer.pathData;
    this.isFilled = morphableLayer.isFilled();
    this.isStroked = morphableLayer.isStroked();
    this.subPaths =
      selections
        .filter(s => s.type === SelectionType.SubPath)
        .map(s => s.subIdx);
    this.segments =
      selections
        .filter(s => {
          const { subIdx, cmdIdx } = s;
          return s.type === SelectionType.Segment
            && morphableLayer.isFilled()
            && activePath.getCommand(subIdx, cmdIdx).isSplitSegment();
        })
        .map(s => {
          const { subIdx, cmdIdx } = s;
          return { subIdx, cmdIdx };
        });
    this.points =
      selections
        .filter(s => s.type === SelectionType.Point)
        .map(s => {
          const { subIdx, cmdIdx } = s;
          return { subIdx, cmdIdx };
        });

    this.numSplitSubPaths = _.sumBy(this.subPaths, subIdx => {
      return activePath.getSubPath(subIdx).isUnsplittable() ? 1 : 0;
    });
    this.numSplitPoints = _.sumBy(this.points, s => {
      const { subIdx, cmdIdx } = s;
      return activePath.getCommand(subIdx, cmdIdx).isSplitPoint() ? 1 : 0;
    });
    this.showSetFirstPosition = this.points.length === 1
      && this.points[0].cmdIdx
      && activePath.getSubPath(this.points[0].subIdx).isClosed();
    this.showShiftSubPath = this.subPaths.length > 0
      && activePath.getSubPath(this.subPaths[0]).isClosed();
    this.showSplitInHalf = this.points.length === 1 && !!this.points[0].cmdIdx;
    if (this.mode === ActionMode.PairSubPaths) {
      if (unpair) {
        this.unpairedSubPathSource = unpair.source;
      }
    }
    if (startMorphableLayer.pathData.getSubPaths().length === 1
      && endMorphableLayer.pathData.getSubPaths().length === 1) {
      this.showPairSubPaths = false;
    } else {
      this.showPairSubPaths =
        this.getNumSubPaths() === 1
        || this.getNumSegments() > 0
        || (!this.isSelectionMode());
    }
  }

  getNumSelections() {
    return this.subPaths.length + this.segments.length + this.points.length;
  }

  getNumSubPaths() {
    return this.subPaths.length;
  }

  getNumSegments() {
    return this.segments.length;
  }

  getNumPoints() {
    return this.points.length;
  }

  getToolbarTitle() {
    if (this.mode === ActionMode.SplitCommands) {
      return 'Add points';
    }
    if (this.mode === ActionMode.SplitSubPaths) {
      return 'Split subpaths';
    }
    if (this.mode === ActionMode.PairSubPaths) {
      return 'Pair subpaths';
    }
    const numSubPaths = this.getNumSubPaths();
    const subStr = `${numSubPaths} subpath${numSubPaths === 1 ? '' : 's'}`;
    const numSegments = this.getNumSegments();
    const segStr = `${numSegments} segment${numSegments === 1 ? '' : 's'}`;
    const numPoints = this.getNumPoints();
    const ptStr = `${numPoints} point${numPoints === 1 ? '' : 's'}`;
    if (numSubPaths > 0) {
      return `${subStr} selected`;
    } else if (numSegments > 0) {
      return `${segStr} selected`;
    } else if (numPoints > 0) {
      return `${ptStr} selected`;
    } else if (this.mode === ActionMode.Selection) {
      return 'Select something below to edit its properties';
    }
    return 'Shape Shifter';
  }

  getToolbarSubtitle() {
    if (this.mode === ActionMode.SplitCommands) {
      return 'Click along the edge of a subpath to add a point';
    } else if (this.mode === ActionMode.SplitSubPaths) {
      if (this.isFilled) {
        return 'Draw a line across a subpath to split it into 2';
      } else if (this.isStroked) {
        return 'Click along the edge of a subpath to split it into 2';
      }
    } else if (this.mode === ActionMode.PairSubPaths) {
      if (this.unpairedSubPathSource) {
        const toSourceDir = this.unpairedSubPathSource === ActionSource.From ? 'right' : 'left';
        return `Pair the selected subpath with a corresponding subpath on the ${toSourceDir}`;
      }
      return 'Select a subpath';
    } else if (this.mode === ActionMode.Selection) {
      const { areCompatible, errorPath, numPointsMissing } =
        ActionModeUtil.checkPathsCompatible(this.block);
      if (!areCompatible) {
        const createSubtitleFn = (direction: string) => {
          if (numPointsMissing === 1) {
            return `Add 1 point to the subpath on the ${direction}`;
          } else {
            return `Add ${numPointsMissing} points to the subpath on the ${direction}`;
          }
        };
        if (errorPath === ActionSource.From) {
          return createSubtitleFn('left');
        } else if (errorPath === ActionSource.To) {
          return createSubtitleFn('right');
        }
        // This should never happen, but return empty string just to be safe.
        return '';
      }
    }
    return '';
  }

  shouldShowActionMode() {
    return this.actionMode !== ActionMode.None;
  }

  shouldShowPairSubPaths() {
    return this.showPairSubPaths;
  }

  getNumSplitSubPaths() {
    return this.numSplitSubPaths || 0;
  }

  getNumSplitPoints() {
    return this.numSplitPoints || 0;
  }

  shouldShowSetFirstPosition() {
    return this.showSetFirstPosition || false;
  }

  shouldShowShiftSubPath() {
    return this.showShiftSubPath || false;
  }

  shouldShowSplitInHalf() {
    return this.showSplitInHalf || false;
  }

  isSelectionMode() {
    return this.mode === ActionMode.None || this.mode === ActionMode.Selection;
  }

  isAddPointsMode() {
    return this.mode === ActionMode.SplitCommands;
  }

  isSplitSubPathsMode() {
    return this.mode === ActionMode.SplitSubPaths;
  }

  isPairSubPathsMode() {
    return this.mode === ActionMode.PairSubPaths;
  }

  shouldShowAutoFix() {
    return this.actionMode === ActionMode.Selection && !this.getNumSelections();
  }
}
