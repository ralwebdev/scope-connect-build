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
    achievements: profile?.achievements || ["early_adopter"],
    opportunitiesVerified: profile?.opportunitiesVerified || false,
    opportunitiesVerificationStatus: profile?.opportunitiesVerificationStatus || "none",
    opportunities_verified: profile?.opportunitiesVerified || false,
    opportunities_verification_status: profile?.opportunitiesVerificationStatus || "none",
    verification: {
      email_verified: Boolean(profile?.emailVerifiedAt),
      institution_verified: Boolean(profile?.institutionVerified),
      trust_score: profile?.trustScore || 0,
      opportunities_verified: profile?.opportunitiesVerified || false,
      opportunities_verification_status: profile?.opportunitiesVerificationStatus || "none",
    },
  };

  if (includePrivate) {
    body.email = user.email;
    body.role = user.role;
    body.role_variant = user.roleVariant;
    body.founder = user.founder;
    body.disabled_at = user.disabledAt || null;
    body.student_status = user.studentStatus;
    body.salutation = user.salutation || null;
    body.firstName = user.firstName || null;
    body.middleName = user.middleName || null;
    body.lastName = user.lastName || null;
    body.phone = user.phone || null;
    body.department_id = idOf(user.department);
    body.department_name = user.department?.name || null;
    body.created_at = user.createdAt;
    body.updated_at = user.updatedAt;
  }

  return body;
}

export function serializeProject(project, currentUserId = null) {
  const votedBy = project.votedBy || [];
  const votesCount = project.votes !== undefined ? project.votes : (votedBy.length || 0);
  const userVoted = currentUserId ? votedBy.some(id => id.toString() === currentUserId.toString()) : false;
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
    teams_allowed: project.teamsAllowed ?? 0,
    team_members_limit: project.teamMembersLimit ?? 1,
    starts_on: project.startsOn,
    ends_on: project.endsOn,
    cover_url: project.coverUrl,
    visibility: project.visibility,
    votes: votesCount,
    user_voted: userVoted,
    meta: project.meta ? Object.fromEntries(project.meta) : {},
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

export function serializeApplication(application) {
  const user = application.user;
  const submission = application.submission || null;
  return {
    id: idOf(application._id),
    project_id: idOf(application.project?._id || application.project),
    user_id: idOf(user?._id || user),
    user_name: user?.name || null,
    user_email: user?.email || null,
    user_institution: user?.institution?.name || null,
    message: application.message,
    status: application.status,
    submission_review_status: application.submissionReviewStatus || "not_submitted",
    submission: submission ? {
      live_url: submission.liveUrl || null,
      github_url: submission.githubUrl || null,
      screenshot_file_id: idOf(submission.screenshotFileId),
      screenshot_url: submission.screenshotUrl || null,
      notes: submission.notes || null,
      submitted_at: submission.submittedAt || null,
      reviewed_by: idOf(submission.reviewedBy),
      reviewed_at: submission.reviewedAt || null,
      admin_comment: submission.adminComment || null,
    } : null,
    reviewed_by: idOf(application.reviewedBy),
    reviewed_at: application.reviewedAt,
    created_at: application.createdAt,
    updated_at: application.updatedAt,
  };
}

export function serializeOpportunityApplication(application) {
  const user = application.user;
  const opportunity = application.opportunity;
  return {
    id: idOf(application._id),
    opportunity_id: idOf(opportunity?._id || opportunity),
    opportunity_title: opportunity?.title || null,
    user_id: idOf(user?._id || user),
    user_name: user?.name || null,
    user_email: user?.email || null,
    user_institution: user?.institution?.name || null,
    user_portfolio_links: user?.profile?.portfolioLinks || null,
    profile_type: application.profileType,
    status: application.status,
    fit_note: application.fitNote || "",
    portfolio_url: application.portfolioUrl || null,
    github_url: application.githubUrl || null,
    dribbble_url: application.dribbbleUrl || null,
    other_url: application.otherUrl || null,
    resume_file_id: idOf(application.resumeFileId),
    resume_url: application.resumeUrl || null,
    admin_comment: application.adminComment || "",
    reviewed_by: idOf(application.reviewedBy),
    reviewed_at: application.reviewedAt || null,
    created_at: application.createdAt,
    updated_at: application.updatedAt,
  };
}

export function serializePortfolioItem(item, userId) {
  return {
    id: idOf(item._id),
    user_id: userId || idOf(item.user?._id || item.user),
    type: item.type,
    title: item.title,
    description: item.description,
    skills: item.skills || [],
    link: item.link || "",
    cover: item.cover,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
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

export function serializeCommunication(comm) {
  return {
    id: idOf(comm._id),
    title: comm.title,
    body: comm.body,
    channel: comm.channel || "broadcast",
    sender_id: idOf(comm.sender?._id || comm.sender),
    sender_name: comm.sender?.name || null,
    institution_id: idOf(comm.institution?._id || comm.institution),
    delivered_count: comm.deliveredCount || 0,
    created_at: comm.createdAt,
    updated_at: comm.updatedAt,
  };
}

export function serializeInstitution(institution) {
  return {
    id: idOf(institution._id),
    name: institution.name,
    slug: institution.slug,
    type: institution.type,
    board: institution.board,
    city: institution.city,
    state: institution.state,
    country: institution.country,
    domain: institution.domain,
    verified: institution.verified,
    logo_url: institution.logoUrl,
    logo_text: institution.logoText || "",
    description: institution.description || "",
    top_skills: institution.topSkills || [],
    departments: institution.departments || [],
    mou_status: institution.mouStatus,
    contact_person: institution.contactPerson,
    designation: institution.designation,
    phone: institution.phone,
    email: institution.email,
    owner_id: idOf(institution.owner?._id || institution.owner),
    priority: institution.priority,
    potential_value: institution.potentialValue,
    pipeline_stage: institution.pipelineStage,
    notes: institution.notes,
    documents: (institution.documents || []).map((doc) => ({
      kind: doc.kind,
      file_id: doc.fileId,
      file_name: doc.fileName,
      file_url: doc.fileUrl,
      sent_at: doc.sentAt,
    })),
    created_at: institution.createdAt,
    updated_at: institution.updatedAt,
  };
}

export function serializeCrmVisit(visit) {
  return {
    id: idOf(visit._id),
    institution_id: idOf(visit.institution?._id || visit.institution),
    owner_id: idOf(visit.owner?._id || visit.owner),
    date: visit.date,
    time: visit.time,
    status: visit.status,
    notes: visit.notes,
    created_at: visit.createdAt,
    updated_at: visit.updatedAt,
  };
}

export function serializeLaunchChecklist(checklist) {
  return {
    institution_id: idOf(checklist.institution?._id || checklist.institution),
    faculty_assigned: Boolean(checklist.facultyAssigned),
    leader_shortlisted: Boolean(checklist.leaderShortlisted),
    launch_scheduled: Boolean(checklist.launchScheduled),
    registrations_started: Boolean(checklist.registrationsStarted),
    page_live: Boolean(checklist.pageLive),
    challenge_activated: Boolean(checklist.challengeActivated),
  };
}
