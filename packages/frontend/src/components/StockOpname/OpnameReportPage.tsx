/**
 * Stock Opname Report Page
 * Display detailed opname report with financial impact
 * Task: 72
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Button } from '../Button';
import { Card } from '../Card';
import { Table } from '../Table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  sessionId: string;
  storeId: string;
  status: string;
  opnameDate: string;
  conductedBy: string;
  verifiedBy?: string;
  totals: {
    totalItems: number;
    matchCount: number;
    shortageCount: number;
    excessCount: number;
    totalShortageValue: number;
    totalExcessValue: number;
    netFinancialImpact: number;
  };
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    costPrice: number;
    systemQuantity: number;
    physicalQuantity: number;
    difference: number;
    status: 'MATCH' | 'SHORTAGE' | 'EXCESS';
    financialImpact: number;
  }>;
}

interface OpnameReportPageProps {
  sessionId: string;
}

export const OpnameReportPage: React.FC<OpnameReportPageProps> = ({
  sessionId,
}) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/stock-opname/${sessionId}/report`
      );

      if (response.data.success) {
        setReport(response.data.data.report);
        setError(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const generatePDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // Header
    doc.setFontSize(16);
    doc.text('Stock Opname Report', pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 10;

    // Session Info
    doc.setFontSize(10);
    doc.text(`Session ID: ${report.sessionId}`, 10, yPosition);
    yPosition += 6;
    doc.text(
      `Date: ${format(new Date(report.opnameDate), 'dd/MM/yyyy HH:mm')}`,
      10,
      yPosition
    );
    yPosition += 6;
    doc.text(`Status: ${report.status}`, 10, yPosition);
    yPosition += 10;

    // Summary Section
    doc.setFontSize(12);
    doc.text('Summary', 10, yPosition);
    yPosition += 7;

    const summaryData = [
      ['Total Items', report.totals.totalItems.toString()],
      ['Match', report.totals.matchCount.toString()],
      ['Shortage', report.totals.shortageCount.toString()],
      ['Excess', report.totals.excessCount.toString()],
      ['Total Shortage Value', formatCurrency(report.totals.totalShortageValue)],
      ['Total Excess Value', formatCurrency(report.totals.totalExcessValue)],
      [
        'Net Financial Impact',
        formatCurrency(report.totals.netFinancialImpact),
      ],
    ];

    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: summaryData,
      startY: yPosition,
      margin: 10,
      didDrawPage: () => {
        yPosition += 60; // Adjust for content added
      },
    });

    yPosition = doc.lastAutoTable?.finalY || yPosition + 20;
    yPosition += 10;

    // Details Table
    doc.setFontSize(12);
    doc.text('Opname Details', 10, yPosition);
    yPosition += 7;

    const tableData = report.items.map((item) => [
      item.productName,
      item.sku,
      item.systemQuantity.toString(),
      item.physicalQuantity.toString(),
      item.difference.toString(),
      item.status,
      formatCurrency(item.financialImpact),
    ]);

    autoTable(doc, {
      head: [
        [
          'Product',
          'SKU',
          'System Qty',
          'Physical Qty',
          'Difference',
          'Status',
          'Financial Impact',
        ],
      ],
      body: tableData,
      startY: yPosition,
      margin: 10,
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.getNumberOfPages();
        if (pageCount > 1) {
          doc.setFontSize(8);
          doc.text(
            `Page ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: 'center' }
          );
        }
      },
    });

    // Save PDF
    doc.save(`opname-${report.sessionId}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case 'MATCH':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'SHORTAGE':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'EXCESS':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return baseClasses;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Failed to load report'}
        </div>
      </div>
    );
  }

  const columns = [
    {
      header: 'Product',
      accessor: 'productName',
    },
    {
      header: 'SKU',
      accessor: 'sku',
    },
    {
      header: 'System Qty',
      accessor: 'systemQuantity',
      render: (row: any) => <span className="text-right">{row.systemQuantity}</span>,
    },
    {
      header: 'Physical Qty',
      accessor: 'physicalQuantity',
      render: (row: any) => <span className="text-right">{row.physicalQuantity}</span>,
    },
    {
      header: 'Difference',
      accessor: 'difference',
      render: (row: any) => (
        <span
          className={`text-right font-semibold ${
            row.difference < 0
              ? 'text-red-600'
              : row.difference > 0
              ? 'text-yellow-600'
              : 'text-green-600'
          }`}
        >
          {row.difference > 0 ? '+' : ''}
          {row.difference}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row: any) => (
        <span className={getStatusBadge(row.status)}>{row.status}</span>
      ),
    },
    {
      header: 'Financial Impact',
      accessor: 'financialImpact',
      render: (row: any) => (
        <span
          className={
            row.financialImpact < 0
              ? 'text-red-600 font-semibold'
              : row.financialImpact > 0
              ? 'text-yellow-600 font-semibold'
              : 'text-green-600 font-semibold'
          }
        >
          {formatCurrency(row.financialImpact)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Stock Opname Report</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.location.back()}>
            Back
          </Button>
          <Button variant="primary" onClick={generatePDF}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Session Information */}
      <Card>
        <div className="grid grid-cols-2 gap-6 p-6">
          <div>
            <p className="text-sm text-gray-600">Session ID</p>
            <p className="font-semibold text-lg">{report.sessionId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold text-lg">{report.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-semibold text-lg">
              {format(new Date(report.opnameDate), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Store ID</p>
            <p className="font-semibold text-lg">{report.storeId}</p>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-700">
              {report.totals.totalItems}
            </div>
            <div className="text-sm text-gray-600 mt-2">Total Items</div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {report.totals.matchCount}
            </div>
            <div className="text-sm text-gray-600 mt-2">Match</div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-red-600">
              {report.totals.shortageCount}
            </div>
            <div className="text-sm text-gray-600 mt-2">Shortage</div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {report.totals.excessCount}
            </div>
            <div className="text-sm text-gray-600 mt-2">Excess</div>
          </div>
        </Card>
      </div>

      {/* Financial Impact Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(report.totals.totalShortageValue)}
            </div>
            <div className="text-sm text-gray-600 mt-2">Total Shortage Value</div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(report.totals.totalExcessValue)}
            </div>
            <div className="text-sm text-gray-600 mt-2">Total Excess Value</div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div
              className={`text-2xl font-bold ${
                report.totals.netFinancialImpact < 0
                  ? 'text-red-600'
                  : report.totals.netFinancialImpact > 0
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {formatCurrency(report.totals.netFinancialImpact)}
            </div>
            <div className="text-sm text-gray-600 mt-2">Net Financial Impact</div>
          </div>
        </Card>
      </div>

      {/* Detailed Items Table */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">Opname Details</h2>
          <Table columns={columns} data={report.items} />
        </div>
      </Card>
    </div>
  );
};

export default OpnameReportPage;
