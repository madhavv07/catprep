export type LinkCategory = 'drive' | 'youtube' | 'reading' | 'web';

export interface ParsedLink {
  url: string;
  title: string;
  category: LinkCategory;
  domain: string;
  badgeLabel: string;
  colorClasses: {
    badge: string;
    card: string;
    hover: string;
  };
}

// Regex to capture full URLs safely from markdown or plain text
const URL_REGEX = /(https?:\/\/[^\s<>"'{}|\\^`[\]]+)/gi;

export const extractUrls = (text?: string): string[] => {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  
  // Clean trailing punctuation like commas, periods, parentheses, brackets
  return Array.from(
    new Set(
      matches.map((url) => {
        let cleaned = url;
        while (/[.,;:!?)\]]$/.test(cleaned)) {
          cleaned = cleaned.slice(0, -1);
        }
        return cleaned;
      })
    )
  );
};

export const classifyUrl = (rawUrl: string): ParsedLink => {
  let domain = '';
  try {
    const parsed = new URL(rawUrl);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    domain = rawUrl.split('/')[2] || 'link';
  }

  const lowerUrl = rawUrl.toLowerCase();
  const lowerDomain = domain.toLowerCase();

  // 1. Google Drive & Docs
  if (
    lowerDomain.includes('drive.google.com') ||
    lowerDomain.includes('docs.google.com') ||
    lowerDomain.includes('sheets.google.com') ||
    lowerDomain.includes('slides.google.com')
  ) {
    let title = 'Google Drive Document';
    if (lowerUrl.includes('/spreadsheets/')) title = 'Google Sheets Practice Set';
    else if (lowerUrl.includes('/document/')) title = 'Google Docs Reading Material';
    else if (lowerUrl.includes('/presentation/')) title = 'Google Slides Lecture Presentation';
    else if (lowerUrl.includes('/folders/')) title = 'Google Drive Folder Resource';
    else title = 'Google Drive File Resource';

    return {
      url: rawUrl,
      title,
      category: 'drive',
      domain: 'drive.google.com',
      badgeLabel: 'Google Drive',
      colorClasses: {
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        card: 'border-blue-900/50 bg-blue-950/20 hover:border-blue-500/60',
        hover: 'text-blue-400',
      },
    };
  }

  // 2. YouTube
  if (
    lowerDomain.includes('youtube.com') ||
    lowerDomain.includes('youtu.be')
  ) {
    let title = 'YouTube Lecture / Video Guide';
    if (lowerUrl.includes('playlist')) title = 'YouTube Lecture Playlist';
    else if (lowerUrl.includes('shorts')) title = 'YouTube Concept Short';

    return {
      url: rawUrl,
      title,
      category: 'youtube',
      domain: 'youtube.com',
      badgeLabel: 'Video Lecture',
      colorClasses: {
        badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        card: 'border-rose-900/50 bg-rose-950/20 hover:border-rose-500/60',
        hover: 'text-rose-400',
      },
    };
  }

  // 3. Editorial & Reading Material (Aeon, Project Syndicate, Guardian, etc.)
  const editorialDomains = [
    'aeon.co',
    'project-syndicate.org',
    'theguardian.com',
    'newyorker.com',
    'thehindu.com',
    'indianexpress.com',
    'economist.com',
    'smithsonianmag.com',
    'theatlantic.com',
    'aldaily.com',
  ];

  if (editorialDomains.some((d) => lowerDomain.includes(d))) {
    let name = 'RC Reading Editorial';
    if (lowerDomain.includes('aeon.co')) name = 'Aeon Philosophical Essay';
    else if (lowerDomain.includes('project-syndicate')) name = 'Project Syndicate Editorial';
    else if (lowerDomain.includes('theguardian')) name = 'The Guardian Long Read';
    else if (lowerDomain.includes('newyorker')) name = 'The New Yorker Feature';
    else if (lowerDomain.includes('economist')) name = 'The Economist Analysis';

    return {
      url: rawUrl,
      title: name,
      category: 'reading',
      domain,
      badgeLabel: 'Reading Passage',
      colorClasses: {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        card: 'border-emerald-900/50 bg-emerald-950/20 hover:border-emerald-500/60',
        hover: 'text-emerald-400',
      },
    };
  }

  // 4. Default / Generic Web Resource
  return {
    url: rawUrl,
    title: `Web Resource (${domain})`,
    category: 'web',
    domain,
    badgeLabel: 'Online Reference',
    colorClasses: {
      badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      card: 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
      hover: 'text-zinc-200',
    },
  };
};

export const parseAllTaskLinks = (
  text?: string,
  attachmentUrl?: string
): ParsedLink[] => {
  const urls = extractUrls(text);
  if (attachmentUrl && attachmentUrl.startsWith('http') && !urls.includes(attachmentUrl)) {
    urls.push(attachmentUrl);
  }

  return urls.map(classifyUrl);
};
