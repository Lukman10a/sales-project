import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_insights')
@Index(['businessId', 'insightId'], { unique: true })
export class AiInsight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column()
  insightId!: string;

  @Column({ type: 'text' })
  narrative!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
