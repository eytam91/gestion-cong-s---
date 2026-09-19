import React from 'react';
import { Search, Filter, Globe, Building2 } from 'lucide-react';
import { ContractType, EmployeeStatus } from '@/types';

interface EmployeeFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: 'ALL' | EmployeeStatus;
  setStatusFilter: (value: 'ALL' | EmployeeStatus) => void;
  contractFilter: 'ALL' | ContractType;
  setContractFilter: (value: 'ALL' | ContractType) => void;
  totalCount: number;
  countLocal: number;
  countExpat: number;
  countTypeA: number;
  countTypeB: number;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  contractFilter,
  setContractFilter,
  totalCount,
  countLocal,
  countExpat,
  countTypeA,
  countTypeB,
}) => (
  <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
      {/* Search Box */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher par Nom, N° Matricule, ou Poste..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-medium"
        />
      </div>

      {/* Status Filter Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Statut:
        </span>
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-stone-900 text-white shadow-2xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Tous ({totalCount})
        </button>
        <button
          onClick={() => setStatusFilter('LOCAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'LOCAL'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Personnel Local ({countLocal})
        </button>
        <button
          onClick={() => setStatusFilter('EXPAT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'EXPAT'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Expatriés ({countExpat})
        </button>
      </div>

      {/* Contract Filter Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0">
          Contrat:
        </span>
        <button
          onClick={() => setContractFilter('ALL')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            contractFilter === 'ALL'
              ? 'bg-stone-800 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setContractFilter('TYPE_A')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            contractFilter === 'TYPE_A'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          Type A ({countTypeA})
        </button>
        <button
          onClick={() => setContractFilter('TYPE_B')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            contractFilter === 'TYPE_B'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
          }`}
        >
          Type B ({countTypeB})
        </button>
      </div>
    </div>
  </div>
);
