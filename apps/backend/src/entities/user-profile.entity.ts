import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  // Notification Preferences (stored as JSON)
  @Column({
    type: 'json',
    default: {
      email: true,
      push: true,
      lowStock: true,
      newSales: true,
      reports: true,
      teamActivity: true,
      aiInsights: true,
    },
  })
  notificationPreferences!: {
    email: boolean;
    push: boolean;
    lowStock: boolean;
    newSales: boolean;
    reports: boolean;
    teamActivity: boolean;
    aiInsights: boolean;
  };

  // Appearance Settings (stored as JSON)
  @Column({
    type: 'json',
    default: {
      theme: 'light',
      language: 'en',
      currency: 'NGN',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      compactMode: false,
    },
  })
  appearanceSettings!: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    compactMode: boolean;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
