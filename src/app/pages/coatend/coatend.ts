import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoatendService } from '../../services/coatend';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  templateUrl: './coatend.html',
  imports: [CommonModule]
})
export class CoatendComponent implements OnInit {

  coatend: any;

  constructor(
    private route: ActivatedRoute,
    private service: CoatendService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getById(id).subscribe(res => {
      this.coatend = res;
    });
  }
}