import fs from 'fs';
import path from 'path';

// Parse all markdown files directly from book/
function parseBook() {
  const dir = "book";
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort();
  const chapters = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    const lines = content.split("\n");
    let chapterNum = null;
    let chapterTitle = "";
    let introLines = [];
    const items = [];
    let currentItem = null;
    let readingIntro = false;
    let currentField = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const chMatch = line.match(/^#\s+(\d+)\.\s+(.*)/);
      if (chMatch) {
        chapterNum = parseInt(chMatch[1], 10);
        chapterTitle = chMatch[2].trim();
        readingIntro = true;
        continue;
      }
      
      const itemMatch = line.match(/^###\s+(\d+)\.\s+(.*)/);
      if (itemMatch) {
        readingIntro = false;
        if (currentItem) items.push(currentItem);
        currentItem = {
          n: parseInt(itemMatch[1], 10),
          title: itemMatch[2].trim(),
          tags: {},
          cost: "",
          human: "",
          gain: "",
          grade: "",
          src: "",
          note: ""
        };
        currentField = null;
        continue;
      }
      
      if (readingIntro) {
        if (line.trim() && !line.startsWith("[←") && !line.startsWith("<!--")) {
          introLines.push(line.trim());
        }
        continue;
      }
      
      if (!currentItem) continue;
      
      const tagMatch = line.match(/<!--\s*成本标签:\s*(.*?)\s*-->/);
      if (tagMatch) {
        const parts = tagMatch[1].split(/\s+/);
        parts.forEach(p => {
          const [k, v] = p.split("=");
          if (k && v) currentItem.tags[k] = v;
        });
        continue;
      }
      
      if (line.startsWith("- Chi phí:") || line.startsWith("- 成本：")) {
        currentItem.cost = line.replace(/^- (?:Chi phí:|成本：)\s*/, "").trim();
        currentField = 'cost';
      } else if (line.startsWith("- Nói một cách bình dân:") || line.startsWith("- 说人话：")) {
        currentItem.human = line.replace(/^- (?:Nói một cách bình dân:|说人话：)\s*/, "").trim();
        currentField = 'human';
      } else if (line.startsWith("- Lợi ích:") || line.startsWith("- 收益：")) {
        currentItem.gain = line.replace(/^- (?:Lợi ích:|收益：)\s*/, "").trim();
        currentField = 'gain';
      } else if (line.startsWith("- Cấp độ bằng chứng:") || line.startsWith("- 证据等级：")) {
        currentItem.grade = line.replace(/^- (?:Cấp độ bằng chứng:|证据等级：)\s*/, "").trim();
        currentField = 'grade';
      } else if (line.startsWith("- Nguồn:") || line.startsWith("- 来源：")) {
        currentItem.src = line.replace(/^- (?:Nguồn:|来源：)\s*/, "").trim();
        currentField = 'src';
      } else if (line.startsWith("- Ghi chú:") || line.startsWith("- 备注：")) {
        currentItem.note = line.replace(/^- (?:Ghi chú:|备注：)\s*/, "").trim();
        currentField = 'note';
      } else if (currentField && line.trim()) {
        currentItem[currentField] += " " + line.trim();
      }
    }
    if (currentItem) items.push(currentItem);
    
    chapters.push({
      num: chapterNum,
      title: chapterTitle,
      file: file,
      intro: introLines.join(" "),
      items: items
    });
  }
  return chapters;
}

const chapters = parseBook();
fs.writeFileSync('book_data.json', JSON.stringify(chapters, null, 2), 'utf8');

// Compute stats
const totalChapters = chapters.length;
const totalItems = chapters.reduce((acc, c) => acc + c.items.length, 0);
const gradeStats = { A: 0, B: 0, C: 0 };
chapters.forEach(ch => {
  ch.items.forEach(it => {
    const g = (it.grade || '').trim().toUpperCase();
    if (g.startsWith('A')) gradeStats.A++;
    else if (g.startsWith('B')) gradeStats.B++;
    else if (g.startsWith('C')) gradeStats.C++;
  });
});

console.log(`Parsed ${totalChapters} chapters, ${totalItems} items. Grades:`, gradeStats);

const htmlTemplate = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>Cẩm Nang Sống Tối Ưu Hiệu Suất · Hướng Dẫn Thực Chứng</title>
  <meta name="description" content="Cẩm nang sống tối ưu hiệu suất với 650 lời khuyên thực chứng về tuổi thọ, thời gian, tài chính và tự do cá nhân, chia làm 34 chương rõ ràng và dễ đọc.">
  <meta name="theme-color" content="#2563eb">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%232563eb'/%3E%3Cpath d='M17 33l10 11 20-24' fill='none' stroke='white' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&display=swap" rel="stylesheet">
  <style>
    /* CSS Variables & Themes */
    :root {
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --font-serif: 'Merriweather', Georgia, serif;
      --font-main: var(--font-sans);
      
      --base-font-size: 16px;
      --line-height: 1.75;
      
      /* Light Theme (Default) */
      --bg-page: #f8fafc;
      --bg-surface: #ffffff;
      --bg-sidebar: #ffffff;
      --bg-card: #ffffff;
      --bg-highlight: #f0f7ff;
      --bg-tag: #f1f5f9;
      --bg-muted: #f1f5f9;
      
      --border-color: #e2e8f0;
      --border-subtle: #edf2f7;
      
      --text-main: #0f172a;
      --text-muted: #334155;
      --text-sub: #64748b;
      --text-link: #2563eb;
      
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --accent-light: #eff6ff;
      --accent-border: #bfdbfe;
      
      --badge-a-bg: #dcfce7;
      --badge-a-text: #15803d;
      --badge-a-border: #86efac;
      
      --badge-b-bg: #fef3c7;
      --badge-b-text: #b45309;
      --badge-b-border: #fde68a;
      
      --badge-c-bg: #f1f5f9;
      --badge-c-text: #475569;
      --badge-c-border: #cbd5e1;
      
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
      
      --sidebar-width: 320px;
    }

    [data-theme="sepia"] {
      --bg-page: #fbf7ee;
      --bg-surface: #f4ecd8;
      --bg-sidebar: #f5eedb;
      --bg-card: #fdfaf3;
      --bg-highlight: #f3e8cf;
      --bg-tag: #ebdec2;
      --bg-muted: #ebdec2;
      
      --border-color: #e3d3b6;
      --border-subtle: #ebe0cb;
      
      --text-main: #2b241c;
      --text-muted: #4e4031;
      --text-sub: #786650;
      --text-link: #854d0e;
      
      --accent: #9a3412;
      --accent-hover: #7c2d12;
      --accent-light: #ffedd5;
      --accent-border: #fed7aa;
      
      --badge-a-bg: #dcfce7;
      --badge-a-text: #166534;
      --badge-a-border: #bbf7d0;
      
      --badge-b-bg: #fef3c7;
      --badge-b-text: #92400e;
      --badge-b-border: #fde68a;
      
      --badge-c-bg: #e5d8c1;
      --badge-c-text: #504231;
      --badge-c-border: #d4c2a5;
    }

    [data-theme="dark"] {
      --bg-page: #0b0f19;
      --bg-surface: #151d2f;
      --bg-sidebar: #111827;
      --bg-card: #151d2f;
      --bg-highlight: #172554;
      --bg-tag: #1f293d;
      --bg-muted: #1e293b;
      
      --border-color: #243048;
      --border-subtle: #1e293b;
      
      --text-main: #f8fafc;
      --text-muted: #cbd5e1;
      --text-sub: #94a3b8;
      --text-link: #60a5fa;
      
      --accent: #3b82f6;
      --accent-hover: #60a5fa;
      --accent-light: #1e3a8a;
      --accent-border: #1d4ed8;
      
      --badge-a-bg: #064e3b;
      --badge-a-text: #86efac;
      --badge-a-border: #059669;
      
      --badge-b-bg: #78350f;
      --badge-b-text: #fde68a;
      --badge-b-border: #d97706;
      
      --badge-c-bg: #1e293b;
      --badge-c-text: #cbd5e1;
      --badge-c-border: #475569;
    }

    /* Base Reset */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: var(--font-main);
      font-size: var(--base-font-size);
      line-height: var(--line-height);
      color: var(--text-main);
      background-color: var(--bg-page);
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s ease, color 0.2s ease;
      overflow-x: hidden;
    }

    /* Top Reading Progress Bar */
    #progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      width: 0%;
      z-index: 1000;
      transition: width 0.1s ease;
    }

    /* Main Container */
    .app-container {
      display: flex;
      min-height: 100vh;
      position: relative;
    }

    /* Sidebar Navigation */
    .sidebar {
      width: var(--sidebar-width);
      background-color: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 50;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar-header {
      padding: 1.25rem 1.2rem 1rem 1.2rem;
      border-bottom: 1px solid var(--border-color);
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.2rem;
      letter-spacing: -0.01em;
    }

    .brand-subtitle {
      font-size: 0.8rem;
      color: var(--text-sub);
      font-weight: 500;
    }

    .sidebar-search-box {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input-wrapper svg {
      position: absolute;
      left: 0.75rem;
      width: 16px;
      height: 16px;
      color: var(--text-sub);
      pointer-events: none;
    }

    .sidebar-search-input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.2rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background-color: var(--bg-page);
      color: var(--text-main);
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .sidebar-search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-light);
    }

    .chapter-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem 0.6rem;
      list-style: none;
    }

    .chapter-item {
      margin-bottom: 0.2rem;
    }

    .chapter-link {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.88rem;
      line-height: 1.45;
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .chapter-link:hover {
      background-color: var(--bg-muted);
      color: var(--text-main);
    }

    .chapter-link.active {
      background-color: var(--accent-light);
      color: var(--accent);
      font-weight: 700;
    }

    .chapter-badge-num {
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-sub);
      background: var(--bg-muted);
      padding: 0.15rem 0.45rem;
      border-radius: 5px;
      margin-top: 0.05rem;
      font-feature-settings: "tnum";
    }

    .chapter-link.active .chapter-badge-num {
      background-color: var(--accent);
      color: #ffffff;
    }

    .chapter-title-text {
      flex: 1;
    }

    .chapter-count {
      font-size: 0.75rem;
      color: var(--text-sub);
      margin-left: auto;
      flex-shrink: 0;
      padding-top: 0.1rem;
    }

    /* Main Content Wrapper */
    .main-wrapper {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100vh;
    }

    /* Top Sticky Bar */
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 40;
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      backdrop-filter: blur(10px);
      box-shadow: var(--shadow-sm);
    }

    .top-bar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 0;
    }

    .menu-toggle-btn {
      display: none;
      background: none;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.5rem;
      color: var(--text-main);
      cursor: pointer;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease;
    }

    .menu-toggle-btn:hover {
      background-color: var(--bg-muted);
    }

    .current-chapter-indicator {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 380px;
    }

    .top-bar-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .ctrl-group {
      display: inline-flex;
      align-items: center;
      background-color: var(--bg-muted);
      border-radius: 8px;
      padding: 2px;
      border: 1px solid var(--border-color);
    }

    .ctrl-btn {
      background: transparent;
      border: none;
      padding: 0.35rem 0.65rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      transition: all 0.15s ease;
    }

    .ctrl-btn:hover {
      color: var(--text-main);
    }

    .ctrl-btn.active {
      background-color: var(--bg-card);
      color: var(--accent);
      box-shadow: var(--shadow-sm);
    }

    /* Content Area */
    .content-container {
      flex: 1;
      max-width: 880px;
      width: 100%;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 6rem 1.5rem;
    }

    /* Filter / Search Card */
    .filter-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.25rem;
      margin-bottom: 2.5rem;
      box-shadow: var(--shadow-sm);
    }

    .filter-card-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .search-input-big {
      flex: 1;
      min-width: 260px;
      position: relative;
    }

    .search-input-big input {
      width: 100%;
      padding: 0.65rem 1rem 0.65rem 2.4rem;
      border-radius: 9px;
      border: 1px solid var(--border-color);
      background-color: var(--bg-page);
      color: var(--text-main);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .search-input-big input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-light);
    }

    .search-input-big svg {
      position: absolute;
      left: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      width: 17px;
      height: 17px;
      color: var(--text-sub);
    }

    .grade-btn-group {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .grade-filter-btn {
      background: var(--bg-page);
      border: 1px solid var(--border-color);
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .grade-filter-btn:hover {
      border-color: var(--text-sub);
      color: var(--text-main);
    }

    .grade-filter-btn.active {
      background-color: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
    }

    /* Chapter Header Presentation */
    .chapter-header-box {
      margin-bottom: 2.5rem;
      padding-bottom: 1.75rem;
      border-bottom: 1px solid var(--border-color);
    }

    .chapter-badge-tag {
      display: inline-block;
      font-size: 0.82rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--accent);
      background-color: var(--accent-light);
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      margin-bottom: 0.75rem;
      border: 1px solid var(--accent-border);
    }

    .chapter-main-title {
      font-size: 2.15rem;
      font-weight: 800;
      line-height: 1.25;
      color: var(--text-main);
      margin-bottom: 1.15rem;
      letter-spacing: -0.025em;
    }

    .chapter-intro-box {
      font-size: 1.05rem;
      line-height: 1.8;
      color: var(--text-muted);
      background-color: var(--bg-surface);
      border-left: 4px solid var(--accent);
      padding: 1.15rem 1.35rem;
      border-radius: 0 10px 10px 0;
      box-shadow: var(--shadow-sm);
      border-top: 1px solid var(--border-subtle);
      border-right: 1px solid var(--border-subtle);
      border-bottom: 1px solid var(--border-subtle);
    }

    /* Advice Card (Lời khuyên) */
    .advice-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.75rem;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-sm);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      scroll-margin-top: 5rem;
    }

    .advice-card:hover {
      border-color: #cbd5e1;
      box-shadow: var(--shadow-md);
    }

    [data-theme="dark"] .advice-card:hover {
      border-color: #3b82f6;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.15rem;
    }

    .card-title-group {
      display: flex;
      align-items: baseline;
      gap: 0.65rem;
      flex: 1;
    }

    .card-index {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--accent);
      font-feature-settings: "tnum";
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.35;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .evidence-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }

    .badge-grade-A {
      background-color: var(--badge-a-bg);
      color: var(--badge-a-text);
      border: 1px solid var(--badge-a-border);
    }

    .badge-grade-B {
      background-color: var(--badge-b-bg);
      color: var(--badge-b-text);
      border: 1px solid var(--badge-b-border);
    }

    .badge-grade-C {
      background-color: var(--badge-c-bg);
      color: var(--badge-c-text);
      border: 1px solid var(--badge-c-border);
    }

    .copy-link-btn {
      background: none;
      border: 1px solid transparent;
      color: var(--text-sub);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .copy-link-btn:hover {
      color: var(--accent);
      background-color: var(--bg-muted);
      border-color: var(--border-color);
    }

    /* Key Takeaway / Nói một cách bình dân */
    .takeaway-box {
      background-color: var(--bg-highlight);
      border-radius: 10px;
      padding: 1.15rem 1.25rem;
      margin-bottom: 1.35rem;
      border-left: 4px solid var(--accent);
    }

    .takeaway-label {
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.45rem;
    }

    .takeaway-text {
      font-size: 1.02rem;
      font-weight: 500;
      line-height: 1.65;
      color: var(--text-main);
    }

    /* Detailed Fields */
    .details-list {
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
      font-size: 0.96rem;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      line-height: 1.68;
    }

    .detail-icon {
      font-size: 1.05rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
      user-select: none;
    }

    .detail-text strong {
      color: var(--text-main);
      font-weight: 700;
      margin-right: 0.4rem;
    }

    .detail-text {
      color: var(--text-muted);
      flex: 1;
      word-break: break-word;
    }

    .detail-text a {
      color: var(--text-link);
      text-decoration: underline;
      text-underline-offset: 3px;
      word-break: break-all;
    }

    .detail-text a:hover {
      color: var(--accent-hover);
    }

    /* Tags at bottom of card */
    .card-tags-bar {
      margin-top: 1.35rem;
      padding-top: 0.95rem;
      border-top: 1px dashed var(--border-color);
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .meta-tag {
      font-size: 0.76rem;
      color: var(--text-sub);
      background-color: var(--bg-tag);
      padding: 0.22rem 0.55rem;
      border-radius: 5px;
      font-weight: 600;
    }

    /* Chapter Navigation Footer */
    .chapter-nav-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 3.5rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color);
    }

    .nav-chapter-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1.35rem;
      border-radius: 9px;
      border: 1px solid var(--border-color);
      background-color: var(--bg-surface);
      color: var(--text-main);
      text-decoration: none;
      font-weight: 700;
      font-size: 0.95rem;
      box-shadow: var(--shadow-sm);
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .nav-chapter-btn:hover:not(:disabled) {
      background-color: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
      box-shadow: var(--shadow-md);
    }

    .nav-chapter-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    /* Search Notice */
    .search-summary-notice {
      background-color: var(--bg-highlight);
      border: 1px solid var(--accent-border);
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.75rem;
      font-size: 0.95rem;
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .search-summary-notice button {
      background: none;
      border: none;
      color: var(--accent);
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }

    .highlight-match {
      background-color: #fef08a;
      color: #713f12;
      padding: 0 3px;
      border-radius: 3px;
      font-weight: 600;
    }

    [data-theme="dark"] .highlight-match {
      background-color: #854d0e;
      color: #fef08a;
    }

    /* Toast */
    #toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background-color: #0f172a;
      color: #ffffff;
      padding: 0.8rem 1.35rem;
      border-radius: 9px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      transform: translateY(150%);
      opacity: 0;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    #toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* Back to top button */
    .back-to-top {
      position: fixed;
      bottom: 2rem;
      left: calc(var(--sidebar-width) + 2rem);
      background-color: var(--bg-surface);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-md);
      cursor: pointer;
      z-index: 30;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
    }

    .back-to-top.show {
      opacity: 1;
      pointer-events: auto;
    }

    .back-to-top:hover {
      background-color: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
    }

    /* Overlay for mobile drawer */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 45;
      backdrop-filter: blur(3px);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .sidebar-overlay.open {
        display: block;
      }
      .main-wrapper {
        margin-left: 0;
      }
      .menu-toggle-btn {
        display: flex;
      }
      .back-to-top {
        left: 2rem;
      }
    }

    @media (max-width: 768px) {
      .top-bar {
        padding: 0.5rem 0.75rem;
        gap: 0.5rem;
      }
      .current-chapter-indicator {
        display: none;
      }
      .top-bar-controls {
        overflow-x: auto;
        max-width: calc(100vw - 65px);
        padding-bottom: 2px;
      }
      .top-bar-controls::-webkit-scrollbar {
        display: none;
      }
      .ctrl-btn {
        padding: 0.3rem 0.5rem;
        font-size: 0.75rem;
      }
    }

    @media (max-width: 640px) {
      .content-container {
        padding: 1.25rem 0.85rem 4rem 0.85rem;
      }
      .chapter-main-title {
        font-size: 1.6rem;
      }
      .advice-card {
        padding: 1.15rem;
        border-radius: 10px;
      }
      .card-title {
        font-size: 1.12rem;
      }
      .takeaway-box {
        padding: 0.85rem 1rem;
      }
      .chapter-nav-footer {
        flex-direction: column;
      }
      .nav-chapter-btn {
        width: 100%;
        justify-content: center;
      }
    }

    /* Print Styles */
    @media print {
      .sidebar, .top-bar, .filter-card, .chapter-nav-footer, .copy-link-btn, .back-to-top, #progress-bar {
        display: none !important;
      }
      .main-wrapper {
        margin-left: 0 !important;
      }
      .content-container {
        max-width: 100% !important;
        padding: 0 !important;
      }
      .advice-card {
        page-break-inside: avoid;
        box-shadow: none !important;
        border: 1px solid #ccc !important;
        margin-bottom: 1.5rem !important;
      }
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
    }
  </style>
</head>
<body data-theme="light">
  <div id="progress-bar"></div>
  <div class="sidebar-overlay" id="sidebar-overlay"></div>

  <div class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="brand-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          Sống Tối Ưu
        </div>
        <div class="brand-subtitle">34 Chương · 650 Lời khuyên thực chứng</div>
      </div>
      
      <div class="sidebar-search-box">
        <div class="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="sidebar-filter-input" class="sidebar-search-input" placeholder="Lọc nhanh danh sách chương...">
        </div>
      </div>

      <ul class="chapter-list" id="chapter-list-ui">
        <!-- Rendered by JS -->
      </ul>
    </aside>

    <!-- Main Reader Wrapper -->
    <main class="main-wrapper">
      <!-- Top Sticky Bar -->
      <header class="top-bar">
        <div class="top-bar-left">
          <button class="menu-toggle-btn" id="menu-toggle-btn" aria-label="Mục lục">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div class="current-chapter-indicator" id="current-chapter-indicator">
            Chương 1: Đừng chết sớm
          </div>
        </div>

        <div class="top-bar-controls">
          <!-- View mode -->
          <div class="ctrl-group">
            <button class="ctrl-btn active" id="btn-mode-chapter" title="Đọc từng chương">Chương</button>
            <button class="ctrl-btn" id="btn-mode-all" title="Xem liên tục toàn bộ">Tất cả</button>
          </div>

          <!-- Font switcher -->
          <div class="ctrl-group">
            <button class="ctrl-btn active" id="btn-font-sans" title="Font chữ Hiện đại">Sans</button>
            <button class="ctrl-btn" id="btn-font-serif" title="Font chữ Trang sách">Serif</button>
          </div>

          <!-- Font Size -->
          <div class="ctrl-group">
            <button class="ctrl-btn" id="btn-font-dec" title="Giảm cỡ chữ">A-</button>
            <button class="ctrl-btn" id="btn-font-inc" title="Tăng cỡ chữ">A+</button>
          </div>

          <!-- Theme switcher -->
          <div class="ctrl-group">
            <button class="ctrl-btn active" id="theme-light-btn" title="Giao diện Sáng">☀️</button>
            <button class="ctrl-btn" id="theme-sepia-btn" title="Giao diện Giấy ấm">📖</button>
            <button class="ctrl-btn" id="theme-dark-btn" title="Giao diện Ban đêm">🌙</button>
          </div>
        </div>
      </header>

      <!-- Main Reader Body -->
      <div class="content-container">
        <!-- Search & Filter Card -->
        <div class="filter-card">
          <div class="filter-card-row">
            <div class="search-input-big">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="main-search-input" placeholder="Tìm kiếm lời khuyên trong 34 chương (dây an toàn, bảo hiểm, huyết áp, thuế...)">
            </div>
            
            <div class="grade-btn-group">
              <span style="font-size:0.8rem; color:var(--text-sub); margin-right:0.2rem; font-weight:600;">Bằng chứng:</span>
              <button class="grade-filter-btn active" data-grade="all">Tất cả (${totalItems})</button>
              <button class="grade-filter-btn" data-grade="A">Cấp A (${gradeStats.A})</button>
              <button class="grade-filter-btn" data-grade="B">Cấp B (${gradeStats.B})</button>
              <button class="grade-filter-btn" data-grade="C">Cấp C (${gradeStats.C})</button>
            </div>
          </div>
        </div>

        <!-- Search Notice (Hidden by default) -->
        <div id="search-summary-notice" class="search-summary-notice" style="display: none;">
          <span id="search-summary-text"></span>
          <button id="clear-search-btn">Xóa tìm kiếm</button>
        </div>

        <!-- Chapter Content Render Container -->
        <div id="content-render-area">
          <!-- Rendered by JS -->
        </div>

        <!-- Navigation Footer -->
        <div class="chapter-nav-footer" id="chapter-nav-footer">
          <button class="nav-chapter-btn" id="prev-chapter-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span id="prev-btn-text">Chương trước</span>
          </button>
          
          <button class="nav-chapter-btn" id="next-chapter-btn">
            <span id="next-btn-text">Chương tiếp theo</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </main>
  </div>

  <!-- Back to top button -->
  <button class="back-to-top" id="back-to-top-btn" title="Lên đầu trang" aria-label="Lên đầu trang">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </button>

  <!-- Toast Notice -->
  <div id="toast">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span id="toast-msg">Đã sao chép liên kết</span>
  </div>

  <!-- Embedded Book Data -->
  <script>
    const BOOK_DATA = ${JSON.stringify(chapters)};
  </script>

  <!-- Reader Application Logic -->
  <script>
    (function() {
      // State
      let currentChapterIndex = 0; // 0 to 33
      let viewMode = 'chapter'; // 'chapter' or 'all'
      let activeGradeFilter = 'all'; // 'all', 'A', 'B', 'C'
      let searchQuery = '';
      let fontSizePx = 16;

      // Tag translation mapping
      const TAG_MAP = {
        '钱': {
          '0': 'Tiền: Miễn phí',
          '少': 'Tiền: Rất ít',
          '多': 'Tiền: Đáng kể'
        },
        '时间': {
          '少': 'Thời gian: Rất ít',
          '中': 'Thời gian: Vừa phải',
          '多': 'Thời gian: Nhiều'
        },
        '毅力': {
          '否': 'Nỗ lực: Dễ làm',
          '些': 'Nỗ lực: Chút ít',
          '是': 'Nỗ lực: Kiên trì'
        },
        '收益': {
          '大': 'Lợi ích: Rất lớn',
          '中': 'Lợi ích: Đáng kể',
          '小': 'Lợi ích: Vừa phải'
        },
        '口径': {
          '死亡率': 'Mục tiêu: Giảm tử vong',
          '金钱': 'Mục tiêu: Tiết kiệm tiền',
          '时间': 'Mục tiêu: Tiết kiệm thời gian',
          '自由': 'Mục tiêu: Tự do & Pháp lý'
        }
      };

      // DOM Elements
      const chapterListUi = document.getElementById('chapter-list-ui');
      const contentRenderArea = document.getElementById('content-render-area');
      const currentChapterIndicator = document.getElementById('current-chapter-indicator');
      const prevChapterBtn = document.getElementById('prev-chapter-btn');
      const nextChapterBtn = document.getElementById('next-chapter-btn');
      const prevBtnText = document.getElementById('prev-btn-text');
      const nextBtnText = document.getElementById('next-btn-text');
      const chapterNavFooter = document.getElementById('chapter-nav-footer');
      
      const sidebar = document.getElementById('sidebar');
      const sidebarOverlay = document.getElementById('sidebar-overlay');
      const menuToggleBtn = document.getElementById('menu-toggle-btn');
      const sidebarFilterInput = document.getElementById('sidebar-filter-input');
      const mainSearchInput = document.getElementById('main-search-input');
      const searchSummaryNotice = document.getElementById('search-summary-notice');
      const searchSummaryText = document.getElementById('search-summary-text');
      const clearSearchBtn = document.getElementById('clear-search-btn');
      
      const btnModeChapter = document.getElementById('btn-mode-chapter');
      const btnModeAll = document.getElementById('btn-mode-all');
      const btnFontSans = document.getElementById('btn-font-sans');
      const btnFontSerif = document.getElementById('btn-font-serif');
      const btnFontDec = document.getElementById('btn-font-dec');
      const btnFontInc = document.getElementById('btn-font-inc');
      
      const themeLightBtn = document.getElementById('theme-light-btn');
      const themeSepiaBtn = document.getElementById('theme-sepia-btn');
      const themeDarkBtn = document.getElementById('theme-dark-btn');
      
      const backToTopBtn = document.getElementById('back-to-top-btn');
      const progressBar = document.getElementById('progress-bar');
      const toastEl = document.getElementById('toast');
      const toastMsg = document.getElementById('toast-msg');

      // Helper: Show toast
      function showToast(msg) {
        toastMsg.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2200);
      }

      // Helper: Format URLs to clickable links
      function linkify(text) {
        if (!text) return '';
        return text.replace(/<((?:https?|ftp):\\/\\/[^\\s>]+)>/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
                   .replace(/(^|[^">])((?:https?|ftp):\\/\\/[^\\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
      }

      // Helper: Highlight search term
      function highlightText(text, query) {
        if (!query || !text) return text;
        const escaped = query.replace(/[.*+?^$\\{}()|[\\]\\\\]/g, '\\\\$&');
        const regex = new RegExp('(' + escaped + ')', 'gi');
        return text.replace(regex, '<span class="highlight-match">$1</span>');
      }

      // Initialize Preferences
      function initPreferences() {
        const savedTheme = localStorage.getItem('reader_theme') || 'light';
        setTheme(savedTheme);

        const savedFont = localStorage.getItem('reader_font') || 'sans';
        setFontFamily(savedFont);

        const savedSize = parseInt(localStorage.getItem('reader_size'), 10);
        if (savedSize && savedSize >= 14 && savedSize <= 22) {
          fontSizePx = savedSize;
          document.body.style.setProperty('--base-font-size', fontSizePx + 'px');
        }
      }

      function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('reader_theme', theme);
        [themeLightBtn, themeSepiaBtn, themeDarkBtn].forEach(b => b.classList.remove('active'));
        if (theme === 'light') themeLightBtn.classList.add('active');
        else if (theme === 'sepia') themeSepiaBtn.classList.add('active');
        else if (theme === 'dark') themeDarkBtn.classList.add('active');
      }

      function setFontFamily(font) {
        if (font === 'serif') {
          document.body.style.setProperty('--font-main', 'var(--font-serif)');
          btnFontSerif.classList.add('active');
          btnFontSans.classList.remove('active');
        } else {
          document.body.style.setProperty('--font-main', 'var(--font-sans)');
          btnFontSans.classList.add('active');
          btnFontSerif.classList.remove('active');
        }
        localStorage.setItem('reader_font', font);
      }

      // Render Sidebar Chapter List
      function renderSidebarList() {
        const filterVal = sidebarFilterInput.value.trim().toLowerCase();
        let html = '';

        BOOK_DATA.forEach((ch, idx) => {
          const matchTitle = ch.title.toLowerCase().includes(filterVal);
          const matchNum = ch.num.toString().includes(filterVal);
          if (filterVal && !matchTitle && !matchNum) return;

          const isActive = (viewMode === 'chapter' && idx === currentChapterIndex);
          html += \`
            <li class="chapter-item">
              <a class="chapter-link \${isActive ? 'active' : ''}" data-idx="\${idx}" href="#c\${ch.num}">
                <span class="chapter-badge-num">\${ch.num}</span>
                <span class="chapter-title-text">\${ch.title}</span>
                <span class="chapter-count">\${ch.items.length}</span>
              </a>
            </li>
          \`;
        });

        chapterListUi.innerHTML = html;

        const links = chapterListUi.querySelectorAll('.chapter-link');
        links.forEach(l => {
          l.addEventListener('click', (e) => {
            e.preventDefault();
            const idx = parseInt(l.getAttribute('data-idx'), 10);
            navigateToChapter(idx);
            closeSidebar();
          });
        });
      }

      // Navigation handler
      function navigateToChapter(idx) {
        if (idx < 0 || idx >= BOOK_DATA.length) return;
        currentChapterIndex = idx;
        if (viewMode === 'all') {
          setViewMode('chapter');
        } else {
          renderContent();
          renderSidebarList();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        history.replaceState(null, null, '#c' + BOOK_DATA[idx].num);
      }

      function setViewMode(mode) {
        viewMode = mode;
        if (mode === 'chapter') {
          btnModeChapter.classList.add('active');
          btnModeAll.classList.remove('active');
          chapterNavFooter.style.display = 'flex';
        } else {
          btnModeAll.classList.add('active');
          btnModeChapter.classList.remove('active');
          chapterNavFooter.style.display = 'none';
        }
        renderContent();
        renderSidebarList();
      }

      // Render Advice Card HTML
      function renderAdviceCard(item, chapterNum, query) {
        const anchorId = 'c' + chapterNum + '-i' + item.n;
        const gradeLetter = (item.grade || 'C').trim().charAt(0).toUpperCase();
        const gradeBadgeClass = 'badge-grade-' + (['A','B','C'].includes(gradeLetter) ? gradeLetter : 'C');
        const gradeTitle = gradeLetter === 'A' ? 'Cấp A: Bằng chứng vững chắc (Thử nghiệm RCT / Phân tích gộp)' :
                           gradeLetter === 'B' ? 'Cấp B: Có nghiên cứu đoàn hệ / đối chứng thực tế' :
                           'Cấp C: Kinh nghiệm thực tiễn / Đồng thuận';

        // Highlight fields
        const displayTitle = highlightText(item.title, query);
        const displayHuman = highlightText(item.human, query);
        const displayCost = highlightText(item.cost, query);
        const displayGain = highlightText(item.gain, query);
        const displayNote = highlightText(item.note, query);
        const displaySrc = linkify(highlightText(item.src, query));

        let tagsHtml = '';
        if (item.tags) {
          for (const [k, v] of Object.entries(item.tags)) {
            const mapped = (TAG_MAP[k] && TAG_MAP[k][v]) ? TAG_MAP[k][v] : null;
            if (mapped) {
              tagsHtml += '<span class="meta-tag">' + mapped + '</span>';
            }
          }
        }

        return \`
          <article class="advice-card" id="\${anchorId}">
            <div class="card-header">
              <div class="card-title-group">
                <span class="card-index">#\${item.n}</span>
                <h3 class="card-title">\${displayTitle}</h3>
              </div>
              <div class="card-actions">
                <span class="evidence-badge \${gradeBadgeClass}" title="\${gradeTitle}">Cấp \${gradeLetter}</span>
                <button class="copy-link-btn" title="Sao chép liên kết mục này" onclick="window.copyItemLink('\${anchorId}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </button>
              </div>
            </div>

            \${item.human ? \`
              <div class="takeaway-box">
                <div class="takeaway-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Nói một cách bình dân
                </div>
                <div class="takeaway-text">\${displayHuman}</div>
              </div>
            \` : ''}

            <div class="details-list">
              \${item.cost ? \`
                <div class="detail-row">
                  <span class="detail-icon">💰</span>
                  <div class="detail-text"><strong>Chi phí:</strong>\${displayCost}</div>
                </div>
              \` : ''}

              \${item.gain ? \`
                <div class="detail-row">
                  <span class="detail-icon">📈</span>
                  <div class="detail-text"><strong>Lợi ích:</strong>\${displayGain}</div>
                </div>
              \` : ''}

              \${item.note ? \`
                <div class="detail-row">
                  <span class="detail-icon">💡</span>
                  <div class="detail-text"><strong>Ghi chú:</strong>\${displayNote}</div>
                </div>
              \` : ''}

              \${item.src ? \`
                <div class="detail-row">
                  <span class="detail-icon">📚</span>
                  <div class="detail-text"><strong>Nguồn tài liệu:</strong>\${displaySrc}</div>
                </div>
              \` : ''}
            </div>

            \${tagsHtml ? \`<div class="card-tags-bar">\${tagsHtml}</div>\` : ''}
          </article>
        \`;
      }

      // Global copy link function
      window.copyItemLink = function(anchorId) {
        const url = window.location.origin + window.location.pathname + '#' + anchorId;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => showToast('Đã sao chép liên kết vào bộ nhớ tạm!'));
        } else {
          showToast('Đã lưu địa chỉ mục #' + anchorId);
        }
      };

      // Filter Logic
      function itemMatchesFilters(item, query, grade) {
        if (grade !== 'all') {
          const itemGrade = (item.grade || 'C').trim().charAt(0).toUpperCase();
          if (itemGrade !== grade) return false;
        }

        if (query) {
          const q = query.toLowerCase();
          const inTitle = (item.title || '').toLowerCase().includes(q);
          const inHuman = (item.human || '').toLowerCase().includes(q);
          const inCost = (item.cost || '').toLowerCase().includes(q);
          const inGain = (item.gain || '').toLowerCase().includes(q);
          const inNote = (item.note || '').toLowerCase().includes(q);
          if (!inTitle && !inHuman && !inCost && !inGain && !inNote) return false;
        }

        return true;
      }

      // Render Content Area
      function renderContent() {
        const query = searchQuery.trim();
        let html = '';
        let matchCount = 0;

        const isSearching = (query.length > 0);

        if (isSearching) {
          searchSummaryNotice.style.display = 'flex';
          let matchedChaptersHtml = '';

          BOOK_DATA.forEach(ch => {
            const filteredItems = ch.items.filter(it => itemMatchesFilters(it, query, activeGradeFilter));
            if (filteredItems.length > 0) {
              matchCount += filteredItems.length;
              matchedChaptersHtml += \`
                <div class="chapter-header-box" style="margin-top: 2.5rem;">
                  <span class="chapter-badge-tag">Chương \${ch.num}</span>
                  <h2 class="chapter-main-title" style="font-size: 1.6rem;">\${ch.title}</h2>
                </div>
                <div class="items-container">
                  \${filteredItems.map(it => renderAdviceCard(it, ch.num, query)).join('')}
                </div>
              \`;
            }
          });

          searchSummaryText.textContent = \`Tìm thấy \${matchCount} lời khuyên phù hợp với từ khóa "\${query}"\`;
          if (matchCount === 0) {
            matchedChaptersHtml = \`
              <div style="text-align:center; padding: 4rem 1rem; color: var(--text-sub);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:1rem;">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3 style="font-size: 1.25rem; font-weight:700; color:var(--text-main); margin-bottom:0.5rem;">Không tìm thấy kết quả</h3>
                <p>Thử tìm với các từ khóa phổ biến như: bảo hiểm, mũ bảo hiểm, dây an toàn, tiền, tim mạch, bệnh án...</p>
              </div>
            \`;
          }
          html = matchedChaptersHtml;
          currentChapterIndicator.textContent = \`Tìm kiếm: "\${query}" (\${matchCount} kết quả)\`;
          chapterNavFooter.style.display = 'none';

        } else if (viewMode === 'all') {
          searchSummaryNotice.style.display = 'none';
          currentChapterIndicator.textContent = 'Toàn bộ 34 chương (650 lời khuyên)';
          chapterNavFooter.style.display = 'none';

          BOOK_DATA.forEach(ch => {
            const filteredItems = ch.items.filter(it => itemMatchesFilters(it, '', activeGradeFilter));
            html += \`
              <section class="chapter-section" id="c\${ch.num}" style="margin-bottom: 4.5rem;">
                <div class="chapter-header-box">
                  <span class="chapter-badge-tag">Chương \${ch.num} · \${ch.items.length} lời khuyên</span>
                  <h2 class="chapter-main-title">\${ch.num}. \${ch.title}</h2>
                  \${ch.intro ? \`<div class="chapter-intro-box">\${ch.intro}</div>\` : ''}
                </div>
                <div class="items-container">
                  \${filteredItems.map(it => renderAdviceCard(it, ch.num, '')).join('')}
                </div>
              </section>
            \`;
          });

        } else {
          // Single Chapter Mode
          searchSummaryNotice.style.display = 'none';
          chapterNavFooter.style.display = 'flex';
          const ch = BOOK_DATA[currentChapterIndex];
          currentChapterIndicator.textContent = \`Chương \${ch.num}: \${ch.title}\`;

          // Update footer prev/next buttons
          prevChapterBtn.disabled = (currentChapterIndex <= 0);
          nextChapterBtn.disabled = (currentChapterIndex >= BOOK_DATA.length - 1);
          if (currentChapterIndex > 0) {
            prevBtnText.textContent = \`Chương \${BOOK_DATA[currentChapterIndex - 1].num}: \${BOOK_DATA[currentChapterIndex - 1].title}\`;
          } else {
            prevBtnText.textContent = 'Đầu sách';
          }
          if (currentChapterIndex < BOOK_DATA.length - 1) {
            nextBtnText.textContent = \`Chương \${BOOK_DATA[currentChapterIndex + 1].num}: \${BOOK_DATA[currentChapterIndex + 1].title}\`;
          } else {
            nextBtnText.textContent = 'Hết sách';
          }

          const filteredItems = ch.items.filter(it => itemMatchesFilters(it, '', activeGradeFilter));

          html = \`
            <section class="chapter-section" id="c\${ch.num}">
              <div class="chapter-header-box">
                <span class="chapter-badge-tag">Chương \${ch.num} / \${BOOK_DATA.length} · \${ch.items.length} lời khuyên</span>
                <h1 class="chapter-main-title">\${ch.num}. \${ch.title}</h1>
                \${ch.intro ? \`<div class="chapter-intro-box">\${ch.intro}</div>\` : ''}
              </div>
              <div class="items-container">
                \${filteredItems.length > 0 ? 
                  filteredItems.map(it => renderAdviceCard(it, ch.num, '')).join('') : 
                  '<p style="text-align:center; padding: 2.5rem; color:var(--text-sub);">Không có lời khuyên nào phù hợp với bộ lọc bằng chứng này trong chương.</p>'}
              </div>
            </section>
          \`;
        }

        contentRenderArea.innerHTML = html;
      }

      // Drawer open/close
      function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
      }

      function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
      }

      // Scroll Progress & Back to top
      window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';

        if (scrollTop > 400) {
          backToTopBtn.classList.add('show');
        } else {
          backToTopBtn.classList.remove('show');
        }
      }, { passive: true });

      // Event Listeners
      menuToggleBtn.addEventListener('click', openSidebar);
      sidebarOverlay.addEventListener('click', closeSidebar);
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      // Chapter search in sidebar
      sidebarFilterInput.addEventListener('input', renderSidebarList);

      // Main search
      let searchTimeout = null;
      mainSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          searchQuery = e.target.value;
          renderContent();
        }, 150);
      });

      clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        mainSearchInput.value = '';
        renderContent();
      });

      // Grade filters
      const gradeBtns = document.querySelectorAll('.grade-filter-btn');
      gradeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          gradeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeGradeFilter = btn.getAttribute('data-grade');
          renderContent();
        });
      });

      // View mode buttons
      btnModeChapter.addEventListener('click', () => setViewMode('chapter'));
      btnModeAll.addEventListener('click', () => setViewMode('all'));

      // Font buttons
      btnFontSans.addEventListener('click', () => setFontFamily('sans'));
      btnFontSerif.addEventListener('click', () => setFontFamily('serif'));
      
      btnFontDec.addEventListener('click', () => {
        if (fontSizePx > 14) {
          fontSizePx -= 1;
          document.body.style.setProperty('--base-font-size', fontSizePx + 'px');
          localStorage.setItem('reader_size', fontSizePx);
        }
      });

      btnFontInc.addEventListener('click', () => {
        if (fontSizePx < 22) {
          fontSizePx += 1;
          document.body.style.setProperty('--base-font-size', fontSizePx + 'px');
          localStorage.setItem('reader_size', fontSizePx);
        }
      });

      // Themes
      themeLightBtn.addEventListener('click', () => setTheme('light'));
      themeSepiaBtn.addEventListener('click', () => setTheme('sepia'));
      themeDarkBtn.addEventListener('click', () => setTheme('dark'));

      // Prev / Next Chapter Buttons
      prevChapterBtn.addEventListener('click', () => {
        if (currentChapterIndex > 0) navigateToChapter(currentChapterIndex - 1);
      });

      nextChapterBtn.addEventListener('click', () => {
        if (currentChapterIndex < BOOK_DATA.length - 1) navigateToChapter(currentChapterIndex + 1);
      });

      // Keyboard navigation (ArrowLeft / ArrowRight)
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (viewMode === 'chapter') {
          if (e.key === 'ArrowLeft' && currentChapterIndex > 0) {
            navigateToChapter(currentChapterIndex - 1);
          } else if (e.key === 'ArrowRight' && currentChapterIndex < BOOK_DATA.length - 1) {
            navigateToChapter(currentChapterIndex + 1);
          }
        }
      });

      // Handle URL hash on initial load
      function handleInitialHash() {
        const hash = window.location.hash;
        if (!hash) return;

        const chMatch = hash.match(/^#c(\d+)/);
        if (chMatch) {
          const chNum = parseInt(chMatch[1], 10);
          const foundIdx = BOOK_DATA.findIndex(c => c.num === chNum);
          if (foundIdx !== -1) {
            currentChapterIndex = foundIdx;
          }
        }
      }

      function scrollToHashItem() {
        const hash = window.location.hash;
        if (!hash) return;
        setTimeout(() => {
          const el = document.querySelector(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            el.style.borderColor = 'var(--accent)';
            setTimeout(() => { el.style.borderColor = ''; }, 2000);
          }
        }, 120);
      }

      // Init
      initPreferences();
      handleInitialHash();
      renderSidebarList();
      renderContent();
      scrollToHashItem();

    })();
  </script>
</body>
</html>
`;

fs.writeFileSync('index.html', htmlTemplate, 'utf8');
console.log('Build completed successfully.');
