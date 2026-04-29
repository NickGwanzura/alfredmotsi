export interface RefrigerantInfo {
  suctionMin: number;
  suctionMax: number;
  dischargeMin: number;
  dischargeMax: number;
  gwp: number;
  gwpRating: 'Low' | 'Medium' | 'High';
  odsClass: 'Class I' | 'Class II' | 'Non-ODS';
  family: 'CFC' | 'HCFC' | 'HFC' | 'HC' | 'HFO';
  notes: string;
}

export const REFRIGERANT_INFO: Record<string, RefrigerantInfo> = {
  'R-22': {
    suctionMin: 55,
    suctionMax: 85,
    dischargeMin: 175,
    dischargeMax: 250,
    gwp: 1810,
    gwpRating: 'High',
    odsClass: 'Class II',
    family: 'HCFC',
    notes: 'HCFC — Montreal Protocol phase-out underway',
  },
  'R-410A': {
    suctionMin: 105,
    suctionMax: 145,
    dischargeMin: 325,
    dischargeMax: 475,
    gwp: 2088,
    gwpRating: 'High',
    odsClass: 'Non-ODS',
    family: 'HFC',
    notes: 'HFC — F-gas phasedown applies',
  },
  'R-32': {
    suctionMin: 120,
    suctionMax: 155,
    dischargeMin: 340,
    dischargeMax: 475,
    gwp: 675,
    gwpRating: 'Medium',
    odsClass: 'Non-ODS',
    family: 'HFC',
    notes: 'HFC — lower GWP alternative',
  },
  'R-134a': {
    suctionMin: 15,
    suctionMax: 35,
    dischargeMin: 135,
    dischargeMax: 220,
    gwp: 1430,
    gwpRating: 'High',
    odsClass: 'Non-ODS',
    family: 'HFC',
    notes: 'HFC — F-gas phasedown applies',
  },
  'R-407C': {
    suctionMin: 55,
    suctionMax: 85,
    dischargeMin: 200,
    dischargeMax: 290,
    gwp: 1774,
    gwpRating: 'High',
    odsClass: 'Non-ODS',
    family: 'HFC',
    notes: 'HFC blend — F-gas phasedown applies',
  },
  'R-600A': {
    suctionMin: 5,
    suctionMax: 25,
    dischargeMin: 75,
    dischargeMax: 130,
    gwp: 3,
    gwpRating: 'Low',
    odsClass: 'Non-ODS',
    family: 'HC',
    notes: 'Hydrocarbon — flammable, low GWP',
  },
  'R-290': {
    suctionMin: 60,
    suctionMax: 90,
    dischargeMin: 175,
    dischargeMax: 260,
    gwp: 3,
    gwpRating: 'Low',
    odsClass: 'Non-ODS',
    family: 'HC',
    notes: 'Hydrocarbon — flammable, low GWP',
  },
};

export interface PressureThresholds {
  suctionMin: number;
  suctionMax: number;
  dischargeMin: number;
  dischargeMax: number;
  refrigerant: string;
  known: boolean;
}

export function getPressureThresholds(refrigerantType?: string): PressureThresholds {
  const key = (refrigerantType || '').trim();
  const info = key ? REFRIGERANT_INFO[key] : undefined;
  if (info) {
    return {
      suctionMin: info.suctionMin,
      suctionMax: info.suctionMax,
      dischargeMin: info.dischargeMin,
      dischargeMax: info.dischargeMax,
      refrigerant: key,
      known: true,
    };
  }
  const fallback = REFRIGERANT_INFO['R-410A'];
  return {
    suctionMin: fallback.suctionMin,
    suctionMax: fallback.suctionMax,
    dischargeMin: fallback.dischargeMin,
    dischargeMax: fallback.dischargeMax,
    refrigerant: 'R-410A',
    known: false,
  };
}
