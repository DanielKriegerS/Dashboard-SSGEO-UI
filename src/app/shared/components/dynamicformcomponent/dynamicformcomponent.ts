import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField } from '../../../models/components/FormField';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamicformcomponent',
  imports: [CommonModule, FormsModule],
  templateUrl: './dynamicformcomponent.html',
  styleUrl: './dynamicformcomponent.scss',
})
export class Dynamicformcomponent implements OnInit {
  @Input() title = '';
  @Input() fields: FormField[] = [];
  @Input() submitFn!: (data: any) => void;

  @Output() onSuccess = new EventEmitter<void>();

  formData: any = {};
  collapsed = true;

  ngOnInit(): void {
    this.initializeDefaults();
  }
  
  initializeDefaults(): void {
    for (const field of this.fields) {
      if (!this.isValidColorField(field)) {
        this.formData[field.name] = '#000000';
      }
    }
  }

  submit() {
    this.submitFn(this.formData);
    this.onSuccess.emit();
    this.resetFormData()
  }
  
  toggle() {
    this.collapsed = !this.collapsed;
  }

  isColorField(field: FormField): boolean {
    return field.type === 'color';
  }
  
  isValidHexColor(value: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(value ?? '');
  }

  isValidColorField(field: FormField): boolean {
    const value = this.formData[field.name];
    
    if (!this.isColorField(field)) {
      return true; 
    }

    if (
        value === undefined || 
        value === null ||
        value === '' ||
        !value
      ) {
      return false; 
    }

    return this.isValidHexColor(value);
  }

  
resetFormData(): void {
    const initialData: any = {};

    for (const field of this.fields) {
      if (field.type === 'color') {
        initialData[field.name] = '#000000';
      } else {
        initialData[field.name] = '';
      }
    }

    this.formData = initialData;
  }

}