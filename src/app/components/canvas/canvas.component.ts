import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { ActionSource } from 'app/model/actionmode';
import { MathUtil, Matrix } from 'app/scripts/common';
import { DestroyableMixin } from 'app/scripts/mixins';
import { ThemeService } from 'app/services';
import { State, Store } from 'app/store';
import { getVectorLayer } from 'app/store/layers/selectors';
import { getCursorType, getZoomPanInfo } from 'app/store/paper/selectors';
import * as $ from 'jquery';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { isActionMode } from '../../store/actionmode/selectors';
import { CanvasContainerDirective } from './canvascontainer.directive';
import { CanvasLayersDirective } from './canvaslayers.directive';
import { CanvasLayoutMixin, Size } from './CanvasLayoutMixin';
import { CanvasOverlayDirective } from './canvasoverlay.directive';
import { CanvasPaperDirective } from './canvaspaper.directive';
import { CanvasRulerDirective } from './canvasruler.directive';

// Canvas margin in css pixels.
const CANVAS_MARGIN = 36;

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent extends CanvasLayoutMixin(DestroyableMixin())
  implements OnInit, AfterViewInit {
  @ViewChildren(CanvasContainerDirective) canvasContainer: QueryList<CanvasContainerDirective>;
  @ViewChildren(CanvasLayersDirective) canvasLayers: QueryList<CanvasLayersDirective>;
  @ViewChildren(CanvasOverlayDirective) canvasOverlay: QueryList<CanvasOverlayDirective>;
  @ViewChildren(CanvasPaperDirective) canvasPaper: QueryList<CanvasPaperDirective>;
  @ViewChildren(CanvasRulerDirective) canvasRulers: QueryList<CanvasRulerDirective>;

  @Input() actionSource: ActionSource;
  @Input() canvasBounds$: Observable<Size>;

  private readonly $element: JQuery;
  private isActionMode$: Observable<boolean>;

  constructor(
    elementRef: ElementRef,
    private readonly store: Store<State>,
    readonly themeService: ThemeService,
  ) {
    super();
    this.$element = $(elementRef.nativeElement);
  }

  ngOnInit() {
    this.isActionMode$ = this.store.select(isActionMode);
  }

  ngAfterViewInit() {
    const activeViewport$ = this.store
      .select(getVectorLayer)
      .pipe(map(vl => ({ w: vl.width, h: vl.height })), distinctUntilChanged(_.isEqual));
    this.registerSubscription(
      combineLatest(this.canvasBounds$, activeViewport$).subscribe(([bounds, viewport]) => {
        const w = Math.max(1, bounds.w - CANVAS_MARGIN * 2);
        const h = Math.max(1, bounds.h - CANVAS_MARGIN * 2);
        this.setDimensions({ w, h }, viewport);
      }),
    );
    // TODO: use an [ngClass] binding or something like that
    this.registerSubscription(
      this.store.select(getCursorType).subscribe(c => {
        if (c) {
          $('.paper-canvas').addClass(c);
        } else {
          $('.paper-canvas').removeClass((index, css) =>
            (css.match(/\bcursor-\S+/g) || []).join(' '),
          );
        }
      }),
    );
    this.registerSubscription(
      this.store.select(getZoomPanInfo).subscribe(info => {
        this.setZoomPan(info.zoom, info.translation);
      }),
    );
  }

  // @Override
  protected onDimensionsChanged(bounds: Size, viewport: Size) {
    const directives = [
      ...this.canvasContainer.toArray(),
      ...this.canvasLayers.toArray(),
      ...this.canvasOverlay.toArray(),
      ...this.canvasPaper.toArray(),
      ...this.canvasRulers.toArray(),
    ];
    directives.forEach(d => d.setDimensions(bounds, viewport));
  }

  // @Override
  protected onZoomPanChanged(zoom: number, translation: Readonly<{ tx: number; ty: number }>) {
    const directives = [
      ...this.canvasContainer.toArray(),
      ...this.canvasLayers.toArray(),
      ...this.canvasOverlay.toArray(),
      ...this.canvasPaper.toArray(),
      ...this.canvasRulers.toArray(),
    ];
    directives.forEach(d => d.setZoomPan(zoom, translation));
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.canvasOverlay.forEach(c => c.onMouseDown(event));
    this.showRuler(event);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.canvasOverlay.forEach(c => c.onMouseMove(event));
    this.showRuler(event);
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.canvasOverlay.forEach(c => c.onMouseUp(event));
    this.showRuler(event);
  }

  @HostListener('mouseleave', ['$event'])
  onMouseLeave(event: MouseEvent) {
    this.canvasOverlay.forEach(c => c.onMouseLeave(event));
    this.hideRuler();
  }

  private showRuler(event: MouseEvent) {
    const canvasOffset = this.$element.offset();
    const zoom = this.getZoom();
    const { tx, ty } = this.getTranslation();
    const point = MathUtil.transformPoint(
      { x: event.pageX - canvasOffset.left, y: event.pageY - canvasOffset.top },
      new Matrix(zoom, 0, 0, zoom, tx, ty).invert(),
    );
    const x = point.x / Math.max(1, this.cssScale);
    const y = point.y / Math.max(1, this.cssScale);
    this.canvasRulers.forEach(r => r.showMouse({ x: _.round(x), y: _.round(y) }));
  }

  private hideRuler() {
    this.canvasRulers.forEach(r => r.hideMouse());
  }
}
