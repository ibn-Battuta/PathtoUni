// The real profile this engine was built against. Year 11 in 2026, HSC 2027, intake 2028.
export const YEAR11 = {
  year: 11, intakeYear: 2028,
  mathsPathway: 'advanced_ext1',
  english: ['english_advanced'],
  sciences: ['physics', 'chemistry'],
  technology: ['engineering_studies'],
  other: [{ name: 'Modern History', units: 2, area: 'hsie' }]
};

// Year 12: Extension 2 offered and accepted.
export const YEAR12_EXT2 = { ...YEAR11, year: 12, mathsPathway: 'advanced_ext1_ext2' };

export const YEAR12_DROP_BOTH = {
  ...YEAR12_EXT2, technology: [], other: []
};

export const YEAR11_DROP_BOTH = {
  ...YEAR11, technology: [], other: []
};

export const STANDARD_MATHS = { ...YEAR11, mathsPathway: 'standard2' };
