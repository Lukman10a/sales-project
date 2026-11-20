import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The last receipt number a business issued; locked while a sale is made. */
@Entity('receipt_counters')
export class ReceiptCounter {
  @PrimaryColumn({ type: 'uuid' })
  businessId!: string;

  @Column({ type: 'int' })
  lastNumber!: number;
}
