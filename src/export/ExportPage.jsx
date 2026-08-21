import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FileDown, CalendarRange, BarChart3, FileText, Package, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from '../shared/theme';
import { formatMoney, firstOfMonth, todayISO } from '../shared/helpers';
import { COST_CENTRES } from '../costCentres';
import { getStockUsage } from '../lib/db';
import DateField from '../shared/DateField';

const PRESETS = [
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'thisYear', label: 'This year' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthsInRange(start, end) {
  const months = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export default function ExportPage({ orders, inventory, showToast }) {
  const [exportMode, setExportMode] = useState('procurement');
  const [start, setStart] = useState(firstOfMonth(todayISO()));
  const [end, setEnd] = useState(todayISO());
  const [exporting, setExporting] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const completedStatuses = ['picked_up'];

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o =>
      completedStatuses.includes(o.status) &&
      o.pickup_date >= start &&
      o.pickup_date <= end
    );
  }, [orders, start, end]);

  const rangeTotal = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.order_total || 0), 0);
  }, [filteredOrders]);

  const totalLineItems = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
  }, [filteredOrders]);

  useEffect(() => {
    if (exportMode === 'usage' || exportMode === 'restock') {
      loadData();
    }
  }, [exportMode, start, end]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const direction = exportMode === 'restock' ? 'increase' : 'decrease';
      const data = await getStockUsage(start, end, direction);
      setStockData(data);
    } catch (err) {
      showToast('error', 'Failed to load data.');
    } finally {
      setLoadingData(false);
    }
  };

  const usageMonths = useMemo(() => getMonthsInRange(start, end), [start, end]);

  const spreadsheetData = useMemo(() => {
    const allItems = (inventory || []).map(item => {
      const itemMonths = {};
      usageMonths.forEach(m => { itemMonths[m] = 0; });
      let total = 0;
      (stockData || []).filter(u => u.item_id === item.id).forEach(u => {
        if (itemMonths[u.usage_month] !== undefined) {
          itemMonths[u.usage_month] += u.quantity;
          total += u.quantity;
        }
      });
      return {
        id: item.id,
        code: item.code || '',
        name: item.name,
        unit: item.unit || '',
        months: itemMonths,
        total,
      };
    });
    return allItems;
  }, [inventory, stockData, usageMonths]);

  const spreadsheetTotal = useMemo(() => {
    const totals = {};
    usageMonths.forEach(m => { totals[m] = 0; });
    let grand = 0;
    spreadsheetData.forEach(item => {
      usageMonths.forEach(m => {
        totals[m] += item.months[m];
        grand += item.months[m];
      });
    });
    return { months: totals, grand };
  }, [spreadsheetData, usageMonths]);

  const getPresetRange = (preset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const fmt = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (preset === 'thisMonth') {
      const start = d >= 26 ? new Date(y, m, 26) : new Date(y, m - 1, 26);
      const end = d >= 26 ? new Date(y, m + 1, 25) : new Date(y, m, 25);
      setStart(fmt(start));
      setEnd(fmt(end));
    } else if (preset === 'lastMonth') {
      const start = d >= 26 ? new Date(y, m - 1, 26) : new Date(y, m - 2, 26);
      const end = d >= 26 ? new Date(y, m, 25) : new Date(y, m - 1, 25);
      setStart(fmt(start));
      setEnd(fmt(end));
    } else if (preset === 'last7') {
      const start = new Date(y, m, now.getDate() - 6);
      setStart(fmt(start));
      setEnd(fmt(now));
    } else if (preset === 'thisYear') {
      setStart(`${y}-01-01`);
      setEnd(`${y}-12-31`);
    }
  };

  const getCostCentreCode = (accountCode) => {
    const centre = COST_CENTRES.find(c => c.code === accountCode);
    return centre ? centre.code : accountCode || '';
  };

  const runExport = () => {
    if (start > end) {
      showToast('error', 'Start date must be on or before end date.');
      return;
    }

    if (exportMode === 'procurement') {
      runProcurementExport();
    } else if (exportMode === 'usage') {
      runSpreadsheetExport('Purchased Items', 'Purchased_Items');
    } else {
      runSpreadsheetExport('Restocking', 'Restocking');
    }
  };

  const runProcurementExport = () => {
    if (filteredOrders.length === 0) {
      showToast('error', 'No completed orders in that date range.');
      return;
    }

    setExporting(true);
    try {
      const monthName = new Date(start + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const rows = [
        [`PROCUREMENT REPORT - ${monthName}`],
        ['Date', 'Transaction Reference', 'Acct Code', 'Account Name', 'Fund', 'Fnct', 'Transaction Description', 'Quantity', 'Amount', 'Currency'],
      ];

      [...filteredOrders].sort((a, b) => (a.account_name || '').localeCompare(b.account_name || '') || (a.pickup_date || '').localeCompare(b.pickup_date || '')).forEach(order => {
        (order.items || []).forEach(item => {
          rows.push([
            order.pickup_date || '',
            order.invoice_number || order.id || '',
            '888110',
            order.account_name || '',
            '10',
            getCostCentreCode(order.account_code),
            item.name || '',
            item.quantity || 0,
            item.lineTotal || 0,
            'TTD',
          ]);
        });
      });

      rows.push([]);
      rows.push([]);
      rows.push(['', '', '', '', '', '', 'Total Sum', '', rangeTotal, '']);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

      const dataRows = rows.slice(1);
      ws['!cols'] = dataRows[0].map((_, ci) => {
        const maxLen = dataRows.reduce((max, row) => {
          const val = row[ci] != null ? String(row[ci]) : '';
          return Math.max(max, val.length);
        }, 0);
        return { wch: Math.max(maxLen + 2, 10) };
      });

      for (let c = 0; c < 10; c++) {
        const ref = XLSX.utils.encode_cell({ r: 1, c });
        if (ws[ref]) ws[ref].s = { font: { bold: true } };
      }

      for (let r = 2; r < 2 + totalLineItems; r++) {
        const ref = XLSX.utils.encode_cell({ r, c: 8 });
        if (ws[ref]) ws[ref].z = '"$"#,##0.00';
      }

      const totalRow = 2 + totalLineItems + 3;
      const totalRef = XLSX.utils.encode_cell({ r: totalRow, c: 8 });
      if (ws[totalRef]) ws[totalRef].z = '"$"#,##0.00';

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Procurement Report');

      const filename = `Procurement_Report_${start}_to_${end}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast('success', 'Export downloaded.');
    } catch (err) {
      showToast('error', 'Export failed: ' + (err?.message || 'unknown'));
    } finally {
      setExporting(false);
    }
  };

  const runSpreadsheetExport = (sheetName, filePrefix) => {
    setExporting(true);
    try {
      const monthLabels = usageMonths.map(formatMonthLabel);
      const headers = ['Code', 'Name', 'Unit', ...monthLabels, 'Total', 'REORDER'];

      const title = exportMode === 'usage'
        ? `PURCHASED ITEMS SPREADSHEET - ${formatMonthLabel(usageMonths[0])} to ${formatMonthLabel(usageMonths[usageMonths.length - 1])}`
        : `RESTOCKING SPREADSHEET - ${formatMonthLabel(usageMonths[0])} to ${formatMonthLabel(usageMonths[usageMonths.length - 1])}`;

      const rows = [
        [title],
        headers,
      ];

      spreadsheetData.forEach(item => {
        const row = [
          item.code,
          item.name,
          item.unit,
          ...usageMonths.map(m => item.months[m]),
          item.total,
          '',
        ];
        rows.push(row);
      });

      rows.push([]);
      const totalRow = [
        '', '', '',
        ...usageMonths.map(m => spreadsheetTotal.months[m]),
        spreadsheetTotal.grand,
        '',
      ];
      rows.push(totalRow);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

      ws['!cols'] = headers.map((_, ci) => {
        const maxLen = rows.reduce((max, row) => {
          const val = row[ci] != null ? String(row[ci]) : '';
          return Math.max(max, val.length);
        }, 0);
        return { wch: Math.max(maxLen + 2, 12) };
      });

      for (let c = 0; c < headers.length; c++) {
        const ref = XLSX.utils.encode_cell({ r: 1, c });
        if (ws[ref]) ws[ref].s = { font: { bold: true } };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const filename = `${filePrefix}_${start}_to_${end}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast('success', 'Export downloaded.');
    } catch (err) {
      showToast('error', 'Export failed: ' + (err?.message || 'unknown'));
    } finally {
      setExporting(false);
    }
  };

  const isSpreadsheetMode = exportMode === 'usage' || exportMode === 'restock';

  const handleModeChange = (mode) => {
    setExportMode(mode);
    setShowPreview(false);
  };

  return (
    <div className="fade-in">
      <style>{`
        @media (max-width: 1024px) {
          .exp-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .exp-card { padding: 16px !important; }
          .exp-date-grid { grid-template-columns: 1fr !important; }
        }
        .usage-table-wrap { overflow-x: auto; }
        .usage-table { width: 100%; border-collapse: collapse; font-size: 13; }
        .usage-table th { text-align: left; padding: 8px 12px; font-size: 11; font-weight: 600; color: ${C.mute}; text-transform: uppercase; letter-spacing: 0.08em; background: ${C.softBg}; border-bottom: 2px solid ${C.line}; white-space: nowrap; }
        .usage-table td { padding: 8px 12px; border-bottom: 1px solid ${C.line}; }
        .usage-table tr:hover td { background: ${C.softBg}; }
        .usage-reorder { background: #FFF8E1 !important; }
      `}</style>

      <div style={{ marginBottom: 26 }}>
        <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 500, letterSpacing: '-0.015em' }}>
          Export
        </h2>
        <p style={{ margin: '6px 0 0', color: C.mute, fontSize: 14, maxWidth: 620 }}>
          Generate Excel workbooks for procurement reports, stock usage, and restocking.
        </p>
      </div>

      {/* Mode Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => handleModeChange('procurement')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: exportMode === 'procurement' ? C.primary : C.card,
            color: exportMode === 'procurement' ? '#FAF8F3' : C.ink,
            border: `1px solid ${exportMode === 'procurement' ? C.primary : C.line}`,
            borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          <FileText size={16} />
          Procurement Report
        </button>
        <button onClick={() => handleModeChange('usage')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: exportMode === 'usage' ? C.primary : C.card,
            color: exportMode === 'usage' ? '#FAF8F3' : C.ink,
            border: `1px solid ${exportMode === 'usage' ? C.primary : C.line}`,
            borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          <BarChart3 size={16} />
          Purchased Items Spreadsheet
        </button>
        <button onClick={() => handleModeChange('restock')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: exportMode === 'restock' ? C.primary : C.card,
            color: exportMode === 'restock' ? '#FAF8F3' : C.ink,
            border: `1px solid ${exportMode === 'restock' ? C.primary : C.line}`,
            borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          <TrendingUp size={16} />
          Restocking Spreadsheet
        </button>
      </div>

      <div className="exp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Date Range + Controls */}
        <div className="exp-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.25em', color: C.mute, fontWeight: 600, marginBottom: 14 }}>
            Date range
          </div>

          <div className="exp-date-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <DateField label="Start" value={start} onChange={setStart} />
            <DateField label="End" value={end} onChange={setEnd} />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => getPresetRange(p.id)}
                style={{
                  padding: '7px 12px', background: C.softBg, color: C.ink,
                  border: `1px solid ${C.line}`, borderRadius: 999, cursor: 'pointer',
                  fontSize: 11, fontWeight: 500, fontFamily: FONT_BODY,
                }}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 22, padding: '14px 16px', background: C.softBg, borderRadius: 8, fontSize: 12, color: C.mute }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CalendarRange size={14} />
              <span style={{ color: C.ink, fontWeight: 600, fontSize: 13 }}>Preview</span>
            </div>
            {exportMode === 'procurement' ? (
              <>
                <div>{filteredOrders.length} completed order{filteredOrders.length === 1 ? '' : 's'} in range</div>
                <div>{totalLineItems} line item{totalLineItems === 1 ? '' : 's'} total</div>
                <div>Range total: <span style={{ color: C.ink, fontWeight: 600, fontFamily: FONT_MONO }}>{formatMoney(rangeTotal)}</span></div>
              </>
            ) : (
              <>
                <div>{usageMonths.length} month{usageMonths.length === 1 ? '' : 's'} in range</div>
                <div>{(inventory || []).length} inventory items</div>
                <div>Total {exportMode === 'usage' ? 'usage' : 'restocked'}: <span style={{ color: C.ink, fontWeight: 600, fontFamily: FONT_MONO }}>{spreadsheetTotal.grand} units</span></div>
              </>
            )}
          </div>

          <button onClick={runExport} disabled={exporting || (exportMode === 'procurement' && filteredOrders.length === 0)}
            style={{
              width: '100%', marginTop: 20, padding: '14px 18px',
              background: (exportMode === 'procurement' && filteredOrders.length === 0) ? C.softBg : C.primary,
              color: (exportMode === 'procurement' && filteredOrders.length === 0) ? C.faint : '#FAF8F3',
              border: 'none', borderRadius: 8,
              cursor: exporting || (exportMode === 'procurement' && filteredOrders.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
            <FileDown size={16} />
            {exporting ? 'Exporting...' : 'Download Excel workbook'}
          </button>
        </div>

        {/* Right: Workbook contents */}
        <div className="exp-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.25em', color: C.mute, fontWeight: 600, marginBottom: 14 }}>
            Workbook contents
          </div>

          {exportMode === 'procurement' ? (
            <>
              <div style={{ padding: '12px 14px', background: C.softBg, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Sheet 1: Procurement Report</div>
                <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.5 }}>
                  Each line item as a row with: Date, Transaction Reference, Acct Code (888110), Account Name, Fund (10), Fnct, Transaction Description, Quantity, Amount, Currency (TTD).
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: C.softBg, borderRadius: 8, fontSize: 12, color: C.mute, lineHeight: 1.5 }}>
                <strong style={{ color: C.ink }}>Filters applied:</strong> Only picked up orders are included. Pending, ready, and cancelled orders are excluded.
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '12px 14px', background: C.softBg, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                  Sheet 1: {exportMode === 'usage' ? 'Purchased Items' : 'Restocking'}
                </div>
                <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.5 }}>
                  Columns: Code, Name, Unit, {usageMonths.length} month columns ({usageMonths.map(formatMonthLabel).join(', ')}), Total, REORDER.
                  Each row shows stock {exportMode === 'usage' ? 'decreases' : 'increases'} per item per month.
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: C.softBg, borderRadius: 8, fontSize: 12, color: C.mute, lineHeight: 1.5, marginBottom: 12 }}>
                <strong style={{ color: C.ink }}>Filters applied:</strong> All inventory items are included. Only stock {exportMode === 'usage' ? 'decreases (order pickup + manual decrease)' : 'increases (manual restock)'} are tracked.
              </div>

              {/* Toggle for live preview */}
              <button onClick={() => setShowPreview(!showPreview)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  background: C.softBg, border: `1px solid ${C.line}`, borderRadius: 8,
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: FONT_BODY,
                  width: '100%', textAlign: 'left', marginBottom: showPreview ? 12 : 0,
                }}>
                {showPreview ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {showPreview ? 'Hide' : 'Show'} preview table
                {!loadingData && spreadsheetData.length > 0 && !showPreview && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: C.mute, fontWeight: 400 }}>
                    {spreadsheetData.filter(i => i.total > 0).length} items with activity
                  </span>
                )}
              </button>

              {/* Live preview table */}
              {showPreview && !loadingData && spreadsheetData.length > 0 && (
                <div className="usage-table-wrap" style={{ maxHeight: 300, overflowY: 'auto', borderRadius: 8, border: `1px solid ${C.line}` }}>
                  <table className="usage-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Unit</th>
                        {usageMonths.map(m => <th key={m} style={{ textAlign: 'right' }}>{formatMonthLabel(m)}</th>)}
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th className="usage-reorder">REORDER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spreadsheetData.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.mute }}>{item.code}</td>
                          <td style={{ fontWeight: 500 }}>{item.name}</td>
                          <td style={{ fontSize: 12, color: C.mute }}>{item.unit}</td>
                          {usageMonths.map(m => (
                            <td key={m} style={{ textAlign: 'right', fontFamily: FONT_MONO, color: item.months[m] > 0 ? C.ink : C.faint }}>
                              {item.months[m]}
                            </td>
                          ))}
                          <td style={{ textAlign: 'right', fontFamily: FONT_MONO, fontWeight: 600 }}>{item.total}</td>
                          <td className="usage-reorder" style={{ textAlign: 'center' }}></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ fontWeight: 600, borderTop: `2px solid ${C.lineStrong}` }}>
                        <td colSpan={3}>Total</td>
                        {usageMonths.map(m => (
                          <td key={m} style={{ textAlign: 'right', fontFamily: FONT_MONO }}>{spreadsheetTotal.months[m]}</td>
                        ))}
                        <td style={{ textAlign: 'right', fontFamily: FONT_MONO }}>{spreadsheetTotal.grand}</td>
                        <td className="usage-reorder"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
