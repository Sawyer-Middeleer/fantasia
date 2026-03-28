/**
 * Seed the HubSpot developer test account with contacts that exercise
 * all 4 audit checks: duplicates, stale, missing fields, format issues.
 *
 * Usage: npx tsx scripts/seed-hubspot-test-data.ts
 * Requires: HUBSPOT_ACCESS_TOKEN env var or reads from hubspot.config.yml
 */

import { Client } from "@hubspot/api-client";
import * as fs from "fs";
import * as yaml from "js-yaml";

interface HubSpotConfig {
  portals: Array<{
    name: string;
    auth: { tokenInfo: { accessToken: string; expiresAt: string } };
  }>;
}

function getAccessToken(): string {
  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    return process.env.HUBSPOT_ACCESS_TOKEN;
  }

  const configPath = "hubspot.config.yml";
  if (fs.existsSync(configPath)) {
    const config = yaml.load(
      fs.readFileSync(configPath, "utf8")
    ) as HubSpotConfig;
    const devAccount = config.portals.find(
      (p) => p.name === "developer-test-account-1"
    );
    if (devAccount) {
      return devAccount.auth.tokenInfo.accessToken;
    }
  }

  throw new Error(
    "No access token found. Set HUBSPOT_ACCESS_TOKEN or configure hubspot.config.yml"
  );
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function randomPhone(): string {
  const a = Math.floor(Math.random() * 900) + 100;
  const b = Math.floor(Math.random() * 900) + 100;
  const c = Math.floor(Math.random() * 9000) + 1000;
  return `(${a}) ${b}-${c}`;
}

interface ContactInput {
  email?: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  jobtitle?: string;
  phone?: string;
  notes_last_updated?: string;
}

async function seedContacts(client: Client) {
  const contacts: ContactInput[] = [];

  // --- Clean contacts (15) ---
  const cleanPeople = [
    ["Alice", "Johnson", "Acme Corp", "VP of Sales"],
    ["Bob", "Smith", "Globex Inc", "CTO"],
    ["Carol", "Williams", "TechNova", "Director of Ops"],
    ["Dave", "Brown", "BlueSky Analytics", "Product Manager"],
    ["Eve", "Davis", "Meridian Partners", "Head of Growth"],
    ["Felix", "Wilson", "Apex Systems", "Account Executive"],
    ["Gina", "Moore", "CloudPath Tech", "Marketing Manager"],
    ["Hank", "Taylor", "Nexus Group", "Sales Director"],
    ["Iris", "Anderson", "Horizon Digital", "Senior AE"],
    ["Jack", "Thomas", "Sterling Dynamics", "Revenue Ops"],
    ["Kate", "Jackson", "Vortex Software", "Engineering Lead"],
    ["Luke", "White", "Summit Consulting", "Partner"],
    ["Mia", "Harris", "Cascade Ventures", "Growth Manager"],
    ["Noah", "Clark", "Redwood Analytics", "Data Lead"],
    ["Olivia", "Lewis", "IronClad Security", "CISO"],
  ];

  for (const [fn, ln, co, title] of cleanPeople) {
    const domain = co.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12);
    contacts.push({
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}.com`,
      firstname: fn,
      lastname: ln,
      company: co,
      jobtitle: title,
      phone: randomPhone(),
    });
  }

  // --- Duplicate pairs (5 pairs = 10 contacts) ---
  const dupePairs = [
    {
      fn: "Charlie",
      ln: "Brown",
      co: "Wayne Enterprises",
      title: "Director of Ops",
    },
    { fn: "Diana", ln: "Prince", co: "Stark Industries", title: "Marketing Lead" },
    { fn: "Peter", ln: "Parker", co: "Daily Bugle", title: "Photographer" },
    { fn: "Bruce", ln: "Wayne", co: "Wayne Enterprises", title: "CEO" },
    { fn: "Tony", ln: "Stark", co: "Stark Industries", title: "CTO" },
  ];

  for (const { fn, ln, co, title } of dupePairs) {
    const domain = co.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12);
    // Original
    contacts.push({
      email: `${fn.toLowerCase()}@${domain}.com`,
      firstname: fn,
      lastname: ln,
      company: co,
      jobtitle: title,
      phone: randomPhone(),
    });
    // Duplicate (same email, slightly different name)
    contacts.push({
      email: `${fn.toLowerCase()}@${domain}.com`,
      firstname: fn.slice(0, -1) + fn.slice(-1).toUpperCase(),
      lastname: ln,
      company: co,
      jobtitle: title === "Director of Ops" ? "Dir. Operations" : title,
      phone: randomPhone(),
    });
  }

  // --- Stale contacts (10, last activity > 90 days ago) ---
  const stalePeople = [
    ["Edward", "Norton", "OldCorp LLC"],
    ["Frank", "Castle", "Dusty Deals Inc"],
    ["Grace", "Hopper", "Fossil Data Corp"],
    ["Ivan", "Drago", "Soviet Systems"],
    ["Julia", "Roberts", "Pretty Inc"],
    ["Kurt", "Russell", "Escape Corp"],
    ["Lara", "Croft", "Tomb Raiding Ltd"],
    ["Max", "Payne", "Remedy Corp"],
    ["Nora", "Jones", "Jazz Label Inc"],
    ["Oscar", "Wilde", "Playwright Co"],
  ];

  for (const [fn, ln, co] of stalePeople) {
    const domain = co.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12);
    contacts.push({
      email: `${fn.toLowerCase()}@${domain}.com`,
      firstname: fn,
      lastname: ln,
      company: co,
      jobtitle: "Account Executive",
      phone: randomPhone(),
      notes_last_updated: daysAgo(150 + Math.floor(Math.random() * 200)),
    });
  }

  // --- Missing fields (10 contacts) ---
  const missingFieldPeople = [
    { firstname: "Ivy", lastname: "League", company: "Mystery Inc" }, // no email, jobtitle, phone
    { email: "jack@incomplete.com", firstname: "Jack", lastname: "Sparrow" }, // no company, jobtitle, phone
    { firstname: "Karen" }, // no email, lastname, company, jobtitle, phone
    { email: "leo@sparse.com", firstname: "Leo" }, // no lastname, company, jobtitle, phone
    { email: "mike@basic.com" }, // only email
    { firstname: "Nancy", lastname: "Drew", company: "Detective Agency" }, // no email, jobtitle, phone
    { email: "otto@half.com", firstname: "Otto", lastname: "Octavius", company: "OsCorp" }, // no jobtitle, phone
    { email: "pat@minimal.com", firstname: "Pat" }, // minimal
    { firstname: "Quinn", lastname: "Hughes", phone: "(555) 999-0000" }, // no email, company, jobtitle
    { email: "rita@nophone.com", firstname: "Rita", lastname: "Moreno", company: "Broadway Inc", jobtitle: "Star" }, // no phone
  ];

  for (const person of missingFieldPeople) {
    contacts.push(person);
  }

  // --- Format issues (10 contacts) ---
  const formatPeople = [
    { fn: "leo", ln: "messi", phone: "5551234567" }, // lowercase name, unformatted phone
    { fn: "MARIA", ln: "GARCIA", phone: "+1-555-987-6543" }, // ALL CAPS, international phone
    { fn: "robert", ln: "downey", phone: "555.123.4567" }, // lowercase, dotted phone
    { fn: "SCARLETT", ln: "JOHANSSON", phone: "15559876543" }, // CAPS, no formatting
    { fn: "chris", ln: "hemsworth", phone: "555 123 4567" }, // lowercase, spaced
    { fn: "TOM", ln: "HOLLAND", phone: "(555)1234567" }, // CAPS, no space after paren
    { fn: "zendaya", ln: "coleman", phone: "5559991234" }, // lowercase, digits only
    { fn: "RYAN", ln: "REYNOLDS", phone: "+15551112222" }, // CAPS, E.164
    { fn: "blake", ln: "lively", phone: "555-111-2222" }, // lowercase, dashed
    { fn: "JAKE", ln: "GYLLENHAAL", phone: "555.999.8888" }, // CAPS, dotted
  ];

  for (const { fn, ln, phone } of formatPeople) {
    const domain = `${fn}${ln}`.toLowerCase().slice(0, 10);
    contacts.push({
      email: `${fn.toLowerCase()}@${domain}.com`,
      firstname: fn,
      lastname: ln,
      company: "Format Co",
      jobtitle: "Engineer",
      phone,
    });
  }

  console.log(`Seeding ${contacts.length} contacts...`);

  // Batch create in groups of 10 (HubSpot batch limit is 100)
  let created = 0;
  let errors = 0;

  for (let i = 0; i < contacts.length; i += 10) {
    const batch = contacts.slice(i, i + 10);
    const inputs = batch.map((c) => {
      const properties: Record<string, string> = {};
      if (c.email) properties.email = c.email;
      if (c.firstname) properties.firstname = c.firstname;
      if (c.lastname) properties.lastname = c.lastname;
      if (c.company) properties.company = c.company;
      if (c.jobtitle) properties.jobtitle = c.jobtitle;
      if (c.phone) properties.phone = c.phone;
      if (c.notes_last_updated)
        properties.notes_last_updated = c.notes_last_updated;
      return { properties };
    });

    try {
      await client.crm.contacts.batchApi.create({ inputs });
      created += batch.length;
      process.stdout.write(`  Created ${created}/${contacts.length}\r`);
    } catch (err: unknown) {
      // If batch fails (e.g. duplicate email), create individually
      for (const input of inputs) {
        try {
          await client.crm.contacts.basicApi.create(input);
          created++;
        } catch {
          errors++;
        }
      }
      process.stdout.write(`  Created ${created}/${contacts.length} (${errors} skipped)\r`);
    }
  }

  console.log(`\nDone: ${created} created, ${errors} skipped (duplicates)`);
  return created;
}

async function main() {
  const token = getAccessToken();
  const client = new Client({ accessToken: token });

  // Verify connection first
  try {
    const response = await client.crm.contacts.basicApi.getPage(1);
    console.log(
      `Connected to HubSpot. Existing contacts: ${response.results.length > 0 ? "yes" : "none"}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to connect to HubSpot:", msg);
    process.exit(1);
  }

  const created = await seedContacts(client);

  // Verify final count
  const allContacts = await client.crm.contacts.basicApi.getPage(100);
  console.log(`\nTotal contacts in portal: ${allContacts.results.length}`);
  console.log("Seed complete. Run integration tests with:");
  console.log(
    `  HUBSPOT_ACCESS_TOKEN="${token.substring(0, 20)}..." npx jest tests/hubspot-integration.test.ts`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
