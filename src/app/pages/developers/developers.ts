import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DeveloperModel } from '../../models/developer/DeveloperModel';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DeveloperService } from '../../services/developer-service';
import { FormField } from '../../models/components/FormField';
import { Dynamicformcomponent } from "../../shared/components/dynamicformcomponent/dynamicformcomponent";
import { DeveloperUpdatePayload } from '../../models/developer/DeveloperUpdatePayload';
import { FeedbackService } from '../../services/feedback';

@Component({
  selector: 'app-developers',
  imports: [CommonModule, FormsModule, Dynamicformcomponent],
  templateUrl: './developers.html',
  styleUrl: './developers.scss',
})
export class Developers implements OnInit{
  developers: DeveloperModel[] = [];
  newDev = {
    name: '',
    color: '#000000'
  };

  fields: FormField[] = [
    { name: 'name', label: 'Nome', type: 'text' },
    { name: 'color', label: 'Cor', type: 'color' }
  ];
  
  editingDeveloperId: string | null = null;

  editData: {
    name?: string;
    color?: string;
  } = {};


  constructor(
    private service: DeveloperService,
    private cdr: ChangeDetectorRef,
    private feedback: FeedbackService
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

  createDeveloper = (data: DeveloperModel) => {
    this.service.create(data).subscribe(() => {
      this.feedback.success('Desenvolvedor criado com sucesso!');
      this.load()
    });
  }

  
startEdit(dev: DeveloperModel): void {
    this.editingDeveloperId = dev.id;

    this.editData = {
      name: dev.name,
      color: dev.color || '#000000'
    };
  }

  cancelEdit(): void {
    this.editingDeveloperId = null;
    this.editData = {};
  }

  updateDeveloper(dev: DeveloperModel): void {
    const payload: DeveloperUpdatePayload = {};

    if (this.editData.name !== undefined && this.editData.name !== dev.name) {
      payload.name = this.editData.name;
    }

    if (this.editData.color !== undefined && this.editData.color !== dev.color) {
      payload.color = this.editData.color;
    }

    if (!payload.name && !payload.color) {
      this.cancelEdit();
      return;
    }

    this.service.update(dev.id, payload).subscribe(() => {
      this.feedback.success('Dados do desenvolvedor atualizado com sucesso!');
      this.cancelEdit();
      this.load();
    });
  }

}
