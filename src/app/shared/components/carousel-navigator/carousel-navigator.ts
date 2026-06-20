import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-carousel-navigator',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './carousel-navigator.html',
  styleUrl: './carousel-navigator.scss',
})
export class CarouselNavigator {
  
  @Input() disablePrev = false;
  @Input() disableNext = false;

  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  onPrev() {
    this.prev.emit();
  }

  onNext() {
    this.next.emit();
  }
}
