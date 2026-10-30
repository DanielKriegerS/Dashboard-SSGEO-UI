export const navigationMenus = [
  {
    id: 'planning', label: 'Planejamento', path: '/planning', icon: 'file-spreadsheet',
    children: [
      { label: 'Planner', path: '/planner', icon: 'file-spreadsheet' },
      { label: 'Quarters', path: '/quarters', icon: 'file-text' },
      { label: 'Sprints', path: '/sprints', icon: 'file-text' },
      { label: 'Coatends', path: '/coatends', icon: 'file-text' }
    ]
  },
  {
    id: 'admin', label: 'Administração', path: '/admin', icon: 'file-text',
    children: [
      { label: 'Features', path: '/admin/features', icon: 'file-text' },
      { label: 'Desenvolvedores', path: '/admin/developers', icon: 'file-text' }
    ]
  }
] as const;