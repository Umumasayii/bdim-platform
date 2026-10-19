/*
  Location choices for sign-up and profiles: country → first-level division
  (province / county / region / state) → district. Rwanda lists its districts;
  elsewhere the third level is typed in (district, city or town). Every list
  also offers "Other / not listed", which switches to a text box.
*/

export interface CountryDivisions {
  /** What the first level is called in that country. */
  divisionLabel: string;
  /** What the second level is called (a list for Rwanda, typed in elsewhere). */
  localLabel: string;
  divisions: { name: string; districts?: string[] }[];
}

const list = (names: string[]) => names.map((name) => ({ name }));

export const LOCATIONS: Record<string, CountryDivisions> = {
  Rwanda: {
    divisionLabel: "Province",
    localLabel: "District",
    divisions: [
      { name: "Kigali City", districts: ["Gasabo", "Kicukiro", "Nyarugenge"] },
      { name: "Northern Province", districts: ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"] },
      { name: "Southern Province", districts: ["Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"] },
      { name: "Eastern Province", districts: ["Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"] },
      { name: "Western Province", districts: ["Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rusizi", "Rutsiro"] },
    ],
  },
  Burundi: {
    divisionLabel: "Province",
    localLabel: "Commune or town",
    divisions: list(["Buhumuza", "Bujumbura", "Burunga", "Butanyerera", "Gitega"]),
  },
  "DR Congo": {
    divisionLabel: "Province",
    localLabel: "Territory or city",
    divisions: list([
      "Bas-Uélé", "Équateur", "Haut-Katanga", "Haut-Lomami", "Haut-Uélé", "Ituri", "Kasaï", "Kasaï-Central", "Kasaï-Oriental",
      "Kinshasa", "Kongo-Central", "Kwango", "Kwilu", "Lomami", "Lualaba", "Mai-Ndombe", "Maniema", "Mongala", "Nord-Kivu",
      "Nord-Ubangi", "Sankuru", "Sud-Kivu", "Sud-Ubangi", "Tanganyika", "Tshopo", "Tshuapa",
    ]),
  },
  Kenya: {
    divisionLabel: "County",
    localLabel: "Sub-county or town",
    divisions: list([
      "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega",
      "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni",
      "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
      "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga",
      "Wajir", "West Pokot",
    ]),
  },
  Tanzania: {
    divisionLabel: "Region",
    localLabel: "District or town",
    divisions: list([
      "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara",
      "Mbeya", "Mjini Magharibi", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma",
      "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Unguja North", "Unguja South",
    ]),
  },
  Uganda: {
    divisionLabel: "Region",
    localLabel: "District or town",
    divisions: list(["Central", "Eastern", "Northern", "Western"]),
  },
  "South Sudan": {
    divisionLabel: "State",
    localLabel: "County or town",
    divisions: list([
      "Central Equatoria", "Eastern Equatoria", "Jonglei", "Lakes", "Northern Bahr el Ghazal", "Unity", "Upper Nile", "Warrap",
      "Western Bahr el Ghazal", "Western Equatoria", "Abyei Administrative Area", "Greater Pibor Administrative Area",
      "Ruweng Administrative Area",
    ]),
  },
  Ethiopia: {
    divisionLabel: "Region",
    localLabel: "Zone, woreda or town",
    divisions: list([
      "Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama",
      "Somali", "South Ethiopia", "South West Ethiopia Peoples'", "Tigray",
    ]),
  },
  Nigeria: {
    divisionLabel: "State",
    localLabel: "LGA or town",
    divisions: list([
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
      "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
      "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
    ]),
  },
  Ghana: {
    divisionLabel: "Region",
    localLabel: "District or town",
    divisions: list([
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah",
      "Upper East", "Upper West", "Volta", "Western", "Western North",
    ]),
  },
  "South Africa": {
    divisionLabel: "Province",
    localLabel: "City or town",
    divisions: list(["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"]),
  },
};

export const COUNTRY_NAMES = Object.keys(LOCATIONS);
/** Select value meaning "type it in instead". */
export const OTHER = "__other__";

export const divisionsOf = (country: string) => LOCATIONS[country]?.divisions ?? [];
export const districtsOf = (country: string, province: string) => divisionsOf(country).find((d) => d.name === province)?.districts ?? [];
export const divisionLabel = (country: string) => LOCATIONS[country]?.divisionLabel ?? "Province, state or region";
export const localLabel = (country: string) => LOCATIONS[country]?.localLabel ?? "City or town";
