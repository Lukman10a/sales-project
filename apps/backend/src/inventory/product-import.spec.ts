import { Workbook } from 'exceljs';
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  importTemplate,
  readImportFile,
  validateRow,
} from './product-import';

const csv = (text: string) => ({ buffer: Buffer.from(text) });

describe('readImportFile', () => {
  it('reads CSV rows keyed by column, numbered as in the sheet', async () => {
    const rows = await readImportFile(
      csv(
        '﻿Name,Selling Price,Wholesale Price,Qty\nRice,100,80,5\n,,,\nBeans,50,,',
      ),
    );
    expect(rows).toEqual([
      {
        row: 2,
        values: {
          name: 'Rice',
          sellingPrice: '100',
          costPrice: '80',
          quantity: '5',
        },
      },
      {
        row: 4,
        values: {
          name: 'Beans',
          sellingPrice: '50',
          costPrice: '',
          quantity: '',
        },
      },
    ]);
  });

  it('reads the first sheet of an xlsx file', async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Products');
    sheet.addRow(['name', 'sellingPrice', 'expiryDate', 'quantity']);
    sheet.addRow(['Milk', 1200, new Date(Date.UTC(2027, 2, 31)), 6]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await expect(readImportFile({ buffer })).resolves.toEqual([
      {
        row: 2,
        values: {
          name: 'Milk',
          sellingPrice: '1200',
          expiryDate: '2027-03-31',
          quantity: '6',
        },
      },
    ]);
  });

  it('round-trips its own template', async () => {
    const rows = await readImportFile({ buffer: await importTemplate() });
    expect(rows).toHaveLength(1);
    expect(validateRow(rows[0].values).errors).toEqual([]);
  });

  it('needs the name and sellingPrice columns', async () => {
    await expect(readImportFile(csv('title,price2\nA,1'))).rejects.toThrow(
      /name and sellingPrice/,
    );
  });

  it('refuses empty, oversized and overlong files', async () => {
    await expect(readImportFile(csv(''))).rejects.toThrow(/Choose/);
    await expect(readImportFile(csv('name,sellingPrice\n'))).rejects.toThrow(
      /no rows/,
    );
    await expect(
      readImportFile({ buffer: Buffer.alloc(IMPORT_MAX_BYTES + 1, 'a') }),
    ).rejects.toThrow(/5 MB/);
    const many = ['name,sellingPrice']
      .concat(Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => `P${i},1`))
      .join('\n');
    await expect(readImportFile(csv(many))).rejects.toThrow(/limit is 5000/);
  });
});

describe('validateRow', () => {
  it('turns a good row into a product', () => {
    expect(
      validateRow({
        name: ' Rice 5kg ',
        sellingPrice: '₦9,000.50',
        costPrice: '7000',
        quantity: '12',
        category: 'Food, Grains,',
        cartonSize: '4',
        cartonPrice: '35000',
        expiryDate: '2027-01-31',
      }),
    ).toEqual({
      errors: [],
      product: expect.objectContaining({
        name: 'Rice 5kg',
        sellingPrice: 9000.5,
        costPrice: 7000,
        quantity: 12,
        category: ['Food', 'Grains'],
        cartonSize: 4,
        cartonPrice: 35000,
        expiryDate: '2027-01-31',
      }) as unknown,
    });
  });

  it('reports every problem in a row', () => {
    const { product, errors } = validateRow({
      sellingPrice: '-1',
      quantity: '2.5',
      cartonSize: '6',
      expiryDate: '2027-02-30',
    });
    expect(product).toBeUndefined();
    expect(errors).toEqual([
      'name is required',
      'sellingPrice must be an amount like 1500 or 1500.50',
      'quantity must be a whole number of at least 0',
      'cartonSize and cartonPrice go together',
      'expiryDate must be a date like 2027-03-31',
    ]);
  });

  it('leaves a blank quantity undefined, so stock is kept', () => {
    expect(
      validateRow({ name: 'A', sellingPrice: '1' }).product?.quantity,
    ).toBe(undefined);
  });
});
