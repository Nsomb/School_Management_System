// frontend/src/config/branding.ts
/**
 * Central branding configuration for the entire platform.
 * Edit values here once, and the whole app updates.
 */

export const BRANDING = {
  // ─── System Identity ───────────────────────────────────────
  systemName: 'TechSavvy School Management System',                                    // Short name (nav, favicons)
  systemNameLong: 'TechSavvy School Management System',       // Full name (titles, footers)
  systemTagline: 'School Management System',            // Subtitle in the nav bar

  // ─── Colors ────────────────────────────────────────────────
  brandColor: '#1e40af',       // Primary deep blue
  brandAccent:  '#1BA3A3',      // Lighter blue (gradient end)

  // ─── Contact ───────────────────────────────────────────────
  contactEmail: 'briannsom162@gmail.com',
  contactMessage: 'Contact us for your software services',

  // ─── Footer ────────────────────────────────────────────────
  copyrightYear: new Date().getFullYear(),
} as const;

export type Branding = typeof BRANDING;