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
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  businessName: string;

  @Column({ type: 'uuid', nullable: true })
  businessId?: string;

  @Column({
    type: 'enum',
    enum: ['owner', 'manager', 'apprentice'],
    default: 'owner',
  })
  role: 'owner' | 'manager' | 'apprentice';

  @Column({ nullable: true })
  staffRole?: 'sales-assistant' | 'manager' | 'checkout' | 'inventory';

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'invited'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'invited';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLogin?: Date;

  // Relations
  @OneToMany(() => Sale, (sale) => sale.owner)
  sales: Sale[];

  @OneToMany(() => InventoryItem, (item) => item.owner)
  inventory: InventoryItem[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => TeamMember, (member) => member.user)
  teamMembers: TeamMember[];
}
