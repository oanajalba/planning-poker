import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <h1>Planning Poker & Board</h1>
      <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>No account needed</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <Link href="/create" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--primary-color)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          Start session
        </Link>
        <Link href="/join" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--secondary-color)', color: 'var(--text-color)', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          Join session
        </Link>
      </div>
    </div>
  );
}
