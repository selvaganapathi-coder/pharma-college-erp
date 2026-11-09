import type { Book } from "./types";

const SHELVES = ["Pharmaceutics", "Pharmaceutical Chemistry", "Pharmacology", "Pharmacognosy", "Clinical Pharmacy"] as const;
const TYPES = ["Textbook", "Textbook", "Textbook", "Reference", "Journal", "Pharmacopoeia", "E-book"] as const;

const TITLES: [string, string][] = [
  ["Dispensing Pharmaceutics", "Cooper"],
  ["Physical Pharmacy", "Martin"],
  ["Pharmaceutical Calculations", "Ansel"],
  ["Industrial Pharmacy", "Lachman"],
  ["Biopharmaceutics", "Shargel"],
  ["Dosage Form Design", "Aulton"],
  ["Sterile Products", "Avis"],
  ["Cosmetic Science", "Balsam"],
  ["Hospital Pharmacy", "Hassan"],
  ["Pharmacy Law", "Kokate"],
  ["Organic Pharmaceutical Chemistry", "Wilson"],
  ["Medicinal Chemistry", "Lemke"],
  ["Inorganic Pharmaceutical Chemistry", "Beckett"],
  ["Biochemistry for Pharmacy", "Satyanarayana"],
  ["Pharmaceutical Analysis", "Connors"],
  ["Instrumental Methods", "Willard"],
  ["Spectroscopy", "Silverstein"],
  ["Quality Assurance", "Potdar"],
  ["Drug Design", "Patrick"],
  ["Heterocyclic Chemistry", "Acheson"],
  ["Essentials of Pharmacology", "Tripathi"],
  ["Clinical Pharmacology", "Bennett"],
  ["Pharmacotherapy", "DiPiro"],
  ["Toxicology", "Casarett"],
  ["Autonomic Pharmacology", "Rang"],
  ["Cardiovascular Drugs", "Katzung"],
  ["Antimicrobial Agents", "Goodman"],
  ["Endocrine Pharmacology", "Goodman"],
  ["Neuropharmacology", "Cooper"],
  ["Pharmacokinetics", "Rowland"],
  ["Pharmacognosy", "Kokate"],
  ["Herbal Drug Technology", "Agarwal"],
  ["Plant Tissue Culture", "Razdan"],
  ["Phytochemistry", "Harborne"],
  ["Natural Products", "Trease"],
  ["Ayurvedic Pharmacy", "Sharma"],
  ["Marine Pharmacognosy", "Newman"],
  ["Essential Oils", "Guenther"],
  ["Crude Drugs", "Wallis"],
  ["Indian Pharmacopoeia Guide", "IPC"],
  ["Clinical Pharmacy", "Tipnis"],
  ["Hospital Drug Policy", "Parthasarathi"],
  ["Patient Counselling", "Ramesh"],
  ["Community Pharmacy", "Stone"],
  ["Pharmacovigilance", "Waller"],
  ["Therapeutics Case Book", "Walker"],
  ["Drug Information", "Malone"],
  ["Pharmacy Practice", "Whalley"],
  ["Prescription Reading", "Carter"],
  ["Clinical Research Methods", "Hulley"],
];

export function samplePharmacyBooks(): Book[] {
  return TITLES.map(([title, author], index) => {
    const number = String(index + 1).padStart(2, "0");
    const subject = SHELVES[index % SHELVES.length];
    const resourceType = TYPES[index % TYPES.length];
    return {
      id: `sample-book-${number}`,
      isbn: `978817${String(100000 + index)}`,
      title,
      author,
      copies: index % 11 === 0 ? 1 : 2,
      subject,
      keywords: subject,
      edition: `${(index % 8) + 1}th`,
      year: String(2016 + (index % 10)),
      publisher: "Pharmacy Press",
      resourceType,
      callNumber: `RS ${120 + index}`,
      shelf: subject,
      course: "B.Pharm",
      semester: String((index % 8) + 1),
      description: resourceType === "Reference" || resourceType === "Pharmacopoeia" ? "Reference use only." : "",
      catalogedOn: "2026-06-01",
    };
  });
}
