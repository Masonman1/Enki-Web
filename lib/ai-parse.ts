export const parseFiles = (files: File[], options: { focus?: 'setup' | 'procurement' | 'invoice' | 'closeout' | 'change-order' } = {}) => {
  // Stub for AI parsing: Mock risks from uploaded PDFs (configurable Claude/Grok later)
  // Ignore actual file contents for dev testing; return waterproofing-specific mocks based on focus
  const { focus } = options;
  let mocks: string[] = [];

  switch (focus) {
    case 'setup':
      mocks = [
        "Risk: Substrate mismatch (e.g., incompatible membrane on gypsum)",
        "Risk: VOC compliance violation in adhesive specs for CA jurisdiction"
      ];
      break;
    case 'procurement':
      mocks = [
        "Risk: Lead time for flashing materials exceeds GC schedule",
        "Risk: Stock issues on below-grade membranes"
      ];
      break;
    case 'invoice':
      mocks = [
        "Risk: Rate mismatch on membrane install",
        "Risk: Unapproved extras in billing"
      ];
      break;
    case 'closeout':
      mocks = [
        "Risk: Incomplete warranty on below-grade waterproofing",
        "Risk: Punch list resolution pending for sequencing issues"
      ];
      break;
    case 'change-order':
      mocks = [
        "Risk: Scope change without pricing protection",
        "Risk: Sequencing dependency not addressed (e.g., prior to drywall)"
      ];
      break;
    case 'pds':
  mocks = files.map(file => ({ // Structured for DB
    manufacturer: 'Stub Mfr',
    name: file.name.split('.')[0],
    voc_level: 50.5, // Mock float
    compatibility: ['concrete', 'gypsum'] // JSONB array
  }));
  return mocks;
  break;
  case 'kickoff':
  mocks = [
    "Risk: SSSP missing VOC handling training for adhesives",
    "Risk: RFI needed for substrate prep sequencing (e.g., prior to membrane install)"
  ];
  break;
  case 'submittals':
  mocks = [
    "Risk: Submittal mismatch on membrane thickness",
    "Risk: Warranty registration pending for flashing materials"
  ];
  break;
  case 'scheduling':
  mocks = [
    "Risk: Sequencing overlap on substrate prep and membrane install",
    "Risk: Delay risk from lead time >4wks on flashing"
  ];
  break;  
    default:
      mocks = [
        "Risk: Substrate mismatch (e.g., incompatible membrane on gypsum)",
        "Risk: Lead time for flashing materials exceeds GC schedule",
        "Risk: VOC compliance violation in adhesive specs for CA jurisdiction",
        "Risk: Sequencing dependency not addressed (e.g., prior to drywall install)"
      ];
  }

  return mocks;
};