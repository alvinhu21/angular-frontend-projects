import { Directive, Input } from "@angular/core"; // Add Directive to imports
import { FormGroup, ValidationErrors } from "@angular/forms";

@Directive() // Add the decorator here (no selector needed for a base class)
export class BaseInput {
  @Input() inputFormGroup!: FormGroup;
  @Input() isHorizontal: boolean = false;
  @Input() label: string = "";
  @Input() id: string = "";
  @Input() controlName: string = "";
  @Input() faIcon: string  ="";
  @Input() errorMessages: any = {};
  @Input() placeholder: any = "common.placeholder";
  @Input() disabled: boolean = false;
  @Input() customClasses: string = "";
  get errorMessageList(): string[]{
    if(!this.inputFormGroup){
      return [];
    }
    let control = this.inputFormGroup.get(this.controlName);
    if(!control){
      return [];
    }

    if(!!(control && control.errors && (control.dirty || control.touched))){
      return Object.keys(control.errors).map(key => this.errorMessages[key]);
    }
    return [];
  }
}