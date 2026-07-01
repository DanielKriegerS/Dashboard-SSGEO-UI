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
      if (field.type === 'color' && (
          this.formData[field.name] === '' ||
          this.formData[field.name] === undefined || 
          !this.formData[field.name]
        )
      ) {
        this.formData[field.name] = '#000000';
      }
    }
  }

  submit() {
    this.submitFn(this.formData);
    this.onSuccess.emit();
    this.formData = {};
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

}

