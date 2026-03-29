import { CrmContact } from "../audit/types";

const ATTIO_BASE = "https://api.attio.com/v2";

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Fetch all people records from Attio, paginating through results.
 * Maps Attio's attribute format to the generic CrmContact type.
 */
export async function fetchAttioContacts(
  apiKey: string
): Promise<CrmContact[]> {
  const contacts: CrmContact[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(`${ATTIO_BASE}/objects/people/records/query`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ limit, offset }),
    });

    if (!res.ok) {
      throw new Error(`Attio API error: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as {
      data: AttioRecord[];
    };

    for (const record of body.data) {
      contacts.push(mapAttioRecord(record));
    }

    if (body.data.length < limit) break;
    offset += limit;
  }

  return contacts;
}

/**
 * Fetch a single people record by ID.
 */
export async function getAttioRecord(
  apiKey: string,
  recordId: string
): Promise<Record<string, string | null>> {
  const res = await fetch(
    `${ATTIO_BASE}/objects/people/records/${recordId}`,
    { headers: headers(apiKey) }
  );

  if (!res.ok) {
    throw new Error(`Attio API error: ${res.status}`);
  }

  const body = (await res.json()) as { data: AttioRecord };
  const contact = mapAttioRecord(body.data);
  return {
    firstname: contact.firstname,
    lastname: contact.lastname,
    email: contact.email,
    company: contact.company,
    jobtitle: contact.jobtitle,
    phone: contact.phone,
  };
}

/**
 * Update attributes on a people record.
 */
export async function updateAttioRecord(
  apiKey: string,
  recordId: string,
  properties: Record<string, string>
): Promise<void> {
  const values: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(properties)) {
    switch (key) {
      case "firstname":
      case "lastname":
        // Name is a single compound attribute in Attio
        if (!values.name) values.name = [{}];
        if (key === "firstname")
          (values.name as Record<string, string>[])[0].first_name = val;
        if (key === "lastname")
          (values.name as Record<string, string>[])[0].last_name = val;
        break;
      case "email":
        values.email_addresses = [{ email_address: val }];
        break;
      case "phone":
        values.phone_numbers = [{ phone_number: val }];
        break;
      case "company":
        values.job_title_and_company = [{ company: val }];
        break;
      case "jobtitle":
        values.job_title_and_company = [{ title: val }];
        break;
    }
  }

  const res = await fetch(
    `${ATTIO_BASE}/objects/people/records/${recordId}`,
    {
      method: "PATCH",
      headers: headers(apiKey),
      body: JSON.stringify({ data: { values } }),
    }
  );

  if (!res.ok) {
    throw new Error(`Attio update error: ${res.status}`);
  }
}

// --- Internal types & mapping ---

interface AttioRecord {
  id: { record_id: string };
  values: Record<string, AttioValue[]>;
}

type AttioValue = Record<string, unknown>;

function mapAttioRecord(record: AttioRecord): CrmContact {
  const v = record.values;

  const name = v.name?.[0] as
    | { first_name?: string; last_name?: string }
    | undefined;
  const email = v.email_addresses?.[0] as
    | { email_address?: string }
    | undefined;
  const phone = v.phone_numbers?.[0] as
    | { phone_number?: string }
    | undefined;
  const jobInfo = v.job_title_and_company?.[0] as
    | { title?: string; company?: string }
    | undefined;

  const interactionAt = v.last_interaction_at?.[0] as
    | { interacted_at?: string }
    | undefined;
  const createdAt = v.created_at?.[0] as
    | { created_at?: string }
    | undefined;

  return {
    id: record.id.record_id,
    email: email?.email_address ?? null,
    firstname: name?.first_name ?? null,
    lastname: name?.last_name ?? null,
    company: jobInfo?.company ?? null,
    jobtitle: jobInfo?.title ?? null,
    phone: phone?.phone_number ?? null,
    last_activity_date: interactionAt?.interacted_at ?? null,
    notes_last_updated: null,
    createdate: createdAt?.created_at ?? null,
  };
}
