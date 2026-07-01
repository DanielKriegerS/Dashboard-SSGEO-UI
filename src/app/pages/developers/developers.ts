import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DeveloperModel } from '../../models/developer/DeveloperModel';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DeveloperService } from '../../services/developer-service';

@Component({
  selector: 'app-developers',
  imports: [CommonModule ,FormsModule],
  templateUrl: './developers.html',
  styleUrl: './developers.scss',
})
export class Developers implements OnInit{
  developers: DeveloperModel[] = [];
  newDev = '';
  
  constructor(
    private service: DeveloperService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.service.getAll().subscribe(
      res => {
      this.developers = res
      this.cdr.detectChanges();
      }
    );
  }

  create() {
    this.service.create({ name: this.newDev })
      .subscribe(() => {
        this.newDev = '';
        this.load();
    });
  }
}
