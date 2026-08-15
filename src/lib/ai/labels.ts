/**
 * Human wording for agent activity.
 *
 * Villagers should never see `get_available_pooja_slots`. This maps each tool to
 * what it is doing ("Checking availability") and what it just did ("Availability
 * checked"), so the activity trail reads like a system working rather than a
 * debug log.
 *
 * Shared by the chat UI and the admin AI Activity screen so the two never drift.
 */

type Phrase = { running: string; done: string };

const PHRASES: Record<string, Phrase> = {
  get_festival_info: { running: "Reading festival details", done: "Festival details found" },
  get_events: { running: "Checking the event schedule", done: "Events checked" },
  get_pooja_schedule: { running: "Checking the pooja schedule", done: "Schedule found" },
  get_available_pooja_slots: { running: "Checking availability", done: "Availability checked" },
  create_booking: { running: "Creating booking", done: "Booking created" },
  get_booking: { running: "Finding your booking", done: "Booking found" },
  cancel_booking: { running: "Cancelling booking", done: "Booking cancelled" },
  get_announcements: { running: "Reading announcements", done: "Announcements read" },
  get_public_donation_summary: { running: "Reading festival fund", done: "Fund totals read" },
  get_committee_info: { running: "Reading committee list", done: "Committee list read" },
  get_location_info: { running: "Reading location details", done: "Location found" },
  get_volunteer_information: { running: "Reading volunteer teams", done: "Volunteers read" },
  get_gallery_highlights: { running: "Reading gallery", done: "Gallery read" },

  get_admin_booking_summary: { running: "Reading booking summary", done: "Booking summary read" },
  get_bookings_for_date: { running: "Reading bookings", done: "Bookings read" },
  get_admin_donation_summary: { running: "Reading donation figures", done: "Donations read" },
  get_expense_summary: { running: "Adding up expenses", done: "Expenses totalled" },
  get_volunteer_assignments: { running: "Reading volunteer duties", done: "Duties read" },
  update_booking_status: { running: "Updating booking", done: "Booking updated" },
  create_pooja: { running: "Creating pooja", done: "Pooja created" },
  update_pooja: { running: "Updating pooja", done: "Pooja updated" },
  create_event: { running: "Creating event", done: "Event created" },
  draft_announcement: { running: "Drafting announcement", done: "Draft ready for approval" },
  create_announcement: { running: "Publishing announcement", done: "Announcement published" },
  assign_volunteer: { running: "Assigning volunteer", done: "Volunteer assigned" },
  generate_event_summary: { running: "Gathering the day's data", done: "Day summary ready" },
};

/** Past-tense label for a completed step. Falls back to something neutral. */
export function toolDoneLabel(tool: string) {
  return PHRASES[tool]?.done ?? "Checked";
}

/** Present-tense label while a step runs. */
export function toolRunningLabel(tool: string) {
  return PHRASES[tool]?.running ?? "Working";
}

/**
 * Sentence used in the admin activity log ("Assistant checked availability").
 * Written out rather than derived — English past tense is irregular enough
 * that a suffix rule produces "readed" and "finded".
 */
const PAST: Record<string, string> = {
  get_festival_info: "read the festival details",
  get_events: "checked the event schedule",
  get_pooja_schedule: "checked the pooja schedule",
  get_available_pooja_slots: "checked pooja availability",
  create_booking: "created a booking",
  get_booking: "looked up a booking",
  cancel_booking: "cancelled a booking",
  get_announcements: "read the announcements",
  get_public_donation_summary: "read the festival fund totals",
  get_committee_info: "read the committee list",
  get_location_info: "read the location details",
  get_volunteer_information: "read the volunteer teams",
  get_gallery_highlights: "read the gallery",
  get_admin_booking_summary: "read the booking summary",
  get_bookings_for_date: "read bookings for a date",
  get_admin_donation_summary: "read the donation figures",
  get_expense_summary: "totalled the expenses",
  get_volunteer_assignments: "read the volunteer duties",
  update_booking_status: "changed a booking status",
  create_pooja: "created a pooja",
  update_pooja: "updated a pooja",
  create_event: "created an event",
  draft_announcement: "drafted an announcement",
  create_announcement: "published an announcement",
  assign_volunteer: "assigned a volunteer",
  generate_event_summary: "gathered a day summary",
};

export function toolPastPhrase(tool: string) {
  return PAST[tool] ?? `ran ${tool}`;
}
