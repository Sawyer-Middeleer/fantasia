import styles from "./page.module.css";
import { TerminalDemo } from "@/components/TerminalDemo";
import { InstallCommand } from "@/components/InstallCommand";

function SkillCard({
  title,
  command,
  description,
}: {
  title: string;
  command: string;
  description: string;
}) {
  return (
    <div className={styles.skillCard}>
      <h3 className={styles.skillTitle}>{title}</h3>
      <code className={styles.skillCommand}>{command}</code>
      <p className={styles.skillDescription}>{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <span className={styles.logo}>fantasia</span>
        <div className={styles.navLinks}>
          <a href="https://github.com/Sawyer-Middeleer/fantasia">GitHub</a>
          <a href="https://github.com/Sawyer-Middeleer/fantasia#readme">
            Docs
          </a>
        </div>
      </nav>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Fantasia</h1>
        <p className={styles.subtitle}>
          CRM data enrichment &amp; hygiene for AI agents and developers.
        </p>
        <p className={styles.description}>
          Connect HubSpot or Attio. Find duplicates, stale records, missing
          fields. Fix them — all from the CLI.
        </p>
        <InstallCommand />
      </section>

      <section className={styles.demo}>
        <TerminalDemo />
      </section>

      <section className={styles.skills}>
        <h2 className={styles.skillsHeading}>Built-in skills</h2>
        <div className={styles.skillGrid}>
          <SkillCard
            title="Login"
            command="fantasia login --hubspot"
            description="Connect your CRM in seconds. HubSpot and Attio supported."
          />
          <SkillCard
            title="Audit"
            command="fantasia audit"
            description="Health checks across duplicates, stale records, missing fields, and formatting."
          />
          <SkillCard
            title="Fix"
            command="fantasia fix"
            description="Merge duplicates and normalize formats. Preview first, execute when ready."
          />
          <SkillCard
            title="Status"
            command="fantasia status --json"
            description="Dual output for humans and AI agents. Structured JSON for automation."
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <InstallCommand />
        <div className={styles.footerLinks}>
          <a href="https://github.com/Sawyer-Middeleer/fantasia">GitHub</a>
          <a href="https://github.com/Sawyer-Middeleer/fantasia#readme">
            Docs
          </a>
        </div>
        <p className={styles.copyright}>&copy; 2026 Fantasia</p>
      </footer>
    </div>
  );
}
