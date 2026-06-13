import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-notfoundfallback',
  imports: [],
  templateUrl: './notfoundfallback.html',
  styleUrl: './notfoundfallback.scss',
})
export class Notfoundfallback {
  @Input() title: string = '';
}
