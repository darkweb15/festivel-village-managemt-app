/**
 * Declarative schema for every table the committee can edit.
 *
 * The admin forms render from these definitions and the server action validates
 * against the same definitions, so the browser can never write a column that
 * isn't declared here. (Row Level Security is still the real boundary — this
 * just keeps the surface small and the UI consistent.)
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "time"
  | "datetime"
  | "select"
  | "reference"
  | "checkbox"
  | "url"
  | "image";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Storage bucket for `image` fields. */
  bucket?: "gallery" | "members";
  /**
   * For `reference` fields: which table to offer rows from, and which columns
   * build the option label. Options are loaded server-side by the admin page.
   */
  reference?: {
    table: string;
    labelColumns: string[];
    orderBy: string;
    /** Only offer rows matching these equality filters. */
    filter?: Record<string, string | boolean>;
  };
  /** Span the full row in the two-column form grid. */
  full?: boolean;
  default?: string | number | boolean;
};

export type ListSpec = {
  /** Column shown as the row's heading. */
  title: string;
  /** Columns joined with a middot under the heading. */
  meta?: string[];
  /** Rendered right-aligned as a currency figure. */
  amount?: string;
  /** Rendered as a status chip. */
  badge?: string;
  /** Rendered as a small thumbnail on the left. */
  thumbnail?: string;
};

export type Resource = {
  table: string;
  title: string;
  singular: string;
  description: string;
  order: { column: string; ascending: boolean }[];
  fields: Field[];
  list: ListSpec;
};

const PUBLISHED: Field = {
  name: "is_published",
  label: "Published",
  type: "checkbox",
  default: true,
  hint: "Uncheck to hide from the public app",
};

const ACTIVE: Field = {
  name: "is_active",
  label: "Active",
  type: "checkbox",
  default: true,
};

const ORDER: Field = {
  name: "display_order",
  label: "Display order",
  type: "number",
  default: 0,
  hint: "Lower numbers appear first",
};

export const RESOURCES = {
  events: {
    table: "events",
    title: "Events",
    singular: "Event",
    description: "Poojas, sevas and cultural programs on the festival calendar.",
    order: [
      { column: "event_date", ascending: false },
      { column: "start_time", ascending: true },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, full: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "event_date", label: "Date", type: "date", required: true },
      {
        name: "day_part",
        label: "Part of day",
        type: "select",
        options: [
          { value: "Morning", label: "Morning" },
          { value: "Afternoon", label: "Afternoon" },
          { value: "Evening", label: "Evening" },
          { value: "Night", label: "Night" },
        ],
      },
      { name: "start_time", label: "Start time", type: "time" },
      { name: "end_time", label: "End time", type: "time" },
      { name: "venue", label: "Venue", type: "text", full: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        default: "general",
        options: [
          { value: "general", label: "General" },
          { value: "pooja", label: "Pooja" },
          { value: "seva", label: "Seva" },
          { value: "cultural", label: "Cultural" },
          { value: "nimajjanam", label: "Nimajjanam" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        default: "scheduled",
        options: [
          { value: "scheduled", label: "Scheduled" },
          { value: "postponed", label: "Postponed" },
          { value: "cancelled", label: "Cancelled" },
          { value: "completed", label: "Completed" },
        ],
      },
      {
        name: "max_capacity",
        label: "Maximum attendees",
        type: "number",
        hint: "Leave blank if the event has no capacity limit",
      },
      { name: "is_cultural", label: "Cultural program", type: "checkbox" },
      { name: "is_featured", label: "Featured", type: "checkbox" },
      PUBLISHED,
    ],
    list: { title: "title", meta: ["event_date", "day_part", "venue"], badge: "status" },
  },

  pooja_schedule: {
    table: "pooja_schedule",
    title: "Pooja Management",
    singular: "Pooja",
    description:
      "The pooja schedule, and the couple-booking capacity the public booking screen reads.",
    order: [
      { column: "pooja_date", ascending: false },
      { column: "start_time", ascending: true },
    ],
    fields: [
      { name: "title", label: "Pooja name", type: "text", required: true, full: true },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "pooja_date", label: "Date", type: "date", required: true },
      { name: "priest_name", label: "Priest", type: "text" },
      { name: "start_time", label: "Start time", type: "time", required: true },
      { name: "end_time", label: "End time", type: "time" },
      {
        name: "status",
        label: "Status",
        type: "select",
        default: "scheduled",
        options: [
          { value: "scheduled", label: "Scheduled" },
          { value: "cancelled", label: "Cancelled" },
          { value: "completed", label: "Completed" },
        ],
      },
      {
        name: "max_couples",
        label: "Maximum couples",
        type: "number",
        default: 0,
        hint: "0 means this pooja takes no couple bookings",
      },
      {
        name: "booking_enabled",
        label: "Couple booking open",
        type: "checkbox",
        hint: "Both this and a capacity above 0 are required before anyone can book",
      },
      { name: "booking_opens_at", label: "Booking opens", type: "datetime" },
      { name: "booking_closes_at", label: "Booking closes", type: "datetime" },
      {
        name: "special_instructions",
        label: "Special instructions",
        type: "textarea",
        full: true,
        hint: "Shown to couples on the booking and confirmation screens",
      },
      { name: "is_daily", label: "Repeats daily", type: "checkbox" },
      PUBLISHED,
      ORDER,
    ],
    list: {
      title: "title",
      meta: ["pooja_date", "start_time", "priest_name"],
      badge: "status",
    },
  },

  announcements: {
    table: "announcements",
    title: "Announcements",
    singular: "Announcement",
    description: "Short updates that appear in the announcements feed.",
    order: [
      { column: "is_pinned", ascending: false },
      { column: "published_at", ascending: false },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, full: true },
      { name: "body", label: "Message", type: "textarea", required: true, full: true },
      {
        name: "category",
        label: "Category",
        type: "select",
        default: "general",
        options: [
          { value: "pooja", label: "Pooja" },
          { value: "events", label: "Events" },
          { value: "general", label: "General" },
          { value: "important", label: "Important" },
        ],
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        default: "normal",
        options: [
          { value: "low", label: "Low" },
          { value: "normal", label: "Normal" },
          { value: "high", label: "High" },
          { value: "urgent", label: "Urgent" },
        ],
      },
      { name: "is_pinned", label: "Pin to top", type: "checkbox" },
      PUBLISHED,
    ],
    list: { title: "title", meta: ["published_at", "priority"], badge: "category" },
  },

  donations: {
    table: "donations",
    title: "Donations",
    singular: "Donation",
    description:
      "Confirm each entry against the bank or UPI statement before marking it verified.",
    order: [{ column: "created_at", ascending: false }],
    fields: [
      { name: "donor_name", label: "Donor name", type: "text", required: true },
      { name: "amount", label: "Amount", type: "currency", required: true },
      { name: "donation_date", label: "Date", type: "date" },
      {
        name: "payment_method",
        label: "Method",
        type: "select",
        default: "upi",
        options: [
          { value: "upi", label: "UPI" },
          { value: "cash", label: "Cash" },
          { value: "bank", label: "Bank transfer" },
          { value: "cheque", label: "Cheque" },
        ],
      },
      { name: "transaction_ref", label: "Transaction ID", type: "text" },
      { name: "donor_phone", label: "Phone", type: "text" },
      { name: "notes", label: "Notes", type: "textarea", full: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        default: "pending",
        hint: "Only verified donations count towards public totals",
        options: [
          { value: "pending", label: "Pending confirmation" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ],
      },
      { name: "is_anonymous", label: "Show as anonymous", type: "checkbox" },
      {
        name: "is_public",
        label: "List publicly",
        type: "checkbox",
        default: true,
      },
    ],
    list: {
      title: "donor_name",
      meta: ["donation_date", "payment_method", "transaction_ref"],
      amount: "amount",
      badge: "status",
    },
  },

  expenses: {
    table: "expenses",
    title: "Expenses",
    singular: "Expense",
    description: "Festival spending, shown publicly for transparency.",
    order: [{ column: "expense_date", ascending: false }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "amount", label: "Amount", type: "currency", required: true },
      { name: "expense_date", label: "Date", type: "date" },
      {
        name: "category",
        label: "Category",
        type: "select",
        default: "general",
        options: [
          { value: "general", label: "General" },
          { value: "decoration", label: "Decoration" },
          { value: "prasadam", label: "Prasadam / Annadanam" },
          { value: "idol", label: "Idol & mandapam" },
          { value: "sound", label: "Sound & lighting" },
          { value: "cultural", label: "Cultural programs" },
          { value: "transport", label: "Transport" },
          { value: "priest", label: "Priest dakshina" },
        ],
      },
      { name: "vendor", label: "Paid to", type: "text" },
      { name: "notes", label: "Notes", type: "textarea", full: true },
      {
        name: "is_public",
        label: "Show publicly",
        type: "checkbox",
        default: true,
      },
    ],
    list: {
      title: "title",
      meta: ["expense_date", "category", "vendor"],
      amount: "amount",
    },
  },

  gallery: {
    table: "gallery",
    title: "Gallery",
    singular: "Media item",
    description: "Photos and videos shown on the Gallery screen.",
    order: [
      { column: "display_order", ascending: true },
      { column: "created_at", ascending: false },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", full: true },
      { name: "caption", label: "Caption", type: "textarea", full: true },
      {
        name: "media_type",
        label: "Type",
        type: "select",
        default: "photo",
        options: [
          { value: "photo", label: "Photo" },
          { value: "video", label: "Video" },
        ],
      },
      { name: "album", label: "Album", type: "text", default: "Festival Moments" },
      {
        name: "url",
        label: "Image / video",
        type: "image",
        bucket: "gallery",
        required: true,
        full: true,
        hint: "Upload a photo, or paste a YouTube/Vimeo link for videos",
      },
      {
        name: "thumbnail_url",
        label: "Video thumbnail",
        type: "image",
        bucket: "gallery",
        full: true,
        hint: "Optional. Used as the tile image for videos.",
      },
      { name: "is_highlight", label: "Highlight", type: "checkbox" },
      PUBLISHED,
      ORDER,
    ],
    list: { title: "title", meta: ["album", "media_type"], thumbnail: "thumbnail_url" },
  },

  committee_members: {
    table: "committee_members",
    title: "Committee",
    singular: "Member",
    description: "The committee roster shown on the Our Committee screen.",
    order: [
      { column: "display_order", ascending: true },
      { column: "name", ascending: true },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      {
        name: "photo_url",
        label: "Photo",
        type: "image",
        bucket: "members",
        full: true,
      },
      { name: "bio", label: "Short bio", type: "textarea", full: true },
      ACTIVE,
      ORDER,
    ],
    list: { title: "name", meta: ["position", "phone"], thumbnail: "photo_url" },
  },

  volunteers: {
    table: "volunteers",
    title: "Volunteers",
    singular: "Volunteer",
    description: "Phone numbers stay private — the public list shows name and team only.",
    order: [
      { column: "team", ascending: true },
      { column: "name", ascending: true },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "team", label: "Team", type: "text", default: "General" },
      {
        name: "availability",
        label: "Availability",
        type: "text",
        placeholder: "e.g. Evenings",
      },
      { name: "notes", label: "Notes", type: "textarea", full: true },
      ACTIVE,
      {
        name: "is_public",
        label: "Show in public list",
        type: "checkbox",
        default: true,
      },
    ],
    list: { title: "name", meta: ["team", "availability"] },
  },

  sponsors: {
    table: "sponsors",
    title: "Sponsors",
    singular: "Sponsor",
    description: "Supporters acknowledged on the Sponsors screen.",
    order: [
      { column: "display_order", ascending: true },
      { column: "name", ascending: true },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "tier",
        label: "Tier",
        type: "select",
        default: "supporter",
        options: [
          { value: "platinum", label: "Platinum" },
          { value: "gold", label: "Gold" },
          { value: "silver", label: "Silver" },
          { value: "supporter", label: "Supporter" },
        ],
      },
      { name: "contribution_amount", label: "Contribution", type: "currency" },
      { name: "website_url", label: "Website", type: "url" },
      {
        name: "logo_url",
        label: "Logo",
        type: "image",
        bucket: "members",
        full: true,
      },
      ACTIVE,
      ORDER,
    ],
    list: {
      title: "name",
      meta: ["tier"],
      amount: "contribution_amount",
      thumbnail: "logo_url",
    },
  },

  volunteer_assignments: {
    table: "volunteer_assignments",
    title: "Volunteer Duties",
    singular: "Assignment",
    description: "Who is on duty, for which pooja or event, and on what day.",
    order: [
      { column: "duty_date", ascending: true },
      { column: "created_at", ascending: false },
    ],
    fields: [
      {
        name: "volunteer_id",
        label: "Volunteer",
        type: "reference",
        required: true,
        reference: {
          table: "volunteers",
          labelColumns: ["name", "team"],
          orderBy: "name",
          filter: { is_active: true },
        },
      },
      {
        name: "role",
        label: "Duty",
        type: "text",
        default: "General",
        placeholder: "e.g. Annadanam serving",
      },
      { name: "duty_date", label: "Duty date", type: "date" },
      {
        name: "status",
        label: "Status",
        type: "select",
        default: "assigned",
        options: [
          { value: "assigned", label: "Assigned" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
      {
        name: "pooja_id",
        label: "For pooja",
        type: "reference",
        full: true,
        reference: {
          table: "pooja_schedule",
          labelColumns: ["title", "pooja_date"],
          orderBy: "pooja_date",
        },
      },
      {
        name: "event_id",
        label: "For event",
        type: "reference",
        full: true,
        reference: {
          table: "events",
          labelColumns: ["title", "event_date"],
          orderBy: "event_date",
        },
      },
      { name: "notes", label: "Notes", type: "textarea", full: true },
    ],
    list: { title: "role", meta: ["duty_date"], badge: "status" },
  },

  contact_information: {
    table: "contact_information",
    title: "Contact Numbers",
    singular: "Contact",
    description: "Phone numbers shown on the Contact and Location screens.",
    order: [{ column: "display_order", ascending: true }],
    fields: [
      {
        name: "label",
        label: "Label",
        type: "text",
        required: true,
        placeholder: "e.g. President",
      },
      { name: "contact_name", label: "Name", type: "text" },
      { name: "phone", label: "Phone", type: "text", required: true },
      { name: "email", label: "Email", type: "text" },
      { name: "is_emergency", label: "Emergency number", type: "checkbox" },
      ACTIVE,
      ORDER,
    ],
    list: { title: "label", meta: ["contact_name", "phone"] },
  },
} satisfies Record<string, Resource>;

export type ResourceKey = keyof typeof RESOURCES;

export function isResourceKey(value: string): value is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCES, value);
}

/** Field definitions for the single-row festival_settings record. */
export const SETTINGS_SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Festival",
    fields: [
      { name: "festival_name", label: "Festival name", type: "text" },
      { name: "festival_year", label: "Year", type: "number" },
      { name: "tagline", label: "Tagline", type: "text", full: true },
      { name: "invocation", label: "Invocation line", type: "text", full: true },
      { name: "about", label: "About the festival", type: "textarea", full: true },
      { name: "start_date", label: "Start date", type: "date" },
      { name: "end_date", label: "End date", type: "date" },
      {
        name: "hero_image_url",
        label: "Home hero image",
        type: "image",
        bucket: "gallery",
        full: true,
        hint: "Replaces the placeholder artwork on the Home screen",
      },
    ],
  },
  {
    title: "Donations",
    fields: [
      { name: "donation_goal", label: "Donation goal", type: "currency" },
      { name: "upi_id", label: "UPI ID", type: "text", placeholder: "name@bank" },
      { name: "upi_payee_name", label: "UPI payee name", type: "text" },
    ],
  },
  {
    title: "Nimajjanam",
    fields: [
      { name: "nimajjanam_date", label: "Date", type: "date" },
      { name: "nimajjanam_time", label: "Start time", type: "time" },
      { name: "nimajjanam_route", label: "Route", type: "textarea", full: true },
    ],
  },
  {
    title: "Venue & links",
    fields: [
      { name: "venue_name", label: "Venue name", type: "text", full: true },
      { name: "venue_address", label: "Address", type: "textarea", full: true },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      {
        name: "directions_url",
        label: "Directions link",
        type: "url",
        full: true,
        hint: "Optional. Falls back to Google Maps using the coordinates.",
      },
      {
        name: "live_darshan_url",
        label: "Live darshan link",
        type: "url",
        full: true,
        hint: "A YouTube, Vimeo or Facebook video URL",
      },
    ],
  },
];
