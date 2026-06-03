export const DEMO_ESTABLISHMENT_NAME = 'Le Bistrot du Port — Démo'

export const DEMO_EMPLOYEES = [
  { full_name: 'Sophie Martin',   position: 'Serveuse',        contract_type: 'CDI', weekly_hours: 35 },
  { full_name: 'Thomas Dubois',   position: 'Cuisinier',       contract_type: 'CDI', weekly_hours: 39 },
  { full_name: 'Emma Bernard',    position: 'Serveuse',        contract_type: 'CDD', weekly_hours: 24 },
  { full_name: 'Lucas Moreau',    position: 'Chef de rang',    contract_type: 'CDI', weekly_hours: 39 },
  { full_name: 'Chloé Petit',     position: 'Plongeuse',       contract_type: 'CDI', weekly_hours: 35 },
  { full_name: 'Maxime Simon',    position: 'Barman',          contract_type: 'CDI', weekly_hours: 39 },
  { full_name: 'Julie Lambert',   position: 'Serveuse',        contract_type: 'CDD', weekly_hours: 20 },
  { full_name: 'Antoine Durand',  position: 'Second de cuisine', contract_type: 'CDI', weekly_hours: 39 },
]

// Postes à créer pour la démo
export const DEMO_POSTES = [
  { name: 'Salle',    color: '#6366F1', break_minutes: 30 },
  { name: 'Cuisine',  color: '#F59E0B', break_minutes: 30 },
  { name: 'Bar',      color: '#10B981', break_minutes: 20 },
  { name: 'Direction', color: '#8B5CF6', break_minutes: 0 },
]

// Shifts de démonstration pour la semaine courante (lun-dim)
// start_time / end_time au format "HH:mm"
export type DemoShiftTemplate = {
  position: string
  days: number[] // 0=lundi, 6=dimanche
  start_time: string
  end_time: string
}

export const DEMO_SHIFT_TEMPLATES: DemoShiftTemplate[] = [
  { position: 'Salle',    days: [0, 1, 2, 3, 4], start_time: '11:00', end_time: '15:00' },
  { position: 'Salle',    days: [0, 1, 2, 3, 4], start_time: '18:00', end_time: '23:00' },
  { position: 'Cuisine',  days: [0, 1, 2, 3, 4], start_time: '10:00', end_time: '15:00' },
  { position: 'Cuisine',  days: [0, 1, 2, 3, 4], start_time: '17:00', end_time: '23:00' },
  { position: 'Bar',      days: [4, 5, 6],        start_time: '18:00', end_time: '02:00' },
  { position: 'Salle',    days: [5, 6],            start_time: '10:30', end_time: '16:00' },
]

// Demandes de congé démo
export const DEMO_LEAVE_REQUESTS = [
  { type: 'CP',       start_date: '+7d',  end_date: '+14d', status: 'pending' },
  { type: 'maladie',  start_date: '-3d',  end_date: '-1d',  status: 'approved' },
  { type: 'RTT',      start_date: '+21d', end_date: '+21d', status: 'pending' },
]
