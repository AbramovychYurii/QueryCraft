import type { ReactNode } from 'react';
import { IconSearch } from '../icons';
import styles from './Header.module.css';

interface HeaderProps {
  /** Right-side slot for action buttons (theme toggle, saved links trigger). */
  actions?: ReactNode;
}

export function Header({ actions }: HeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          <IconSearch />
        </span>
        <h1 className={styles.title}>QueryCraft</h1>
      </div>
      <div className={styles.actions}>{actions}</div>
    </header>
  );
}
