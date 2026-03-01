/**
 * Call scenarios for each service.
 * Each scenario defines: nature, type (urgence/standard), base severity,
 * caller texts (with emotion tag), suggested vehicles, and sample coords/addresses.
 */

const SCENARIOS_18 = [
  {
    nature: "Feu d'habitation",
    type: 'urgence',
    severity: 4,
    texts: [
      { text: "Allô ? Il y a le feu chez mon voisin ! Au {address}, au troisième étage. De la fumée noire sort par les fenêtres !", emotion: 'panique' },
      { text: "Incendie au {address} ! Les flammes sortent au deuxième, des gens crient aux fenêtres !", emotion: 'panique' },
    ],
    vehicles: ['FPT', 'EPA', 'VSAV'],
  },
  {
    nature: 'AVP',
    type: 'urgence',
    severity: 3,
    texts: [
      { text: "Accident sur {address}. Voiture retournée, le conducteur bouge plus !", emotion: 'panique' },
      { text: "Scooter renversé au {address}. Le gars au sol, conscient mais peut pas bouger.", emotion: 'calme' },
    ],
    vehicles: ['VSAV', 'FPT'],
  },
  {
    nature: 'Malaise',
    type: 'standard',
    severity: 2,
    texts: [
      { text: "Au {address}, un homme effondré sur un banc. Tout pâle, douleur thoracique.", emotion: 'calme' },
      { text: "Ma mère tombée dans les escaliers au {address}. 82 ans, jambe immobile.", emotion: 'agité' },
    ],
    vehicles: ['VSAV'],
  },
  {
    nature: 'Fuite de gaz',
    type: 'urgence',
    severity: 3,
    texts: [
      { text: "Forte odeur de gaz au {address}. Personne répond au rez-de-chaussée.", emotion: 'calme' },
    ],
    vehicles: ['FPT', 'VSAV'],
  },
  {
    nature: 'Feu de véhicule',
    type: 'standard',
    severity: 2,
    texts: [
      { text: "Voiture en feu sur le parking du {address}. Loin des autres véhicules, personne dedans.", emotion: 'calme' },
    ],
    vehicles: ['FPT'],
  },
  {
    nature: 'Ascenseur bloqué',
    type: 'standard',
    severity: 1,
    texts: [
      { text: "On est coincés dans l'ascenseur au {address} depuis 30 minutes !", emotion: 'agacé' },
    ],
    vehicles: ['VSAV'],
  },
];

const SCENARIOS_15 = [
  {
    nature: 'Arrêt cardiaque',
    type: 'urgence',
    severity: 5,
    texts: [
      { text: "Mon mari ne respire plus ! Au {address}, vite !", emotion: 'panique' },
    ],
    vehicles: ['SMUR', 'VSAV'],
  },
  {
    nature: 'Détresse respiratoire',
    type: 'urgence',
    severity: 4,
    texts: [
      { text: "Mon fils fait une crise d'asthme sévère au {address}. Il devient bleu.", emotion: 'panique' },
    ],
    vehicles: ['SMUR'],
  },
  {
    nature: 'Intoxication',
    type: 'standard',
    severity: 3,
    texts: [
      { text: "Intoxication médicamenteuse au {address}. Conscient mais somnolent.", emotion: 'calme' },
    ],
    vehicles: ['SMUR'],
  },
];

const SCENARIOS_17 = [
  {
    nature: 'Cambriolage en cours',
    type: 'urgence',
    severity: 4,
    texts: [
      { text: "Quelqu'un est en train de forcer la porte de mon voisin au {address} !", emotion: 'panique' },
    ],
    vehicles: ['BAC', 'PATROL'],
  },
  {
    nature: 'Rixe',
    type: 'urgence',
    severity: 3,
    texts: [
      { text: "Bagarre entre plusieurs personnes au {address}. Ça dégénère.", emotion: 'agité' },
    ],
    vehicles: ['PATROL', 'PATROL'],
  },
  {
    nature: 'Tapage nocturne',
    type: 'standard',
    severity: 1,
    texts: [
      { text: "Musique à fond au {address} depuis 23h, impossible de dormir.", emotion: 'agacé' },
    ],
    vehicles: ['PATROL'],
  },
];

module.exports = {
  SCENARIOS_18,
  SCENARIOS_15,
  SCENARIOS_17,
  allScenarios: { '18': SCENARIOS_18, '15': SCENARIOS_15, '17': SCENARIOS_17 },
};
