import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-datecomponent',
  imports: [CommonModule],
  templateUrl: './datecomponent.html',
  styleUrl: './datecomponent.scss',
})
export class Datecomponent {
  @Input() startDate: String | null = null;
  @Input() endDate: String | null = null;
}
