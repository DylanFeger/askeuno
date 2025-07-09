import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CSV file
const csvPath = path.join(__dirname, '../sample_data/sales_data_2024.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');

// Parse CSV data
const lines = csvData.split('\n').filter(line => line.trim());
const headers = lines[0].split(',');
const data = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index];
  });
  data.push(row);
}

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');

// Write Excel file
const excelPath = path.join(__dirname, '../sample_data/sales_data_2024.xlsx');
XLSX.writeFile(wb, excelPath);

console.log('Excel file created:', excelPath);