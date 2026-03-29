import { CrmContact } from "./types";

// Mock CRM contacts for dev/testing.
// Covers all 4 audit check scenarios: duplicates, stale, missing fields, format issues.
export function getMockContacts(): CrmContact[] {
  const now = new Date();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 86400000).toISOString();

  return [
    // --- Clean records ---
    {
      id: "101",
      email: "alice@acme.com",
      firstname: "Alice",
      lastname: "Johnson",
      company: "Acme Corp",
      jobtitle: "VP of Sales",
      phone: "(555) 123-4567",
      last_activity_date: daysAgo(5),
      notes_last_updated: daysAgo(3),
      createdate: daysAgo(200),
    },
    {
      id: "102",
      email: "bob@globex.com",
      firstname: "Bob",
      lastname: "Smith",
      company: "Globex Inc",
      jobtitle: "CTO",
      phone: "(555) 234-5678",
      last_activity_date: daysAgo(10),
      notes_last_updated: daysAgo(7),
      createdate: daysAgo(180),
    },

    // --- Duplicates: exact email ---
    {
      id: "103",
      email: "charlie@wayne.com",
      firstname: "Charlie",
      lastname: "Brown",
      company: "Wayne Enterprises",
      jobtitle: "Director of Ops",
      phone: "(555) 345-6789",
      last_activity_date: daysAgo(15),
      notes_last_updated: daysAgo(12),
      createdate: daysAgo(300),
    },
    {
      id: "104",
      email: "Charlie@Wayne.com", // duplicate email (case diff)
      firstname: "Charles",
      lastname: "Brown",
      company: "Wayne Enterprises",
      jobtitle: "Dir. Operations",
      phone: "555-345-6789",
      last_activity_date: daysAgo(20),
      notes_last_updated: daysAgo(18),
      createdate: daysAgo(250),
    },

    // --- Duplicates: fuzzy name + same domain ---
    {
      id: "105",
      email: "diana@stark.com",
      firstname: "Diana",
      lastname: "Prince",
      company: "Stark Industries",
      jobtitle: "Head of Marketing",
      phone: "(555) 456-7890",
      last_activity_date: daysAgo(8),
      notes_last_updated: daysAgo(6),
      createdate: daysAgo(150),
    },
    {
      id: "106",
      email: "dianap@stark.com", // same domain, similar name
      firstname: "Dina", // Levenshtein 1 from "Diana"
      lastname: "Prince",
      company: "Stark Industries",
      jobtitle: "Marketing Lead",
      phone: "(555) 456-7891",
      last_activity_date: daysAgo(12),
      notes_last_updated: daysAgo(10),
      createdate: daysAgo(140),
    },

    // --- Stale records (no activity in 90+ days, created > 90 days ago) ---
    {
      id: "107",
      email: "edward@oldcorp.com",
      firstname: "Edward",
      lastname: "Norton",
      company: "OldCorp LLC",
      jobtitle: "Account Executive",
      phone: "(555) 567-8901",
      last_activity_date: daysAgo(120),
      notes_last_updated: daysAgo(150),
      createdate: daysAgo(400),
    },
    {
      id: "108",
      email: "frank@dusty.com",
      firstname: "Frank",
      lastname: "Castle",
      company: "Dusty Deals Inc",
      jobtitle: "Sales Rep",
      phone: "(555) 678-9012",
      last_activity_date: null,
      notes_last_updated: null,
      createdate: daysAgo(365),
    },
    {
      id: "109",
      email: "grace@fossil.com",
      firstname: "Grace",
      lastname: "Hopper",
      company: "Fossil Data Corp",
      jobtitle: "Analyst",
      phone: "(555) 789-0123",
      last_activity_date: daysAgo(200),
      notes_last_updated: daysAgo(195),
      createdate: daysAgo(500),
    },

    // --- New record (created < 90 days ago, no activity — should NOT be flagged as stale) ---
    {
      id: "110",
      email: "hank@newco.com",
      firstname: "Hank",
      lastname: "Pym",
      company: "NewCo",
      jobtitle: "Founder",
      phone: "(555) 890-1234",
      last_activity_date: null,
      notes_last_updated: null,
      createdate: daysAgo(30),
    },

    // --- Missing critical fields ---
    {
      id: "111",
      email: null, // missing email
      firstname: "Ivy",
      lastname: "League",
      company: "Mystery Inc",
      jobtitle: null, // missing jobtitle
      phone: null, // missing phone
      last_activity_date: daysAgo(5),
      notes_last_updated: daysAgo(3),
      createdate: daysAgo(100),
    },
    {
      id: "112",
      email: "jack@incomplete.com",
      firstname: "Jack",
      lastname: "Sparrow",
      company: null, // missing company
      jobtitle: null, // missing jobtitle
      phone: null, // missing phone
      last_activity_date: daysAgo(15),
      notes_last_updated: daysAgo(10),
      createdate: daysAgo(200),
    },
    {
      id: "113",
      email: null, // missing email
      firstname: "Karen",
      lastname: null, // missing lastname (not in required but name matters)
      company: null, // missing company
      jobtitle: null, // missing jobtitle
      phone: null, // missing phone
      last_activity_date: daysAgo(2),
      notes_last_updated: daysAgo(1),
      createdate: daysAgo(50),
    },

    // --- Format inconsistencies ---
    {
      id: "114",
      email: "leo@format.com",
      firstname: "leo", // lowercase name
      lastname: "messi",
      company: "Format Co",
      jobtitle: "Engineer",
      phone: "5551234567", // no formatting
      last_activity_date: daysAgo(3),
      notes_last_updated: daysAgo(2),
      createdate: daysAgo(100),
    },
    {
      id: "115",
      email: "maria@format.com",
      firstname: "MARIA", // ALL CAPS
      lastname: "GARCIA",
      company: "Format Co",
      jobtitle: "Designer",
      phone: "+1-555-987-6543", // international format
      last_activity_date: daysAgo(7),
      notes_last_updated: daysAgo(5),
      createdate: daysAgo(90),
    },

    // --- More clean records to dilute percentages ---
    {
      id: "116",
      email: "nick@clean.com",
      firstname: "Nick",
      lastname: "Fury",
      company: "Shield Corp",
      jobtitle: "Director",
      phone: "(555) 111-2222",
      last_activity_date: daysAgo(2),
      notes_last_updated: daysAgo(1),
      createdate: daysAgo(300),
    },
    {
      id: "117",
      email: "olivia@clean.com",
      firstname: "Olivia",
      lastname: "Pope",
      company: "OPA Consulting",
      jobtitle: "Managing Partner",
      phone: "(555) 222-3333",
      last_activity_date: daysAgo(1),
      notes_last_updated: daysAgo(1),
      createdate: daysAgo(250),
    },
    {
      id: "118",
      email: "peter@clean.com",
      firstname: "Peter",
      lastname: "Parker",
      company: "Daily Bugle",
      jobtitle: "Photographer",
      phone: "(555) 333-4444",
      last_activity_date: daysAgo(4),
      notes_last_updated: daysAgo(3),
      createdate: daysAgo(180),
    },
    {
      id: "119",
      email: "quinn@clean.com",
      firstname: "Quinn",
      lastname: "Hughes",
      company: "Canucks Ltd",
      jobtitle: "Defenseman",
      phone: "(555) 444-5555",
      last_activity_date: daysAgo(6),
      notes_last_updated: daysAgo(4),
      createdate: daysAgo(120),
    },
    {
      id: "120",
      email: "rachel@clean.com",
      firstname: "Rachel",
      lastname: "Green",
      company: "Ralph Lauren",
      jobtitle: "Buyer",
      phone: "(555) 555-6666",
      last_activity_date: daysAgo(3),
      notes_last_updated: daysAgo(2),
      createdate: daysAgo(400),
    },
  ];
}
