/**
 * Hand-maintained mirror of supabase/migrations.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 */

export type UserRole = "admin" | "editor" | "viewer";
export type DonationStatus = "pending" | "verified" | "rejected";
export type NotificationKind = "announcement" | "notice" | "pooja" | "event";

/**
 * One entry in the public notification feed.
 *
 * Written only by database triggers on the source tables. `subject`/`detail`
 * are committee-authored and shown as typed; `meta` carries structured facts
 * the UI formats in the reader's language.
 *
 * source_table/source_id are intentionally absent: anon is not granted them.
 */
export type PublicNotification = {
  id: string;
  kind: NotificationKind;
  subject: string;
  detail: string | null;
  meta: NotificationMeta;
  href: string;
  published_at: string;
  created_at: string;
};

/**
 * The two fields the unread badge needs.
 *
 * Whether something is unread is a device-local question — this app has no
 * public accounts — so the badge only needs enough to compare the feed against
 * what this browser has already seen.
 */
export type NotificationDigest = Pick<PublicNotification, "id" | "published_at">;

/** The shapes the triggers actually write into notifications.meta. */
export type NotificationMeta = {
  reason?: "published" | "added" | "rescheduled";
  category?: string;
  pooja_date?: string;
  event_date?: string;
  start_time?: string | null;
  previous_date?: string;
  previous_time?: string | null;
};

export type AnnouncementCategory = "pooja" | "events" | "general" | "important";
export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type MediaType = "photo" | "video";
export type SponsorTier = "platinum" | "gold" | "silver" | "supporter";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "rescheduled"
  | "completed"
  | "no_show";
export type ScheduleStatus = "scheduled" | "cancelled" | "completed";
export type EventStatus = ScheduleStatus | "postponed";

export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FestivalSettings = {
  id: boolean;
  festival_name: string;
  festival_year: number;
  tagline: string | null;
  invocation: string | null;
  about: string | null;
  start_date: string | null;
  end_date: string | null;
  donation_goal: number;
  upi_id: string | null;
  upi_payee_name: string | null;
  live_darshan_url: string | null;
  nimajjanam_date: string | null;
  nimajjanam_time: string | null;
  nimajjanam_route: string | null;
  venue_name: string | null;
  venue_address: string | null;
  latitude: number | null;
  longitude: number | null;
  map_embed_url: string | null;
  directions_url: string | null;
  hero_image_url: string | null;
  updated_at: string;
}

export type CommitteeMember = {
  id: string;
  name: string;
  position: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FestivalEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  day_part: string | null;
  venue: string | null;
  category: string;
  image_url: string | null;
  is_cultural: boolean;
  is_featured: boolean;
  is_published: boolean;
  max_capacity: number | null;
  booking_enabled: boolean;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PoojaSlot = {
  id: string;
  title: string;
  description: string | null;
  pooja_date: string;
  start_time: string;
  end_time: string | null;
  priest_name: string | null;
  is_daily: boolean;
  is_published: boolean;
  display_order: number;
  max_couples: number;
  booking_enabled: boolean;
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  special_instructions: string | null;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Row of the public.pooja_availability view — aggregate counts only, readable
 * by anonymous visitors. Never contains a couple's name or phone number.
 */
export type PoojaAvailability = {
  pooja_id: string;
  title: string;
  description: string | null;
  pooja_date: string;
  start_time: string;
  end_time: string | null;
  priest_name: string | null;
  special_instructions: string | null;
  status: ScheduleStatus;
  booking_enabled: boolean;
  max_couples: number;
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  booked: number;
  available: number;
  is_bookable: boolean;
};

export type PoojaBooking = {
  id: string;
  booking_ref: string;
  pooja_id: string;
  partner1_name: string;
  partner2_name: string | null;
  gotram: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  status: BookingStatus;
  source: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  rescheduled_from: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VolunteerAssignment = {
  id: string;
  volunteer_id: string;
  event_id: string | null;
  pooja_id: string | null;
  role: string;
  duty_date: string | null;
  notes: string | null;
  status: "assigned" | "completed" | "cancelled";
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AiActionLog = {
  id: string;
  actor_type: "public" | "admin" | "system";
  actor_id: string | null;
  session_id: string | null;
  surface: string | null;
  tool_name: string;
  arguments: Record<string, unknown>;
  success: boolean;
  error: string | null;
  object_type: string | null;
  object_id: string | null;
  duration_ms: number | null;
  model: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Donation = {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  amount: number;
  donation_date: string;
  payment_method: string;
  transaction_ref: string | null;
  notes: string | null;
  status: DonationStatus;
  is_anonymous: boolean;
  is_public: boolean;
  source: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The narrower shape anonymous visitors are granted on public.donations. */
export type PublicDonation = Pick<
  Donation,
  | "id"
  | "donor_name"
  | "amount"
  | "donation_date"
  | "payment_method"
  | "status"
  | "is_anonymous"
  | "is_public"
  | "created_at"
>;

export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  notes: string | null;
  receipt_url: string | null;
  is_public: boolean;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicExpense = Pick<
  Expense,
  "id" | "title" | "category" | "amount" | "expense_date" | "is_public" | "created_at"
>;

export type GalleryItem = {
  id: string;
  title: string | null;
  caption: string | null;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  album: string;
  width: number | null;
  height: number | null;
  is_highlight: boolean;
  is_published: boolean;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Volunteer = {
  id: string;
  name: string;
  phone: string | null;
  team: string;
  availability: string | null;
  notes: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type Sponsor = {
  id: string;
  name: string;
  tier: SponsorTier;
  logo_url: string | null;
  website_url: string | null;
  contribution_amount: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ContactInformation = {
  id: string;
  label: string;
  contact_name: string | null;
  phone: string;
  email: string | null;
  is_emergency: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Return shape of public.public_stats(). */
export type PublicStats = {
  total_donations: number;
  donor_count: number;
  transaction_count: number;
  top_donation: number;
  total_expenses: number;
  donation_goal: number;
  volunteer_count: number;
}

/** Return shape of public.admin_booking_summary(). */
export type AdminBookingSummary = {
  today: number;
  tomorrow: number;
  upcoming: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  total_slots: number;
  slots_left: number;
  unassigned_volunteers: number;
};

/**
 * Discriminated result of book_pooja_slot() / cancel_pooja_booking().
 * These functions never throw for expected outcomes — they return `ok: false`
 * with a machine-readable `code`, so the UI and the AI agent can both react.
 */
export type BookingFailureCode =
  | "invalid_input"
  | "not_found"
  | "unavailable"
  | "booking_disabled"
  | "past"
  | "not_open_yet"
  | "closed"
  | "full"
  | "duplicate"
  | "already_cancelled"
  | "not_cancellable";

export type BookingResult =
  | {
      ok: true;
      booking_id?: string;
      booking_ref: string;
      status: BookingStatus;
      pooja_id?: string;
      pooja_title?: string;
      pooja_date?: string;
      start_time?: string;
      partner1_name?: string;
      partner2_name?: string | null;
      available_after?: number;
      message?: string;
    }
  | {
      ok: false;
      code: BookingFailureCode;
      message: string;
      available?: number;
      opens_at?: string;
    };

export type BookingLookupResult =
  | {
      ok: true;
      booking_ref: string;
      status: BookingStatus;
      partner1_name: string;
      partner2_name: string | null;
      gotram: string | null;
      pooja_title: string;
      pooja_date: string;
      start_time: string;
      end_time: string | null;
      special_instructions: string | null;
      created_at: string;
    }
  | { ok: false; code: string; message: string };

/** Return shape of public.admin_stats(). */
export type AdminStats = {
  total_donations: number;
  pending_donations: number;
  pending_count: number;
  total_expenses: number;
  donor_count: number;
  volunteer_count: number;
  upcoming_events: number;
  donation_goal: number;
}

type Row<T> = T;

/**
 * Everything the database can default is optional on insert; `Required` lists
 * the columns that are NOT NULL with no default, so they must be supplied.
 */
type Insert<T, Required extends keyof T = never> = Partial<T> & Pick<T, Required>;

export type Database = {
  public: {
    Tables: {
      users: {
        Row: Row<AppUser>;
        Insert: Insert<AppUser, "id" | "email">;
        Update: Partial<AppUser>;
        Relationships: [];
      };
      festival_settings: {
        Row: Row<FestivalSettings>;
        Insert: Insert<FestivalSettings>;
        Update: Partial<FestivalSettings>;
        Relationships: [];
      };
      committee_members: {
        Row: Row<CommitteeMember>;
        Insert: Insert<CommitteeMember, "name" | "position">;
        Update: Partial<CommitteeMember>;
        Relationships: [];
      };
      events: {
        Row: Row<FestivalEvent>;
        Insert: Insert<FestivalEvent, "title" | "event_date">;
        Update: Partial<FestivalEvent>;
        Relationships: [];
      };
      pooja_schedule: {
        Row: Row<PoojaSlot>;
        Insert: Insert<PoojaSlot, "title" | "pooja_date" | "start_time">;
        Update: Partial<PoojaSlot>;
        Relationships: [];
      };
      announcements: {
        Row: Row<Announcement>;
        Insert: Insert<Announcement, "title" | "body">;
        Update: Partial<Announcement>;
        Relationships: [];
      };
      donations: {
        Row: Row<Donation>;
        Insert: Insert<Donation, "donor_name" | "amount">;
        Update: Partial<Donation>;
        Relationships: [];
      };
      expenses: {
        Row: Row<Expense>;
        Insert: Insert<Expense, "title" | "amount">;
        Update: Partial<Expense>;
        Relationships: [];
      };
      gallery: {
        Row: Row<GalleryItem>;
        Insert: Insert<GalleryItem, "url">;
        Update: Partial<GalleryItem>;
        Relationships: [];
      };
      volunteers: {
        Row: Row<Volunteer>;
        Insert: Insert<Volunteer, "name">;
        Update: Partial<Volunteer>;
        Relationships: [];
      };
      sponsors: {
        Row: Row<Sponsor>;
        Insert: Insert<Sponsor, "name">;
        Update: Partial<Sponsor>;
        Relationships: [];
      };
      contact_information: {
        Row: Row<ContactInformation>;
        Insert: Insert<ContactInformation, "label" | "phone">;
        Update: Partial<ContactInformation>;
        Relationships: [];
      };
      pooja_bookings: {
        Row: Row<PoojaBooking>;
        Insert: Insert<PoojaBooking, "booking_ref" | "pooja_id" | "partner1_name" | "phone">;
        Update: Partial<PoojaBooking>;
        Relationships: [];
      };
      volunteer_assignments: {
        Row: Row<VolunteerAssignment>;
        Insert: Insert<VolunteerAssignment, "volunteer_id">;
        Update: Partial<VolunteerAssignment>;
        Relationships: [];
      };
      ai_action_logs: {
        Row: Row<AiActionLog>;
        Insert: Insert<AiActionLog, "tool_name">;
        Update: Partial<AiActionLog>;
        Relationships: [];
      };
      /**
       * Read-only from the application's point of view.
       *
       * `Row` is the anon-visible projection, not the full table: source_table
       * and source_id are never granted to a client. Insert and Update accept
       * no columns at all, which makes "the triggers are the only writer" a
       * compile-time fact and not just a policy — a stray `.insert()` here
       * fails to typecheck long before RLS has to refuse it.
       */
      notifications: {
        Row: Row<PublicNotification>;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {
      pooja_availability: {
        Row: Row<PoojaAvailability>;
        Relationships: [];
      };
    };
    Functions: {
      public_stats: { Args: Record<string, never>; Returns: PublicStats };
      admin_stats: { Args: Record<string, never>; Returns: AdminStats };
      admin_booking_summary: {
        Args: Record<string, never>;
        Returns: AdminBookingSummary;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      can_edit: { Args: Record<string, never>; Returns: boolean };
      book_pooja_slot: {
        Args: {
          p_pooja_id: string;
          p_partner1: string;
          p_partner2?: string | null;
          p_phone?: string | null;
          p_gotram?: string | null;
          p_email?: string | null;
          p_notes?: string | null;
          p_source?: string;
        };
        Returns: BookingResult;
      };
      cancel_pooja_booking: {
        Args: { p_booking_ref: string; p_phone: string; p_reason?: string | null };
        Returns: BookingResult;
      };
      get_booking_by_ref: {
        Args: { p_booking_ref: string; p_phone: string };
        Returns: BookingLookupResult;
      };
      log_ai_action: {
        Args: {
          p_actor_type: string;
          p_session_id: string | null;
          p_surface: string | null;
          p_tool_name: string;
          p_arguments: Record<string, unknown>;
          p_success: boolean;
          p_error: string | null;
          p_object_type: string | null;
          p_object_id: string | null;
          p_duration_ms: number | null;
          p_model: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      donation_status: DonationStatus;
      announcement_category: AnnouncementCategory;
      media_type: MediaType;
      sponsor_tier: SponsorTier;
      booking_status: BookingStatus;
      notification_kind: NotificationKind;
    };
    CompositeTypes: Record<never, never>;
  };
}

