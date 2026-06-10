import { Component } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-main',
  imports: [],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main {  
constructor(private title: Title, private meta: Meta) {
    this.title.setTitle('Planner Squad');
    this.meta.addTags([
      { name: 'description', content: 'Planejamento de atividades da squad' }
    ]);
  }
}
