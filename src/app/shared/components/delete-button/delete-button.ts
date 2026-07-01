import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-delete-button',
  imports: [],
  templateUrl: './delete-button.html',
  styleUrl: './delete-button.scss',
})
export class DeleteButton {
  
  @Input() label = 'Excluir';
  @Input() deleteFn!: () => void;

  confirm() {
    const confirmed = confirm('Tem certeza que deseja excluir?');

    if (confirmed) {
      this.deleteFn();
    }
  }

}
