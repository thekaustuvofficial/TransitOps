import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDb } from '../hooks/useDb';
import { useToast } from '../context/ToastContext';
import { Card, Button } from '../components/primitives';
import { fmtCurrency } from '../lib/format';
import { Download, AlertTriangle, TrendingUp, Compass, Activity, ShieldAlert } from 'lucide-react';

export default function Analytics() {
  const db = useDb();
  const toast = useToast();

  const vehicles = db.vehicles;
  const trips = db.trips;
  const fuelLogs = db.fuel;
  const maintenanceLogs = db.maintenance;
  const expenses = db.expenses;

  // 1. Operational Cost per Vehicle Calculations
  const fleetCostsBreakdown = vehicles.map((v) => {
    const fuelCost = fuelLogs.filter((f) => f.vehicle_id === v.id).reduce((sum, f) => sum + f.cost, 0);
    const maintCost = maintenanceLogs.filter((m) => m.vehicle_id === v.id).reduce((sum, m) => sum + m.cost, 0);
    const tripExp = expenses.filter((e) => e.vehicle_id === v.id).reduce((sum, e) => sum + e.toll + e.other, 0);
    const totalCost = fuelCost + maintCost + tripExp;
    const totalRevenue = trips
      .filter((t) => t.vehicle_id === v.id && t.status === 'Completed')
      .reduce((sum, t) => sum + t.revenue, 0);

    const netProfit = totalRevenue - totalCost;
    // ROI = (Revenue - (Maintenance + Fuel + Expenses)) / Acquisition Cost
    const roiPercent = v.acquisition_cost > 0
      ? Math.round((netProfit / v.acquisition_cost) * 100)
      : 0;

    return {
      id: v.id,
      name: v.name,
      regNo: v.reg_no,
      type: v.type,
      acqCost: v.acquisition_cost,
      fuelCost,
      maintCost,
      tripExp,
      totalCost,
      totalRevenue,
      netProfit,
      roiPercent,
    };
  });

  // Calculate averages for cost anomaly highlight
  const totalFleetCost = fleetCostsBreakdown.reduce((sum, item) => sum + item.totalCost, 0);
  const averageVehicleCost = vehicles.length > 0 ? totalFleetCost / vehicles.length : 0;

  // 2. Global KPIs
  const totalOperationalCost = totalFleetCost;
  const totalRevenue = trips.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + t.revenue, 0);

  // Fuel Efficiency (Total Distance of Completed Trips / Total Fuel consumed of Completed Trips)
  const completedTrips = trips.filter((t) => t.status === 'Completed');
  const totalDistance = completedTrips.reduce((sum, t) => sum + t.planned_distance_km, 0);
  const totalFuelLiters = completedTrips.reduce((sum, t) => sum + (t.fuel_consumed_l || 0), 0);
  const fuelEfficiency = totalFuelLiters > 0
    ? Number((totalDistance / totalFuelLiters).toFixed(2))
    : 0;

  // Fleet Utilization (Active Vehicles / Total Non-Retired)
  const nonRetiredVehicles = vehicles.filter((v) => v.status !== 'Retired');
  const activeVehicles = vehicles.filter((v) => v.status === 'On Trip');
  const fleetUtilizationPercent = nonRetiredVehicles.length > 0
    ? Math.round((activeVehicles.length / nonRetiredVehicles.length) * 100)
    : 0;

  // 3. Chart Data
  const chartData = fleetCostsBreakdown.map((item) => ({
    name: item.name,
    Cost: item.totalCost,
    Revenue: item.totalRevenue,
    ROI: item.roiPercent,
  }));

  // 4. CSV Exporter
  const handleExportCSV = () => {
    try {
      const headers = ['Vehicle Name', 'Registration No', 'Type', 'Acquisition Cost (₹)', 'Fuel Cost (₹)', 'Maintenance Cost (₹)', 'Tolls/Expenses (₹)', 'Total Cost (₹)', 'Revenue Generated (₹)', 'ROI (%)'];
      const rows = fleetCostsBreakdown.map((item) => [
        item.name,
        item.regNo,
        item.type,
        item.acqCost,
        item.fuelCost,
        item.maintCost,
        item.tripExp,
        item.totalCost,
        item.totalRevenue,
        `${item.roiPercent}%`,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map((val) => `"${val}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `TransitOPS_Fleet_ROI_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.push('success', 'ROI Report downloaded successfully.');
    } catch (error) {
      toast.push('error', 'Failed to generate CSV export.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
            Reports & Analytics
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Analyze overall fleet profitability, fuel metrics, operational costs, and identify cost anomalies.
          </p>
        </div>

        <Button onClick={handleExportCSV} className="shrink-0 font-display">
          <Download size={16} />
          Export ROI Ledger (CSV)
        </Button>
      </div>

      {/* KPI Metric Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Fuel Efficiency */}
        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-panel)] flex items-center gap-4">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
            <Compass size={22} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Fuel Efficiency</p>
            <p className="font-display text-lg font-bold text-[var(--color-text)] mt-0.5">{fuelEfficiency} km/L</p>
            <p className="text-[9px] text-[var(--color-text-faint)]">across completed trips</p>
          </div>
        </Card>

        {/* Fleet Utilization */}
        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-panel)] flex items-center gap-4">
          <div className="rounded-lg bg-blue-500/10 p-2.5 text-blue-400">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Fleet Utilization</p>
            <p className="font-display text-lg font-bold text-[var(--color-text)] mt-0.5">{fleetUtilizationPercent}%</p>
            <p className="text-[9px] text-[var(--color-text-faint)]">of active non-retired fleet</p>
          </div>
        </Card>

        {/* Operational Cost */}
        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-panel)] flex items-center gap-4">
          <div className="rounded-lg bg-red-500/10 p-2.5 text-red-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Operational Cost</p>
            <p className="font-display text-lg font-bold text-[var(--color-text)] mt-0.5">{fmtCurrency(totalOperationalCost)}</p>
            <p className="text-[9px] text-[var(--color-text-faint)]">Fuel + Maintenance + Tolls</p>
          </div>
        </Card>

        {/* Vehicle ROI */}
        <Card className="p-4 border-[var(--color-border)] bg-[var(--color-panel)] flex items-center gap-4">
          <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-400">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Total Revenue</p>
            <p className="font-display text-lg font-bold text-[var(--color-text)] mt-0.5">{fmtCurrency(totalRevenue)}</p>
            <p className="text-[9px] text-[var(--color-text-faint)]">gross completed revenues</p>
          </div>
        </Card>
      </div>

      {/* Recharts Profitability Chart */}
      <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)]">
        <h3 className="font-display mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
          Vehicle Cost vs Revenue Comparison
        </h3>
        <div className="h-72 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-panel)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
                formatter={(value: any) => [fmtCurrency(Number(value)), '']}
              />
              <Legend />
              <Bar dataKey="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed ROI & Cost Anomaly Ledger */}
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold uppercase text-[var(--color-text)]">
            Vehicle Profitability & Cost Anomalies Ledger
          </h3>
          <span className="text-[10px] text-[var(--color-text-faint)] font-medium">
            Average Vehicle Cost: {fmtCurrency(averageVehicleCost)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="px-4 py-3 font-medium">VEHICLE</th>
                <th className="px-4 py-3 font-medium">REG NO.</th>
                <th className="px-4 py-3 font-medium font-display text-right">TOTAL COST</th>
                <th className="px-4 py-3 font-medium font-display text-right">GROSS REVENUE</th>
                <th className="px-4 py-3 font-medium font-display text-right">NET PROFIT</th>
                <th className="px-4 py-3 font-medium font-display text-right">ROI (%)</th>
                <th className="px-4 py-3 font-medium text-right">COST ANOMALY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {fleetCostsBreakdown.map((item) => {
                // Cost Anomaly Highlight: If vehicle total cost is > 25% above average fleet cost
                const isAnomaly = item.totalCost > averageVehicleCost * 1.25 && item.totalCost > 0;

                return (
                  <tr key={item.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">{item.name}</td>
                    <td className="px-4 py-3.5 font-display font-semibold">{item.regNo}</td>
                    <td className="px-4 py-3.5 font-display text-right">{fmtCurrency(item.totalCost)}</td>
                    <td className="px-4 py-3.5 font-display text-right text-emerald-400">{fmtCurrency(item.totalRevenue)}</td>
                    <td className={`px-4 py-3.5 font-display text-right ${item.netProfit >= 0 ? 'text-[var(--color-text)]' : 'text-red-400'}`}>
                      {fmtCurrency(item.netProfit)}
                    </td>
                    <td className={`px-4 py-3.5 font-display font-bold text-right ${item.roiPercent >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                      {item.roiPercent}%
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isAnomaly ? (
                        <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold text-red-400">
                          <AlertTriangle size={10} />
                          Above Average Cost
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-faint)]">Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
