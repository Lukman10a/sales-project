import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { Workbook, type CellValue } from 'exceljs';

/**
 * Product import (T36): CSV or XLSX in, validated rows out. Pure apart from
 * parsing, so a preview and its confirm see exactly the same verdicts.
 */

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5_000;

/** Template columns, in order. `*` marks the required ones. */
export const IMPORT_COLUMNS = [
  'name',
  'sellingPrice',
  'costPrice',
  'quantity',
  'category',
  'sku',
  'barcode',
  'reorderPoint',
  'cartonSize',
  'cartonPrice',
  'expiryDate',
  'supplier',
  'description',
] as const;
type Column = (typeof IMPORT_COLUMNS)[number];

/** Header spellings accepted besides the column names themselves. */
const ALIASES: Record<string, Column> = {
  productname: 'name',
  price: 'sellingPrice',
  wholesaleprice: 'costPrice',
  cost: 'costPrice',
  qty: 'quantity',
  stock: 'quantity',
  categories: 'category',
  bundlequantity: 'cartonSize',
  bundleprice: 'cartonPrice',
  expiry: 'expiryDate',
  expirydate: 'expiryDate',
};

const normal = (header: string) => header.toLowerCase().replace(/[^a-z]/g, '');
const COLUMN_BY_HEADER = new Map<string, Column>([
  ...IMPORT_COLUMNS.map((c) => [normal(c), c] as [string, Column]),
  ...Object.entries(ALIASES),
]);

export type RawRow = Partial<Record<Column, string>>;

export interface ImportFile {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
}

/** Reads the file into rows keyed by template column, numbered as in the sheet. */
export async function readImportFile(
  file: ImportFile,
): Promise<Array<{ row: number; values: RawRow }>> {
  if (!file.buffer?.length) {
    throw new BadRequestException('Choose a CSV or Excel file to import');
  }
  if (file.buffer.length > IMPORT_MAX_BYTES) {
    throw new BadRequestException('The file is larger than 5 MB');
  }
  const table = isXlsx(file)
    ? await readXlsx(file.buffer)
    : readCsv(file.buffer);
  const [header, ...body] = table;
  if (!header) throw new BadRequestException('The file is empty');

  const columns = header.map((h) => COLUMN_BY_HEADER.get(normal(h)));
  if (!columns.includes('name') || !columns.includes('sellingPrice')) {
    throw new BadRequestException(
      'The file needs at least the name and sellingPrice columns (download the template)',
    );
  }

  const rows: Array<{ row: number; values: RawRow }> = [];
  body.forEach((cells, i) => {
    if (cells.every((c) => c.trim() === '')) return;
    const values: RawRow = {};
    columns.forEach((column, j) => {
      if (column && cells[j] !== undefined) values[column] = cells[j].trim();
    });
    rows.push({ row: i + 2, values });
  });
  if (rows.length === 0) throw new BadRequestException('The file has no rows');
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new BadRequestException(
      `The file has ${rows.length} rows; the limit is ${IMPORT_MAX_ROWS}`,
    );
  }
  return rows;
}

function isXlsx(file: ImportFile): boolean {
  // An .xlsx file is a zip archive: it starts with "PK".
  return file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;
}

function readCsv(buffer: Buffer): string[][] {
  try {
    return parse(buffer.toString('utf-8').replace(/^\uFEFF/, ''), {
      skip_empty_lines: true,
      relax_column_count: true,
    });
  } catch {
    throw new BadRequestException('The CSV file could not be read');
  }
}

async function readXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException('The Excel file could not be read');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  if (sheet.rowCount > IMPORT_MAX_ROWS + 1) {
    throw new BadRequestException(
      `The file has more than ${IMPORT_MAX_ROWS} rows`,
    );
  }
  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, n) => {
    const cells: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      cells.push(cellText(row.getCell(c).value));
    }
    table[n - 1] = cells;
  });
  return Array.from(table, (r) => r ?? []);
}

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result);
    if ('richText' in value) return value.richText.map((t) => t.text).join('');
    if ('text' in value) return String(value.text);
    return '';
  }
  return String(value);
}

/** A row that passed validation, in naira and stock units. */
export interface ImportProduct {
  name: string;
  sellingPrice: number;
  costPrice?: number;
  /** Undefined: leave an existing product's stock alone (new ones get 0). */
  quantity?: number;
  category: string[];
  sku?: string;
  barcode?: string;
  reorderPoint?: number;
  cartonSize?: number;
  cartonPrice?: number;
  expiryDate?: string;
  supplier?: string;
  description?: string;
}

/** Validates one row's values; every problem is reported, not just the first. */
export function validateRow(values: RawRow): {
  product?: ImportProduct;
  errors: string[];
} {
  const errors: string[] = [];
  const text = (c: Column, max: number) => {
    const v = values[c]?.trim() ?? '';
    if (v.length > max) errors.push(`${c} is longer than ${max} characters`);
    return v === '' ? undefined : v;
  };
  const money = (c: Column, required = false) => {
    const v = values[c]?.replace(/[₦,\s]/g, '') ?? '';
    if (v === '') {
      if (required) errors.push(`${c} is required`);
      return undefined;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || Math.round(n * 100) !== n * 100) {
      errors.push(`${c} must be an amount like 1500 or 1500.50`);
      return undefined;
    }
    return n;
  };
  const whole = (c: Column, min: number) => {
    const v = values[c]?.replace(/[,\s]/g, '') ?? '';
    if (v === '') return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > 10_000_000) {
      errors.push(`${c} must be a whole number of at least ${min}`);
      return undefined;
    }
    return n;
  };

  const name = text('name', 200);
  if (!name) errors.push('name is required');
  const sellingPrice = money('sellingPrice', true);
  const costPrice = money('costPrice');
  const quantity = whole('quantity', 0);
  const reorderPoint = whole('reorderPoint', 0);
  const cartonSize = whole('cartonSize', 1);
  const cartonPrice = money('cartonPrice');
  if ((cartonSize === undefined) !== (cartonPrice === undefined)) {
    errors.push('cartonSize and cartonPrice go together');
  }
  const expiryDate = text('expiryDate', 10);
  if (expiryDate && !isIsoDate(expiryDate)) {
    errors.push('expiryDate must be a date like 2027-03-31');
  }
  const category = (values.category ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (category.some((c) => c.length > 100)) {
    errors.push('a category is longer than 100 characters');
  }

  const product: ImportProduct = {
    name: name ?? '',
    sellingPrice: sellingPrice ?? 0,
    costPrice,
    quantity,
    category,
    sku: text('sku', 100),
    barcode: text('barcode', 100),
    reorderPoint,
    cartonSize,
    cartonPrice,
    expiryDate,
    supplier: text('supplier', 200),
    description: text('description', 1000),
  };
  return errors.length ? { errors } : { product, errors };
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** The template's example row. */
const EXAMPLE: Record<Column, string | number> = {
  name: 'Golden Penny Semovita 1kg',
  sellingPrice: 1500,
  costPrice: 1200,
  quantity: 40,
  category: 'Groceries, Flour',
  sku: 'GP-SEMO-1KG',
  barcode: '6151100000017',
  reorderPoint: 10,
  cartonSize: 10,
  cartonPrice: 14000,
  expiryDate: '2027-03-31',
  supplier: 'Golden Penny',
  description: '',
};

/** The downloadable import template (.xlsx). */
export async function importTemplate(): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Products');
  sheet.columns = IMPORT_COLUMNS.map((key) => ({
    header: key,
    key,
    width: Math.max(14, key.length + 4),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(EXAMPLE);
  const notes = workbook.addWorksheet('How to fill');
  notes.addRows([
    ['Required: name, sellingPrice. Amounts are in naira.'],
    [
      'quantity is the stock you have now; leave it blank to keep the current stock of an existing product.',
    ],
    [
      'A row updates an existing product with the same sku, else the same barcode, else the same name.',
    ],
    ['category may list several, separated by commas.'],
    ['cartonSize and cartonPrice go together. expiryDate is YYYY-MM-DD.'],
    [`At most ${IMPORT_MAX_ROWS} rows and 5 MB.`],
  ]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
