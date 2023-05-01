import { AfterViewInit, Component, ElementRef, HostListener, Renderer2, ViewChild } from '@angular/core';
import { DOT_COLOR } from './app.constants';
import { debounce } from 'lodash';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit{

  @HostListener('window:keydown.space', ['$event'])
  handleKeyDown() {
    const adjInactiveDots: any[] = [];
    const dotsToToggle: any[] = [];

    this.selectedDots.forEach(group => {
      const { row, column } = group.outerDot.dotPosition;

      const adjacentDots = this.getAdjacentValues(row, column);
      const activeAdjacent = adjacentDots.filter(dot => dot.outerDot.isActive);
      adjInactiveDots.push(...adjacentDots.filter(dot => !dot.outerDot.isActive));

      if(activeAdjacent.length < 2 || activeAdjacent.length > 3) {
        dotsToToggle.push(group);
      }
    })

    adjInactiveDots.forEach(group => {
      const { row, column } = group.outerDot.dotPosition;
      const adjacentDots = this.getAdjacentValues(row, column);
      const activeAdjacent = adjacentDots.filter(dot => dot.outerDot.isActive);
      if(activeAdjacent.length === 3) {
        dotsToToggle.push(group);
      }
    })

    dotsToToggle.forEach(group => this.toggleDotGroup(group));
  }

  @ViewChild('layout', { static: true })
  private dotsSvgRef: ElementRef<SVGSVGElement>;

  @ViewChild('dotsGroup', { static: true })
  private dotsGroupRef: ElementRef<SVGGElement>;

  dots: any[] = [];
  selectedDots: Set<any> = new Set<any>();
  totalRows: number = 0;
  totalCols: number = 0;


  constructor(private renderer: Renderer2) {
  }

  ngAfterViewInit() {
    this.setLayout();
  }

  private setLayout() {
    const svg = this.dotsSvgRef.nativeElement;
    const dotsGroup = this.dotsGroupRef.nativeElement;

    // Get the width and height of the SVG element
    const rect = svg.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate the size and spacing of the dots
    const outerDotSize = 14;
    const innerDotSize = 7;
    const dotSpacing = (outerDotSize - innerDotSize);

    // Calculate the number of rows and columns of dots
    this.totalRows = Math.floor((height - outerDotSize) / (outerDotSize + dotSpacing)) + 1;
    this.totalCols = Math.floor((width - outerDotSize) / (outerDotSize + dotSpacing)) + 1;

    // Calculate the offset to center the dots in the SVG element
    const xOffset = (width - (this.totalCols * outerDotSize + (this.totalCols - 1) * dotSpacing)) / 2 + 5;
    const yOffset = (height - (this.totalRows * outerDotSize + (this.totalRows - 1) * dotSpacing)) / 2 + 5;

    // Create a 2D array to store the dots
    this.dots = new Array(this.totalRows);
    for (let i = 0; i < this.totalRows; i++) {
      this.dots[i] = new Array(this.totalCols);
    }


    // Create the dots
    for (let i = 0; i < this.totalRows; i++) {
      for (let j = 0; j < this.totalCols; j++) {
        const dotGroup = this.renderer.createElement('g', 'svg');
        const outerDot = this.renderer.createElement('circle', 'svg');
        const innerDot = this.renderer.createElement('circle', 'svg');

        this.renderer.setAttribute(outerDot, 'cx', `${xOffset + j * (outerDotSize + dotSpacing) + outerDotSize / 2}`);
        this.renderer.setAttribute(outerDot, 'cy', `${yOffset + i * (outerDotSize + dotSpacing) + outerDotSize / 2}`);
        this.renderer.setAttribute(outerDot, 'r', `${outerDotSize / 2}`);
        this.renderer.setAttribute(outerDot, 'fill', DOT_COLOR.TRANSPARENT);

        this.renderer.setAttribute(innerDot, 'cx', `${xOffset + j * (outerDotSize + dotSpacing) + outerDotSize / 2}`);
        this.renderer.setAttribute(innerDot, 'cy', `${yOffset + i * (outerDotSize + dotSpacing) + outerDotSize / 2}`);
        this.renderer.setAttribute(innerDot, 'r', `${innerDotSize / 2}`);
        this.renderer.setAttribute(innerDot, 'fill', DOT_COLOR.INACTIVE);

        // Set the dot's position object as a custom property
        const dotPosition = { row: i, column: j };
        this.renderer.setProperty(outerDot, 'dotPosition', dotPosition);
        this.renderer.setProperty(outerDot, 'isActive', false);

        this.renderer.appendChild(dotGroup, outerDot);
        this.renderer.appendChild(dotGroup, innerDot);


        // Store the dot in the 2D array
        const group = {outerDot, innerDot}
        this.dots[i][j] = group;

        this.renderer.listen(dotGroup, 'mousedown', (event) => {
          if(event.which === 1) {
            event.preventDefault();
            this.toggleDotGroup(group);
          }
        });

        this.renderer.listen(svg, 'mousemove',debounce( (event) => {
          if (event.shiftKey) {
            event.preventDefault();
            const rect = svg.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const row = Math.floor((y - yOffset) / (outerDotSize + dotSpacing));
            const col = Math.floor((x - xOffset) / (outerDotSize + dotSpacing));

            this.fillDotGroup(this.dots[row]?.[col])

          }
        }, 0))

        this.renderer.appendChild(dotsGroup, dotGroup);
      }
    }
  }

  private toggleDotGroup(dotGroup: any) {
    const currentFill = dotGroup?.outerDot.getAttribute('fill');
    if(currentFill === DOT_COLOR.TRANSPARENT) {
      this.fillDotGroup(dotGroup);
      // // Get the coordinates of the clicked dot
      // const clickedCoords = { row: i, col: j };
      //
      // // Find the coordinates of adjacent dots
      // const adjCoords = this.getAdjacentCoords(clickedCoords.row, clickedCoords.col);
      //
      // adjCoords.forEach(({row, col}) => {
      //   this.dots[row][col].outerDot.setAttribute('fill', DOT_COLOR.ADJACENT);
      // })
      return;
    }

    dotGroup?.innerDot.setAttribute('fill', DOT_COLOR.INACTIVE);
    dotGroup?.outerDot.setAttribute('fill', DOT_COLOR.TRANSPARENT);
    dotGroup.outerDot.isActive = false
    this.selectedDots.delete(dotGroup);
  }

  private fillDotGroup(dotGroup:any) {
    dotGroup?.outerDot.setAttribute('fill', DOT_COLOR.ACTIVE);
    dotGroup?.innerDot.setAttribute('fill', DOT_COLOR.TRANSPARENT);
    dotGroup.outerDot.isActive = true
    this.selectedDots.add(dotGroup);
  }

  private getAdjacentValues(row: number, col: number): any[] {
    const activeValues = [];

    // Top
    if (row > 0) {
      if (this.dots[row - 1][col]) {
        activeValues.push(this.dots[row - 1][col]);
      }
      if (col > 0 && this.dots[row - 1][col - 1]) {
        activeValues.push(this.dots[row - 1][col - 1]);
      }
      if (col < this.totalCols - 1 && this.dots[row - 1][col + 1]) {
        activeValues.push(this.dots[row - 1][col + 1]);
      }
    }

    // Bottom
    if (row < this.totalRows - 1) {
      if (this.dots[row + 1][col]) {
        activeValues.push(this.dots[row + 1][col]);
      }
      if (col > 0 && this.dots[row + 1][col - 1]) {
        activeValues.push(this.dots[row + 1][col - 1]);
      }
      if (col < this.totalCols - 1 && this.dots[row + 1][col + 1]) {
        activeValues.push(this.dots[row + 1][col + 1]);
      }
    }

    // Left
    if (col > 0 && this.dots[row][col - 1]) {
      activeValues.push(this.dots[row][col - 1]);
    }

    // Right
    if (col < this.totalCols - 1 && this.dots[row][col + 1]) {
      activeValues.push(this.dots[row][col + 1]);
    }

    return activeValues;
  }


}
