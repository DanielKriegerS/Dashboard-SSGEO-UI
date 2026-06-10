import { Component, OnInit } from '@angular/core';
import { CardComponent } from '../../shared/components/card/card';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SprintService } from '../../services/sprint';

@Component({
  selector: 'app-sprints',
  imports: [CommonModule, CardComponent, RouterLink],
  templateUrl: './sprints.html',
  styleUrl: './sprints.scss',
})


export class SprintComponent implements OnInit {

  sprint: any;
  startIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private service: SprintService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getById(id).subscribe(res => {
      this.sprint = res;
    });
  }

  next() {
    if (this.startIndex + 3 < (this.sprint?.coatends?.length || 0)) {
      this.startIndex += 3;
    }
  }

  prev() {
    if (this.startIndex - 3 >= 0) {
      this.startIndex -= 3;
    }
  }

  get visibleCoatends() {
    return this.sprint?.coatends?.slice(this.startIndex, this.startIndex + 3) || [];
  }
}
