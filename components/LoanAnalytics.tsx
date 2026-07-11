import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { Loan } from '../types';

interface LoanAnalyticsProps {
  loans: Loan[];
}

const COLORS = ['#D4A017', '#10B981', '#EF4444', '#6B7280'];

const LoanAnalytics: React.FC<LoanAnalyticsProps> = ({ loans }) => {
  const statusCounts = loans.reduce((acc, loan) => {
    acc[loan.status] = (acc[loan.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));

  const principalByStatus = loans.reduce((acc, loan) => {
    acc[loan.status] = (acc[loan.status] || 0) + loan.principal;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(principalByStatus).map(status => ({
    name: status,
    amount: principalByStatus[status]
  }));

  const totalActivePrincipal = loans
    .filter(l => l.status === 'Active')
    .reduce((sum, l) => sum + l.principal, 0);

  if (loans.length === 0) return null;

  return (
    <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-brand-navy p-6 rounded-xl border border-yellow-900/40 flex flex-col justify-center">
        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Active Principal</h3>
        <p className="text-4xl font-bold text-white">${totalActivePrincipal.toLocaleString()}</p>
        <div className="mt-4 pt-4 border-t border-yellow-900/30">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Total Loans</span>
            <span className="font-semibold">{loans.length}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Active Loans</span>
            <span className="font-semibold text-brand-gold">{statusCounts['Active'] || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Repaid Loans</span>
            <span className="font-semibold text-green-400">{statusCounts['Repaid'] || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-brand-navy p-6 rounded-xl border border-yellow-900/40 h-64">
        <h3 className="text-white font-semibold mb-4">Loan Status Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.name === 'Active' ? COLORS[0] :
                  entry.name === 'Repaid' ? COLORS[1] :
                  entry.name === 'Defaulted' ? COLORS[2] : COLORS[3]
                } />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0F1E35', borderColor: '#4a3600', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-brand-navy p-6 rounded-xl border border-yellow-900/40 h-64">
        <h3 className="text-white font-semibold mb-4">Principal by Status ($)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2e4a" vertical={false} />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value >= 1000 ? (value / 1000) + 'k' : value}`} />
            <Tooltip 
              cursor={{ fill: '#1a2e4a', opacity: 0.4 }}
              contentStyle={{ backgroundColor: '#0F1E35', borderColor: '#4a3600', color: '#fff' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.name === 'Active' ? COLORS[0] :
                  entry.name === 'Repaid' ? COLORS[1] :
                  entry.name === 'Defaulted' ? COLORS[2] : COLORS[3]
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LoanAnalytics;
