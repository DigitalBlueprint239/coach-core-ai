/**
 * FormationTemplates.js – Quick formation loading
 * - Shotgun, 4-3 Defense, and other common formations
 * - Instant field population with proper positioning
 */

import React, { memo } from 'react';
import { Users, Shield, Zap } from 'lucide-react';

const FORMATIONS = [
  {
    id: 'shotgun',
    name: 'Shotgun',
    description: 'Offensive formation with QB in shotgun',
    icon: Users,
    color: 'blue',
    positions: ['QB', 'RB', 'WR', 'WR', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT']
  },
  {
    id: '4-3',
    name: '4-3 Defense',
    description: 'Defensive formation with 4 linemen, 3 linebackers',
    icon: Shield,
    color: 'red',
    positions: ['DE', 'DT', 'DT', 'DE', 'OLB', 'MLB', 'OLB', 'CB', 'CB', 'FS', 'SS']
  },
  {
    id: 'i-formation',
    name: 'I-Formation',
    description: 'Traditional offensive formation',
    icon: Users,
    color: 'green',
    positions: ['QB', 'FB', 'RB', 'WR', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT']
  },
  {
    id: '3-4',
    name: '3-4 Defense',
    description: 'Defensive formation with 3 linemen, 4 linebackers',
    icon: Shield,
    color: 'purple',
    positions: ['DE', 'NT', 'DE', 'OLB', 'ILB', 'ILB', 'OLB', 'CB', 'CB', 'FS', 'SS']
  }
];

const FormationTemplates = memo(({ onLoadFormation }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 text-sm mb-3">Formations</h3>
      
      <div className="space-y-2">
        {FORMATIONS.map((formation) => {
          const Icon = formation.icon;
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
            red: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
            green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
            purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
          };
          
          return (
            <button
              key={formation.id}
              onClick={() => onLoadFormation(formation.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 border ${colorClasses[formation.color]}`}
              title={formation.description}
            >
              <Icon size={16} />
              <div className="flex-1 text-left">
                <div className="font-medium">{formation.name}</div>
                <div className="text-xs opacity-75">
                  {formation.positions.length} players
                </div>
              </div>
              <Zap size={14} className="opacity-60" />
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Click any formation to instantly populate the field with players in proper positions.
        </p>
      </div>
    </div>
  );
});

FormationTemplates.displayName = 'FormationTemplates';

export default FormationTemplates; 