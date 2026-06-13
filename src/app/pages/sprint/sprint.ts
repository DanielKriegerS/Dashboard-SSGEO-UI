import { Component } from '@angular/core';
import { CardComponent } from "../../shared/components/card/card";
import { Notfoundfallback } from "../../shared/components/notfoundfallback/notfoundfallback";

@Component({
  selector: 'app-sprint',
  imports: [CardComponent, Notfoundfallback],
  templateUrl: './sprint.html',
  styleUrl: './sprint.scss',
})
export class SprintComponent {}
