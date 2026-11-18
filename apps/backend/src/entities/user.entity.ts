import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Sale } from './sale.entity';
import { InventoryItem } from './inventory-item.entity';
import { Notification } from './notification.entity';
import { TeamMember } from './team-member.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  businessName!: string;

  @Column({ type: 'uuid', nullable: true })
  businessId?: string;

  /** Login role. Staff permissions live on their team-member row. */
  @Column({
    type: 'enum',
    enum: ['owner', 'manager', 'cashier'],
    default: 'owner',
  })
  role!: 'owner' | 'manager' | 'cashier';

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'invited'],
    default: 'active',
  })
  status!: 'active' | 'inactive' | 'invited';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  lastLogin?: Date;

  /** Owners verify within 7 days of sign-up. Staff are created verified. */
  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  /** Consecutive wrong passwords; reset by a successful sign-in. */
  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;

  /**
   * TOTP seed, AES-256-GCM sealed with ENCRYPTION_KEY (never plaintext).
   * Present but not yet enabled while enrolment awaits its first code.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  twoFactorSecret?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  twoFactorEnabledAt?: Date | null;

  /** Last accepted TOTP time step, so a code cannot be replayed. */
  @Column({ type: 'integer', nullable: true })
  twoFactorLastStep?: number | null;

  /**
   * Business setting, read from the owner's row: owners and managers must
   * use two-step verification. On for businesses created from T32 onwards.
   */
  @Column({ type: 'boolean', default: false })
  requireTwoFactor!: boolean;

  // Relations
  @OneToMany(() => Sale, (sale) => sale.owner)
  sales!: Sale[];

  @OneToMany(() => InventoryItem, (item) => item.owner)
  inventory!: InventoryItem[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];

  @OneToMany(() => TeamMember, (member) => member.user)
  teamMembers!: TeamMember[];
}
