import { Component, Input } from '@angular/core';
import { FormField } from '../../../models/components/FormField';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-edit-component',
  imports: [ FormsModule, CommonModule ],
  templateUrl: './dynamic-edit-component.html',
  styleUrl: './dynamic-edit-component.scss',
})
export class DynamicEditComponent {
  
  @Input() title = 'Editar';
  @Input() fields: FormField[] = [];
  @Input() data: any = {};
  @Input() updateFn!: (data: any) => void;

  formData: any = {};
  collapsed = true;

  ngOnInit() {
    this.formData = { ...this.data }; 
  }

  toggle() {
    this.collapsed = !this.collapsed;
  }

  submit() {
    this.updateFn(this.formData);
  }

}
