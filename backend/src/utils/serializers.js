import { PortfolioLink } from "../models/PortfolioLink.js";

const idOf = (value) => value?._id?.toString?.() || value?.toString?.() || null;

export async function serializeUser(user, options = {}) {
  const { includePrivate = false } = options;
  const profile = user.profile || null;
  const institution = profile?.institution || null;
  const links = profile
    ? await PortfolioLink.find({ user: user._id }).sort({ position: 1, createdAt: 1 }).lean()
    : [];

  const body = {
    id: user.id || idOf(user._id),
    name: user.name,
    handle: profile?.handle || null,
    avatar_url: profile?.avatarUrl || null,
    cover_url: profile?.coverUrl || null,
    headline: profile?.headline || null,
    bio: profile?.bio || null,
    primary_domain: profile?.primaryDomain || null,
    specialization: profile?.specialization || null,
    location: profile?.location || null,
    institution: institution?._id
      ? { id: idOf(institution._id), name: institution.name }
      : null,
    campus: institution?.name || "",
    skills: profile?.skills || [],
    interests: profile?.interests || [],
    availability: profile?.availability || "Open to collab",
    avatarColor: profile?.avatarColor || "#00D1FF",
    joinedAt: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
    links: {
      website: profile?.website || null,
      github_url: profile?.githubUrl || null,
      linkedin_url: profile?.linkedinUrl || null,
      twitter_url: profile?.twitterUrl || null,
      instagram_url: profile?.instagramUrl || null,
      portfolio_website: profile?.portfolioWebsite || null,
      resume_url: profile?.resumeUrl || null,
      portfolio_pdf_url: profile?.portfolioPdfUrl || null,
    },
    portfolio_links: links.map((link) => ({
      id: idOf(link._id),
      key: link.key,
      label: link.label,
      url: link.url,
      category: link.category,
    })),
    stats: {
      xp: profile?.xp || 0,
      level: profile?.level || 1,
      streak_days: profile?.streakDays || 0,
    },
    verification: {
      email_verified: Boolean(profile?.emailVerifiedAt),
      institution_verified: Boolean(profile?.institutionVerified),
      trust_score: profile?.trustScore || 0,
    },
  };

  if (includePrivate) {
    body.email = user.email;
    body.role = user.role;
    body.role_variant = user.roleVariant;
    body.founder = user.founder;
    body.disabled_at = user.disabledAt || null;
    body.created_at = user.createdAt;
    body.updated_at = user.updatedAt;
  }

  return body;
}

export function serializeProject(project) {
  return {
    id: idOf(project._id),
    created_by: idOf(project.createdBy?._id || project.createdBy),
    institution_id: idOf(project.institution?._id || project.institution),
    title: project.title,
    summary: project.summary,
    description: project.description,
    domain: project.domain,
    tags: project.tags || [],
    status: project.status,
    capacity: project.capacity,
    starts_on: project.startsOn,
    ends_on: project.endsOn,
    cover_url: project.coverUrl,
    visibility: project.visibility,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

export function serializeApplication(application) {
  return {
    id: idOf(application._id),
    project_id: idOf(application.project?._id || application.project),
    user_id: idOf(application.user?._id || application.user),
    message: application.message,
    status: application.status,
    reviewed_by: idOf(application.reviewedBy),
    reviewed_at: application.reviewedAt,
    created_at: application.createdAt,
    updated_at: application.updatedAt,
  };
}

export function serializeNotification(notification) {
  return {
    id: idOf(notification._id),
    user_id: idOf(notification.user),
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    dedupe_key: notification.dedupeKey,
    read: Boolean(notification.readAt),
    read_at: notification.readAt,
    created_at: notification.createdAt,
  };
}

export function serializeInstitution(institution) {
  return {
    id: idOf(institution._id),
    name: institution.name,
    slug: institution.slug,
    city: institution.city,
    state: institution.state,
    country: institution.country,
    domain: institution.domain,
    verified: institution.verified,
    logo_url: institution.logoUrl,
    mou_status: institution.mouStatus,
    created_at: institution.createdAt,
  };
}
