import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDb } from '../hooks/useDb';
import { useToast } from '../context/ToastContext';
import { Card, Button } from '../components/primitives';
import { KpiCard } from '../components/KpiCard';
import { fmtCurrency } from '../lib/format';
import { Download, AlertTriangle, FileText } from 'lucide-react';

export default function Analytics() {
  const db = useDb();
  const toast = useToast();

  const vehicles = db.vehicles;
  const trips = db.trips;
  const fuelLogs = db.fuel;
  const maintenanceLogs = db.maintenance;

  // 1. Operational Cost per Vehicle Calculations
  const fleetCostsBreakdown = vehicles.map((v) => {
    const fuelCost = fuelLogs.filter((f) => f.vehicle_id === v.id).reduce((sum, f) => sum + f.cost, 0);
    const maintCost = maintenanceLogs.filter((m) => m.vehicle_id === v.id).reduce((sum, m) => sum + m.cost, 0);
    const totalCost = fuelCost + maintCost;
    const totalRevenue = trips
      .filter((t) => t.vehicle_id === v.id && t.status === 'Completed')
      .reduce((sum, t) => sum + t.revenue, 0);

    const netProfit = totalRevenue - totalCost;
    // ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
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
        '',
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
      link.remove();

      toast.push('success', 'ROI Report downloaded successfully.');
    } catch (error) {
      console.error(error);
      toast.push('error', 'Failed to generate CSV export.');
    }
  };

  // 5. PDF Exporter (uses browser print)
  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.push('error', 'Popup blocked. Please allow popups for PDF export.');
        return;
      }

      const rows = fleetCostsBreakdown.map((item) =>
        `<tr>
          <td>${item.name}</td><td>${item.regNo}</td><td>${item.type}</td>
          <td style="text-align:right">${fmtCurrency(item.acqCost)}</td>
          <td style="text-align:right">${fmtCurrency(item.fuelCost)}</td>
          <td style="text-align:right">${fmtCurrency(item.maintCost)}</td>
          <td style="text-align:right">—</td>
          <td style="text-align:right;font-weight:bold">${fmtCurrency(item.totalCost)}</td>
          <td style="text-align:right;color:#16a34a">${fmtCurrency(item.totalRevenue)}</td>
          <td style="text-align:right;font-weight:bold">${item.roiPercent}%</td>
        </tr>`
      ).join('');

      printWindow.document.write(`
        <!DOCTYPE html><html><head><title>TransitOps Fleet ROI Report</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; padding: 40px; color: #1e293b; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.sub { font-size: 12px; color: #64748b; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
          .kpi { flex: 1; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
          .kpi-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
          @media print { body { padding: 20px; } }
        </style></head><body>
        <h1>TransitOps — Fleet ROI Report</h1>
        <p class="sub">Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <div class="kpi-row">
          <div class="kpi"><div class="kpi-label">Fuel Efficiency</div><div class="kpi-value">${fuelEfficiency} km/L</div></div>
          <div class="kpi"><div class="kpi-label">Fleet Utilization</div><div class="kpi-value">${fleetUtilizationPercent}%</div></div>
          <div class="kpi"><div class="kpi-label">Total Op. Cost</div><div class="kpi-value">${fmtCurrency(totalOperationalCost)}</div></div>
          <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmtCurrency(totalRevenue)}</div></div>
        </div>
        <table><thead><tr>
          <th>Vehicle</th><th>Reg No</th><th>Type</th><th style="text-align:right">Acq. Cost</th>
          <th style="text-align:right">Fuel</th><th style="text-align:right">Maint.</th>
          <th style="text-align:right">Trip Exp.</th><th style="text-align:right">Total Cost</th>
          <th style="text-align:right">Revenue</th><th style="text-align:right">ROI</th>
        </tr></thead><tbody>${rows}</tbody></table>
        </body></html>
      `);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 300);
      toast.push('success', 'PDF export opened in print dialog.');
    } catch (error) {
      console.error(error);
      toast.push('error', 'Failed to generate PDF export.');
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

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportCSV} className="shrink-0 font-display">
            <Download size={16} />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF} variant="secondary" className="shrink-0 font-display">
            <FileText size={16} />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Metric Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Fuel Efficiency"
          value={`${fuelEfficiency} km/L`}
          accent="var(--color-status-available)"
          sub="Across completed trips"
        />
        <KpiCard
          label="Fleet Utilization"
          value={`${fleetUtilizationPercent}%`}
          accent="var(--color-status-ontrip)"
          sub="Of active non-retired fleet"
        />
        <KpiCard
          label="Operational Cost"
          value={fmtCurrency(totalOperationalCost)}
          accent="var(--color-status-retired)"
          sub="Fuel + Maintenance"
        />
        <KpiCard
          label="Total Revenue"
          value={fmtCurrency(totalRevenue)}
          accent="var(--color-status-shop)"
          sub="Gross completed revenues"
        />
      </div>

      {/* Recharts Profitability Chart */}
      <Card className="p-5 border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm">
        <h3 className="font-display mb-4 text-sm font-bold tracking-tight text-[var(--color-text)]">
          Cost vs Revenue
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
      <Card className="overflow-hidden border-[var(--color-border)] bg-[var(--color-panel)] shadow-sm">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-panel-2)]">
          <h3 className="font-display text-xs font-bold text-[var(--color-text)]">
            Profitability & Cost Analysis
          </h3>
          <span className="text-[11px] text-orange-500 font-semibold font-mono">
            Average Cost: {fmtCurrency(averageVehicleCost)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-faint)] font-semibold tracking-tight text-[11px] bg-[var(--color-panel-2)]">
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Reg No</th>
                <th className="px-4 py-3 font-semibold text-right">Total Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Gross Revenue</th>
                <th className="px-4 py-3 font-semibold text-right">Net Profit</th>
                <th className="px-4 py-3 font-semibold text-right">ROI</th>
                <th className="px-4 py-3 font-semibold text-right">Cost Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {fleetCostsBreakdown.map((item) => {
                // Cost Anomaly Highlight: If vehicle total cost is > 25% above average fleet cost
                const isAnomaly = item.totalCost > averageVehicleCost * 1.25 && item.totalCost > 0;

                return (
                  <tr key={item.id} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">{item.name}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold">{item.regNo}</td>
                    <td className="px-4 py-3.5 font-mono text-right">{fmtCurrency(item.totalCost)}</td>
                    <td className="px-4 py-3.5 font-mono text-right text-emerald-500">{fmtCurrency(item.totalRevenue)}</td>
                    <td className={`px-4 py-3.5 font-mono text-right ${item.netProfit >= 0 ? 'text-[var(--color-text)]' : 'text-red-500'}`}>
                      {fmtCurrency(item.netProfit)}
                    </td>
                    <td className={`px-4 py-3.5 font-mono font-bold text-right ${item.roiPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {item.roiPercent}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold">
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
