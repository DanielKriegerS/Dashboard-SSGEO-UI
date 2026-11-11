import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DeveloperModel } from '../../models/developer/DeveloperModel';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DeveloperService } from '../../services/developer-service';
import { FormField } from '../../models/components/FormField';
import { Dynamicformcomponent } from "../../shared/components/dynamicformcomponent/dynamicformcomponent";
import { DeveloperUpdatePayload } from '../../models/developer/DeveloperUpdatePayload';
import { FeedbackService } from '../../services/feedback';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-developers',
  imports: [CommonModule, FormsModule, Dynamicformcomponent],
  templateUrl: './developers.html',
  styleUrl: './developers.scss',
})
export class Developers implements OnInit{
  developers: DeveloperModel[] = [];
  eligibleMembers: { membershipId: string; displayName: string }[] = [];
  selectedMembershipId = '';
  editingMembershipId = '';
  get availableMembers() {
    return this.eligibleMembers.filter(member => !this.developers.some(developer => developer.membershipId === member.membershipId));
  }
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
    forkJoin({ developers: this.service.getAll(), members: this.service.getEligibleMembers() }).subscribe(
      res => {
      this.developers = res.developers;
      this.eligibleMembers = res.members;
      this.cdr.detectChanges();
      });
  }

  createDeveloper = (data: DeveloperModel) => {
    if (!this.availableMembers.some(member => member.membershipId === this.selectedMembershipId)) {
      this.feedback.error('Selecione um membro elegivel para o desenvolvedor.');
      return;
    }
    this.service.create({ name: data.name, color: data.color, membershipId: this.selectedMembershipId }).subscribe(() => {
      this.selectedMembershipId = '';
      this.feedback.success('Desenvolvedor criado com sucesso!');
      this.load()
    });
  }

  
startEdit(dev: DeveloperModel): void {
    this.editingDeveloperId = dev.id;
  this.editingMembershipId = '';

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

    if (!dev.membershipId && this.availableMembers.some(member => member.membershipId === this.editingMembershipId)) {
      payload.membershipId = this.editingMembershipId;
    }

    if (!payload.name && !payload.color && !payload.membershipId) {
      this.cancelEdit();
      return;
    }

    this.service.update(dev.id, payload).subscribe(() => {
      this.feedback.success('Dados do desenvolvedor atualizado com sucesso!');
      this.cancelEdit();
      this.load();
    });
  }

  deleteDeveloper(dev: DeveloperModel): void {
    if (confirm(`Tem certeza que deseja deletar o desenvolvedor ${dev.name}?`)) {
      this.service.delete(dev.id).subscribe(() => {
        this.feedback.success('Desenvolvedor deletado com sucesso!');
        this.load();
      });
    }
  }
}
