import { logger } from "../utils/logger";

export interface DataQualityIssue {
  type: 'null_values' | 'outliers' | 'invalid_dates' | 'mixed_types' | 'empty_strings' | 'duplicate_rows';
  severity: 'info' | 'warning' | 'critical';
  column?: string;
  affectedCount: number;
  totalCount: number;
  percentage: number;
  description: string;
}

export interface DataQualityReport {
  hasIssues: boolean;
  issues: DataQualityIssue[];
  summary: string;
  disclosureMessage: string | null;
}

/**
 * Analyzes query results for data quality issues
 * Transparently discloses issues without auto-fixing them
 */
export function analyzeDataQuality(
  rows: any[],
  columnNames?: string[]
): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  
  if (!rows || rows.length === 0) {
    return {
      hasIssues: false,
      issues: [],
      summary: 'No data to analyze',
      disclosureMessage: null
    };
  }

  const totalRows = rows.length;
  const columns = columnNames || Object.keys(rows[0] || {});

  // 1. Check for NULL/undefined values per column
  for (const col of columns) {
    const nullCount = rows.filter(row => 
      row[col] === null || row[col] === undefined
    ).length;

    if (nullCount > 0) {
      const percentage = (nullCount / totalRows) * 100;
      issues.push({
        type: 'null_values',
        severity: percentage > 50 ? 'critical' : percentage > 20 ? 'warning' : 'info',
        column: col,
        affectedCount: nullCount,
        totalCount: totalRows,
        percentage,
        description: `${nullCount} of ${totalRows} records have missing ${col}`
      });
    }
  }

  // 2. Check for empty strings (different from NULL)
  for (const col of columns) {
    const emptyStringCount = rows.filter(row => 
      row[col] === ''
    ).length;

    if (emptyStringCount > 0) {
      const percentage = (emptyStringCount / totalRows) * 100;
      issues.push({
        type: 'empty_strings',
        severity: percentage > 50 ? 'critical' : percentage > 20 ? 'warning' : 'info',
        column: col,
        affectedCount: emptyStringCount,
        totalCount: totalRows,
        percentage,
        description: `${emptyStringCount} records have empty ${col}`
      });
    }
  }

  // 3. Check for mixed data types in columns
  for (const col of columns) {
    const types = new Set<string>();
    rows.forEach(row => {
      if (row[col] !== null && row[col] !== undefined) {
        types.add(typeof row[col]);
      }
    });

    if (types.size > 1) {
      issues.push({
        type: 'mixed_types',
        severity: 'warning',
        column: col,
        affectedCount: rows.length,
        totalCount: totalRows,
        percentage: 100,
        description: `Column ${col} has mixed data types: ${Array.from(types).join(', ')}`
      });
    }
  }

  // 4. Check for invalid date values (for date-like columns)
  const dateColumns = columns.filter(col => 
    col.toLowerCase().includes('date') || 
    col.toLowerCase().includes('time') ||
    col.toLowerCase().includes('created') ||
    col.toLowerCase().includes('updated')
  );

  for (const col of dateColumns) {
    const invalidDates = rows.filter(row => {
      if (!row[col]) return false;
      const date = new Date(row[col]);
      return isNaN(date.getTime());
    }).length;

    if (invalidDates > 0) {
      const percentage = (invalidDates / totalRows) * 100;
      issues.push({
        type: 'invalid_dates',
        severity: percentage > 20 ? 'warning' : 'info',
        column: col,
        affectedCount: invalidDates,
        totalCount: totalRows,
        percentage,
        description: `${invalidDates} records have invalid dates in ${col}`
      });
    }
  }

  // 5. Check for statistical outliers in numeric columns
  const numericColumns = columns.filter(col => {
    const sampleValue = rows.find(r => r[col] !== null && r[col] !== undefined)?.[col];
    return typeof sampleValue === 'number';
  });

  for (const col of numericColumns) {
    const values = rows
      .map(r => r[col])
      .filter(v => v !== null && v !== undefined && typeof v === 'number');

    if (values.length > 3) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Count values more than 3 standard deviations from mean
      const outliers = values.filter(v => Math.abs(v - mean) > 3 * stdDev).length;
      
      if (outliers > 0 && outliers < values.length * 0.1) { // Only report if < 10% are outliers
        const percentage = (outliers / totalRows) * 100;
        issues.push({
          type: 'outliers',
          severity: 'info',
          column: col,
          affectedCount: outliers,
          totalCount: totalRows,
          percentage,
          description: `${outliers} records have extreme values in ${col} (statistical outliers)`
        });
      }
    }
  }

  // 6. Check for duplicate rows
  const uniqueRows = new Set(rows.map(r => JSON.stringify(r)));
  const duplicateCount = totalRows - uniqueRows.size;
  
  if (duplicateCount > 0) {
    const percentage = (duplicateCount / totalRows) * 100;
    issues.push({
      type: 'duplicate_rows',
      severity: percentage > 20 ? 'warning' : 'info',
      affectedCount: duplicateCount,
      totalCount: totalRows,
      percentage,
      description: `${duplicateCount} duplicate records found`
    });
  }

  // Generate disclosure message with accurate row-level analysis
  const disclosureMessage = generateDisclosureMessage(issues, totalRows, rows);

  logger.info('Data quality analysis complete', {
    totalRows,
    issuesFound: issues.length,
    criticalIssues: issues.filter(i => i.severity === 'critical').length,
    warningIssues: issues.filter(i => i.severity === 'warning').length
  });

  return {
    hasIssues: issues.length > 0,
    issues,
    summary: issues.length > 0 
      ? `Found ${issues.length} data quality issue(s)` 
      : 'No data quality issues detected',
    disclosureMessage
  };
}

/**
 * Counts rows with complete data (no NULL or empty values)
 * Analyzes row-by-row to avoid incorrect estimates
 */
function countCompleteRecords(
  rows: any[],
  columnsWithIssues: Set<string>
): number {
  if (columnsWithIssues.size === 0) return rows.length;
  
  let completeCount = 0;
  
  for (const row of rows) {
    let isComplete = true;
    
    // Check if this row has complete data in all problematic columns
    const columnsArray = Array.from(columnsWithIssues);
    for (const col of columnsArray) {
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        isComplete = false;
        break;
      }
    }
    
    if (isComplete) {
      completeCount++;
    }
  }
  
  return completeCount;
}

/**
 * Generates user-friendly disclosure message from issues
 * Format: "Note: X of Y records have missing data. Analysis based on Z complete records."
 */
function generateDisclosureMessage(
  issues: DataQualityIssue[],
  totalRows: number,
  rows: any[]
): string | null {
  if (issues.length === 0) return null;

  const messages: string[] = [];
  
  // Group issues by severity
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  // Critical issues (>50% missing data)
  if (criticalIssues.length > 0) {
    const nullIssues = criticalIssues.filter(i => i.type === 'null_values');
    if (nullIssues.length > 0) {
      const totalMissing = nullIssues.reduce((sum, i) => sum + i.affectedCount, 0);
      const avgPercentage = Math.round(nullIssues.reduce((sum, i) => sum + i.percentage, 0) / nullIssues.length);
      messages.push(`⚠️ Data quality concern: ${avgPercentage}% of records have significant missing data in key fields`);
    }
  }

  // Warning issues (20-50% missing or mixed types)
  if (warningIssues.length > 0) {
    const nullWarnings = warningIssues.filter(i => i.type === 'null_values' || i.type === 'empty_strings');
    if (nullWarnings.length > 0) {
      const columns = nullWarnings.map(i => i.column).filter(Boolean);
      messages.push(`Note: Some records have missing data in ${columns.join(', ')}`);
    }

    const mixedTypes = warningIssues.filter(i => i.type === 'mixed_types');
    if (mixedTypes.length > 0) {
      const columns = mixedTypes.map(i => i.column).filter(Boolean);
      messages.push(`Data type inconsistencies detected in ${columns.join(', ')}`);
    }
  }

  // Info issues (outliers, minor missing data)
  if (infoIssues.length > 0) {
    const outlierIssues = infoIssues.filter(i => i.type === 'outliers');
    if (outlierIssues.length > 0) {
      const totalOutliers = outlierIssues.reduce((sum, i) => sum + i.affectedCount, 0);
      messages.push(`${totalOutliers} records with extreme values detected (not excluded from analysis)`);
    }

    const duplicateIssues = infoIssues.filter(i => i.type === 'duplicate_rows');
    if (duplicateIssues.length > 0) {
      messages.push(`${duplicateIssues[0].affectedCount} duplicate records found`);
    }
  }

  // Calculate actual complete records by analyzing row-by-row
  const columnsWithMissingData = new Set(
    issues
      .filter(i => i.type === 'null_values' || i.type === 'empty_strings')
      .map(i => i.column)
      .filter(Boolean) as string[]
  );
  
  const completeRecords = countCompleteRecords(rows, columnsWithMissingData);
  const incompleteRecords = totalRows - completeRecords;
  
  if (incompleteRecords > 0) {
    if (completeRecords === 0) {
      messages.push(`All ${totalRows} records have at least one missing field. Analysis proceeds with available data`);
    } else {
      const percentComplete = Math.round((completeRecords / totalRows) * 100);
      messages.push(`${incompleteRecords} of ${totalRows} records have missing data. Analysis based on data from all records (${percentComplete}% have complete data)`);
    }
  }

  return messages.length > 0 ? messages.join('. ') + '.' : null;
}
