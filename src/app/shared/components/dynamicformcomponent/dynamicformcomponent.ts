import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField } from '../../../models/components/FormField';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamicformcomponent',
  imports: [CommonModule, FormsModule],
  templateUrl: './dynamicformcomponent.html',
  styleUrl: './dynamicformcomponent.scss',
})
export class Dynamicformcomponent {
  @Input() title = '';
  @Input() fields: FormField[] = [];
  @Input() submitFn!: (data: any) => void;

  @Output() onSuccess = new EventEmitter<void>();

  formData: any = {};
  collapsed = true;

  submit() {
    this.submitFn(this.formData);
    this.onSuccess.emit();
    this.formData = {};
  }
  
  toggle() {
    this.collapsed = !this.collapsed;
  }

}

