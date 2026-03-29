import styles from "./page.module.css";
import { TerminalDemo } from "@/components/TerminalDemo";
import { InstallCommand } from "@/components/InstallCommand";

function ToolCard({
  title,
  command,
  description,
  label,
  featured,
}: {
  title: string;
  command: string;
  description: string;
  label?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`${styles.toolCard}${featured ? ` ${styles.toolCardFeatured}` : ""}`}
    >
      {label && <p className={styles.toolLabel}>{label}</p>}
      <h3 className={styles.toolTitle}>{title}</h3>
      <code className={styles.toolCommand}>{command}</code>
      <p className={styles.toolDescription}>{description}</p>
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
          Micro tools for building and running a business.
        </p>
        <p className={styles.description}>
          An open-source, growing collection of small CLI tools that solve real
          problems — starting with CRM data hygiene. Built by a consultancy
          that needed them.
        </p>
        <InstallCommand />
      </section>

      <section className={styles.demo}>
        <TerminalDemo />
      </section>

      <section className={styles.tools}>
        <h2 className={styles.toolsHeading}>Tools</h2>
        <p className={styles.toolsIntro}>
          Each tool is a focused CLI utility that does one thing well. The
          collection grows as we hit new problems.
        </p>
        <div className={styles.toolGrid}>
          <ToolCard
            featured
            label="Available now"
            title="CRM Audit & Fix"
            command="fantasia audit"
            description="Connect HubSpot or Attio. Surface duplicates, stale records, missing fields, and format issues. Preview fixes, then execute — all from the terminal."
          />
          <ToolCard
            label="Available now"
            title="Connection Status"
            command="fantasia status"
            description="Check which integrations are connected and their health. JSON output for automation."
          />
          <ToolCard
            label="In progress"
            title="More tools"
            command="fantasia --help"
            description="This is an active experiment. New tools get added when we hit a problem worth solving. Watch the repo."
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
        <p className={styles.attribution}>
          Built by{" "}
          <a href="https://www.revi.systems">Revi Systems</a>
        </p>
        <p className={styles.copyright}>&copy; 2026 Fantasia. MIT Licensed.</p>
      </footer>
    </div>
  );
}
