export type AccountType = "donor" | "project" | "person";
export type AccountIntent = "donor" | "project" | "person";
export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  document: string;
  account_type: AccountType;
  role: "member" | "volunteer" | "moderator";
  role_label: string;
  phone: string | null;
  responsible_title: string | null;
  registration_number: string | null;
  created_at?: string;
}
export interface CatalogItem {
  code: string;
  label: string;
}
export interface Service extends CatalogItem {
  status: "available" | "coming_soon" | "future";
  interested?: boolean;
}
export interface Catalog {
  areas: CatalogItem[];
  organization_types: CatalogItem[];
  services: Service[];
  roles: Record<string, string>;
  demo_users_enabled: boolean;
}
export interface Project {
  id?: number;
  name: string;
  slug: string;
  organization_type: string;
  city: string;
  state: string;
  founding_year: number | null;
  short_description: string;
  objective: string | null;
  impact_summary: string | null;
  description: string | null;
  website_url: string | null;
  instagram_url: string | null;
  logo_url: string | null;
  created_at: string;
  areas: string[];
  verification_status?: string;
  profile_completeness?: number;
  is_demo?: boolean;
  pix_donations_available?: boolean;
  services?: Service[];
}
export interface Organization extends Project {
  id: number;
  institution_kind: "donor" | "project";
  cnpj: string | null;
  pix_key: string | null;
  services: Service[];
}
export interface Membership {
  id: number;
  name: string;
  city: string;
  state: string;
  member_role: "staff" | "assisted";
  created_at: string;
}
export interface Announcement {
  id: number;
  title: string;
  body: string;
  category: string;
  published_at: string;
}
export type TicketStatus = "open" | "in_progress" | "resolved";
export interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: TicketStatus;
  created_at: string;
  full_name?: string;
  email?: string;
}
export interface ModerationOverview {
  counts: { users: number; organizations: number; open_tickets: number };
  tickets: Ticket[];
}
export type DonationStatus =
  | "awaiting_payment"
  | "awaiting_confirmation"
  | "confirmed"
  | "rejected";
export interface Donation {
  id: number;
  project_id: number;
  project_name: string;
  amount_cents: number;
  currency: "BRL";
  payment_method: "pix";
  status: DonationStatus;
  end_to_end_id: string | null;
  receipt_code: string | null;
  created_at: string;
  payment_reported_at: string | null;
  confirmed_at: string | null;
  donor_name?: string | null;
  donor_cnpj?: string | null;
  donor_document?: string | null;
  donor_document_type?: "person" | "donor";
  pix_key?: string;
}
export interface DonationStart {
  id: number;
  project_id: number;
  project_name: string;
  amount_cents: number;
  currency: "BRL";
  payment_method: "pix";
  status: "awaiting_payment";
  pix_key: string;
  payment_instructions: string;
  next_step: string;
  tax_notice: string;
}
export interface PixReviewCandidate {
  id: number;
  name: string;
  cnpj: string | null;
  pix_key: string | null;
  pix_key_verified_at: string | null;
  owner_id: number;
  owner_name: string;
}
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}
export interface MessageResponse {
  message: string;
  registration_number?: string;
  id?: number;
}
