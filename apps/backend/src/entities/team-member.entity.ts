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

  @Column({
    type: 'enum',
    enum: [
      'owner',
      'manager',
      'sales-assistant',
      'checkout',
      'inventory',
      'investor',
    ],
    default: 'sales-assistant',
  })
  role!:
    | 'owner'
    | 'manager'
    | 'sales-assistant'
    | 'checkout'
    | 'inventory'
    | 'investor';

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  permissions!: string[];

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
