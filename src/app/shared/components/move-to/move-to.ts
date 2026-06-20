import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-move-to',
  imports: [CommonModule, FormsModule],
  templateUrl: './move-to.html',
  styleUrl: './move-to.scss',
})
export class MoveTo {
  
  @Input() title = 'Mover para';
  @Input() options: { id: string; label: string }[] = [];
  @Input() moveFn!: (targetId: string) => void;

  selectedId: string = '';

  submit() {
    if (!this.selectedId) return;

    this.moveFn(this.selectedId);
    this.selectedId = '';
  }

}
