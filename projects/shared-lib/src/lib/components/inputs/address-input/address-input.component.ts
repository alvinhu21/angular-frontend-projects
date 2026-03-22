import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import  { TextInputComponent} from '../text-input/text-input.component';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TypeSelectComponent } from '../type-select/type-select.component';
import { startWith, Subject, takeUntil, tap } from 'rxjs';
import { BaseInput } from '../baseInput';
import { zipCodeValidator } from '../../../validators/zip-code.validator';
import { addressValidator } from '../../../validators/address.validator';
import { cityValidator } from '../../../validators/city.validator';

@Component({
  selector: 'lib-address-input',
  imports: [TextInputComponent,TranslateModule,ReactiveFormsModule, TypeSelectComponent],
  templateUrl: './address-input.component.html',
  styleUrl: './address-input.component.scss',
})
export class AddressInputComponent extends BaseInput implements OnInit, OnDestroy{
  @Input() firstNameLabel: string = "common.firstNameLabel";
  @Input() lastNameLabel: string = "common.lastNameLabel";
  @Input() addressLabel: string = "common.addressLabel";
  @Input() cityLabel: string = "common.cityLabel";
  @Input() stateLabel: string = "common.stateLabel";
  @Input() zipCodeLabel: string = "common.zipCodeLabel";
  @Input() countryLabel: string = "common.countryLabel";
  @Input() addressFormGroup!: FormGroup;
  @Input() firstNameControlName: string = "";
  @Input() lastNameControlName: string = "";
  @Input() addressControlName: string = "";
  @Input() cityControlName: string = "";
  @Input() stateControlName: string = "";
  @Input() zipCodeControlName: string = "";
  @Input() countryControlName: string = "";
  @Input() firstNameErrorMessages: any = {required: 'validation.required', profanity: 'validation.profanity'};
  @Input() lastNameErrorMessages: any = {required: 'validation.required', profanity: 'validation.profanity'};
  @Input() cityErrorMessages: any = {required: 'validation.required', invalidCity: 'validation.invalidCity'};
  @Input() stateErrorMessages: any = {required: 'validation.required'};
  @Input() addressErrorMessages: any = {required: 'validation.required', invalidAddress: 'validation.invalidAddress'};
  @Input() countryErrorMessages: any = {required: 'validation.required'};
  @Input() zipCodeErrorMessages: any = {required: 'validation.required', invalidZip: 'validation.invalidZipCode'};

  countryList: {label: string, value: string}[] = [];
  stateList: {label: string, value: string}[] = [];

  destroy$ = new Subject<void>();
  ngOnInit(){
    this.setCountryList();
    this.setStateList('US');
    this.addressFormGroup.get(this.addressControlName)?.setValidators([Validators.required, addressValidator]);
    this.addressFormGroup.get(this.cityControlName)?.setValidators([Validators.required, cityValidator]);
    this.addressFormGroup.get(this.countryControlName)?.valueChanges.pipe(startWith('US'), takeUntil(this.destroy$), tap(val => {
      this.addressFormGroup.get(this.stateControlName)?.reset();
      this.addressFormGroup.get(this.zipCodeControlName)?.reset();
      this.addressFormGroup.get(this.addressControlName)?.reset();
      this.addressFormGroup.get(this.cityControlName)?.reset();
      if(['US','CA','GB','MX','JP','CN','FR'].includes(val)){
        this.addressFormGroup.get(this.stateControlName)?.setValidators([Validators.required]);
        this.addressFormGroup.get(this.zipCodeControlName)?.setValidators([Validators.required, zipCodeValidator(val)]);
      }else{
        this.addressFormGroup.get(this.stateControlName)?.setValidators([]);
        this.addressFormGroup.get(this.zipCodeControlName)?.setValidators([]);
      }

      this.setStateList(val);
    })).subscribe();

    this.addressFormGroup.get(this.stateControlName)?.valueChanges.pipe(takeUntil(this.destroy$), tap(state => {
      this.addressFormGroup.get(this.zipCodeControlName)?.reset();
      this.addressFormGroup.get(this.addressControlName)?.reset();
      this.addressFormGroup.get(this.cityControlName)?.reset();
    })).subscribe();

  }

  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
  }


  get countryCode(){
    const countryControl = this.addressFormGroup.get(this.countryControlName);
    if(!countryControl){
      return 'US';
    }
    return countryControl.value;
  }

  setStateList(countryCode: string){
    if(countryCode === 'US'){
      this.stateList = [
        // US States
        { label: "Alabama", value: "AL" },
        { label: "Alaska", value: "AK" },
        { label: "Arizona", value: "AZ" },
        { label: "Arkansas", value: "AR" },
        { label: "California", value: "CA" },
        { label: "Colorado", value: "CO" },
        { label: "Connecticut", value: "CT" },
        { label: "District of Columbia", value: "DC" },
        { label: "Delaware", value: "DE" },
        { label: "Florida", value: "FL" },
        { label: "Georgia", value: "GA" },
        { label: "Hawaii", value: "HI" },
        { label: "Idaho", value: "ID" },
        { label: "Illinois", value: "IL" },
        { label: "Indiana", value: "IN" },
        { label: "Iowa", value: "IA" },
        { label: "Kansas", value: "KS" },
        { label: "Kentucky", value: "KY" },
        { label: "Louisiana", value: "LA" },
        { label: "Maine", value: "ME" },
        { label: "Maryland", value: "MD" },
        { label: "Massachusetts", value: "MA" },
        { label: "Michigan", value: "MI" },
        { label: "Minnesota", value: "MN" },
        { label: "Mississippi", value: "MS" },
        { label: "Missouri", value: "MO" },
        { label: "Montana", value: "MT" },
        { label: "Nebraska", value: "NE" },
        { label: "Nevada", value: "NV" },
        { label: "New Hampshire", value: "NH" },
        { label: "New Jersey", value: "NJ" },
        { label: "New Mexico", value: "NM" },
        { label: "New York", value: "NY" },
        { label: "North Carolina", value: "NC" },
        { label: "North Dakota", value: "ND" },
        { label: "Ohio", value: "OH" },
        { label: "Oklahoma", value: "OK" },
        { label: "Oregon", value: "OR" },
        { label: "Pennsylvania", value: "PA" },
        { label: "Rhode Island", value: "RI" },
        { label: "South Carolina", value: "SC" },
        { label: "South Dakota", value: "SD" },
        { label: "Tennessee", value: "TN" },
        { label: "Texas", value: "TX" },
        { label: "Utah", value: "UT" },
        { label: "Vermont", value: "VT" },
        { label: "Virginia", value: "VA" },
        { label: "Washington", value: "WA" },
        { label: "West Virginia", value: "WV" },
        { label: "Wisconsin", value: "WI" },
        { label: "Wyoming", value: "WY" },

        // US Territories
        { label: "Puerto Rico", value: "PR" },
        { label: "Guam", value: "GU" },
        { label: "U.S. Virgin Islands", value: "VI" },
        { label: "American Samoa", value: "AS" },
        { label: "Northern Mariana Islands", value: "MP" }

      ];
      this.addressFormGroup.get(this.stateControlName)?.enable();
    }else if(countryCode === 'CA'){
      this.stateList = [
        // Canada (Provinces & Major Cities)
        { label: "Alberta - Calgary", value: "CA-AB-CGY" },
        { label: "Alberta - Edmonton", value: "CA-AB-EDM" },
        { label: "British Columbia - Vancouver", value: "CA-BC-VAN" },
        { label: "British Columbia - Victoria", value: "CA-BC-VIC" },
        { label: "Manitoba - Winnipeg", value: "CA-MB-WPG" },
        { label: "New Brunswick - Moncton", value: "CA-NB-MCT" },
        { label: "Newfoundland and Labrador - St. John's", value: "CA-NL-YYT" },
        { label: "Nova Scotia - Halifax", value: "CA-NS-YHZ" },
        { label: "Ontario - Toronto", value: "CA-ON-TOR" },
        { label: "Ontario - Ottawa", value: "CA-ON-OTT" },
        { label: "Ontario - Mississauga", value: "CA-ON-MIS" },
        { label: "Quebec - Montreal", value: "CA-QC-MTL" },
        { label: "Quebec - Quebec City", value: "CA-QC-QC" },
        { label: "Saskatchewan - Saskatoon", value: "CA-SK-YXE" },
        { label: "Saskatchewan - Regina", value: "CA-SK-YQR" }
      ];
      this.addressFormGroup.get(this.stateControlName)?.enable();
    }else{
      this.stateList = [];
      this.addressFormGroup.get(this.stateControlName)?.disable();
    }
  }
  setCountryList(){
    this.countryList = [
      { label: "Afghanistan", value: "AF" },
      { label: "Albania", value: "AL" },
      { label: "Algeria", value: "DZ" },
      { label: "Andorra", value: "AD" },
      { label: "Angola", value: "AO" },
      { label: "Antigua and Barbuda", value: "AG" },
      { label: "Argentina", value: "AR" },
      { label: "Armenia", value: "AM" },
      { label: "Australia", value: "AU" },
      { label: "Austria", value: "AT" },
      { label: "Azerbaijan", value: "AZ" },

      { label: "Bahamas", value: "BS" },
      { label: "Bahrain", value: "BH" },
      { label: "Bangladesh", value: "BD" },
      { label: "Barbados", value: "BB" },
      { label: "Belarus", value: "BY" },
      { label: "Belgium", value: "BE" },
      { label: "Belize", value: "BZ" },
      { label: "Benin", value: "BJ" },
      { label: "Bhutan", value: "BT" },
      { label: "Bolivia", value: "BO" },
      { label: "Bosnia and Herzegovina", value: "BA" },
      { label: "Botswana", value: "BW" },
      { label: "Brazil", value: "BR" },
      { label: "Brunei", value: "BN" },
      { label: "Bulgaria", value: "BG" },
      { label: "Burkina Faso", value: "BF" },
      { label: "Burundi", value: "BI" },

      { label: "Cabo Verde", value: "CV" },
      { label: "Cambodia", value: "KH" },
      { label: "Cameroon", value: "CM" },
      { label: "Canada", value: "CA" },
      { label: "Central African Republic", value: "CF" },
      { label: "Chad", value: "TD" },
      { label: "Chile", value: "CL" },
      { label: "China", value: "CN" },
      { label: "Colombia", value: "CO" },
      { label: "Comoros", value: "KM" },
      { label: "Congo (Congo-Brazzaville)", value: "CG" },
      { label: "Congo (Democratic Republic)", value: "CD" },
      { label: "Costa Rica", value: "CR" },
      { label: "Croatia", value: "HR" },
      { label: "Cuba", value: "CU" },
      { label: "Cyprus", value: "CY" },
      { label: "Czechia", value: "CZ" },

      { label: "Denmark", value: "DK" },
      { label: "Djibouti", value: "DJ" },
      { label: "Dominica", value: "DM" },
      { label: "Dominican Republic", value: "DO" },

      { label: "Ecuador", value: "EC" },
      { label: "Egypt", value: "EG" },
      { label: "El Salvador", value: "SV" },
      { label: "Equatorial Guinea", value: "GQ" },
      { label: "Eritrea", value: "ER" },
      { label: "Estonia", value: "EE" },
      { label: "Eswatini", value: "SZ" },
      { label: "Ethiopia", value: "ET" },

      { label: "Fiji", value: "FJ" },
      { label: "Finland", value: "FI" },
      { label: "France", value: "FR" },

      { label: "Gabon", value: "GA" },
      { label: "Gambia", value: "GM" },
      { label: "Georgia", value: "GE" },
      { label: "Germany", value: "DE" },
      { label: "Ghana", value: "GH" },
      { label: "Greece", value: "GR" },
      { label: "Grenada", value: "GD" },
      { label: "Guatemala", value: "GT" },
      { label: "Guinea", value: "GN" },
      { label: "Guinea-Bissau", value: "GW" },
      { label: "Guyana", value: "GY" },

      { label: "Haiti", value: "HT" },
      { label: "Honduras", value: "HN" },
      { label: "Hungary", value: "HU" },

      { label: "Iceland", value: "IS" },
      { label: "India", value: "IN" },
      { label: "Indonesia", value: "ID" },
      { label: "Iran", value: "IR" },
      { label: "Iraq", value: "IQ" },
      { label: "Ireland", value: "IE" },
      { label: "Israel", value: "IL" },
      { label: "Italy", value: "IT" },

      { label: "Jamaica", value: "JM" },
      { label: "Japan", value: "JP" },
      { label: "Jordan", value: "JO" },

      { label: "Kazakhstan", value: "KZ" },
      { label: "Kenya", value: "KE" },
      { label: "Kiribati", value: "KI" },
      { label: "Korea (North)", value: "KP" },
      { label: "Korea (South)", value: "KR" },
      { label: "Kuwait", value: "KW" },
      { label: "Kyrgyzstan", value: "KG" },

      { label: "Laos", value: "LA" },
      { label: "Latvia", value: "LV" },
      { label: "Lebanon", value: "LB" },
      { label: "Lesotho", value: "LS" },
      { label: "Liberia", value: "LR" },
      { label: "Libya", value: "LY" },
      { label: "Liechtenstein", value: "LI" },
      { label: "Lithuania", value: "LT" },
      { label: "Luxembourg", value: "LU" },

      { label: "Madagascar", value: "MG" },
      { label: "Malawi", value: "MW" },
      { label: "Malaysia", value: "MY" },
      { label: "Maldives", value: "MV" },
      { label: "Mali", value: "ML" },
      { label: "Malta", value: "MT" },
      { label: "Marshall Islands", value: "MH" },
      { label: "Mauritania", value: "MR" },
      { label: "Mauritius", value: "MU" },
      { label: "Mexico", value: "MX" },
      { label: "Micronesia", value: "FM" },
      { label: "Moldova", value: "MD" },
      { label: "Monaco", value: "MC" },
      { label: "Mongolia", value: "MN" },
      { label: "Montenegro", value: "ME" },
      { label: "Morocco", value: "MA" },
      { label: "Mozambique", value: "MZ" },
      { label: "Myanmar", value: "MM" },

      { label: "Namibia", value: "NA" },
      { label: "Nauru", value: "NR" },
      { label: "Nepal", value: "NP" },
      { label: "Netherlands", value: "NL" },
      { label: "New Zealand", value: "NZ" },
      { label: "Nicaragua", value: "NI" },
      { label: "Niger", value: "NE" },
      { label: "Nigeria", value: "NG" },
      { label: "North Macedonia", value: "MK" },
      { label: "Norway", value: "NO" },

      { label: "Oman", value: "OM" },

      { label: "Pakistan", value: "PK" },
      { label: "Palau", value: "PW" },
      { label: "Panama", value: "PA" },
      { label: "Papua New Guinea", value: "PG" },
      { label: "Paraguay", value: "PY" },
      { label: "Peru", value: "PE" },
      { label: "Philippines", value: "PH" },
      { label: "Poland", value: "PL" },
      { label: "Portugal", value: "PT" },

      { label: "Qatar", value: "QA" },

      { label: "Romania", value: "RO" },
      { label: "Russia", value: "RU" },
      { label: "Rwanda", value: "RW" },

      { label: "Saint Kitts and Nevis", value: "KN" },
      { label: "Saint Lucia", value: "LC" },
      { label: "Saint Vincent and the Grenadines", value: "VC" },
      { label: "Samoa", value: "WS" },
      { label: "San Marino", value: "SM" },
      { label: "Sao Tome and Principe", value: "ST" },
      { label: "Saudi Arabia", value: "SA" },
      { label: "Senegal", value: "SN" },
      { label: "Serbia", value: "RS" },
      { label: "Seychelles", value: "SC" },
      { label: "Sierra Leone", value: "SL" },
      { label: "Singapore", value: "SG" },
      { label: "Slovakia", value: "SK" },
      { label: "Slovenia", value: "SI" },
      { label: "Solomon Islands", value: "SB" },
      { label: "Somalia", value: "SO" },
      { label: "South Africa", value: "ZA" },
      { label: "South Sudan", value: "SS" },
      { label: "Spain", value: "ES" },
      { label: "Sri Lanka", value: "LK" },
      { label: "Sudan", value: "SD" },
      { label: "Suriname", value: "SR" },
      { label: "Sweden", value: "SE" },
      { label: "Switzerland", value: "CH" },
      { label: "Syria", value: "SY" },

      { label: "Taiwan", value: "TW" },
      { label: "Tajikistan", value: "TJ" },
      { label: "Tanzania", value: "TZ" },
      { label: "Thailand", value: "TH" },
      { label: "Timor-Leste", value: "TL" },
      { label: "Togo", value: "TG" },
      { label: "Tonga", value: "TO" },
      { label: "Trinidad and Tobago", value: "TT" },
      { label: "Tunisia", value: "TN" },
      { label: "Turkey", value: "TR" },
      { label: "Turkmenistan", value: "TM" },
      { label: "Tuvalu", value: "TV" },

      { label: "Uganda", value: "UG" },
      { label: "Ukraine", value: "UA" },
      { label: "United Arab Emirates", value: "AE" },
      { label: "United Kingdom", value: "GB" },
      { label: "United States", value: "US" },
      { label: "Uruguay", value: "UY" },
      { label: "Uzbekistan", value: "UZ" },

      { label: "Vanuatu", value: "VU" },
      { label: "Vatican City", value: "VA" },
      { label: "Venezuela", value: "VE" },
      { label: "Vietnam", value: "VN" },

      { label: "Yemen", value: "YE" },

      { label: "Zambia", value: "ZM" },
      { label: "Zimbabwe", value: "ZW" }
    ];
  }
}
