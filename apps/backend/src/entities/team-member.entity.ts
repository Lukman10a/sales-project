import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  businessId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column()
  name!: string;

  /** Role preset the member started from (see ROLE_PRESETS). */
  @Column({
    type: 'enum',
    enum: ['manager', 'cashier'],
    default: 'cashier',
  })
  role!: 'manager' | 'cashier';

  /** Canonical permissions (PERMISSIONS), editable switch by switch. */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  permissions!: string[];

  /** Largest discount this member may give, in percent of the sale. */
  @Column({ type: 'integer', default: 0 })
  maxDiscountPercent!: number;

  @Column({ nullable: true })
  department?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'invited'],
    default: 'invited',
  })
  status!: 'active' | 'inactive' | 'invited';

  @Column({ type: 'date' })
  joinedDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.teamMembers)
  user!: User;
}
