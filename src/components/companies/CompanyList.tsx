'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Building2, CheckCircle, XCircle, Download, ArrowUpDown } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  nip: string;
  regon?: string | null;
  krs?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  invoiceCount: number;
  lastInvoiceDate?: string | null;
  totalSpent: number;
  vatRegistered: boolean;
  createdAt: string;
}

interface CompanyListProps {
  companies: Company[];
}

type SortField = 'name' | 'nip' | 'invoiceCount' | 'totalSpent' | 'createdAt' | 'lastInvoiceDate';
type SortOrder = 'asc' | 'desc';

export function CompanyList({ companies: initialCompanies }: CompanyListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [vatFilter, setVatFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Get unique cities for filter
  const cities = useMemo(() => {
    const uniqueCities = new Set(
      initialCompanies.map((c) => c.city).filter((city): city is string => !!city)
    );
    return Array.from(uniqueCities).sort();
  }, [initialCompanies]);

  // Filter and sort companies
  const companies = useMemo(() => {
    const filtered = initialCompanies.filter((company) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        company.name.toLowerCase().includes(searchLower) ||
        company.nip.includes(searchLower) ||
        company.regon?.includes(searchLower) ||
        company.krs?.includes(searchLower) ||
        company.city?.toLowerCase().includes(searchLower);

      const matchesVat =
        vatFilter === 'all' ||
        (vatFilter === 'registered' && company.vatRegistered) ||
        (vatFilter === 'unregistered' && !company.vatRegistered);

      const matchesCity = cityFilter === 'all' || company.city === cityFilter;

      return matchesSearch && matchesVat && matchesCity;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number | null | undefined = a[sortField];
      let bVal: string | number | null | undefined = b[sortField];

      // Handle null values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Convert dates to timestamps for comparison
      if (sortField === 'createdAt' || sortField === 'lastInvoiceDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal, 'pl-PL')
          : bVal.localeCompare(aVal, 'pl-PL');
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [initialCompanies, searchQuery, vatFilter, cityFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const exportToCSV = () => {
    const headers = ['Name', 'NIP', 'REGON', 'KRS', 'City', 'VAT Registered', 'Invoices', 'Total Spent'];
    const rows = companies.map((c) => [
      c.name,
      c.nip,
      c.regon || '',
      c.krs || '',
      c.city || '',
      c.vatRegistered ? 'Yes' : 'No',
      c.invoiceCount.toString(),
      c.totalSpent.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `companies-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, NIP, REGON, KRS, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* VAT Filter */}
        <select
          value={vatFilter}
          onChange={(e) => setVatFilter(e.target.value as 'all' | 'registered' | 'unregistered')}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All VAT Status</option>
          <option value="registered">VAT Registered</option>
          <option value="unregistered">Not Registered</option>
        </select>

        {/* City Filter */}
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        {/* Export */}
        <button
          onClick={exportToCSV}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {companies.length} of {initialCompanies.length} companies
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b">
              <tr>
                <th className="text-left p-4">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600"
                  >
                    Company
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => toggleSort('nip')}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600"
                  >
                    NIP
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-4">Location</th>
                <th className="text-center p-4">VAT Status</th>
                <th className="text-right p-4">
                  <button
                    onClick={() => toggleSort('invoiceCount')}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600 ml-auto"
                  >
                    Invoices
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right p-4">
                  <button
                    onClick={() => toggleSort('totalSpent')}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600 ml-auto"
                  >
                    Total Spent
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => toggleSort('lastInvoiceDate')}
                    className="flex items-center gap-1 font-semibold hover:text-blue-600"
                  >
                    Last Invoice
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No companies found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="p-4">
                      <Link
                        href={`/dashboard/companies/${company.id}`}
                        className="font-medium hover:text-blue-600 hover:underline"
                      >
                        {company.name}
                      </Link>
                      {company.regon ? (
                        <div className="text-xs text-gray-500 mt-1">REGON: {company.regon}</div>
                      ) : null}
                    </td>
                    <td className="p-4 font-mono text-sm">{company.nip}</td>
                    <td className="p-4 text-sm">
                      {company.city && company.postalCode ? (
                        <div>
                          <div>{company.city}</div>
                          <div className="text-xs text-gray-500">{company.postalCode}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {company.vatRegistered ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" title="VAT Registered" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400 mx-auto" title="Not Registered" />
                      )}
                    </td>
                    <td className="p-4 text-right font-medium">{company.invoiceCount}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(company.totalSpent)}</td>
                    <td className="p-4 text-sm">{formatDate(company.lastInvoiceDate)}</td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/companies/${company.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
